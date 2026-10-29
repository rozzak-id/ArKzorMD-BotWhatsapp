import { api } from '../api';
import { Badge, Card, Empty, ErrorNote, Loading } from '../components';
import { formatJson, formatTime, shortJid } from '../format';
import { useAsync } from '../hooks';

export function ApprovalsPage() {
  const { data, error, loading, reload } = useAsync(() => api.approvals(), []);

  return (
    <>
      <div class="banner">
        Keputusan approval dilakukan Owner lewat WhatsApp (tombol atau balasan teks). Web UI
        menampilkan antrean; aksi setuju/tolak dari sini memakai endpoint ber-token dan akan
        dirapikan bersama login di M3.
      </div>

      <Card
        title="Antrean aktif"
        action={
          <button class="btn btn-ghost" type="button" onClick={reload}>
            Muat ulang
          </button>
        }
      >
        <ErrorNote message={error} />
        {loading && <Loading />}
        {!loading && data?.pending.length === 0 && (
          <Empty>Tidak ada aksi yang menunggu persetujuan.</Empty>
        )}
        <div class="stack">
          {data?.pending.map((request) => (
            <article class="approval" key={request.id}>
              <header class="row-between">
                <div>
                  <code class="code-strong">{request.shortCode}</code>{' '}
                  <strong>{request.toolName}</strong>
                </div>
                <Badge tone="warn">menunggu</Badge>
              </header>
              <pre>{formatJson(request.params)}</pre>
              <footer class="muted">
                Dari {request.requesterRole} · {shortJid(request.requesterJid)} · kedaluwarsa{' '}
                {formatTime(request.expiresAt)}
              </footer>
            </article>
          ))}
        </div>
      </Card>

      <Card title="Aturan “setuju selalu”">
        {data && data.rules.length === 0 && (
          <Empty>Belum ada aturan tersimpan. Aturan dibuat saat Owner memilih “Setuju selalu”.</Empty>
        )}
        {data && data.rules.length > 0 && (
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tool</th>
                  <th>Target</th>
                  <th>Berlaku sampai</th>
                  <th>Dibuat</th>
                </tr>
              </thead>
              <tbody>
                {data.rules.map((rule) => (
                  <tr key={rule.id}>
                    <td>
                      <code>{rule.toolName}</code>
                    </td>
                    <td>{rule.target ?? 'semua target'}</td>
                    <td>{rule.expiresAt ? formatTime(rule.expiresAt) : 'tanpa batas'}</td>
                    <td class="muted">{formatTime(rule.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p class="muted">Pencabutan aturan lewat Web UI menyusul di M3.</p>
      </Card>
    </>
  );
}
