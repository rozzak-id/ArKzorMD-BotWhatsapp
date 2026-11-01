import { useState } from 'preact/hooks';
import { api } from '../api';
import { Badge, Card, Empty, ErrorNote, Loading } from '../components';
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
      setSuccessNote(`Persona ${id} berhasil diaktifkan.`);
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
      title="Daftar Persona"
      action={
        <div class="row gap-sm">
          <button class="btn btn-ghost" type="button" onClick={handleExport} title="Ekspor persona ke JSON">
            Ekspor JSON
          </button>
          <label class="btn btn-ghost" style={{ cursor: 'pointer' }} title="Impor persona dari file JSON">
            Impor JSON
            <input
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
          </label>
          <button class="btn btn-ghost" type="button" onClick={reload}>
            Muat ulang
          </button>
        </div>
      }
    >
      <ErrorNote message={error || actionError} />
      {successNote && <div class="badge badge-ok" style={{ marginBottom: '1rem', padding: '0.5rem 1rem' }}>{successNote}</div>}
      {loading && <Loading />}
      {!loading && data?.personas.length === 0 && <Empty>Belum ada persona.</Empty>}
      <div class="grid grid-2">
        {data?.personas.map((persona) => (
          <article class="persona" key={persona.id}>
            <header class="row-between">
              <div>
                <h3>{persona.name}</h3>
                <code>{persona.id}</code>
              </div>
              <div>
                {data.active === persona.id ? (
                  <Badge tone="ok">Aktif</Badge>
                ) : (
                  <button
                    class="btn btn-sm btn-outline"
                    type="button"
                    onClick={() => handleActivate(persona.id)}
                  >
                    Aktifkan
                  </button>
                )}
              </div>
            </header>
            <p class="muted">{persona.style}</p>
            <dl class="kv kv-tight">
              <div>
                <dt>Bahasa</dt>
                <dd>{persona.language}</dd>
              </div>
              <div>
                <dt>Typing delay</dt>
                <dd>{persona.typingDelay}</dd>
              </div>
            </dl>
            {persona.forbiddenTopics.length > 0 && (
              <div class="chips">
                {persona.forbiddenTopics.map((topic) => (
                  <span class="chip" key={topic}>
                    {topic}
                  </span>
                ))}
              </div>
            )}
            {persona.greeting && <p class="quote">“{persona.greeting}”</p>}
          </article>
        ))}
      </div>
      <p class="muted" style={{ marginTop: '1.5rem' }}>
        Perubahan dan aktivasi persona berlaku instan tanpa perlu restart bot.
      </p>
    </Card>
  );
}
