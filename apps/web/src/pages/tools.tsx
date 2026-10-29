import { api } from '../api';
import { Badge, Card, Empty, ErrorNote, Loading, type Tone } from '../components';
import { useAsync } from '../hooks';
import type { RiskLevel } from '../types';

const RISK_TONE: Record<RiskLevel, Tone> = {
  L0: 'ok',
  L1: 'warn',
  L2: 'danger',
};

const RISK_LABEL: Record<RiskLevel, string> = {
  L0: 'L0 · bebas',
  L1: 'L1 · approval',
  L2: 'L2 · Web UI saja',
};

export function ToolsPage() {
  const { data, error, loading, reload } = useAsync(() => api.tools(), []);

  return (
    <>
      {data?.killSwitch && (
        <div class="banner danger">
          Kill switch aktif — seluruh tool L1 diblokir sampai Owner menonaktifkannya.
        </div>
      )}
      <Card
        title="Tool registry"
        action={
          <button class="btn btn-ghost" type="button" onClick={reload}>
            Muat ulang
          </button>
        }
      >
        <ErrorNote message={error} />
        {loading && <Loading />}
        {!loading && data?.tools.length === 0 && <Empty>Belum ada tool terdaftar.</Empty>}
        {data && data.tools.length > 0 && (
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tool</th>
                  <th>Risiko</th>
                  <th>Role</th>
                  <th>Deskripsi</th>
                </tr>
              </thead>
              <tbody>
                {data.tools.map((tool) => (
                  <tr key={tool.name}>
                    <td>
                      <code>{tool.name}</code>
                    </td>
                    <td>
                      <Badge tone={RISK_TONE[tool.risk]}>{RISK_LABEL[tool.risk]}</Badge>
                    </td>
                    <td>{tool.allowedRoles.join(', ')}</td>
                    <td>{tool.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p class="muted">
          Permission Engine memutuskan berdasarkan role dan level risiko. AI tidak dapat
          mengubah matriks ini.
        </p>
      </Card>
    </>
  );
}
