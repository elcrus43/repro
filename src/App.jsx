import React, { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { RequireAdmin } from './components/RequireAdmin';
import { Building2, Users, Sparkles, FileCheck, UserCircle, History, Bell } from 'lucide-react';

// Pages - lazy loaded for code splitting
const LoginPage = lazy(() => import('./pages/Auth/AuthPages').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/Auth/AuthPages').then(m => ({ default: m.RegisterPage })));
const AuthCallbackPage = lazy(() => import('./pages/Auth/AuthCallback'));
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
const RemindersPage = lazy(() => import('./pages/Tasks/RemindersPage'));
import { useMatchNotifications } from './hooks/useMatchNotifications';

/* ─── BottomNav ────────────────────────────────────────────────────────────── */

function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { state } = useApp();

  const newMatchCount = state.matches.filter(m => m.realtor_id === state.currentUser?.id && m.status === 'new').length;
  const isAdminUser = state.currentUser?.role === 'admin';
  const pendingUsersCount = isAdminUser ? state.pendingUsers?.filter(u => u.status === 'pending').length : 0;
  const overdueTasksCount = state.tasks.filter(t => {
    const toLocalDateStr = (dateOrStr) => {
      if (!dateOrStr) return '';
      const d = new Date(dateOrStr);
      if (isNaN(d.getTime())) return '';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const today = toLocalDateStr(new Date());
    return toLocalDateStr(t.due_date) < today && t.status !== 'done' && t.realtor_id === state.currentUser?.id;
  }).length;

  const tabs = [
    { path: '/properties', icon: <Building2 size={22} />, label: 'Объекты' },
    { path: '/clients', icon: <Users size={22} />, label: 'Клиенты' },
    { path: '/matches', icon: <Sparkles size={22} />, label: 'Совпадения', badge: newMatchCount > 0 },
    { path: '/history', icon: <History size={22} />, label: 'История' },
    { path: '/tasks', icon: <FileCheck size={22} />, label: 'Сделки' },
    { path: '/reminders', icon: <Bell size={22} />, label: 'Задачи', badge: overdueTasksCount > 0 },
    { path: '/profile', icon: <UserCircle size={22} />, label: 'Профиль', badge: pendingUsersCount > 0 },
  ];

  const isActive = (path) => pathname.startsWith(path);

  return (
    <nav className="bottom-nav" style={{ 
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430,
        height: 'calc(76px + env(safe-area-inset-bottom))', 
        background: 'var(--nav-bg)', backdropFilter: 'blur(24px) saturate(180%)',
        borderTop: '1px solid var(--nav-border)',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        padding: `0 4px calc(12px + env(safe-area-inset-bottom))`, zIndex: 1000,
        boxShadow: '0 -10px 40px rgba(0,0,0,0.05)'
    }}>
      {tabs.map(tab => (
        <button
          key={tab.path}
          className={`nav-item ${isActive(tab.path) ? 'active' : ''}`}
          onClick={() => navigate(tab.path)}
          style={{ 
              flex: 1, height: '100%', border: 'none', background: 'transparent',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 2, position: 'relative', padding: '12px 0',
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
            {React.cloneElement(tab.icon, { size: 20 })}
            {tab.badge && (
                <span style={{ 
                    position: 'absolute', top: -2, right: -2, width: 8, height: 8, 
                    borderRadius: '50%', background: '#EF4444', border: '2px solid white' 
                }} />
            )}
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
    </nav>
  );
}

/* ─── Loading ──────────────────────────────────────────────────────────────── */

function LoadingScreen() {
  const [showRetry, setShowRetry] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowRetry(true), 8000);
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

      <div className="font-oswald" style={{ 
        fontSize: 48, fontWeight: 600, letterSpacing: '-0.04em', color: 'var(--primary)',
        textTransform: 'uppercase', marginBottom: 24, position: 'relative',
        animation: 'pulse 2s infinite ease-in-out'
      }}>
        <Building2 size={48} />
        <div style={{ 
            position: 'absolute', bottom: -4, left: 0, width: '100%', height: 6, 
            background: 'var(--primary)', opacity: 0.1, borderRadius: 3
        }} />
      </div>

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
          fontFamily: "'Oswald', sans-serif"
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
                  textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'Oswald', sans-serif"
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
  const noNav = ['/login', '/register', '/auth/callback', '/update-password', '/compare', '/documents'].includes(pathname) || pathname.startsWith('/p/') || pathname.startsWith('/c/');

  return (
    <div className="app-layout">
      {children}
      {!noNav && <BottomNav />}
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
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
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
          <Route path="/tasks/meeting-owner" element={<RequireAuth><MeetingOwnerFormPage /></RequireAuth>} />
          <Route path="/tasks/call" element={<RequireAuth><CallFormPage /></RequireAuth>} />
          <Route path="/reminders" element={<RequireAuth><RemindersPage /></RequireAuth>} />

          {/* Messaging */}
          <Route path="/templates" element={<RequireAuth><TemplatesPage /></RequireAuth>} />
          <Route path="/p/:slug" element={<PublicPropertyPage />} />
          <Route path="/c/:token" element={<PublicClientPage />} />
          <Route path="/compare" element={<RequireAuth><ComparePage /></RequireAuth>} />
          <Route path="/documents" element={<RequireAuth><DocumentsPage /></RequireAuth>} />
          <Route path="/debug" element={<DebugPage />} />

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
