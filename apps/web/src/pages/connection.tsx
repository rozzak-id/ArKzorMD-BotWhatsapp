import { useEffect, useState } from 'preact/hooks';
import QRCode from 'qrcode';
import { api } from '../api';
import { Badge, Card, Icons, StatusPill } from '../components';
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
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(120);

  useEffect(() => {
    if (!pairingCode) return;
    setCountdown(120);
    const interval = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [pairingCode]);

  if (!status) {
    return <p class="muted">Memuat status koneksi…</p>;
  }

  const { connection } = status;

  async function handleConnect() {
    setConnecting(true);
    setCodeError(null);
    try {
      await api.connectWhatsApp();
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : String(err));
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm('Putuskan sesi WhatsApp ini? Anda harus scan QR atau pairing ulang untuk menyambung kembali.')) {
      return;
    }
    setDisconnecting(true);
    setCodeError(null);
    try {
      await api.disconnectWhatsApp();
      setPairingCode(null);
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : String(err));
    } finally {
      setDisconnecting(false);
    }
  }

  async function handleRefreshQr() {
    setConnecting(true);
    setCodeError(null);
    try {
      await api.disconnectWhatsApp().catch(() => {});
      await api.connectWhatsApp();
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : String(err));
    } finally {
      setConnecting(false);
    }
  }

  async function handleCopyCode() {
    if (!pairingCode) return;
    const cleanCode = pairingCode.replace('-', '');
    try {
      await navigator.clipboard.writeText(cleanCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
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

  const normalizedPhonePreview = (() => {
    const raw = phone.replace(/\D/g, '');
    if (!raw) return null;
    if (raw.startsWith('0')) return '62' + raw.slice(1);
    return raw;
  })();

  if (connection.status === 'connected') {
    return (
      <>
        <div class="qr-placeholder qr-connected" aria-label="WhatsApp tersambung">
          <Icons.CheckCircle width={48} height={48} style={{ color: 'var(--ok)' }} />
          <p style={{ marginTop: '0.75rem', fontWeight: 600 }}>WhatsApp Sudah Tersambung</p>
          <p class="muted small" style={{ margin: '0' }}>
            Sesi terenkripsi aman aktif di server. Sesi disimpan di <code>data/whatsapp-auth</code>.
          </p>
        </div>
        <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            onClick={handleDisconnect}
            disabled={disconnecting}
          >
            <Icons.X width={14} height={14} />
            <span>{disconnecting ? 'Memutuskan sesi…' : 'Putuskan Koneksi / Logout'}</span>
          </button>
        </div>
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

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          type="button"
          class={`btn btn-sm ${method === 'qr' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setMethod('qr')}
        >
          <Icons.QrCode width={14} height={14} />
          <span>Pindai QR</span>
        </button>
        <button
          type="button"
          class={`btn btn-sm ${method === 'code' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setMethod('code')}
        >
          <Icons.Key width={14} height={14} />
          <span>Pairing Code (8 Digit)</span>
        </button>
      </div>

      {codeError && (
        <p class="error-note" role="alert" style={{ marginBottom: '0.75rem' }}>
          {codeError}
        </p>
      )}

      {method === 'qr' ? (
        connection.qr ? (
          <>
            <PairingQr value={connection.qr} />
            <p style={{ textAlign: 'center' }}>
              Buka WhatsApp di ponsel, pilih <strong>Perangkat tertaut</strong> →{' '}
              <strong>Tautkan perangkat</strong>, lalu pindai QR ini.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                onClick={handleRefreshQr}
                disabled={connecting}
              >
                {connecting ? 'Memuat ulang…' : 'Muat Ulang QR'}
              </button>
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                Batal
              </button>
            </div>
            <p class="muted small" style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              QR diperbarui otomatis. Jangan tutup halaman ini sampai ponsel selesai menautkan.
            </p>
          </>
        ) : connection.status === 'connecting' ? (
          <>
            <div class="qr-placeholder" aria-label="Menunggu QR">
              <span>QR</span>
              <p>Menghubungkan ke WhatsApp dan menunggu QR dari server…</p>
            </div>
            <p class="muted small" style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              QR akan muncul di sini secara otomatis dalam beberapa detik.
            </p>
            <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                Batal / Reset Koneksi
              </button>
            </div>
          </>
        ) : (
          <>
            <div class="qr-placeholder" aria-label="Koneksi WhatsApp nonaktif">
              <span>QR</span>
              <p>
                {connection.lastError
                  ? `Koneksi terputus: ${connection.lastError}`
                  : 'WhatsApp saat ini tidak terhubung.'}
              </p>
            </div>
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <button
                type="button"
                class="btn btn-primary"
                onClick={handleConnect}
                disabled={connecting}
              >
                {connecting ? 'Menghubungkan…' : 'Mulai Koneksi & Tampilkan QR'}
              </button>
            </div>
            <p class="muted small" style={{ marginTop: '0.75rem', textAlign: 'center' }}>
              Klik tombol di atas untuk menyambungkan socket WhatsApp dan membuat kode QR pairing baru.
            </p>
          </>
        )
      ) : (
        <div>
          <p class="muted" style={{ marginBottom: '1rem' }}>
            Tautkan akun WhatsApp tanpa kamera menggunakan kode 8 digit resmi WhatsApp.
          </p>

          {pairingCode ? (
            <div
              style={{
                textAlign: 'center',
                padding: '1.5rem',
                background: 'var(--surface-sunken)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
              }}
            >
              <p class="muted small" style={{ marginBottom: '0.25rem' }}>
                Masukkan kode ini di aplikasi WhatsApp ponsel Anda:
              </p>
              <div
                style={{
                  fontSize: '2.4rem',
                  fontWeight: 800,
                  letterSpacing: '0.25em',
                  fontFamily: 'monospace',
                  color: 'var(--color-primary, #3b82f6)',
                  margin: '0.5rem 0',
                  userSelect: 'all',
                }}
              >
                {pairingCode}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                  type="button"
                  class="btn btn-primary btn-sm"
                  onClick={handleCopyCode}
                >
                  {copied ? 'Kode Tersalin!' : 'Salin Kode'}
                </button>
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  onClick={() => {
                    setPairingCode(null);
                    setCodeError(null);
                  }}
                >
                  Minta Kode Baru
                </button>
              </div>

              {countdown > 0 ? (
                <p class="muted small">
                  Kode berlaku selama <strong>{countdown}</strong> detik.
                </p>
              ) : (
                <p class="error-note small" style={{ margin: '0.5rem 0' }}>
                  Waktu kode telah habis. Silakan klik "Minta Kode Baru".
                </p>
              )}

              <div style={{ textAlign: 'left', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <p class="small" style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                  Langkah di ponsel WhatsApp:
                </p>
                <ol class="small muted" style={{ paddingLeft: '1.2rem', margin: 0, lineHeight: 1.6 }}>
                  <li>Buka WhatsApp di ponsel Anda.</li>
                  <li>Buka menu <strong>⋮</strong> (Android) atau <strong>Pengaturan</strong> (iOS) → <strong>Perangkat tertaut</strong>.</li>
                  <li>Ketuk <strong>Tautkan perangkat</strong>.</li>
                  <li>Pilih <strong>Tautkan dengan nomor telepon saja</strong> di bagian bawah layar.</li>
                  <li>Ketik 8 karakter kode pairing di atas.</li>
                </ol>
              </div>
            </div>
          ) : (
            <form onSubmit={handleRequestCode} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label>
                <span class="muted small">Nomor WhatsApp (dengan kode negara):</span>
                <input
                  type="tel"
                  class="input"
                  style={{ width: '100%', marginTop: '0.25rem' }}
                  placeholder="Contoh: 628123456789 atau 08123456789"
                  value={phone}
                  onInput={(e) => setPhone((e.target as HTMLInputElement).value)}
                  required
                />
              </label>

              {normalizedPhonePreview && (
                <p class="muted small" style={{ margin: '-0.25rem 0 0.25rem' }}>
                  Nomor yang didaftarkan: <strong>+{normalizedPhonePreview}</strong>
                  {phone.trim().startsWith('0') && ' (otomatis dikonversi dari 0 ke kode negara 62)'}
                </p>
              )}

              <button
                type="submit"
                class="btn btn-primary"
                disabled={loadingCode || !phone.trim()}
              >
                {loadingCode ? 'Meminta kode dari server WhatsApp…' : 'Dapatkan Pairing Code'}
              </button>
              <p class="muted small">
                Permintaan kode pairing akan otomatis menginisialisasi sesi WebSocket WhatsApp jika belum berjalan.
              </p>
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
        <Card
          title="Status Koneksi WhatsApp"
          subtitle="Parameter socket sesi dan detail transport"
          icon={<Icons.WhatsApp width={16} height={16} />}
        >
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

        <Card
          title="Pairing & Otentikasi Multi-Device"
          subtitle="Pindai QR atau masukkan kode pairing 8 digit di ponsel"
          icon={<Icons.Key width={16} height={16} />}
        >
          <PairingPanel status={status} />
        </Card>
      </div>

      <Card
        title="Langkah Menyambungkan WhatsApp"
        subtitle="Petunjuk verifikasi perangkat tertaut resmi"
        icon={<Icons.ShieldCheck width={16} height={16} />}
      >
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
