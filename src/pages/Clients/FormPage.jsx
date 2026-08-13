import React, { useState, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { formatPhone, stripPhone } from '../../utils/format';
import { findDuplicateClients } from '../../utils/clientDuplicate';
import { FormCard } from '../../components/FormCard';
import { PassportScanModal } from '../../components/PassportScanModal';
import { User, Phone, Mail, FileText, Share2, Activity, ShieldCheck, ChevronDown, ChevronUp, X, Plus, AlertTriangle, Camera, Landmark, Loader2, CheckCircle2, Cake } from 'lucide-react';

const DADATA_TOKEN = import.meta.env.VITE_DADATA_TOKEN;

const defaultClient = {
    full_name: '', phone: '', email: '', inn: '', birth_date: '', reg_address: '',
    client_types: ['buyer'], additional_contacts: [], source: '', status: 'new', notes: '',
    passport_details: { series: '', number: '', issued_by: '', unit_code: '', issue_date: '', registration_address: '', inn: '', birth_date: '', snils: '' },
    bank_details: { bank_name: '', bik: '', account: '', corr_account: '', inn: '', kpp: '', beneficiary: '' }
};

export function FormPage() {
    const { state, dispatch } = useApp();
    const { toast } = useToastContext();
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const existing = id ? state.clients.find(c => c.id === id) : null;
    
    const formatPhones = (phones) => (phones || []).map(p => formatPhone(p, true));
    const initialPhones = existing?.phones 
        ? formatPhones(existing.phones) 
        : (existing?.phone ? [formatPhone(existing.phone, true)] : ['']);

    const initialForm = existing ? {
        ...existing,
        inn: existing.inn || existing.passport_details?.inn || '',
        birth_date: existing.birth_date || existing.passport_details?.birth_date || '',
        reg_address: existing.reg_address || existing.passport_details?.registration_address || '',
        phones: initialPhones,
        passport_details: existing.passport_details || defaultClient.passport_details
    } : { ...defaultClient, realtor_id: state.currentUser?.id };

    const [form, setForm] = useState(initialForm);
    const [showPassport, setShowPassport] = useState(!!(form.passport_details?.series || form.inn || form.birth_date));
    const [showPassportScan, setShowPassportScan] = useState(false);
    const [showBank, setShowBank] = useState(!!(form.bank_details?.bik || form.bank_details?.account));
    const [bankLoading, setBankLoading] = useState(false);
    const [bankFound, setBankFound] = useState(false);
    const bikTimerRef = useRef(null);

    function setF(key, val) { setForm(f => ({ ...f, [key]: val })); }

    // Автозаполнение формы данными из OCR сканирования паспорта
    function handlePassportExtracted(data) {
        if (data.full_name) setF('full_name', data.full_name);
        if (data.birth_date) {
            setF('birth_date', data.birth_date);
            setPassport('birth_date', data.birth_date);
        }
        if (data.series) setPassport('series', data.series);
        if (data.number) setPassport('number', data.number);
        if (data.unit_code) setPassport('unit_code', data.unit_code);
        setShowPassport(true);
    }

    function setPassport(key, val) {
        setForm(f => ({
            ...f,
            passport_details: { ...(f.passport_details || defaultClient.passport_details), [key]: val }
        }));
    }

    // Маска СНИЛС: XXX-XXX-XXX XX
    function handleSnilsChange(raw) {
        const digits = raw.replace(/\D/g, '').slice(0, 11);
        let masked = '';
        if (digits.length <= 3) masked = digits;
        else if (digits.length <= 6) masked = digits.slice(0, 3) + '-' + digits.slice(3);
        else if (digits.length <= 9) masked = digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6);
        else masked = digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6, 9) + ' ' + digits.slice(9);
        setPassport('snils', masked);
    }

    // Маска кода подразделения: XXX-XXX
    function handleUnitCodeChange(raw) {
        const digits = raw.replace(/\D/g, '').slice(0, 6);
        const masked = digits.length <= 3 ? digits : digits.slice(0, 3) + '-' + digits.slice(3);
        setPassport('unit_code', masked);
    }

    // ── Банковские реквизиты ──────────────────────────────────────────────
    function setBank(key, val) {
        setForm(f => ({
            ...f,
            bank_details: { ...(f.bank_details || {}), [key]: val }
        }));
    }

    // БИК: 9 цифр + автоподгрузка реквизитов через DaData
    const fetchBankByBik = useCallback(async (bik) => {
        if (!DADATA_TOKEN || bik.length !== 9) return;
        setBankLoading(true);
        setBankFound(false);
        try {
            const res = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/bank', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Token ${DADATA_TOKEN}`,
                },
                body: JSON.stringify({ query: bik }),
            });
            if (!res.ok) throw new Error(`DaData: ${res.status}`);
            const json = await res.json();
            const s = json.suggestions?.[0];
            if (!s) return;
            const d = s.data || {};

            // Форматируем к/с группами по 5
            const formatAcc = (acc) => {
                if (!acc) return '';
                const digits = acc.replace(/\D/g, '').slice(0, 20);
                const parts = [];
                for (let i = 0; i < digits.length; i += 5) parts.push(digits.slice(i, i + 5));
                return parts.join(' ');
            };

            setForm(f => ({
                ...f,
                bank_details: {
                    ...(f.bank_details || {}),
                    bank_name:    s.value || f.bank_details?.bank_name || '',
                    inn:          d.inn   || f.bank_details?.inn || '',
                    kpp:          d.kpp   || f.bank_details?.kpp || '',
                    corr_account: formatAcc(d.correspondent_account) || f.bank_details?.corr_account || '',
                }
            }));
            setBankFound(true);
            toast.success(`Банк найден: ${s.value}`);
        } catch (err) {
            console.warn('[BIK lookup]', err.message);
            toast.error('Не удалось найти банк по БИК');
        } finally {
            setBankLoading(false);
        }
    }, [toast]);

    function handleBikChange(raw) {
        const digits = raw.replace(/\D/g, '').slice(0, 9);
        setBank('bik', digits);
        setBankFound(false);
        // Запускаем автоподгрузку как только введено 9 цифр
        if (digits.length === 9) {
            clearTimeout(bikTimerRef.current);
            bikTimerRef.current = setTimeout(() => fetchBankByBik(digits), 300);
        }
    }

    // Счёт: 20 цифр, группы по 5 через пробел → XXXXX XXXXX XXXXX XXXXX
    function handleAccountChange(key, raw) {
        const digits = raw.replace(/\D/g, '').slice(0, 20);
        const parts = [];
        for (let i = 0; i < digits.length; i += 5) parts.push(digits.slice(i, i + 5));
        setBank(key, parts.join(' '));
    }

    // ИНН банка: 10 цифр
    function handleBankInnChange(raw) {
        setBank('inn', raw.replace(/\D/g, '').slice(0, 10));
    }

    // КПП: 9 цифр
    function handleKppChange(raw) {
        setBank('kpp', raw.replace(/\D/g, '').slice(0, 9));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const phones = (form.phones || [form.phone || '']).map(p => stripPhone(p)).filter(Boolean);
        
        // Синхронизация верхнеуровневых полей с паспортом для госреестров
        const pDetails = form.passport_details || {};
        const passportStr = (pDetails.series && pDetails.number) 
            ? `${pDetails.series} ${pDetails.number}` 
            : (form.passport || '');
        const birthDateStr = form.birth_date || pDetails.birth_date || '';
        const innStr = form.inn || pDetails.inn || '';
        const regAddressStr = form.reg_address || pDetails.registration_address || '';

        const client = {
            ...form,
            phone: phones[0] || '',
            phones: phones.length > 1 ? phones : undefined,
            inn: innStr,
            birth_date: birthDateStr,
            passport: passportStr,
            reg_address: regAddressStr,
            passport_details: {
                ...pDetails,
                inn: innStr,
                birth_date: birthDateStr,
                registration_address: regAddressStr
            },
            additional_contacts: (form.additional_contacts || []).map(c => ({
                ...c,
                phone: stripPhone(c.phone)
            }))
        };
        if (id) {
            const ok = await dispatch({ type: 'UPDATE_CLIENT', client: { ...client, id } });
            if (ok !== false) {
                toast.success('Клиент сохранён');
                navigate(`/clients/${id}`);
            }
        } else {
            const ok = await dispatch({ type: 'ADD_CLIENT', client: { ...client, realtor_id: state.currentUser?.id } });
            if (ok !== false) {
                toast.success('Клиент создан');
                const returnTo = searchParams.get('returnTo');
                if (returnTo) navigate(returnTo);
                else navigate('/clients');
            }
        }
    }

    const sources = ['Авито', 'лидген', 'с показа', 'рекомендация', 'соцсети', 'ТОП-100', 'ХЗ', 'попутная наработка', 'Лид Руководителя', 'Вх. звонок в Офис', 'другое'];
    const clientTypes = [
        { id: 'buyer', label: 'Покупатель' },
        { id: 'seller', label: 'Продавец' },
        { id: 'developer', label: 'Застройщик' },
        { id: 'agent', label: 'Агент' },
        { id: 'landlord', label: 'Арендодатель' },
        { id: 'tenant', label: 'Арендатор' },
        { id: 'lawyer', label: 'Юрист' },
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
            <div className="topbar" style={{ background: 'var(--topbar-bg)', backdropFilter: 'blur(20px) saturate(180%)' }}>
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
                        {/* Кнопка сканирования паспорта */}
                        <button
                            type="button"
                            onClick={() => setShowPassportScan(true)}
                            style={{
                                width: '100%', marginBottom: 16,
                                padding: '14px 0', borderRadius: 16, border: 'none',
                                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                                color: '#ffffff', fontSize: 14, fontWeight: 700,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                cursor: 'pointer', boxShadow: '0 4px 16px rgba(30,41,59,0.25)'
                            }}
                        >
                            <Camera size={20} />
                            <span>📸 Сканировать паспорт (авто-заполнение)</span>
                        </button>

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

                        {(() => {
                            const dups = !id ? findDuplicateClients(
                                (state.clients || []).filter(c => c.id !== id),
                                { full_name: form.full_name, phone: form.phones?.[0] || form.phone }
                            ) : { phoneMatches: [], nameMatches: [] };
                            const matches = [...dups.phoneMatches, ...dups.nameMatches];

                            if (matches.length === 0) return null;
                            return (
                                <div style={{ padding: 14, borderRadius: 16, background: '#FFFBEB', border: '1px solid #F59E0B', marginTop: 12 }}>
                                    <div style={{ fontWeight: 600, color: '#B45309', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                                        <AlertTriangle size={18} /> Найдено совпадение в базе ({matches.length}):
                                    </div>
                                    {matches.slice(0, 3).map(m => (
                                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, padding: '10px 12px', background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)' }}>
                                            <div>
                                                <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14 }}>{m.full_name || 'Без имени'}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.phone || 'Без телефона'}</div>
                                            </div>
                                            <button
                                                type="button"
                                                className="btn btn-secondary card-clickable"
                                                style={{ fontSize: 12, padding: '6px 12px', height: 36, borderRadius: 10 }}
                                                onClick={() => navigate(`/clients/${m.id}`)}
                                            >
                                                Открыть
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}

                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Cake size={14} color="var(--text-muted)" />
                                Дата рождения
                                {(() => {
                                    const bd = form.birth_date || form.passport_details?.birth_date;
                                    if (!bd) return null;
                                    const today = new Date();
                                    const bDate = new Date(bd);
                                    const age = today.getFullYear() - bDate.getFullYear() - (
                                        today.getMonth() < bDate.getMonth() ||
                                        (today.getMonth() === bDate.getMonth() && today.getDate() < bDate.getDate()) ? 1 : 0
                                    );
                                    const thisYear = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
                                    const diff = Math.round((thisYear - today) / (1000 * 60 * 60 * 24));
                                    const isToday = diff === 0;
                                    const isSoon = diff > 0 && diff <= 7;
                                    return (
                                        <span style={{
                                            marginLeft: 4, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
                                            background: isToday ? '#fef3c7' : isSoon ? '#eff6ff' : 'var(--bg-light)',
                                            color: isToday ? '#d97706' : isSoon ? '#2563eb' : 'var(--text-muted)'
                                        }}>
                                            {isToday ? '🎂 Сегодня!' : isSoon ? `через ${diff} дн.` : `${age} лет`}
                                        </span>
                                    );
                                })()}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}><Cake size={18} /></span>
                                <input
                                    type="date"
                                    className="form-input"
                                    style={{ paddingLeft: 46, height: 54, borderRadius: 16, background: 'var(--bg-light)', border: 'none', fontWeight: 300 }}
                                    value={form.birth_date || form.passport_details?.birth_date || ''}
                                    onChange={e => { setF('birth_date', e.target.value); setPassport('birth_date', e.target.value); }}
                                />
                            </div>
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
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                    <span className="font-oswald" style={{ fontWeight: 600 }}><ShieldCheck size={20} /></span>
                                </div>
                                <span className="font-oswald" style={{ fontWeight: 600, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Паспортные данные</span>
                            </div>
                            {showPassport ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
                        </button>

                        {showPassport && (
                            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>

                                {/* Строка 1: Серия · Номер · Дата выдачи */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Серия</label>
                                        <input className="form-input" style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 14 }} value={form.passport_details?.series || ''} onChange={e => setPassport('series', e.target.value)} placeholder="1234" maxLength={4} inputMode="numeric" />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Номер</label>
                                        <input className="form-input" style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 14 }} value={form.passport_details?.number || ''} onChange={e => setPassport('number', e.target.value)} placeholder="567890" maxLength={6} inputMode="numeric" />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Дата выдачи</label>
                                        <input type="date" className="form-input" style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 13 }} value={form.passport_details?.issue_date || ''} onChange={e => setPassport('issue_date', e.target.value)} />
                                    </div>
                                </div>

                                {/* Строка 2: Код подразд. · Дата рождения */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Код подразделения</label>
                                        <input
                                            className="form-input"
                                            style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 14, letterSpacing: '0.05em' }}
                                            value={form.passport_details?.unit_code || ''}
                                            onChange={e => handleUnitCodeChange(e.target.value)}
                                            placeholder="123-456"
                                            inputMode="numeric"
                                            maxLength={7}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Дата рождения</label>
                                        <input type="date" className="form-input" style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 13 }} value={form.birth_date || form.passport_details?.birth_date || ''} onChange={e => { setF('birth_date', e.target.value); setPassport('birth_date', e.target.value); }} />
                                    </div>
                                </div>

                                {/* Строка 3: ИНН · СНИЛС */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>ИНН</label>
                                        <input className="form-input" style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 14 }} value={form.inn || form.passport_details?.inn || ''} onChange={e => { setF('inn', e.target.value); setPassport('inn', e.target.value); }} placeholder="771234567890" maxLength={12} inputMode="numeric" />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>СНИЛС</label>
                                        <input
                                            className="form-input"
                                            style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 14, letterSpacing: '0.05em' }}
                                            value={form.passport_details?.snils || ''}
                                            onChange={e => handleSnilsChange(e.target.value)}
                                            placeholder="000-000-000 00"
                                            inputMode="numeric"
                                            maxLength={14}
                                        />
                                    </div>
                                </div>

                                {/* Кем выдан — полная строка */}
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Кем выдан</label>
                                    <textarea
                                        className="form-textarea"
                                        style={{ minHeight: 64, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 13, padding: '10px 14px', resize: 'none' }}
                                        value={form.passport_details?.issued_by || ''}
                                        onChange={e => setPassport('issued_by', e.target.value)}
                                        placeholder="ГУ МВД России по г. Москве..."
                                        rows={2}
                                    />
                                </div>

                                {/* Адрес регистрации — полная строка */}
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Адрес регистрации</label>
                                    <textarea
                                        className="form-textarea"
                                        style={{ minHeight: 64, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 13, padding: '10px 14px', resize: 'none' }}
                                        value={form.passport_details?.registration_address || ''}
                                        onChange={e => setPassport('registration_address', e.target.value)}
                                        placeholder="г. Москва, ул..."
                                        rows={2}
                                    />
                                </div>

                            </div>
                        )}
                    </div>

                    {/* ── Банковские реквизиты ── */}
                    <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: showBank ? 'white' : 'var(--bg-light)', transition: 'all 0.3s' }}>
                        <button type="button"
                            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', padding: 0 }}
                            onClick={() => {
                                if (!showBank && !form.bank_details?.beneficiary && form.full_name) {
                                    setBank('beneficiary', form.full_name);
                                }
                                setShowBank(!showBank);
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                    <Landmark size={20} />
                                </div>
                                <span className="font-oswald" style={{ fontWeight: 600, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Банковские реквизиты</span>
                            </div>
                            {showBank ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
                        </button>

                        {showBank && (
                            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>

                                {/* Получатель — полная строка */}
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>ФИО / Название получателя</label>
                                    <input
                                        className="form-input"
                                        style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 14 }}
                                        value={form.bank_details?.beneficiary || form.full_name || ''}
                                        onChange={e => setBank('beneficiary', e.target.value)}
                                        placeholder="Иванов Иван Иванович"
                                    />
                                </div>

                                {/* Банк — полная строка */}
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Банк</label>
                                    <input
                                        className="form-input"
                                        style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 14 }}
                                        value={form.bank_details?.bank_name || ''}
                                        onChange={e => setBank('bank_name', e.target.value)}
                                        placeholder="ПАО Сбербанк"
                                    />
                                </div>

                                {/* БИК · ИНН · КПП */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                     <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>
                                            БИК
                                            {bankLoading && <Loader2 size={11} style={{ marginLeft: 5, verticalAlign: 'middle', animation: 'spin 1s linear infinite' }} />}
                                            {bankFound && !bankLoading && <CheckCircle2 size={11} color="#10b981" style={{ marginLeft: 5, verticalAlign: 'middle' }} />}
                                        </label>
                                        <input
                                            className="form-input"
                                            style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: `1.5px solid ${bankFound ? '#10b981' : 'transparent'}`, fontSize: 14, letterSpacing: '0.05em', transition: 'border-color 0.2s' }}
                                            value={form.bank_details?.bik || ''}
                                            onChange={e => handleBikChange(e.target.value)}
                                            placeholder="044525225"
                                            inputMode="numeric"
                                            maxLength={9}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>ИНН банка</label>
                                        <input
                                            className="form-input"
                                            style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 14, letterSpacing: '0.05em' }}
                                            value={form.bank_details?.inn || ''}
                                            onChange={e => handleBankInnChange(e.target.value)}
                                            placeholder="7707083893"
                                            inputMode="numeric"
                                            maxLength={10}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>КПП</label>
                                        <input
                                            className="form-input"
                                            style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 14, letterSpacing: '0.05em' }}
                                            value={form.bank_details?.kpp || ''}
                                            onChange={e => handleKppChange(e.target.value)}
                                            placeholder="770801001"
                                            inputMode="numeric"
                                            maxLength={9}
                                        />
                                    </div>
                                </div>

                                {/* Расчётный счёт */}
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Расчётный счёт (р/с)</label>
                                    <input
                                        className="form-input"
                                        style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 14, letterSpacing: '0.08em', fontVariantNumeric: 'tabular-nums' }}
                                        value={form.bank_details?.account || ''}
                                        onChange={e => handleAccountChange('account', e.target.value)}
                                        placeholder="40817 81038 00000 00000"
                                        inputMode="numeric"
                                        maxLength={23}
                                    />
                                </div>

                                {/* Корр. счёт */}
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Корреспондентский счёт (к/с)</label>
                                    <input
                                        className="form-input"
                                        style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 14, letterSpacing: '0.08em', fontVariantNumeric: 'tabular-nums' }}
                                        value={form.bank_details?.corr_account || ''}
                                        onChange={e => handleAccountChange('corr_account', e.target.value)}
                                        placeholder="30101 81040 00000 00000"
                                        inputMode="numeric"
                                        maxLength={23}
                                    />
                                </div>

                            </div>
                        )}
                    </div>

                </div>
            </form>

            {/* Модальное окно сканирования паспорта */}
            <PassportScanModal
                isOpen={showPassportScan}
                onClose={() => setShowPassportScan(false)}
                onExtracted={handlePassportExtracted}
            />
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
