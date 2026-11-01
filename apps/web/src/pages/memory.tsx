import { useEffect, useState } from 'preact/hooks';
import { api } from '../api';
import { Badge, Card, Empty, ErrorNote, Loading } from '../components';
import { formatTime, shortJid } from '../format';

interface MemoryNote {
  id: number;
  userJid: string;
  note: string;
  createdAt: number;
}

export function MemoryPage() {
  const [notes, setNotes] = useState<MemoryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('arkzormd_admin_token') || '');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.memory(100);
      setNotes(res.notes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotes();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm(`Hapus catatan memori #${id}?`)) return;
    setDeletingId(id);
    try {
      await api.deleteMemory(id, adminToken);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      alert(`Gagal menghapus: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.userJid.toLowerCase().includes(search.toLowerCase()) ||
      n.note.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div class="stack">
      <Card
        title="Memori Jangka Panjang"
        action={
          <button class="btn btn-secondary" onClick={loadNotes} disabled={loading}>
            {loading ? 'Memuat…' : 'Segarkan'}
          </button>
        }
      >
        <p class="muted">
          Catatan fakta dan preferensi pengguna yang disimpan AI lewat <code>memory.save_note</code>.
        </p>

        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            class="input"
            style={{ maxWidth: '320px' }}
            placeholder="Cari nomor/JID atau isi catatan…"
            value={search}
            onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
          />
          <span class="muted" style={{ fontSize: '0.875rem' }}>
            Total: <strong>{notes.length}</strong> catatan
          </span>
        </div>
      </Card>

      <ErrorNote message={error} />

      {loading ? (
        <Card>
          <Loading />
        </Card>
      ) : filteredNotes.length === 0 ? (
        <Card>
          <Empty>{search ? 'Tidak ada catatan yang cocok dengan pencarian.' : 'Belum ada catatan memori tersimpan.'}</Empty>
        </Card>
      ) : (
        <Card title={`Daftar Catatan (${filteredNotes.length})`}>
          <table class="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Pengguna</th>
                <th>Catatan</th>
                <th>Waktu</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotes.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Badge tone="neutral">#{item.id}</Badge>
                  </td>
                  <td>
                    <code title={item.userJid}>{shortJid(item.userJid)}</code>
                  </td>
                  <td>{item.note}</td>
                  <td class="muted">{formatTime(item.createdAt)}</td>
                  <td>
                    <button
                      class="btn btn-danger btn-sm"
                      disabled={deletingId === item.id}
                      onClick={() => handleDelete(item.id)}
                    >
                      {deletingId === item.id ? '…' : 'Hapus'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
