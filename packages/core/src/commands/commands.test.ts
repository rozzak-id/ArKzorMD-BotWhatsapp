import { describe, expect, it } from 'vitest';
import { CommandRegistry } from '../router/command-registry.js';
import { getAllCommands, optionalCommands } from './index.js';
import type { CommandContext } from '../router/command-registry.js';

describe('Modular Commands Architecture', () => {
  it('registers all default commands and resolves primary names and aliases', () => {
    const registry = new CommandRegistry();
    const all = getAllCommands();
    registry.registerAll(all);

    // 1. Primary commands exist
    expect(registry.get('ping')).toBeDefined();
    expect(registry.get('menu')).toBeDefined();
    expect(registry.get('admin')).toBeDefined();
    expect(registry.get('order')).toBeDefined();
    expect(registry.get('ai')).toBeDefined();
    expect(registry.get('downloader')).toBeDefined();

    // 2. Aliases resolve to the correct primary command definition
    expect(registry.get('p')?.name).toBe('ping');
    expect(registry.get('speed')?.name).toBe('ping');
    expect(registry.get('kick')?.name).toBe('admin');
    expect(registry.get('promote')?.name).toBe('admin');
    expect(registry.get('buka')?.name).toBe('groupset');
    expect(registry.get('tutup')?.name).toBe('groupset');
    expect(registry.get('tt')?.name).toBe('downloader');
    expect(registry.get('tiktok')?.name).toBe('downloader');
    expect(registry.get('yt')?.name).toBe('downloader');
    expect(registry.get('cekorder')?.name).toBe('order');
  });

  it('separates optional commands from core project catalog', () => {
    const defaultCommands = getAllCommands();
    const defaultNames = defaultCommands.map((c) => c.name);

    // .stalker, .anime, dan .nsfw tidak ada di command default
    expect(defaultNames).not.toContain('stalker');
    expect(defaultNames).not.toContain('anime');
    expect(defaultNames).not.toContain('nsfw');

    // Tapi tersedia secara terpisah di optionalCommands
    const optionalNames = optionalCommands.map((c) => c.name);
    expect(optionalNames).toContain('stalker');
    expect(optionalNames).toContain('anime');
    expect(optionalNames).toContain('nsfw');
  });

  it('nsfw command blocks inappropriate access', async () => {
    const nsfw = optionalCommands.find((c) => c.name === 'nsfw');
    expect(nsfw).toBeDefined();

    const mockContext: CommandContext = {
      message: {
        id: '1',
        platform: 'whatsapp',
        chatId: '123@s.whatsapp.net',
        chatType: 'private',
        senderId: '123@s.whatsapp.net',
        isGroup: false,
        text: '.nsfw',
        media: [],
        mentions: [],
        timestamp: Date.now(),
        fromBot: false,
      },
      role: 'member',
      args: [],
      raw: '.nsfw',
      services: {} as any,
    };

    const res = await nsfw!.handler(mockContext);
    expect(res).toContain('Akses Ditolak');
  });

  it('sticker command converts image buffer to webp sticker', async () => {
    const sharp = (await import('sharp')).default;
    const { stickerCommand } = await import('./media/sticker.js');

    // Buat dummy PNG 100x100
    const samplePng = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    }).png().toBuffer();

    let sentPayload: any = null;
    const mockContext: CommandContext = {
      message: {
        id: 'msg-img-1',
        platform: 'whatsapp',
        chatId: '123@s.whatsapp.net',
        chatType: 'private',
        senderId: '123@s.whatsapp.net',
        isGroup: false,
        text: '.s',
        media: [
          {
            kind: 'image',
            mimeType: 'image/png',
            buffer: samplePng,
          },
        ],
        mentions: [],
        timestamp: Date.now(),
        fromBot: false,
      },
      role: 'member',
      args: [],
      raw: '.s',
      services: {
        adapter: {
          send: async (_chatId: string, content: any) => {
            sentPayload = content;
          },
        } as any,
      } as any,
    };

    const res = await stickerCommand.handler(mockContext);
    expect(res).toBe('');
    expect(sentPayload).toBeDefined();
    expect(sentPayload.media).toHaveLength(1);
    expect(sentPayload.media[0].kind).toBe('sticker');
    expect(sentPayload.media[0].mimeType).toBe('image/webp');
    expect(sentPayload.media[0].buffer).toBeInstanceOf(Buffer);

    // Verifikasi metadata webp yang dihasilkan adalah 512x512
    const meta = await sharp(sentPayload.media[0].buffer).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(512);
    expect(meta.height).toBe(512);
  });
});

