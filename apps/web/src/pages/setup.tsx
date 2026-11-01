import { useEffect, useState } from 'preact/hooks';
import QRCode from 'qrcode';
import { api, setAuthToken } from '../api';
import { Badge, Card, ErrorNote, Icons, Loading, StatusPill } from '../components';
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
      {src ? (
        <div class="qr-frame" style={{ display: 'inline-block', padding: '12px', background: '#ffffff', borderRadius: '12px' }}>
          <img src={src} width={240} height={240} alt="QR Code WhatsApp" style={{ display: 'block' }} />
        </div>
      ) : (
        <Loading text="Membuat QR Code WhatsApp…" />
      )}
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

  // Step 2: AI Provider & API Key
  const [aiProvider, setAiProvider] = useState(status?.ai.provider ?? 'gemini');
  const [aiModel, setAiModel] = useState(status?.ai.model ?? 'gemini-2.5-flash');
  const [aiBaseUrl, setAiBaseUrl] = useState('https://generativelanguage.googleapis.com/v1beta');
  const [aiApiKey, setAiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; latencyMs?: number; reply?: string; error?: string } | null>(null);
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);

  // Step 3: WhatsApp
  const [waMethod, setWaMethod] = useState<'qr' | 'code'>('qr');
  const [waPhone, setWaPhone] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [connectingWa, setConnectingWa] = useState(false);

  // Step 4: Owner Verification
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerVerificationCode, setOwnerVerificationCode] = useState<string | null>(null);
  const [inputCode, setInputCode] = useState('');
  const [ownerVerified, setOwnerVerified] = useState(Boolean(status?.ownerConfigured));

  // Step 5: Persona & Access Mode
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<string>('');
  const [personaMode, setPersonaMode] = useState<'preset' | 'custom'>('preset');
  const [customName, setCustomName] = useState('');
  const [customStyle, setCustomStyle] = useState('santai');
  const [customGreeting, setCustomGreeting] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
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
        if (auth.hasOwner) setOwnerVerified(true);
      }
    }).catch(() => {});
  }, []);

  const handleProviderSelect = (provider: string) => {
    setAiProvider(provider);
    setTestResult(null);
    if (provider === 'none') {
      setAiBaseUrl('');
      setAiModel('manual');
      setAiApiKey('');
    } else if (provider === '9router') {
      setAiBaseUrl('http://localhost:20128/v1');
      setAiModel('auto');
    } else if (provider === 'gemini') {
      setAiBaseUrl('https://generativelanguage.googleapis.com/v1beta');
      setAiModel('gemini-2.5-flash');
    } else if (provider === 'openai') {
      setAiBaseUrl('https://api.openai.com/v1');
      setAiModel('gpt-4o-mini');
    } else if (provider === 'openrouter') {
      setAiBaseUrl('https://openrouter.ai/api/v1');
      setAiModel('deepseek/deepseek-chat');
    } else if (provider === 'ollama') {
      setAiBaseUrl('http://localhost:11434/v1');
      setAiModel('llama3.2');
    }
  };

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
      setSuccessNote('Password admin berhasil dibuat.');
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleTestAiStep2() {
    setTestingAi(true);
    setTestResult(null);
    setError(null);
    try {
      const res = await api.testAi({
        aiProvider,
        aiModel,
        aiBaseUrl: aiBaseUrl.trim() || undefined,
        aiApiKey: aiApiKey.trim() || undefined,
      });
      setTestResult(res);
    } catch (err) {
      setTestResult({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setTestingAi(false);
    }
  }

  async function handleFetchModelsStep2() {
    setFetchingModels(true);
    setError(null);
    try {
      const res = await api.fetchModels({
        provider: aiProvider,
        baseUrl: aiBaseUrl.trim() || undefined,
        apiKey: aiApiKey.trim() || undefined,
      });
      setFetchedModels(res.models);
      if (res.models.length > 0) {
        setSuccessNote(`Berhasil menarik ${res.count} model dari ${res.provider}!`);
      } else {
        setError('Tidak ada model yang ditemukan dari endpoint ini.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setFetchingModels(false);
    }
  }

  async function handleSaveStep2AndNext() {
    setLoading(true);
    setError(null);
    try {
      await api.updateSettings({
        aiProvider,
        aiModel,
        aiBaseUrl: aiBaseUrl.trim() || undefined,
        aiApiKey: aiApiKey.trim() || undefined,
      });
      setSuccessNote('Konfigurasi AI berhasil disimpan!');
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSkipAiStep2() {
    setLoading(true);
    setError(null);
    try {
      await api.updateSettings({
        aiProvider: 'none',
        aiEnabled: false,
      });
      setAiProvider('none');
      setSuccessNote('AI dilewati. Bot akan beroperasi dalam mode manual perintah.');
      setStep(3);
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

  async function handleConnectWhatsApp() {
    setConnectingWa(true);
    setError(null);
    try {
      await api.connectWhatsApp();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setConnectingWa(false);
    }
  }

  async function handleDisconnectWhatsApp() {
    if (!confirm('Putuskan sesi WhatsApp ini?')) return;
    setConnectingWa(true);
    setError(null);
    try {
      await api.disconnectWhatsApp();
      setPairingCode(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setConnectingWa(false);
    }
  }

  async function handleCopyPairingCode() {
    if (!pairingCode) return;
    const clean = pairingCode.replace('-', '');
    try {
      await navigator.clipboard.writeText(clean);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
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
      setInputCode(res.code);
      setSuccessNote('Kode verifikasi Owner dibuat: ' + res.code);
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
      let finalPersonaId = selectedPersona;

      // Jika user membuat persona kustom di wizard
      if (personaMode === 'custom' && customName.trim()) {
        const slug = customName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
        const customPersona = {
          id: slug || `custom-${Date.now().toString(36)}`,
          name: customName.trim(),
          style: customStyle.trim(),
          language: 'id',
          typingDelay: 'natural',
          greeting: customGreeting.trim() || undefined,
          forbiddenTopics: [],
          extraInstructions: customPrompt.trim() || undefined,
        };
        const created = await api.createPersona(customPersona);
        if (created?.persona?.id) {
          finalPersonaId = created.persona.id;
        }
      }

      await api.finalizeSetup({
        personaId: finalPersonaId || undefined,
        accessMode,
      });
      setSuccessNote('Setup wizard berhasil diselesaikan!');
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
      const res = await api.playgroundChat({
        text: testText,
        personaId: selectedPersona || undefined,
      });
      const reply = res.text || 'Bot menerima pesan tetapi tidak mengirim teks';
      setTestResponse(reply);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const stepsMeta = [
    '1. Password Admin',
    '2. AI Provider & Key',
    '3. WhatsApp',
    '4. Verifikasi Owner',
    '5. Persona & Akses',
    '6. Uji Coba & Selesai',
  ];

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', width: '100%' }}>
      <header style={{ marginBottom: '1.75rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <Icons.Robot width={24} height={24} />
          <span>Setup Wizard ArKzorMD</span>
        </h1>
        <p class="muted">
          Konfigurasi mandiri dalam 6 langkah cepat di bawah 10 menit tanpa perlu edit file server manual.
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
                  padding: '0.6rem 0.25rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderBottom: `3px solid ${
                    isDone ? 'var(--color-ok, #10b981)' : isCurrent ? 'var(--accent, #10b981)' : 'var(--border)'
                  }`,
                  color: isCurrent ? 'var(--text)' : 'var(--muted)',
                  cursor: isDone ? 'pointer' : 'default',
                  transition: 'border-color var(--duration-fast)',
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
        <div class="banner ok" style={{ marginBottom: '1.25rem' }}>
          <Icons.CheckCircle width={16} height={16} />
          <span>{successNote}</span>
        </div>
      )}

      {/* Step 1: Buat password admin */}
      {step === 1 && (
        <Card title="Langkah 1: Buat Password Admin Web UI" icon={<Icons.Key width={16} height={16} />}>
          <p class="muted" style={{ marginBottom: '1.25rem' }}>
            Password ini digunakan untuk mengamankan Web UI, menyetujui izin sensitif, dan mengelola bot.
          </p>
          <form onSubmit={handleStep1Submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div class="form-group">
              <label class="form-label">
                <span>Password Admin</span>
              </label>
              <input
                type="password"
                class="input"
                value={password}
                onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
                placeholder="Minimal 8 karakter acak kuat"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label">
                <span>Konfirmasi Password</span>
              </label>
              <input
                type="password"
                class="input"
                value={confirmPassword}
                onInput={(e) => setConfirmPassword((e.target as HTMLInputElement).value)}
                placeholder="Ulangi password di atas"
                required
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button type="submit" class="btn btn-primary" disabled={loading}>
                <span>{loading ? 'Menyimpan…' : 'Simpan & Lanjutkan →'}</span>
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Step 2: AI Provider & API Key */}
      {step === 2 && (
        <Card title="Langkah 2: Pilih AI Provider & Masukkan API Key" icon={<Icons.Cpu width={16} height={16} />}>
          <p class="muted" style={{ marginBottom: '1.25rem' }}>
            Pilih penyedia LLM utama, konfigurasi endpoint (tersedia 9Router lokal, Gemini, OpenAI, OpenRouter), dan isi API Key.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div class="grid grid-2">
              <div class="form-group">
                <label class="form-label">
                  <span>Penyedia AI</span>
                </label>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  {[
                    { id: '9router', label: '9Router' },
                    { id: 'gemini', label: 'Gemini' },
                    { id: 'openai', label: 'OpenAI' },
                    { id: 'openrouter', label: 'OpenRouter' },
                    { id: 'ollama', label: 'Ollama' },
                    { id: 'none', label: 'Lewati AI' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      class={`btn btn-sm ${aiProvider === p.id ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '3px 10px', fontSize: '12px' }}
                      onClick={() => handleProviderSelect(p.id)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <select
                  class="input"
                  value={aiProvider}
                  onChange={(e) => handleProviderSelect((e.target as HTMLSelectElement).value)}
                >
                  <option value="9router">9Router - Local AI Gateway</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="ollama">Ollama</option>
                  <option value="none">Mode Manual: Tanpa AI, Hanya Perintah</option>
                  <option value="custom">Custom API</option>
                  <option value="mock">Mock Provider</option>
                </select>
                <span class="form-hint">
                  {aiProvider === 'none' && 'Mode manual: bot hanya merespon perintah awalan titik dan mengabaikan chat biasa.'}
                  {aiProvider === '9router' && 'Gunakan 9Router local gateway port 20128. Tanpa kuota cloud.'}
                  {aiProvider === 'gemini' && 'Resmi Google Gemini. Sangat disarankan untuk multimodal WhatsApp.'}
                  {aiProvider === 'openai' && 'Model GPT-4o resmi dari OpenAI platform.'}
                </span>
              </div>

              <div class="form-group">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                  <label class="form-label" style={{ marginBottom: 0 }}>
                    <span>Nama Model</span>
                  </label>
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    style={{ padding: '2px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onClick={handleFetchModelsStep2}
                    disabled={fetchingModels}
                    title="Tarik daftar model dari endpoint AI"
                  >
                    <Icons.Download width={12} height={12} />
                    <span>{fetchingModels ? 'Menarik…' : 'Tarik Model'}</span>
                  </button>
                </div>
                {fetchedModels.length > 0 && (
                  <select
                    class="input"
                    style={{ marginBottom: '8px' }}
                    value={fetchedModels.includes(aiModel) ? aiModel : ''}
                    onChange={(e) => {
                      const val = (e.target as HTMLSelectElement).value;
                      if (val) setAiModel(val);
                    }}
                  >
                    <option value="">-- Pilih dari {fetchedModels.length} Model --</option>
                    {fetchedModels.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  class="input"
                  value={aiModel}
                  onInput={(e) => setAiModel((e.target as HTMLInputElement).value)}
                  placeholder="Contoh: gemini-2.5-flash, auto, gpt-4o-mini"
                  required
                />
              </div>
            </div>

            <div class="grid grid-2">
              <div class="form-group">
                <label class="form-label">
                  <span>Base URL Endpoint</span>
                </label>
                <input
                  type="text"
                  class="input"
                  value={aiBaseUrl}
                  onInput={(e) => setAiBaseUrl((e.target as HTMLInputElement).value)}
                  placeholder="https://generativelanguage.googleapis.com/v1beta"
                />
              </div>

              <div class="form-group">
                <label class="form-label">
                  <span>API Key</span>
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  {showApiKey ? (
                    <input
                      type="text"
                      class="input"
                      style={{ width: '100%', paddingRight: '44px' }}
                      value={aiApiKey}
                      onInput={(e) => setAiApiKey((e.target as HTMLInputElement).value)}
                      placeholder={aiProvider === '9router' || aiProvider === 'ollama' ? 'Opsional untuk 9Router / Ollama' : 'Tempelkan API Key di sini'}
                    />
                  ) : (
                    <input
                      type="password"
                      class="input"
                      style={{ width: '100%', paddingRight: '44px' }}
                      value={aiApiKey}
                      onInput={(e) => setAiApiKey((e.target as HTMLInputElement).value)}
                      placeholder={aiProvider === '9router' || aiProvider === 'ollama' ? 'Opsional untuk 9Router / Ollama' : 'Tempelkan API Key di sini'}
                    />
                  )}
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    style={{ position: 'absolute', right: '4px', padding: '6px 8px' }}
                    onClick={() => setShowApiKey(!showApiKey)}
                    title={showApiKey ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {showApiKey ? <Icons.EyeOff width={14} height={14} /> : <Icons.Eye width={14} height={14} />}
                  </button>
                </div>
              </div>
            </div>

            {testResult && (
              <div class={`banner ${testResult.ok ? 'ok' : 'danger'}`} style={{ padding: '10px 14px' }}>
                <strong>{testResult.ok ? `Koneksi AI Berhasil - ${testResult.latencyMs} ms` : 'Koneksi Gagal'}</strong>
                <p class="small" style={{ margin: '2px 0 0' }}>
                  {testResult.ok ? `Balasan: "${testResult.reply}"` : testResult.error}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
              <button type="button" class="btn btn-secondary" onClick={() => setStep(1)}>
                ← Kembali
              </button>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  class="btn btn-secondary"
                  style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
                  onClick={handleSkipAiStep2}
                  disabled={loading}
                  title="Lewati konfigurasi AI dan gunakan bot untuk perintah manual"
                >
                  <span>Lewati AI: Mode Manual →</span>
                </button>
                <button
                  type="button"
                  class="btn btn-secondary"
                  onClick={handleTestAiStep2}
                  disabled={testingAi || loading || aiProvider === 'none'}
                >
                  <Icons.Activity width={14} height={14} />
                  <span>{testingAi ? 'Menguji…' : 'Uji Koneksi AI'}</span>
                </button>
                <button
                  type="button"
                  class="btn btn-primary"
                  onClick={handleSaveStep2AndNext}
                  disabled={loading}
                >
                  <span>{loading ? 'Menyimpan…' : 'Lanjut ke WhatsApp →'}</span>
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Hubungkan WhatsApp */}
      {step === 3 && (
        <Card title="Langkah 3: Hubungkan WhatsApp" icon={<Icons.WhatsApp width={16} height={16} />}>
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
              <Icons.QrCode width={13} height={13} />
              <span>Pindai QR Code</span>
            </button>
            <button
              type="button"
              class={`btn btn-sm ${waMethod === 'code' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setWaMethod('code')}
            >
              <Icons.Key width={13} height={13} />
              <span>Pairing Code</span>
            </button>
          </div>

          {status?.connection.status === 'connected' ? (
            <div class="banner ok" style={{ textAlign: 'center', padding: '1.5rem' }}>
              <Icons.CheckCircle width={24} height={24} />
              <strong style={{ display: 'block', margin: '8px 0 4px', fontSize: '16px' }}>WhatsApp Sudah Terhubung!</strong>
              <p class="muted small" style={{ margin: 0 }}>
                Bot telah terotentikasi dan siap memproses pesan WhatsApp.
              </p>
              <button
                type="button"
                class="btn btn-danger btn-sm"
                style={{ marginTop: '1rem' }}
                onClick={() => void handleDisconnectWhatsApp()}
                disabled={connectingWa}
              >
                Putuskan Sambungan
              </button>
            </div>
          ) : waMethod === 'qr' ? (
            <div style={{ textAlign: 'center' }}>
              {status?.connection.qr ? (
                <>
                  <p class="small muted" style={{ marginBottom: '0.5rem' }}>
                    Buka WhatsApp di ponsel → Menu ⋮ / Pengaturan → <strong>Perangkat Tertaut</strong> → <strong>Tautkan Perangkat</strong>.
                  </p>
                  <PairingQr value={status.connection.qr} />
                </>
              ) : (
                <div style={{ padding: '2rem 1rem', background: 'var(--surface-sunken)', borderRadius: '8px' }}>
                  <p class="muted" style={{ marginBottom: '1rem' }}>
                    Socket WhatsApp belum aktif atau QR Code belum dimuat.
                  </p>
                  <button
                    type="button"
                    class="btn btn-primary"
                    onClick={() => void handleConnectWhatsApp()}
                    disabled={connectingWa}
                  >
                    <Icons.Refresh width={14} height={14} />
                    <span>{connectingWa ? 'Memulai koneksi…' : 'Mulai / Muat QR Code'}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              {pairingCode ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--surface-sunken)', borderRadius: '8px' }}>
                  <p class="muted small" style={{ marginBottom: '0.5rem' }}>Kode Pairing WhatsApp 8 Digit Anda:</p>
                  <div style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '0.3em', margin: '0.75rem 0', color: 'var(--accent)', fontFamily: 'monospace' }}>
                    {pairingCode}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                    <button
                      type="button"
                      class="btn btn-primary btn-sm"
                      onClick={handleCopyPairingCode}
                    >
                      <Icons.Copy width={13} height={13} />
                      <span>{copiedCode ? 'Tersalin!' : 'Salin Kode'}</span>
                    </button>
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      onClick={() => setPairingCode(null)}
                    >
                      Minta Kode Baru
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePairingCodeRequest} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div class="form-group">
                    <label class="form-label">
                      <span>Nomor HP WhatsApp Bot</span>
                    </label>
                    <input
                      type="tel"
                      class="input"
                      placeholder="Contoh: 628123456789 atau 08123456789"
                      value={waPhone}
                      onInput={(e) => setWaPhone((e.target as HTMLInputElement).value)}
                      required
                    />
                  </div>
                  <button type="submit" class="btn btn-primary" disabled={loading || !waPhone.trim()}>
                    <span>{loading ? 'Meminta kode dari server…' : 'Dapatkan Pairing Code'}</span>
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
        <Card title="Langkah 4: Verifikasi Nomor Owner" icon={<Icons.ShieldCheck width={16} height={16} />}>
          <p class="muted" style={{ marginBottom: '1.25rem' }}>
            Owner adalah pemegang kendali tertinggi bot. Aksi berisiko L1 membutuhkan izin Owner.
          </p>

          {ownerVerified ? (
            <div class="banner ok" style={{ marginBottom: '1.5rem' }}>
              <Icons.CheckCircle width={18} height={18} />
              <div>
                <strong>Owner Telah Terverifikasi!</strong>
                <p class="small" style={{ margin: '2px 0 0' }}>
                  Nomor Owner: <code>{status?.ownerConfigured ? 'Terkonfigurasi' : ownerPhone}</code>
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div class="form-group">
                <label class="form-label">
                  <span>Nomor WhatsApp Owner</span>
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                    Minta Kode 6-Digit
                  </button>
                </div>
              </div>

              {ownerVerificationCode && (
                <div class="banner info" style={{ padding: '12px 16px' }}>
                  <strong>Kode Verifikasi: <code>{ownerVerificationCode}</code></strong>
                  <p class="small" style={{ margin: '4px 0 0' }}>
                    Klik tombol Verifikasi di bawah untuk mengonfirmasi Owner.
                  </p>
                </div>
              )}

              <div class="form-group">
                <label class="form-label">
                  <span>Masukkan Kode 6-Digit</span>
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    class="input"
                    style={{ flex: 1 }}
                    maxLength={6}
                    placeholder="Contoh: 123456"
                    value={inputCode}
                    onInput={(e) => setInputCode((e.target as HTMLInputElement).value)}
                  />
                  <button
                    type="button"
                    class="btn btn-primary"
                    onClick={() => void handleVerifyOwner()}
                    disabled={loading || inputCode.length !== 6}
                  >
                    Verifikasi Owner
                  </button>
                </div>
              </div>
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
        <Card title="Langkah 5: Kepribadian Bot & Mode Akses" icon={<Icons.Sparkles width={16} height={16} />}>
          <p class="muted" style={{ marginBottom: '1.25rem' }}>
            Pilih watak awal bot (atau rancang persona kustom sendiri) dan tentukan bagaimana bot menyikapi nomor baru.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Toggle Persona Mode */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                class={`btn btn-sm ${personaMode === 'preset' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPersonaMode('preset')}
              >
                Pilih Persona Bawaan
              </button>
              <button
                type="button"
                class={`btn btn-sm ${personaMode === 'custom' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPersonaMode('custom')}
              >
                <Icons.Plus width={13} height={13} />
                <span>Rancang Persona Kustom</span>
              </button>
            </div>

            {personaMode === 'preset' ? (
              <div class="form-group">
                <label class="form-label">
                  <span>Pilih Karakter Bot</span>
                </label>
                <select
                  class="input"
                  value={selectedPersona}
                  onChange={(e) => setSelectedPersona((e.target as HTMLSelectElement).value)}
                >
                  {personas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.greeting ? `"${p.greeting}"` : p.id}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'var(--surface-2)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                <div class="grid grid-2">
                  <div class="form-group">
                    <label class="form-label">
                      <span>Nama Bot</span>
                    </label>
                    <input
                      type="text"
                      class="input"
                      value={customName}
                      onInput={(e) => setCustomName((e.target as HTMLInputElement).value)}
                      placeholder="misal: Jarvis, Luna AI"
                      required
                    />
                  </div>
                  <div class="form-group">
                    <label class="form-label">
                      <span>Gaya Tutur</span>
                    </label>
                    <input
                      type="text"
                      class="input"
                      value={customStyle}
                      onInput={(e) => setCustomStyle((e.target as HTMLInputElement).value)}
                      placeholder="misal: jutek dry text, ramah formal, gaul santai"
                    />
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">
                    <span>Sapaan Awal</span>
                  </label>
                  <input
                    type="text"
                    class="input"
                    value={customGreeting}
                    onInput={(e) => setCustomGreeting((e.target as HTMLInputElement).value)}
                    placeholder="misal: paan? / Ada yang bisa kubantu?"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">
                    <span>Instruksi Sistem Tambahan</span>
                  </label>
                  <textarea
                    class="input"
                    style={{ minHeight: '70px', resize: 'vertical' }}
                    value={customPrompt}
                    onInput={(e) => setCustomPrompt((e.target as HTMLTextAreaElement).value)}
                    placeholder="Instruksi watak spesifik untuk model AI..."
                  />
                </div>
              </div>
            )}

            <div>
              <span class="small muted" style={{ fontWeight: 600 }}>Mode Akses Nomor Asing:</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="accessMode"
                    value="closed"
                    checked={accessMode === 'closed'}
                    onChange={() => setAccessMode('closed')}
                  />
                  <span>
                    <strong>Tertutup</strong> — Hanya membalas Owner & Admin; nomor asing diabaikan.
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="accessMode"
                    value="auto_member"
                    checked={accessMode === 'auto_member'}
                    onChange={() => setAccessMode('auto_member')}
                  />
                  <span>
                    <strong>Member Otomatis</strong> — Nomor baru otomatis menjadi Member dan dapat mengobrol.
                  </span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
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
                <span>{loading ? 'Menyimpan…' : 'Selesaikan Setup →'}</span>
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 6: Selesai & Uji Coba */}
      {step === 6 && (
        <Card title="Langkah 6: Selesai & Uji Coba" icon={<Icons.CheckCircle width={16} height={16} />}>
          <div class="banner ok" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '1.75rem 1rem' }}>
            <Icons.CheckCircle width={32} height={32} />
            <h2 style={{ fontSize: '1.35rem', margin: '8px 0 4px' }}>Bot WhatsApp ArKzorMD Siap Digunakan!</h2>
            <p class="muted small" style={{ margin: 0 }}>
              Semua konfigurasi selesai. Anda dapat langsung menguji respons AI atau masuk ke Dashboard.
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <div class="form-group">
              <label class="form-label">
                <span>Kirim Pesan Uji ke AI</span>
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
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
            </div>

            {testResponse && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--surface-sunken)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <span class="small muted" style={{ fontWeight: 600 }}>Balasan Bot:</span>
                <p style={{ margin: '4px 0 0', fontWeight: 500 }}>{testResponse}</p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <button
              type="button"
              class="btn btn-primary"
              style={{ padding: '10px 20px', fontSize: '15px' }}
              onClick={() => {
                if (onFinish) onFinish();
                else window.location.hash = '#/dashboard';
              }}
            >
              <span>Selesai & Masuk ke Dashboard Utama →</span>
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
