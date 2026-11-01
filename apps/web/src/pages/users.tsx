import { useState } from 'preact/hooks';
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

  // Modal tambah pengguna
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'member' | 'admin' | 'owner'>('member');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successNote, setSuccessNote] = useState<string | null>(null);

  const handleAddUser = async (e: Event) => {
    e.preventDefault();
    if (!newPhone.trim()) return;
    setSubmitting(true);
    setActionError(null);
    setSuccessNote(null);
    try {
      await api.createUser({
        phoneOrJid: newPhone.trim(),
        name: newName.trim() || undefined,
        role: newRole,
      });
      setSuccessNote(`Pengguna ${newPhone.trim()} berhasil ditambahkan!`);
      setShowAddModal(false);
      setNewPhone('');
      setNewName('');
      setNewRole('member');
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (jid: string, role: string) => {
    setActionError(null);
    try {
      await api.setUserRole(jid, role);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleStatusToggle = async (jid: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'blocked' : 'active';
    setActionError(null);
    try {
      await api.setUserStatus(jid, nextStatus);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeleteUser = async (jid: string) => {
    if (!window.confirm(`Hapus pengguna ${shortJid(jid)} dari database bot?`)) {
      return;
    }
    setActionError(null);
    try {
      await api.deleteUser(jid);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card
        title="Daftar Pengguna & Pembagian Peran"
        subtitle="Manajemen otoritas pengguna WhatsApp, peran L0/L1, blokir, dan tambah pengguna manual"
        icon={<Icons.Users width={16} height={16} />}
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              class="btn btn-primary btn-sm"
              type="button"
              onClick={() => {
                setActionError(null);
                setShowAddModal(true);
              }}
            >
              <Icons.Plus width={14} height={14} />
              <span>Tambah Pengguna</span>
            </button>
            <button class="btn btn-secondary btn-sm" type="button" onClick={reload}>
              <Icons.Refresh width={14} height={14} />
              <span>Segarkan</span>
            </button>
          </div>
        }
      >
        <ErrorNote message={error || actionError} />
        {successNote && (
          <div class="banner ok" style={{ marginBottom: '16px' }}>
            <Icons.CheckCircle width={16} height={16} />
            <span>{successNote}</span>
          </div>
        )}

        {loading && <Loading text="Memuat daftar pengguna…" />}
        {!loading && (!data?.users || data.users.length === 0) && (
          <Empty title="Belum Ada Pengguna Terdaftar">
            Pengguna yang mengirim pesan ke bot WhatsApp atau ditambahkan manual akan muncul di sini.
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
                  <th>Aktivitas Terakhir</th>
                  <th style={{ textAlign: 'right' }}>Aksi</th>
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
                      <select
                        class="input"
                        style={{ padding: '3px 8px', fontSize: '12px', height: 'auto', width: 'auto' }}
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.jid, (e.target as HTMLSelectElement).value)}
                      >
                        <option value="owner">OWNER</option>
                        <option value="admin">ADMIN</option>
                        <option value="member">MEMBER</option>
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        class={`badge ${user.status === 'active' ? 'ok' : 'danger'}`}
                        style={{ cursor: 'pointer', border: 'none' }}
                        title="Klik untuk ubah status blokir"
                        onClick={() => handleStatusToggle(user.jid, user.status)}
                      >
                        {user.status === 'active' ? 'Aktif' : 'Diblokir'}
                      </button>
                    </td>
                    <td class="muted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatTime(user.updatedAt)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        class="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px', color: 'var(--color-danger, #ef4444)' }}
                        title="Hapus Pengguna"
                        onClick={() => handleDeleteUser(user.jid)}
                      >
                        <Icons.Trash width={12} height={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p class="muted small" style={{ marginTop: '1.25rem' }}>
          * Role <strong>Owner</strong> memiliki kuasa tertinggi & tidak dapat dihapus. Peran <strong>Admin</strong> memiliki wewenang eksekusi tool level L1 tanpa persetujuan.
        </p>
      </Card>

      {/* Modal Tambah Pengguna */}
      {showAddModal && (
        <div class="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div class="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icons.UserCheck width={18} height={18} />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Tambah Pengguna Manual</h3>
              </div>
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px' }}
                onClick={() => setShowAddModal(false)}
              >
                <Icons.X width={14} height={14} />
              </button>
            </div>

            <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div class="form-group">
                <label class="form-label">
                  <span>Nomor Telepon WhatsApp / JID</span>
                </label>
                <input
                  type="text"
                  class="input"
                  placeholder="Contoh: 08123456789 atau 628123456789"
                  value={newPhone}
                  onInput={(e) => setNewPhone((e.target as HTMLInputElement).value)}
                  required
                  autoFocus
                />
                <span class="form-hint">Otomatis diformat menjadi JID WhatsApp resmi (@s.whatsapp.net).</span>
              </div>

              <div class="form-group">
                <label class="form-label">
                  <span>Nama Kontak (Opsional)</span>
                </label>
                <input
                  type="text"
                  class="input"
                  placeholder="Nama panggilan pengguna"
                  value={newName}
                  onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
                />
              </div>

              <div class="form-group">
                <label class="form-label">
                  <span>Peran Otoritas (Role)</span>
                </label>
                <select
                  class="input"
                  value={newRole}
                  onChange={(e) => setNewRole((e.target as HTMLSelectElement).value as any)}
                >
                  <option value="member">MEMBER (Pengguna Biasa)</option>
                  <option value="admin">ADMIN (Dapat Kelola Bot & Izin L1)</option>
                  <option value="owner">OWNER (Pemilik Utama)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  class="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={submitting}
                >
                  Batal
                </button>
                <button type="submit" class="btn btn-primary" disabled={submitting}>
                  <Icons.Save width={14} height={14} />
                  <span>{submitting ? 'Menyimpan…' : 'Simpan Pengguna'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
