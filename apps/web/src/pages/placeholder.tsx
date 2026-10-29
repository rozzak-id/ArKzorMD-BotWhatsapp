import type { ComponentChildren } from 'preact';
import { Badge, Card } from '../components';

export function PlaceholderPage({
  title,
  description,
  planned,
  milestone,
  children,
}: {
  title: string;
  description: string;
  planned: string[];
  milestone: string;
  children?: ComponentChildren;
}) {
  return (
    <>
      <Card
        title={title}
        action={<Badge tone="warn">{milestone}</Badge>}
      >
        <p class="muted">{description}</p>
        <ul class="checklist">
          {planned.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        {children}
      </Card>
      <p class="muted">
        Halaman ini sengaja disiapkan sebagai struktur awal. API dan tipe data sudah tersedia
        agar fitur dapat ditambahkan tanpa mengubah kerangka.
      </p>
    </>
  );
}
