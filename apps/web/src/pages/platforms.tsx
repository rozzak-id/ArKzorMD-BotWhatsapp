import { api } from '../api';
import { Badge, Card, ErrorNote, Icons, Loading, type Tone } from '../components';
import { useAsync } from '../hooks';
import type { PlatformCard } from '../types';

const STATE_TONE: Record<PlatformCard['state'], Tone> = {
  active: 'ok',
  inactive: 'neutral',
  coming_soon: 'warn',
};

const STATE_LABEL: Record<PlatformCard['state'], string> = {
  active: 'Aktif',
  inactive: 'Nonaktif',
  coming_soon: 'Segera Hadir',
};

export function PlatformsPage() {
  const { data, error, loading, reload } = useAsync(() => api.platforms(), []);

  return (
    <>
      <Card
        title="Daftar Platform Adapter"
        subtitle="Arsitektur adapter multi-platform ArKzorMD netral protokol"
        icon={<Icons.Robot width={16} height={16} />}
        action={
          <button class="btn btn-secondary btn-sm" type="button" onClick={reload}>
            <Icons.Refresh width={14} height={14} />
            <span>Segarkan</span>
          </button>
        }
      >
        <ErrorNote message={error} />
        {loading && <Loading text="Memuat status platform adapter…" />}
        <div class="grid grid-3">
          {data?.platforms.map((platform) => (
            <article
              class={`platform ${platform.enabled ? '' : 'platform-disabled'}`}
              key={platform.id}
            >
              <header class="row-between">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {platform.id === 'whatsapp' ? (
                    <Icons.WhatsApp width={18} height={18} style={{ color: 'var(--accent)' }} />
                  ) : (
                    <Icons.Robot width={18} height={18} />
                  )}
                  <span>{platform.name}</span>
                </h3>
                <Badge tone={STATE_TONE[platform.state]} size="sm">
                  {STATE_LABEL[platform.state]}
                </Badge>
              </header>
              <p class="muted small" style={{ margin: '4px 0' }}>
                {platform.id === 'whatsapp'
                  ? `Status Koneksi: ${platform.connection}`
                  : 'Adapter stub modular telah disiapkan untuk integrasi.'}
              </p>
              {platform.transport && (
                <p class="small" style={{ margin: '4px 0' }}>
                  Transport: <code>{platform.transport}</code>
                </p>
              )}
              {platform.note && <p class="muted small" style={{ margin: '4px 0' }}>{platform.note}</p>}
              <div style={{ marginTop: 'auto', paddingTop: '8px' }}>
                {platform.enabled ? (
                  <a href="#/connection" class="btn btn-primary btn-sm" style={{ width: '100%' }}>
                    <span>Buka Koneksi</span>
                    <Icons.ChevronRight width={12} height={12} />
                  </a>
                ) : (
                  <button class="btn btn-secondary btn-sm" style={{ width: '100%' }} disabled>
                    Segera Hadir
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </Card>

      <Card
        title="Arsitektur Multi-Platform Terpadu"
        subtitle="Satu otak AI untuk melayani beragam platform chat tanpa fragmentasi logika"
        icon={<Icons.ShieldCheck width={16} height={16} />}
      >
        <p class="muted small" style={{ margin: 0, lineHeight: 1.6 }}>
          ArKzorMD mengisolasi logika pemrosesan AI di package <code>@arkzormd/core</code> secara netral platform.
          WhatsApp beroperasi penuh via <code>onigis</code> E2EE; Telegram dan Discord dapat dihubungkan ke bus pesan yang sama
          tanpa mengubah logika persona, memori, atau persetujuan Owner.
        </p>
      </Card>
    </>
  );
}
