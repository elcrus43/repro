import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatPrice, cleanPrice } from '../../utils/matching';
import { Edit2, Trash2 } from 'lucide-react';
import { formatPhone } from '../../utils/format';
import { CITIES, KIROV_DISTRICTS } from '../../data/location';
import { BUILDING_TYPES } from '../../data/constants';

const STEPS = ['Основное', 'Параметры', 'Оплата', 'Дополнительно'];

function StepDots({ step }) {
    return (
        <div className="stepper" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
            {STEPS.map((s, i) => (
                <React.Fragment key={s}>
                    <div className="step-item">
                        <div className={`step-circle ${i < step ? 'done' : i === step ? 'active' : ''}`}>{i < step ? '✓' : i + 1}</div>
                    </div>
                    {i < STEPS.length - 1 && <div className={`step-line ${i < step ? 'done' : ''}`} />}
                </React.Fragment>
            ))}
        </div>
    );
}

const defaultReq = {
    status: 'active',
    property_types: ['apartment'],
    market_types: ['secondary'],
    city: 'Новосибирск',
    districts: [],
    budget_min: '',
    budget_max: '',
    rooms: [1, 2],
    area_min: '',
    area_max: '',
    kitchen_area_min: '',
    floor_min: '',
    floor_max: '',
    not_first_floor: false,
    not_last_floor: false,
    building_types: [],
    renovation_min: '',
    balcony_required: false,
    parking_required: false,
    payment_types: ['mortgage'],
    mortgage_approved: false,
    mortgage_bank: '',
    mortgage_amount: '',
    urgency: 'medium',
    desired_move_date: '',
    must_have_notes: '',
    nice_to_have_notes: '',
    deal_breakers: '',
};

export function RequestsPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const user = state.currentUser;
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [scope, setScope] = useState('all'); // all or mine
    const params = new URLSearchParams(window.location.search);
    const clientFilter = params.get('client');

    const requests = state.requests
        .filter(r => scope === 'all' || r.realtor_id === user?.id)
        .filter(r => !clientFilter || r.client_id === clientFilter)
        .filter(r => {
            if (!search) return true;
            const client = state.clients.find(c => c.id === r.client_id);
            return client?.full_name?.toLowerCase().includes(search.toLowerCase()) || client?.phone?.includes(search);
        });

    const statusColors = { active: 'success', paused: 'warning', found: 'primary', refused: 'muted' };
    const statusLabels = { active: 'Активен', paused: 'Пауза', found: 'Найдено', refused: 'Отказ' };

    return (
        <div className="page fade-in">
            <div className="topbar">
                <span className="topbar-title">Запросы</span>
                <button className="btn btn-sm btn-primary" onClick={() => navigate('/requests/new')}>+ Добавить</button>
            </div>
            <div style={{ padding: '12px 16px 0' }}>
                <div className="search-bar">
                    <span className="search-icon">S</span>
                    <input className="form-input" placeholder="Поиск по клиенту" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>
            <div style={{ padding: '0 16px', marginTop: 8 }}>
                <div style={{ display: 'flex', background: 'var(--bg)', padding: 4, borderRadius: 8, gap: 4 }}>
                    <button style={{ flex: 1, padding: '6px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, background: scope === 'all' ? 'white' : 'transparent', boxShadow: scope === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: scope === 'all' ? 'var(--text)' : 'var(--text-muted)' }} onClick={() => setScope('all')}>Общая база</button>
                    <button style={{ flex: 1, padding: '6px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, background: scope === 'mine' ? 'white' : 'transparent', boxShadow: scope === 'mine' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: scope === 'mine' ? 'var(--text)' : 'var(--text-muted)' }} onClick={() => setScope('mine')}>Мои запросы</button>
                </div>
            </div>

            <div className="page-content" style={{ paddingTop: 12 }}>
                {requests.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-title">Нет запросов</div>
                        <div className="empty-desc">Добавьте запрос покупателя</div>
                        <button className="btn btn-primary" onClick={() => navigate('/requests/new')}>+ Добавить запрос</button>
                    </div>
                )}
                {requests.map(req => {
                    const client = state.clients.find(c => c.id === req.client_id);
                    const matches = state.matches.filter(m => m.request_id === req.id);
                    const handleDelete = (e) => {
                        e.stopPropagation();
                        if (window.confirm('Удалить запрос?')) {
                            dispatch({ type: 'DELETE_REQUEST', id: req.id });
                        }
                    };
                    const handleEdit = (e) => {
                        e.stopPropagation();
                        navigate(`/requests/${req.id}/edit`);
                    };
                    return (
                        <div key={req.id} className="card card-clickable" onClick={() => navigate(`/requests/${req.id}`)}>
                            <div className="flex items-start gap-8" style={{ marginBottom: 8 }}>
                                <div className="avatar avatar-sm" style={{ background: 'linear-gradient(135deg,#2563EB,#7c3aed)' }}>
                                    {client?.full_name?.split(' ').slice(0, 2).map(w => w[0]).join('') || '?'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <span style={{ fontWeight: 700, fontSize: 15 }}>{client?.full_name || '—'}</span>
                                    {client && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatPhone(client.phone)}</div>}
                                </div>
                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                    <span className={`badge badge-${statusColors[req.status]}`}>{statusLabels[req.status]}</span>
                                    <button className="icon-btn" onClick={handleEdit}><Edit2 size={16} /></button>
                                    <button className="icon-btn" onClick={handleDelete}><Trash2 size={16} /></button>
                                </div>
                            </div>
                            <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 2 }}>
                                {req.property_types?.map(t => t === 'apartment' ? 'Квартира' : t === 'house' ? 'Дом' : t).join(', ')}
                                {req.rooms?.length > 0 && ` · ${req.rooms.map(r => r === 0 ? 'Студия' : `${r}к`).join('/')}`}
                                {req.budget_max && ` · до ${formatPrice(req.budget_max)}`}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                {req.city}{req.districts?.length > 0 && ` · ${req.districts.join(', ')}`}
                            </div>
                            {matches.length > 0 && <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 4 }}>Матчей: {matches.length}</div>}
                        </div>
                    );
                })}
            </div >
            <button className="fab" onClick={() => navigate('/requests/new')}>+</button>
        </div >
    );
}

