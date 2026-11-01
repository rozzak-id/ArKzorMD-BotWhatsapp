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

    // Self Control: izinkan jika allowSelfControl: true dan bukan bot sent message
    const selfMsg = normalizeIncomingMessage(
      raw({
        ...base,
        key: { remoteJid: '6281111111111@s.whatsapp.net', id: 'A-self', fromMe: true },
      }),
      { allowSelfControl: true, botJid: '6281111111111@s.whatsapp.net' },
    );
    expect(selfMsg).not.toBeNull();
    expect(selfMsg?.senderId).toBe('6281111111111@s.whatsapp.net');
    expect(selfMsg?.fromBot).toBe(false);

    // Bot's own sent message must still be ignored
    const sentIds = new Set(['A-sent-by-bot']);
    expect(
      normalizeIncomingMessage(
        raw({
          ...base,
          key: { remoteJid: '6281111111111@s.whatsapp.net', id: 'A-sent-by-bot', fromMe: true },
        }),
        { allowSelfControl: true, sentMessageIds: sentIds },
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

  it('mengekstrak respon klik tombol native flow dan template button', () => {
    // 1. Native flow quick reply
    const text1 = extractText({
      interactiveResponseMessage: {
        nativeFlowResponseMessage: {
          paramsJson: JSON.stringify({ id: '.approve #A7F3' }),
        },
      },
    });
    expect(text1).toBe('.approve #A7F3');

    // 2. Native flow dengan selected_id / row_id
    const text2 = extractText({
      interactiveResponseMessage: {
        nativeFlowResponseMessage: {
          paramsJson: JSON.stringify({ selected_id: '.menu' }),
        },
      },
    });
    expect(text2).toBe('.menu');

    // 3. Template button reply
    const text3 = extractText({
      templateButtonReplyMessage: {
        selectedId: '.reject #B8C2',
      },
    });
    expect(text3).toBe('.reject #B8C2');

    // 4. Buttons response message
    const text4 = extractText({
      buttonsResponseMessage: {
        selectedButtonId: '.always #C9D3',
      },
    });
    expect(text4).toBe('.always #C9D3');

    // 5. List response single select
    const text5 = extractText({
      listResponseMessage: {
        singleSelectReply: { selectedRowId: '.status' },
      },
    });
    expect(text5).toBe('.status');
  });
});
