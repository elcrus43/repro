import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatPhone, stripPhone } from '../../utils/format';
import { FormCard } from '../../components/FormCard';
import { User, Phone, Mail, FileText, Share2, Activity, ShieldCheck, ChevronDown, ChevronUp, X, Plus } from 'lucide-react';

const defaultClient = {
    full_name: '', phone: '', email: '',
    client_types: ['buyer'], additional_contacts: [], source: '', status: 'active', notes: '',
    passport_details: { series: '', number: '', issued_by: '', unit_code: '', issue_date: '', registration_address: '' }
};

export function FormPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const { id } = useParams();
    const existing = id ? state.clients.find(c => c.id === id) : null;
    
    const formatPhones = (phones) => (phones || []).map(p => formatPhone(p, true));
    const initialPhones = existing?.phones 
        ? formatPhones(existing.phones) 
        : (existing?.phone ? [formatPhone(existing.phone, true)] : ['']);

    const initialForm = existing ? {
        ...existing,
        phones: initialPhones,
        passport_details: existing.passport_details || defaultClient.passport_details
    } : { ...defaultClient, realtor_id: state.currentUser?.id };

    const [form, setForm] = useState(initialForm);
    const [showPassport, setShowPassport] = useState(!!form.passport_details?.series);

    function setF(key, val) { setForm(f => ({ ...f, [key]: val })); }

    function setPassport(key, val) {
        setForm(f => ({
            ...f,
            passport_details: { ...(f.passport_details || defaultClient.passport_details), [key]: val }
        }));
    }

    function handleSubmit(e) {
        e.preventDefault();
        const phones = (form.phones || [form.phone || '']).map(p => stripPhone(p)).filter(Boolean);
        const client = {
            ...form,
            phone: phones[0] || '',
            phones: phones.length > 1 ? phones : undefined,
            additional_contacts: (form.additional_contacts || []).map(c => ({
                ...c,
                phone: stripPhone(c.phone)
            }))
        };
        if (id) {
            dispatch({ type: 'UPDATE_CLIENT', client: { ...client, id } });
            navigate(`/clients/${id}`);
        } else {
            dispatch({ type: 'ADD_CLIENT', client: { ...client, realtor_id: state.currentUser?.id } });
            const params = new URLSearchParams(window.location.search);
            const returnTo = params.get('returnTo');
            if (returnTo) navigate(returnTo);
            else navigate('/clients');
        }
    }

    const sources = ['Авито', 'лидген', 'с показа', 'рекомендация', 'соцсети', 'ТОП-100', 'ХЗ', 'попутная наработка', 'другое'];
    const clientTypes = [
        { id: 'buyer', label: 'Покупатель' },
        { id: 'seller', label: 'Продавец' },
        { id: 'landlord', label: 'Арендодатель' },
        { id: 'tenant', label: 'Арендатор' },
    ];

    const toggleType = (typeId) => {
        const types = form.client_types || [];
        if (types.includes(typeId)) setF('client_types', types.filter(t => t !== typeId));
        else setF('client_types', [...types, typeId]);
    };

    const addContact = () => setF('additional_contacts', [...(form.additional_contacts || []), { name: '', phone: '', email: '' }]);
    const updateContact = (idx, field, val) => {
        const contacts = [...(form.additional_contacts || [])];
        contacts[idx] = { ...contacts[idx], [field]: val };
        setF('additional_contacts', contacts);
    };
    const removeContact = (idx) => setF('additional_contacts', form.additional_contacts.filter((_, i) => i !== idx));

    return (
        <div className="page fade-in" style={{ paddingBottom: 120 }}>
            <div className="topbar" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px) saturate(180%)' }}>
                <button className="topbar-back" onClick={() => navigate(id ? `/clients/${id}` : '/clients')} style={{ borderRadius: 14 }}>←</button>
                <span className="topbar-title font-oswald" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{id ? 'Редактировать клиента' : 'Новый контакт'}</span>
            </div>

            <form className="page-content" style={{ padding: '0 0 120px', display: 'flex', flexDirection: 'column', gap: 16 }} onSubmit={handleSubmit}>
                <div style={{ padding: '20px 20px 4px' }}>
                    <button type="submit" className="btn btn-primary btn-full" style={{ 
                        height: 56, borderRadius: 18, fontSize: 16, 
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        boxShadow: '0 8px 24px rgba(0, 82, 255, 0.15)'
                    }}>
                        {id ? 'Сохранить изменения' : 'Создать клиента'}
                    </button>
                </div>

                <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <FormCard title="Основная информация">
                        <div className="form-group">
                            <label className="form-label">ФИО клиента</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}><User size={18} /></span>
                                <input className="form-input" style={{ paddingLeft: 46, height: 54, borderRadius: 16, background: 'var(--bg-light)', border: 'none', fontWeight: 300 }} value={form.full_name} onChange={e => setF('full_name', e.target.value)} required placeholder="Иванов Иван Иванович" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Телефоны</label>
                            {(form.phones || [form.phone || '']).map((p, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }}><Phone size={18} /></span>
                                    <input className="form-input" style={{ paddingLeft: 46, height: 54, borderRadius: 16, background: 'var(--bg-light)', border: 'none', fontWeight: 300 }} value={p || ''} onChange={e => {
                                        const raw = e.target.value;
                                        const formatted = formatPhone(raw, true);
                                        const phones = [...(form.phones || [form.phone || ''])];
                                        phones[idx] = formatted;
                                        setF('phones', phones);
                                    }} placeholder="+7 (912) 000-00-00" />
                                    {idx > 0 && (
                                        <button type="button" className="card-clickable" style={{ width: 54, height: 54, borderRadius: 16, background: 'var(--danger-light)', color: 'var(--danger)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => {
                                            const phones = (form.phones || [form.phone || '']).filter((_, i) => i !== idx);
                                            setF('phones', phones.length > 0 ? phones : ['']);
                                        }}><X size={20} /></button>
                                    )}
                                </div>
                            ))}
                            <button type="button" className="btn btn-secondary btn-full" style={{ height: 44, borderRadius: 14, fontSize: 13, borderStyle: 'dashed' }} onClick={() => {
                                const phones = form.phones || [form.phone || ''];
                                setF('phones', [...phones, '']);
                            }}><Plus size={16} /> Добавить телефон</button>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Типы клиента</label>
                            <div className="chip-group" style={{ gap: 8 }}>
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
                    </FormCard>

                    <FormCard title="Дополнительно">
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}><Mail size={18} /></span>
                                <input className="form-input" style={{ paddingLeft: 46, height: 54, borderRadius: 16, background: 'var(--bg-light)', border: 'none', fontWeight: 300 }} type="email" value={form.email || ''} onChange={e => setF('email', e.target.value)} placeholder="email@mail.ru" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Источник</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}><Share2 size={18} /></span>
                                <select className="form-select" style={{ paddingLeft: 46, height: 54, borderRadius: 16, background: 'var(--bg-light)', border: 'none', fontWeight: 300 }} value={form.source || ''} onChange={e => setF('source', e.target.value)}>
                                    <option value="">Не указан</option>
                                    {sources.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Статус</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}><Activity size={18} /></span>
                                <select className="form-select" style={{ paddingLeft: 46, height: 54, borderRadius: 16, background: 'var(--bg-light)', border: 'none', fontWeight: 300 }} value={form.status} onChange={e => setF('status', e.target.value)}>
                                    <option value="active">Активен</option>
                                    <option value="paused">Пауза</option>
                                    <option value="deal_closed">Сделка закрыта</option>
                                    <option value="refused">Отказ</option>
                                </select>
                            </div>
                        </div>
                    </FormCard>

                    <FormCard title="Заметки">
                        <textarea className="form-textarea" style={{ minHeight: 120, borderRadius: 20, background: 'var(--bg-light)', border: 'none', padding: 16, fontWeight: 300 }} value={form.notes || ''} onChange={e => setF('notes', e.target.value)} placeholder="Важная информация о клиенте, предпочтения, история общения..." />
                    </FormCard>

                    {/* Passport Details Toggle Section */}
                    <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: showPassport ? 'white' : 'var(--bg-light)', transition: 'all 0.3s' }}>
                        <button type="button" 
                            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', padding: 0 }}
                            onClick={() => setShowPassport(!showPassport)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                    <span className="font-oswald" style={{ fontWeight: 600 }}><ShieldCheck size={20} /></span>
                                </div>
                                <span className="font-oswald" style={{ fontWeight: 600, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Паспортные данные</span>
                            </div>
                            {showPassport ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
                        </button>

                        {showPassport && (
                            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 24 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div className="form-group">
                                        <label className="form-label">Дата рождения</label>
                                        <input type="date" className="form-input" style={{ height: 50, borderRadius: 14, background: 'var(--bg-light)', border: 'none' }} value={form.passport_details?.birth_date || ''} onChange={e => setPassport('birth_date', e.target.value)} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">СНИЛС</label>
                                        <input className="form-input" style={{ height: 50, borderRadius: 14, background: 'var(--bg-light)', border: 'none' }} value={form.passport_details?.snils || ''} onChange={e => setPassport('snils', e.target.value)} placeholder="000-000-000 00" />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div className="form-group">
                                        <label className="form-label">Серия</label>
                                        <input className="form-input" style={{ height: 50, borderRadius: 14, background: 'var(--bg-light)', border: 'none' }} value={form.passport_details?.series || ''} onChange={e => setPassport('series', e.target.value)} placeholder="1234" maxLength={4} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Номер</label>
                                        <input className="form-input" style={{ height: 50, borderRadius: 14, background: 'var(--bg-light)', border: 'none' }} value={form.passport_details?.number || ''} onChange={e => setPassport('number', e.target.value)} placeholder="567890" maxLength={6} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Кем выдан</label>
                                    <textarea className="form-textarea" style={{ minHeight: 80, borderRadius: 16, background: 'var(--bg-light)', border: 'none' }} value={form.passport_details?.issued_by || ''} onChange={e => setPassport('issued_by', e.target.value)} placeholder="ГУ МВД России по г. Москве..." rows={2} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div className="form-group">
                                        <label className="form-label">Код подразделения</label>
                                        <input className="form-input" style={{ height: 50, borderRadius: 14, background: 'var(--bg-light)', border: 'none' }} value={form.passport_details?.unit_code || ''} onChange={e => setPassport('unit_code', e.target.value)} placeholder="123-456" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Дата выдачи</label>
                                        <input type="date" className="form-input" style={{ height: 50, borderRadius: 14, background: 'var(--bg-light)', border: 'none' }} value={form.passport_details?.issue_date || ''} onChange={e => setPassport('issue_date', e.target.value)} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Адрес регистрации</label>
                                    <textarea className="form-textarea" style={{ minHeight: 80, borderRadius: 16, background: 'var(--bg-light)', border: 'none' }} value={form.passport_details?.registration_address || ''} onChange={e => setPassport('registration_address', e.target.value)} placeholder="г. Москва, ул..." rows={2} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
}