export function RequestCardPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const id = window.location.pathname.split('/')[2];
    const req = state.requests.find(r => r.id === id);

    if (!req) return (
        <div className="page"><div className="topbar"><button className="topbar-back" onClick={() => navigate('/requests')}>←</button><span className="topbar-title">Не найдено</span></div></div>
    );

    const client = state.clients.find(c => c.id === req.client_id);
    const matches = state.matches.filter(m => m.request_id === id);

    const urgencyLabel = { low: 'Низкая', medium: 'Средняя', high: 'Высокая' };
    const paymentLabel = { cash: 'Наличные', mortgage: 'Ипотека', matcapital: 'Маткапитал', certificate: 'Сертификат', mixed: 'Смешанная' };
    const pTypes = req.payment_types || ['mortgage'];

    return (
        <div className="page fade-in">
            <div className="topbar">
                <button className="topbar-back" onClick={() => navigate('/requests')}>←</button>
                <span className="topbar-title">Запрос</span>
                <div className="topbar-actions">
                    <button className="icon-btn" onClick={() => navigate(`/requests/${id}/edit`)}><Edit2 size={18} /></button>
                    <button className="icon-btn" onClick={() => { if (window.confirm('Удалить запрос?')) { dispatch({ type: 'DELETE_REQUEST', id }); navigate('/requests'); } }}><Trash2 size={18} /></button>
                </div>
            </div>
            <div className="page-content">
                {/* Client */}
                {client && (
                    <div className="card card-clickable" onClick={() => navigate(`/clients/${client.id}`)}>
                        <div className="flex items-center gap-12">
                            <div className="avatar" style={{ background: 'linear-gradient(135deg,#2563EB,#7c3aed)' }}>
                                {client.full_name?.split(' ').slice(0, 2).map(w => w[0]).join('')}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700 }}>{client.full_name}</div>
                                <a href={`tel:${client.phone}`} style={{ fontSize: 13, color: 'var(--primary)' }} onClick={e => e.stopPropagation()}>{formatPhone(client.phone)}</a>
                            </div>
                            <span className={`badge badge-${req.status === 'active' ? 'success' : 'muted'}`}>{req.status === 'active' ? 'Активен' : req.status}</span>
                        </div>
                    </div>
                )}

                {/* What they want */}
                <div className="card">
                    <div className="section-title" style={{ marginBottom: 8 }}>Что ищет</div>
                    <div className="info-row"><span className="info-key">Тип</span><span className="info-val">{req.property_types?.map(t => t === 'apartment' ? 'Квартира' : t === 'house' ? 'Дом' : t).join(', ')}</span></div>
                    <div className="info-row"><span className="info-key">Рынок</span><span className="info-val">{req.market_types?.map(t => t === 'secondary' ? 'Вторичка' : 'Новостройка').join(' + ')}</span></div>
                    <div className="info-row"><span className="info-key">Комнаты</span><span className="info-val">{req.rooms?.map(r => r === 0 ? 'Студия' : `${r}к`).join(' или ')}</span></div>
                    <div className="info-row"><span className="info-key">Город</span><span className="info-val">{req.city}</span></div>
                    {req.districts?.length > 0 && <div className="info-row"><span className="info-key">Районы</span><span className="info-val">{req.districts.join(', ')}</span></div>}
                    <div className="info-row"><span className="info-key">Бюджет</span><span className="info-val">{req.budget_min ? `${formatPrice(req.budget_min)} — ` : ''}{formatPrice(req.budget_max)}</span></div>
                    {(req.area_min || req.area_max) && <div className="info-row"><span className="info-key">Площадь</span><span className="info-val">{req.area_min ? `от ${req.area_min} м²` : ''}{req.area_max ? ` до ${req.area_max} м²` : ''}</span></div>}
                    {req.kitchen_area_min && <div className="info-row"><span className="info-key">Кухня</span><span className="info-val">от {req.kitchen_area_min} м²</span></div>}
                    {(req.floor_min || req.floor_max) && <div className="info-row"><span className="info-key">Этаж</span><span className="info-val">{req.floor_min || 1}–{req.floor_max || '∞'}</span></div>}
                    <div className="info-row">
                        <span className="info-key">Ограничения</span>
                        <span className="info-val">
                            {[req.not_first_floor && 'не первый', req.not_last_floor && 'не последний'].filter(Boolean).join(', ') || '—'}
                        </span>
                    </div>
                    {req.balcony_required && <div className="info-row"><span className="info-key">Балкон</span><span className="info-val">Нужен</span></div>}
                    {req.building_types?.length > 0 && <div className="info-row"><span className="info-key">Тип дома</span><span className="info-val">{req.building_types.map(bt => BUILDING_TYPES[bt] || bt).join(', ')}</span></div>}
                    {req.renovation_min && <div className="info-row" style={{ borderBottom: 'none' }}><span className="info-key">Ремонт</span><span className="info-val">от {req.renovation_min}</span></div>}
                </div>

                {/* Payment */}
                <div className="card">
                    <div className="section-title" style={{ marginBottom: 8 }}>💳 Оплата</div>
                    <div className="info-row"><span className="info-key">Тип оплаты</span><span className="info-val">{pTypes.map(pt => paymentLabel[pt] || pt).join(', ')}</span></div>
                    {pTypes.includes('mortgage') && <div className="info-row"><span className="info-key">Ипотека одобрена</span><span className="info-val">{req.mortgage_approved ? 'Да' : 'Нет'}</span></div>}
                    {pTypes.includes('mortgage') && req.mortgage_bank && <div className="info-row"><span className="info-key">Банк</span><span className="info-val">{req.mortgage_bank}</span></div>}
                    {pTypes.includes('mortgage') && req.mortgage_amount > 0 && <div className="info-row"><span className="info-key">Сумма ипотеки</span><span className="info-val">{formatPrice(req.mortgage_amount)}</span></div>}
                    {req.urgency && <div className="info-row"><span className="info-key">Срочность</span><span className="info-val">{urgencyLabel[req.urgency]}</span></div>}
                    {req.desired_move_date && <div className="info-row" style={{ borderBottom: 'none' }}><span className="info-key">Заселение до</span><span className="info-val">{new Date(req.desired_move_date).toLocaleDateString('ru-RU')}</span></div>}
                </div>

                {/* Notes */}
                {(req.must_have_notes || req.nice_to_have_notes || req.deal_breakers) && (
                    <div className="card">
                        {req.must_have_notes && <><div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Обязательно</div><p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{req.must_have_notes}</p></>}
                        {req.nice_to_have_notes && <><div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Желательно</div><p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{req.nice_to_have_notes}</p></>}
                        {req.deal_breakers && <><div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Категорически нет</div><p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{req.deal_breakers}</p></>}
                    </div>
                )}

                {/* Find button */}
                <button className="btn btn-primary btn-full" onClick={() => navigate(`/matches?request=${id}`)}>
                    Найти объекты · Совпадений: {matches.length}
                </button>
            </div>
        </div>
    );
}

