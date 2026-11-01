import { api } from '../api';
import { Badge, Card, ErrorNote, Icons, Loading } from '../components';
import { useAsync } from '../hooks';

export function SettingsPage() {
  const { data, error, loading, reload } = useAsync(() => api.settings(), []);

  return (
    <>
      <Card
        title="Konfigurasi Aktif & Parameter Bot"
        subtitle="Setelan core engine, mode akses pengguna baru, dan batas rate limiting"
        icon={<Icons.Settings width={16} height={16} />}
        action={
          <button class="btn btn-secondary btn-sm" type="button" onClick={reload}>
            <Icons.Refresh width={14} height={14} />
            <span>Segarkan</span>
          </button>
        }
      >
        <ErrorNote message={error} />
        {loading && <Loading text="Memuat konfigurasi sistem…" />}
        {data && (
          <dl class="kv">
            <div>
              <dt>Prefix Command</dt>
              <dd>
                <code>{data.prefix}</code>
              </dd>
            </div>
            <div>
              <dt>Mode Akses Kontak Baru</dt>
              <dd>
                <Badge tone={data.accessMode === 'closed' ? 'warn' : 'ok'} size="sm">
                  {data.accessMode}
                </Badge>
              </dd>
            </div>
            <div>
              <dt>Mode Grup Default</dt>
              <dd>{data.defaultChatMode}</dd>
            </div>
            <div>
              <dt>Rate Limit Chat</dt>
              <dd>{data.rateLimitPerMinute} pesan/menit</dd>
            </div>
            <div>
              <dt>Mesin AI Utama</dt>
              <dd>
                <strong>{data.aiProvider}</strong> · <code>{data.aiModel}</code>
                {data.aiFallbackModel && (
                  <span class="muted small">
                    {' '}· fallback <code>{data.aiFallbackModel}</code>
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt>Timeout Eksekusi AI</dt>
              <dd>{Math.round(data.aiTimeoutMs / 1000)} detik</dd>
            </div>
            <div>
              <dt>Mode WhatsApp</dt>
              <dd>
                <Badge tone={data.whatsappMode === 'live' ? 'ok' : 'info'} size="sm">
                  {data.whatsappMode}
                </Badge>
              </dd>
            </div>
            <div>
              <dt>Status Kill Switch</dt>
              <dd>
                <Badge tone={data.killSwitch ? 'danger' : 'ok'} size="sm">
                  {data.killSwitch ? 'Aktif (Darurat)' : 'Nonaktif (Normal)'}
                </Badge>
              </dd>
            </div>
          </dl>
        )}
      </Card>

      <Card
        title="Keamanan & Catatan Operasional"
        subtitle="Kebijakan keamanan penyimpanan credential dan integrasi environment"
        icon={<Icons.ShieldCheck width={16} height={16} />}
      >
        <ul class="checklist">
          <li>
            <strong>Zero Secret Exposure:</strong> Kunci API LLM (OpenAI / Gemini / OpenRouter) tidak pernah
            diekspos ke browser atau audit log, melainkan dibaca aman di sisi server dari <code>.env</code>.
          </li>
          <li>
            <strong>Penyimpanan Sesi E2EE:</strong> Kunci sesi WhatsApp disimpan terenkripsi di folder{' '}
            <code>data/whatsapp-auth/</code> server host.
          </li>
          <li>
            <strong>Tema & Aksesibilitas:</strong> Sistem UI mendukung tema Gelap dan Terang dengan standar kontras WCAG 2.2 AAA.
          </li>
        </ul>
      </Card>
    </>
  );
}
