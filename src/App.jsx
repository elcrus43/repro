import React, { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { RequireAdmin } from './components/RequireAdmin';
import {
  Building2,
  Users,
  FileCheck,
  UserCircle,
  History,
  ClipboardList,
  LayoutGrid,
  LayoutDashboard,
  Landmark,
  FolderHeart,
  Target,
  Sparkles,
  MessageSquareText,
  Sun,
  Moon,
  X
} from 'lucide-react';
import { DesktopSidebar } from './components/DesktopSidebar';
import { CommandPalette } from './components/CommandPalette';
import { QuickActionFab } from './components/QuickActionFab';

// Pages - lazy loaded for code splitting
const LoginPage = lazy(() => import('./pages/Auth/AuthPages').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/Auth/AuthPages').then(m => ({ default: m.RegisterPage })));
const UpdatePasswordPage = lazy(() => import('./pages/Auth/UpdatePasswordPage'));
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage'));
const ClientsPage = lazy(() => import('./pages/Clients/index.js'));
const ClientCardPage = lazy(() => import('./pages/Clients/index.js').then(m => ({ default: m.ClientCardPage })));
const ClientFormPage = lazy(() => import('./pages/Clients/index.js').then(m => ({ default: m.ClientFormPage })));
const PublicClientPage = lazy(() => import('./pages/Clients/index.js').then(m => ({ default: m.PublicClientPage })));
const PropertiesPage = lazy(() => import('./pages/Properties/index.js'));
const PropertyCardPage = lazy(() => import('./pages/Properties/index.js').then(m => ({ default: m.PropertyCardPage })));
const PropertyFormPage = lazy(() => import('./pages/Properties/index.js').then(m => ({ default: m.PropertyFormPage })));
const PublicPropertyPage = lazy(() => import('./pages/Properties/index.js').then(m => ({ default: m.PublicPropertyPage })));
const ComparePage = lazy(() => import('./pages/Properties/index.js').then(m => ({ default: m.ComparePage })));
const DocumentsPage = lazy(() => import('./pages/Documents/DocumentsPage'));
const RequestsPage = lazy(() => import('./pages/Requests/index.js'));
const RequestCardPage = lazy(() => import('./pages/Requests/index.js').then(m => ({ default: m.RequestCardPage })));
const RequestFormPage = lazy(() => import('./pages/Requests/index.js').then(m => ({ default: m.RequestFormPage })));
const MatchesPage = lazy(() => import('./pages/Matches/MatchesPages'));
const MatchDetailPage = lazy(() => import('./pages/Matches/MatchesPages').then(m => ({ default: m.MatchDetailPage })));
const HistoryPage = lazy(() => import('./pages/History/index.js'));
const HistoryFormPage = lazy(() => import('./pages/History/index.js').then(m => ({ default: m.HistoryFormPage })));
const HistoryDetailsPage = lazy(() => import('./pages/History/index.js').then(m => ({ default: m.HistoryDetailsPage })));
const TasksPage = lazy(() => import('./pages/Tasks/DealsPage'));
const MeetingOwnerFormPage = lazy(() => import('./pages/Tasks/MeetingOwnerFormPage').then(m => ({ default: m.MeetingOwnerFormPage })));
const CallFormPage = lazy(() => import('./pages/Tasks/CallFormPage').then(m => ({ default: m.CallFormPage })));
const ProfilePage = lazy(() => import('./pages/Profile/ProfilePage'));
const EstimationPage = lazy(() => import('./pages/Properties/EstimationPage'));
const TemplatesPage = lazy(() => import('./pages/Messaging/TemplatesPage'));
const DebugPage = lazy(() => import('./pages/Debug/DebugPage'));
const SelectionFormPage = lazy(() => import('./pages/Selection/index.js').then(m => ({ default: m.SelectionFormPage })));
const PublicChatPage = lazy(() => import('./pages/Messaging/PublicChatPage'));
const DevelopmentsPage = lazy(() => import('./pages/Developments/DevelopmentsPage'));
import { useMatchNotifications } from './hooks/useMatchNotifications';

/* ─── BottomNav ────────────────────────────────────────────────────────────── */

function BottomNav() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { state } = useApp();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isDark, setIsDark] = React.useState(() => document.documentElement.classList.contains('dark'));

  const user = state.currentUser;
  const isAdminUser = user?.role === 'admin';
  const pendingUsersCount = isAdminUser ? state.pendingUsers?.filter(u => u.status === 'pending').length : 0;

  React.useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname, search]);

  React.useEffect(() => {
    if (!isMenuOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  const tabs = [
    { path: '/properties', icon: <Building2 size={20} />, label: 'Объекты' },
    { path: '/clients', icon: <Users size={20} />, label: 'Клиенты' },
    { path: '/history', icon: <History size={20} />, label: 'История' },
    { path: '/tasks', icon: <FileCheck size={20} />, label: 'Сделки' },
  ];

  const menuSections = [
    {
      path: '/developments',
      label: 'Новостройки',
      icon: Landmark,
      color: '#0052FF',
      bg: 'rgba(0, 82, 255, 0.1)',
    },
    {
      path: '/',
      label: 'Дашборд',
      icon: LayoutDashboard,
      color: '#0284c7',
      bg: 'rgba(2, 132, 199, 0.1)',
    },
    {
      path: '/properties?filter=selection',
      label: 'Подборки',
      icon: FolderHeart,
      color: '#0891b2',
      bg: 'rgba(8, 145, 178, 0.1)',
    },
    {
      path: '/requests',
      label: 'Запросы',
      icon: Target,
      color: '#7c3aed',
      bg: 'rgba(124, 58, 237, 0.1)',
    },
    {
      path: '/matches',
      label: 'Совпадения',
      icon: Sparkles,
      color: '#d97706',
      bg: 'rgba(217, 119, 6, 0.12)',
    },
    {
      path: '/documents',
      label: 'Документы',
      icon: ClipboardList,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
    },
    {
      path: '/templates',
      label: 'Шаблоны',
      icon: MessageSquareText,
      color: '#ec4899',
      bg: 'rgba(236, 72, 153, 0.1)',
    },
    {
      path: '/profile',
      label: 'Профиль',
      icon: UserCircle,
      color: '#475569',
      bg: 'rgba(71, 85, 105, 0.1)',
      badge: pendingUsersCount > 0 ? pendingUsersCount : null,
    },
  ];

  const isActive = (path) => {
    if (path === '/properties') {
      return pathname.startsWith('/properties') && !search.includes('filter=selection');
    }
    return pathname.startsWith(path);
  };

  const isMenuRouteActive = (itemPath) => {
    if (itemPath === '/') return pathname === '/';
    if (itemPath === '/properties?filter=selection') {
      return (pathname === '/properties' && search.includes('filter=selection')) || pathname.startsWith('/selection');
    }
    return pathname.startsWith(itemPath);
  };

  const isMoreTabActive = isMenuOpen || menuSections.some(s => isMenuRouteActive(s.path));
  const initial = user?.full_name?.charAt(0).toUpperCase() || 'R';

  return (
    <>
      {isMenuOpen && (
        <>
          <div className="mobile-menu-backdrop" onClick={() => setIsMenuOpen(false)} />
          <div className="mobile-menu-sheet" role="dialog" aria-label="Разделы CRM">
            <div className="mobile-menu-handle" />
            <div className="mobile-menu-header">
              <div
                className="mobile-menu-user"
                onClick={() => {
                  setIsMenuOpen(false);
                  navigate('/profile');
                }}
              >
                <div className="mobile-menu-avatar">{initial}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.full_name || 'Риелтор'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {isAdminUser ? 'Администратор' : 'Агент'} - Профиль
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
                  style={{
                    width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                  }}
                >
                  {isDark ? <Sun size={17} /> : <Moon size={17} />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  aria-label="Закрыть меню"
                  style={{
                    width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border)',
                    background: 'var(--bg)', color: 'var(--text-secondary)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                  }}
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="mobile-menu-grid">
              {menuSections.map(item => {
                const Icon = item.icon;
                const active = isMenuRouteActive(item.path);
                return (
                  <button
                    key={item.path}
                    type="button"
                    className={`mobile-menu-tile ${active ? 'active' : ''}`}
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate(item.path);
                    }}
                  >
                    <div
                      className="mobile-menu-tile-icon"
                      style={{ background: item.bg, color: item.color }}
                    >
                      <Icon size={18} />
                    </div>
                    <span className="mobile-menu-tile-label">{item.label}</span>
                    {item.badge && (
                      <span className="mobile-menu-badge">{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      <nav className="bottom-nav">
        {tabs.map(tab => (
          <button
            key={tab.path}
            type="button"
            className={`nav-item ${isActive(tab.path) ? 'active' : ''}`}
            onClick={() => {
              setIsMenuOpen(false);
              navigate(tab.path);
            }}
            style={{
              flex: 1, height: '100%', border: 'none', background: 'transparent',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 2, position: 'relative', padding: '10px 0',
              minWidth: 0,
              color: isActive(tab.path) ? 'var(--primary)' : 'var(--text-muted)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <div style={{
              position: 'relative',
              transform: isActive(tab.path) ? 'translateY(-2px)' : 'translateY(0)',
              transition: 'transform 0.3s ease'
            }}>
              {tab.icon}
            </div>
            <span style={{
              fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
              color: isActive(tab.path) ? 'var(--primary)' : 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              width: '100%',
              textAlign: 'center',
              opacity: isActive(tab.path) ? 1 : 0.75,
            }}>{tab.label}</span>
          </button>
        ))}

        <button
          type="button"
          className={`nav-item ${isMoreTabActive ? 'active' : ''}`}
          onClick={() => setIsMenuOpen(prev => !prev)}
          aria-expanded={isMenuOpen}
          aria-label="Открыть меню разделов"
          style={{
            flex: 1, height: '100%', border: 'none', background: 'transparent',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 2, position: 'relative', padding: '10px 0',
            minWidth: 0,
            color: isMoreTabActive ? 'var(--primary)' : 'var(--text-muted)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <div style={{
            position: 'relative',
            transform: isMoreTabActive ? 'translateY(-2px)' : 'translateY(0)',
            transition: 'transform 0.3s ease'
          }}>
            <LayoutGrid size={20} />
            {pendingUsersCount > 0 && (
              <span style={{
                position: 'absolute', top: -2, right: -2, width: 8, height: 8,
                borderRadius: '50%', background: '#EF4444', border: '2px solid white'
              }} />
            )}
          </div>
          <span style={{
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
            color: isMoreTabActive ? 'var(--primary)' : 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            width: '100%',
            textAlign: 'center',
            opacity: isMoreTabActive ? 1 : 0.75,
          }}>Меню</span>
        </button>
      </nav>
    </>
  );
}

/* ─── Loading ──────────────────────────────────────────────────────────────── */

function LoadingScreen() {
  const [showRetry, setShowRetry] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowRetry(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="loading-screen" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', width: '100vw', position: 'fixed', top: 0, left: 0,
      background: 'radial-gradient(circle at center, var(--surface) 0%, var(--bg) 100%)',
      zIndex: 9999, overflow: 'hidden'
    }}>
      {/* Background Decorative Elements */}
      <div style={{ 
          position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', 
          background: 'radial-gradient(circle, rgba(0, 82, 255, 0.05) 0%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none'
      }} />
      <div style={{ 
          position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%', 
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.05) 0%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none'
      }} />

      <div style={{ width: 140, height: 4, background: 'var(--border)', borderRadius: 10, overflow: 'hidden', position: 'relative' }}>
        <div className="loading-progress" style={{ 
            position: 'absolute', height: '100%', width: '40%', 
            background: 'linear-gradient(90deg, var(--primary) 0%, #3b82f6 100%)',
            borderRadius: 10, animation: 'loading-slide 1.5s infinite ease-in-out'
        }} />
      </div>

      <p className="font-oswald" style={{ 
          marginTop: 20, color: 'var(--text-secondary)', fontSize: 13, fontWeight: 200, 
          textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.6,
          fontFamily: "'Medeo Sans', ui-sans-serif, sans-serif"
      }}>Загрузка данных</p>
      
      {showRetry && (
        <div style={{ 
            marginTop: 48, textAlign: 'center', padding: '0 32px', maxWidth: 400,
            animation: 'fadeIn 0.8s ease'
        }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.6 }}>
            Загрузка занимает больше времени, чем обычно. Попробуйте обновить страницу.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button 
              className="card-clickable"
              style={{ 
                  height: 52, borderRadius: 16, border: 'none', background: 'var(--primary)', 
                  color: 'white', fontWeight: 600, fontSize: 14, boxShadow: '0 8px 24px rgba(0, 82, 255, 0.2)',
                  textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'Medeo Sans', ui-sans-serif, sans-serif"
              }}
              onClick={() => window.location.reload()}
            >
              Обновить страницу
            </button>
            <button 
              className="card-clickable"
              style={{ 
                  height: 52, borderRadius: 16, border: '1px solid var(--border)', 
                  background: 'var(--surface)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13
              }}
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }}
            >
              Очистить кэш
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes loading-slide {
          0% { left: -40%; }
          100% { left: 100%; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ─── Guards ───────────────────────────────────────────────────────────────── */

function RequireAuth({ children }) {
  const { state } = useApp();
  if (state.loading) return <LoadingScreen />;
  if (!state.currentUser) return <Navigate to="/login" replace />;
  return children;
}

/* ─── Layout ───────────────────────────────────────────────────────────────── */

function AppLayout({ children }) {
  const { pathname } = useLocation();
  const noNav = ['/login', '/register', '/update-password', '/compare'].includes(pathname) || pathname.startsWith('/p/') || pathname.startsWith('/c/') || pathname.startsWith('/chat/');

  return (
    <div className="app-layout">
      {!noNav && <DesktopSidebar />}
      <main className="app-main">
        {children}
      </main>
      {!noNav && <BottomNav />}
      {!noNav && <QuickActionFab />}
      {!noNav && <CommandPalette />}
    </div>
  );
}

/* ─── Routes ───────────────────────────────────────────────────────────────── */

function AppRoutes() {
  useMatchNotifications();

  return (
    <Suspense fallback={<LoadingScreen />}>
      <AppLayout>
        <Routes>
          {/* Auth */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/update-password" element={<UpdatePasswordPage />} />

          {/* Protected */}
          <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />

          {/* Clients */}
          <Route path="/clients" element={<RequireAuth><ClientsPage /></RequireAuth>} />
          <Route path="/clients/new" element={<RequireAuth><ClientFormPage /></RequireAuth>} />
          <Route path="/clients/:id" element={<RequireAuth><ClientCardPage /></RequireAuth>} />
          <Route path="/clients/:id/edit" element={<RequireAuth><ClientFormPage /></RequireAuth>} />

          {/* Properties */}
          <Route path="/properties" element={<RequireAuth><PropertiesPage /></RequireAuth>} />
          <Route path="/properties/new" element={<RequireAuth><PropertyFormPage /></RequireAuth>} />
          <Route path="/properties/:id" element={<RequireAuth><PropertyCardPage /></RequireAuth>} />
          <Route path="/properties/:id/edit" element={<RequireAuth><PropertyFormPage /></RequireAuth>} />
          <Route path="/properties/:id/estimate" element={<RequireAuth><EstimationPage /></RequireAuth>} />

          {/* Selection */}
          <Route path="/selection" element={<Navigate to="/properties?filter=selection" replace />} />
          <Route path="/selection/new" element={<RequireAuth><SelectionFormPage /></RequireAuth>} />
          <Route path="/selection/:id/edit" element={<RequireAuth><SelectionFormPage /></RequireAuth>} />

          {/* Developments / Новостройки г. Кирова */}
          <Route path="/developments" element={<RequireAuth><DevelopmentsPage /></RequireAuth>} />

          {/* Requests */}
          <Route path="/requests" element={<RequireAuth><RequestsPage /></RequireAuth>} />
          <Route path="/requests/new" element={<RequireAuth><RequestFormPage /></RequireAuth>} />
          <Route path="/requests/:id" element={<RequireAuth><RequestCardPage /></RequireAuth>} />
          <Route path="/requests/:id/edit" element={<RequireAuth><RequestFormPage /></RequireAuth>} />

          {/* Matches */}
          <Route path="/matches" element={<RequireAuth><MatchesPage /></RequireAuth>} />
          <Route path="/matches/:id" element={<RequireAuth><MatchDetailPage /></RequireAuth>} />

          {/* History */}
          <Route path="/history" element={<RequireAuth><HistoryPage /></RequireAuth>} />
          <Route path="/history/new" element={<RequireAuth><HistoryFormPage /></RequireAuth>} />
          <Route path="/history/:id" element={<RequireAuth><HistoryDetailsPage /></RequireAuth>} />

          {/* Tasks */}
          <Route path="/tasks" element={<RequireAuth><TasksPage /></RequireAuth>} />
          <Route path="/tasks/new" element={<Navigate to="/history/new" replace />} />
          <Route path="/tasks/meeting-owner" element={<RequireAuth><MeetingOwnerFormPage /></RequireAuth>} />
          <Route path="/tasks/call" element={<RequireAuth><CallFormPage /></RequireAuth>} />

          {/* Messaging */}
          <Route path="/templates" element={<RequireAuth><TemplatesPage /></RequireAuth>} />
          <Route path="/p/:slug" element={<PublicPropertyPage />} />
          <Route path="/c/:token" element={<PublicClientPage />} />
          <Route path="/chat/:token" element={<PublicChatPage />} />
          <Route path="/chat/:dealId/:side" element={<PublicChatPage />} />
          <Route path="/compare" element={<RequireAuth><ComparePage /></RequireAuth>} />
          <Route path="/documents" element={<RequireAuth><DocumentsPage /></RequireAuth>} />
          <Route path="/debug" element={<RequireAdmin><DebugPage /></RequireAdmin>} />

          {/* Profile — доступно всем, но админские функции защищены внутри компонента */}
          <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </Suspense>
  );
}

/* ─── Root ─────────────────────────────────────────────────────────────────── */

export default function App() {
  // Восстановление темы до рендера (без мерцания)
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    /*
     * Порядок провайдеров важен:
     *  1. ErrorBoundary   — перехватывает ошибки рендера всего дерева
     *  2. ToastProvider   — создаёт toast API (нужен AppProvider)
     *  3. AppProvider     — использует toast из ToastProvider
     *  4. HashRouter      — должен быть внутри, чтобы хуки роутинга работали
     */
    <ErrorBoundary>
      <ToastProvider>
        <AppProvider>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </AppProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