export function RequestFormPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const path = window.location.pathname;
    const isEdit = path.includes('/edit');
    const id = isEdit ? path.split('/')[2] : null;
    const existing = id ? state.requests.find(r => r.id === id) : null;
    const params = new URLSearchParams(window.location.search);
    const preClient = params.get('client');

    const [step, setStep] = useState(0);
    const [form, setForm] = useState(existing || { ...defaultReq, client_id: preClient || '', realtor_id: state.currentUser?.id });
    const [districtInput, setDistrictInput] = useState('');

    function setF(key, val) { setForm(f => ({ ...f, [key]: val })); }
    function toggleArr(key, val) {
        setForm(f => ({ ...f, [key]: f[key]?.includes(val) ? f[key].filter(x => x !== val) : [...(f[key] || []), val] }));
    }

    function handleSubmit() {
        const req = {
            ...form,
            budget_min: cleanPrice(form.budget_min),
            budget_max: cleanPrice(form.budget_max),
            mortgage_amount: cleanPrice(form.mortgage_amount),
            area_min: Number(form.area_min) || null,
            area_max: Number(form.area_max) || null,
            kitchen_area_min: Number(form.kitchen_area_min) || null,
            floor_min: Number(form.floor_min) || null,
            floor_max: Number(form.floor_max) || null,
            client_id: form.client_id || null,
            desired_move_date: form.desired_move_date || null
        };
        if (isEdit) {
            dispatch({ type: 'UPDATE_REQUEST', request: { ...req, id } });
            navigate(`/requests/${id}`);
        } else {
            dispatch({ type: 'ADD_REQUEST', request: { ...req, realtor_id: state.currentUser?.id } });
            navigate('/requests');
        }
    }

    const myClients = state.clients.filter(c => c.realtor_id === state.currentUser?.id && c.client_types?.includes('buyer'));

    return (
        <div className="page fade-in">
            <div className="topbar">
                <button className="topbar-back" onClick={() => step > 0 ? setStep(s => s - 1) : navigate(isEdit ? `/requests/${id}` : '/requests')}>←</button>
                <span className="topbar-title">{isEdit ? 'Редактировать запрос' : 'Новый запрос'}</span>
            </div>
            <StepDots step={step} />

            <div className="page-content">
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>Шаг {step + 1} — {STEPS[step]}</div>

                {step === 0 && (
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Покупатель</label>
                            <select className="form-select" value={form.client_id || ''} onChange={e => setF('client_id', e.target.value)}>
                                <option value="">— Выбрать клиента —</option>
                                {myClients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Тип объекта <span className="required">*</span></label>
                            <div className="chip-group">
                                {[['apartment', 'Квартира'], ['house', 'Дом'], ['land', 'Участок'], ['commercial', 'Коммерческая'], ['room', 'Комната']].map(([v, l]) => (
                                    <button key={v} type="button" className={`chip ${form.property_types?.includes(v) ? 'active' : ''}`} onClick={() => toggleArr('property_types', v)}>{l}</button>
                                ))}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Рынок</label>
                            <div className="chip-group">
                                {[['secondary', 'Вторичка'], ['new_building', 'Новостройка']].map(([v, l]) => (
                                    <button key={v} type="button" className={`chip ${form.market_types?.includes(v) ? 'active' : ''}`} onClick={() => toggleArr('market_types', v)}>{l}</button>
                                ))}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Город <span className="required">*</span></label>
                            <div className="chip-group">
                                {CITIES.map(c => (
                                    <button key={c} type="button" className={`chip ${form.city === c ? 'active' : ''}`} onClick={() => { setF('city', c); setF('districts', []); }}>{c}</button>
                                ))}
                            </div>
                        </div>
                        {form.city === 'Киров' && (
                            <div className="form-group">
                                <label className="form-label">Районы и микрорайоны Кирова</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {KIROV_DISTRICTS.map(d => (
                                        <div key={d.name} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)' }}>{d.name}</span>
                                                <button type="button"
                                                    className={`chip chip-sm ${form.districts?.includes(d.name) ? 'active' : ''}`}
                                                    onClick={() => toggleArr('districts', d.name)}
                                                >
                                                    Весь район
                                                </button>
                                            </div>
                                            <div className="chip-group" style={{ flexWrap: 'wrap' }}>
                                                {d.microdistricts.map(m => (
                                                    <button key={m} type="button"
                                                        className={`chip chip-sm ${(form.microdistricts || []).includes(m) ? 'active' : ''}`}
                                                        onClick={() => toggleArr('microdistricts', m)}
                                                    >
                                                        {m}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {form.city !== 'Киров' && form.city !== '' && (
                            <div className="form-group">
                                <label className="form-label">Районы (несколько)</label>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input className="form-input" value={districtInput} onChange={e => setDistrictInput(e.target.value)} placeholder="Название района" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (districtInput.trim()) { toggleArr('districts', districtInput.trim()); setDistrictInput(''); } } }} />
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { if (districtInput.trim()) { toggleArr('districts', districtInput.trim()); setDistrictInput(''); } }}>+ Добавить</button>
                                </div>
                                <div className="chip-group" style={{ marginTop: 6 }}>
                                    {form.districts?.map(d => (
                                        <span key={d} className="chip active" onClick={() => toggleArr('districts', d)}>{d} ✕</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {step === 1 && (
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="input-row">
                            <div className="form-group">
                                <label className="form-label">Бюджет от</label>
                                <input className="form-input" type="number" value={form.budget_min || ''} onChange={e => setF('budget_min', e.target.value)} placeholder="3000000" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Бюджет до <span className="required">*</span></label>
                                <input className="form-input" type="number" value={form.budget_max || ''} onChange={e => setF('budget_max', e.target.value)} placeholder="5000000" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Комнаты <span className="required">*</span></label>
                            <div className="chip-group">
                                {[0, 1, 2, 3, 4].map(r => (
                                    <button key={r} type="button" className={`chip ${form.rooms?.includes(r) ? 'active' : ''}`} onClick={() => toggleArr('rooms', r)}>{r === 0 ? 'Студия' : r === 4 ? '4+' : r}</button>
                                ))}
                            </div>
                        </div>
                        <div className="input-row">
                            <div className="form-group">
                                <label className="form-label">Площадь от</label>
                                <input className="form-input" type="number" value={form.area_min || ''} onChange={e => setF('area_min', e.target.value)} placeholder="35" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Площадь до</label>
                                <input className="form-input" type="number" value={form.area_max || ''} onChange={e => setF('area_max', e.target.value)} placeholder="80" />
                            </div>
                        </div>
                        <div className="input-row">
                            <div className="form-group">
                                <label className="form-label">Кухня от, м²</label>
                                <input className="form-input" type="number" value={form.kitchen_area_min || ''} onChange={e => setF('kitchen_area_min', e.target.value)} placeholder="8" />
                            </div>
                            <div className="form-group" />
                        </div>
                        <div className="input-row">
                            <div className="form-group">
                                <label className="form-label">Этаж от</label>
                                <input className="form-input" type="number" value={form.floor_min || ''} onChange={e => setF('floor_min', e.target.value)} placeholder="2" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Этаж до</label>
                                <input className="form-input" type="number" value={form.floor_max || ''} onChange={e => setF('floor_max', e.target.value)} placeholder="8" />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            {[['not_first_floor', 'Не первый'], ['not_last_floor', 'Не последний'], ['balcony_required', 'Нужен балкон'], ['parking_required', 'Нужна парковка']].map(([key, label]) => (
                                <button key={key} type="button" className={`chip ${form[key] ? 'active' : ''}`} onClick={() => setF(key, !form[key])}>{label}</button>
                            ))}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Мин. ремонт</label>
                            <div className="chip-group">
                                {[['', 'Любой'], ['none', 'Без ремонта'], ['cosmetic', 'Косметический'], ['euro', 'Евро'], ['designer', 'Дизайнерский']].map(([v, l]) => (
                                    <button key={v} type="button" className={`chip ${form.renovation_min === v ? 'active' : ''}`} onClick={() => setF('renovation_min', v)}>{l}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Способы оплаты <span className="required">*</span></label>
                            <div className="chip-group">
                                {[['cash', 'Наличные'], ['mortgage', 'Ипотека'], ['matcapital', 'Маткапитал'], ['mixed', 'Смешанная']].map(([v, l]) => {
                                    const isActive = (form.payment_types || []).includes(v);
                                    return (
                                        <button key={v} type="button" className={`chip ${isActive ? 'active' : ''}`} onClick={() => {
                                            const pts = form.payment_types || [];
                                            setF('payment_types', isActive ? pts.filter(t => t !== v) : [...pts, v]);
                                        }}>{l}</button>
                                    );
                                })}
                            </div>
                        </div>
                        {(form.payment_types || []).includes('mortgage') && (
                            <>
                                <div className="toggle-row">
                                    <span className="toggle-label">Ипотека одобрена</span>
                                    <label className="toggle-switch">
                                        <input type="checkbox" checked={!!form.mortgage_approved} onChange={e => setF('mortgage_approved', e.target.checked)} />
                                        <span className="toggle-slider" />
                                    </label>
                                </div>
                                {form.mortgage_approved && (
                                    <>
                                        <div className="form-group">
                                            <label className="form-label">Банк</label>
                                            <input className="form-input" value={form.mortgage_bank || ''} onChange={e => setF('mortgage_bank', e.target.value)} placeholder="Сбербанк" />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Одобренная сумма</label>
                                            <input className="form-input" value={form.mortgage_amount ? Number(form.mortgage_amount).toLocaleString('ru-RU') : ''} onChange={e => setF('mortgage_amount', e.target.value.replace(/\s/g, ''))} placeholder="4 200 000" />
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                        <div className="form-group">
                            <label className="form-label">Срочность</label>
                            <div className="chip-group">
                                {[['low', 'Низкая'], ['medium', 'Средняя'], ['high', 'Высокая']].map(([v, l]) => (
                                    <button key={v} type="button" className={`chip ${form.urgency === v ? 'active' : ''}`} onClick={() => setF('urgency', v)}>{l}</button>
                                ))}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Желаемая дата заселения</label>
                            <input className="form-input" type="date" value={form.desired_move_date || ''} onChange={e => setF('desired_move_date', e.target.value)} />
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                            { label: 'Обязательные требования', key: 'must_have_notes', placeholder: 'Например: рядом школа, тихий двор...' },
                            { label: 'Желательное', key: 'nice_to_have_notes', placeholder: 'Было бы хорошо...' },
                            { label: 'Категорически нет', key: 'deal_breakers', placeholder: 'Смежные комнаты, первый этаж...' },
                        ].map(({ label, key, placeholder }) => (
                            <div key={key} className="form-group">
                                <label className="form-label">{label}</label>
                                <textarea className="form-textarea" value={form[key] || ''} onChange={e => setF(key, e.target.value)} placeholder={placeholder} />
                            </div>
                        ))}
                    </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    {step > 0 && <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(s => s - 1)}>← Назад</button>}
                    {step < STEPS.length - 1 ? (
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep(s => s + 1)}>Далее →</button>
                    ) : (
                        <button className="btn btn-success" style={{ flex: 1 }} onClick={handleSubmit}>Сохранить и найти объекты</button>
                    )}
                </div>
            </div>
        </div>
    );
}
/* The filter case for requests might be missing filter state in the list page */
