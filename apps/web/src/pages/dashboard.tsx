import { useState } from 'preact/hooks';
import { api } from '../api';
import { Badge, Card, Empty, ErrorNote, HeroBanner, Icons, MetricCard, StatusPill } from '../components';
import { formatTime, formatUptime, shortJid } from '../format';
import { useAsync } from '../hooks';
import type { StatusResponse } from '../types';

export function DashboardPage({ status }: { status: StatusResponse | null }) {
  const approvals = useAsync(() => api.approvals(), [status?.counts.pendingApprovals]);
  const audit = useAsync(() => api.audit(6), [status?.counts.messagesToday]);
  const [decidingCode, setDecidingCode] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  async function handleQuickDecision(code: string, decision: 'approve' | 'reject') {
    setDecidingCode(code);
    setDecisionError(null);
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
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? `Gagal memutuskan approval ${code}`);
      }
      approvals.reload();
    } catch (err) {
      setDecisionError(err instanceof Error ? err.message : String(err));
    } finally {
      setDecidingCode(null);
    }
  }

  const isConnected = status?.connection.status === 'connected';

  return (
    <>
      {/* 1. System Alerts & Warnings */}
      {!status?.ownerConfigured && (
        <div class="banner warn" role="alert">
          <Icons.AlertTriangle width={18} height={18} />
          <div>
            <strong>Owner Belum Ditetapkan:</strong> Isi <code>OWNER_JID</code> di <code>.env</code> atau
            selesaikan wizard setup agar persetujuan sensitif L1 dapat diteruskan ke WhatsApp Anda.
          </div>
        </div>
      )}

      {status?.connection.mode === 'mock' && (
        <div class="banner" role="status">
          <Icons.Robot width={18} height={18} />
          <div>
            <strong>Mode Mock Aktif:</strong> Pesan disimulasikan untuk pengujian lokal. Gunakan{' '}
            <code>POST /api/dev/inbound</code> untuk menguji agen AI dan pipeline routing.
          </div>
        </div>
      )}

      {status?.killSwitch && (
        <div class="banner danger" role="alert">
          <Icons.AlertCircle width={18} height={18} />
          <div>
            <strong>Kill Switch Aktif:</strong> Semua eksekusi tools L1 diblokir darurat. Jalankan{' '}
            <code>.stop off</code> dari nomor Owner atau matikan di menu Pengaturan.
          </div>
        </div>
      )}

      {/* 2. Hero Banner: Command Center Lead */}
      <HeroBanner
        badge={
          <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
            <Badge tone="accent" size="sm" icon={<Icons.Sparkles width={12} height={12} />}>
              v{status?.version ?? '0.3.0'}
            </Badge>
            <StatusPill status={status?.connection.status ?? null} />
          </div>
        }
        title="ArKzorMD Autonomous Console"
        description="Bot AI WhatsApp dengan penalaran LLM multimodal, pengawasan izin human-in-the-loop, memori jangka panjang, dan proteksi anti-AI watermarks."
        actions={
          <>
            <a href="#/connection" class="btn btn-primary btn-sm">
              <Icons.WhatsApp width={15} height={15} />
              <span>{isConnected ? 'Kelola Sesi' : 'Tautkan WhatsApp'}</span>
            </a>
            <a href="#/approvals" class="btn btn-secondary btn-sm">
              <Icons.ShieldCheck width={15} height={15} />
              <span>Persetujuan ({status?.counts.pendingApprovals ?? 0})</span>
            </a>
            <a href="#/personas" class="btn btn-secondary btn-sm">
              <Icons.Sparkles width={15} height={15} />
              <span>Ganti Persona</span>
            </a>
          </>
        }
      >
        <div class="row-between" style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span>
              Uptime Server: <strong>{status ? formatUptime(status.uptimeSec) : '—'}</strong>
            </span>
            <span>
              AI Provider: <strong>{status?.ai.provider ?? '—'}</strong> ({status?.ai.model ?? '—'})
            </span>
            <span>
              Prefix: <code>{status?.prefix ?? '.'}</code>
            </span>
          </div>
          <div>
            Status Keamanan:{' '}
            <strong style={{ color: status?.killSwitch ? 'var(--danger)' : 'var(--ok)' }}>
              {status?.killSwitch ? 'Dibekukan (Kill Switch)' : 'Normal Operasional'}
            </strong>
          </div>
        </div>
      </HeroBanner>

      {/* 3. Primary Telemetry Metric Band */}
      <div class="grid grid-4">
        <MetricCard
          title="Pesan Hari Ini"
          icon={<Icons.Activity width={16} height={16} />}
          value={status?.counts.messagesToday ?? 0}
          trend="+ Aktif"
          trendTone="ok"
          subtitle={`Diproses dari ${status?.counts.users ?? 0} pengguna terdaftar`}
          action={
            <a class="link small" href="#/users">
              <span>Daftar Pengguna</span>
              <Icons.ChevronRight width={12} height={12} />
            </a>
          }
        />

        <MetricCard
          title="Persetujuan Menunggu"
          icon={<Icons.ShieldCheck width={16} height={16} />}
          value={status?.counts.pendingApprovals ?? 0}
          trend={status?.counts.pendingApprovals ? 'Perlu Respon' : 'Aman'}
          trendTone={status?.counts.pendingApprovals ? 'warn' : 'ok'}
          subtitle="Aksi tools L1 membutuhkan otorisasi Owner"
          action={
            <a class="link small" href="#/approvals">
              <span>Review Izin</span>
              <Icons.ChevronRight width={12} height={12} />
            </a>
          }
        />

        <MetricCard
          title="AI Model Engine"
          icon={<Icons.Cpu width={16} height={16} />}
          value={status?.ai.provider?.toUpperCase() ?? 'MOCK'}
          trend={status?.ai.model ? status.ai.model.split('-')[0] : 'Standar'}
          trendTone="accent"
          subtitle={`Timeout: ${((status?.ai.timeoutMs ?? 30000) / 1000).toFixed(0)}s · Fallback: ${
            status?.ai.fallbackModel ?? 'none'
          }`}
          action={
            <a class="link small" href="#/settings">
              <span>Konfigurasi AI</span>
              <Icons.ChevronRight width={12} height={12} />
            </a>
          }
        />

        <MetricCard
          title="Koneksi WhatsApp"
          icon={<Icons.WhatsApp width={16} height={16} />}
          value={
            status?.connection.status === 'connected'
              ? 'Terhubung'
              : status?.connection.status === 'connecting'
                ? 'Menyambung'
                : 'Offline'
          }
          trend={status?.connection.mode ?? 'live'}
          trendTone={status?.connection.status === 'connected' ? 'ok' : 'neutral'}
          subtitle={`Transport: ${status?.connection.module ?? 'onigis'} (${status?.connection.runtime ?? 'linux'})`}
          action={
            <a class="link small" href="#/connection">
              <span>Pairing & QR</span>
              <Icons.ChevronRight width={12} height={12} />
            </a>
          }
        />
      </div>

      {/* 4. Interactive Console Split Band */}
      <div class="grid grid-2">
        {/* Left: Pending Approvals with Quick Actions */}
        <Card
          title="Antrean Persetujuan L1"
          subtitle="Permintaan sensitif yang memerlukan keputusan Owner"
          icon={<Icons.Key width={16} height={16} />}
          action={
            <a class="link small" href="#/approvals">
              <span>Semua Approval</span>
              <Icons.ArrowUpRight width={14} height={14} />
            </a>
          }
        >
          <ErrorNote message={approvals.error || decisionError} />
          {approvals.loading && <p class="muted small">Memuat antrean persetujuan…</p>}

          {!approvals.loading && (!approvals.data?.pending || approvals.data.pending.length === 0) && (
            <Empty title="Tidak Ada Approval Tertunda">
              Semua aksi bot berjalan sesuai batas izin otomatis. Tidak ada request tertahan.
            </Empty>
          )}

          <ul class="list">
            {approvals.data?.pending.slice(0, 4).map((request) => (
              <li key={request.id} class="list-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <code style={{ fontWeight: 700, color: 'var(--accent)' }}>#{request.shortCode}</code>
                    <strong style={{ fontSize: '14px' }}>{request.toolName}</strong>
                    <Badge tone="warn" size="sm">
                      {request.requesterRole}
                    </Badge>
                  </div>
                  <p class="muted small" style={{ marginTop: '4px' }}>
                    Pemohon: <code>{shortJid(request.requesterJid)}</code>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button
                    type="button"
                    class="btn btn-primary btn-sm"
                    disabled={decidingCode === request.shortCode}
                    onClick={() => handleQuickDecision(request.shortCode, 'approve')}
                    title="Setujui aksi ini"
                  >
                    <Icons.Check width={14} height={14} />
                    <span>Setuju</span>
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    disabled={decidingCode === request.shortCode}
                    onClick={() => handleQuickDecision(request.shortCode, 'reject')}
                    title="Tolak aksi ini"
                  >
                    <Icons.X width={14} height={14} />
                    <span>Tolak</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {/* Right: Live Audit Log */}
        <Card
          title="Aktivitas Sistem & Audit"
          subtitle="Jejak audit eksekusi tools dan perubahan sistem"
          icon={<Icons.Clock width={16} height={16} />}
          action={
            <a class="link small" href="#/audit">
              <span>Buka Audit Log</span>
              <Icons.ArrowUpRight width={14} height={14} />
            </a>
          }
        >
          <ErrorNote message={audit.error} />
          {audit.loading && <p class="muted small">Memuat log aktivitas…</p>}

          {!audit.loading && (!audit.data?.entries || audit.data.entries.length === 0) && (
            <Empty title="Belum Ada Aktivitas">
              Belum ada interaksi pengguna atau eksekusi tools yang dicatat di database.
            </Empty>
          )}

          <ul class="list">
            {audit.data?.entries.slice(0, 5).map((entry) => (
              <li key={entry.id} class="list-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <code style={{ fontSize: '12px' }}>{entry.action}</code>
                  </div>
                  <p class="muted small" style={{ marginTop: '2px' }}>
                    Aktor: {entry.actorJid ? shortJid(entry.actorJid) : 'Sistem'}
                  </p>
                </div>
                <span class="muted small" style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {formatTime(entry.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* 5. System Architecture & Health Details */}
      <Card
        title="Ringkasan Spesifikasi Lingkungan"
        subtitle="Konfigurasi core runtime, database SQLite, dan platform engine"
        icon={<Icons.Settings width={16} height={16} />}
      >
        <dl class="kv">
          <div>
            <dt>Versi Rilis</dt>
            <dd>v{status?.version ?? '0.3.0'}</dd>
          </div>
          <div>
            <dt>Environment</dt>
            <dd>
              <Badge tone={status?.nodeEnv === 'production' ? 'ok' : 'info'} size="sm">
                {status?.nodeEnv ?? 'development'}
              </Badge>
            </dd>
          </div>
          <div>
            <dt>Prefix Command</dt>
            <dd>
              <code>{status?.prefix ?? '.'}</code> (contoh: <code>.menu</code>, <code>.clean</code>)
            </dd>
          </div>
          <div>
            <dt>Owner JID</dt>
            <dd>
              {status?.ownerConfigured ? (
                <span style={{ color: 'var(--ok)', fontWeight: 600 }}>Terkonfigurasi</span>
              ) : (
                <span style={{ color: 'var(--warn)', fontWeight: 600 }}>Belum Disetup</span>
              )}
            </dd>
          </div>
        </dl>
      </Card>
    </>
  );
}
