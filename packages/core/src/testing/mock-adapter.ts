import type {
  ApprovalRequest,
  ConnectionStatus,
  InternalMessage,
  MessageHandler,
  OutgoingContent,
  PlatformAdapter,
  PlatformCapabilities,
  PlatformId,
} from '../types.js';

export interface SentRecord {
  chatId: string;
  content: OutgoingContent;
  at: number;
}

export interface ApprovalRecord {
  ownerId: string;
  request: ApprovalRequest;
  at: number;
}

/**
 * Adapter palsu untuk mode pengembangan dan pengujian end-to-end.
 * Tidak terhubung ke WhatsApp; semua pesan keluar direkam.
 */
export class MockAdapter implements PlatformAdapter {
  readonly capabilities: PlatformCapabilities = {
    buttons: true,
    voice: true,
    groups: true,
  };

  readonly sent: SentRecord[] = [];
  readonly approvals: ApprovalRecord[] = [];

  private handler: MessageHandler | null = null;
  private status: ConnectionStatus = 'disconnected';

  constructor(readonly id: PlatformId = 'whatsapp') {}

  async connect(): Promise<void> {
    this.status = 'connected';
  }

  async disconnect(): Promise<void> {
    this.status = 'disconnected';
  }

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async send(chatId: string, content: OutgoingContent): Promise<void> {
    this.sent.push({ chatId, content, at: Date.now() });
  }

  async sendApproval(ownerId: string, request: ApprovalRequest): Promise<void> {
    this.approvals.push({ ownerId, request, at: Date.now() });
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  async requestPairingCode(_phoneNumber: string): Promise<string> {
    return '1234-5678';
  }

  /** Mensimulasikan pesan masuk, lalu menunggu handler selesai. */
  async receive(message: InternalMessage): Promise<void> {
    await this.handler?.(message);
  }

  clear(): void {
    this.sent.length = 0;
    this.approvals.length = 0;
  }
}
