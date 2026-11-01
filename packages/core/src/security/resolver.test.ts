import { describe, expect, it } from 'vitest';
import {
  decide,
  resolveEffectiveLevel,
  type DecideContext,
  type ResolverContext,
} from './resolver.js';
import type { ToolDefinition } from '../types.js';

function createMockTool(overrides: Partial<ToolDefinition> = {}): ToolDefinition {
  const name = overrides.name ?? 'test.tool';
  let defaultCategory: ToolDefinition['category'] = 'web_utility';
  if (name.startsWith('wa.send_') || name === 'wa.reply' || name === 'wa.react' || name === 'send_message') {
    defaultCategory = 'message_media';
  }

  return {
    name,
    category: overrides.category ?? defaultCategory,
    description: 'Test tool',
    baseLevel: 'L0',
    scopeRules: [],
    minRole: 'member',
    relaxable: false,
    audit: true,
    priority: 'P0',
    implemented: true,
    params: { type: 'object', additionalProperties: false },
    ...overrides,
  };
}

describe('Effective Level Resolver (resolveEffectiveLevel - Bagian 3)', () => {
  const baseContext: ResolverContext = {
    currentChatId: '628111@s.whatsapp.net',
    senderId: '628222@s.whatsapp.net',
    role: 'member',
    maxRecipients: 20,
    isBotMessage: (id) => id.startsWith('bot-'),
  };

  it('Baris 1: Aksi pada chat yang sedang berlangsung -> L0', () => {
    const replyTool = createMockTool({ name: 'wa.reply', baseLevel: 'L0' });
    const reactTool = createMockTool({ name: 'wa.react', baseLevel: 'L0' });
    const sendThisChat = createMockTool({
      name: 'wa.send_text',
      baseLevel: 'L1',
      scopeRules: [{ when: 'to kosong atau sama dengan chat ini', level: 'L0' }],
    });

    expect(resolveEffectiveLevel(replyTool, { text: 'halo' }, baseContext).level).toBe('L0');
    expect(resolveEffectiveLevel(reactTool, { emoji: '+' }, baseContext).level).toBe('L0');
    expect(resolveEffectiveLevel(sendThisChat, { text: 'halo' }, baseContext).level).toBe('L0');
    expect(
      resolveEffectiveLevel(sendThisChat, { to: '628111@s.whatsapp.net', text: 'halo' }, baseContext).level,
    ).toBe('L0');
  });

  it('Baris 2: Aksi ke chat, kontak, atau grup lain -> L1', () => {
    const sendTextTool = createMockTool({
      name: 'wa.send_text',
      baseLevel: 'L1',
      scopeRules: [{ when: 'to kosong atau sama dengan chat ini', level: 'L0' }],
    });

    const res = resolveEffectiveLevel(
      sendTextTool,
      { to: '628999999999@s.whatsapp.net', text: 'rapat jam 3' },
      baseContext,
    );
    expect(res.level).toBe('L1');
    expect(res.reason).toContain('chat, kontak, atau grup lain');
  });

  it('Baris 3: Aksi pada akun bot (profil, privasi, status, chat management) -> L1', () => {
    const profileTool = createMockTool({
      name: 'wa.set_profile_name',
      category: 'profile_privacy',
      baseLevel: 'L1',
      minRole: 'owner',
    });
    const privacyTool = createMockTool({
      name: 'wa.update_privacy',
      category: 'profile_privacy',
      baseLevel: 'L1',
      minRole: 'owner',
    });
    const clearChatTool = createMockTool({
      name: 'wa.chat_clear',
      category: 'chat_management',
      baseLevel: 'L1',
      minRole: 'owner',
    });

    expect(resolveEffectiveLevel(profileTool, { name: 'New Name' }, baseContext).level).toBe('L1');
    expect(resolveEffectiveLevel(privacyTool, { setting: 'lastSeen', value: 'nobody' }, baseContext).level).toBe('L1');
    expect(resolveEffectiveLevel(clearChatTool, { chatId: '628111@s.whatsapp.net' }, baseContext).level).toBe('L1');
  });

  it('Baris 4: Aksi yang menimpa milik orang lain (hapus pesan orang, kick, promote) -> L1', () => {
    const deleteTool = createMockTool({ name: 'wa.delete_message', baseLevel: 'L0' });
    const kickTool = createMockTool({ name: 'wa.group_remove', baseLevel: 'L1', minRole: 'admin' });
    const promoteTool = createMockTool({ name: 'wa.group_promote', baseLevel: 'L1', minRole: 'admin' });

    // Hapus pesan bot sendiri -> L0
    expect(
      resolveEffectiveLevel(deleteTool, { messageId: 'bot-123', forEveryone: false }, baseContext).level,
    ).toBe('L0');

    // Hapus pesan orang lain -> L1
    expect(
      resolveEffectiveLevel(deleteTool, { messageId: 'user-456', forEveryone: false }, baseContext).level,
    ).toBe('L1');

    // Hapus forEveryone -> L1
    expect(
      resolveEffectiveLevel(deleteTool, { messageId: 'bot-123', forEveryone: true }, baseContext).level,
    ).toBe('L1');

    // Kick & promote -> L1
    expect(resolveEffectiveLevel(kickTool, { groupId: '123@g.us', jids: ['user'] }, baseContext).level).toBe('L1');
    expect(resolveEffectiveLevel(promoteTool, { groupId: '123@g.us', jids: ['user'] }, baseContext).level).toBe('L1');
  });

  it('Baris 5: Membaca chat lain, daftar chat, daftar kontak -> L1, hanya Owner', () => {
    const readChatTool = createMockTool({ name: 'wa.read_chat', baseLevel: 'L0' });
    const listChatsTool = createMockTool({ name: 'wa.list_chats', baseLevel: 'L1', minRole: 'owner' });
    const listContactsTool = createMockTool({ name: 'wa.list_contacts', baseLevel: 'L1', minRole: 'owner' });

    // Membaca chat ini -> L0
    expect(resolveEffectiveLevel(readChatTool, {}, baseContext).level).toBe('L0');
    expect(resolveEffectiveLevel(readChatTool, { chatId: '628111@s.whatsapp.net' }, baseContext).level).toBe('L0');

    // Membaca chat lain -> L1
    expect(resolveEffectiveLevel(readChatTool, { chatId: '628999@s.whatsapp.net' }, baseContext).level).toBe('L1');

    // Daftar chat dan kontak -> L1
    expect(resolveEffectiveLevel(listChatsTool, {}, baseContext).level).toBe('L1');
    expect(resolveEffectiveLevel(listContactsTool, {}, baseContext).level).toBe('L1');
  });

  it('Baris 6: Penerima banyak (>20 default, bisa diatur) -> L1', () => {
    const broadcastTool = createMockTool({
      name: 'wa.broadcast',
      category: 'channel_broadcast',
      baseLevel: 'L1',
      minRole: 'admin',
    });

    // 20 penerima -> tidak melampaui batas 20
    const recipients20 = Array.from({ length: 20 }, (_, i) => `628120000${i}`);
    expect(resolveEffectiveLevel(broadcastTool, { recipients: recipients20 }, baseContext).level).toBe('L1');

    // 21 penerima -> melampaui batas 20
    const recipients21 = Array.from({ length: 21 }, (_, i) => `628120000${i}`);
    const resOver = resolveEffectiveLevel(broadcastTool, { recipients: recipients21 }, baseContext);
    expect(resOver.level).toBe('L1');
    expect(resOver.reason).toContain('melebihi batas');

    // Tool L0 tapi dengan penerima > 20 -> teresolusi ke L1
    const l0SendTool = createMockTool({
      name: 'wa.send_text',
      category: 'message_media',
      baseLevel: 'L0',
    });
    const resL0Over = resolveEffectiveLevel(l0SendTool, { to: recipients21.join(',') }, baseContext);
    expect(resL0Over.level).toBe('L1');
    expect(resL0Over.reason).toContain('melebihi batas');

    // Custom limit (misal 5 penerima)
    const customContext: ResolverContext = { ...baseContext, maxRecipients: 5 };
    const recipients6 = Array.from({ length: 6 }, (_, i) => `628120000${i}`);
    const resCustom = resolveEffectiveLevel(broadcastTool, { recipients: recipients6 }, customContext);
    expect(resCustom.level).toBe('L1');
    expect(resCustom.reason).toContain('melebihi batas');
  });

  it('Baris 7: Aksi L2 (terkunci) -> L2', () => {
    const l2Tool = createMockTool({ name: 'admin.update_secret', baseLevel: 'L2', minRole: 'owner' });
    const updateProfile = createMockTool({ name: 'update_profile', baseLevel: 'L2', minRole: 'owner' });

    expect(resolveEffectiveLevel(l2Tool, {}, baseContext).level).toBe('L2');
    expect(resolveEffectiveLevel(updateProfile, { status: 'sibuk' }, baseContext).level).toBe('L2');
  });
});

