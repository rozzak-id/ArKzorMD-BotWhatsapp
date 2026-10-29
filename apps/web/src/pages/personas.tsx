import { api } from '../api';
import { Badge, Card, Empty, ErrorNote, Loading } from '../components';
import { useAsync } from '../hooks';

export function PersonasPage() {
  const { data, error, loading, reload } = useAsync(() => api.personas(), []);

  return (
    <Card
      title="Daftar persona"
      action={
        <button class="btn btn-ghost" type="button" onClick={reload}>
          Muat ulang
        </button>
      }
    >
      <ErrorNote message={error} />
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
              {data.active === persona.id ? (
                <Badge tone="ok">Aktif</Badge>
              ) : (
                <Badge>Nonaktif</Badge>
              )}
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
      <p class="muted">
        Editor persona dan pratinjau obrolan menyusul di M3. Perubahan persona akan berlaku
        tanpa restart.
      </p>
    </Card>
  );
}
