import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { Settings, Bell, DownloadCloud, CircleHelp, Moon, Sun, ArrowRight, RotateCcw, LogOut, Edit2, UserCheck, UserX } from 'lucide-react';


export function ProfilePage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const [deferredPrompt, setDeferredPrompt] = React.useState(null);
    const [isInstalled, setIsInstalled] = React.useState(false);
    const [pendingUsers, setPendingUsers] = React.useState([]);
    const [loadingUsers, setLoadingUsers] = React.useState(false);

    React.useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
        });
        if (window.matchMedia('(display-mode: standalone)').matches) setIsInstalled(true);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const user = state.currentUser;
    const isAdmin = user?.role === 'admin';

    React.useEffect(() => {
        if (isAdmin) {
            setLoadingUsers(true);
            supabase.from('profiles').select('*').in('status', ['pending', 'rejected'])
                .then(({ data }) => { setPendingUsers(data || []); setLoadingUsers(false); });
        }
    }, [isAdmin]);

    async function handleApprove(profileId) {
        await supabase.from('profiles').update({ status: 'approved' }).eq('id', profileId);
        setPendingUsers(u => u.filter(p => p.id !== profileId));
    }

    async function handleReject(profileId) {
        await supabase.from('profiles').update({ status: 'rejected' }).eq('id', profileId);
        setPendingUsers(u => u.map(p => p.id === profileId ? { ...p, status: 'rejected' } : p));
    }

    async function handleInstall() {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setDeferredPrompt(null);
    }

    if (!user) return null;

    const [isEditing, setIsEditing] = React.useState(false);
    const [editData, setEditData] = React.useState({ full_name: user?.full_name || '', phone: user?.phone || '', agency_name: user?.agency_name || '' });

    React.useEffect(() => {
        if (user) setEditData({ full_name: user.full_name || '', phone: user.phone || '', agency_name: user.agency_name || '' });
    }, [user]);

    const handleSave = () => {
        dispatch({ type: 'UPDATE_PROFILE', profile: { ...user, ...editData } });
        setIsEditing(false);
    };

    const myClients = state.clients.filter(c => c.realtor_id === user.id);
    const myProperties = state.properties.filter(p => p.realtor_id === user.id);
    const myRequests = state.requests.filter(r => r.realtor_id === user.id);
    const myMatches = state.matches.filter(m => m.realtor_id === user.id);
    const deals = myMatches.filter(m => m.status === 'deal').length;
    const conversion = myMatches.length > 0 ? ((deals / myMatches.length) * 100).toFixed(1) : 0;

    const [isDark, setIsDark] = React.useState(() => document.documentElement.classList.contains('dark'));

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

    const menuItems = [
        { icon: isDark ? <Sun size={20} /> : <Moon size={20} />, label: isDark ? 'Светлая тема' : 'Темная тема', action: toggleTheme },
        { icon: <Settings size={20} />, label: 'Настройки', action: () => { } },
        { icon: <Bell size={20} />, label: 'Уведомления', action: () => { } },
        { icon: <DownloadCloud size={20} />, label: 'Экспорт данных', action: () => { } },
        { icon: <CircleHelp size={20} />, label: 'Помощь', action: () => { } },
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
                <div className="card" style={{ textAlign: 'center', padding: '28px 16px', position: 'relative' }}>
                    {!isEditing && (
                        <button className="icon-btn" style={{ position: 'absolute', top: 12, right: 12 }} onClick={() => setIsEditing(true)}>
                            <Edit2 size={18} />
                        </button>
                    )}
                    {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                            <input className="form-input" value={editData.full_name} onChange={e => setEditData({ ...editData, full_name: e.target.value })} placeholder="Имя Фамилия" />
                            <input className="form-input" value={editData.agency_name} onChange={e => setEditData({ ...editData, agency_name: e.target.value })} placeholder="Название агентства" />
                            <input className="form-input" value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} placeholder="Телефон" />
                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsEditing(false)}>Отмена</button>
                                <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>Сохранить</button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 2 }}>{user.full_name}</div>
                            {user.agency_name && <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>{user.agency_name}</div>}
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user.email}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user.phone}</div>
                            <span className="badge badge-primary" style={{ marginTop: 8 }}>{user.role === 'admin' ? 'Администратор' : 'Риэлтор'}</span>
                        </>
                    )}
                </div>

                {/* Admin panel: pending users */}
                {isAdmin && (
                    <div className="card">
                        <div className="section-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            Управление пользователями
                            {pendingUsers.filter(u => u.status === 'pending').length > 0 && (
                                <span className="badge badge-danger">
                                    {pendingUsers.filter(u => u.status === 'pending').length} ожидают
                                </span>
                            )}
                        </div>
                        {loadingUsers && <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Загрузка...</div>}
                        {!loadingUsers && pendingUsers.length === 0 && (
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Нет ожидающих запросов ✓</div>
                        )}
                        {pendingUsers.map(u => (
                            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{u.full_name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email || u.id}</div>
                                    {u.agency_name && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.agency_name}</div>}
                                    <span style={{
                                        display: 'inline-block', marginTop: 4, fontSize: 11, padding: '2px 8px', borderRadius: 99, fontWeight: 600,
                                        background: u.status === 'pending' ? 'var(--warning-light, #fef3c7)' : 'var(--danger-light)',
                                        color: u.status === 'pending' ? 'var(--warning, #b45309)' : 'var(--danger)'
                                    }}>
                                        {u.status === 'pending' ? '⏳ Ожидает' : '✕ Отклонён'}
                                    </span>
                                </div>
                                {u.status === 'pending' && (
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button className="icon-btn" title="Одобрить" onClick={() => handleApprove(u.id)} style={{ color: 'var(--success)' }}>
                                            <UserCheck size={20} />
                                        </button>
                                        <button className="icon-btn" title="Отклонить" onClick={() => handleReject(u.id)} style={{ color: 'var(--danger)' }}>
                                            <UserX size={20} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* PWA Install */}
                {deferredPrompt && !isInstalled && (
                    <div className="card" style={{ background: 'var(--primary)', color: 'white', padding: '16px' }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>Установить приложение</div>
                        <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 12 }}>Добавьте REM на рабочий стол для быстрого доступа</div>
                        <button className="btn btn-full" style={{ background: 'white', color: 'var(--primary)' }} onClick={handleInstall}>
                            Установить
                        </button>
                    </div>
                )}

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
                            textAlign: 'left', fontSize: 15, color: 'var(--text)'
                        }}>
                            <span style={{ color: 'var(--text-muted)', display: 'flex' }}>{item.icon}</span>
                            <span style={{ flex: 1, fontWeight: 500 }}>{item.label}</span>
                            {item.label !== 'Темная тема' && item.label !== 'Светлая тема' && <span style={{ color: 'var(--text-muted)' }}><ArrowRight size={16} /></span>}
                        </button>
                    ))}
                </div>

                {/* Logout / Reset */}
                <div className="card" style={{ padding: 0 }}>
                    <button onClick={clearData} style={{
                        display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px',
                        border: 'none', background: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', textAlign: 'left', fontSize: 15, color: 'var(--text)'
                    }}>
                        <span style={{ color: 'var(--text-muted)', display: 'flex' }}><RotateCcw size={20} /></span>
                        <span style={{ flex: 1, fontWeight: 500 }}>Сбросить демо-данные</span>
                        <span style={{ color: 'var(--text-muted)' }}><ArrowRight size={16} /></span>
                    </button>
                    <button onClick={handleLogout} style={{
                        display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px',
                        border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 15,
                        color: 'var(--danger)'
                    }}>
                        <span style={{ display: 'flex' }}><LogOut size={20} /></span>
                        <span style={{ fontWeight: 500 }}>Выйти</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
