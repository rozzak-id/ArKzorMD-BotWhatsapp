import { useState } from 'preact/hooks';
import { api } from '../api';
import { Badge, Card, Empty, ErrorNote, Icons, Loading } from '../components';
import { formatJson, formatTime, shortJid } from '../format';
import { useAsync } from '../hooks';

export function ApprovalsPage() {
  const { data, error, loading, reload } = useAsync(() => api.approvals(), []);
  const [decidingCode, setDecidingCode] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  async function handleDecision(code: string, decision: 'approve' | 'reject' | 'always') {
    setDecidingCode(code);
    setDecisionError(null);
    setDecisionNote(null);
    try {
      const response = await fetch(`/api/approvals/${encodeURIComponent(code)}/decision`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(localStorage.getItem('arkzor.admin_token')
            ? { 'x-session-token': localStorage.getItem('arkzor.admin_token')! }
            : {}),
        },
        body: JSON.stringify({ decision }),
      });
      const res = await response.json();
      if (!response.ok) {
        throw new Error(res.error ?? `Gagal memutuskan approval #${code}`);
      }
      setDecisionNote(`Approval #${code} berhasil diputuskan: ${decision.toUpperCase()}`);
      reload();
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : String(err));
    } finally {
      setDecidingCode(null);
    }
  }

  return (
    <>
      <div class="banner">
        <Icons.ShieldCheck width={18} height={18} />
        <div>
          <strong>Sistem Human-in-the-Loop L1:</strong> Setiap aksi sensitif (kick anggota, kirim pesan ke kontak luar,
          perubahan izin grup) dibekukan dalam status <code>pending</code> sampai mendapat konfirmasi dari Owner. Anda dapat
          memutuskan approval langsung dari dashboard Web UI ini atau melalui WhatsApp Owner.
        </div>
      </div>

      {decisionNote && (
        <div class="banner ok" role="status">
          <Icons.CheckCircle width={16} height={16} />
          <span>{decisionNote}</span>
        </div>
      )}

      <Card
        title="Antrean Approval Aktif"
        subtitle="Daftar permintaan izin tertunda yang menunggu keputusan"
        icon={<Icons.Key width={16} height={16} />}
        action={
          <button class="btn btn-secondary btn-sm" type="button" onClick={reload}>
            <Icons.Refresh width={14} height={14} />
            <span>Segarkan</span>
          </button>
        }
      >
        <ErrorNote message={error || decisionError} />
        {loading && <Loading text="Memuat antrean persetujuan…" />}
        {!loading && (!data?.pending || data.pending.length === 0) && (
          <Empty title="Tidak Ada Approval Menunggu">
            Semua permintaan izin L1 telah diputuskan atau belum ada aksi sensitif yang dipicu.
          </Empty>
        )}
        <div class="stack">
          {data?.pending.map((request) => (
            <article class="approval" key={request.id}>
              <header class="row-between">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <code class="code-strong" style={{ fontSize: '14px' }}>
                    #{request.shortCode}
                  </code>
                  <strong style={{ fontSize: '15px' }}>{request.toolName}</strong>
                </div>
                <Badge tone="warn" icon={<Icons.Clock width={12} height={12} />}>
                  Menunggu Keputusan
                </Badge>
              </header>

              <pre style={{ margin: '8px 0' }}>{formatJson(request.params)}</pre>

              <div class="row-between" style={{ marginTop: '8px' }}>
                <footer class="muted small">
                  Pemohon: <strong>{request.requesterRole}</strong> - <code>{shortJid(request.requesterJid)}</code> · Kedaluwarsa:{' '}
                  {formatTime(request.expiresAt)}
                </footer>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    disabled={decidingCode === request.shortCode}
                    onClick={() => handleDecision(request.shortCode, 'approve')}
                  >
                    <Icons.Check width={14} height={14} />
                    <span>Setujui</span>
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    disabled={decidingCode === request.shortCode}
                    onClick={() => handleDecision(request.shortCode, 'reject')}
                  >
                    <Icons.X width={14} height={14} />
                    <span>Tolak</span>
                  </button>
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm"
                    disabled={decidingCode === request.shortCode}
                    onClick={() => handleDecision(request.shortCode, 'always')}
                    title="Setujui dan simpan aturan agar tidak ditanya lagi untuk target ini"
                  >
                    <span>Setuju Selalu</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Card>

      <Card
        title="Daftar Aturan Tetap - Setuju Selalu"
        subtitle="Aturan otomatisasi yang dibuat saat Owner memilih 'Setuju Selalu'"
        icon={<Icons.ShieldCheck width={16} height={16} />}
      >
        {data && (!data.rules || data.rules.length === 0) && (
          <Empty title="Belum Ada Aturan Tetap">
            Aturan akan otomatis dicatat ketika Owner memilih opsi "Setuju Selalu" pada suatu tool dan target tertentu.
          </Empty>
        )}
        {data && data.rules && data.rules.length > 0 && (
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nama Tool</th>
                  <th>Target JID</th>
                  <th>Berlaku Sampai</th>
                  <th>Waktu Dibuat</th>
                </tr>
              </thead>
              <tbody>
                {data.rules.map((rule) => (
                  <tr key={rule.id}>
                    <td>
                      <code style={{ fontWeight: 600 }}>{rule.toolName}</code>
                    </td>
                    <td>{rule.target ? <code>{rule.target}</code> : <span class="muted">Semua Target</span>}</td>
                    <td>{rule.expiresAt ? formatTime(rule.expiresAt) : <Badge tone="ok" size="sm">Tanpa Batas</Badge>}</td>
                    <td class="muted">{formatTime(rule.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
