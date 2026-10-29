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

/** Stub adapter Discord — ditandai Coming Soon pada v0.1 (FR-35). */
export class DiscordAdapter implements PlatformAdapter {
  readonly id = 'discord' as const;
  readonly capabilities: PlatformCapabilities = {
    buttons: true,
    voice: true,
    groups: true,
  };

  async connect(): Promise<void> {
    throw new ComingSoonError('Discord');
  }

  async disconnect(): Promise<void> {
    // belum ada koneksi
  }

  onMessage(_handler: MessageHandler): void {
    // belum ada koneksi
  }

  async send(_chatId: string, _content: OutgoingContent): Promise<void> {
    throw new ComingSoonError('Discord');
  }

  async sendApproval(_ownerId: string, _request: ApprovalRequest): Promise<void> {
    throw new ComingSoonError('Discord');
  }

  getStatus(): ConnectionStatus {
    return 'disconnected';
  }

  async dispatch(_message: InternalMessage): Promise<void> {
    throw new ComingSoonError('Discord');
  }
}
