/**
 * Tipe inti yang dipakai lintas platform dan lintas paket.
 * Tidak ada dependensi ke WhatsApp/Telegram/Discord di sini.
 */

export type Platform = 'whatsapp' | 'telegram' | 'discord';

export type PlatformId = Exclude<Platform, never>;

export type Role = 'owner' | 'admin' | 'member';

export type UserStatus = 'active' | 'blocked' | 'pending';

export type ChatType = 'private' | 'group';

/** Mode respons bot per chat/grup. */
export type ChatMode = 'off' | 'mention' | 'active';

/** Mode akses untuk nomor yang belum terdaftar. */
export type AccessMode = 'closed' | 'auto-member' | 'approval';

/** Tingkat risiko aksi, sesuai PRD Bagian 8. */
export type RiskLevel = 'L0' | 'L1' | 'L2';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type MessageRole = 'user' | 'assistant' | 'tool';

export interface MediaAttachment {
  kind: 'image' | 'audio' | 'video' | 'document' | 'sticker';
  mimeType?: string;
  fileName?: string;
  caption?: string;
  /** Path lokal atau URL yang bisa dibaca adapter. */
  source?: string;
  /** Ukuran byte, bila diketahui. */
  sizeBytes?: number;
  /** Data base64 payload untuk pemrosesan AI multimodal (FR-18). */
  base64?: string;
  /** Buffer in-memory mentah untuk transcoding/upload. */
  buffer?: Buffer;
}

export interface QuotedMessage {
  id: string;
  senderId: string;
  text?: string;
  fromBot: boolean;
}

/** Format pesan internal yang netral platform (PRD Bagian 6). */
export interface InternalMessage {
  id: string;
  platform: Platform;
  chatId: string;
  chatType: ChatType;
  senderId: string;
  senderName?: string;
  isGroup: boolean;
  text: string;
  media: MediaAttachment[];
  quoted?: QuotedMessage;
  mentions: string[];
  timestamp: number;
  fromBot: boolean;
}

export interface ReactionContent {
  emoji: string;
  messageId: string;
}

export interface OutgoingContent {
  text?: string;
  media?: MediaAttachment[];
  reaction?: ReactionContent;
  replyTo?: string;
}

export interface PlatformCapabilities {
  buttons: boolean;
  voice: boolean;
  groups: boolean;
}

export type MessageHandler = (message: InternalMessage) => void | Promise<void>;

/** Kontrak adapter netral platform (PRD Bagian 11). */
export interface PlatformAdapter {
  id: PlatformId;
  capabilities: PlatformCapabilities;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onMessage(handler: MessageHandler): void;
  send(chatId: string, content: OutgoingContent): Promise<void>;
  sendApproval(ownerId: string, request: ApprovalRequest): Promise<void>;
  getStatus(): ConnectionStatus;
  /** QR pairing terbaru bila adapter memerlukannya (opsional). */
  getQr?(): string | null;
  /** JID bot setelah login, bila adapter mengetahuinya (opsional). */
  getBotJid?(): string | null;
  /** Pesan error koneksi terakhir untuk ditampilkan di Web UI (opsional). */
  getLastError?(): string | null;
  /** Permintaan 8-digit pairing code untuk nomor telepon tertentu (FR-01). */
  requestPairingCode?(phoneNumber: string): Promise<string>;
}

