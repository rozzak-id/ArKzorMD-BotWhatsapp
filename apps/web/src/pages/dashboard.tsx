import { api } from '../api';
import { Badge, Card, Empty, ErrorNote } from '../components';
import { formatTime, formatUptime, shortJid } from '../format';
import { useAsync } from '../hooks';
import type { StatusResponse } from '../types';

export function DashboardPage({ status }: { status: StatusResponse | null }) {
  const approvals = useAsync(() => api.approvals(), [status?.counts.pendingApprovals]);
  const audit = useAsync(() => api.audit(6), [status?.counts.messagesToday]);

  return (
    <>
      {!status?.ownerConfigured && (
        <div class="banner warn">
          Owner belum ditetapkan. Isi <code>OWNER_JID</code> di <code>.env</code> agar alur
          persetujuan berjalan penuh.
        </div>
      )}
      {status?.connection.mode === 'mock' && (
        <div class="banner">
          Mode <strong>mock</strong> aktif — pesan WhatsApp disimulasikan. Gunakan{' '}
          <code>POST /api/dev/inbound</code> untuk menguji pipeline.
        </div>
      )}
      {status?.killSwitch && (
        <div class="banner danger">
          Kill switch aktif. Semua aksi L1 diblokir sampai Owner menjalankan <code>.stop off</code>.
        </div>
      )}

      <div class="grid grid-4">
        <Card title="Koneksi WhatsApp">
          <p class="metric">{status?.connection.status ?? '—'}</p>
          <p class="muted">
            Mode: {status?.connection.mode ?? '—'} · transport OnigiBaileys
          </p>
        </Card>
        <Card title="AI Provider">
          <p class="metric">{status?.ai.provider ?? '—'}</p>
          <p class="muted">Model: {status?.ai.model ?? '—'}</p>
        </Card>
        <Card title="Approval menunggu">
          <p class="metric">{status?.counts.pendingApprovals ?? 0}</p>
          <p class="muted">Aksi L1 tidak berjalan tanpa keputusan Owner.</p>
        </Card>
        <Card title="Aktivitas">
          <p class="metric">{status?.counts.messagesToday ?? 0}</p>
          <p class="muted">
            Pesan hari ini · {status?.counts.users ?? 0} pengguna · uptime{' '}
            {status ? formatUptime(status.uptimeSec) : '—'}
          </p>
        </Card>
      </div>

      <div class="grid grid-2">
        <Card
          title="Antrean persetujuan"
          action={<a class="link" href="#/approvals">Lihat semua</a>}
        >
          <ErrorNote message={approvals.error} />
          {approvals.loading && <p class="muted">Memuat…</p>}
          {!approvals.loading && approvals.data?.pending.length === 0 && (
            <Empty>Tidak ada aksi yang menunggu persetujuan.</Empty>
          )}
          <ul class="list">
            {approvals.data?.pending.slice(0, 3).map((request) => (
              <li key={request.id} class="list-row">
                <div>
                  <code>{request.shortCode}</code> <strong>{request.toolName}</strong>
                  <p class="muted">
                    {request.requesterRole} · {shortJid(request.requesterJid)}
                  </p>
                </div>
                <Badge tone="warn">pending</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Aktivitas terbaru" action={<a class="link" href="#/audit">Audit log</a>}>
          <ErrorNote message={audit.error} />
          {audit.loading && <p class="muted">Memuat…</p>}
          {!audit.loading && audit.data?.entries.length === 0 && (
            <Empty>Belum ada aktivitas tercatat.</Empty>
          )}
          <ul class="list">
            {audit.data?.entries.slice(0, 6).map((entry) => (
              <li key={entry.id} class="list-row">
                <div>
                  <strong>{entry.action}</strong>
                  <p class="muted">
                    {entry.actorJid ? shortJid(entry.actorJid) : 'sistem'} ·{' '}
                    {formatTime(entry.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card title="Status sistem">
        <dl class="kv">
          <div>
            <dt>Versi</dt>
            <dd>{status?.version ?? '—'}</dd>
          </div>
          <div>
            <dt>Environment</dt>
            <dd>{status?.nodeEnv ?? '—'}</dd>
          </div>
          <div>
            <dt>Prefix command</dt>
            <dd>
              <code>{status?.prefix ?? '.'}</code>
            </dd>
          </div>
          <div>
            <dt>Kill switch</dt>
            <dd>{status?.killSwitch ? 'Aktif' : 'Nonaktif'}</dd>
          </div>
        </dl>
      </Card>
    </>
  );
}
