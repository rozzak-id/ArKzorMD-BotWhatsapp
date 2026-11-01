import { useEffect, useState } from 'preact/hooks';
import { Badge, ErrorNote, Icons, StatusPill } from './components';
import { useLiveStatus } from './hooks';
import type { AuthStatusResponse, StatusResponse } from './types';
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
import { PlaygroundPage } from './pages/playground';
import { api, setAuthToken } from './api';

type RouteId =
  | 'dashboard'
  | 'playground'
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
      { id: 'playground', label: 'AI Playground', icon: 'MessageSquare' },
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
    case 'playground':
      return <PlaygroundPage />;
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
  const [authStatus, setAuthStatus] = useState<AuthStatusResponse | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

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

  const refreshAuth = () => {
    api.authStatus()
      .then((auth) => {
        setAuthStatus(auth);
        if (auth.needsSetup && location.hash !== '#/setup') {
          window.location.hash = '#/setup';
          setRoute('setup');
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      setAuthStatus((prev) => (prev ? { ...prev, authenticated: false } : null));
      setLoginError('Sesi kedaluwarsa atau token admin tidak valid. Masukkan password admin.');
      setShowLoginModal(true);
    };
    window.addEventListener('arkzor:unauthorized', onUnauthorized);
    return () => window.removeEventListener('arkzor:unauthorized', onUnauthorized);
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {}
    setAuthToken(null);
    setAuthStatus((prev) => (prev ? { ...prev, authenticated: false } : null));
  };

  const handleLoginSubmit = async (e: Event) => {
    e.preventDefault();
    if (!loginPassword.trim() || loggingIn) return;
    setLoggingIn(true);
    setLoginError(null);
    try {
      const res = await api.login(loginPassword);
      setAuthToken(res.token);
      setAuthStatus((prev) => (prev ? { ...prev, authenticated: true } : null));
      setShowLoginModal(false);
      setLoginPassword('');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoggingIn(false);
    }
  };

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
          <p style={{ fontWeight: 600 }}>v{status?.version ?? '0.7.0'}</p>
          <p class="muted small">
            AI: <code>{status?.ai.provider ?? 'mock'}</code> - {status?.ai.model ?? 'default'}
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

            {authStatus && !authStatus.needsSetup && (
              authStatus.authenticated ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Badge tone="ok" size="sm" icon={<Icons.ShieldCheck width={12} height={12} />}>
                    Admin Terverifikasi
                  </Badge>
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    onClick={handleLogout}
                    title="Keluar dari sesi admin"
                  >
                    <span>Keluar</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  class="btn btn-primary btn-sm"
                  onClick={() => {
                    setLoginError(null);
                    setShowLoginModal(true);
                  }}
                  title="Masuk sebagai admin"
                >
                  <Icons.Key width={13} height={13} />
                  <span>Masuk Admin</span>
                </button>
              )
            )}

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

      {/* Admin Login Modal */}
      {showLoginModal && (
        <div
          class="modal-backdrop"
          onClick={() => !loggingIn && setShowLoginModal(false)}
        >
          <div
            class="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px' }}
          >
            <header class="modal-head">
              <div>
                <h3 style={{ margin: 0, fontSize: '16px' }}>Masuk Admin Console</h3>
                <p class="muted small" style={{ margin: '4px 0 0' }}>
                  Masukkan password admin untuk mengelola bot dan data
                </p>
              </div>
              <button
                type="button"
                class="btn-icon"
                onClick={() => !loggingIn && setShowLoginModal(false)}
                title="Tutup"
              >
                <Icons.X width={16} height={16} />
              </button>
            </header>
            <form onSubmit={handleLoginSubmit}>
              <div class="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <ErrorNote message={loginError} />
                <div class="field">
                  <label for="admin-pass-input" class="label">Password Admin</label>
                  <input
                    id="admin-pass-input"
                    type="password"
                    class="input"
                    placeholder="Masukkan password admin"
                    value={loginPassword}
                    onInput={(e) => setLoginPassword((e.target as HTMLInputElement).value)}
                    disabled={loggingIn}
                    autoFocus
                    required
                  />
                </div>
              </div>
              <footer class="modal-foot">
                <button
                  type="button"
                  class="btn btn-secondary"
                  onClick={() => setShowLoginModal(false)}
                  disabled={loggingIn}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  class="btn btn-primary"
                  disabled={!loginPassword.trim() || loggingIn}
                >
                  <Icons.Key width={14} height={14} />
                  <span>{loggingIn ? 'Memverifikasi…' : 'Masuk'}</span>
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
