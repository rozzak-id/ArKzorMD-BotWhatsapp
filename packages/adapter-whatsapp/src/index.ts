import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  ApprovalRequest,
  ConnectionStatus,
  InternalMessage,
  Logger,
  MediaAttachment,
  MessageHandler,
  OutgoingContent,
  PlatformAdapter,
  PlatformCapabilities,
} from '@arkzormd/core';
import { PlatformNotConnectedError } from '@arkzormd/core';
import type {
  AnyMessageContent,
  ConnectionState,
  WAMessage,
  WASocket,
} from 'onigis';
import {
  buildNativeFlowButtons,
  sendInteractiveMessage,
  type InteractiveButtonOptions,
  type SendInteractiveOptions,
} from './interactive.js';

export {
  buildNativeFlowButtons,
  sendInteractiveMessage,
  type InteractiveButtonOptions,
  type SendInteractiveOptions,
};

type OnigisModule = typeof import('onigis');

interface RichClassicModule {
  buildButtonsMessage?: (options: {
    text: string;
    footer?: string;
    buttons: Array<{ buttonId: string; buttonText: string }>;
  }) => unknown;
  sendClassicMessage?: (
    socket: WASocket,
    jid: string,
    content: unknown,
    options?: Record<string, unknown>,
  ) => Promise<unknown>;
}

interface RecentMessage {
  message: WAMessage;
  senderId: string;
}

export class WhatsAppModuleMissingError extends Error {
  constructor(moduleName: string, cause?: unknown) {
    super(
      `Paket "${moduleName}" tidak dapat dimuat. Jalankan npm install, lalu coba lagi. ` +
        'Untuk pengembangan tanpa WhatsApp, gunakan WHATSAPP_MODE=mock.',
      { cause },
    );
    this.name = 'WhatsAppModuleMissingError';
  }
}

export interface WhatsAppAdapterOptions {
  authDir: string;
  logger: Logger;
  /** Nama modul; default `onigis` (fork Onigi/Baileys). */
  moduleName?: string;
  /** Prefix command untuk tombol approval; default `.`. */
  commandPrefix?: string;
  /** Izinkan owner mengontrol bot langsung dari nomor akun bot itu sendiri (Self Mode). Default true. */
  allowSelfControl?: boolean;
  /** Otomatis tandai pesan dibaca (centang biru) saat diterima. Default true. */
  autoRead?: boolean;
  /** Jeda simulasi pengetikan (anti-ban) dalam milidetik. Default 1200ms. */
  jitterDelayMs?: number;
  onQr?: (qr: string) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}

const MAX_RECENT_MESSAGES = 200;
const MAX_SEEN_IDS = 1_000;

/** Normalisasi JID ke bentuk user@server tanpa suffix device. */
export function normalizeUserJid(jid: string): string {
  const value = jid.trim();
  const at = value.indexOf('@');
  if (at < 0) return value;
  const user = value.slice(0, at).split(':')[0] ?? '';
  return `${user}${value.slice(at)}`;
}

export function isGroupJid(jid: string): boolean {
  return jid.endsWith('@g.us');
}

export function isPnJid(jid: string): boolean {
  return jid.endsWith('@s.whatsapp.net') || jid.endsWith('@hosted');
}

export function isLidJid(jid: string): boolean {
  return jid.endsWith('@lid') || jid.endsWith('@hosted.lid');
}

function isIgnoredJid(jid: string): boolean {
  return (
    jid === 'status@broadcast' ||
    jid.endsWith('@newsletter') ||
    jid.endsWith('@broadcast')
  );
}

function sameUser(a: string, b: string): boolean {
  return normalizeUserJid(a) === normalizeUserJid(b);
}

function pickSenderJid(primary: string, alt?: string | null): string {
  const normalized = normalizeUserJid(primary);
  if (isPnJid(normalized)) return normalized;
  if (alt) {
    const normalizedAlt = normalizeUserJid(alt);
    if (isPnJid(normalizedAlt)) return normalizedAlt;
  }
  return normalized;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object' && 'toNumber' in value) {
    const fn = (value as { toNumber?: () => number }).toNumber;
    if (typeof fn === 'function') {
      const result = fn.call(value);
      if (Number.isFinite(result)) return result;
    }
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const result = Number(value);
    if (Number.isFinite(result)) return result;
  }
  return undefined;
}

