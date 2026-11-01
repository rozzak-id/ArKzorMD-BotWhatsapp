import { useEffect, useState } from 'preact/hooks';
import QRCode from 'qrcode';
import { api, setAuthToken } from '../api';
import { Badge, Card, ErrorNote, Loading, StatusPill } from '../components';
import type { Persona, StatusResponse } from '../types';

interface SetupPageProps {
  status: StatusResponse | null;
  onFinish?: () => void;
}

function PairingQr({ value }: { value: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 240,
      color: { dark: '#0b1f1d', light: '#ffffff' },
    })
      .then((url) => {
        if (alive) setSrc(url);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [value]);

  return (
    <div style={{ textAlign: 'center', margin: '1rem 0' }}>
      {src ? <img src={src} width={240} height={240} alt="QR Code" /> : <Loading />}
    </div>
  );
}

export function SetupPage({ status, onFinish }: SetupPageProps) {
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  // Step 1: Admin Password
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2: AI Provider
  const [aiProvider, setAiProvider] = useState(status?.ai.provider ?? 'gemini');
  const [aiModel, setAiModel] = useState(status?.ai.model ?? 'gemini-1.5-flash');

  // Step 3: WhatsApp
  const [waMethod, setWaMethod] = useState<'qr' | 'code'>('qr');
  const [waPhone, setWaPhone] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);

  // Step 4: Owner Verification
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerVerificationCode, setOwnerVerificationCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [ownerVerified, setOwnerVerified] = useState(Boolean(status?.ownerConfigured));

  // Step 5: Persona & Access Mode
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<string>('');
  const [accessMode, setAccessMode] = useState<'closed' | 'auto_member' | 'approval'>('closed');

  // Step 6: Test Message
  const [testText, setTestText] = useState('halo');
  const [testResponse, setTestResponse] = useState<string | null>(null);

  useEffect(() => {
    // Muat persona untuk langkah 5
    api.personas().then((res) => {
      setPersonas(res.personas);
      if (res.active) setSelectedPersona(res.active);
      else if (res.personas[0]) setSelectedPersona(res.personas[0].id);
    }).catch(() => {});

    // Cek status auth
    api.authStatus().then((auth) => {
      if (auth.setupCompleted) {
        // Jika sudah setup, lompat ke step selanjutnya
        if (auth.hasOwner) setOwnerVerified(true);
      }
    }).catch(() => {});
  }, []);

  async function handleStep1Submit(e: Event) {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password harus minimal 8 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.setupAdmin(password);
      if (res.token) {
        setAuthToken(res.token);
      }
      setSuccessNote('Password admin berhasil disimpan!');
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handlePairingCodeRequest(e: Event) {
    e.preventDefault();
    if (!waPhone) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.requestPairingCode(waPhone);
      setPairingCode(res.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestOwnerCode() {
    if (!ownerPhone) {
      setError('Masukkan nomor WhatsApp Owner terlebih dahulu.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.requestOwnerCode(ownerPhone);
      setOwnerVerificationCode(res.code);
      setInputCode(res.code); // auto-fill untuk kenyamanan wizard
      setSuccessNote('Kode verifikasi dibuat: ' + res.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOwner() {
    if (!ownerPhone || !inputCode) {
      setError('Nomor telepon dan kode verifikasi wajib diisi.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.verifyOwner(ownerPhone, inputCode);
      setOwnerVerified(true);
      setSuccessNote(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleFinalizeSetup() {
    setLoading(true);
    setError(null);
    try {
      await api.finalizeSetup({
        personaId: selectedPersona || undefined,
        accessMode,
      });
      setSuccessNote('Setup berhasil disimpan!');
      setStep(6);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSendTestMessage() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dev/inbound', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text: testText,
          from: ownerPhone ? `${ownerPhone.replace(/\D/g, '')}@s.whatsapp.net` : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengirim pesan uji.');
      const reply = data.replies?.[0]?.text ?? '(Bot menerima pesan tetapi tidak mengirim teks)';
      setTestResponse(reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const stepsMeta = [
    '1. Password Admin',
    '2. AI Provider',
    '3. WhatsApp',
    '4. Verifikasi Owner',
    '5. Persona & Akses',
    '6. Uji Coba',
  ];

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Setup Wizard ArKzorMD</h1>
        <p class="muted">
          Instalasi dan konfigurasi mandiri dalam 6 langkah cepat di bawah 10 menit tanpa perlu edit file.
        </p>

        {/* Progress bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.25rem', marginTop: '1.5rem' }}>
          {stepsMeta.map((label, idx) => {
            const stepNum = idx + 1;
            const isDone = stepNum < step;
            const isCurrent = stepNum === step;
            return (
              <div
                key={label}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderBottom: `3px solid ${
                    isDone ? 'var(--color-ok, #22c55e)' : isCurrent ? 'var(--color-primary, #3b82f6)' : 'var(--border, #e5e7eb)'
                  }`,
                  color: isCurrent ? 'var(--text-main)' : 'var(--text-muted)',
                  cursor: isDone ? 'pointer' : 'default',
                }}
                onClick={() => {
                  if (isDone) setStep(stepNum);
                }}
              >
                {label}
              </div>
            );
          })}
        </div>
      </header>

      <ErrorNote message={error} />
      {successNote && (
        <div class="banner ok" style={{ marginBottom: '1rem' }}>
          {successNote}
        </div>
      )}

      {/* Step 1: Buat password admin */}
      {step === 1 && (
        <Card title="Langkah 1: Buat Password Admin Web UI">
          <p class="muted" style={{ marginBottom: '1.25rem' }}>
            Password ini digunakan untuk mengamankan Web UI, menyetujui izin sensitif, dan mengelola konfigurasi bot.
          </p>
          <form onSubmit={handleStep1Submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label>
              <span class="small muted">Password Admin (minimal 8 karakter):</span>
              <input
                type="password"
                class="input"
                style={{ width: '100%', marginTop: '0.25rem' }}
                value={password}
                onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                placeholder="Minimal 8 karakter"
                required
              />
            </label>
            <label>
              <span class="small muted">Konfirmasi Password:</span>
              <input
                type="password"
                class="input"
                style={{ width: '100%', marginTop: '0.25rem' }}
                value={confirmPassword}
                onInput={(e) => setConfirmPassword((e.target as HTMLInputElement).value)}
                placeholder="Ulangi password di atas"
                required
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="submit" class="btn btn-primary" disabled={loading}>
                {loading ? 'Menyimpan…' : 'Simpan & Lanjutkan →'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Step 2: AI Provider */}
      {step === 2 && (
        <Card title="Langkah 2: Pilih AI Provider">
          <p class="muted" style={{ marginBottom: '1.25rem' }}>
            Pilih model AI utama yang akan memproses pesan dan mengeksekusi tools.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label>
              <span class="small muted">Penyedia AI:</span>
              <select
                class="input"
                style={{ width: '100%', marginTop: '0.25rem' }}
                value={aiProvider}
                onChange={(e) => setAiProvider((e.target as HTMLSelectElement).value)}
              >
                <option value="gemini">Google Gemini (Disarankan, cepat & hemat)</option>
                <option value="openai">OpenAI (GPT-4o, GPT-4o-mini)</option>
                <option value="openrouter">OpenRouter (Mendukung Claude, Llama 3, DeepSeek, dll)</option>
                <option value="ollama">Ollama (Model Lokal Offline)</option>
                <option value="mock">Mock Provider (Simulasi Pengembangan)</option>
              </select>
            </label>

            <label>
              <span class="small muted">Model:</span>
              <input
                type="text"
                class="input"
                style={{ width: '100%', marginTop: '0.25rem' }}
                value={aiModel}
                onInput={(e) => setAiModel((e.target as HTMLInputElement).value)}
                placeholder="Contoh: gemini-1.5-flash atau gpt-4o-mini"
              />
            </label>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <button type="button" class="btn btn-secondary" onClick={() => setStep(1)}>
                ← Kembali
              </button>
              <button type="button" class="btn btn-primary" onClick={() => setStep(3)}>
                Lanjut ke WhatsApp →
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Hubungkan WhatsApp */}
      {step === 3 && (
        <Card title="Langkah 3: Hubungkan WhatsApp">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <StatusPill status={status?.connection.status ?? null} />
            <Badge tone={status?.connection.mode === 'live' ? 'ok' : 'warn'}>
              mode {status?.connection.mode ?? '—'}
            </Badge>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button
              type="button"
              class={`btn btn-sm ${waMethod === 'qr' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setWaMethod('qr')}
            >
              Pindai QR
            </button>
            <button
              type="button"
              class={`btn btn-sm ${waMethod === 'code' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setWaMethod('code')}
            >
              Pairing Code (8 Digit)
            </button>
          </div>

          {status?.connection.status === 'connected' ? (
            <div class="banner ok" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <strong>✓ WhatsApp Sudah Terhubung!</strong>
              <p class="small muted" style={{ marginTop: '0.5rem' }}>
                Sesi WhatsApp aktif tersimpan di server.
              </p>
            </div>
          ) : waMethod === 'qr' ? (
            status?.connection.qr ? (
              <div>
                <PairingQr value={status.connection.qr} />
                <p style={{ textAlign: 'center' }} class="muted small">
                  Buka WhatsApp di HP → Perangkat Tertaut → Tautkan Perangkat → Pindai QR di atas.
                </p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p class="muted">
                  {status?.connection.mode === 'mock'
                    ? 'Mode mock aktif — koneksi WhatsApp disimulasikan.'
                    : 'Menunggu QR dari server WhatsApp…'}
                </p>
              </div>
            )
          ) : (
            <div>
              {pairingCode ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--surface-sunken)', borderRadius: '8px' }}>
                  <p class="muted small">Kode Pairing 8 Digit:</p>
                  <div style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '0.2em', margin: '0.5rem 0' }}>
                    {pairingCode}
                  </div>
                  <p class="muted small">
                    Di HP: WhatsApp → Perangkat Tertaut → Tautkan dengan nomor telepon saja.
                  </p>
                </div>
              ) : (
                <form onSubmit={handlePairingCodeRequest} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    class="input"
                    style={{ flex: 1 }}
                    placeholder="Nomor HP WhatsApp (contoh 628123456789)"
                    value={waPhone}
                    onInput={(e) => setWaPhone((e.target as HTMLInputElement).value)}
                    required
                  />
                  <button type="submit" class="btn btn-primary" disabled={loading || !waPhone}>
                    Minta Kode
                  </button>
                </form>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
            <button type="button" class="btn btn-secondary" onClick={() => setStep(2)}>
              ← Kembali
            </button>
            <button type="button" class="btn btn-primary" onClick={() => setStep(4)}>
              Lanjut ke Verifikasi Owner →
            </button>
          </div>
        </Card>
      )}

      {/* Step 4: Verifikasi Owner */}
      {step === 4 && (
        <Card title="Langkah 4: Verifikasi Nomor Owner">
          <p class="muted" style={{ marginBottom: '1.25rem' }}>
            Owner adalah pengambil keputusan tertinggi bot. Tindakan sensitif L1 (kick, kirim pesan ke kontak lain,
            ubah setelan) membutuhkan persetujuan Owner.
          </p>

          {ownerVerified ? (
            <div class="banner ok" style={{ marginBottom: '1.5rem' }}>
              <strong>✓ Owner Telah Terverifikasi!</strong>
              <p class="small" style={{ marginTop: '0.25rem' }}>
                Nomor Owner aktif: <code>{status?.ownerConfigured ? 'Dikonfigurasi' : ownerPhone}</code>
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <label>
                <span class="small muted">Nomor WhatsApp Owner (dengan kode negara):</span>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                  <input
                    type="text"
                    class="input"
                    style={{ flex: 1 }}
                    placeholder="Contoh: 628123456789"
                    value={ownerPhone}
                    onInput={(e) => setOwnerPhone((e.target as HTMLInputElement).value)}
                  />
                  <button
                    type="button"
                    class="btn btn-secondary"
                    onClick={() => void handleRequestOwnerCode()}
                    disabled={loading || !ownerPhone}
                  >
                    Minta Kode Verifikasi
                  </button>
                </div>
              </label>

              {ownerVerificationCode && (
                <div style={{ padding: '1rem', background: 'var(--surface-sunken)', borderRadius: '8px' }}>
                  <p class="muted small" style={{ marginBottom: '0.5rem' }}>
                    Kode verifikasi yang dihasilkan:
                  </p>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.15em', fontFamily: 'monospace' }}>
                    {ownerVerificationCode}
                  </div>
                  <p class="muted small" style={{ marginTop: '0.5rem' }}>
                    Konfirmasi kode di bawah ini untuk mengangkat nomor ini sebagai Owner:
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <input
                      type="text"
                      class="input"
                      style={{ width: '140px', textAlign: 'center', fontSize: '1.1rem', letterSpacing: '0.1em' }}
                      maxLength={6}
                      value={inputCode}
                      onInput={(e) => setInputCode((e.target as HTMLInputElement).value)}
                    />
                    <button
                      type="button"
                      class="btn btn-primary"
                      onClick={() => void handleVerifyOwner()}
                      disabled={loading || !inputCode}
                    >
                      Konfirmasi Owner
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
            <button type="button" class="btn btn-secondary" onClick={() => setStep(3)}>
              ← Kembali
            </button>
            <button type="button" class="btn btn-primary" onClick={() => setStep(5)}>
              Lanjut ke Persona & Akses →
            </button>
          </div>
        </Card>
      )}

      {/* Step 5: Persona & Mode Akses */}
      {step === 5 && (
        <Card title="Langkah 5: Persona Awal & Mode Akses Nomor Asing">
          <p class="muted" style={{ marginBottom: '1.25rem' }}>
            Pilih kepribadian awal bot dan bagaimana bot memperlakukan nomor asing yang belum terdaftar.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <label>
              <span class="small muted">Pilih Persona Utama:</span>
              <select
                class="input"
                style={{ width: '100%', marginTop: '0.25rem' }}
                value={selectedPersona}
                onChange={(e) => setSelectedPersona((e.target as HTMLSelectElement).value)}
              >
                {personas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.style})
                  </option>
                ))}
              </select>
            </label>

            <div>
              <span class="small muted">Mode Akses untuk Nomor Asing:</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="accessMode"
                    value="closed"
                    checked={accessMode === 'closed'}
                    onChange={() => setAccessMode('closed')}
                  />
                  <span>
                    <strong>Tertutup (Disarankan)</strong> — Bot hanya membalas Owner & Admin; nomor asing diabaikan.
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="accessMode"
                    value="auto_member"
                    checked={accessMode === 'auto_member'}
                    onChange={() => setAccessMode('auto_member')}
                  />
                  <span>
                    <strong>Member Otomatis</strong> — Nomor baru otomatis menjadi Member dan bisa mengobrol.
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="accessMode"
                    value="approval"
                    checked={accessMode === 'approval'}
                    onChange={() => setAccessMode('approval')}
                  />
                  <span>
                    <strong>Perlu Persetujuan</strong> — Nomor baru harus disetujui Owner sebelum diladeni.
                  </span>
                </label>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <button type="button" class="btn btn-secondary" onClick={() => setStep(4)}>
                ← Kembali
              </button>
              <button
                type="button"
                class="btn btn-primary"
                onClick={() => void handleFinalizeSetup()}
                disabled={loading}
              >
                {loading ? 'Menyimpan…' : 'Selesaikan Setup →'}
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 6: Selesai & Uji Coba */}
      {step === 6 && (
        <Card title="Langkah 6: Selesai & Uji Coba">
          <div class="banner ok" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>🎉 Bot WhatsApp ArKzorMD Siap Digunakan!</h2>
            <p class="muted small">
              Semua konfigurasi awal selesai. Anda dapat menguji respons bot langsung di bawah ini.
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label>
              <span class="small muted">Kirim Pesan Uji ke AI:</span>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input
                  type="text"
                  class="input"
                  style={{ flex: 1 }}
                  value={testText}
                  onInput={(e) => setTestText((e.target as HTMLInputElement).value)}
                  placeholder="Ketik pesan tes..."
                />
                <button
                  type="button"
                  class="btn btn-primary"
                  onClick={() => void handleSendTestMessage()}
                  disabled={loading || !testText}
                >
                  Kirim Tes
                </button>
              </div>
            </label>

            {testResponse && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--surface-sunken)', borderRadius: '8px' }}>
                <p class="small muted" style={{ marginBottom: '0.25rem' }}>Balasan Bot:</p>
                <p style={{ fontWeight: 500 }}>{testResponse}</p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button
              type="button"
              class="btn btn-primary"
              onClick={() => {
                if (onFinish) onFinish();
                else window.location.hash = '#/dashboard';
              }}
            >
              Buka Dashboard Utama →
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
