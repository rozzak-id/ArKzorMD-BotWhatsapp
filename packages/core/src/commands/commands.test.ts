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
});