function guessFileName(source: string): string {
  try {
    const clean = source.split('?')[0] ?? source;
    const path = clean.startsWith('file://') ? fileURLToPath(clean) : clean;
    return basename(path) || 'dokumen';
  } catch {
    return 'dokumen';
  }
}

function unwrapContent(
  content: Record<string, unknown> | null | undefined,
  depth = 0,
): Record<string, unknown> | undefined {
  if (!content || depth > 4) return undefined;
  const wrappers = [
    'ephemeralMessage',
    'viewOnceMessage',
    'viewOnceMessageV2',
    'viewOnceMessageV2Extension',
    'documentWithCaptionMessage',
  ] as const;
  for (const wrapper of wrappers) {
    const inner = content[wrapper] as { message?: Record<string, unknown> } | undefined;
    if (inner?.message) return unwrapContent(inner.message, depth + 1);
  }
  return content;
}

function contextInfoOf(content: Record<string, unknown>): Record<string, unknown> | undefined {
  for (const value of Object.values(content)) {
    if (value && typeof value === 'object' && 'contextInfo' in value) {
      return (value as { contextInfo?: Record<string, unknown> }).contextInfo;
    }
  }
  return undefined;
}

/** Ambil teks yang bisa dibaca dari content WhatsApp. */
export function extractText(content: Record<string, unknown> | null | undefined): string {
  const message = unwrapContent(content);
  if (!message) return '';

  const direct = message.conversation;
  if (typeof direct === 'string' && direct.length > 0) return direct;

  const extended = message.extendedTextMessage as { text?: unknown } | undefined;
  if (typeof extended?.text === 'string') return extended.text;

  for (const key of ['imageMessage', 'videoMessage', 'documentMessage'] as const) {
    const media = message[key] as { caption?: unknown } | undefined;
    if (typeof media?.caption === 'string') return media.caption;
  }

  const buttonReply = message.buttonsResponseMessage as
    | { selectedButtonId?: unknown; selectedDisplayText?: unknown }
    | undefined;
  if (typeof buttonReply?.selectedButtonId === 'string' && buttonReply.selectedButtonId.trim()) {
    return buttonReply.selectedButtonId.trim();
  }
  if (typeof buttonReply?.selectedDisplayText === 'string' && buttonReply.selectedDisplayText.trim()) {
    return buttonReply.selectedDisplayText.trim();
  }

  const listReply = message.listResponseMessage as
    | { title?: unknown; singleSelectReply?: { selectedRowId?: unknown } }
    | undefined;
  if (typeof listReply?.singleSelectReply?.selectedRowId === 'string' && listReply.singleSelectReply.selectedRowId.trim()) {
    return listReply.singleSelectReply.selectedRowId.trim();
  }
  if (typeof listReply?.title === 'string' && listReply.title.trim()) return listReply.title.trim();

  const templateReply = message.templateButtonReplyMessage as
    | { selectedId?: unknown }
    | undefined;
  if (typeof templateReply?.selectedId === 'string' && templateReply.selectedId.trim()) return templateReply.selectedId.trim();

  const interactive = message.interactiveResponseMessage as
    | { nativeFlowResponseMessage?: { paramsJson?: unknown } }
    | undefined;
  const paramsJson = interactive?.nativeFlowResponseMessage?.paramsJson;
  if (typeof paramsJson === 'string') {
    try {
      const parsed = JSON.parse(paramsJson) as {
        id?: unknown;
        row_id?: unknown;
        selected_id?: unknown;
        selectedRowId?: unknown;
        title?: unknown;
      };
      const resId = parsed.id || parsed.row_id || parsed.selected_id || parsed.selectedRowId || parsed.title;
      if (typeof resId === 'string' && resId.trim()) return resId.trim();
    } catch {
      // abaikan payload yang bukan JSON
    }
  }

  return '';
}

