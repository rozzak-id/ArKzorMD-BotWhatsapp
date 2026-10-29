import { api } from '../api';
import { Badge, Card, Empty, ErrorNote, Loading, type Tone } from '../components';
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
      title="Pengguna & role"
      action={
        <button class="btn btn-ghost" type="button" onClick={reload}>
          Muat ulang
        </button>
      }
    >
      <ErrorNote message={error} />
      {loading && <Loading />}
      {!loading && data?.users.length === 0 && <Empty>Belum ada pengguna terdaftar.</Empty>}
      {data && data.users.length > 0 && (
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>JID</th>
                <th>Nama</th>
                <th>Role</th>
                <th>Status</th>
                <th>Kuota</th>
                <th>Diperbarui</th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => (
                <tr key={user.jid}>
                  <td>
                    <code title={user.jid}>{shortJid(user.jid)}</code>
                  </td>
                  <td>{user.name ?? '—'}</td>
                  <td>
                    <Badge tone={ROLE_TONE[user.role]}>{user.role}</Badge>
                  </td>
                  <td>
                    <Badge tone={user.status === 'active' ? 'ok' : user.status === 'blocked' ? 'danger' : 'warn'}>
                      {user.status}
                    </Badge>
                  </td>
                  <td>{user.quotaDaily ?? '—'}</td>
                  <td class="muted">{formatTime(user.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p class="muted">
        Aksi blokir, ubah kuota, dan angkat Admin akan tersedia di M3. Untuk v0.1, data dapat
        diperiksa di sini.
      </p>
    </Card>
  );
}
