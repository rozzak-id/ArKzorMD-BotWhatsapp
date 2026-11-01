import { useEffect, useState } from 'preact/hooks';
import { Badge, Icons, StatusPill } from './components';
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
import { GroupsPage } from './pages/groups';
import { SetupPage } from './pages/setup';
import { api } from './api';

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
  icon: keyof typeof Icons;
}

const NAV_GROUPS: Array<{ title: string; items: NavItem[] }> = [
  {
    title: 'Utama',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'Activity' },
      { id: 'connection', label: 'Koneksi WhatsApp', icon: 'WhatsApp' },
      { id: 'approvals', label: 'Persetujuan', icon: 'ShieldCheck' },
    ],
  },
  {
    title: 'Kelola',
    items: [
      { id: 'personas', label: 'Persona AI', icon: 'Sparkles' },
      { id: 'users', label: 'Pengguna & Role', icon: 'Users' },
      { id: 'groups', label: 'Grup WhatsApp', icon: 'Users' },
      { id: 'tools', label: 'Tools & Izin', icon: 'Tools' },
      { id: 'memory', label: 'Memori Bot', icon: 'Cpu' },
    ],
  },
  {
    title: 'Sistem',
    items: [
      { id: 'audit', label: 'Audit Log', icon: 'Clock' },
      { id: 'settings', label: 'Pengaturan', icon: 'Settings' },
      { id: 'platforms', label: 'Platform Adapter', icon: 'Robot' },
      { id: 'setup', label: 'Setup Wizard', badge: 'Wizard', icon: 'Key' },
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

function Page({
  route,
  status,
  onNavigate,
}: {
  route: RouteId;
  status: StatusResponse | null;
  onNavigate?: (to: RouteId) => void;
}) {
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
      return <SetupPage status={status} onFinish={() => onNavigate?.('dashboard')} />;
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

  useEffect(() => {
    api.authStatus().then((auth) => {
      if (auth.needsSetup && location.hash !== '#/setup') {
        window.location.hash = '#/setup';
        setRoute('setup');
      }
    }).catch(() => {});
  }, []);

  return (
    <div class="shell">
      <a class="skip-link" href="#main">
        Lewati ke konten
      </a>

      <aside class="sidebar">
        <a class="brand" href="#/dashboard">
          <span class="brand-mark" aria-hidden="true">
            <Icons.Robot width={20} height={20} />
          </span>
          <span>
            ArKzorMD
            <small>WhatsApp AI Console</small>
          </span>
        </a>

        <nav aria-label="Navigasi utama">
          {NAV_GROUPS.map((group) => (
            <div class="nav-group" key={group.title}>
              <p class="nav-group-title">{group.title}</p>
              {group.items.map((item) => {
                const IconComponent = Icons[item.icon];
                return (
                  <a
                    key={item.id}
                    class={`nav-link ${route === item.id ? 'active' : ''}`}
                    href={`#/${item.id}`}
                    aria-current={route === item.id ? 'page' : undefined}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ display: 'grid', placeItems: 'center', opacity: route === item.id ? 1 : 0.7 }}>
                        <IconComponent width={16} height={16} />
                      </span>
                      <span>{item.label}</span>
                    </span>
                    {item.badge && <span class="nav-badge">{item.badge}</span>}
                  </a>
                );
              })}
            </div>
          ))}
        </nav>

        <div class="sidebar-foot">
          <p style={{ fontWeight: 600 }}>v{status?.version ?? '0.2.0'}</p>
          <p class="muted small">
            AI: <code>{status?.ai.provider ?? 'mock'}</code> ({status?.ai.model ?? 'default'})
          </p>
        </div>
      </aside>

      <div class="main">
        <header class="topbar">
          <div>
            <p class="eyebrow">ArKzorMD Console</p>
            <h1>{meta?.label ?? 'Dashboard'}</h1>
          </div>
          <div class="topbar-actions">
            {error && <Badge tone="danger">API Offline</Badge>}
            <StatusPill status={status?.connection.status ?? null} />
            <button
              class="btn btn-secondary btn-sm"
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title={`Beralih ke tema ${theme === 'dark' ? 'terang' : 'gelap'}`}
            >
              {theme === 'dark' ? (
                <>
                  <Icons.Sun width={15} height={15} />
                  <span>Terang</span>
                </>
              ) : (
                <>
                  <Icons.Moon width={15} height={15} />
                  <span>Gelap</span>
                </>
              )}
            </button>
          </div>
        </header>

        <main class="page" id="main">
          {error && (
            <div class="banner danger" role="alert">
              Tidak dapat menghubungi API: {error}. Pastikan server berjalan di port 3000.
            </div>
          )}
          <Page
            route={route}
            status={status}
            onNavigate={(to) => {
              window.location.hash = `#/${to}`;
              setRoute(to);
            }}
          />
        </main>
      </div>
    </div>
  );
}
