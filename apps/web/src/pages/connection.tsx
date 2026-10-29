import { Badge, Card, StatusPill } from '../components';
import type { StatusResponse } from '../types';

export function ConnectionPage({ status }: { status: StatusResponse | null }) {
  return (
    <>
      <div class="grid grid-2">
        <Card title="Koneksi WhatsApp">
          <div class="row-between">
            <StatusPill status={status?.connection.status ?? null} />
            <Badge tone={status?.connection.mode === 'live' ? 'ok' : 'warn'}>
              mode {status?.connection.mode ?? '—'}
            </Badge>
          </div>
          <dl class="kv">
            <div>
              <dt>Transport</dt>
              <dd>OnigiBaileys</dd>
            </div>
            <div>
              <dt>Autoconnect</dt>
              <dd>Diatur lewat env server</dd>
            </div>
            <div>
              <dt>Sesi</dt>
              <dd>
                <code>data/whatsapp-auth</code>
              </dd>
            </div>
          </dl>
        </Card>

        <Card title="Pairing">
          <div class="qr-placeholder" aria-label="QR belum tersedia">
            <span>QR</span>
            <p>Muncul di sini setelah binding OnigiBaileys (M0).</p>
          </div>
          <p class="muted">
            Untuk pengembangan, gunakan <code>WHATSAPP_MODE=mock</code> dan uji lewat{' '}
            <code>POST /api/dev/inbound</code>.
          </p>
        </Card>
      </div>

      <Card title="Langkah menyambungkan">
        <ol class="steps">
          <li>Pasang fork OnigiBaileys pada paket adapter WhatsApp.</li>
          <li>Lengkapi binding socket dan normalisasi pesan pada <code>WhatsAppAdapter</code>.</li>
          <li>Buka halaman ini, pindai QR atau masukkan pairing code.</li>
          <li>Sesi tersimpan di folder <code>data/</code>; reconnect otomatis dengan backoff.</li>
        </ol>
        <p class="muted">
          Tombol putus dan sambung ulang akan ditambahkan bersama endpoint koneksi di M0/M3.
        </p>
      </Card>
    </>
  );
}
