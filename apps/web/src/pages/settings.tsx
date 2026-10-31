import { api } from '../api';
import { Badge, Card, ErrorNote, Loading } from '../components';
import { useAsync } from '../hooks';

export function SettingsPage() {
  const { data, error, loading, reload } = useAsync(() => api.settings(), []);

  return (
    <>
      <Card
        title="Konfigurasi aktif"
        action={
          <button class="btn btn-ghost" type="button" onClick={reload}>
            Muat ulang
          </button>
        }
      >
        <ErrorNote message={error} />
        {loading && <Loading />}
        {data && (
          <dl class="kv">
            <div>
              <dt>Prefix command</dt>
              <dd>
                <code>{data.prefix}</code>
              </dd>
            </div>
            <div>
              <dt>Mode akses nomor asing</dt>
              <dd>{data.accessMode}</dd>
            </div>
            <div>
              <dt>Mode grup default</dt>
              <dd>{data.defaultChatMode}</dd>
            </div>
            <div>
              <dt>Rate limit per chat</dt>
              <dd>{data.rateLimitPerMinute} pesan/menit</dd>
            </div>
            <div>
              <dt>AI provider</dt>
              <dd>
                {data.aiProvider} · <code>{data.aiModel}</code>
                {data.aiFallbackModel && (
                  <>
                    {' '}· fallback <code>{data.aiFallbackModel}</code>
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt>Timeout AI</dt>
              <dd>{Math.round(data.aiTimeoutMs / 1000)} detik</dd>
            </div>
            <div>
              <dt>Mode WhatsApp</dt>
              <dd>{data.whatsappMode}</dd>
            </div>
            <div>
              <dt>Kill switch</dt>
              <dd>
                <Badge tone={data.killSwitch ? 'danger' : 'ok'}>
                  {data.killSwitch ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </dd>
            </div>
          </dl>
        )}
      </Card>

      <Card title="Catatan">
        <ul class="checklist">
          <li>
            Secret seperti API key tidak pernah dikirim ke Web UI maupun log. Penyimpanan
            API key terenkripsi lewat Web UI masuk M3; saat ini key dibaca dari{' '}
            <code>.env</code>.
          </li>
          <li>
            Saat ini environment <code>.env</code> menjadi sumber konfigurasi awal. Editor
            pengaturan penuh akan menggantikan ini di M3.
          </li>
          <li>
            Mode gelap/terang mengikuti preferensi perangkat dan dapat diganti dari bilah atas.
          </li>
        </ul>
      </Card>
    </>
  );
}
