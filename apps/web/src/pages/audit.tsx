import { api } from '../api';
import { Card, Empty, ErrorNote, Loading } from '../components';
import { formatJson, formatTime, shortJid } from '../format';
import { useAsync } from '../hooks';

export function AuditPage() {
  const { data, error, loading, reload } = useAsync(() => api.audit(100), []);

  return (
    <Card
      title="Audit log"
      action={
        <button class="btn btn-ghost" type="button" onClick={reload}>
          Muat ulang
        </button>
      }
    >
      <ErrorNote message={error} />
      {loading && <Loading />}
      {!loading && data?.entries.length === 0 && <Empty>Belum ada entri audit.</Empty>}
      {data && data.entries.length > 0 && (
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Aktor</th>
                <th>Aksi</th>
                <th>Parameter</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((entry) => (
                <tr key={entry.id}>
                  <td class="muted">{formatTime(entry.createdAt)}</td>
                  <td>
                    {entry.actorJid ? (
                      <code title={entry.actorJid}>{shortJid(entry.actorJid)}</code>
                    ) : (
                      'sistem'
                    )}
                  </td>
                  <td>
                    <strong>{entry.action}</strong>
                  </td>
                  <td>
                    <details>
                      <summary>lihat</summary>
                      <pre class="pre-tight">{formatJson(entry.params)}</pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p class="muted">
        Rahasia disaring sebelum masuk audit. Ekspor dan retensi log menyusul di P1.
      </p>
    </Card>
  );
}