function extractMedia(content: Record<string, unknown>): MediaAttachment[] {
  const message = unwrapContent(content);
  if (!message) return [];

  const result: MediaAttachment[] = [];
  const kinds = [
    ['imageMessage', 'image'],
    ['audioMessage', 'audio'],
    ['videoMessage', 'video'],
    ['documentMessage', 'document'],
    ['stickerMessage', 'sticker'],
  ] as const;

  for (const [key, kind] of kinds) {
    const media = message[key] as
      | {
          mimetype?: unknown;
          caption?: unknown;
          fileName?: unknown;
          title?: unknown;
          fileLength?: unknown;
        }
      | undefined;
    if (!media) continue;
    result.push({
      kind,
      mimeType: typeof media.mimetype === 'string' ? media.mimetype : undefined,
      fileName:
        typeof media.fileName === 'string'
          ? media.fileName
          : typeof media.title === 'string'
            ? media.title
            : undefined,
      caption: typeof media.caption === 'string' ? media.caption : undefined,
      sizeBytes: toNumber(media.fileLength),
    });
  }
  return result;
}

/** Ubah WAMessage onigis menjadi InternalMessage netral platform. */
export function normalizeIncomingMessage(
  raw: WAMessage,
  options: {
    botJid?: string | null;
    allowSelfControl?: boolean;
    sentMessageIds?: Set<string>;
  } = {},
): InternalMessage | null {
  const key = raw.key;
  if (!key?.remoteJid || !key.id) return null;

  if (key.fromMe) {
    // Abaikan jika pesan ini dikirim otomatis oleh bot itu sendiri
    if (options.sentMessageIds && options.sentMessageIds.has(key.id)) {
      return null;
    }
    // Abaikan jika self control tidak diizinkan
    if (!options.allowSelfControl) {
      return null;
    }
  }

  const chatId = normalizeUserJid(key.remoteJid);
  if (isIgnoredJid(chatId)) return null;

  const content = unwrapContent(raw.message as Record<string, unknown> | null | undefined);
  if (!content) return null;

  // Pesan sistem/protokol dan reaksi bukan percakapan.
  if (
    content.protocolMessage ||
    content.senderKeyDistributionMessage ||
    content.reactionMessage ||
    content.pollUpdateMessage
  ) {
    return null;
  }

  const text = extractText(content);
  const media = extractMedia(content);
  if (!text && media.length === 0) return null;

  const isGroup = isGroupJid(chatId);
  const primarySender = key.fromMe
    ? (options.botJid ? normalizeUserJid(options.botJid) : chatId)
    : isGroup
      ? (key.participant ?? key.participantAlt ?? chatId)
      : chatId;
  const senderAlt = key.fromMe
    ? undefined
    : isGroup
      ? (key.participantAlt ?? key.remoteJidAlt)
      : key.remoteJidAlt;
  const senderId = pickSenderJid(primarySender, senderAlt);
  const contextInfo = contextInfoOf(content);
  const quotedContent = unwrapContent(
    contextInfo?.quotedMessage as Record<string, unknown> | null | undefined,
  );
  const quotedSender =
    typeof contextInfo?.participant === 'string'
      ? pickSenderJid(contextInfo.participant)
      : chatId;
  const quotedId = typeof contextInfo?.stanzaId === 'string' ? contextInfo.stanzaId : undefined;
  const quotedText = quotedContent ? extractText(quotedContent) : '';

  const mentioned = Array.isArray(contextInfo?.mentionedJid)
    ? contextInfo.mentionedJid.filter((jid): jid is string => typeof jid === 'string')
    : [];

  const timestampSeconds = toNumber(raw.messageTimestamp);
  const timestamp =
    timestampSeconds && timestampSeconds > 0 ? timestampSeconds * 1_000 : Date.now();

  return {
    id: key.id,
    platform: 'whatsapp',
    chatId,
    chatType: isGroup ? 'group' : 'private',
    senderId,
    senderName: raw.pushName ?? undefined,
    isGroup,
    text,
    media,
    ...(quotedId
      ? {
          quoted: {
            id: quotedId,
            senderId: quotedSender,
            text: quotedText || undefined,
            fromBot: Boolean(options.botJid && sameUser(quotedSender, options.botJid)),
          },
        }
      : {}),
    mentions: mentioned.map(normalizeUserJid),
    timestamp,
    fromBot: false,
  };
}

/**
 * Adapter WhatsApp berbasis `onigis` (fork Baileys 7 + E2EE MIT).
 *
 * Catatan platform: paket native `oktz-signal`/`oktz-curve25519` hanya
 * menyediakan prebuild Linux x64/arm64. Import dan pembuatan pesan berjalan di
 * Windows/macOS, tetapi koneksi live akan gagal pada enkripsi pertama.
 */
