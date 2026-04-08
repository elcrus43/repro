import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatPhone, stripPhone } from '../../utils/format';

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
    
    // Format phones for display
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
            phone: phones[0] || '', // Main phone for backward compatibility
            phones: phones.length > 1 ? phones : undefined, // Store multiple phones
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
            if (returnTo) {
                navigate(returnTo);
            } else {
                navigate('/clients');
            }
        }
    }

    const sources = ['Авито', 'лидген', 'с показа', 'рекомендация', 'соцсети', 'ТОП-100', 'ХЗ', 'попутная наработка', 'другое'];
    const clientTypes = [
        { id: 'buyer', label: 'Покупатель' },
        { id: 'seller', label: 'Продавец' },
        { id: 'developer', label: 'Застройщик' },
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
        setF('additional_contacts', [...(form.additional_contacts || []), { name: '', phone: '', email: '' }]);
    };

    const updateContact = (idx, field, val) => {
        const contacts = [...(form.additional_contacts || [])];
        contacts[idx] = { ...contacts[idx], [field]: val };
        setF('additional_contacts', contacts);
    };

    const removeContact = (idx) => {
        setF('additional_contacts', form.additional_contacts.filter((_, i) => i !== idx));
    };

    const handlePhoneChange = (e, field = 'phone', idx = null) => {
        let val = e.target.value;
        const formatted = formatPhone(val, true);
        if (idx !== null) {
            updateContact(idx, field, formatted);
        } else {
            setF(field, formatted);
        }
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
                        <label className="form-label">Телефоны <span className="required">*</span></label>
                        {(form.phones || [form.phone || '']).map((p, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                <input className="form-input" value={p || ''} onChange={e => {
                                    const raw = e.target.value;
                                    const formatted = formatPhone(raw, true);
                                    const phones = [...(form.phones || [form.phone || ''])];
                                    phones[idx] = formatted;
                                    setF('phones', phones);
                                }} placeholder="+7 (999) 000-00-00" />
                                {idx > 0 && (
                                    <button type="button" className="icon-btn" onClick={() => {
                                        const phones = (form.phones || [form.phone || '']).filter((_, i) => i !== idx);
                                        setF('phones', phones.length > 0 ? phones : ['']);
                                    }}>✕</button>
                                )}
                            </div>
                        ))}
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => {
                            const phones = form.phones || [form.phone || ''];
                            setF('phones', [...phones, '']);
                        }}>+ Добавить телефон</button>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input className="form-input" type="email" value={form.email || ''} onChange={e => setF('email', e.target.value)} placeholder="email@mail.ru" />
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
                                <input className="form-input" value={contact.phone} onChange={e => handlePhoneChange(e, 'phone', idx)} placeholder="Телефон" />
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

                    {/* Passport Details Section */}
                    <div style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: showPassport ? 'var(--bg)' : 'transparent' }}>
                        <div
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                            onClick={() => setShowPassport(!showPassport)}
                        >
                            <div style={{ fontWeight: 700, fontSize: 14 }}>Паспортные данные</div>
                            <div style={{ color: 'var(--text-muted)' }}>{showPassport ? '▼' : '▶'}</div>
                        </div>

                        {showPassport && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Дата рождения</label>
                                        <input type="date" className="form-input" value={form.passport_details?.birth_date || ''} onChange={e => setPassport('birth_date', e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">СНИЛС</label>
                                        <input className="form-input" value={form.passport_details?.snils || ''} onChange={e => setPassport('snils', e.target.value)} placeholder="000-000-000 00" />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Серия</label>
                                        <input className="form-input" value={form.passport_details?.series || ''} onChange={e => setPassport('series', e.target.value)} placeholder="1234" maxLength={4} />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Номер</label>
                                        <input className="form-input" value={form.passport_details?.number || ''} onChange={e => setPassport('number', e.target.value)} placeholder="567890" maxLength={6} />
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Кем выдан</label>
                                    <textarea className="form-textarea" value={form.passport_details?.issued_by || ''} onChange={e => setPassport('issued_by', e.target.value)} placeholder="ГУ МВД России по г. Москве..." rows={2} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Код подразделения</label>
                                        <input className="form-input" value={form.passport_details?.unit_code || ''} onChange={e => setPassport('unit_code', e.target.value)} placeholder="123-456" />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Дата выдачи</label>
                                        <input type="date" className="form-input" value={form.passport_details?.issue_date || ''} onChange={e => setPassport('issue_date', e.target.value)} />
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Адрес регистрации</label>
                                    <textarea className="form-textarea" value={form.passport_details?.registration_address || ''} onChange={e => setPassport('registration_address', e.target.value)} placeholder="г. Москва, ул..." rows={2} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <button type="submit" className="btn btn-primary btn-full">{id ? 'Сохранить' : 'Добавить клиента'}</button>
            </form>
        </div>
    );
}
