import { describe, expect, it } from 'vitest';
import type { InternalMessage } from '../types.js';
import { CommandRegistry } from './command-registry.js';
import { MessageRouter } from './router.js';

const registry = new CommandRegistry();
registry.register({
  name: 'ping',
  description: 'tes',
  roles: ['owner', 'admin', 'member'],
  handler: () => 'pong',
});

const router = new MessageRouter('.', registry);

function message(text: string): InternalMessage {
  return {
    id: 'm1',
    platform: 'whatsapp',
    chatId: 'chat-1',
    chatType: 'private',
    senderId: 'user-1',
    isGroup: false,
    text,
    media: [],
    mentions: [],
    timestamp: Date.now(),
    fromBot: false,
  };
}

describe('MessageRouter', () => {
  it('mengarahkan pesan berprefix ke command', () => {
    const result = router.route(message('.ping'));
    expect(result).toMatchObject({ kind: 'command', name: 'ping', args: [], known: true });
  });

  it('memisahkan argumen command', () => {
    const result = router.route(message('.persona arka'));
    expect(result).toMatchObject({ kind: 'command', name: 'persona', args: ['arka'] });
  });

  it('menandai command tidak dikenal', () => {
    const result = router.route(message('.tidakada'));
    expect(result).toMatchObject({ kind: 'command', name: 'tidakada', known: false });
  });

  it('mengirim teks biasa ke AI Agent', () => {
    expect(router.route(message('halo, apa kabar?'))).toEqual({ kind: 'agent' });
  });

  it('prefix tanpa nama command dianggap tidak dikenal', () => {
    expect(router.route(message('.'))).toMatchObject({ kind: 'command', known: false });
  });

  it('prefix di tengah teks tidak memicu command', () => {
    expect(router.route(message('tolong jelaskan .ping'))).toEqual({ kind: 'agent' });
  });
});
