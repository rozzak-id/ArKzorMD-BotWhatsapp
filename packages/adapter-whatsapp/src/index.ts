import type {
  ApprovalRequest,
  ConnectionStatus,
  InternalMessage,
  Logger,
  MessageHandler,
  OutgoingContent,
  PlatformAdapter,
  PlatformCapabilities,
} from '@arkzormd/core';
import { PlatformNotConnectedError } from '@arkzormd/core';

export class OnigiBaileysMissingError extends Error {
  constructor(moduleName: string) {
    super(
      `Paket "${moduleName}" tidak ditemukan. Pasang fork OnigiBaileys terlebih dahulu, ` +
        'lalu sambungkan adapter ini. Untuk pengembangan, gunakan WHATSAPP_MODE=mock.',
    );
    this.name = 'OnigiBaileysMissingError';
  }
}

export interface WhatsAppAdapterOptions {
  authDir: string;
  logger: Logger;
  /** Nama modul fork; bisa diganti saat paket resmi OnigiBaileys tersedia. */
  moduleName?: string;
  onQr?: (qr: string) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}

interface OnigiBaileysLike {
  makeWASocket?: (...args: unknown[]) => unknown;
  useMultiFileAuthState?: (dir: string) => Promise<unknown>;
  [key: string]: unknown;
}

/**
 * Adapter WhatsApp berbasis OnigiBaileys.
 *
 * Status M0: seam adapter sudah ada, tetapi binding socket belum diaktifkan
 * karena paket `onigibaileys` belum tersedia di registry. Saat fork tersedia,
 * lengkapi `connect()` dan normalisasi pesan di file ini — core tidak perlu
 * diubah.
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
  private socket: unknown = null;
  private readonly moduleName: string;

  constructor(private readonly options: WhatsAppAdapterOptions) {
    this.moduleName = options.moduleName ?? 'onigibaileys';
  }

  async connect(): Promise<void> {
    this.setStatus('connecting');
    let module: OnigiBaileysLike;
    try {
      // Specifier dinamis agar TypeScript tidak gagal saat paket belum terpasang.
      const specifier = this.moduleName;
      module = (await import(specifier)) as OnigiBaileysLike;
    } catch {
      this.setStatus('error');
      throw new OnigiBaileysMissingError(this.moduleName);
    }

    if (typeof module.makeWASocket !== 'function') {
      this.setStatus('error');
      throw new Error(
        `Modul "${this.moduleName}" tidak mengekspor makeWASocket. Periksa versi fork OnigiBaileys.`,
      );
    }

    // TODO(M0): implementasikan alur koneksi berikut setelah paket tersedia:
    // 1. const { state, saveCreds } = await module.useMultiFileAuthState(authDir)
    // 2. const sock = module.makeWASocket({ auth: state, ... })
    // 3. Teruskan QR ke options.onQr dan status koneksi ke options.onStatusChange.
    // 4. Normalisasi pesan masuk ke InternalMessage lalu panggil handler.
    // 5. Simpan kredensial, reconnect dengan exponential backoff.
    this.options.logger.warn(
      { module: this.moduleName, authDir: this.options.authDir },
      'OnigiBaileys terpasang, tetapi binding adapter belum diimplementasikan (M0)',
    );
    this.setStatus('error');
    throw new Error(
      'Binding OnigiBaileys belum diimplementasikan. Lengkapi WhatsAppAdapter.connect() pada M0.',
    );
  }

  async disconnect(): Promise<void> {
    this.socket = null;
    this.setStatus('disconnected');
  }

  onMessage(handler: MessageHandler): void {
    this.handler = handler;
  }

  async send(chatId: string, content: OutgoingContent): Promise<void> {
    if (this.status !== 'connected' || !this.socket) {
      throw new PlatformNotConnectedError('WhatsApp');
    }
    // TODO(M0): kirim lewat socket OnigiBaileys, termasuk typing, media,
    // reaction, dan reply. `content` sudah dalam format netral.
    this.options.logger.debug({ chatId, content }, 'WhatsAppAdapter.send belum diimplementasikan');
    throw new Error('WhatsAppAdapter.send belum diimplementasikan (M0).');
  }

  async sendApproval(ownerId: string, request: ApprovalRequest): Promise<void> {
    // TODO(M2): tombol interaktif Setuju/Tolak/Setuju selalu.
    // Fallback teks sudah disiapkan di Bot, jadi minimal kirim teks ini.
    await this.send(ownerId, {
      text:
        `🔐 Persetujuan ${request.shortCode}\n` +
        `Aksi: ${request.toolName}\n` +
        `Detail: ${JSON.stringify(request.params)}\n\n` +
        'Balas 1 = setuju, 2 = tolak.',
    });
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  /** Dipanggil adapter saat pesan masuk telah dinormalisasi. */
  protected dispatch(message: InternalMessage): void {
    void this.handler?.(message);
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.options.onStatusChange?.(status);
  }
}
