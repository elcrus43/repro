import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { supabase } from '../../lib/supabase';
import { Settings, Bell, DownloadCloud, CircleHelp, Moon, Sun, ArrowRight, RotateCcw, LogOut, Edit2, UserCheck, UserX, Calendar } from 'lucide-react';
import {
    isCalendarConfigured,
    isCalendarConnected,
    requestAccessToken,
    disconnectCalendar,
} from '../../lib/googleCalendar';

// Lazy load XLSX for code splitting - loaded only when export is needed
const loadXLSX = () => import('xlsx');


export function ProfilePage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const { toast } = useToastContext();
    const [deferredPrompt, setDeferredPrompt] = React.useState(null);
    const [isInstalled, setIsInstalled] = React.useState(false);
    const [isEditing, setIsEditing] = React.useState(false);
    const [isDark, setIsDark] = React.useState(() => document.documentElement.classList.contains('dark'));
    const [gcalConnected, setGcalConnected] = React.useState(() => isCalendarConnected());
    const gcalConfigured = isCalendarConfigured();

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
    // eslint-disable-next-line no-unused-vars
    const pendingUsers = state.pendingUsers || [];

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
    const myRequests = state.requests.filter(r => isAdmin || r.realtor_id === user.id);
    const myMatches = state.matches.filter(m => isAdmin || m.realtor_id === user.id);
    const deals = myMatches.filter(m => m.status === 'deal').length;
    const conversion = myMatches.length > 0 ? ((deals / myMatches.length) * 100).toFixed(1) : 0;

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
            // Lazy load XLSX library
            const XLSX = await loadXLSX();

            let data = [];
            let filename = 'export.xlsx';

            if (category === '1' || category === '3') {
                const clientsData = state.clients.map(c => ({
                    'Тип': 'Клиент',
                    'Имя': c.full_name,
                    'Телефон': c.phone,
                    'Бюджет': c.budget_max || c.budget,
                    'Комиссия': c.commission || 0,
                    'Заметки': c.notes,
                    'Район': c.district || (c.districts ? c.districts.join(', ') : ''),
                    'Дата': new Date(c.created_at).toLocaleDateString()
                }));
                data = [...data, ...clientsData];
                if (category === '1') filename = 'clients.xlsx';
            }

            if (category === '2' || category === '3') {
                const propsData = state.properties.map(p => {
                    const client = state.clients.find(c => c.id === p.client_id);
                    return {
                        'Тип': 'Продажа',
                        'Заголовок': p.title || (p.property_type === 'apartment' ? 'Квартира' : p.property_type === 'house' ? 'Дом' : p.property_type),
                        'Цена': p.price,
                        'Комиссия': p.commission || 0,
                        'Адрес': p.address,
                        'Район': p.district,
                        'Микрорайон': p.microdistrict || '—',
                        'Комнат': p.rooms,
                        'Площадь': p.area_total,
                        'Этаж': `${p.floor}/${p.floors_total}`,
                        'Клиент': client?.full_name || '—',
                        'Телефон клиента': client?.phone || '—',
                        'Описание': p.description,
                        'Статус': p.status,
                        'Дата': new Date(p.created_at).toLocaleDateString()
                    };
                });
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
            console.error('Export error:', err);
            toast.error('Ошибка при экспорте');
        }
    };

    // eslint-disable-next-line no-unused-vars
    const handleSyncLocalData = async () => {
        if (!window.confirm('Выполнить поиск старых локальных данных в вашем браузере и перенести их в общую базу?')) return;

        try {
            const keys = ['realtor_clients', 'realtor_properties', 'realtor_requests', 'realtor_matches', 'realtor_showings', 'realtor_tasks'];
            let importedCount = 0;

            for (const key of keys) {
                const data = localStorage.getItem(key);
                if (data) {
                    const parsed = JSON.parse(data);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        importedCount += parsed.length;
                        for (const item of parsed) {
                            // Link to current user if missing
                            const enriched = { ...item };
                            if (!enriched.realtor_id) enriched.realtor_id = user.id;

                            if (key === 'realtor_clients') dispatch({ type: 'ADD_CLIENT', client: enriched });
                            else if (key === 'realtor_properties') dispatch({ type: 'ADD_PROPERTY', property: enriched });
                            else if (key === 'realtor_requests') dispatch({ type: 'ADD_REQUEST', request: enriched });
                            else if (key === 'realtor_showings') dispatch({ type: 'ADD_SHOWING', showing: enriched });
                            else if (key === 'realtor_tasks') dispatch({ type: 'ADD_TASK', task: enriched });
                        }
                    }
                }
            }
            if (importedCount > 0) {
                toast.success(`Успешно перенесено записей: ${importedCount}.`);
                if (window.confirm('Очистить старые локальные данные браузера, чтобы не переносить их повторно?')) {
                    keys.forEach(k => localStorage.removeItem(k));
                }
            } else {
                toast.error('Старых локальных данных в этом браузере не найдено.');
            }
        } catch (err) {
            console.error('Sync error:', err);
            toast.error('Ошибка при синхронизации: ' + err.message);
        }
    };

    const menuItems = [
        { icon: isDark ? <Sun size={20} /> : <Moon size={20} />, label: isDark ? 'Светлая тема' : 'Темная тема', action: toggleTheme },
        { icon: <Settings size={20} />, label: 'Настройки', action: () => { } },
        { icon: <Bell size={20} />, label: 'Уведомления', action: () => { } },
        { icon: <DownloadCloud size={20} />, label: 'Экспорт данных', action: handleExport },
        { icon: <CircleHelp size={20} />, label: 'Помощь', action: () => { } },
    ];

    async function handleConnectCalendar() {
        try {
            await requestAccessToken(true);
            setGcalConnected(true);
            toast.success('Google Календарь подключен');
        } catch (err) {
            console.warn('[Calendar Connect Error]', err);
            toast.error('Не удалось подключить Google Календарь');
        }
    }

    async function handleDisconnectCalendar() {
        if (!window.confirm('Отключить Google Календарь? События не будут синхронизироваться.')) return;
        try {
            await disconnectCalendar();
            setGcalConnected(false);
            toast.success('Google Календарь отключен');
        } catch (err) {
            console.warn('[Calendar Disconnect Error]', err);
            toast.error('Ошибка при отключении календаря');
        }
    }

    async function handleLogout() {
        if (window.confirm('Выйти из аккаунта?')) {
            await supabase.auth.signOut();
            dispatch({ type: 'LOGOUT' });
            navigate('/login');
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
                            <input className="form-input" value={editData.inn} onChange={e => setEditData({ ...editData, inn: e.target.value })} placeholder="ИНН" />

                            <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: showPassport ? 'var(--bg)' : 'transparent', marginTop: 8 }}>
                                <div
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                    onClick={() => setShowPassport(!showPassport)}
                                >
                                    <div style={{ fontWeight: 700, fontSize: 13 }}>Паспортные данные</div>
                                    <div style={{ color: 'var(--text-muted)' }}>{showPassport ? '▼' : '▶'}</div>
                                </div>
                                {showPassport && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12, textAlign: 'left' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label">Серия</label>
                                                <input className="form-input" value={editData.passport_details?.series || ''} onChange={e => setPassport('series', e.target.value)} placeholder="1234" maxLength={4} />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label">Номер</label>
                                                <input className="form-input" value={editData.passport_details?.number || ''} onChange={e => setPassport('number', e.target.value)} placeholder="567890" maxLength={6} />
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Кем выдан</label>
                                            <textarea className="form-textarea" value={editData.passport_details?.issued_by || ''} onChange={e => setPassport('issued_by', e.target.value)} placeholder="ГУ МВД..." rows={2} />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label">Код подразделения</label>
                                                <input className="form-input" value={editData.passport_details?.unit_code || ''} onChange={e => setPassport('unit_code', e.target.value)} placeholder="123-456" />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label">Дата выдачи</label>
                                                <input type="date" className="form-input" value={editData.passport_details?.issue_date || ''} onChange={e => setPassport('issue_date', e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label">Адрес регистрации</label>
                                            <textarea className="form-textarea" value={editData.passport_details?.registration_address || ''} onChange={e => setPassport('registration_address', e.target.value)} placeholder="Адрес..." rows={2} />
                                        </div>
                                    </div>
                                )}
                            </div>

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

                {/* Admin panel: users management */}
                {isAdmin && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="card">
                            <div className="section-title" style={{ marginBottom: 12 }}>Управление риэлторами</div>
                            {/* Pending Users */}
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--warning)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    ⏳ Ожидают одобрения ({state.profiles.filter(u => u.status === 'pending').length})
                                </div>
                                {state.profiles.filter(u => u.status === 'pending').length === 0 && (
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>Нет новых запросов</div>
                                )}
                                {state.profiles.filter(u => u.status === 'pending').map(u => (
                                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>{u.full_name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email || u.phone}</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="icon-btn" onClick={() => handleApprove(u.id)} style={{ color: 'var(--success)' }}><UserCheck size={20} /></button>
                                            <button className="icon-btn" onClick={() => handleReject(u.id)} style={{ color: 'var(--danger)' }}><UserX size={20} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Approved/Rejected */}
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
                                    Обработанные ({state.profiles.filter(u => u.status !== 'pending' && u.id !== user.id).length})
                                </div>
                                {state.profiles.filter(u => u.status !== 'pending' && u.id !== user.id).slice(0, 5).map(u => (
                                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-light)', opacity: u.status === 'rejected' ? 0.6 : 1 }}>
                                        <div style={{ flex: 1 }}><div style={{ fontWeight: 500, fontSize: 13 }}>{u.full_name}</div></div>
                                        <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700, background: u.status === 'approved' ? 'var(--success-light)' : 'var(--danger-light)', color: u.status === 'approved' ? 'var(--success)' : 'var(--danger)' }}>{u.status === 'approved' ? 'АКТИВЕН' : 'ОТКЛОНЁН'}</span>
                                        <button className="icon-btn" onClick={() => (u.status === 'approved' ? handleReject(u.id) : handleApprove(u.id))} style={{ color: u.status === 'approved' ? 'var(--danger)' : 'var(--success)', padding: 4 }}>
                                            {u.status === 'approved' ? <UserX size={16} /> : <UserCheck size={16} />}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* PRICE LIST MANAGEMENT */}
                        <div className="card">
                            <div className="section-title" style={{ marginBottom: 12 }}>Прейскурант услуг</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {state.pricelist.map(item => (
                                    <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                                                <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700 }}>{item.price.toLocaleString()} ₽</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                <button className="icon-btn" onClick={() => {
                                                    const newName = window.prompt('Название услуги', item.name);
                                                    const newPrice = window.prompt('Стоимость', item.price);
                                                    if (newName && newPrice) dispatch({ type: 'UPDATE_PRICE_ITEM', item: { ...item, name: newName, price: Number(newPrice) } });
                                                }}><Edit2 size={16} /></button>
                                                <button className="icon-btn" onClick={() => {
                                                    if (window.confirm('Удалить услугу из прейскуранта?')) dispatch({ type: 'DELETE_PRICE_ITEM', id: item.id });
                                                }} style={{ color: 'var(--danger)' }}><UserX size={16} /></button>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
                                                <input type="checkbox" checked={item.show_in_sale !== false} onChange={e => dispatch({ type: 'UPDATE_PRICE_ITEM', item: { ...item, show_in_sale: e.target.checked } })} />
                                                Объект (Продажа)
                                            </label>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer' }}>
                                                <input type="checkbox" checked={item.show_in_purchase !== false} onChange={e => dispatch({ type: 'UPDATE_PRICE_ITEM', item: { ...item, show_in_purchase: e.target.checked } })} />
                                                Запрос (Покупка)
                                            </label>
                                        </div>
                                    </div>
                                ))}
                                <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => {
                                    const name = window.prompt('Название новой услуги');
                                    const price = window.prompt('Стоимость');
                                    if (name && price) dispatch({ type: 'ADD_PRICE_ITEM', item: { name, price: Number(price), show_in_sale: true, show_in_purchase: true } });
                                }}>+ Добавить услугу</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Google Calendar Integration — DISABLED temporarily */}

                {/* PWA Install */}
                {deferredPrompt && !isInstalled && (
                    <div className="card" style={{ background: 'var(--primary)', color: 'white', padding: '16px' }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>Установить приложение</div>
                        <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 12 }}>Добавьте R Match на рабочий стол для быстрого доступа</div>
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
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Продаж</div>
                        </div>
                        <div style={{ padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)' }}>{myRequests.length}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Покупок</div>
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

                {/* Logout */}
                <div className="card" style={{ padding: 0 }}>
                    <button onClick={handleLogout} style={{
                        display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '16px',
                        border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 15,
                        color: 'var(--danger)'
                    }}>
                        <span style={{ display: 'flex' }}><LogOut size={20} /></span>
                        <span style={{ fontWeight: 600 }}>Выйти из аккаунта</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

// Default export for lazy loading
export { ProfilePage as default };
