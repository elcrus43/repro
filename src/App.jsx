import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Building2, Users, Sparkles, CheckSquare, UserCircle } from 'lucide-react';

// Pages
import { LoginPage, RegisterPage } from './pages/Auth/AuthPages';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { ClientsPage, ClientCardPage, ClientFormPage } from './pages/Clients/ClientsPages';
import { PropertiesPage, PropertyCardPage, PropertyFormPage } from './pages/Properties/PropertiesPages';
import { RequestsPage, RequestCardPage, RequestFormPage } from './pages/Requests/RequestsPages';
import { MatchesPage, MatchDetailPage } from './pages/Matches/MatchesPages';
import { ShowingsPage } from './pages/Showings/ShowingsPage';
import { ShowFormPage } from './pages/Showings/ShowFormPage';
import { TasksPage } from './pages/Tasks/TasksPage';
import { ProfilePage } from './pages/Profile/ProfilePage';

function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { state } = useApp();

  const newMatchCount = state.matches.filter(m => m.realtor_id === state.currentUser?.id && m.status === 'new').length;

  const tabs = [
    { path: '/properties', icon: <Building2 size={22} />, label: 'Объекты' },
    { path: '/clients', icon: <Users size={22} />, label: 'Клиенты' },
    { path: '/matches', icon: <Sparkles size={22} />, label: 'Матчи', badge: newMatchCount > 0 },
    { path: '/tasks', icon: <CheckSquare size={22} />, label: 'Задачи' },
    { path: '/profile', icon: <UserCircle size={22} />, label: 'Профиль' },
  ];

  const isActive = (path) => pathname.startsWith(path);

  return (
    <nav className="bottom-nav">
      {tabs.map(tab => (
        <button key={tab.path} className={`nav-item ${isActive(tab.path) ? 'active' : ''}`} onClick={() => navigate(tab.path)}>
          <span className={`nav-icon ${tab.badge ? 'nav-badge' : ''}`}>{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

function LoadingScreen() {
  return (
    <div style={{
      height: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#ffffff',
      color: 'var(--text)', gap: 16
    }}>
      <div className="sidebar-logo">
        <div className="avatar" style={{ background: 'var(--primary)', color: 'white' }}>REM</div>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>REM</div>
      </div>
      <div style={{ fontSize: 14, opacity: 0.7 }}>Загрузка...</div>
    </div>
  );
}

function RequireAuth({ children }) {
  const { state } = useApp();
  if (state.loading) return <LoadingScreen />;
  if (!state.currentUser) return <Navigate to="/login" replace />;
  return children;
}

function AppLayout({ children }) {
  const { pathname } = useLocation();
  const noNav = ['/login', '/register'].includes(pathname);
  return (
    <>
      {children}
      {!noNav && <BottomNav />}
    </>
  );
}

function AppRoutes() {
  return (
    <AppLayout>
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

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

        {/* Tasks */}
        <Route path="/tasks" element={<RequireAuth><TasksPage /></RequireAuth>} />

        {/* Profile */}
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}

export default function App() {
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}
