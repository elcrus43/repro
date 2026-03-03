import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

export function ProfilePage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const user = state.currentUser;
    if (!user) return null;

    const myClients = state.clients.filter(c => c.realtor_id === user.id);
    const myProperties = state.properties.filter(p => p.realtor_id === user.id);
    const myRequests = state.requests.filter(r => r.realtor_id === user.id);
    const myMatches = state.matches.filter(m => m.realtor_id === user.id);
    const deals = myMatches.filter(m => m.status === 'deal').length;
    const conversion = myMatches.length > 0 ? ((deals / myMatches.length) * 100).toFixed(1) : 0;
    const initials = user.full_name?.split(' ').slice(0, 2).map(w => w[0]).join('') || '?';

    const menuItems = [
        { icon: '→', label: 'Настройки', action: () => { } },
        { icon: '→', label: 'Уведомления', action: () => { } },
        { icon: '→', label: 'Экспорт данных', action: () => { } },
        { icon: '→', label: 'Помощь', action: () => { } },
    ];

    async function handleLogout() {
        if (window.confirm('Выйти из аккаунта?')) {
            await supabase.auth.signOut();
            dispatch({ type: 'LOGOUT' });
            navigate('/login');
        }
    }

    function clearData() {
        if (window.confirm('Сбросить все данные? Это удалит всё и вернёт демо-данные.')) {
            localStorage.removeItem('realtor-match-state');
            window.location.reload();
        }
    }

    return (
        <div className="page fade-in">
            <div className="topbar">
                <span className="topbar-title">Профиль</span>
            </div>
            <div className="page-content">
                {/* Avatar & Info */}
                <div className="card" style={{ textAlign: 'center', padding: '28px 16px' }}>
                    <div className="avatar avatar-lg" style={{ margin: '0 auto 12px', fontSize: 32 }}>{initials}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>{user.full_name}</div>
                    {user.agency_name && <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>{user.agency_name}</div>}
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user.email}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user.phone}</div>
                    <span className="badge badge-primary" style={{ marginTop: 8 }}>{user.role === 'admin' ? 'Администратор' : 'Риэлтор'}</span>
                </div>

                {/* Stats */}
                <div className="card">
                    <div className="section-title" style={{ marginBottom: 12 }}>Статистика</div>
                    <div className="stats-grid">
                        <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>{myClients.length}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Клиентов</div>
                        </div>
                        <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>{myProperties.length}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Объектов</div>
                        </div>
                        <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>{myRequests.length}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Запросов</div>
                        </div>
                        <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--success)' }}>{deals}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Сделок</div>
                        </div>
                    </div>
                    <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 600 }}>Конверсия</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)' }}>{conversion}%</span>
                    </div>
                </div>

                {/* Menu */}
                <div className="card" style={{ padding: 0 }}>
                    {menuItems.map((item, i) => (
                        <button key={item.label} onClick={item.action} style={{
                            display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px',
                            border: 'none', background: 'none', cursor: 'pointer',
                            borderBottom: i < menuItems.length - 1 ? '1px solid var(--border-light)' : 'none',
                            textAlign: 'left', fontSize: 15
                        }}>
                            <span style={{ fontSize: 20 }}>{item.icon}</span>
                            <span style={{ flex: 1 }}>{item.label}</span>
                            <span style={{ color: 'var(--text-muted)' }}>›</span>
                        </button>
                    ))}
                </div>

                {/* Dev */}
                <div className="card" style={{ padding: 0 }}>
                    <button onClick={clearData} style={{
                        display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px',
                        border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', textAlign: 'left', fontSize: 15
                    }}>
                        <span style={{ fontSize: 20 }}>R</span>
                        <span style={{ flex: 1 }}>Сбросить демо-данные</span>
                        <span style={{ color: 'var(--text-muted)' }}>›</span>
                    </button>
                    <button onClick={handleLogout} style={{
                        display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px',
                        border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 15,
                        color: 'var(--danger)'
                    }}>
                        <span style={{ fontSize: 20 }}>X</span>
                        <span>Выйти</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