describe('Permission Decision Engine (decide - Matriks Role x Level)', () => {
  const l0Tool = createMockTool({ name: 'wa.reply', baseLevel: 'L0', minRole: 'member' });
  const l1Tool = createMockTool({
    name: 'wa.send_text',
    baseLevel: 'L1',
    scopeRules: [{ when: 'to kosong atau sama dengan chat ini', level: 'L0' }],
    minRole: 'member',
  });
  const relaxableL1Tool = createMockTool({
    name: 'wa.send_text',
    baseLevel: 'L1',
    minRole: 'member',
    relaxable: true,
  });
  const l2Tool = createMockTool({ name: 'system.reboot', baseLevel: 'L2', minRole: 'owner' });

  function createContext(role: 'owner' | 'admin' | 'member', killSwitch = false): DecideContext {
    return {
      currentChatId: '628111@s.whatsapp.net',
      senderId: '628222@s.whatsapp.net',
      role,
      isKillSwitchOn: () => killSwitch,
      hasRule: (_tool, target) => target === '628trusted@s.whatsapp.net',
      isOwnerConfirmationDisabled: (name) => name === 'wa.send_text' && role === 'owner',
    };
  }

  it('Matriks Member: L0 allow, L1 denied, L2 denied', () => {
    const ctx = createContext('member');

    expect(decide(l0Tool, { text: 'halo' }, ctx).decision).toBe('allow');
    expect(decide(l1Tool, { to: '628999@s.whatsapp.net', text: 'hi' }, ctx).decision).toBe('denied');
    expect(decide(l2Tool, {}, ctx).decision).toBe('denied');
  });

  it('Matriks Admin: L0 allow, L1 pending_approval, L2 denied', () => {
    const ctx = createContext('admin');

    expect(decide(l0Tool, { text: 'halo' }, ctx).decision).toBe('allow');
    expect(decide(l1Tool, { to: '628999@s.whatsapp.net', text: 'hi' }, ctx).decision).toBe('pending_approval');
    expect(decide(l2Tool, {}, ctx).decision).toBe('denied');
  });

  it('Matriks Owner: L0 allow, L1 pending_approval (konfirmasi 1-ketuk), L2 denied', () => {
    const ctx = createContext('owner');

    expect(decide(l0Tool, { text: 'halo' }, ctx).decision).toBe('allow');
    // Normal L1: butuh approval (konfirmasi 1-ketuk)
    const normalL1 = createMockTool({ name: 'wa.set_profile_name', baseLevel: 'L1', minRole: 'owner', relaxable: false });
    expect(decide(normalL1, { name: 'Owner' }, ctx).decision).toBe('pending_approval');
    expect(decide(l2Tool, {}, ctx).decision).toBe('denied');
  });

  it('Owner pada tool relaxable yang dimatikan konfirmasinya -> allow', () => {
    const ctx = createContext('owner');
    // relaxableL1Tool dengan konfirmasi disabled -> allow
    expect(decide(relaxableL1Tool, { to: '628999@s.whatsapp.net', text: 'test' }, ctx).decision).toBe('allow');
  });

  it('Kill switch memblokir semua aksi L1 untuk semua role', () => {
    const memberCtx = createContext('member', true);
    const adminCtx = createContext('admin', true);
    const ownerCtx = createContext('owner', true);

    expect(decide(l1Tool, { to: '628999@s.whatsapp.net', text: 'hi' }, memberCtx).decision).toBe('denied');
    expect(decide(l1Tool, { to: '628999@s.whatsapp.net', text: 'hi' }, adminCtx).decision).toBe('denied');
    expect(decide(l1Tool, { to: '628999@s.whatsapp.net', text: 'hi' }, ownerCtx).decision).toBe('denied');

    // L0 tetap jalan meski kill switch aktif
    expect(decide(l0Tool, { text: 'halo' }, ownerCtx).decision).toBe('allow');
  });

  it('Aturan "setuju selalu" mengizinkan aksi L1 tanpa pending_approval', () => {
    const adminCtx = createContext('admin', false);
    // Target yang ada di rule -> allow
    const resAllowed = decide(l1Tool, { to: '628trusted@s.whatsapp.net', text: 'hi' }, adminCtx);
    expect(resAllowed.decision).toBe('allow');
  });

  it('Tool tidak dikenal (unknown_tool) menghasilkan denied', () => {
    const ctx = createContext('admin');
    const res = decide(undefined, {}, ctx);
    expect(res.decision).toBe('denied');
    expect(res.reason).toContain('unknown_tool');
  });

  it('Role lebih rendah dari minRole tool menghasilkan denied', () => {
    const ownerOnlyTool = createMockTool({ name: 'wa.list_chats', baseLevel: 'L1', minRole: 'owner' });
    const memberCtx = createContext('member');
    const adminCtx = createContext('admin');

    expect(decide(ownerOnlyTool, {}, memberCtx).decision).toBe('denied');
    expect(decide(ownerOnlyTool, {}, adminCtx).decision).toBe('denied');
  });
});
