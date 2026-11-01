import { useState } from 'preact/hooks';
import { api } from '../api';
import { Badge, Card, Empty, ErrorNote, Icons, Loading } from '../components';
import { useAsync } from '../hooks';
import type { Persona } from '../types';

interface PersonaFormState {
  isNew: boolean;
  id: string;
  name: string;
  style: string;
  language: string;
  typingDelay: 'natural' | 'fast' | 'slow';
  greeting: string;
  forbiddenTopics: string;
  extraInstructions: string;
}

export function PersonasPage() {
  const { data, error, loading, reload } = useAsync(() => api.personas(), []);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [formData, setFormData] = useState<PersonaFormState>({
    isNew: true,
    id: '',
    name: '',
    style: 'santai',
    language: 'id',
    typingDelay: 'natural',
    greeting: '',
    forbiddenTopics: '',
    extraInstructions: '',
  });

  const handleActivate = async (id: string) => {
    setActionError(null);
    setSuccessNote(null);
    try {
      await api.activatePersona(id);
      setSuccessNote(`Persona "${id}" berhasil diaktifkan sebagai kepribadian default bot.`);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleOpenCreate = () => {
    setActionError(null);
    setFormData({
      isNew: true,
      id: '',
      name: '',
      style: 'santai',
      language: 'id',
      typingDelay: 'natural',
      greeting: '',
      forbiddenTopics: '',
      extraInstructions: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (p: Persona) => {
    setActionError(null);
    setFormData({
      isNew: false,
      id: p.id,
      name: p.name,
      style: p.style,
      language: p.language,
      typingDelay: (p.typingDelay as any) || 'natural',
      greeting: p.greeting ?? '',
      forbiddenTopics: p.forbiddenTopics?.join(', ') ?? '',
      extraInstructions: p.extraInstructions ?? '',
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Yakin ingin menghapus persona "${id}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    setActionError(null);
    setSuccessNote(null);
    try {
      await api.deletePersona(id);
      setSuccessNote(`Persona "${id}" berhasil dihapus.`);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSavePersona = async (e: Event) => {
    e.preventDefault();
    setActionError(null);
    setModalSubmitting(true);

    try {
      const payload: any = {
        id: formData.id.trim().toLowerCase(),
        name: formData.name.trim(),
        style: formData.style.trim(),
        language: formData.language.trim().toLowerCase(),
        typingDelay: formData.typingDelay,
        greeting: formData.greeting.trim() || undefined,
        forbiddenTopics: formData.forbiddenTopics
          ? formData.forbiddenTopics.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
        extraInstructions: formData.extraInstructions.trim() || undefined,
      };

      if (!payload.id || !payload.name) {
        throw new Error('ID dan Nama persona wajib diisi.');
      }

      if (formData.isNew) {
        await api.createPersona(payload);
        setSuccessNote(`Persona "${payload.name}" berhasil dibuat.`);
      } else {
        await api.updatePersona(payload.id, payload);
        setSuccessNote(`Persona "${payload.name}" berhasil diperbarui.`);
      }

      setModalOpen(false);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleExport = () => {
    window.open('/api/personas/export', '_blank');
  };

  const handleImportFile = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    setActionError(null);
    setSuccessNote(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const list = Array.isArray(parsed)
        ? parsed
        : typeof parsed === 'object' && parsed !== null && 'personas' in parsed
          ? (parsed as { personas: unknown[] }).personas
          : null;

      if (!list || !Array.isArray(list)) {
        throw new Error('Format file JSON tidak valid. Diharapkan daftar persona.');
      }

      const res = await api.importPersonas(list);
      setSuccessNote(`Berhasil mengimpor ${res.imported} persona.`);
      input.value = '';
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <>
      <Card
        title="Koleksi Persona & Karakter AI"
        subtitle="Kelola kepribadian bot, gaya tutur kata, respon otomatis, sapaan, dan aturan topik"
        icon={<Icons.Sparkles width={16} height={16} />}
        action={
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button class="btn btn-primary btn-sm" type="button" onClick={handleOpenCreate}>
              <Icons.Plus width={14} height={14} />
              <span>Tambah Persona</span>
            </button>
            <button class="btn btn-secondary btn-sm" type="button" onClick={handleExport} title="Ekspor persona ke JSON">
              <Icons.Copy width={14} height={14} />
              <span>Ekspor JSON</span>
            </button>
            <label class="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }} title="Impor persona dari file JSON">
              <Icons.ArrowUpRight width={14} height={14} />
              <span>Impor JSON</span>
              <input
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleImportFile}
              />
            </label>
            <button class="btn btn-secondary btn-sm" type="button" onClick={reload}>
              <Icons.Refresh width={14} height={14} />
              <span>Segarkan</span>
            </button>
          </div>
        }
      >
        <ErrorNote message={error || actionError} />
        {successNote && (
          <div class="banner ok" style={{ marginBottom: '1.25rem' }}>
            <Icons.CheckCircle width={16} height={16} />
            <span>{successNote}</span>
          </div>
        )}
        {loading && <Loading text="Memuat koleksi persona…" />}
        {!loading && (!data?.personas || data.personas.length === 0) && (
          <Empty title="Belum Ada Persona Tersimpan">
            Klik tombol "Tambah Persona" di atas untuk membuat kepribadian bot pertama Anda.
          </Empty>
        )}
        <div class="grid-cards">
          {data?.personas.map((persona) => {
            const isActive = data.active === persona.id;
            return (
              <article
                class={`persona ${isActive ? 'card-interactive' : ''}`}
                key={persona.id}
                style={isActive ? { borderColor: 'var(--accent)', boxShadow: '0 0 16px var(--accent-glow)' } : {}}
              >
                <header class="row-between" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{persona.name}</span>
                      {isActive && (
                        <Badge tone="ok" size="sm" icon={<Icons.Check width={10} height={10} />}>
                          Aktif
                        </Badge>
                      )}
                    </h3>
                    <code>{persona.id}</code>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      class="btn btn-secondary btn-sm"
                      type="button"
                      onClick={() => handleOpenEdit(persona)}
                      title="Edit Persona"
                    >
                      <Icons.Edit width={13} height={13} />
                      <span>Edit</span>
                    </button>
                    {!isActive ? (
                      <button
                        class="btn btn-danger btn-sm"
                        type="button"
                        onClick={() => handleDelete(persona.id)}
                        title="Hapus Persona"
                      >
                        <Icons.Trash width={13} height={13} />
                      </button>
                    ) : null}
                  </div>
                </header>

                <div>
                  <span class="small muted">Gaya Bahasa:</span>
                  <p style={{ margin: '2px 0 0', fontWeight: 600 }}>{persona.style}</p>
                </div>

                <dl class="kv kv-tight">
                  <div>
                    <dt>Bahasa</dt>
                    <dd>{persona.language.toUpperCase()}</dd>
                  </div>
                  <div>
                    <dt>Typing Delay</dt>
                    <dd>{persona.typingDelay}</dd>
                  </div>
                </dl>

                {persona.forbiddenTopics && persona.forbiddenTopics.length > 0 && (
                  <div>
                    <span class="small muted" style={{ fontWeight: 600 }}>Topik Dilarang:</span>
                    <div class="chips" style={{ marginTop: '4px' }}>
                      {persona.forbiddenTopics.map((topic) => (
                        <span class="chip" key={topic}>
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {persona.greeting && (
                  <div>
                    <span class="small muted">Sapaan Awal:</span>
                    <p class="quote small" style={{ margin: '4px 0 0' }}>
                      "{persona.greeting}"
                    </p>
                  </div>
                )}

                {persona.extraInstructions && (
                  <details style={{ marginTop: '4px' }}>
                    <summary>Instruksi Sistem Tambahan</summary>
                    <p class="small muted" style={{ margin: '6px 0 0', whiteSpace: 'pre-wrap' }}>
                      {persona.extraInstructions}
                    </p>
                  </details>
                )}

                <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
                  {!isActive ? (
                    <button
                      class="btn btn-secondary btn-sm"
                      style={{ width: '100%', justifyContent: 'center' }}
                      type="button"
                      onClick={() => handleActivate(persona.id)}
                    >
                      <Icons.Check width={14} height={14} />
                      <span>Gunakan Persona Ini</span>
                    </button>
                  ) : (
                    <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--accent)', fontWeight: 600 }}>
                      Sedang Aktif sebagai Karakter Utama
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </Card>

      {/* Modal Dialog Form */}
      {modalOpen && (
        <div class="modal-backdrop" onClick={() => !modalSubmitting && setModalOpen(false)}>
          <div class="modal-card" onClick={(e) => e.stopPropagation()}>
            <header class="modal-head">
              <h2 style={{ margin: 0, fontSize: '17px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icons.Sparkles width={16} height={16} />
                <span>{formData.isNew ? 'Tambah Persona Baru' : `Edit Persona: ${formData.name}`}</span>
              </h2>
              <button
                class="btn btn-secondary btn-sm"
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={modalSubmitting}
              >
                <Icons.X width={14} height={14} />
              </button>
            </header>

            <form onSubmit={handleSavePersona}>
              <div class="modal-body">
                <div class="form-group">
                  <label class="form-label">
                    <span>ID Persona (Slug Alfanumerik)</span>
                    <span class="form-hint">Hanya huruf, angka, strip, underscore</span>
                  </label>
                  <input
                    type="text"
                    class="input"
                    value={formData.id}
                    disabled={!formData.isNew || modalSubmitting}
                    onInput={(e) => setFormData({ ...formData, id: (e.target as HTMLInputElement).value })}
                    placeholder="misal: jutek, asisten-ramah, arka-pro"
                    required
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">
                    <span>Nama Tampilan Persona</span>
                  </label>
                  <input
                    type="text"
                    class="input"
                    value={formData.name}
                    disabled={modalSubmitting}
                    onInput={(e) => setFormData({ ...formData, name: (e.target as HTMLInputElement).value })}
                    placeholder="misal: Arka, Sarah AI, Jarvis"
                    required
                  />
                </div>

                <div class="grid grid-2">
                  <div class="form-group">
                    <label class="form-label">
                      <span>Bahasa Utama</span>
                    </label>
                    <select
                      class="input"
                      value={formData.language}
                      disabled={modalSubmitting}
                      onChange={(e) => setFormData({ ...formData, language: (e.target as HTMLSelectElement).value })}
                    >
                      <option value="id">Bahasa Indonesia (id)</option>
                      <option value="en">English (en)</option>
                      <option value="jv">Basa Jawa (jv)</option>
                      <option value="su">Basa Sunda (su)</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">
                      <span>Typing Delay WhatsApp</span>
                    </label>
                    <select
                      class="input"
                      value={formData.typingDelay}
                      disabled={modalSubmitting}
                      onChange={(e) => setFormData({ ...formData, typingDelay: (e.target as HTMLSelectElement).value as any })}
                    >
                      <option value="natural">Natural (Mengetik realistis)</option>
                      <option value="fast">Cepat (Respon instan)</option>
                      <option value="slow">Lambat (Teliti & santai)</option>
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">
                    <span>Gaya Bahasa & Tone</span>
                    <span class="form-hint">Deskripsi ringkas karakter tutur</span>
                  </label>
                  <input
                    type="text"
                    class="input"
                    value={formData.style}
                    disabled={modalSubmitting}
                    onInput={(e) => setFormData({ ...formData, style: (e.target as HTMLInputElement).value })}
                    placeholder="misal: super jutek, gaul santai, formal sopan, tsundere"
                    required
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">
                    <span>Sapaan Pembuka (Greeting)</span>
                    <span class="form-hint">Pesan singkat saat pertama kali chat</span>
                  </label>
                  <input
                    type="text"
                    class="input"
                    value={formData.greeting}
                    disabled={modalSubmitting}
                    onInput={(e) => setFormData({ ...formData, greeting: (e.target as HTMLInputElement).value })}
                    placeholder="misal: paan? / Halo, ada yang bisa dibantu?"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">
                    <span>Topik Dilarang (Forbidden Topics)</span>
                    <span class="form-hint">Pisahkan dengan koma</span>
                  </label>
                  <input
                    type="text"
                    class="input"
                    value={formData.forbiddenTopics}
                    disabled={modalSubmitting}
                    onInput={(e) => setFormData({ ...formData, forbiddenTopics: (e.target as HTMLInputElement).value })}
                    placeholder="konten dewasa, SARA, data pribadi"
                  />
                </div>

                <div class="form-group">
                  <label class="form-label">
                    <span>Instruksi Sistem Tambahan (Prompt Persona)</span>
                    <span class="form-hint">Aturan spesifik watak bot</span>
                  </label>
                  <textarea
                    class="input"
                    style={{ minHeight: '90px', resize: 'vertical' }}
                    value={formData.extraInstructions}
                    disabled={modalSubmitting}
                    onInput={(e) => setFormData({ ...formData, extraInstructions: (e.target as HTMLTextAreaElement).value })}
                    placeholder="Contoh: Selalu jawab dengan huruf kecil semua, jangan gunakan emoji, gunakan singkatan lazim WhatsApp Indonesia..."
                  />
                </div>
              </div>

              <footer class="modal-foot">
                <button
                  type="button"
                  class="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={modalSubmitting}
                >
                  Batal
                </button>
                <button type="submit" class="btn btn-primary" disabled={modalSubmitting}>
                  <Icons.Save width={14} height={14} />
                  <span>{modalSubmitting ? 'Menyimpan…' : 'Simpan Persona'}</span>
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
