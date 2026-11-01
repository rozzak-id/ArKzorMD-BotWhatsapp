import { useEffect, useState } from 'preact/hooks';
import { api } from '../api';
import { Badge, Card, Empty, ErrorNote, Icons, Loading } from '../components';
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
        title="Pengaturan Mode Grup WhatsApp"
        subtitle="Konfigurasi respons AI dan persona spesifik untuk setiap obrolan grup"
        icon={<Icons.Users width={16} height={16} />}
        action={
          <button class="btn btn-secondary btn-sm" type="button" onClick={() => void loadData()}>
            <Icons.Refresh width={14} height={14} />
            <span>Segarkan</span>
          </button>
        }
      >
        <p class="muted small" style={{ marginBottom: '1.25rem' }}>
          Mode <strong>mention</strong> (bawaan) hanya membalas jika bot di-tag atau nama dipanggil. Mode{' '}
          <strong>active</strong> merespons setiap percakapan. Mode <strong>off</strong> membisukan AI di grup tersebut.
        </p>

        {loading ? (
          <Loading text="Memuat daftar grup WhatsApp…" />
        ) : groups.length === 0 ? (
          <Empty title="Belum Ada Grup Terdeteksi">
            Grup akan otomatis terdaftar setelah bot menerima pesan di dalam grup WhatsApp bersangkutan.
          </Empty>
        ) : (
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Chat ID Grup WhatsApp</th>
                  <th>Mode Respons AI</th>
                  <th>Persona Khusus</th>
                  <th>Waktu Terakhir Aktif</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => {
                  const isSaving = savingId === group.chatId;
                  return (
                    <tr key={group.chatId}>
                      <td>
                        <code style={{ fontSize: '13px', fontWeight: 600 }}>{group.chatId}</code>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Badge tone={modeBadgeTone(group.mode)} size="sm">
                            {group.mode.toUpperCase()}
                          </Badge>
                          <select
                            class="input"
                            style={{ padding: '4px 8px', fontSize: '13px', minHeight: '32px' }}
                            value={group.mode}
                            disabled={isSaving}
                            onChange={(e) =>
                              void handleModeChange(
                                group.chatId,
                                (e.target as HTMLSelectElement).value as any,
                              )
                            }
                          >
                            <option value="mention">Mention (Default)</option>
                            <option value="active">Active (Semua Pesan)</option>
                            <option value="off">Off (Nonaktif)</option>
                          </select>
                        </div>
                      </td>
                      <td>
                        <select
                          class="input"
                          style={{ padding: '4px 8px', fontSize: '13px', minHeight: '32px' }}
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
                        <span class="muted small" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {formatTime(group.updatedAt)}
                        </span>
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
