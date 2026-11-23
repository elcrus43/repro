import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { BrandLogo } from './BrandLogo';
import { 
  Building2, 
  Users, 
  FileCheck, 
  UserCircle, 
  History, 
  LayoutDashboard, 
  ClipboardList, 
  Sun, 
  Moon,
  Landmark,
  Search,
  Target,
  Megaphone
} from 'lucide-react';

export function DesktopSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
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

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Дашборд' },
    { path: '/properties', icon: Building2, label: 'Объекты' },
    { path: '/developments', icon: Landmark, label: 'Новостройки' },
    { path: '/requests', icon: Target, label: 'Подбор' },
    { path: '/clients', icon: Users, label: 'Клиенты' },
    { path: '/tasks', icon: FileCheck, label: 'Сделки' },
    { path: '/history', icon: History, label: 'История' },
    { path: '/documents', icon: ClipboardList, label: 'Документы' },
    { path: '/ads', icon: Megaphone, label: 'Реклама' },
    { path: '/profile', icon: UserCircle, label: 'Профиль', badge: pendingUsersCount > 0 ? pendingUsersCount : null },
  ];

  const isActive = (itemPath) => {
    if (itemPath === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(itemPath.split('?')[0]);
  };

  const initial = user?.full_name?.charAt(0).toUpperCase() || 'R';

  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand" onClick={() => navigate('/')}>
        <BrandLogo height={32} />
      </div>

      {/* Quick 1-Click Search & Command Trigger */}
      <div className="sidebar-search-container">
        <button 
          type="button" 
          className="sidebar-search-btn"
          onClick={() => window.dispatchEvent(new CustomEvent('open-command-palette'))}
          title="Быстрый поиск и действия (Ctrl+K)"
        >
          <Search size={16} className="sidebar-search-icon" />
          <span className="sidebar-search-text">Поиск и действия</span>
          <kbd className="sidebar-search-kbd">Ctrl+K</kbd>
        </button>
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
