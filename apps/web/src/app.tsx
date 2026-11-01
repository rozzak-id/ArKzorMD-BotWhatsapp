import { useEffect, useState } from 'preact/hooks';
import { Badge, StatusPill } from './components';
import { useLiveStatus } from './hooks';
import type { StatusResponse } from './types';
import { ApprovalsPage } from './pages/approvals';
import { AuditPage } from './pages/audit';
import { ConnectionPage } from './pages/connection';
import { DashboardPage } from './pages/dashboard';
import { PersonasPage } from './pages/personas';
import { PlatformsPage } from './pages/platforms';
import { SettingsPage } from './pages/settings';
import { ToolsPage } from './pages/tools';
import { UsersPage } from './pages/users';
import { MemoryPage } from './pages/memory';
import { GroupsPage, SetupPage } from './pages/placeholders';

type RouteId =
  | 'dashboard'
  | 'connection'
  | 'personas'
  | 'users'
  | 'groups'
  | 'approvals'
  | 'tools'
  | 'memory'
  | 'audit'
  | 'settings'
  | 'platforms'
  | 'setup';

interface NavItem {
  id: RouteId;
  label: string;
  badge?: string;
}

const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Utama',
    items: [
      { id: 'dashboard', label: 'Dashboard' },
      { id: 'connection', label: 'Koneksi WhatsApp' },
      { id: 'approvals', label: 'Persetujuan' },
    ],
  },
  {
    title: 'Kelola',
    items: [
      { id: 'personas', label: 'Persona' },
      { id: 'users', label: 'Pengguna & Role' },
      { id: 'groups', label: 'Grup' },
      { id: 'tools', label: 'Tools & Izin' },
      { id: 'memory', label: 'Memori' },
    ],
  },
  {
    title: 'Sistem',
    items: [
      { id: 'audit', label: 'Audit Log' },
      { id: 'settings', label: 'Pengaturan' },
      { id: 'platforms', label: 'Platform' },
      { id: 'setup', label: 'Setup Wizard', badge: 'M3' },
    ],
  },
];

const ROUTES: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

function getRoute(): RouteId {
  const raw = location.hash.replace(/^#\/?/, '');
  return ROUTES.some((route) => route.id === raw) ? (raw as RouteId) : 'dashboard';
}

type Theme = 'light' | 'dark';

function initialTheme(): Theme {
  const saved = localStorage.getItem('arkzor.theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function Page({ route, status }: { route: RouteId; status: StatusResponse | null }) {
  switch (route) {
    case 'connection':
      return <ConnectionPage status={status} />;
    case 'personas':
      return <PersonasPage />;
    case 'users':
      return <UsersPage />;
    case 'groups':
      return <GroupsPage />;
    case 'approvals':
      return <ApprovalsPage />;
    case 'tools':
      return <ToolsPage />;
    case 'memory':
      return <MemoryPage />;
    case 'audit':
      return <AuditPage />;
    case 'settings':
      return <SettingsPage />;
    case 'platforms':
      return <PlatformsPage />;
    case 'setup':
      return <SetupPage />;
    default:
      return <DashboardPage status={status} />;
  }
}

export function App() {
  const { status, error } = useLiveStatus();
  const [route, setRoute] = useState<RouteId>(getRoute);
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const meta = ROUTES.find((item) => item.id === route) ?? ROUTES[0];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('arkzor.theme', theme);
  }, [theme]);

  useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route]);

  return (
    <div class="shell">
      <a class="skip-link" href="#main">
        Lewati ke konten
      </a>

      <aside class="sidebar">
        <a class="brand" href="#/dashboard">
          <span class="brand-mark" aria-hidden="true">
            A
          </span>
          <span>
            ArKzorMD
            <small>Bot AI WhatsApp</small>
          </span>
        </a>

        <nav aria-label="Navigasi utama">
          {NAV_GROUPS.map((group) => (
            <div class="nav-group" key={group.title}>
              <p class="nav-group-title">{group.title}</p>
              {group.items.map((item) => (
                <a
                  key={item.id}
                  class={`nav-link ${route === item.id ? 'active' : ''}`}
                  href={`#/${item.id}`}
                  aria-current={route === item.id ? 'page' : undefined}
                >
                  <span>{item.label}</span>
                  {item.badge && <span class="nav-badge">{item.badge}</span>}
                </a>
              ))}
            </div>
          ))}
        </nav>

        <div class="sidebar-foot">
          <p>
            v{status?.version ?? '0.1.0'} · M0 fondasi
          </p>
          <p class="muted small">{status?.ai.provider ?? 'mock'} provider</p>
        </div>
      </aside>

      <div class="main">
        <header class="topbar">
          <div>
            <p class="eyebrow">ArKzorMD</p>
            <h1>{meta?.label ?? 'Dashboard'}</h1>
          </div>
          <div class="topbar-actions">
            {error && <Badge tone="danger">API offline</Badge>}
            <StatusPill status={status?.connection.status ?? null} />
            <button
              class="btn btn-ghost"
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              Tema: {theme === 'dark' ? 'Gelap' : 'Terang'}
            </button>
          </div>
        </header>

        <main class="page" id="main">
          {error && (
            <div class="banner danger" role="alert">
              Tidak dapat menghubungi API: {error}. Pastikan server berjalan di port 3000.
            </div>
          )}
          <Page route={route} status={status} />
        </main>
      </div>
    </div>
  );
}
