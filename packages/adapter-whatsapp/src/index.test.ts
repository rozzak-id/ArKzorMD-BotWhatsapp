import { describe, expect, it } from 'vitest';
import type { WAMessage } from 'onigis';
import { extractText, normalizeIncomingMessage } from './index.js';

function raw(value: Record<string, unknown>): WAMessage {
  return value as unknown as WAMessage;
}

describe('normalizeIncomingMessage', () => {
  it('memetakan chat LID ke pengirim nomor telepon lewat remoteJidAlt', () => {
    const message = normalizeIncomingMessage(
      raw({
        key: {
          remoteJid: '998877665544@lid',
          remoteJidAlt: '6281111111111@s.whatsapp.net',
          id: 'MSG-1',
          fromMe: false,
        },
        message: { conversation: 'halo' },
        messageTimestamp: 1_700_000_000,
        pushName: 'Owner',
      }),
      { botJid: '6289999999999@s.whatsapp.net' },
    );

    expect(message).not.toBeNull();
    expect(message).toMatchObject({
      id: 'MSG-1',
      chatId: '998877665544@lid',
      chatType: 'private',
      senderId: '6281111111111@s.whatsapp.net',
      senderName: 'Owner',
      text: 'halo',
      isGroup: false,
      fromBot: false,
    });
    expect(message?.timestamp).toBe(1_700_000_000_000);
  });

  it('menormalisasi peserta grup, mention, dan kutipan', () => {
    const message = normalizeIncomingMessage(
      raw({
        key: {
          remoteJid: '120363000000000000@g.us',
          participant: '111222333@lid',
          participantAlt: '6282222222222@s.whatsapp.net',
          id: 'MSG-2',
          fromMe: false,
        },
        message: {
          extendedTextMessage: {
            text: 'Arka, lihat ini',
            contextInfo: {
              mentionedJid: ['6289999999999@s.whatsapp.net'],
              participant: '6281111111111@s.whatsapp.net',
              stanzaId: 'QUOTED-1',
              quotedMessage: { conversation: 'pesan lama' },
            },
          },
        },
        messageTimestamp: 1_700_000_001,
        pushName: 'Member',
      }),
      { botJid: '6289999999999@s.whatsapp.net' },
    );

    expect(message).toMatchObject({
      chatType: 'group',
      isGroup: true,
      senderId: '6282222222222@s.whatsapp.net',
      text: 'Arka, lihat ini',
      mentions: ['6289999999999@s.whatsapp.net'],
      quoted: {
        id: 'QUOTED-1',
        senderId: '6281111111111@s.whatsapp.net',
        text: 'pesan lama',
        fromBot: false,
      },
    });
  });

  it('menerjemahkan tombol approval menjadi teks command', () => {
    const message = normalizeIncomingMessage(
      raw({
        key: {
          remoteJid: '6281111111111@s.whatsapp.net',
          id: 'MSG-3',
          fromMe: false,
        },
        message: {
          buttonsResponseMessage: {
            selectedButtonId: '.approve #AB12',
            selectedDisplayText: 'Setuju',
          },
        },
        messageTimestamp: 1_700_000_002,
      }),
    );

    expect(message?.text).toBe('.approve #AB12');
  });

  it('mengambil metadata media dan caption', () => {
    const message = normalizeIncomingMessage(
      raw({
        key: {
          remoteJid: '6281111111111@s.whatsapp.net',
          id: 'MSG-4',
          fromMe: false,
        },
        message: {
          imageMessage: {
            caption: 'foto rapat',
            mimetype: 'image/jpeg',
            fileLength: 4096,
          },
        },
        messageTimestamp: 1_700_000_003,
      }),
    );

    expect(message?.text).toBe('foto rapat');
    expect(message?.media).toEqual([
      {
        kind: 'image',
        mimeType: 'image/jpeg',
        fileName: undefined,
        caption: 'foto rapat',
        sizeBytes: 4096,
      },
    ]);
  });

  it('mengabaikan pesan sendiri, status, dan pesan protokol', () => {
    const base = {
      message: { conversation: 'abaikan' },
      messageTimestamp: 1_700_000_004,
    };

    expect(
      normalizeIncomingMessage(
        raw({
          ...base,
          key: { remoteJid: '6281111111111@s.whatsapp.net', id: 'A', fromMe: true },
        }),
      ),
    ).toBeNull();

    expect(
      normalizeIncomingMessage(
        raw({
          ...base,
          key: { remoteJid: 'status@broadcast', id: 'B', fromMe: false },
        }),
      ),
    ).toBeNull();

    expect(
      normalizeIncomingMessage(
        raw({
          key: { remoteJid: '6281111111111@s.whatsapp.net', id: 'C', fromMe: false },
          message: { protocolMessage: { type: 0 } },
          messageTimestamp: 1_700_000_004,
        }),
      ),
    ).toBeNull();
  });
});

describe('extractText', () => {
  it('membuka ephemeral dan caption dokumen', () => {
    const text = extractText({
      ephemeralMessage: {
        message: {
          documentWithCaptionMessage: {
            message: {
              documentMessage: { caption: 'laporan.pdf' },
            },
          },
        },
      },
    });

    expect(text).toBe('laporan.pdf');
  });
});