export class WhatsAppAdapter implements PlatformAdapter {
  readonly id = 'whatsapp' as const;
  readonly capabilities: PlatformCapabilities = {
    buttons: true,
    voice: true,
    groups: true,
  };

  private handler: MessageHandler | null = null;
  private status: ConnectionStatus = 'disconnected';
  private socket: WASocket | null = null;
  private module: OnigisModule | null = null;
  private saveCreds: (() => Promise<void>) | null = null;
  private connecting: Promise<void> | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempt = 0;
  private manualDisconnect = false;
  private qr: string | null = null;
  private botJid: string | null = null;
  private lastError: string | null = null;
  private readonly moduleName: string;
  private readonly commandPrefix: string;
  private readonly recent = new Map<string, RecentMessage>();
  private readonly seen = new Set<string>();
  private readonly sentMessageIds = new Set<string>();

  private markSentId(id?: string | null): void {
    if (!id) return;
    this.sentMessageIds.add(id);
    if (this.sentMessageIds.size > 2000) {
      const oldest = this.sentMessageIds.values().next().value;
      if (oldest) this.sentMessageIds.delete(oldest);
    }
  }

  constructor(private readonly options: WhatsAppAdapterOptions) {
    this.moduleName = options.moduleName ?? 'onigis';
    this.commandPrefix = options.commandPrefix ?? '.';
  }

  async connect(): Promise<void> {
    if (this.status === 'connected') return;
    if (this.connecting) return this.connecting;

    if (this.socket) {
      try {
        await this.socket.end(undefined);
      } catch {}
      this.socket = null;
    }

    this.manualDisconnect = false;
    this.connecting = this.doConnect()
      .catch((error: unknown) => {
        this.qr = null;
        this.lastError = error instanceof Error ? error.message : String(error);
        this.setStatus('error');
        this.options.logger.error({ err: error }, 'Koneksi WhatsApp gagal dimulai');
        throw error;
      })
      .finally(() => {
        this.connecting = null;
      });
    return this.connecting;
  }

  private isNativeEngineError(error: unknown): boolean {
    if (!error || typeof error !== 'object' || !('code' in error)) return false;
    const code = (error as { code?: unknown }).code;
    return code === 'ONIGI_XEDDSA_UNSUPPORTED' || code === 'ONIGI_SIGNAL_ENGINE_UNSUPPORTED';
  }

  private async doConnect(): Promise<void> {
    this.setStatus('connecting');
    this.lastError = null;
    if (process.platform !== 'linux') {
      this.options.logger.warn(
        { platform: process.platform },
        'Native E2EE onigis hanya tersedia untuk Linux x64/arm64. ' +
          'Jalankan WhatsApp live lewat Docker/WSL/Linux; mode mock tetap aman di platform ini.',
      );
    }

    let mod: OnigisModule;
    try {
      mod = this.module ?? (await import(this.moduleName));
      this.module = mod;
    } catch (error) {
      this.setStatus('error');
      throw new WhatsAppModuleMissingError(this.moduleName, error);
    }

    if (typeof mod.makeWASocket !== 'function') {
      this.setStatus('error');
      throw new Error(`Modul "${this.moduleName}" tidak mengekspor makeWASocket.`);
    }

    const { state, saveCreds } = await mod.useMultiFileAuthState(this.options.authDir);
    this.saveCreds = saveCreds;

    const socket = mod.makeWASocket({
      auth: state,
      browser: (mod as any).Browsers?.ubuntu?.('Chrome') ?? ['Ubuntu', 'Chrome', '22.04.4'],
      logger: this.options.logger,
      syncFullHistory: false,
      markOnlineOnConnect: true,
      emitOwnEvents: false,
      shouldIgnoreJid: (jid: string) => isIgnoredJid(jid),
      getMessage: async (key) => {
        const id = key.id;
        return id ? this.recent.get(id)?.message.message ?? undefined : undefined;
      },
    });

    this.socket = socket;
    if (socket.user?.id) this.botJid = normalizeUserJid(socket.user.id);

    socket.ev.on('creds.update', saveCreds);
    socket.ev.on('connection.update', (update) => this.handleConnectionUpdate(update));
    socket.ev.on('messages.upsert', (event) => {
      void this.handleMessages(event.messages).catch((error: unknown) => {
        this.options.logger.error({ err: error }, 'Gagal memproses batch pesan WhatsApp');
      });
    });
    socket.ev.on('error', (error) => {
      this.options.logger.error({ err: error }, 'Error socket WhatsApp');
    });

    this.options.logger.info(
      { module: this.moduleName, authDir: this.options.authDir },
      'Socket WhatsApp dibuat; menunggu QR/koneksi',
    );
  }

