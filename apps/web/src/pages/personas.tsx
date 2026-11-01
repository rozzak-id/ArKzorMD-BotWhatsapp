import { useState } from 'preact/hooks';
import { api } from '../api';
import { Badge, Card, Empty, ErrorNote, Icons, Loading } from '../components';
import { useAsync } from '../hooks';

export function PersonasPage() {
  const { data, error, loading, reload } = useAsync(() => api.personas(), []);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  const handleActivate = async (id: string) => {
    setActionError(null);
    setSuccessNote(null);
    try {
      await api.activatePersona(id);
      setSuccessNote(`Persona "${id}" berhasil diaktifkan sebagai karakter default bot.`);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
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
    <Card
      title="Koleksi Persona Karakter AI"
      subtitle="Karakter, gaya bahasa, greeting, dan aturan topik percakapan bot"
      icon={<Icons.Sparkles width={16} height={16} />}
      action={
        <div style={{ display: 'flex', gap: '8px' }}>
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
          Gunakan tombol Impor JSON atau buat persona baru di server.
        </Empty>
      )}
      <div class="grid grid-2">
        {data?.personas.map((persona) => {
          const isActive = data.active === persona.id;
          return (
            <article
              class={`persona ${isActive ? 'card-interactive' : ''}`}
              key={persona.id}
              style={isActive ? { borderColor: 'var(--accent)', boxShadow: '0 0 16px var(--accent-glow)' } : {}}
            >
              <header class="row-between">
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
                <div>
                  {!isActive && (
                    <button
                      class="btn btn-primary btn-sm"
                      type="button"
                      onClick={() => handleActivate(persona.id)}
                    >
                      Pilih Persona
                    </button>
                  )}
                </div>
              </header>

              <p class="muted small" style={{ margin: '4px 0' }}>
                Gaya: <strong>{persona.style}</strong>
              </p>

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

              {persona.forbiddenTopics.length > 0 && (
                <div>
                  <p class="small muted" style={{ margin: '4px 0 2px', fontWeight: 600 }}>Topik Dilarang:</p>
                  <div class="chips">
                    {persona.forbiddenTopics.map((topic) => (
                      <span class="chip" key={topic}>
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {persona.greeting && (
                <p class="quote small" style={{ margin: '4px 0 0' }}>
                  “{persona.greeting}”
                </p>
              )}
            </article>
          );
        })}
      </div>
      <p class="muted small" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
        Perubahan dan aktivasi persona berlaku instan tanpa perlu restart proses server.
      </p>
    </Card>
  );
}
