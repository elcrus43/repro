import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { RequireAdmin } from './components/RequireAdmin';
import { Building2, Users, Sparkles, FileCheck, UserCircle } from 'lucide-react';

// Pages - lazy loaded for code splitting
const LoginPage = lazy(() => import('./pages/Auth/AuthPages').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/Auth/AuthPages').then(m => ({ default: m.RegisterPage })));
const AuthCallbackPage = lazy(() => import('./pages/Auth/AuthCallback'));
const UpdatePasswordPage = lazy(() => import('./pages/Auth/UpdatePasswordPage'));
const DashboardPage = lazy(() => import('./pages/Dashboard/DashboardPage'));
const ClientsPage = lazy(() => import('./pages/Clients/index.js'));
const ClientCardPage = lazy(() => import('./pages/Clients/index.js').then(m => ({ default: m.ClientCardPage })));
const ClientFormPage = lazy(() => import('./pages/Clients/index.js').then(m => ({ default: m.ClientFormPage })));
const PropertiesPage = lazy(() => import('./pages/Properties/index.js'));
const PropertyCardPage = lazy(() => import('./pages/Properties/index.js').then(m => ({ default: m.PropertyCardPage })));
const PropertyFormPage = lazy(() => import('./pages/Properties/index.js').then(m => ({ default: m.PropertyFormPage })));
const PublicPropertyPage = lazy(() => import('./pages/Properties/index.js').then(m => ({ default: m.PublicPropertyPage })));
const RequestsPage = lazy(() => import('./pages/Requests/index.js'));
const RequestCardPage = lazy(() => import('./pages/Requests/index.js').then(m => ({ default: m.RequestCardPage })));
const RequestFormPage = lazy(() => import('./pages/Requests/index.js').then(m => ({ default: m.RequestFormPage })));
const MatchesPage = lazy(() => import('./pages/Matches/MatchesPages'));
const MatchDetailPage = lazy(() => import('./pages/Matches/MatchesPages').then(m => ({ default: m.MatchDetailPage })));
const ShowingsPage = lazy(() => import('./pages/Showings/index.js'));
const ShowFormPage = lazy(() => import('./pages/Showings/index.js').then(m => ({ default: m.ShowFormPage })));
const ShowDetailsPage = lazy(() => import('./pages/Showings/index.js').then(m => ({ default: m.ShowDetailsPage })));
const TasksPage = lazy(() => import('./pages/Tasks/DealsPage'));
const MeetingOwnerFormPage = lazy(() => import('./pages/Tasks/MeetingOwnerFormPage').then(m => ({ default: m.MeetingOwnerFormPage })));
const CallFormPage = lazy(() => import('./pages/Tasks/CallFormPage').then(m => ({ default: m.CallFormPage })));
const ProfilePage = lazy(() => import('./pages/Profile/ProfilePage'));
const EstimationPage = lazy(() => import('./pages/Properties/EstimationPage'));
const TemplatesPage = lazy(() => import('./pages/Messaging/TemplatesPage'));
import { useMatchNotifications } from './hooks/useMatchNotifications';

/* ─── BottomNav ────────────────────────────────────────────────────────────── */

function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { state } = useApp();

  const newMatchCount = state.matches.filter(m => m.realtor_id === state.currentUser?.id && m.status === 'new').length;
  const isAdminUser = state.currentUser?.role === 'admin';
  const pendingUsersCount = isAdminUser ? state.pendingUsers?.filter(u => u.status === 'pending').length : 0;

  const tabs = [
    { path: '/properties', icon: <Building2 size={22} />, label: 'Объекты' },
    { path: '/clients', icon: <Users size={22} />, label: 'Клиенты' },
    { path: '/matches', icon: <Sparkles size={22} />, label: 'Совпадения', badge: newMatchCount > 0 },
    { path: '/tasks', icon: <FileCheck size={22} />, label: 'Сделки' },
    { path: '/profile', icon: <UserCircle size={22} />, label: 'Профиль', badge: pendingUsersCount > 0 },
  ];

  const isActive = (path) => pathname.startsWith(path);

  return (
    <nav className="bottom-nav">
      {tabs.map(tab => (
        <button
          key={tab.path}
          className={`nav-item ${isActive(tab.path) ? 'active' : ''}`}
          onClick={() => navigate(tab.path)}
        >
          <span className="nav-icon">
            {tab.icon}
            {tab.badge && <span className="nav-badge" />}
          </span>
          <span className="nav-label">{tab.label}</span>
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
      background: 'var(--surface)', zIndex: 9999
    }}>
      <div className="loading-logo" style={{ 
        fontSize: 48, fontWeight: 900, letterSpacing: -2, color: 'var(--primary)',
        animation: 'pulse 2s infinite ease-in-out'
      }}>REM</div>
      <div className="loading-bar" style={{ width: 120, height: 4, background: 'var(--bg)', borderRadius: 2, marginTop: 24, overflow: 'hidden' }}>
        <div className="loading-progress" />
      </div>
      <p style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: 13, fontWeight: 500, opacity: 0.8 }}>Загрузка данных...</p>
      
      {showRetry && (
        <div style={{ marginTop: 40, textAlign: 'center', animation: 'fadeIn 0.5s ease' }}>
          <p style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 12 }}>Загрузка затянулась</p>
          <button 
            className="btn btn-secondary" 
            style={{ minHeight: 36, fontSize: 12 }}
            onClick={() => window.location.reload()}
          >
            Перезагрузить
          </button>
        </div>
      )}
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
  const noNav = ['/login', '/register', '/auth/callback', '/update-password'].includes(pathname) || pathname.startsWith('/p/');

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

          {/* Showings */}
          <Route path="/showings" element={<RequireAuth><ShowingsPage /></RequireAuth>} />
          <Route path="/showings/new" element={<RequireAuth><ShowFormPage /></RequireAuth>} />
          <Route path="/showings/:id" element={<RequireAuth><ShowDetailsPage /></RequireAuth>} />

          {/* Tasks */}
          <Route path="/tasks" element={<RequireAuth><TasksPage /></RequireAuth>} />
          <Route path="/tasks/meeting-owner" element={<RequireAuth><MeetingOwnerFormPage /></RequireAuth>} />
          <Route path="/tasks/call" element={<RequireAuth><CallFormPage /></RequireAuth>} />

          {/* Messaging */}
          <Route path="/templates" element={<RequireAuth><TemplatesPage /></RequireAuth>} />
          <Route path="/p/:slug" element={<PublicPropertyPage />} />

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
     *  4. BrowserRouter   — должен быть внутри, чтобы хуки роутинга работали
     */
    <ErrorBoundary>
      <ToastProvider>
        <AppProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AppProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
