import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { supabase } from '../../lib/supabase';
import { DownloadCloud, Moon, Sun, ArrowRight, LogOut, Pencil, UserCheck, UserX, Calendar, Lock, RefreshCw, Shield, MapPin, Building2, User as UserIcon } from 'lucide-react';
import {
    isCalendarConfigured,
    isCalendarConnected,
    requestAccessToken,
    disconnectCalendar,
} from '../../lib/googleCalendar';
import { ChangePasswordModal } from '../../components/ChangePasswordModal';

// Lazy load XLSX for code splitting
const loadXLSX = () => import('xlsx');

export function ProfilePage() {
    const { state, dispatch, reloadData } = useApp();
    const navigate = useNavigate();
    const { toast } = useToastContext();
    const [deferredPrompt, setDeferredPrompt] = React.useState(null);
    const [isInstalled, setIsInstalled] = React.useState(false);
    const [isEditing, setIsEditing] = React.useState(false);
    const [isDark, setIsDark] = React.useState(() => document.documentElement.classList.contains('dark'));
    const [showPasswordModal, setShowPasswordModal] = React.useState(false);
    const [gcalConnected, setGcalConnected] = React.useState(() => isCalendarConnected());
    
    const user = state.currentUser;
    const [editData, setEditData] = React.useState({
        full_name: user?.full_name || '',
        phone: user?.phone || '',
        agency_name: user?.agency_name || '',
        inn: user?.inn || '',
        passport_details: user?.passport_details || {}
    });

    const [showPassport, setShowPassport] = React.useState(false);
    const setPassport = (field, value) => setEditData(prev => ({ ...prev, passport_details: { ...prev.passport_details, [field]: value } }));

    const isAdmin = user?.role === 'admin';

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

    React.useEffect(() => {
        if (user) setEditData({
            full_name: user.full_name || '',
            phone: user.phone || '',
            agency_name: user.agency_name || '',
            inn: user.inn || '',
            passport_details: user.passport_details || {}
        });
    }, [user]);

    if (!user) return null;

    async function handleApprove(profileId) {
        dispatch({ type: 'APPROVE_USER', userId: profileId });
    }

    async function handleReject(profileId) {
        dispatch({ type: 'REJECT_USER', userId: profileId });
    }

    async function handleInstall() {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') setDeferredPrompt(null);
    }

    const handleSave = () => {
        dispatch({ type: 'UPDATE_PROFILE', profile: { ...user, ...editData } });
        setIsEditing(false);
    };

    const myClients = state.clients.filter(c => isAdmin || c.realtor_id === user.id);
    const myProperties = state.properties.filter(p => isAdmin || p.realtor_id === user.id);
    const deals = state.matches.filter(m => (isAdmin || m.realtor_id === user.id) && m.status === 'deal').length;
    const conversion = state.matches.length > 0 ? ((deals / state.matches.length) * 100).toFixed(0) : 0;

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

    const handleExport = async () => {
        const category = window.prompt('Что экспортировать? (1 - Клиенты, 2 - Продажи, 3 - Все)', '3');
        if (!category) return;

        try {
            const XLSX = await loadXLSX();
            let data = [];
            let filename = 'export.xlsx';

            if (category === '1' || category === '3') {
                const clientsData = state.clients.map(c => ({
                    'Тип': 'Клиент',
                    'Имя': c.full_name,
                    'Телефон': c.phone,
                    'Бюджет': c.budget_max || c.budget,
                    'Дата': new Date(c.created_at).toLocaleDateString()
                }));
                data = [...data, ...clientsData];
                if (category === '1') filename = 'clients.xlsx';
            }

            if (category === '2' || category === '3') {
                const propsData = state.properties.map(p => ({
                    'Тип': 'Объект',
                    'Адрес': p.address,
                    'Цена': p.price,
                    'Статус': p.status,
                    'Дата': new Date(p.created_at).toLocaleDateString()
                }));
                data = [...data, ...propsData];
                if (category === '2') filename = 'properties.xlsx';
                if (category === '3') filename = 'realtor_data.xlsx';
            }

            if (data.length === 0) {
                toast.error('Нет данных для экспорта');
                return;
            }

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Data");
            XLSX.writeFile(wb, filename);
        } catch (err) {
            toast.error('Ошибка при экспорте');
        }
    };

    const menuItems = [
        { icon: <Lock size={20} />, label: 'Сменить пароль', action: () => setShowPasswordModal(true) },
        { icon: isDark ? <Sun size={20} /> : <Moon size={20} />, label: isDark ? 'Светлая тема' : 'Темная тема', action: toggleTheme },
        { icon: <DownloadCloud size={20} />, label: 'Экспорт данных', action: handleExport },
    ];

    async function handleLogout() {
        if (!window.confirm('Выйти из аккаунта?')) return;
        try {
            await supabase.auth.signOut();
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sb-')) localStorage.removeItem(key);
            });
            window.location.href = '/login';
        } catch (e) {
            toast.error('Ошибка при выходе');
        }
    }

    return (
        <div className="page fade-in" style={{ background: 'var(--surface)' }}>
            {/* STICKY TOPBAR */}
            <div className="topbar sticky" style={{ 
                background: 'rgba(255,255,255,0.7)', 
                backdropFilter: 'blur(24px) saturate(180%)',
                padding: '20px',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                height: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="topbar-title font-oswald" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 22 }}>Профиль</span>
                        <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 800, opacity: 0.6, textTransform: 'uppercase' }}>Личный кабинет</span>
                    </div>
                    {!isEditing && (
                        <button 
                            className="card-clickable" 
                            onClick={() => setIsEditing(true)}
                            style={{ 
                                width: 44, height: 44, borderRadius: 14, border: 'none',
                                background: 'white', color: 'var(--text)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                            }}
                        >
                            <Pencil size={18} />
                        </button>
                    )}
                </div>
            </div>

            <div className="page-content" style={{ padding: '20px', gap: 24, paddingBottom: 120 }}>
                {/* Profile Header Card */}
                <div className="card" style={{ padding: '32px 24px', borderRadius: 32, textAlign: 'center', position: 'relative', overflow: 'hidden', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 100, background: 'linear-gradient(135deg, var(--primary) 0%, #003db3 100%)', opacity: 0.08 }} />
                    
                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ 
                            width: 80, height: 80, borderRadius: 28, margin: '0 auto 16px',
                            background: 'linear-gradient(135deg, var(--primary) 0%, #003db3 100%)',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 24, fontWeight: 800, fontFamily: "'Oswald', sans-serif",
                            boxShadow: '0 12px 24px rgba(0, 82, 255, 0.2)',
                            border: '4px solid white'
                        }}>
                            {user.full_name?.split(' ').map(n => n[0]).join('')}
                        </div>

                        {isEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                                <input className="form-input" style={{ borderRadius: 14, height: 48, background: 'var(--bg-light)', border: 'none', fontWeight: 600 }} value={editData.full_name} onChange={e => setEditData({ ...editData, full_name: e.target.value })} placeholder="Имя Фамилия" />
                                <input className="form-input" style={{ borderRadius: 14, height: 48, background: 'var(--bg-light)', border: 'none', fontWeight: 600 }} value={editData.agency_name} onChange={e => setEditData({ ...editData, agency_name: e.target.value })} placeholder="Название агентства" />
                                <input className="form-input" style={{ borderRadius: 14, height: 48, background: 'var(--bg-light)', border: 'none', fontWeight: 600 }} value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} placeholder="Телефон" />
                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                    <button className="btn btn-secondary" style={{ flex: 1, borderRadius: 14 }} onClick={() => setIsEditing(false)}>Отмена</button>
                                    <button className="btn btn-primary" style={{ flex: 1, borderRadius: 14 }} onClick={handleSave}>Сохранить</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h2 className="font-oswald" style={{ fontSize: 24, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text)', marginBottom: 4 }}>{user.full_name}</h2>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', background: 'var(--primary-light)', padding: '4px 12px', borderRadius: 20 }}>
                                        {user.role === 'admin' ? 'АДМИНИСТРАТОР' : 'РИЭЛТОР'}
                                    </div>
                                    {user.agency_name && (
                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Building2 size={14} /> {user.agency_name}
                                        </div>
                                    )}
                                </div>
                                <div style={{ fontSize: 14, color: 'var(--text-secondary)', opacity: 0.7 }}>{user.email} • {user.phone}</div>
                            </>
                        )}
                    </div>
                </div>

                {/* Performance Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="card" style={{ padding: '24px 20px', borderRadius: 28, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', background: 'white' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Конверсия</div>
                        <div className="font-oswald" style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)' }}>{conversion}%</div>
                        <div style={{ height: 4, background: 'var(--bg-light)', borderRadius: 2, marginTop: 12 }}>
                            <div style={{ width: `${conversion}%`, height: '100%', background: 'var(--primary)', borderRadius: 2 }} />
                        </div>
                    </div>
                    <div className="card" style={{ padding: '24px 20px', borderRadius: 28, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', background: 'white' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Сделки</div>
                        <div className="font-oswald" style={{ fontSize: 32, fontWeight: 700, color: 'var(--success)' }}>{deals}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8, fontWeight: 600 }}>За всё время</div>
                    </div>
                </div>

                {/* Settings Menu */}
                <div className="card" style={{ padding: 8, borderRadius: 28, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', background: 'white' }}>
                    {menuItems.map((item, i) => (
                        <button key={item.label} onClick={item.action} style={{
                            display: 'flex', alignItems: 'center', gap: 16, width: '100%', padding: '16px 20px',
                            border: 'none', background: 'none', cursor: 'pointer',
                            borderRadius: 20,
                            marginBottom: i < menuItems.length - 1 ? 4 : 0,
                            textAlign: 'left', fontSize: 15, color: 'var(--text)',
                            transition: 'background 0.2s'
                        }} className="card-clickable">
                            <span style={{ 
                                width: 40, height: 40, borderRadius: 12, 
                                background: 'var(--bg-light)', color: 'var(--text)', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.8
                            }}>{item.icon}</span>
                            <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{item.label}</span>
                            <ArrowRight size={16} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                        </button>
                    ))}
                </div>

                {/* Admin Actions */}
                {isAdmin && (
                    <div className="card" style={{ padding: '24px', borderRadius: 28, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', background: 'white' }}>
                        <div className="font-oswald" style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16, color: 'var(--text-secondary)' }}>Панель управления</div>
                        <button className="btn btn-secondary btn-full" style={{ justifyContent: 'space-between', borderRadius: 14, height: 50, padding: '0 20px', background: 'var(--bg-light)', border: 'none', color: 'var(--text)' }} onClick={() => navigate('/admin/users')}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <Shield size={18} />
                                <span style={{ fontWeight: 700, fontSize: 14 }}>Управление пользователями</span>
                            </div>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                )}

                {/* Logout */}
                <button onClick={handleLogout} style={{
                    display: 'flex', alignItems: 'center', gap: 16, width: '100%', padding: '20px',
                    border: 'none', background: 'rgba(239, 68, 68, 0.05)', borderRadius: 28, cursor: 'pointer',
                    textAlign: 'left', color: 'var(--danger)', transition: 'all 0.2s'
                }}>
                    <span style={{ width: 40, height: 40, borderRadius: 12, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <LogOut size={20} />
                    </span>
                    <span style={{ fontWeight: 800, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Выйти из аккаунта</span>
                </button>

                {/* Support Info */}
                <div style={{ padding: '0 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.5, fontWeight: 600 }}>R Match Premium v2.4.0</div>
                    <div style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.3, marginTop: 4, fontFamily: 'monospace' }}>{user.id}</div>
                </div>
            </div>

            {/* Change Password Modal */}
            <ChangePasswordModal
                isOpen={showPasswordModal}
                onClose={() => setShowPasswordModal(false)}
                userEmail={user?.email}
            />
        </div>
    );
}

export default ProfilePage;
