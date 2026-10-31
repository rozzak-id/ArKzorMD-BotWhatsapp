import type { ToolDefinition } from '../types.js';
import { safeFetch } from './ssrf.js';
import { evaluateSafeMath } from './math.js';
import { convertUnits } from './convert.js';

export function normalizeTarget(input: string): string {
  const value = input.trim();
  if (!value) return '';
  if (value.includes('@')) return value;
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  return `${digits}@s.whatsapp.net`;
}

export function createBuiltinTools(): ToolDefinition[] {
  const tools: ToolDefinition[] = [
    // ── KATEGORI A: Pesan dan Media ──────────────────────────────────────────
    {
      name: 'wa.reply',
      category: 'message_media',
      description: 'Reply to a message in the current active chat with text.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      rateLimit: { perMinute: 30, perChatPerMinute: 10 },
      relaxable: false,
      audit: true,
      priority: 'P0',
      implemented: true,
      params: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text reply message' },
          quoteId: { type: 'string', description: 'Message ID to quote/reply to' },
        },
        required: ['text'],
        additionalProperties: false,
      },
      async handler(context) {
        const text = String(context.params.text ?? '').trim();
        if (!text) return { ok: false, status: 'error', error: 'Text reply is empty.', retryable: false };
        const replyTo = context.params.quoteId ? String(context.params.quoteId) : context.message?.id;
        try {
          await context.adapter.send(context.chatId, { text, replyTo });
          return { ok: true, status: 'ok', output: { text, chatId: context.chatId, replyTo } };
        } catch (err) {
          return {
            ok: false,
            status: 'error',
            errorCode: 'send_failed',
            error: err instanceof Error ? err.message : String(err),
            retryable: false,
          };
        }
      },
    },
    {
      name: 'wa.send_text',
      category: 'message_media',
      description: 'Send a text message to a specific chat, contact, or the current chat if "to" is empty.',
      baseLevel: 'L1',
      scopeRules: [{ when: 'to kosong atau sama dengan chat ini', level: 'L0' }],
      minRole: 'member',
      rateLimit: { perMinute: 20, perChatPerMinute: 6 },
      relaxable: false,
      audit: true,
      priority: 'P0',
      implemented: true,
      params: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Target JID or phone number (optional, defaults to current chat)' },
          text: { type: 'string', description: 'Text message content (max 4096 characters)' },
          quoteId: { type: 'string', description: 'Message ID to quote (optional)' },
        },
        required: ['text'],
        additionalProperties: false,
      },
      async handler(context) {
        const text = String(context.params.text ?? '').trim();
        if (!text) return { ok: false, status: 'error', error: 'Text content is empty.', retryable: false };
        if (text.length > 4096) {
          return { ok: false, status: 'error', error: 'Text exceeds maximum length of 4096 characters.', retryable: false };
        }
        const target = context.params.to ? normalizeTarget(String(context.params.to)) : context.chatId;
        const replyTo = context.params.quoteId ? String(context.params.quoteId) : undefined;
        try {
          await context.adapter.send(target, { text, replyTo });
          return { ok: true, status: 'ok', output: { to: target, length: text.length } };
        } catch (err) {
          return {
            ok: false,
            status: 'error',
            errorCode: 'send_failed',
            error: err instanceof Error ? err.message : String(err),
            retryable: false,
          };
        }
      },
    },
    {
      name: 'wa.send_media',
      category: 'message_media',
      description: 'Send media (image, video, audio, voice_note, document, sticker, gif) to a target or current chat.',
      baseLevel: 'L1',
      scopeRules: [{ when: 'to kosong atau sama dengan chat ini', level: 'L0' }],
      minRole: 'member',
      rateLimit: { perMinute: 10, perChatPerMinute: 4 },
      relaxable: false,
      audit: true,
      priority: 'P0',
      implemented: true,
      params: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Target recipient JID or phone number' },
          type: {
            type: 'string',
            enum: ['image', 'video', 'audio', 'voice_note', 'document', 'sticker', 'gif'],
            description: 'Type of media to send',
          },
          source: { type: 'string', description: 'File path, URL, or identifier for the media' },
          caption: { type: 'string', description: 'Caption text for the media (optional)' },
        },
        required: ['type', 'source'],
        additionalProperties: false,
      },
      async handler(context) {
        const mediaType = String(context.params.type ?? '');
        const source = String(context.params.source ?? '').trim();
        const caption = context.params.caption ? String(context.params.caption) : undefined;
        const target = context.params.to ? normalizeTarget(String(context.params.to)) : context.chatId;

        const kindMap: Record<string, 'image' | 'audio' | 'video' | 'document' | 'sticker'> = {
          image: 'image',
          video: 'video',
          audio: 'audio',
          voice_note: 'audio',
          document: 'document',
          sticker: 'sticker',
          gif: 'video',
        };

        const kind = kindMap[mediaType] ?? 'document';
        try {
          await context.adapter.send(target, {
            media: [{ kind, source, caption }],
          });
          return { ok: true, status: 'ok', output: { to: target, type: mediaType, source } };
        } catch (err) {
          return {
            ok: false,
            status: 'error',
            errorCode: 'unsupported_media',
            error: `Failed to send media: ${err instanceof Error ? err.message : String(err)}`,
            retryable: false,
          };
        }
      },
    },
    {
      name: 'wa.send_location',
      category: 'message_media',
      description: 'Send a geographic location to a chat.',
      baseLevel: 'L1',
      scopeRules: [{ when: 'to kosong atau sama dengan chat ini', level: 'L0' }],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          to: { type: 'string' },
          lat: { type: 'number' },
          lng: { type: 'number' },
          name: { type: 'string' },
        },
        required: ['lat', 'lng'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.send_contact',
      category: 'message_media',
      description: 'Share a contact card with a chat.',
      baseLevel: 'L1',
      scopeRules: [{ when: 'to kosong atau sama dengan chat ini', level: 'L0' }],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          to: { type: 'string' },
          jid: { type: 'string' },
        },
        required: ['jid'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.send_poll',
      category: 'message_media',
      description: 'Create and send a poll to a chat.',
      baseLevel: 'L1',
      scopeRules: [{ when: 'to kosong atau sama dengan chat ini', level: 'L0' }],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          to: { type: 'string' },
          question: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          multiple: { type: 'boolean' },
        },
        required: ['question', 'options'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.react',
      category: 'message_media',
      description: 'React with an emoji to a message in the current chat.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P0',
      implemented: true,
      params: {
        type: 'object',
        properties: {
          emoji: { type: 'string', description: 'Single emoji character, e.g. 👍' },
          messageId: { type: 'string', description: 'Target message ID to react to' },
        },
        required: ['emoji'],
        additionalProperties: false,
      },
      async handler(context) {
        const emoji = String(context.params.emoji ?? '').trim();
        if (!emoji) return { ok: false, status: 'error', error: 'Emoji is required.', retryable: false };
        const messageId = String(context.params.messageId ?? context.message?.id ?? '');
        if (!messageId) return { ok: false, status: 'error', error: 'Message ID is not available.', retryable: false };
        try {
          await context.adapter.send(context.chatId, { reaction: { emoji, messageId } });
          return { ok: true, status: 'ok', output: { emoji, messageId } };
        } catch (err) {
          return {
            ok: false,
            status: 'error',
            errorCode: 'reaction_failed',
            error: err instanceof Error ? err.message : String(err),
            retryable: false,
          };
        }
      },
    },
    {
      name: 'wa.edit_message',
      category: 'message_media',
      description: "Edit bot's own previous message.",
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          messageId: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['messageId', 'text'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.delete_message',
      category: 'message_media',
      description: 'Delete a message. Deleting others message is L1.',
      baseLevel: 'L0',
      scopeRules: [{ when: 'menghapus pesan orang lain atau forEveryone', level: 'L1' }],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          messageId: { type: 'string' },
          forEveryone: { type: 'boolean' },
        },
        required: ['messageId'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.forward',
      category: 'message_media',
      description: 'Forward an existing message to another chat.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          messageId: { type: 'string' },
          to: { type: 'string' },
        },
        required: ['messageId', 'to'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.pin_message',
      category: 'message_media',
      description: 'Pin a message in a private chat (L0) or group chat (L1).',
      baseLevel: 'L0',
      scopeRules: [{ when: 'pin di grup', level: 'L1' }],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          chatId: { type: 'string' },
          messageId: { type: 'string' },
          duration: { type: 'number' },
        },
        required: ['chatId', 'messageId'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.mention_all',
      category: 'message_media',
      description: 'Mention all members in a group with a message.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          groupId: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['groupId', 'text'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.schedule_message',
      category: 'message_media',
      description: 'Schedule a message to be sent at a future time.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          to: { type: 'string' },
          content: { type: 'string' },
          sendAt: { type: 'number' },
        },
        required: ['to', 'content', 'sendAt'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.set_presence',
      category: 'message_media',
      description: 'Set bot presence indicator (typing, recording, online, offline).',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: false,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          chatId: { type: 'string' },
          state: { type: 'string', enum: ['typing', 'recording', 'online', 'offline'] },
        },
        required: ['chatId', 'state'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.mark_read',
      category: 'message_media',
      description: 'Mark messages in a chat as read.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: false,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          chatId: { type: 'string' },
        },
        required: ['chatId'],
        additionalProperties: false,
      },
    },

    // ── KATEGORI B: Membaca dan Konteks ──────────────────────────────────────
    {
      name: 'wa.read_chat',
      category: 'read_context',
      description: 'Read recent messages from the current chat (L0). Reading other chats is L1 Owner only.',
      baseLevel: 'L0',
      scopeRules: [{ when: 'membaca chat lain', level: 'L1' }],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P0',
      implemented: true,
      params: {
        type: 'object',
        properties: {
          chatId: { type: 'string', description: 'Target chat ID (optional, defaults to current chat)' },
          limit: { type: 'number', description: 'Maximum number of messages to fetch (max 50)' },
          since: { type: 'number', description: 'Fetch messages after timestamp in ms' },
        },
        additionalProperties: false,
      },
      async handler(context) {
        const targetChat = context.params.chatId ? normalizeTarget(String(context.params.chatId)) : context.chatId;
        if (targetChat !== context.chatId && context.role !== 'owner') {
          return {
            ok: false,
            status: 'denied',
            errorCode: 'permission_denied',
            reason: 'Membaca chat lain hanya diizinkan untuk Owner.',
            error: 'Membaca chat lain hanya diizinkan untuk Owner.',
            retryable: false,
          };
        }
        const limit = Math.min(50, Math.max(1, Number(context.params.limit ?? 20)));
        const messagesStore = context.services?.messages;
        if (!messagesStore) {
          return { ok: true, status: 'ok', output: { messages: [], chatId: targetChat } };
        }
        const recent = messagesStore.recent(targetChat, limit);
        return { ok: true, status: 'ok', output: { messages: recent, chatId: targetChat } };
      },
    },
    {
      name: 'wa.search_messages',
      category: 'read_context',
      description: 'Search messages by keyword in current or specified chat.',
      baseLevel: 'L0',
      scopeRules: [{ when: 'chat lain', level: 'L1' }],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          chatId: { type: 'string' },
          limit: { type: 'number' },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.download_media',
      category: 'read_context',
      description: 'Download media attachment from a message in current chat.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          messageId: { type: 'string' },
        },
        required: ['messageId'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.list_chats',
      category: 'read_context',
      description: 'List recent conversations. Owner only.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'owner',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          filter: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'wa.list_contacts',
      category: 'read_context',
      description: 'List address book contacts. Owner only.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'owner',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'wa.list_groups',
      category: 'read_context',
      description: 'List groups where the bot is a member.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'wa.get_group_info',
      category: 'read_context',
      description: 'Get details and metadata of a group.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          groupId: { type: 'string' },
        },
        required: ['groupId'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.get_contact_info',
      category: 'read_context',
      description: 'Get public profile information for a contact.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          jid: { type: 'string' },
        },
        required: ['jid'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.check_number',
      category: 'read_context',
      description: 'Check if phone numbers are registered on WhatsApp (max 10).',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          numbers: { type: 'array', items: { type: 'string' }, maxItems: 10 },
        },
        required: ['numbers'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.get_profile_picture',
      category: 'read_context',
      description: 'Fetch profile picture URL of a user or group.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          jid: { type: 'string' },
        },
        required: ['jid'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.view_status',
      category: 'read_context',
      description: 'View WhatsApp status stories of a contact.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'owner',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          jid: { type: 'string' },
        },
        additionalProperties: false,
      },
    },

    // ── KATEGORI C: Grup dan Komunitas ───────────────────────────────────────
    {
      name: 'wa.group_create',
      category: 'group_community',
      description: 'Create a new WhatsApp group.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          participants: { type: 'array', items: { type: 'string' } },
        },
        required: ['subject', 'participants'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.group_set_subject',
      category: 'group_community',
      description: 'Update the subject/name of a group.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          groupId: { type: 'string' },
          subject: { type: 'string' },
        },
        required: ['groupId', 'subject'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.group_set_description',
      category: 'group_community',
      description: 'Update description of a group.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          groupId: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['groupId', 'text'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.group_set_picture',
      category: 'group_community',
      description: 'Change the group display picture.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          groupId: { type: 'string' },
          source: { type: 'string' },
        },
        required: ['groupId', 'source'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.group_add',
      category: 'group_community',
      description: 'Add participants to a group.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          groupId: { type: 'string' },
          jids: { type: 'array', items: { type: 'string' } },
        },
        required: ['groupId', 'jids'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.group_remove',
      category: 'group_community',
      description: 'Remove participants from a group.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          groupId: { type: 'string' },
          jids: { type: 'array', items: { type: 'string' } },
        },
        required: ['groupId', 'jids'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.group_promote',
      category: 'group_community',
      description: 'Promote participants to group admins.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          groupId: { type: 'string' },
          jids: { type: 'array', items: { type: 'string' } },
        },
        required: ['groupId', 'jids'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.group_demote',
      category: 'group_community',
      description: 'Demote group admins to regular members.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          groupId: { type: 'string' },
          jids: { type: 'array', items: { type: 'string' } },
        },
        required: ['groupId', 'jids'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.group_settings',
      category: 'group_community',
      description: 'Update group permissions and settings.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          groupId: { type: 'string' },
          announce: { type: 'boolean' },
          locked: { type: 'boolean' },
          joinApproval: { type: 'boolean' },
          memberAddMode: { type: 'boolean' },
        },
        required: ['groupId'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.group_invite_link',
      category: 'group_community',
      description: 'Get or revoke the invite link for a group.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          groupId: { type: 'string' },
          action: { type: 'string', enum: ['get', 'revoke'] },
        },
        required: ['groupId', 'action'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.group_join',
      category: 'group_community',
      description: 'Join a group using an invite link.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          inviteLink: { type: 'string' },
        },
        required: ['inviteLink'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.group_leave',
      category: 'group_community',
      description: 'Leave a group.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          groupId: { type: 'string' },
        },
        required: ['groupId'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.group_join_requests',
      category: 'group_community',
      description: 'Manage group join approval requests.',
      baseLevel: 'L0',
      scopeRules: [{ when: 'approve dan reject', level: 'L1' }],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          groupId: { type: 'string' },
          action: { type: 'string', enum: ['list', 'approve', 'reject'] },
          jids: { type: 'array', items: { type: 'string' } },
        },
        required: ['groupId', 'action'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.group_ephemeral',
      category: 'group_community',
      description: 'Set ephemeral message timer in a group.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          groupId: { type: 'string' },
          duration: { type: 'number' },
        },
        required: ['groupId', 'duration'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.community_manage',
      category: 'group_community',
      description: 'Manage WhatsApp community.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P2',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          communityId: { type: 'string' },
          action: { type: 'string' },
          params: { type: 'object' },
        },
        required: ['communityId', 'action'],
        additionalProperties: false,
      },
    },

    // ── KATEGORI D: Manajemen Chat ───────────────────────────────────────────
    {
      name: 'wa.chat_modify',
      category: 'chat_management',
      description: 'Archive, pin, mute, or mark a chat.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          chatId: { type: 'string' },
          action: { type: 'string', enum: ['archive', 'unarchive', 'pin', 'unpin', 'mute', 'unmute', 'markUnread'] },
          duration: { type: 'number' },
        },
        required: ['chatId', 'action'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.chat_clear',
      category: 'chat_management',
      description: 'Clear all messages in a chat.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'owner',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          chatId: { type: 'string' },
        },
        required: ['chatId'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.chat_delete',
      category: 'chat_management',
      description: 'Delete a conversation from chat list.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'owner',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          chatId: { type: 'string' },
        },
        required: ['chatId'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.set_disappearing',
      category: 'chat_management',
      description: 'Set disappearing messages timer for a specific chat.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          chatId: { type: 'string' },
          duration: { type: 'number' },
        },
        required: ['chatId', 'duration'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.block_contact',
      category: 'chat_management',
      description: 'Block or unblock a contact.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          jid: { type: 'string' },
          action: { type: 'string', enum: ['block', 'unblock'] },
        },
        required: ['jid', 'action'],
        additionalProperties: false,
      },
    },

    // ── KATEGORI E: Profil, Status, dan Privasi Akun Bot ──────────────────────
    {
      name: 'wa.set_profile_name',
      category: 'profile_privacy',
      description: "Update the bot's WhatsApp display name.",
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'owner',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.set_about',
      category: 'profile_privacy',
      description: "Update the bot's WhatsApp status/about text.",
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'owner',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          text: { type: 'string' },
        },
        required: ['text'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.set_profile_picture',
      category: 'profile_privacy',
      description: "Update the bot's profile avatar.",
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'owner',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          source: { type: 'string' },
        },
        required: ['source'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.remove_profile_picture',
      category: 'profile_privacy',
      description: "Remove the bot's profile avatar.",
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'owner',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
    {
      name: 'wa.post_status',
      category: 'profile_privacy',
      description: 'Post a story / status update.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['text', 'image', 'video'] },
          content: { type: 'string' },
          audience: { type: 'array', items: { type: 'string' } },
        },
        required: ['type', 'content'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.delete_status',
      category: 'profile_privacy',
      description: 'Delete a posted story / status update.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          statusId: { type: 'string' },
        },
        required: ['statusId'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.update_privacy',
      category: 'profile_privacy',
      description: 'Configure WhatsApp privacy settings.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'owner',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          setting: {
            type: 'string',
            enum: ['lastSeen', 'online', 'profilePicture', 'status', 'readReceipts', 'groupsAdd', 'calls'],
          },
          value: { type: 'string' },
        },
        required: ['setting', 'value'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.set_default_disappearing',
      category: 'profile_privacy',
      description: 'Set default disappearing timer for all new chats.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'owner',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          duration: { type: 'number' },
        },
        required: ['duration'],
        additionalProperties: false,
      },
    },

    // ── KATEGORI F: Channel dan Broadcast ────────────────────────────────────
    {
      name: 'wa.channel_manage',
      category: 'channel_broadcast',
      description: 'Manage WhatsApp newsletter / channels.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['follow', 'unfollow', 'create', 'update', 'mute'] },
          channelId: { type: 'string' },
          params: { type: 'object' },
        },
        required: ['action'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.channel_send',
      category: 'channel_broadcast',
      description: 'Post an update to a WhatsApp channel.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          channelId: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['channelId', 'content'],
        additionalProperties: false,
      },
    },
    {
      name: 'wa.broadcast',
      category: 'channel_broadcast',
      description: 'Send a broadcast message to multiple contacts with randomized delay and recipient limits.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          recipients: { type: 'array', items: { type: 'string' } },
          content: { type: 'string' },
        },
        required: ['recipients', 'content'],
        additionalProperties: false,
      },
    },

    // ── KATEGORI G: Kecerdasan dan Media AI ───────────────────────────────────
    {
      name: 'ai.analyze_image',
      category: 'ai_media',
      description: 'Analyze an image and describe or answer questions about it.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P0',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          source: { type: 'string' },
          question: { type: 'string' },
        },
        required: ['source'],
        additionalProperties: false,
      },
    },
    {
      name: 'ai.ocr',
      category: 'ai_media',
      description: 'Extract text from an image.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          source: { type: 'string' },
        },
        required: ['source'],
        additionalProperties: false,
      },
    },
    {
      name: 'ai.transcribe_audio',
      category: 'ai_media',
      description: 'Transcribe a voice note or audio file to text.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P0',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          source: { type: 'string' },
          lang: { type: 'string' },
        },
        required: ['source'],
        additionalProperties: false,
      },
    },
    {
      name: 'ai.summarize_document',
      category: 'ai_media',
      description: 'Summarize a PDF or document file.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          source: { type: 'string' },
          style: { type: 'string' },
        },
        required: ['source'],
        additionalProperties: false,
      },
    },
    {
      name: 'ai.translate',
      category: 'ai_media',
      description: 'Translate text to a target language.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          to: { type: 'string' },
        },
        required: ['text', 'to'],
        additionalProperties: false,
      },
    },
    {
      name: 'ai.tts',
      category: 'ai_media',
      description: 'Convert text into spoken audio.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          voice: { type: 'string' },
        },
        required: ['text'],
        additionalProperties: false,
      },
    },
    {
      name: 'ai.generate_image',
      category: 'ai_media',
      description: 'Generate an image from a descriptive prompt.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P2',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          size: { type: 'string' },
        },
        required: ['prompt'],
        additionalProperties: false,
      },
    },
    {
      name: 'ai.make_sticker',
      category: 'ai_media',
      description: 'Create a sticker from an image file.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          source: { type: 'string' },
          pack: { type: 'string' },
          author: { type: 'string' },
        },
        required: ['source'],
        additionalProperties: false,
      },
    },
    {
      name: 'ai.describe_video',
      category: 'ai_media',
      description: 'Analyze and describe a video clip.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P2',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          source: { type: 'string' },
        },
        required: ['source'],
        additionalProperties: false,
      },
    },
    {
      name: 'ai.create_file',
      category: 'ai_media',
      description: 'Generate a document file (pdf, docx, xlsx, csv, txt) and send to chat.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P2',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['pdf', 'docx', 'xlsx', 'csv', 'txt'] },
          spec: { type: 'object' },
        },
        required: ['type', 'spec'],
        additionalProperties: false,
      },
    },

    // ── KATEGORI H: Web dan Utilitas ─────────────────────────────────────────
    {
      name: 'web.search',
      category: 'web_utility',
      description: 'Search the web for up-to-date information.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          limit: { type: 'number' },
        },
        required: ['query'],
        additionalProperties: false,
      },
    },
    {
      name: 'web.fetch',
      category: 'web_utility',
      description: 'Fetch text content from a web page safely (internal IPs and private networks blocked).',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      rateLimit: { perMinute: 20, perChatPerMinute: 10 },
      relaxable: false,
      audit: true,
      priority: 'P0',
      implemented: true,
      params: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Web URL to fetch (http or https only)' },
        },
        required: ['url'],
        additionalProperties: false,
      },
      async handler(context) {
        const url = String(context.params.url ?? '').trim();
        if (!url) return { ok: false, status: 'error', error: 'URL is required.', retryable: false };

        const result = await safeFetch(url);
        if (!result.ok) {
          return {
            ok: false,
            status: result.error?.startsWith('SSRF') ? 'denied' : 'error',
            errorCode: result.error?.startsWith('SSRF') ? 'ssrf_blocked' : 'fetch_failed',
            reason: result.error,
            error: result.error,
            retryable: false,
          };
        }

        return {
          ok: true,
          status: 'ok',
          output: {
            url: result.url,
            status: result.status,
            contentType: result.contentType,
            content: result.data,
          },
        };
      },
    },
    {
      name: 'util.now',
      category: 'web_utility',
      description: 'Get current date, time, and timezone information.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      relaxable: false,
      audit: false,
      priority: 'P0',
      implemented: true,
      params: {
        type: 'object',
        properties: {
          timezone: { type: 'string', description: 'IANA timezone name, e.g. "Asia/Jakarta"' },
        },
        additionalProperties: false,
      },
      async handler(context) {
        const tz = (context.params.timezone as string) || 'Asia/Jakarta';
        const date = new Date();
        try {
          const formatted = new Intl.DateTimeFormat('id-ID', {
            dateStyle: 'full',
            timeStyle: 'long',
            timeZone: tz,
          }).format(date);
          return {
            ok: true,
            status: 'ok',
            output: {
              timestamp: date.getTime(),
              iso: date.toISOString(),
              formatted,
              timezone: tz,
            },
          };
        } catch {
          return {
            ok: true,
            status: 'ok',
            output: {
              timestamp: date.getTime(),
              iso: date.toISOString(),
              formatted: date.toLocaleString('id-ID'),
              timezone: 'UTC',
            },
          };
        }
      },
    },
    {
      name: 'util.calculate',
      category: 'web_utility',
      description: 'Safely calculate a mathematical expression (supports +, -, *, /, %, ^, parentheses, sqrt, abs, sin, cos, tan, log, min, max, pi, e).',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      relaxable: false,
      audit: false,
      priority: 'P0',
      implemented: true,
      params: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Math expression to compute, e.g. "sqrt(16) * 5 + 2^3"' },
        },
        required: ['expression'],
        additionalProperties: false,
      },
      async handler(context) {
        const expression = String(context.params.expression ?? '').trim();
        if (!expression) return { ok: false, status: 'error', error: 'Math expression is required.', retryable: false };

        const evaluation = evaluateSafeMath(expression);
        if (!evaluation.ok) {
          return {
            ok: false,
            status: 'error',
            errorCode: 'math_error',
            error: evaluation.error,
            retryable: false,
          };
        }

        return {
          ok: true,
          status: 'ok',
          output: {
            expression,
            result: evaluation.result,
          },
        };
      },
    },
    {
      name: 'util.convert',
      category: 'web_utility',
      description: 'Convert values between units of measurement (length, weight/mass, temperature, time, digital data).',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      relaxable: false,
      audit: false,
      priority: 'P0',
      implemented: true,
      params: {
        type: 'object',
        properties: {
          value: { type: 'number', description: 'Numeric value to convert' },
          from: { type: 'string', description: 'Source unit, e.g. "km", "kg", "c"' },
          to: { type: 'string', description: 'Target unit, e.g. "mi", "lb", "f"' },
        },
        required: ['value', 'from', 'to'],
        additionalProperties: false,
      },
      async handler(context) {
        const value = Number(context.params.value);
        if (isNaN(value)) return { ok: false, status: 'error', error: 'Invalid numeric value.', retryable: false };
        const from = String(context.params.from ?? '');
        const to = String(context.params.to ?? '');

        const conversion = convertUnits(value, from, to);
        if (!conversion.ok) {
          return {
            ok: false,
            status: 'error',
            errorCode: 'conversion_error',
            error: conversion.error,
            retryable: false,
          };
        }

        return {
          ok: true,
          status: 'ok',
          output: {
            value,
            from,
            to,
            result: conversion.result,
          },
        };
      },
    },
    {
      name: 'util.reminder',
      category: 'web_utility',
      description: 'Set a reminder for oneself (L0) or for someone else (L1).',
      baseLevel: 'L0',
      scopeRules: [{ when: 'target orang lain', level: 'L1' }],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['create', 'list', 'cancel'] },
          text: { type: 'string' },
          when: { type: 'string' },
          target: { type: 'string' },
        },
        required: ['action', 'text', 'when'],
        additionalProperties: false,
      },
    },

    // ── KATEGORI I: Memori ───────────────────────────────────────────────────
    {
      name: 'memory.save_note',
      category: 'memory',
      description: 'Save a memory fact or note about the user or current conversation.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P0',
      implemented: true,
      params: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Information/fact to remember' },
          scope: { type: 'string', enum: ['user', 'chat'], description: 'Scope of the note' },
        },
        required: ['text'],
        additionalProperties: false,
      },
      async handler(context) {
        const text = String(context.params.text ?? '').trim();
        if (!text) return { ok: false, status: 'error', error: 'Note text cannot be empty.', retryable: false };
        const scope = (context.params.scope as string) || 'user';
        const targetId = scope === 'chat' ? context.chatId : context.senderId;

        const memoryStore = context.services?.memory;
        if (memoryStore) {
          const saved = memoryStore.save(targetId, text);
          return { ok: true, status: 'ok', output: { id: saved.id, text, scope, targetId } };
        }
        return { ok: true, status: 'ok', output: { text, scope, saved: true } };
      },
    },
    {
      name: 'memory.search',
      category: 'memory',
      description: 'Search previously saved memory notes for relevant facts.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      relaxable: false,
      audit: false,
      priority: 'P0',
      implemented: true,
      params: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search keywords' },
        },
        required: ['query'],
        additionalProperties: false,
      },
      async handler(context) {
        const query = String(context.params.query ?? '').trim();
        if (!query) return { ok: false, status: 'error', error: 'Search query is required.', retryable: false };

        const memoryStore = context.services?.memory;
        if (memoryStore) {
          const notes = memoryStore.search(context.senderId, query);
          return { ok: true, status: 'ok', output: { notes, query } };
        }
        return { ok: true, status: 'ok', output: { notes: [], query } };
      },
    },
    {
      name: 'memory.forget',
      category: 'memory',
      description: 'Delete a specific memory note or clear all user memory.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P0',
      implemented: true,
      params: {
        type: 'object',
        properties: {
          noteId: { type: 'number', description: 'Specific note ID to delete' },
          all: { type: 'boolean', description: 'Set true to wipe all notes for this user' },
        },
        additionalProperties: false,
      },
      async handler(context) {
        const memoryStore = context.services?.memory;
        if (!memoryStore) {
          return { ok: true, status: 'ok', output: { deleted: true } };
        }

        if (context.params.all) {
          const deletedCount = memoryStore.clear(context.senderId);
          return { ok: true, status: 'ok', output: { clearedAll: true, count: deletedCount } };
        }

        if (context.params.noteId) {
          const success = memoryStore.delete(Number(context.params.noteId));
          return { ok: true, status: 'ok', output: { deleted: success, id: context.params.noteId } };
        }

        return { ok: false, status: 'error', error: 'Specify noteId or all: true', retryable: false };
      },
    },
    {
      name: 'memory.view_user',
      category: 'memory',
      description: 'View all memory notes of a specified user. Owner only.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'owner',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          jid: { type: 'string' },
        },
        required: ['jid'],
        additionalProperties: false,
      },
    },

    // ── KATEGORI J: Kontrol Bot (Terbatas) ────────────────────────────────────
    {
      name: 'bot.status',
      category: 'bot_control',
      description: 'Check bot status, platform connection, and system health.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      relaxable: false,
      audit: false,
      priority: 'P0',
      implemented: true,
      params: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      async handler(context) {
        const getStatus = context.services?.getStatus;
        if (getStatus) {
          return { ok: true, status: 'ok', output: getStatus() };
        }
        return {
          ok: true,
          status: 'ok',
          output: {
            platform: context.adapter.id,
            status: context.adapter.getStatus(),
            chatId: context.chatId,
          },
        };
      },
    },
    {
      name: 'bot.list_users',
      category: 'bot_control',
      description: 'List users and their roles.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          filter: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'bot.set_persona',
      category: 'bot_control',
      description: 'Change the active AI persona for this chat.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          chatId: { type: 'string' },
          personaId: { type: 'string' },
        },
        required: ['chatId', 'personaId'],
        additionalProperties: false,
      },
    },
    {
      name: 'bot.set_chat_mode',
      category: 'bot_control',
      description: 'Set group response mode (off, mention, aktif). Mode aktif is L1.',
      baseLevel: 'L0',
      scopeRules: [{ when: 'mode aktif', level: 'L1' }],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          chatId: { type: 'string' },
          mode: { type: 'string', enum: ['off', 'mention', 'aktif'] },
        },
        required: ['chatId', 'mode'],
        additionalProperties: false,
      },
    },
    {
      name: 'bot.user_block',
      category: 'bot_control',
      description: 'Block or unblock a member from using the bot.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          jid: { type: 'string' },
          action: { type: 'string', enum: ['block', 'unblock'] },
        },
        required: ['jid', 'action'],
        additionalProperties: false,
      },
    },
    {
      name: 'bot.user_quota',
      category: 'bot_control',
      description: 'Set daily quota for a user.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'admin',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          jid: { type: 'string' },
          quota: { type: 'number' },
        },
        required: ['jid', 'quota'],
        additionalProperties: false,
      },
    },
    {
      name: 'bot.user_set_role',
      category: 'bot_control',
      description: 'Change user role (admin or member). Owner only.',
      baseLevel: 'L1',
      scopeRules: [],
      minRole: 'owner',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          jid: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'member'] },
        },
        required: ['jid', 'role'],
        additionalProperties: false,
      },
    },
    {
      name: 'bot.list_approvals',
      category: 'bot_control',
      description: 'List pending or past approval requests. Owner only.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'owner',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          status: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
    {
      name: 'bot.panic',
      category: 'bot_control',
      description: 'Emergency kill switch: instantly disable all L1 risky tools. Can only be turned off by Owner outside AI.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'owner',
      relaxable: false,
      audit: true,
      priority: 'P0',
      implemented: true,
      params: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      async handler(context) {
        if (context.services?.setKillSwitch) {
          context.services.setKillSwitch(true);
        } else if (context.services?.settings) {
          context.services.settings.set('kill_switch', 'true');
          context.services.audit?.record({
            actorJid: context.senderId,
            action: 'killswitch.enabled',
            params: { via: 'bot.panic' },
          });
        }
        return {
          ok: true,
          status: 'ok',
          output: {
            killSwitch: true,
            message: 'Kill switch berhasil diaktifkan. Semua aksi L1 diblokir.',
          },
        };
      },
    },

    // ── Legacy Aliases untuk Kompatibilitas v0.1 ──────────────────────────────
    {
      name: 'send_message',
      category: 'message_media',
      description: 'Send text message to another contact or group. Legacy alias for wa.send_text.',
      baseLevel: 'L1',
      scopeRules: [{ when: 'to kosong atau sama dengan chat ini', level: 'L0' }],
      minRole: 'admin',
      rateLimit: { perMinute: 20, perChatPerMinute: 6 },
      relaxable: false,
      audit: true,
      priority: 'P0',
      implemented: true,
      params: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Target number or JID' },
          text: { type: 'string', description: 'Message body' },
        },
        required: ['to', 'text'],
        additionalProperties: false,
      },
      async handler(context) {
        const to = normalizeTarget(String(context.params.to ?? ''));
        const text = String(context.params.text ?? '').trim();
        if (!to || to === '@s.whatsapp.net') {
          return { ok: false, status: 'error', error: 'Nomor tujuan tidak valid.' };
        }
        if (!text) return { ok: false, status: 'error', error: 'Isi pesan kosong.' };
        if (text.length > 4096) return { ok: false, status: 'error', error: 'Pesan melebihi 4096 karakter.' };
        await context.adapter.send(to, { text });
        return { ok: true, status: 'ok', output: { to, length: text.length } };
      },
    },
    {
      name: 'react',
      category: 'message_media',
      description: 'React with emoji to a message in current chat. Legacy alias for wa.react.',
      baseLevel: 'L0',
      scopeRules: [],
      minRole: 'member',
      relaxable: false,
      audit: true,
      priority: 'P0',
      implemented: true,
      params: {
        type: 'object',
        properties: {
          emoji: { type: 'string' },
          messageId: { type: 'string' },
        },
        required: ['emoji'],
        additionalProperties: false,
      },
      async handler(context) {
        const emoji = String(context.params.emoji ?? '').trim();
        const messageId = String(context.params.messageId ?? context.message?.id ?? '');
        await context.adapter.send(context.chatId, { reaction: { emoji, messageId } });
        return { ok: true, status: 'ok', output: { emoji, messageId } };
      },
    },
    {
      name: 'update_profile',
      category: 'profile_privacy',
      description: 'Update profile. Legacy alias for wa.set_about/status. L2 action.',
      baseLevel: 'L2',
      scopeRules: [],
      minRole: 'owner',
      relaxable: false,
      audit: true,
      priority: 'P1',
      implemented: false,
      params: {
        type: 'object',
        properties: {
          status: { type: 'string' },
        },
        additionalProperties: false,
      },
      async handler() {
        return { ok: false, status: 'denied', error: 'Aksi L2 tidak boleh dieksekusi dari chat. Gunakan Web UI.' };
      },
    },
  ];

  return tools;
}
