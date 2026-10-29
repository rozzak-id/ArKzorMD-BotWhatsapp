import type {
  ApprovalRequest,
  ConnectionStatus,
  InternalMessage,
  MessageHandler,
  OutgoingContent,
  PlatformAdapter,
  PlatformCapabilities,
} from '@arkzormd/core';
import { ComingSoonError } from '@arkzormd/core';

/** Stub adapter Telegram — ditandai Coming Soon pada v0.1 (FR-35). */
export class TelegramAdapter implements PlatformAdapter {
  readonly id = 'telegram' as const;
  readonly capabilities: PlatformCapabilities = {
    buttons: true,
    voice: true,
    groups: true,
  };

  async connect(): Promise<void> {
    throw new ComingSoonError('Telegram');
  }

  async disconnect(): Promise<void> {
    // belum ada koneksi
  }

  onMessage(_handler: MessageHandler): void {
    // belum ada koneksi
  }

  async send(_chatId: string, _content: OutgoingContent): Promise<void> {
    throw new ComingSoonError('Telegram');
  }

  async sendApproval(_ownerId: string, _request: ApprovalRequest): Promise<void> {
    throw new ComingSoonError('Telegram');
  }

  getStatus(): ConnectionStatus {
    return 'disconnected';
  }

  async dispatch(_message: InternalMessage): Promise<void> {
    // ditempatkan di sini agar kontrak adapter tetap terlihat saat implementasi M6
    throw new ComingSoonError('Telegram');
  }
}
