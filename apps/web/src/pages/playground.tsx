import { useEffect, useRef, useState } from 'preact/hooks';
import { api } from '../api';
import { Badge, Card, Empty, ErrorNote, Icons, Loading } from '../components';
import { useAsync } from '../hooks';
import type { Persona } from '../types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  latencyMs?: number;
  toolCalls?: string[];
  pendingApprovals?: string[];
  createdAt: number;
}

const PRESET_PROMPTS = [
  'Halo, siapa namamu dan apa kemampuanmu?',
  'Bagaimana sistem persetujuan (approval) bekerja di bot ini?',
  'Buatkan draft pengumuman penting untuk grup WhatsApp santai.',
  'Cek apa saja fitur media dan command yang tersedia.',
];

export function PlaygroundPage() {
  const { data: personaData, loading: loadingPersonas } = useAsync(() => api.personas(), []);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Set default active persona on load
  useEffect(() => {
    if (personaData?.active) {
      setSelectedPersonaId(personaData.active);
    } else if (personaData?.personas && personaData.personas.length > 0) {
      setSelectedPersonaId(personaData.personas[0]?.id ?? '');
    }
  }, [personaData]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const activePersona: Persona | undefined = personaData?.personas?.find(
    (p) => p.id === selectedPersonaId,
  );

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend ?? inputText).trim();
    if (!text || sending) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setSending(true);
    setChatError(null);

    // Prepare history
    const historyPayload = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await api.playgroundChat({
        text,
        personaId: selectedPersonaId || undefined,
        history: historyPayload,
      });

      const assistantMsg: ChatMessage = {
        id: `ast_${Date.now()}`,
        role: 'assistant',
        content: res.text,
        latencyMs: res.latencyMs,
        toolCalls: res.toolCalls,
        pendingApprovals: res.pendingApprovals,
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleClear = () => {
    setMessages([]);
    setChatError(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'calc(100vh - 160px)', minHeight: '620px' }}>
      <Card
        title="AI Chat Playground"
        subtitle="Uji coba interaksi persona, prompt reasoning, eksekusi tools, dan respon LLM langsung di browser tanpa HP lain"
        icon={<Icons.MessageSquare width={16} height={16} />}
        action={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {personaData?.personas && (
              <select
                class="input"
                style={{ padding: '4px 10px', fontSize: '12px', height: 'auto', minWidth: '160px' }}
                value={selectedPersonaId}
                onChange={(e) => setSelectedPersonaId((e.target as HTMLSelectElement).value)}
                disabled={sending}
              >
                {personaData.personas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.id}) {p.id === personaData.active ? '· Aktif' : ''}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              onClick={handleClear}
              disabled={messages.length === 0 || sending}
              title="Bersihkan Percakapan"
            >
              <Icons.Trash width={13} height={13} />
              <span>Bersihkan</span>
            </button>
          </div>
        }
      >
        {activePersona && (
          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              padding: '8px 12px',
              background: 'var(--surface-muted, rgba(255, 255, 255, 0.03))',
              borderRadius: 'var(--radius-sm, 6px)',
              fontSize: '12px',
              border: '1px solid var(--border)',
              marginBottom: '14px',
              alignItems: 'center',
            }}
          >
            <span class="muted">Karakter Terpilih:</span>
            <strong style={{ color: 'var(--text)' }}>{activePersona.name}</strong>
            <span class="muted">· Gaya: <code style={{ fontSize: '11px' }}>{activePersona.style}</code></span>
            <span class="muted">· Bahasa: <code style={{ fontSize: '11px' }}>{activePersona.language.toUpperCase()}</code></span>
            <span class="muted">· Delay: <code style={{ fontSize: '11px' }}>{activePersona.typingDelay}</code></span>
          </div>
        )}

        <ErrorNote message={chatError} />

        {/* Chat Thread Container */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            overflowY: 'auto',
            padding: '12px 6px',
            maxHeight: '440px',
            minHeight: '280px',
          }}
        >
          {messages.length === 0 && (
            <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '480px', padding: '24px 16px' }}>
              <div style={{ display: 'inline-flex', padding: '12px', background: 'var(--surface-subtle)', borderRadius: '50%', marginBottom: '12px' }}>
                <Icons.Robot width={32} height={32} />
              </div>
              <h4 style={{ margin: '0 0 6px', fontSize: '15px' }}>Siap Menguji Persona AI</h4>
              <p class="muted small" style={{ margin: '0 0 16px' }}>
                Ketik pesan uji coba atau pilih salah satu pertanyaan cepat di bawah ini untuk melihat balasan bot secara langsung.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {PRESET_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    class="btn btn-secondary"
                    style={{ textAlign: 'left', fontSize: '12.5px', padding: '8px 12px', justifyContent: 'flex-start' }}
                    onClick={() => void handleSend(prompt)}
                  >
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                gap: '4px',
              }}
            >
              <div
                style={{
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '13.5px',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  background:
                    msg.role === 'user'
                      ? 'var(--accent, #10b981)'
                      : 'var(--surface-card, #13171e)',
                  color: msg.role === 'user' ? '#ffffff' : 'var(--text)',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                  borderBottomRightRadius: msg.role === 'user' ? '2px' : '10px',
                  borderBottomLeftRadius: msg.role === 'assistant' ? '2px' : '10px',
                }}
              >
                {msg.content}
              </div>

              {msg.role === 'assistant' && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginTop: '2px' }}>
                  {msg.latencyMs !== undefined && (
                    <Badge tone="neutral" size="sm" icon={<Icons.Clock width={10} height={10} />}>
                      {msg.latencyMs}ms
                    </Badge>
                  )}
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <Badge tone="accent" size="sm" icon={<Icons.Tools width={10} height={10} />}>
                      Tools: {msg.toolCalls.join(', ')}
                    </Badge>
                  )}
                  {msg.pendingApprovals && msg.pendingApprovals.length > 0 && (
                    <Badge tone="warn" size="sm" icon={<Icons.AlertCircle width={10} height={10} />}>
                      Menunggu Persetujuan L2
                    </Badge>
                  )}
                </div>
              )}
            </div>
          ))}

          {sending && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px' }}>
              <Loading text="Bot sedang berpikir…" />
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '12px', alignItems: 'flex-end' }}>
          <textarea
            class="input"
            style={{
              flex: 1,
              resize: 'none',
              minHeight: '44px',
              maxHeight: '120px',
              padding: '10px 12px',
              fontFamily: 'inherit',
              fontSize: '13.5px',
              lineHeight: '1.4',
            }}
            placeholder="Ketik pesan untuk bot... (Enter untuk kirim, Shift+Enter untuk baris baru)"
            value={inputText}
            onInput={(e) => setInputText((e.target as HTMLTextAreaElement).value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            rows={1}
          />
          <button
            type="button"
            class="btn btn-primary"
            style={{ height: '44px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => void handleSend()}
            disabled={!inputText.trim() || sending}
          >
            <Icons.Send width={15} height={15} />
            <span>Kirim</span>
          </button>
        </div>
      </Card>
    </div>
  );
}
