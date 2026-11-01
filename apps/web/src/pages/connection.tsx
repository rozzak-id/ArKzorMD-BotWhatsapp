import { useEffect, useState } from 'preact/hooks';
import QRCode from 'qrcode';
import { api } from '../api';
import { Badge, Card, StatusPill } from '../components';
import type { StatusResponse } from '../types';

function PairingQr({ value }: { value: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setSrc(null);
    setError(null);
    QRCode.toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 280,
      color: { dark: '#0b1f1d', light: '#ffffff' },
    })
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch((reason: unknown) => {
        if (alive) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      alive = false;
    };
  }, [value]);

  if (error) {
    return (
      <div class="qr-placeholder" aria-label="QR gagal dirender">
        <span>QR</span>
        <p>QR gagal dirender: {error}</p>
      </div>
    );
  }

  return (
    <div class="qr-frame">
      {src ? (
        <img src={src} width={280} height={280} alt="QR pairing WhatsApp" />
      ) : (
        <p class="muted">Menyiapkan QR…</p>
      )}
    </div>
  );
}

function PairingPanel({ status }: { status: StatusResponse | null }) {
  const [method, setMethod] = useState<'qr' | 'code'>('qr');
  const [phone, setPhone] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  if (!status) {
    return <p class="muted">Memuat status koneksi…</p>;
  }

  const { connection } = status;

  if (connection.status === 'connected') {
    return (
      <>
        <div class="qr-placeholder qr-connected" aria-label="WhatsApp tersambung">
          <span>✓</span>
          <p>WhatsApp sudah tersambung. Sesi tersimpan dan akan dipakai ulang saat server restart.</p>
        </div>
        <p class="muted small">
          Koneksi terputus akan dicoba ulang otomatis dengan backoff sampai berhasil atau sesi logout.
        </p>
      </>
    );
  }

  if (connection.mode === 'off') {
    return (
      <>
        <div class="qr-placeholder" aria-label="WhatsApp dimatikan">
          <span>QR</span>
          <p>WhatsApp dimatikan lewat <code>WHATSAPP_MODE=off</code>.</p>
        </div>
        <p class="muted">Ubah ke <code>mock</code> atau <code>live</code> lalu restart server.</p>
      </>
    );
  }

  if (connection.mode === 'mock') {
    return (
      <>
        <div class="qr-placeholder" aria-label="QR tidak diperlukan pada mode mock">
          <span>QR</span>
          <p>Mode mock tidak memakai QR. Pesan disimulasikan untuk pengembangan.</p>
        </div>
        <p class="muted">
          Uji alur bot dengan <code>POST /api/dev/inbound</code> atau ganti ke{' '}
          <code>WHATSAPP_MODE=live</code>.
        </p>
      </>
    );
  }

  async function handleRequestCode(e: Event) {
    e.preventDefault();
    if (!phone) return;
    setLoadingCode(true);
    setCodeError(null);
    try {
      const res = await api.requestPairingCode(phone);
      setPairingCode(res.code);
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingCode(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          type="button"
          class={`btn btn-sm ${method === 'qr' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setMethod('qr')}
        >
          Pindai QR
        </button>
        <button
          type="button"
          class={`btn btn-sm ${method === 'code' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setMethod('code')}
        >
          Pairing Code (8 Digit)
        </button>
      </div>

      {method === 'qr' ? (
        connection.qr ? (
          <>
            <PairingQr value={connection.qr} />
            <p>
              Buka WhatsApp di ponsel, pilih <strong>Perangkat tertaut</strong> →{' '}
              <strong>Tautkan perangkat</strong>, lalu pindai QR ini.
            </p>
            <p class="muted small">
              QR diperbarui otomatis. Jangan tutup halaman ini sampai ponsel selesai menautkan.
            </p>
          </>
        ) : connection.status === 'connecting' ? (
          <>
            <div class="qr-placeholder" aria-label="Menunggu QR">
              <span>QR</span>
              <p>Menghubungkan ke WhatsApp dan menunggu QR dari server…</p>
            </div>
            <p class="muted small">QR akan muncul di sini dalam beberapa detik.</p>
          </>
        ) : (
          <>
            <div class="qr-placeholder" aria-label="QR belum tersedia">
              <span>QR</span>
              <p>Autoconnect belum aktif atau socket belum berjalan.</p>
            </div>
            <p class="muted">
              Set <code>WHATSAPP_MODE=live</code> dan <code>WHATSAPP_AUTOCONNECT=true</code>.
            </p>
          </>
        )
      ) : (
        <div>
          <p class="muted" style={{ marginBottom: '1rem' }}>
            Tautkan akun WhatsApp tanpa kamera menggunakan kode 8 digit resmi WhatsApp.
          </p>

          {codeError && (
            <p class="error-note" role="alert" style={{ marginBottom: '0.75rem' }}>
              {codeError}
            </p>
          )}

          {pairingCode ? (
            <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--surface-sunken)', borderRadius: '8px' }}>
              <p class="muted small" style={{ marginBottom: '0.5rem' }}>
                Masukkan kode ini di WhatsApp ponsel Anda:
              </p>
              <div
                style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  letterSpacing: '0.2em',
                  fontFamily: 'monospace',
                  color: 'var(--color-primary)',
                  margin: '0.5rem 0 1rem',
                }}
              >
                {pairingCode}
              </div>
              <p class="muted small">
                Di ponsel: buka WhatsApp → Perangkat Tertaut → Tautkan Perangkat → Tautkan dengan nomor telepon saja.
              </p>
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                style={{ marginTop: '1rem' }}
                onClick={() => setPairingCode(null)}
              >
                Minta kode baru
              </button>
            </div>
          ) : (
            <form onSubmit={handleRequestCode} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label>
                <span class="muted small">Nomor WhatsApp (dengan kode negara, contoh 628123456789):</span>
                <input
                  type="text"
                  class="input"
                  style={{ width: '100%', marginTop: '0.25rem' }}
                  placeholder="628123456789"
                  value={phone}
                  onInput={(e) => setPhone((e.target as HTMLInputElement).value)}
                  required
                />
              </label>
              <button type="submit" class="btn btn-primary" disabled={loadingCode || !phone}>
                {loadingCode ? 'Meminta kode…' : 'Dapatkan Pairing Code'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export function ConnectionPage({ status }: { status: StatusResponse | null }) {
  const connection = status?.connection;
  const runtimeUnsupported =
    connection?.mode === 'live' &&
    Boolean(connection.runtime) &&
    !connection.runtime.startsWith('linux');

  return (
    <>
      {runtimeUnsupported && (
        <div class="banner warn">
          Server berjalan di <code>{connection?.runtime}</code>. Paket native E2EE{' '}
          <code>onigis</code> hanya tersedia untuk Linux x64/arm64; gunakan Docker atau WSL
          untuk WhatsApp live. Mode mock tetap bisa dipakai di platform ini.
        </div>
      )}

      <div class="grid grid-2">
        <Card title="Koneksi WhatsApp">
          <div class="row-between">
            <StatusPill status={connection?.status ?? null} />
            <Badge tone={connection?.mode === 'live' ? 'ok' : 'warn'}>
              mode {connection?.mode ?? '—'}
            </Badge>
          </div>
          <dl class="kv">
            <div>
              <dt>Transport</dt>
              <dd>
                <code>{connection?.module ?? 'onigis'}</code> · fork Baileys 7
              </dd>
            </div>
            <div>
              <dt>Autoconnect</dt>
              <dd>{connection?.autoconnect ? 'aktif' : 'nonaktif'}</dd>
            </div>
            <div>
              <dt>Runtime server</dt>
              <dd>
                <code>{connection?.runtime ?? '—'}</code>
              </dd>
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
          <PairingPanel status={status} />
        </Card>
      </div>

      <Card title="Langkah menyambungkan">
        <ol class="steps">
          <li>
            Isi <code>OWNER_JID</code> dengan nomor WhatsApp Owner (format{' '}
            <code>628…@s.whatsapp.net</code>).
          </li>
          <li>
            Jalankan di Linux x64/arm64, Docker, atau WSL. Set{' '}
            <code>WHATSAPP_MODE=live</code> dan <code>WHATSAPP_AUTOCONNECT=true</code>.
          </li>
          <li>Buka halaman ini, lalu pindai QR dari menu Perangkat tertaut WhatsApp.</li>
          <li>
            Setelah tersambung, approval L1 bisa diputuskan lewat tombol WhatsApp atau command{' '}
            <code>.approve</code>, <code>.reject</code>, dan <code>.always</code>.
          </li>
        </ol>
        <p class="muted">
          Sesi disimpan di <code>data/whatsapp-auth</code>; reconnect otomatis memakai backoff.
          Jangan bagikan isi folder sesi — file tersebut setara kunci akun WhatsApp.
        </p>
      </Card>
    </>
  );
}
