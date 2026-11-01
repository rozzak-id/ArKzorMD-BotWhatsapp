import { useState } from 'preact/hooks';
import { api } from '../api';
import { Badge, Card, Empty, ErrorNote, Icons, Loading, type Tone } from '../components';
import { useAsync } from '../hooks';
import type { RiskLevel } from '../types';

const RISK_TONE: Record<RiskLevel, Tone> = {
  L0: 'ok',
  L1: 'warn',
  L2: 'danger',
};

const RISK_LABEL: Record<RiskLevel, string> = {
  L0: 'L0 · Bebas (Auto)',
  L1: 'L1 · Butuh Approval',
  L2: 'L2 · Khusus Owner / Admin',
};

export function ToolsPage() {
  const { data, error, loading, reload } = useAsync(() => api.tools(), []);
  const [toggling, setToggling] = useState(false);
  const [toggleNote, setToggleNote] = useState<string | null>(null);

  const handleToggleKillSwitch = async () => {
    const nextState = !data?.killSwitch;
    const confirmMsg = nextState
      ? 'Aktifkan Kill Switch darurat? Seluruh aksi tools L1 akan diblokir seketika.'
      : 'Matikan Kill Switch? Bot akan kembali mengeksekusi tools dengan izin normal.';
    if (!confirm(confirmMsg)) return;

    setToggling(true);
    setToggleNote(null);
    try {
      await api.toggleKillSwitch(nextState);
      setToggleNote(`Kill switch berhasil ${nextState ? 'diaktifkan' : 'dinonaktifkan'}.`);
      await reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setToggling(false);
    }
  };

  return (
    <>
      {data?.killSwitch && (
        <div class="banner danger" role="alert">
          <Icons.AlertCircle width={18} height={18} />
          <div>
            <strong>Kill Switch Aktif:</strong> Seluruh eksekusi tool beresiko L1 diblokir darurat. AI hanya
            dapat membalas pesan teks tanpa mengeksekusi tool sensitif.
          </div>
        </div>
      )}

      {toggleNote && (
        <div class="banner ok" role="status">
          <Icons.CheckCircle width={16} height={16} />
          <span>{toggleNote}</span>
        </div>
      )}

      <Card
        title="Matriks Izin Tool AI (Permission Engine)"
        subtitle="Daftar kapabilitas alat, tingkat resiko, dan pembatasan peran aktor"
        icon={<Icons.Tools width={16} height={16} />}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              class={`btn btn-sm ${data?.killSwitch ? 'btn-primary' : 'btn-danger'}`}
              type="button"
              onClick={handleToggleKillSwitch}
              disabled={toggling || loading}
            >
              <Icons.AlertTriangle width={14} height={14} />
              <span>{data?.killSwitch ? 'Matikan Kill Switch' : 'Aktifkan Kill Switch'}</span>
            </button>
            <button class="btn btn-secondary btn-sm" type="button" onClick={reload}>
              <Icons.Refresh width={14} height={14} />
              <span>Segarkan</span>
            </button>
          </div>
        }
      >
        <ErrorNote message={error} />
        {loading && <Loading text="Memuat registry tool…" />}
        {!loading && (!data?.tools || data.tools.length === 0) && (
          <Empty title="Belum Ada Tool Terdaftar">
            Daftar tool kosong atau modul plugin belum terpasang.
          </Empty>
        )}
        {data && data.tools && data.tools.length > 0 && (
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nama Tool</th>
                  <th>Level Risiko</th>
                  <th>Role Izin</th>
                  <th>Fungsi & Deskripsi</th>
                </tr>
              </thead>
              <tbody>
                {data.tools.map((tool) => (
                  <tr key={tool.name}>
                    <td>
                      <code style={{ fontWeight: 600, color: 'var(--accent)' }}>{tool.name}</code>
                    </td>
                    <td>
                      <Badge tone={RISK_TONE[tool.risk]} size="sm">
                        {RISK_LABEL[tool.risk]}
                      </Badge>
                    </td>
                    <td>
                      <div class="chips">
                        {tool.allowedRoles.map((r) => (
                          <span class="chip" key={r}>
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{tool.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p class="muted small" style={{ marginTop: '1rem' }}>
          * Permission Engine memvalidasi setiap tool call di core runtime. Model AI tidak memiliki akses
          untuk mengubah matriks peran atau melewati persetujuan L1.
        </p>
      </Card>
    </>
  );
}
