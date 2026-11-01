import { useEffect, useState } from 'preact/hooks';
import { api } from '../api';
import { Badge, Card, Empty, ErrorNote, Loading } from '../components';
import { formatTime } from '../format';
import type { GroupChat, Persona } from '../types';

export function GroupsPage() {
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [groupsRes, personasRes] = await Promise.all([api.groups(), api.personas()]);
      setGroups(groupsRes.groups);
      setPersonas(personasRes.personas);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function handleModeChange(chatId: string, newMode: 'off' | 'mention' | 'active') {
    setSavingId(chatId);
    setError(null);
    try {
      await api.setGroupMode(chatId, newMode);
      setGroups((prev) =>
        prev.map((g) => (g.chatId === chatId ? { ...g, mode: newMode, updatedAt: Date.now() } : g)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingId(null);
    }
  }

  async function handlePersonaChange(chatId: string, personaId: string | null) {
    setSavingId(chatId);
    setError(null);
    try {
      await api.setGroupPersona(chatId, personaId || null);
      setGroups((prev) =>
        prev.map((g) => (g.chatId === chatId ? { ...g, personaId: personaId || null } : g)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingId(null);
    }
  }

  const modeBadgeTone = (mode: string) => {
    switch (mode) {
      case 'active':
        return 'accent' as const;
      case 'mention':
        return 'ok' as const;
      default:
        return 'neutral' as const;
    }
  };

  return (
    <div>
      <ErrorNote message={error} />

      <Card
        title="Pengaturan Mode Grup"
        action={
          <button class="btn btn-secondary btn-sm" type="button" onClick={() => void loadData()}>
            Muat ulang
          </button>
        }
      >
        <p class="muted" style={{ marginBottom: '1.25rem' }}>
          Atur perilaku bot di setiap grup WhatsApp. Mode <strong>mention</strong> (bawaan) hanya membalas jika
          bot di-tag, pesan bot di-reply, atau nama bot dipanggil. Mode <strong>aktif</strong> merespons setiap obrolan.
          Mode <strong>off</strong> menonaktifkan AI di grup tersebut.
        </p>

        {loading ? (
          <Loading />
        ) : groups.length === 0 ? (
          <Empty>
            Belum ada grup yang terdeteksi. Grup akan otomatis muncul di sini setelah bot menerima pesan
            atau dimasukkan ke dalam grup.
          </Empty>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table class="table">
              <thead>
                <tr>
                  <th>Chat ID Grup</th>
                  <th>Mode Respons</th>
                  <th>Persona Khusus</th>
                  <th>Terakhir Aktif</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const isSaving = savingId === group.chatId;
                  return (
                    <tr key={group.chatId}>
                      <td>
                        <code style={{ fontSize: '0.85rem' }}>{group.chatId}</code>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Badge tone={modeBadgeTone(group.mode)}>{group.mode}</Badge>
                          <select
                            class="input"
                            style={{ padding: '0.2rem 0.4rem', fontSize: '0.85rem' }}
                            value={group.mode}
                            disabled={isSaving}
                            onChange={(e) =>
                              void handleModeChange(
                                group.chatId,
                                (e.target as HTMLSelectElement).value as any,
                              )
                            }
                          >
                            <option value="mention">mention (default)</option>
                            <option value="active">active (semua pesan)</option>
                            <option value="off">off (nonaktif)</option>
                          </select>
                        </div>
                      </td>
                      <td>
                        <select
                          class="input"
                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.85rem' }}
                          value={group.personaId ?? ''}
                          disabled={isSaving}
                          onChange={(e) =>
                            void handlePersonaChange(
                              group.chatId,
                              (e.target as HTMLSelectElement).value || null,
                            )
                          }
                        >
                          <option value="">(Default Global)</option>
                          {personas.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span class="muted small">{formatTime(group.updatedAt)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
