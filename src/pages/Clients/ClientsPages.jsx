import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatPhone } from '../../utils/format';
import { Edit2, Trash2 } from 'lucide-react';

export function ClientsPage() {
    const { state } = useApp();
    const navigate = useNavigate();
    const user = state.currentUser;
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');

    const clients = state.clients
        .filter(c => c.realtor_id === user?.id)
        .filter(c => {
            if (filter === 'buyer') return c.client_types?.includes('buyer');
            if (filter === 'seller') return c.client_types?.includes('seller');
            if (filter === 'landlord') return c.client_types?.includes('landlord');
            if (filter === 'tenant') return c.client_types?.includes('tenant');
            if (filter === 'active') return c.status === 'active';
            return true;
        })
        .filter(c =>
            !search || c.full_name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
        );

    const typeLabels = { buyer: 'Покупатель', seller: 'Продавец', landlord: 'Арендодатель', tenant: 'Арендатор' };
    const statusColors = { active: 'success', paused: 'warning', deal_closed: 'primary', refused: 'muted' };
    const statusLabels = { active: 'Активен', paused: 'Пауза', deal_closed: 'Сделка', refused: 'Отказ' };

    return (
        <div className="page fade-in">
            <div className="topbar">
                <span className="topbar-title">Клиенты</span>
                <button className="btn btn-sm btn-primary" onClick={() => navigate('/clients/new')}>+ Добавить</button>
            </div>

            <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="search-bar">
                    <span className="search-icon">S</span>
                    <input className="form-input" placeholder="Поиск по имени или телефону" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            <div className="tab-filters">
                {[['all', 'Все'], ['buyer', 'Покупатели'], ['seller', 'Продавцы'], ['landlord', 'Арендодатели'], ['tenant', 'Арендаторы'], ['active', 'Активные']].map(([val, label]) => (
                    <button key={val} className={`tab-filter ${filter === val ? 'active' : ''}`} onClick={() => setFilter(val)}>{label}</button>
                ))}
            </div>

            <div className="page-content" style={{ paddingTop: 8 }}>
                {clients.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-title">Нет клиентов</div>
                        <div className="empty-desc">Добавьте первого клиента</div>
                        <button className="btn btn-primary" onClick={() => navigate('/clients/new')}>+ Добавить клиента</button>
                    </div>
                )}
                {clients.map(client => {
                    const matches = state.matches.filter(m => {
                        const prop = state.properties.find(p => p.id === m.property_id);
                        const req = state.requests.find(r => r.id === m.request_id);
                        return prop?.client_id === client.id || req?.client_id === client.id;
                    });
                    const initials = client.full_name?.split(' ').slice(0, 2).map(w => w[0]).join('') || '?';
                    const handleDelete = (e) => {
                        e.stopPropagation();
                        if (window.confirm(`Удалить клиента ${client.full_name}?`)) {
                            dispatch({ type: 'DELETE_CLIENT', id: client.id });
                            // stay on list page
                        }
                    };
                    const handleEdit = (e) => {
                        e.stopPropagation();
                        navigate(`/clients/${client.id}/edit`);
                    };
                    return (
                        <div key={client.id} className="card" style={{ position: 'relative' }} onClick={() => navigate(`/clients/${client.id}`)}>
                            <div className="flex items-center gap-12">
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="flex items-center gap-8" style={{ marginBottom: 2 }}>
                                        <span style={{ fontWeight: 700, fontSize: 15 }}>{client.full_name}</span>
                                        <span className={`badge badge-${statusColors[client.status] || 'muted'}`} style={{ fontSize: 11 }}>
                                            {statusLabels[client.status] || client.status}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                        {client.client_types?.map(t => (
                                            <span key={t} style={{ opacity: 0.8 }}>{typeLabels[t]}</span>
                                        )).reduce((prev, curr) => [prev, ' · ', curr])}
                                        {client.client_types?.length > 0 && ' · '} {formatPhone(client.phone)}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                        {client.additional_contacts?.length > 0 && `+${client.additional_contacts.length} чел. · `}
                                        {matches.length > 0 && `Матчей: ${matches.length}`}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button className="icon-btn" onClick={handleEdit}><Edit2 size={16} /></button>
                                    <button className="icon-btn" onClick={handleDelete}><Trash2 size={16} /></button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <button className="fab" onClick={() => navigate('/clients/new')}>+</button>
        </div >
    );
}

export function ClientCardPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const id = window.location.pathname.split('/')[2];
    const client = state.clients.find(c => c.id === id);

    if (!client) return (
        <div className="page"><div className="topbar"><button className="topbar-back" onClick={() => navigate('/clients')}>←</button><span className="topbar-title">Клиент не найден</span></div></div>
    );

    const myProps = state.properties.filter(p => p.client_id === id);
    const myReqs = state.requests.filter(r => r.client_id === id);
    const propMatches = state.matches.filter(m => state.properties.find(p => p.id === m.property_id && p.client_id === id));
    const reqMatches = state.matches.filter(m => state.requests.find(r => r.id === m.request_id && r.client_id === id));
    const allMatches = [...new Map([...propMatches, ...reqMatches].map(m => [m.id, m])).values()];
    const myShowings = state.showings.filter(s => s.client_id === id);
    const myTasks = state.tasks.filter(t => t.client_id === id);

    const statusLabels = { active: 'Активен', paused: 'Пауза', deal_closed: 'Сделка', refused: 'Отказ' };
    const typeLabels = { buyer: 'Покупатель', seller: 'Продавец', landlord: 'Арендодатель', tenant: 'Арендатор' };
    const messengerIcons = { WhatsApp: '', Telegram: '', Viber: '', другой: '' };
    const initials = client.full_name?.split(' ').slice(0, 2).map(w => w[0]).join('') || '?';

    function handleDelete() {
        if (window.confirm(`Удалить клиента ${client.full_name}?`)) {
            dispatch({ type: 'DELETE_CLIENT', id });
            navigate('/clients');
        }
    }

    return (
        <div className="page fade-in">
            <div className="topbar">
                <button className="topbar-back" onClick={() => navigate('/clients')}>←</button>
                <span className="topbar-title">Клиент</span>
                <div className="topbar-actions">
                    <button className="icon-btn" onClick={() => navigate(`/clients/${id}/edit`)}><Edit2 size={18} /></button>
                    <button className="icon-btn" onClick={handleDelete}><Trash2 size={18} /></button>
                </div>
            </div>

            <div className="page-content">
                {/* Header */}
                <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{client.full_name}</div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                        {client.client_types?.map(t => (
                            <span key={t} className="badge badge-primary">{typeLabels[t]}</span>
                        ))}
                        <span className={`badge badge-${client.status === 'active' ? 'success' : 'warning'}`}>{statusLabels[client.status]}</span>
                    </div>
                </div>

                {/* Contacts */}
                <div className="card">
                    <div className="section-title" style={{ marginBottom: 8 }}>Контакты</div>
                    {client.phone && (
                        <div className="info-row">
                            <span className="info-key">Телефон</span>
                            <a href={`tel:${client.phone}`} className="info-val text-primary">{formatPhone(client.phone)}</a>
                        </div>
                    )}
                    {client.email && (
                        <div className="info-row">
                            <span className="info-key">Email</span>
                            <span className="info-val">{client.email}</span>
                        </div>
                    )}
                    {client.messenger && (
                        <div className="info-row">
                            <span className="info-key">Мессенджер</span>
                            <span className="info-val">{client.messenger}</span>
                        </div>
                    )}

                    {client.additional_contacts?.map((contact, idx) => (
                        <React.Fragment key={idx}>
                            <div style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', marginTop: 8 }}>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Доп. контакт</div>
                                <div style={{ fontWeight: 600 }}>{contact.name || 'Без имени'}</div>
                            </div>
                            {contact.phone && (
                                <div className="info-row">
                                    <span className="info-key">Телефон</span>
                                    <a href={`tel:${contact.phone}`} className="info-val text-primary">{formatPhone(contact.phone)}</a>
                                </div>
                            )}
                            {contact.email && (
                                <div className="info-row">
                                    <span className="info-key">Email</span>
                                    <span className="info-val">{contact.email}</span>
                                </div>
                            )}
                            {contact.messenger && (
                                <div className="info-row">
                                    <span className="info-key">Мессенджер</span>
                                    <span className="info-val">{contact.messenger}</span>
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                    <div className="info-row">
                        <span className="info-key">Источник</span>
                        <span className="info-val">{client.source || '—'}</span>
                    </div>
                    <div className="info-row" style={{ borderBottom: 'none' }}>
                        <span className="info-key">Добавлен</span>
                        <span className="info-val">{new Date(client.created_at).toLocaleDateString('ru-RU')}</span>
                    </div>
                </div>

                {/* Notes */}
                {client.notes && (
                    <div className="card">
                        <div className="section-title" style={{ marginBottom: 6 }}>Заметки</div>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{client.notes}</p>
                    </div>
                )}

                {/* Links */}
                {[
                    { label: 'Запросы на покупку', count: myReqs.length, path: `/requests?client=${id}`, action: () => navigate(`/requests/new?client=${id}`) },
                    { label: 'Объекты на продажу', count: myProps.length, path: `/properties?client=${id}`, action: () => navigate(`/properties/new?client=${id}`) },
                    { label: 'Матчи', count: allMatches.length, path: `/matches?client=${id}` },
                    { label: 'Показы', count: myShowings.length, path: `/showings` },
                    { label: 'Задачи', count: myTasks.length, path: `/tasks?client=${id}` },
                ].map(item => (
                    <div key={item.label} className="list-row" onClick={() => navigate(item.path)}>
                        <span style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>{item.label}</span>
                        <span className="badge badge-primary">{item.count}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: 18, marginLeft: 4 }}>›</span>
                    </div>
                ))}

                {/* Quick add buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <button className="btn btn-secondary" onClick={() => navigate(`/requests/new?client=${id}`)}>+ Запрос</button>
                    <button className="btn btn-secondary" onClick={() => navigate(`/properties/new?client=${id}`)}>+ Объект</button>
                    <button className="btn btn-secondary" onClick={() => navigate(`/tasks?client=${id}&action=new`)}>+ Задача</button>
                </div>
            </div>
        </div>
    );
}

const defaultClient = {
    full_name: '', phone: '', email: '', messenger: '',
    client_types: ['buyer'], additional_contacts: [], source: '', status: 'active', notes: '',
};

export function ClientFormPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const path = window.location.pathname;
    const id = path.includes('/edit') ? path.split('/')[2] : null;
    const existing = id ? state.clients.find(c => c.id === id) : null;
    const [form, setForm] = useState(existing || { ...defaultClient, realtor_id: state.currentUser?.id });

    function setF(key, val) { setForm(f => ({ ...f, [key]: val })); }

    function handleSubmit(e) {
        e.preventDefault();
        if (id) {
            dispatch({ type: 'UPDATE_CLIENT', client: { ...form, id } });
            navigate(`/clients/${id}`);
        } else {
            dispatch({ type: 'ADD_CLIENT', client: { ...form, realtor_id: state.currentUser?.id } });
            navigate('/clients');
        }
    }

    const messengers = ['WhatsApp', 'Telegram', 'Viber', 'другой'];
    const sources = ['Авито', 'ЦИАН', 'лидген', 'с показа', 'рекомендация', 'соцсети', 'звонок', 'другое'];
    const clientTypes = [
        { id: 'buyer', label: 'Покупатель' },
        { id: 'seller', label: 'Продавец' },
        { id: 'landlord', label: 'Арендодатель' },
        { id: 'tenant', label: 'Арендатор' },
    ];

    const toggleType = (typeId) => {
        const types = form.client_types || [];
        if (types.includes(typeId)) {
            setF('client_types', types.filter(t => t !== typeId));
        } else {
            setF('client_types', [...types, typeId]);
        }
    };

    const addContact = () => {
        setF('additional_contacts', [...(form.additional_contacts || []), { name: '', phone: '', email: '', messenger: '' }]);
    };

    const updateContact = (idx, field, val) => {
        const contacts = [...(form.additional_contacts || [])];
        contacts[idx] = { ...contacts[idx], [field]: val };
        setF('additional_contacts', contacts);
    };

    const removeContact = (idx) => {
        setF('additional_contacts', form.additional_contacts.filter((_, i) => i !== idx));
    };

    return (
        <div className="page fade-in">
            <div className="topbar">
                <button className="topbar-back" onClick={() => navigate(id ? `/clients/${id}` : '/clients')}>←</button>
                <span className="topbar-title">{id ? 'Редактировать' : 'Новый клиент'}</span>
            </div>
            <form className="page-content" onSubmit={handleSubmit}>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                        <label className="form-label">ФИО <span className="required">*</span></label>
                        <input className="form-input" value={form.full_name} onChange={e => setF('full_name', e.target.value)} required placeholder="Иванов Иван Иванович" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Типы клиента <span className="required">*</span></label>
                        <div className="chip-group">
                            {clientTypes.map(t => (
                                <button key={t.id} type="button"
                                    className={`chip ${form.client_types?.includes(t.id) ? 'active' : ''}`}
                                    onClick={() => toggleType(t.id)}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Телефон <span className="required">*</span></label>
                        <input className="form-input" value={formatPhone(form.phone)} onChange={e => setF('phone', e.target.value)} required placeholder="+7 (999) 000-00-00" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input className="form-input" type="email" value={form.email || ''} onChange={e => setF('email', e.target.value)} placeholder="email@mail.ru" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Мессенджер</label>
                        <div className="chip-group">
                            {messengers.map(m => (
                                <button key={m} type="button" className={`chip ${form.messenger === m ? 'active' : ''}`} onClick={() => setF('messenger', form.messenger === m ? '' : m)}>{m}</button>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginTop: 8, padding: '12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Доп. контактные лица</div>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={addContact}>+ Лицо</button>
                        </div>

                        {form.additional_contacts?.map((contact, idx) => (
                            <div key={idx} style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
                                <button type="button"
                                    style={{ position: 'absolute', top: 4, right: 4, background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: 4 }}
                                    onClick={() => removeContact(idx)}
                                >✕</button>
                                <input className="form-input" value={contact.name} onChange={e => updateContact(idx, 'name', e.target.value)} placeholder="Имя" />
                                <input className="form-input" value={formatPhone(contact.phone)} onChange={e => updateContact(idx, 'phone', e.target.value)} placeholder="Телефон" />
                                <div className="chip-group">
                                    {messengers.map(m => (
                                        <button key={m} type="button" className={`chip chip-sm ${contact.messenger === m ? 'active' : ''}`} onClick={() => updateContact(idx, 'messenger', contact.messenger === m ? '' : m)}>{m}</button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="form-group">
                        <label className="form-label">Источник</label>
                        <select className="form-select" value={form.source || ''} onChange={e => setF('source', e.target.value)}>
                            <option value="">Не указан</option>
                            {sources.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Статус</label>
                        <select className="form-select" value={form.status} onChange={e => setF('status', e.target.value)}>
                            <option value="active">Активен</option>
                            <option value="paused">Пауза</option>
                            <option value="deal_closed">Сделка закрыта</option>
                            <option value="refused">Отказ</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Заметки</label>
                        <textarea className="form-textarea" value={form.notes || ''} onChange={e => setF('notes', e.target.value)} placeholder="Важная информация о клиенте..." />
                    </div>
                </div>
                <button type="submit" className="btn btn-primary btn-full">{id ? 'Сохранить' : 'Добавить клиента'}</button>
            </form>
        </div>
    );
}
