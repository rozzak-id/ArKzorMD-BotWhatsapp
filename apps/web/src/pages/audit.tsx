import { api } from '../api';
import { Card, Empty, ErrorNote, Icons, Loading } from '../components';
import { formatJson, formatTime, shortJid } from '../format';
import { useAsync } from '../hooks';

export function AuditPage() {
  const { data, error, loading, reload } = useAsync(() => api.audit(100), []);

  const handleExportCsv = () => {
    window.open('/api/audit/export?format=csv&limit=1000', '_blank');
  };

  const handleExportJson = () => {
    window.open('/api/audit/export?format=json&limit=1000', '_blank');
  };

  return (
    <Card
      title="Audit Log & Rekam Jejak Sistem"
      subtitle="Catatan eksekusi tools, keputusan otorisasi, dan mutasi pengaturan bot"
      icon={<Icons.Clock width={16} height={16} />}
      action={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button class="btn btn-secondary btn-sm" type="button" onClick={handleExportCsv} title="Unduh CSV log">
            <Icons.Copy width={14} height={14} />
            <span>Ekspor CSV</span>
          </button>
          <button class="btn btn-secondary btn-sm" type="button" onClick={handleExportJson} title="Unduh JSON log">
            <Icons.ArrowUpRight width={14} height={14} />
            <span>Ekspor JSON</span>
          </button>
          <button class="btn btn-secondary btn-sm" type="button" onClick={reload}>
            <Icons.Refresh width={14} height={14} />
            <span>Segarkan</span>
          </button>
        </div>
      }
    >
      <ErrorNote message={error} />
      {loading && <Loading text="Memuat riwayat audit log…" />}
      {!loading && (!data?.entries || data.entries.length === 0) && (
        <Empty title="Belum Ada Rekam Jejak Audit">
          Belum ada aktivitas tercatat di tabel audit database.
        </Empty>
      )}
      {data && data.entries && data.entries.length > 0 && (
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Waktu Eksekusi</th>
                <th>Aktor / Pemohon</th>
                <th>Aksi / Peristiwa</th>
                <th>Parameter Detail</th>
              </tr>
            </thead>
            <tbody>
              {data.entries.map((entry) => (
                <tr key={entry.id}>
                  <td class="muted" style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                    {formatTime(entry.createdAt)}
                  </td>
                  <td>
                    {entry.actorJid ? (
                      <code title={entry.actorJid}>{shortJid(entry.actorJid)}</code>
                    ) : (
                      <span class="muted">sistem</span>
                    )}
                  </td>
                  <td>
                    <strong style={{ color: 'var(--text)' }}>{entry.action}</strong>
                  </td>
                  <td>
                    <details>
                      <summary>Lihat Payload JSON</summary>
                      <pre class="pre-tight">{formatJson(entry.params)}</pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p class="muted small" style={{ marginTop: '1.25rem' }}>
        * Kunci API, token, dan data rahasia otomatis disaring (redacted) oleh Audit Engine sebelum disimpan di SQLite.
      </p>
    </Card>
  );
}
