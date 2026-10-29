import { api } from '../api';
import { Badge, Card, ErrorNote, Loading, type Tone } from '../components';
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
  coming_soon: 'Coming Soon',
};

export function PlatformsPage() {
  const { data, error, loading, reload } = useAsync(() => api.platforms(), []);

  return (
    <>
      <Card
        title="Platform"
        action={
          <button class="btn btn-ghost" type="button" onClick={reload}>
            Muat ulang
          </button>
        }
      >
        <ErrorNote message={error} />
        {loading && <Loading />}
        <div class="grid grid-3">
          {data?.platforms.map((platform) => (
            <article
              class={`platform ${platform.enabled ? '' : 'platform-disabled'}`}
              key={platform.id}
            >
              <header class="row-between">
                <h3>{platform.name}</h3>
                <Badge tone={STATE_TONE[platform.state]}>{STATE_LABEL[platform.state]}</Badge>
              </header>
              <p class="muted">
                {platform.id === 'whatsapp'
                  ? `Koneksi: ${platform.connection}`
                  : 'Adapter stub tersedia; belum diimplementasikan.'}
              </p>
              {platform.transport && (
                <p>
                  Transport: <code>{platform.transport}</code>
                </p>
              )}
              {platform.note && <p class="muted small">{platform.note}</p>}
              <button
                class="btn btn-ghost"
                type="button"
                disabled={!platform.enabled}
                title={platform.enabled ? 'Pengaturan koneksi ada di halaman Koneksi WhatsApp' : 'Coming Soon'}
              >
                {platform.enabled ? 'Buka koneksi' : 'Segera hadir'}
              </button>
            </article>
          ))}
        </div>
      </Card>

      <Card title="Multi-platform">
        <p class="muted">
          Arsitektur memakai <code>PlatformAdapter</code> netral platform. WhatsApp aktif di
          v0.1; Telegram dan Discord memakai tombol resmi platform saat diaktifkan di M6.
          Owner dapat menyetujui aksi WhatsApp dari platform mana pun yang terhubung.
        </p>
      </Card>
    </>
  );
}
