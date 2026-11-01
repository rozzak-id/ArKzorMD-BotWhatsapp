import { useEffect, useState } from 'preact/hooks';
import { api } from '../api';
import { Badge, Card, ErrorNote, Icons, Loading } from '../components';
import { useAsync } from '../hooks';

export function SettingsPage() {
  const { data, error, loading, reload } = useAsync(() => api.settings(), []);

  // AI Configuration State
  const [aiProvider, setAiProvider] = useState<string>('gemini');
  const [aiModel, setAiModel] = useState<string>('gemini-2.5-flash');
  const [aiBaseUrl, setAiBaseUrl] = useState<string>('');
  const [aiApiKey, setAiApiKey] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; latencyMs?: number; reply?: string; error?: string } | null>(null);

  // Access & Self Control State
  const [selfControl, setSelfControl] = useState<boolean>(true);
  const [prefix, setPrefix] = useState<string>('.');
  const [accessMode, setAccessMode] = useState<string>('closed');
  const [rateLimit, setRateLimit] = useState<number>(12);

  // Form submit state
  const [savingAi, setSavingAi] = useState(false);
  const [savingAccess, setSavingAccess] = useState(false);
  const [resetting, setResetting] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  // Sync state from server on load
  useEffect(() => {
    if (data) {
      setAiProvider(data.aiProvider || 'gemini');
      setAiModel(data.aiModel || 'gemini-2.5-flash');
      setAiBaseUrl(data.aiBaseUrl || '');
      setSelfControl(data.selfControl !== false);
      setPrefix(data.prefix || '.');
      setAccessMode(data.accessMode || 'closed');
      setRateLimit(data.rateLimitPerMinute || 12);
    }
  }, [data]);

  const handleProviderChange = (newProvider: string) => {
    setAiProvider(newProvider);
    setTestResult(null);
    if (newProvider === '9router') {
      setAiBaseUrl('http://localhost:20128/v1');
      setAiModel('auto');
    } else if (newProvider === 'gemini') {
      setAiBaseUrl('https://generativelanguage.googleapis.com/v1beta');
      setAiModel('gemini-2.5-flash');
    } else if (newProvider === 'openai') {
      setAiBaseUrl('https://api.openai.com/v1');
      setAiModel('gpt-4o-mini');
    } else if (newProvider === 'openrouter') {
      setAiBaseUrl('https://openrouter.ai/api/v1');
      setAiModel('deepseek/deepseek-chat');
    } else if (newProvider === 'ollama') {
      setAiBaseUrl('http://localhost:11434/v1');
      setAiModel('llama3.2');
    }
  };

  const handleTestAi = async () => {
    setTestingAi(true);
    setTestResult(null);
    setActionError(null);
    try {
      const res = await api.testAi({
        aiProvider,
        aiModel,
        aiBaseUrl: aiBaseUrl || undefined,
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
  };

  const handleSaveAi = async (e: Event) => {
    e.preventDefault();
    setSavingAi(true);
    setActionError(null);
    setSuccessNote(null);
    try {
      await api.updateSettings({
        aiProvider,
        aiModel,
        aiBaseUrl: aiBaseUrl.trim() || undefined,
        aiApiKey: aiApiKey.trim() || undefined,
      });
      setSuccessNote('Konfigurasi model & API Key AI berhasil disimpan dan diterapkan!');
      setAiApiKey(''); // bersihkan input key setelah tersimpan
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingAi(false);
    }
  };

  const handleSaveAccess = async (e: Event) => {
    e.preventDefault();
    setSavingAccess(true);
    setActionError(null);
    setSuccessNote(null);
    try {
      await api.updateSettings({
        selfControl,
        prefix,
        accessMode,
        rateLimitPerMinute: Number(rateLimit),
      });
      setSuccessNote('Setelan kontrol akses & bot berhasil disimpan.');
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingAccess(false);
    }
  };

  const handleResetData = async (target: 'memory' | 'audit' | 'factory_reset', label: string) => {
    if (!window.confirm(`PERINGATAN: Apakah Anda yakin ingin melakukan ${label}? Tindakan ini permanen.`)) {
      return;
    }
    setResetting(target);
    setActionError(null);
    setSuccessNote(null);
    try {
      const res = await api.resetData(target);
      setSuccessNote(res.message);
      if (target === 'factory_reset') {
        window.location.hash = '#/setup';
      } else {
        await reload();
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setResetting(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <ErrorNote message={error || actionError} />
      {successNote && (
        <div class="banner ok">
          <Icons.CheckCircle width={16} height={16} />
          <span>{successNote}</span>
        </div>
      )}

      {/* 1. Pengaturan AI Provider & API Key */}
      <Card
        title="Pengaturan Mesin AI & API Key"
        subtitle="Pilih provider LLM, konfigurasi endpoint kustom (seperti 9Router / Ollama), dan masukkan API Key"
        icon={<Icons.Cpu width={16} height={16} />}
      >
        {loading && <Loading text="Memuat konfigurasi…" />}
        {!loading && (
          <form onSubmit={handleSaveAi} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div class="grid grid-2">
              <div class="form-group">
                <label class="form-label">
                  <span>Penyedia AI (Provider)</span>
                </label>
                <select
                  class="input"
                  value={aiProvider}
                  onChange={(e) => handleProviderChange((e.target as HTMLSelectElement).value)}
                >
                  <option value="9router">9Router (Local AI Gateway · :20128)</option>
                  <option value="gemini">Google Gemini (Gemini 2.5 Flash / Pro)</option>
                  <option value="openai">OpenAI Resmi (GPT-4o / GPT-4o-mini)</option>
                  <option value="openrouter">OpenRouter (DeepSeek, Claude, Llama)</option>
                  <option value="ollama">Ollama Local (:11434/v1)</option>
                  <option value="custom">Custom OpenAI-Compatible Endpoint</option>
                  <option value="mock">Mode Mock (Uji coba tanpa kuota)</option>
                </select>
                <span class="form-hint">
                  {aiProvider === '9router' && 'Terhubung ke 9Router gateway lokal Anda. OpenAI-compatible di port 20128.'}
                  {aiProvider === 'gemini' && 'Model resmi Google Generative AI dengan dukungan multimodal & audio.'}
                  {aiProvider === 'openai' && 'Endpoint standar OpenAI. Membutuhkan API Key dari platform.openai.com.'}
                  {aiProvider === 'openrouter' && 'Router multi-vendor untuk Claude, DeepSeek, Mistral, dll.'}
                  {aiProvider === 'ollama' && 'Model lokal gratis tanpa internet yang berjalan di PC Anda.'}
                </span>
              </div>

              <div class="form-group">
                <label class="form-label">
                  <span>Model AI</span>
                </label>
                <input
                  type="text"
                  class="input"
                  value={aiModel}
                  onInput={(e) => setAiModel((e.target as HTMLInputElement).value)}
                  placeholder="misal: gemini-2.5-flash, gpt-4o-mini, auto"
                  required
                />
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <span class="small muted">Preset cepat:</span>
                  {aiProvider === 'gemini' && (
                    <>
                      <button type="button" class="chip" onClick={() => setAiModel('gemini-2.5-flash')}>gemini-2.5-flash</button>
                      <button type="button" class="chip" onClick={() => setAiModel('gemini-1.5-pro')}>gemini-1.5-pro</button>
                    </>
                  )}
                  {aiProvider === 'openai' && (
                    <>
                      <button type="button" class="chip" onClick={() => setAiModel('gpt-4o-mini')}>gpt-4o-mini</button>
                      <button type="button" class="chip" onClick={() => setAiModel('gpt-4o')}>gpt-4o</button>
                    </>
                  )}
                  {aiProvider === '9router' && (
                    <>
                      <button type="button" class="chip" onClick={() => setAiModel('auto')}>auto</button>
                      <button type="button" class="chip" onClick={() => setAiModel('default')}>default</button>
                    </>
                  )}
                  {aiProvider === 'openrouter' && (
                    <>
                      <button type="button" class="chip" onClick={() => setAiModel('deepseek/deepseek-chat')}>deepseek-chat</button>
                      <button type="button" class="chip" onClick={() => setAiModel('anthropic/claude-3.5-sonnet')}>claude-3.5-sonnet</button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div class="grid grid-2">
              <div class="form-group">
                <label class="form-label">
                  <span>Base URL Endpoint</span>
                  <span class="form-hint">Otomatis terisi sesuai provider</span>
                </label>
                <input
                  type="text"
                  class="input"
                  value={aiBaseUrl}
                  onInput={(e) => setAiBaseUrl((e.target as HTMLInputElement).value)}
                  placeholder="https://api.openai.com/v1"
                />
              </div>

              <div class="form-group">
                <label class="form-label">
                  <span>API Key AI</span>
                  {data?.hasApiKey ? (
                    <Badge tone="ok" size="sm" icon={<Icons.Check width={10} height={10} />}>
                      Tersimpan di Server
                    </Badge>
                  ) : (
                    <Badge tone="warn" size="sm">Belum Ada Key</Badge>
                  )}
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  {showApiKey ? (
                    <input
                      type="text"
                      class="input"
                      style={{ width: '100%', paddingRight: '44px' }}
                      value={aiApiKey}
                      onInput={(e) => setAiApiKey((e.target as HTMLInputElement).value)}
                      placeholder={data?.hasApiKey ? '•••••••••••••••••••••••• (Ketik baru untuk ganti)' : 'Tempelkan API Key di sini'}
                    />
                  ) : (
                    <input
                      type="password"
                      class="input"
                      style={{ width: '100%', paddingRight: '44px' }}
                      value={aiApiKey}
                      onInput={(e) => setAiApiKey((e.target as HTMLInputElement).value)}
                      placeholder={data?.hasApiKey ? '•••••••••••••••••••••••• (Ketik baru untuk ganti)' : 'Tempelkan API Key di sini'}
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
                <span class="form-hint">
                  {aiProvider === '9router' || aiProvider === 'ollama'
                    ? 'Opsional untuk 9Router / Ollama lokal (bila tidak memakai token dashboard).'
                    : 'Disimpan secara terenkripsi di server lokal SQLite.'}
                </span>
              </div>
            </div>

            {/* Test result feedback */}
            {testResult && (
              <div class={`banner ${testResult.ok ? 'ok' : 'danger'}`} style={{ padding: '12px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                  {testResult.ok ? <Icons.CheckCircle width={16} height={16} /> : <Icons.AlertTriangle width={16} height={16} />}
                  <span>{testResult.ok ? `Koneksi Berhasil! Latency: ${testResult.latencyMs}ms` : 'Koneksi Gagal'}</span>
                </div>
                <p class="small" style={{ margin: '4px 0 0', opacity: 0.9 }}>
                  {testResult.ok ? `Balasan AI: "${testResult.reply}"` : testResult.error}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                class="btn btn-secondary"
                onClick={handleTestAi}
                disabled={testingAi || savingAi}
              >
                <Icons.Activity width={14} height={14} />
                <span>{testingAi ? 'Menguji Koneksi…' : 'Uji Koneksi AI'}</span>
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                disabled={savingAi}
              >
                <Icons.Save width={14} height={14} />
                <span>{savingAi ? 'Menyimpan…' : 'Simpan Konfigurasi AI'}</span>
              </button>
            </div>
          </form>
        )}
      </Card>

      {/* 2. Mode Kontrol, Self Control & Akses */}
      <Card
        title="Mode Kontrol Bot & Kebijakan Akses"
        subtitle="Atur apakah bot membalas akun sendiri (Self Mode), prefix command, dan mode akses publik"
        icon={<Icons.ShieldCheck width={16} height={16} />}
      >
        <form onSubmit={handleSaveAccess} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Toggle Self Control */}
          <div class="toggle-row">
            <div>
              <strong style={{ display: 'block', fontSize: '14.5px' }}>Mode Self Control (Respon Chat Nomor Sendiri)</strong>
              <p class="form-hint" style={{ margin: '2px 0 0' }}>
                Jika aktif, Owner dapat mengetik perintah (seperti <code>.menu</code>, <code>.ping</code>, atau chat AI) langsung dari aplikasi WhatsApp di HP bot itu sendiri tanpa diabaikan.
              </p>
            </div>
            <label class="toggle-switch">
              <input
                type="checkbox"
                checked={selfControl}
                onChange={(e) => setSelfControl((e.target as HTMLInputElement).checked)}
              />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="grid grid-3">
            <div class="form-group">
              <label class="form-label">
                <span>Prefix Command</span>
              </label>
              <input
                type="text"
                class="input"
                maxLength={3}
                value={prefix}
                onInput={(e) => setPrefix((e.target as HTMLInputElement).value)}
                placeholder="."
                required
              />
              <span class="form-hint">Karakter awalan perintah (misal: .)</span>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span>Kebijakan Kontak Baru</span>
              </label>
              <select
                class="input"
                value={accessMode}
                onChange={(e) => setAccessMode((e.target as HTMLSelectElement).value)}
              >
                <option value="closed">Tertutup (Hanya Owner & Admin)</option>
                <option value="auto_member">Member Otomatis (Publik)</option>
                <option value="approval">Perlu Persetujuan Owner</option>
              </select>
              <span class="form-hint">Bagaimana bot menyikapi nomor baru</span>
            </div>

            <div class="form-group">
              <label class="form-label">
                <span>Batas Rate Limit (Pesan/Menit)</span>
              </label>
              <input
                type="number"
                class="input"
                min={1}
                max={120}
                value={rateLimit}
                onInput={(e) => setRateLimit(Number((e.target as HTMLInputElement).value))}
                required
              />
              <span class="form-hint">Mencegah spam & pembatasan WhatsApp</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button type="submit" class="btn btn-primary" disabled={savingAccess}>
              <Icons.Save width={14} height={14} />
              <span>{savingAccess ? 'Menyimpan…' : 'Simpan Setelan Akses'}</span>
            </button>
          </div>
        </form>
      </Card>

      {/* 3. Zona Bahaya: Reset Data */}
      <Card
        title="Zona Bahaya & Reset Data"
        subtitle="Hapus memori percakapan, bersihkan audit log, atau kembalikan bot ke kondisi awal (Setup Wizard)"
        icon={<Icons.AlertTriangle width={16} height={16} />}
        className="danger-zone"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div class="toggle-row" style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
            <div>
              <strong style={{ display: 'block' }}>Reset Memori Bot (Long-Term Facts)</strong>
              <span class="form-hint">Menghapus semua catatan fakta dan memori jangka panjang yang dipelajari bot dari pengguna.</span>
            </div>
            <button
              type="button"
              class="btn btn-danger btn-sm"
              onClick={() => handleResetData('memory', 'Reset Memori Bot')}
              disabled={resetting !== null}
            >
              <Icons.Trash width={13} height={13} />
              <span>{resetting === 'memory' ? 'Menghapus…' : 'Hapus Memori'}</span>
            </button>
          </div>

          <div class="toggle-row" style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
            <div>
              <strong style={{ display: 'block' }}>Bersihkan Audit Log</strong>
              <span class="form-hint">Menghapus seluruh rekaman riwayat eksekusi tool, persetujuan, dan pesan dari audit log.</span>
            </div>
            <button
              type="button"
              class="btn btn-danger btn-sm"
              onClick={() => handleResetData('audit', 'Pembersihan Audit Log')}
              disabled={resetting !== null}
            >
              <Icons.Trash width={13} height={13} />
              <span>{resetting === 'audit' ? 'Membersihkan…' : 'Bersihkan Audit'}</span>
            </button>
          </div>

          <div class="toggle-row" style={{ background: 'rgba(15, 23, 42, 0.6)' }}>
            <div>
              <strong style={{ display: 'block' }}>Factory Reset (Ulangi Setup Wizard)</strong>
              <span class="form-hint">Mereset memori, audit log, dan mengembalikan status bot agar Setup Wizard dapat dijalankan ulang dari langkah 1.</span>
            </div>
            <button
              type="button"
              class="btn btn-danger btn-sm"
              onClick={() => handleResetData('factory_reset', 'Factory Reset Bot')}
              disabled={resetting !== null}
            >
              <Icons.Refresh width={13} height={13} />
              <span>{resetting === 'factory_reset' ? 'Mereset…' : 'Reset ke Kondisi Awal'}</span>
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
