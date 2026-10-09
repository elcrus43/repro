import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  Building2, 
  Users, 
  FileCheck, 
  UserCircle, 
  History, 
  LayoutDashboard, 
  Sparkles, 
  ClipboardList, 
  Sun, 
  Moon,
  FolderHeart
} from 'lucide-react';

export function DesktopSidebar() {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { state } = useApp();
  const user = state.currentUser;

  const [isDark, setIsDark] = useState(() => {
    return document.documentElement.classList.contains('dark') || localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

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

  const isAdminUser = user?.role === 'admin';
  const pendingUsersCount = isAdminUser ? state.pendingUsers?.filter(u => u.status === 'pending').length : 0;
  const newMatchCount = state.matches.filter(m => m.realtor_id === user?.id && m.status === 'new').length;

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Дашборд' },
    { path: '/properties', icon: Building2, label: 'Объекты' },
    { path: '/properties?filter=selection', icon: FolderHeart, label: 'Подборки' },
    { path: '/clients', icon: Users, label: 'Клиенты' },
    { path: '/tasks', icon: FileCheck, label: 'Сделки' },
    { path: '/history', icon: History, label: 'История' },
    { path: '/matches', icon: Sparkles, label: 'Матчинг', badge: newMatchCount > 0 ? newMatchCount : null },
    { path: '/documents', icon: ClipboardList, label: 'Документы' },
    { path: '/profile', icon: UserCircle, label: 'Профиль', badge: pendingUsersCount > 0 ? pendingUsersCount : null },
  ];

  const isActive = (itemPath) => {
    if (itemPath === '/') {
      return pathname === '/';
    }
    if (itemPath === '/properties?filter=selection') {
      return pathname === '/properties' && search.includes('filter=selection');
    }
    if (itemPath === '/properties') {
      return pathname.startsWith('/properties') && !search.includes('filter=selection');
    }
    return pathname.startsWith(itemPath.split('?')[0]);
  };

  const initial = user?.full_name?.charAt(0).toUpperCase() || 'R';

  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand" onClick={() => navigate('/')}>
        <div className="sidebar-logo">
          <Building2 size={22} color="#ffffff" />
        </div>
        <div className="sidebar-brand-text">
          <span className="sidebar-title">Re-Pro</span>
          <span className="sidebar-subtitle">CRM Платформа</span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="sidebar-nav">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              type="button"
              className={`sidebar-nav-item ${active ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <div className="sidebar-item-icon">
                <Icon size={19} />
              </div>
              <span className="sidebar-item-label">{item.label}</span>
              {item.badge && (
                <span className="sidebar-item-badge">{item.badge}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer / User Profile & Theme */}
      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={() => navigate('/profile')}>
          <div className="sidebar-avatar">{initial}</div>
          <div className="sidebar-user-meta">
            <span className="sidebar-user-name">{user?.full_name || 'Риелтор'}</span>
            <span className="sidebar-user-role">
              {isAdminUser ? 'Администратор' : 'Агент'}
            </span>
          </div>
        </div>

        <button 
          type="button"
          className="sidebar-theme-toggle" 
          onClick={toggleTheme} 
          title={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </div>
    </aside>
  );
}
