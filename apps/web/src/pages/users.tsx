import { api } from '../api';
import { Badge, Card, Empty, ErrorNote, Icons, Loading, type Tone } from '../components';
import { formatTime, shortJid } from '../format';
import { useAsync } from '../hooks';
import type { Role } from '../types';

const ROLE_TONE: Record<Role, Tone> = {
  owner: 'accent',
  admin: 'warn',
  member: 'neutral',
};

export function UsersPage() {
  const { data, error, loading, reload } = useAsync(() => api.users(), []);

  return (
    <Card
      title="Daftar Pengguna & Pembagian Peran"
      subtitle="Manajemen otoritas pengguna WhatsApp, peran L0/L1, dan status akun"
      icon={<Icons.Users width={16} height={16} />}
      action={
        <button class="btn btn-secondary btn-sm" type="button" onClick={reload}>
          <Icons.Refresh width={14} height={14} />
          <span>Segarkan</span>
        </button>
      }
    >
      <ErrorNote message={error} />
      {loading && <Loading text="Memuat daftar pengguna…" />}
      {!loading && (!data?.users || data.users.length === 0) && (
        <Empty title="Belum Ada Pengguna Terdaftar">
          Pengguna yang mengirim pesan ke bot WhatsApp akan otomatis tercatat di sini.
        </Empty>
      )}
      {data && data.users && data.users.length > 0 && (
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>WhatsApp JID</th>
                <th>Nama Kontak</th>
                <th>Peran Otoritas</th>
                <th>Status Akun</th>
                <th>Kuota Harian</th>
                <th>Aktivitas Terakhir</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.jid}>
                  <td>
                    <code title={user.jid} style={{ fontWeight: 600 }}>
                      {shortJid(user.jid)}
                    </code>
                  </td>
                  <td>
                    <span style={{ fontWeight: user.name ? 600 : 400 }}>{user.name ?? '—'}</span>
                  </td>
                  <td>
                    <Badge tone={ROLE_TONE[user.role]} size="sm">
                      {user.role.toUpperCase()}
                    </Badge>
                  </td>
                  <td>
                    <Badge
                      tone={user.status === 'active' ? 'ok' : user.status === 'blocked' ? 'danger' : 'warn'}
                      size="sm"
                    >
                      {user.status}
                    </Badge>
                  </td>
                  <td>{user.quotaDaily ?? <span class="muted">Tanpa Batas</span>}</td>
                  <td class="muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatTime(user.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p class="muted small" style={{ marginTop: '1.25rem' }}>
        * Role Owner memegang kuasa tertinggi bot. Kontak baru yang menyapa bot diatur oleh opsi <code>ACCESS_MODE</code>.
      </p>
    </Card>
  );
}
