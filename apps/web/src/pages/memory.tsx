import { useEffect, useState } from 'preact/hooks';
import { api } from '../api';
import { Badge, Card, Empty, ErrorNote, Icons, Loading } from '../components';
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
  const adminToken = localStorage.getItem('arkzor.admin_token') || localStorage.getItem('arkzormd_admin_token') || '';
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
    if (!confirm(`Hapus catatan memori #${id}? Tindakan ini permanen.`)) return;
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
        title="Pusat Memori Jangka Panjang AI"
        subtitle="Fakta konteks dan preferensi pengguna yang disimpan otomatis oleh agen AI"
        icon={<Icons.Cpu width={16} height={16} />}
        action={
          <button class="btn btn-secondary btn-sm" onClick={loadNotes} disabled={loading}>
            <Icons.Refresh width={14} height={14} />
            <span>{loading ? 'Memuat…' : 'Segarkan'}</span>
          </button>
        }
      >
        <p class="muted small" style={{ marginBottom: '1rem' }}>
          Agen AI mengingat preferensi penting pengguna lewat tool <code>memory.save_note</code> untuk
          menghadirkan percakapan berkelanjutan yang personal.
        </p>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            class="input"
            style={{ maxWidth: '360px', width: '100%' }}
            placeholder="Cari nomor JID atau isi catatan memori…"
            value={search}
            onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
          />
          <Badge tone="accent" size="sm">
            Total {notes.length} Catatan
          </Badge>
        </div>
      </Card>

      <ErrorNote message={error} />

      {loading ? (
        <Card>
          <Loading text="Memuat catatan memori dari database…" />
        </Card>
      ) : filteredNotes.length === 0 ? (
        <Card>
          <Empty title="Tidak Ada Catatan Ditemukan">
            {search ? 'Tidak ada catatan yang cocok dengan kata kunci pencarian.' : 'Belum ada catatan memori tersimpan.'}
          </Empty>
        </Card>
      ) : (
        <Card
          title={`Catatan Memori Tersimpan (${filteredNotes.length})`}
          subtitle="Daftar entri memori yang relevan"
          icon={<Icons.Cpu width={16} height={16} />}
        >
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>ID</th>
                  <th>Kontak Pengguna</th>
                  <th>Catatan Fakta / Preferensi</th>
                  <th>Waktu Simpan</th>
                  <th style={{ width: '90px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotes.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Badge tone="neutral" size="sm">#{item.id}</Badge>
                    </td>
                    <td>
                      <code title={item.userJid} style={{ fontWeight: 600 }}>{shortJid(item.userJid)}</code>
                    </td>
                    <td>
                      <span style={{ color: 'var(--text)' }}>{item.note}</span>
                    </td>
                    <td class="muted small" style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                      {formatTime(item.createdAt)}
                    </td>
                    <td>
                      <button
                        class="btn btn-danger btn-sm"
                        disabled={deletingId === item.id}
                        onClick={() => handleDelete(item.id)}
                        title="Hapus catatan memori ini"
                      >
                        <Icons.X width={13} height={13} />
                        <span>{deletingId === item.id ? '…' : 'Hapus'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