  async disconnect(): Promise<void> {
    this.manualDisconnect = true;
    this.qr = null;
    this.lastError = null;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const socket = this.socket;
    this.socket = null;
    if (socket) {
      try {
        await socket.end(undefined);
      } catch (error) {
        this.options.logger.warn({ err: error }, 'Gagal menutup socket WhatsApp');
      }
    }
    this.setStatus('disconnected');
  }

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  setAllowSelfControl(enabled: boolean): void {
    this.options.allowSelfControl = enabled;
  }

  setAutoRead(enabled: boolean): void {
    this.options.autoRead = enabled;
  }

  setJitterDelayMs(ms: number): void {
    this.options.jitterDelayMs = ms;
  }

  async requestPairingCode(phoneNumber: string): Promise<string> {
    let cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }
    if (cleanPhone.length < 8 || cleanPhone.length > 15) {
      throw new Error('Nomor telepon harus dalam format internasional yang valid (mis. 628123456789).');
    }

    if (this.status === 'connected') {
      throw new Error('WhatsApp sudah terhubung. Putuskan sesi terlebih dahulu jika ingin pairing ulang.');
    }

    if (this.socket && (this.status === 'disconnected' || this.status === 'error')) {
      await this.disconnect();
    }

    if (!this.socket) {
      await this.connect();
    }

    const socket = this.socket as any;
    if (typeof socket?.requestPairingCode !== 'function') {
      throw new Error(`Modul "${this.moduleName}" tidak menyediakan fungsi requestPairingCode.`);
    }

