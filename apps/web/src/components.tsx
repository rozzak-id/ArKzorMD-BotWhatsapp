import type { ComponentChildren } from 'preact';
import type { ConnectionStatus } from './types';

export type Tone = 'neutral' | 'ok' | 'warn' | 'danger' | 'accent';

export function Badge({ children, tone = 'neutral' }: { children: ComponentChildren; tone?: Tone }) {
  return <span class={`badge badge-${tone}`}>{children}</span>;
}

const STATUS_MAP: Record<ConnectionStatus, { label: string; tone: Tone }> = {
  connected: { label: 'Terhubung', tone: 'ok' },
  connecting: { label: 'Menyambung', tone: 'warn' },
  disconnected: { label: 'Terputus', tone: 'neutral' },
  error: { label: 'Error', tone: 'danger' },
};

export function StatusPill({ status }: { status: ConnectionStatus | null }) {
  if (!status) return <Badge tone="neutral">Memuat…</Badge>;
  const meta = STATUS_MAP[status];
  return (
    <span class="status-pill">
      <span class={`dot dot-${meta.tone}`} aria-hidden="true" />
      WhatsApp · {meta.label}
    </span>
  );
}

export function Card({
  title,
  action,
  children,
  className = '',
}: {
  title?: string;
  action?: ComponentChildren;
  children: ComponentChildren;
  className?: string;
}) {
  return (
    <section class={`card ${className}`}>
      {(title || action) && (
        <header class="card-head">
          {title && <h2>{title}</h2>}
          {action && <div class="card-action">{action}</div>}
        </header>
      )}
      <div class="card-body">{children}</div>
    </section>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p class="error-note" role="alert">
      {message}
    </p>
  );
}

export function Empty({ children }: { children: ComponentChildren }) {
  return <p class="empty">{children}</p>;
}

export function Loading() {
  return <p class="muted">Memuat data…</p>;
}