export interface User {
  jid: string;
  name: string | null;
  role: Role;
  status: UserStatus;
  quotaDaily: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface PersonaExample {
  user: string;
  bot: string;
}

export interface Persona {
  id: string;
  name: string;
  language: string;
  style: string;
  forbiddenTopics: string[];
  typingDelay: 'natural' | 'fast' | 'slow';
  greeting?: string;
  examples: PersonaExample[];
  extraInstructions?: string;
  model?: {
    temperature?: number;
    maxTokens?: number;
  };
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

export interface ApprovalRequest {
  id: string;
  shortCode: string;
  requesterJid: string;
  requesterRole: Role;
  toolName: string;
  /** Parameter asli yang diajukan AI — ditampilkan apa adanya ke Owner. */
  params: Record<string, unknown>;
  chatId: string;
  status: ApprovalStatus;
  createdAt: number;
  expiresAt: number;
  decidedAt: number | null;
  decidedBy: string | null;
}

export interface ApprovalRule {
  id: string;
  toolName: string;
  /** null berarti berlaku untuk semua target. */
  target: string | null;
  expiresAt: number | null;
  createdAt: number;
}

export interface AuditEntry {
  id: number;
  actorJid: string | null;
  action: string;
  params: unknown;
  result: unknown;
  createdAt: number;
}

export interface StoredMessage {
  id: number;
  chatId: string;
  platform: Platform;
  senderId: string;
  role: MessageRole;
  content: string;
  createdAt: number;
}

export interface ChatRecord {
  id: string;
  platform: Platform;
  type: ChatType;
  mode: ChatMode;
  updatedAt: number;
}

export type ToolCategory =
  | 'message_media'
  | 'read_context'
  | 'group_community'
  | 'chat_management'
  | 'profile_privacy'
  | 'channel_broadcast'
  | 'ai_media'
  | 'web_utility'
  | 'memory'
  | 'bot_control';

export type ToolPriority = 'P0' | 'P1' | 'P2';

export interface ToolScopeRule {
  when: string;
  level: RiskLevel;
}

export interface ToolRateLimit {
  perMinute?: number;
  perChatPerMinute?: number;
}

export type ToolResultStatus = 'ok' | 'pending_approval' | 'denied' | 'error';

export interface ToolSchema {
  name: string;
  description: string;
  /** JSON Schema untuk parameter tool. */
  parameters: Record<string, unknown>;
  risk: RiskLevel;
  allowedRoles: Role[];
  category?: ToolCategory;
  minRole?: Role;
  implemented?: boolean;
  priority?: ToolPriority;
}

export interface ToolResult {
  ok: boolean;
  status?: ToolResultStatus;
  output?: unknown;
  error?: string;
  errorCode?: string;
  reason?: string;
  approvalId?: string;
  code?: string;
  expiresAt?: number;
  retryable?: boolean;
}

export interface ToolServices {
  messages?: any;
  memory?: any;
  settings?: any;
  users?: any;
  personas?: any;
  chats?: any;
  audit?: any;
  adapter?: PlatformAdapter;
  [key: string]: any;
}

/** Informasi minimal yang dibutuhkan tool saat dieksekusi. */
export interface ToolContext {
  adapter: PlatformAdapter;
  chatId: string;
  senderId: string;
  role: Role;
  params: Record<string, unknown>;
  message?: InternalMessage;
  services?: ToolServices;
  /** Ditandai true hanya jika dieksekusi lewat callback ApprovalEngine. */
  isApprovalExecution?: boolean;
}

/** Tool lengkap: metadata keamanan + implementasi eksekusi sesuai Bagian 5. */
export interface ToolDefinition {
  name: string;
  category: ToolCategory;
  /** Deskripsi fungsi dalam bahasa Inggris untuk pemanggilan AI yang akurat. */
  description: string;
  /** JSON Schema dengan additionalProperties: false. */
  params: Record<string, unknown>;
  baseLevel: RiskLevel;
  scopeRules: ToolScopeRule[];
  minRole: Role;
  rateLimit?: ToolRateLimit;
  relaxable: boolean;
  audit: boolean;
  priority: ToolPriority;
  implemented: boolean;
  handler?: (context: ToolContext) => Promise<ToolResult>;

  // Kompatibilitas dengan ToolSchema / v0.1 API lama
  parameters?: Record<string, unknown>;
  risk?: RiskLevel;
  allowedRoles?: Role[];
  execute?(context: ToolContext): Promise<ToolResult>;
}
