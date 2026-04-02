import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { Building2, Users, Sparkles, CheckSquare, UserCircle } from 'lucide-react';

// Pages
import { LoginPage, RegisterPage }                                from './pages/Auth/AuthPages';
import { DashboardPage }                                          from './pages/Dashboard/DashboardPage';
import { ClientsPage, ClientCardPage, ClientFormPage }            from './pages/Clients';
import { PropertiesPage, PropertyCardPage, PropertyFormPage, PublicPropertyPage }     from './pages/Properties';
import { RequestsPage, RequestCardPage, RequestFormPage }         from './pages/Requests';
import { MatchesPage, MatchDetailPage }                           from './pages/Matches/MatchesPages';
import { ShowingsPage, ShowFormPage, ShowDetailsPage }       from './pages/Showings';
import { TasksPage }                                              from './pages/Tasks/TasksPage';
import { ProfilePage }                                            from './pages/Profile/ProfilePage';
import { EstimationPage }                                         from './pages/Properties/EstimationPage';
import { TemplatesPage }                                          from './pages/Messaging/TemplatesPage';
import { useMatchNotifications }                                  from './hooks/useMatchNotifications';

/* ─── BottomNav ────────────────────────────────────────────────────────────── */

function BottomNav() {
  const navigate  = useNavigate();
  const { pathname } = useLocation();
  const { state } = useApp();

  const newMatchCount    = state.matches.filter(m => m.realtor_id === state.currentUser?.id && m.status === 'new').length;
  const isAdminUser      = state.currentUser?.role === 'admin';
  const pendingUsersCount = isAdminUser ? state.pendingUsers?.filter(u => u.status === 'pending').length : 0;

  const tabs = [
    { path: '/properties', icon: <Building2 size={22} />, label: 'Продажи' },
    { path: '/clients',    icon: <Users size={22} />,     label: 'Клиенты' },
    { path: '/matches',    icon: <Sparkles size={22} />,  label: 'Матчи',   badge: newMatchCount > 0 },
    { path: '/tasks',      icon: <CheckSquare size={22} />, label: 'Задачи' },
    { path: '/profile',    icon: <UserCircle size={22} />, label: 'Профиль', badge: pendingUsersCount > 0 },
  ];

  const isActive = (path) => pathname.startsWith(path);

  return (
    <nav className="bottom-nav">
      {tabs.map(tab => (
        <button
          key={tab.path}
          className={`nav-tab ${isActive(tab.path) ? 'active' : ''}`}
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
  return (
    <div className="loading-screen">
      <div className="loading-logo">R</div>
      <p>Загрузка...</p>
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
  const noNav = ['/login', '/register'].includes(pathname) || pathname.startsWith('/p/');

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
    <AppLayout>
      <Routes>
        {/* Auth */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected */}
        <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />

        {/* Clients */}
        <Route path="/clients"              element={<RequireAuth><ClientsPage /></RequireAuth>} />
        <Route path="/clients/new"          element={<RequireAuth><ClientFormPage /></RequireAuth>} />
        <Route path="/clients/:id"          element={<RequireAuth><ClientCardPage /></RequireAuth>} />
        <Route path="/clients/:id/edit"     element={<RequireAuth><ClientFormPage /></RequireAuth>} />

        {/* Properties */}
        <Route path="/properties"           element={<RequireAuth><PropertiesPage /></RequireAuth>} />
        <Route path="/properties/new"       element={<RequireAuth><PropertyFormPage /></RequireAuth>} />
        <Route path="/properties/:id"       element={<RequireAuth><PropertyCardPage /></RequireAuth>} />
        <Route path="/properties/:id/edit"  element={<RequireAuth><PropertyFormPage /></RequireAuth>} />
        <Route path="/properties/:id/estimate" element={<RequireAuth><EstimationPage /></RequireAuth>} />

        {/* Requests */}
        <Route path="/requests"             element={<RequireAuth><RequestsPage /></RequireAuth>} />
        <Route path="/requests/new"         element={<RequireAuth><RequestFormPage /></RequireAuth>} />
        <Route path="/requests/:id"         element={<RequireAuth><RequestCardPage /></RequireAuth>} />
        <Route path="/requests/:id/edit"    element={<RequireAuth><RequestFormPage /></RequireAuth>} />

        {/* Matches */}
        <Route path="/matches"              element={<RequireAuth><MatchesPage /></RequireAuth>} />
        <Route path="/matches/:id"          element={<RequireAuth><MatchDetailPage /></RequireAuth>} />

        {/* Showings */}
        <Route path="/showings"             element={<RequireAuth><ShowingsPage /></RequireAuth>} />
        <Route path="/showings/new"         element={<RequireAuth><ShowFormPage /></RequireAuth>} />
        <Route path="/showings/:id"         element={<RequireAuth><ShowDetailsPage /></RequireAuth>} />

        {/* Tasks */}
        <Route path="/tasks"                element={<RequireAuth><TasksPage /></RequireAuth>} />

        {/* Messaging */}
        <Route path="/templates"            element={<RequireAuth><TemplatesPage /></RequireAuth>} />
        <Route path="/p/:slug"              element={<PublicPropertyPage />} />

        {/* Profile */}
        <Route path="/profile"              element={<RequireAuth><ProfilePage /></RequireAuth>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
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