    // Tunggu websocket siap menerima stanza sebelum meminta kode pairing (maks 8 detik)
    if (!this.qr && !socket.ws?.isOpen) {
      await new Promise<void>((resolve) => {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts += 1;
          if (this.qr || socket.ws?.isOpen || attempts >= 25) {
            clearInterval(interval);
            resolve();
          }
        }, 300);
      });
    }

    // Beri buffer sejenak agar noise handshake selesai
    await new Promise((r) => setTimeout(r, 1000));

    try {
      const rawCode = await socket.requestPairingCode(cleanPhone);
      if (typeof rawCode === 'string') {
        const cleanCode = rawCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        if (cleanCode.length === 8) {
          return `${cleanCode.slice(0, 4)}-${cleanCode.slice(4)}`;
        }
        return rawCode;
      }
      return String(rawCode);
    } catch (err: unknown) {
      this.options.logger.error({ err, cleanPhone }, 'Gagal meminta pairing code dari server WhatsApp');
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(msg || 'Server WhatsApp menolak permintaan pairing code. Coba gunakan scan QR atau periksa nomor Anda.');
    }
  }

  async send(chatId: string, content: OutgoingContent): Promise<void> {
    const socket = this.requireSocket();
    const quoted = content.replyTo ? this.recent.get(content.replyTo)?.message : undefined;

    await this.withPresence(chatId, async () => {
      if (content.reaction) {
        const target = this.recent.get(content.reaction.messageId);
        await socket.sendMessage(chatId, {
          react: {
            text: content.reaction.emoji,
            key: {
              remoteJid: chatId,
              id: content.reaction.messageId,
              fromMe: false,
              ...(isGroupJid(chatId) && target ? { participant: target.senderId } : {}),
            },
          },
        });
      }

      if (content.media && content.media.length > 0) {
        let sentMedia = false;
        let captionUsed = false;
        for (const media of content.media) {
          const mediaCaption = captionUsed ? undefined : (content.text ?? media.caption);
          const mediaContent = await this.buildMediaContent(media, mediaCaption);
          if (!mediaContent) continue;
          sentMedia = true;
          if ('caption' in mediaContent) captionUsed = true;
          await socket.sendMessage(chatId, mediaContent, quoted ? { quoted } : undefined);
        }
        if (content.text && (!sentMedia || !captionUsed)) {
          const sent = await socket.sendMessage(chatId, { text: content.text }, quoted ? { quoted } : undefined);
          this.markSentId(sent?.key?.id);
        }
        return;
      }

      if (content.text) {
        const sent = await socket.sendMessage(chatId, { text: content.text }, quoted ? { quoted } : undefined);
        this.markSentId(sent?.key?.id);
      }
    });
  }

  async sendApproval(ownerId: string, request: ApprovalRequest): Promise<void> {
    const socket = this.requireSocket();
    const expiry = new Date(request.expiresAt).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const text = [
      `*Persetujuan ${request.shortCode}*`,
      `Dari: ${request.requesterRole} - ${request.requesterJid}`,
      `Aksi: ${request.toolName}`,
      `Detail: ${JSON.stringify(request.params)}`,
      `Berlaku sampai: ${expiry}`,
      '',
      `Balas \`${this.commandPrefix}approve ${request.shortCode}\` untuk setuju, ` +
        `\`${this.commandPrefix}reject ${request.shortCode}\` untuk tolak, atau ` +
        `\`${this.commandPrefix}always ${request.shortCode}\` untuk setuju selalu.`,
    ].join('\n');

    // 1. Coba kirim tombol interaktif Native Flow (modern Android/iOS WhatsApp)
    try {
      await sendInteractiveMessage(socket, this.module, ownerId, {
        title: `Persetujuan ${request.shortCode}`,
        body: [
          `Dari: ${request.requesterRole} - ${request.requesterJid}`,
          `Aksi: ${request.toolName}`,
          `Detail: ${JSON.stringify(request.params)}`,
          `Berlaku sampai: ${expiry}`,
        ].join('\n'),
        footer: 'ArKzorMD · Persetujuan Owner',
        buttons: [
          { text: 'Setuju', id: `${this.commandPrefix}approve ${request.shortCode}` },
          { text: 'Tolak', id: `${this.commandPrefix}reject ${request.shortCode}` },
          { text: 'Setuju Selalu', id: `${this.commandPrefix}always ${request.shortCode}` },
        ],
      });
      return;
    } catch (interactiveErr) {
      this.options.logger.debug(
        { err: interactiveErr, code: request.shortCode },
        'Native flow approval gagal; mencoba fallback',
      );
    }

    // 2. Fallback legacy rich-classic buttons jika tersedia
    const rich = this.module as unknown as RichClassicModule;
    if (typeof rich.buildButtonsMessage === 'function' && typeof rich.sendClassicMessage === 'function') {
      try {
        const content = rich.buildButtonsMessage({
          text,
          footer: 'ArKzorMD · persetujuan Owner',
          buttons: [
            {
              buttonId: `${this.commandPrefix}approve ${request.shortCode}`,
              buttonText: 'Setuju',
            },
            {
              buttonId: `${this.commandPrefix}reject ${request.shortCode}`,
              buttonText: 'Tolak',
            },
            {
              buttonId: `${this.commandPrefix}always ${request.shortCode}`,
              buttonText: 'Selalu',
            },
          ],
        });
        await rich.sendClassicMessage(socket, ownerId, content);
        return;
      } catch (error) {
        this.options.logger.warn(
          { err: error, code: request.shortCode },
          'Tombol approval legacy gagal dikirim; memakai teks fallback',
        );
      }
    }

    // 3. Fallback teks plain
    await this.send(ownerId, { text });
  }

  /** Kirim pesan interaktif Native Flow langsung lewat adapter */
  async sendInteractive(chatId: string, options: SendInteractiveOptions): Promise<any> {
    const socket = this.requireSocket();
    return sendInteractiveMessage(socket, this.module, chatId, options);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  /** QR terbaru (base64 payload) atau null bila sudah tersambung. */
  getQr(): string | null {
    return this.qr;
  }

  /** JID bot yang sedang login, mis. `628...@s.whatsapp.net`. */
  getBotJid(): string | null {
    return this.botJid;
  }

  /** Pesan error koneksi terakhir, atau null. */
  getLastError(): string | null {
    return this.lastError;
  }

  /** Dipanggil adapter saat pesan masuk telah dinormalisasi. */
  protected dispatch(message: InternalMessage): void {
    void this.handler?.(message);
  }

  private requireSocket(): WASocket {
    if (this.status !== 'connected' || !this.socket) {
      throw new PlatformNotConnectedError('WhatsApp');
    }
    return this.socket;
  }

  private async withPresence(chatId: string, action: () => Promise<void>): Promise<void> {
    const socket = this.socket;
    if (!socket) throw new PlatformNotConnectedError('WhatsApp');
    try {
      await socket.sendPresenceUpdate('composing', chatId);
    } catch {
      // presence bukan kritikal
    }
    try {
      const delayMs = Math.max(250, this.options.jitterDelayMs ?? 1200);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      await action();
    } finally {
      try {
        await socket.sendPresenceUpdate('paused', chatId);
      } catch {
        // abaikan
      }
    }
  }

  private async buildMediaContent(
    media: MediaAttachment,
    caption: string | undefined,
  ): Promise<AnyMessageContent | null> {
    let source: { url: string } | Buffer;
    if (media.buffer) {
      source = media.buffer;
    } else if (media.base64) {
      source = Buffer.from(media.base64, 'base64');
    } else if (media.source) {
      source = await this.loadMediaSource(media.source);
    } else {
      return null;
    }
    switch (media.kind) {
      case 'image':
        return { image: source, ...(caption ? { caption } : {}) };
      case 'video':
        return { video: source, ...(caption ? { caption } : {}) };
      case 'audio':
        return {
          audio: source,
          mimetype: media.mimeType ?? 'audio/ogg; codecs=opus',
          ptt: media.mimeType?.includes('ogg') ?? true,
        };
      case 'document':
        return {
          document: source,
          mimetype: media.mimeType ?? 'application/octet-stream',
          fileName: media.fileName ?? guessFileName(media.source ?? ''),
          ...(caption ? { caption } : {}),
        };
      case 'sticker':
        return { sticker: source };
      default:
        return null;
    }
  }

  private async loadMediaSource(source: string): Promise<{ url: string } | Buffer> {
    if (/^https?:\/\//i.test(source)) return { url: source };
    const path = source.startsWith('file://') ? fileURLToPath(source) : source;
    return readFile(path);
  }

  private handleConnectionUpdate(update: Partial<ConnectionState>): void {
    if (update.qr) {
      this.qr = update.qr;
      this.setStatus('connecting');
      this.options.logger.info(
        'QR WhatsApp tersedia. Buka Web UI > Koneksi WhatsApp untuk memindai.',
      );
      this.options.onQr?.(update.qr);
    }

    if (update.connection === 'open') {
      this.qr = null;
      this.lastError = null;
      this.reconnectAttempt = 0;
      if (this.socket?.user?.id) {
        this.botJid = normalizeUserJid(this.socket.user.id);
      }
      this.setStatus('connected');
      this.options.logger.info({ jid: this.botJid }, 'WhatsApp tersambung');
      return;
    }

    if (update.connection === 'close') {
      this.qr = null;
      const error = update.lastDisconnect?.error as
        | { code?: string; output?: { statusCode?: number }; message?: string }
        | undefined;
      const statusCode = error?.output?.statusCode;
      const engineUnsupported =
        error?.code === 'ONIGI_SIGNAL_ENGINE_UNSUPPORTED' ||
        error?.code === 'ONIGI_XEDDSA_UNSUPPORTED';

      if (!this.manualDisconnect) {
        this.lastError = error?.message ?? 'Koneksi WhatsApp terputus.';
      }
      this.socket = null;
      const mod = this.module;
      const loggedOut = statusCode === mod?.DisconnectReason.loggedOut;
      const replaced = statusCode === mod?.DisconnectReason.connectionReplaced;
      const forbidden =
        statusCode === mod?.DisconnectReason.forbidden ||
        statusCode === mod?.DisconnectReason.multideviceMismatch;

      if (this.manualDisconnect || loggedOut || replaced || forbidden || engineUnsupported) {
        this.setStatus(loggedOut || engineUnsupported || forbidden ? 'error' : 'disconnected');
        this.options.logger.warn(
          {
            statusCode,
            reason: error?.message,
            loggedOut,
            replaced,
            forbidden,
            engineUnsupported,
          },
          'Koneksi WhatsApp berhenti dan tidak akan disambungkan ulang otomatis',
        );
        return;
      }

      this.setStatus('connecting');
      this.options.logger.warn(
        { statusCode, reason: error?.message },
        'Koneksi WhatsApp terputus; menjadwalkan reconnect',
      );
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.manualDisconnect || this.reconnectTimer) return;

    const attempt = this.reconnectAttempt;
    this.reconnectAttempt += 1;
    const base = Math.min(60_000, 1_000 * 2 ** Math.min(attempt, 6));
    const delay = base + Math.floor(Math.random() * 500);
    this.options.logger.info({ delay, attempt }, 'Reconnect WhatsApp dijadwalkan');

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect().catch((error: unknown) => {
        this.options.logger.error({ err: error }, 'Reconnect WhatsApp gagal');
        if (this.isNativeEngineError(error) || error instanceof WhatsAppModuleMissingError) {
          this.options.logger.error(
            'Reconnect dihentikan karena E2EE native tidak tersedia atau modul gagal dimuat.',
          );
          return;
        }
        this.scheduleReconnect();
      });
    }, delay);
    this.reconnectTimer.unref?.();
  }

  private async handleMessages(messages: WAMessage[]): Promise<void> {
    for (const raw of messages) {
      await this.ingest(raw);
    }
  }

  private async ingest(raw: WAMessage): Promise<void> {
    const id = raw.key?.id;
    if (id) {
      if (this.seen.has(id)) return;
      this.seen.add(id);
      if (this.seen.size > MAX_SEEN_IDS) {
        const oldest = this.seen.values().next().value;
        if (oldest) this.seen.delete(oldest);
      }
    }

    const message = normalizeIncomingMessage(raw, {
      botJid: this.botJid,
      allowSelfControl: this.options.allowSelfControl ?? true,
      sentMessageIds: this.sentMessageIds,
    });
    if (!message) return;

    // Auto-read pesan WhatsApp (centang biru) jika diaktifkan (default: true)
    if (this.options.autoRead !== false && this.socket && raw.key) {
      void (this.socket as any).readMessages?.([raw.key]).catch(() => {});
    }

    if (isLidJid(message.senderId) && this.socket) {
      try {
        const pn = await this.socket.signalRepository.lidMapping.getPNForLID(message.senderId);
        if (pn) message.senderId = normalizeUserJid(pn);
      } catch (error) {
        this.options.logger.debug(
          { err: error, jid: message.senderId },
          'Gagal memetakan LID ke nomor telepon',
        );
      }
    }

    if (id) {
      this.recent.set(id, { message: raw, senderId: message.senderId });
      if (this.recent.size > MAX_RECENT_MESSAGES) {
        const oldest = this.recent.keys().next().value;
        if (oldest) this.recent.delete(oldest);
      }
    }

    // FR-18 & FR-19: Unduh media (gambar / voice note) otomatis untuk multimodal AI
    if (message.media.length > 0 && this.module && typeof this.module.downloadMediaMessage === 'function') {
      const MAX_MEDIA_DOWNLOAD_BYTES = 10 * 1024 * 1024; // 10 MB limit
      for (const item of message.media) {
        if (
          (item.kind === 'image' || item.kind === 'audio') &&
          (!item.sizeBytes || item.sizeBytes <= MAX_MEDIA_DOWNLOAD_BYTES)
        ) {
          try {
            const currentSocket = this.socket;
            const buf = await this.module.downloadMediaMessage(
              raw,
              'buffer',
              {},
              {
                logger: this.options.logger as any,
                reuploadRequest: (msg: WAMessage) =>
                  currentSocket ? currentSocket.updateMediaMessage(msg) : Promise.resolve(msg),
              },
            );
            if (Buffer.isBuffer(buf) && buf.length > 0) {
              item.buffer = buf;
              item.base64 = buf.toString('base64');
            }
          } catch (downloadErr) {
            this.options.logger.debug(
              { err: downloadErr, kind: item.kind },
              'Media pesan tidak dapat diunduh otomatis',
            );
          }
        }
      }
    }

    this.options.logger.debug(
      {
        chatId: message.chatId,
        senderId: message.senderId,
        isGroup: message.isGroup,
        hasMedia: message.media.length > 0,
      },
      'Pesan WhatsApp masuk',
    );
    this.dispatch(message);
  }

  private setStatus(status: ConnectionStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.options.onStatusChange?.(status);
  }
}
