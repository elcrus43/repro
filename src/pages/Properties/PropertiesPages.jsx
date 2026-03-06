import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatPrice, cleanPrice } from '../../utils/matching';
import { formatPhone, formatNumber } from '../../utils/format';
import { generateDocx } from '../../utils/docxGenerator';
import { CITIES, KIROV_DISTRICTS } from '../../data/location';
import { Edit2, Trash2, MapPin, Calendar, Eye, Activity } from 'lucide-react';
import { BUILDING_TYPES, RENOVATION_LABELS, BALCONY_LABELS, MARKET_LABELS, STATUS_LABELS, STATUS_COLORS } from '../../data/constants';

const STATUS_FUNNEL = [
    { id: 'meeting', label: 'Встреча', color: 'primary' },
    { id: 'agreement', label: 'АД', color: 'warning-alt' },
    { id: 'advertising', label: 'В рекламе', color: 'success' },
    { id: 'deposit', label: 'Задаток', color: 'warning' },
    { id: 'deal', label: 'Сделка', color: 'success' },
    { id: 'rejected', label: 'Отказ', color: 'danger' }
];

export function PropertiesPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const user = state.currentUser;
    const [search, setSearch] = useState('');
    const [scope, setScope] = useState('all'); // all or mine
    const [filter, setFilter] = useState('all');

    const params = new URLSearchParams(window.location.search);
    const clientFilter = params.get('client');

    const properties = state.properties
        .filter(p => scope === 'all' || p.realtor_id === user?.id)
        .filter(p => !clientFilter || p.client_id === clientFilter)
        .filter(p => {
            if (filter === 'apartment') return p.property_type === 'apartment';
            if (filter === 'house') return p.property_type === 'house';
            if (filter === 'active') return ['advertising', 'active'].includes(p.status); // handle legacy 'active'
            return true;
        })
        .filter(p => !search || p.address?.toLowerCase().includes(search.toLowerCase()) || p.district?.toLowerCase().includes(search.toLowerCase()));

    const statusLabels = STATUS_LABELS;
    const statusColors = STATUS_COLORS;

    return (
        <div className="page fade-in">
            <div className="topbar">
                <span className="topbar-title">Объекты</span>
                <button className="btn btn-sm btn-primary" onClick={() => navigate('/properties/new')}>+ Добавить</button>
            </div>
            <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="search-bar">
                    <span className="search-icon">S</span>
                    <input className="form-input" placeholder="Поиск по адресу или району" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>
            <div className="tab-filters">
                {[['all', 'Все'], ['apartment', 'Квартиры'], ['house', 'Дома'], ['active', 'В рекламе']].map(([v, l]) => (
                    <button key={v} className={`tab-filter ${filter === v ? 'active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
                ))}
            </div>

            <div style={{ padding: '0 16px', marginTop: 8 }}>
                <div style={{ display: 'flex', background: 'var(--bg)', padding: 4, borderRadius: 8, gap: 4 }}>
                    <button style={{ flex: 1, padding: '6px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, background: scope === 'all' ? 'white' : 'transparent', boxShadow: scope === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: scope === 'all' ? 'var(--text)' : 'var(--text-muted)' }} onClick={() => setScope('all')}>Общая база</button>
                    <button style={{ flex: 1, padding: '6px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, background: scope === 'mine' ? 'white' : 'transparent', boxShadow: scope === 'mine' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: scope === 'mine' ? 'var(--text)' : 'var(--text-muted)' }} onClick={() => setScope('mine')}>Мои объекты</button>
                </div>
            </div>

            <div className="page-content" style={{ paddingTop: 8 }}>
                {properties.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-title">Нет объектов</div>
                        <div className="empty-desc">Добавьте первый объект</div>
                        <button className="btn btn-primary" onClick={() => navigate('/properties/new')}>+ Добавить объект</button>
                    </div>
                )}
                {properties.map(prop => {
                    const client = state.clients.find(c => c.id === prop.client_id);

                    const handleDelete = (e) => {
                        e.stopPropagation();
                        if (window.confirm('Удалить объект?')) {
                            dispatch({ type: 'DELETE_PROPERTY', id: prop.id });
                        }
                    };
                    const handleEdit = (e) => {
                        e.stopPropagation();
                        navigate(`/properties/${prop.id}/edit`);
                    };
                    const handleShow = (e) => {
                        e.stopPropagation();
                        navigate(`/showings/new?propertyId=${prop.id}${client ? `&clientId=${client.id}` : ''}`);
                    };
                    const updateStatus = (e, newStatus) => {
                        e.stopPropagation();
                        dispatch({ type: 'UPDATE_PROPERTY', property: { ...prop, status: newStatus } });
                    };

                    return (
                        <div key={prop.id} className="card card-clickable" style={{ marginBottom: 12 }} onClick={() => navigate(`/properties/${prop.id}`)}>
                            <div className="flex items-start gap-8" style={{ marginBottom: 10 }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)' }}>{formatNumber(prop.price)} ₽</div>
                                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                        <span className={`badge badge-${statusColors[prop.status] || 'muted'}`}>{statusLabels[prop.status] || prop.status}</span>
                                        {prop.commission > 0 && <span className="badge badge-success">Ком: {formatNumber(prop.commission)} ₽</span>}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <button className="icon-btn" title="Показ" onClick={handleShow} style={{ color: 'var(--primary)' }}><Calendar size={18} /></button>
                                    <button className="icon-btn" onClick={handleEdit}><Edit2 size={16} /></button>
                                    <button className="icon-btn" onClick={handleDelete}><Trash2 size={16} /></button>
                                </div>
                            </div>
                            <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600, marginBottom: 2 }}>
                                {prop.rooms > 0 ? `${prop.rooms}-комн.` : 'Студия'} · {formatNumber(prop.area_total)} м² · {prop.floor}/{prop.floors_total} эт.
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{prop.city}, {prop.district && `${prop.district}, `}{prop.address}</div>

                            {/* Funnel Switcher */}
                            <div className="funnel-bar">
                                {STATUS_FUNNEL.map(s => {
                                    const isActive = prop.status === s.id;
                                    const isOwner = user?.id === prop.realtor_id;
                                    return (
                                        <div key={s.id}
                                            className={`funnel-item ${isActive ? 'active' : ''}`}
                                            style={{ opacity: !isOwner && !isActive ? 0.5 : 1, cursor: isOwner ? 'pointer' : 'default' }}
                                            onClick={(e) => isOwner && updateStatus(e, s.id)}
                                        >
                                            {s.label}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
            <button className="fab" onClick={() => navigate('/properties/new')}>+</button>
        </div>
    );
}

export function PropertyCardPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const id = window.location.pathname.split('/')[2];
    const user = state.currentUser;
    const prop = state.properties.find(p => p.id === id);

    if (!prop) return (
        <div className="page"><div className="topbar"><button className="topbar-back" onClick={() => navigate('/properties')}>←</button><span className="topbar-title">Не найдено</span></div></div>
    );

    const client = state.clients.find(c => c.id === prop.client_id);
    const realtor = state.profiles?.find(p => p.id === prop.realtor_id);
    const matches = state.matches.filter(m => m.property_id === id);

    function handleDelete() {
        if (window.confirm('Удалить объект?')) { dispatch({ type: 'DELETE_PROPERTY', id }); navigate('/properties'); }
    }


    const handleGenerateContract = async () => {
        try {
            const pd = client?.passport_details || {};
            const data = {
                // Основные данные объекта
                property_city: prop.city || '',
                property_district: prop.district || '',
                property_address: prop.address || '',
                property_cadastral: prop.cadastral_number || '',
                property_area: String(prop.area_total || ''),
                property_price: prop.price ? formatNumber(prop.price) : '',
                property_rooms: String(prop.rooms || ''),

                // Данные клиента-продавца
                client_fullname: client?.full_name || '',
                client_phone: client?.phone ? formatPhone(client?.phone) : '',

                // Паспортные данные
                passport_series: pd.series || '',
                passport_number: pd.number || '',
                passport_issued_by: pd.issued_by || '',
                passport_unit_code: pd.unit_code || '',
                passport_issue_date: pd.issue_date ? new Date(pd.issue_date).toLocaleDateString('ru-RU') : '',
                passport_address: pd.registration_address || '',

                // Данные риэлтора (исполнителя)
                realtor_fullname: realtor?.full_name || '',
                realtor_phone: realtor?.phone ? formatPhone(realtor?.phone) : '',
                agency_name: realtor?.agency_name || '',

                // Системные
                current_date: new Date().toLocaleDateString('ru-RU')
            };

            await generateDocx('/doc/ДОГОВОР УСЛУГ продажа.docx', data, `Договор_${client?.full_name || 'Клиент'}.docx`);
        } catch (e) {
            alert('Ошибка генерации договора: ' + e.message);
        }
    };

    const rows = [
        ['Площадь', `${prop.area_total}${prop.area_living ? ' / ' + prop.area_living : ''}${prop.area_kitchen ? ' / ' + prop.area_kitchen : ''} м²`],
        ['Этаж', `${prop.floor} из ${prop.floors_total}`],
        ['Тип дома', prop.building_type ? BUILDING_TYPES[prop.building_type] : '—'],
        ['Год постройки', prop.year_built || '—'],
        ['Ремонт', prop.renovation ? RENOVATION_LABELS[prop.renovation] : '—'],
        ['Балкон', prop.balcony ? BALCONY_LABELS[prop.balcony] : '—'],
        ['Санузел', prop.bathroom === 'separate' ? 'Раздельный' : prop.bathroom === 'combined' ? 'Совмещённый' : '—'],
        ['Парковка', prop.parking === 'none' || !prop.parking ? 'Нет' : prop.parking === 'yard' ? 'Двор' : prop.parking === 'underground' ? 'Подземная' : 'Гараж'],
        ['Рынок', prop.market_type ? MARKET_LABELS[prop.market_type] : '—'],
    ].filter(([, v]) => v && v !== '—');

    return (
        <div className="page fade-in">
            <div className="topbar">
                <button className="topbar-back" onClick={() => navigate('/properties')}>←</button>
                <span className="topbar-title">Объект</span>
                <div className="topbar-actions">
                    <button className="icon-btn" onClick={() => navigate(`/properties/${id}/edit`)}><Edit2 size={18} /></button>
                    <button className="icon-btn" onClick={handleDelete}><Trash2 size={18} /></button>
                </div>
            </div>
            <div className="page-content">
                {/* Price + Status */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 24, fontWeight: 800 }}>{formatNumber(prop.price)} ₽</span>
                        <span className={`badge badge-${STATUS_COLORS[prop.status] || 'muted'}`}>{STATUS_LABELS[prop.status] || prop.status}</span>
                    </div>
                    {prop.commission > 0 && (
                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--success)', marginBottom: 8 }}>Комиссия: {formatNumber(prop.commission)} ₽</div>
                    )}
                    {prop.price_min && prop.price_min < prop.price && (
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Торг до {formatNumber(prop.price_min)} ₽</div>
                    )}
                    <div style={{ fontSize: 16, fontWeight: 600, marginTop: 6 }}>
                        {prop.rooms > 0 ? `${prop.rooms}-комнатная` : 'Студия'} {prop.property_type === 'apartment' ? 'квартира' : 'объект'}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>г. {prop.city}, {prop.district && `${prop.district}, `}{prop.address}</div>
                    {prop.residential_complex && <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>ЖК: {prop.residential_complex}</div>}
                </div>

                {/* Realtor Info (Owner) */}
                {realtor && realtor.id !== user?.id && (
                    <div className="card" style={{ background: 'var(--primary-light)', borderColor: 'var(--primary-light)' }}>
                        <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Этот объект ведет</div>
                        <div className="flex items-center gap-12">
                            <div className="avatar" style={{ background: 'var(--primary)', color: 'white', width: 44, height: 44, fontSize: 16 }}>
                                {realtor.full_name?.split(' ').slice(0, 2).map(w => w[0]).join('') || 'Р'}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: 16 }}>{realtor.full_name}</div>
                                {realtor.agency_name && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{realtor.agency_name}</div>}
                                {realtor.phone && (
                                    <a href={`tel:${realtor.phone}`} style={{ fontSize: 14, color: 'var(--primary)', fontWeight: 600, display: 'inline-block', marginTop: 4 }}>
                                        {formatPhone(realtor.phone)}
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Params */}
                <div className="card">
                    <div className="section-title" style={{ marginBottom: 8 }}>Параметры</div>
                    {rows.map(([k, v]) => (
                        <div key={k} className="info-row"><span className="info-key">{k}</span><span className="info-val">{v}</span></div>
                    ))}
                </div>

                {/* Legal */}
                <div className="card">
                    <div className="section-title" style={{ marginBottom: 8 }}>Юридическое</div>
                    <div className="check-item"><span className={prop.mortgage_available ? 'check-ok' : 'check-warn'}>{prop.mortgage_available ? 'Y' : 'N'}</span> Подходит под ипотеку</div>
                    <div className="check-item"><span className={prop.matcapital_available ? 'check-ok' : 'check-warn'}>{prop.matcapital_available ? 'Y' : 'N'}</span> Подходит под маткапитал</div>
                    {prop.ownership_type && <div className="check-item"><span></span> Собственность: {prop.ownership_type === 'individual' ? 'единоличная' : prop.ownership_type === 'shared' ? 'долевая' : 'совместная'}</div>}
                    <div className="check-item"><span className={prop.encumbrance ? 'check-warn' : 'check-ok'}>{prop.encumbrance ? '!' : '✓'}</span> {prop.encumbrance ? 'Есть обременение' : 'Обременений нет'}</div>
                    {prop.docs_ready && <div className="check-item"><span className="check-ok">✓</span> Документы готовы</div>}
                    {prop.sale_type && <div className="check-item"><span></span> {prop.sale_type === 'free' ? 'Свободная продажа' : 'Альтернатива'}</div>}
                </div>

                {/* Seller */}
                {client && (
                    <div className="card card-clickable" onClick={() => navigate(`/clients/${client.id}`)}>
                        <div className="flex items-center gap-12">
                            <div className="avatar" style={{ background: 'linear-gradient(135deg,#16A34A,#059669)' }}>
                                {client.full_name?.split(' ').slice(0, 2).map(w => w[0]).join('')}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700 }}>Продавец: {client.full_name}</div>
                                <a href={`tel:${client.phone}`} style={{ fontSize: 13, color: 'var(--primary)' }} onClick={e => e.stopPropagation()}>{formatPhone(client.phone)}</a>
                            </div>
                            <span style={{ color: 'var(--text-muted)' }}>›</span>
                        </div>
                    </div>
                )}

                {/* Description */}
                {prop.description && (
                    <div className="card">
                        <div className="section-title" style={{ marginBottom: 6 }}>Описание</div>
                        <p style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{prop.description}</p>
                    </div>
                )}

                {/* Funnel Switcher for Card */}
                {user?.id === prop.realtor_id && (
                    <div className="card" style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Статус объекта</div>
                        <div className="funnel-bar">
                            {STATUS_FUNNEL.map(s => (
                                <div key={s.id}
                                    className={`funnel-item ${prop.status === s.id ? 'active' : ''}`}
                                    onClick={() => dispatch({ type: 'UPDATE_PROPERTY', property: { ...prop, status: s.id } })}
                                >
                                    {s.label}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Matches button */}
                <button className="btn btn-success btn-full" onClick={() => navigate(`/matches?property=${id}`)} style={{ marginBottom: 8 }}>
                    Найти покупателей · Совпадений: {matches.length}
                </button>

                {/* Print Contract Button */}
                <button className="btn btn-secondary btn-full" onClick={handleGenerateContract} style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                    <span>📄</span> Сгенерировать договор
                </button>
            </div>
        </div>
    );
}

const STEPS = ['Основное', 'Параметры', 'Юридическое', 'Описание'];

const defaultProp = {
    status: 'active', property_type: 'apartment', market_type: 'secondary',
    city: 'Новосибирск', district: '', address: '', price: '', price_min: '',
    rooms: 2, area_total: '', area_living: '', area_kitchen: '',
    floor: '', floors_total: '', building_type: 'brick', year_built: '',
    renovation: 'cosmetic', bathroom: 'separate', balcony: 'none', parking: 'none',
    furniture: false, mortgage_available: true, matcapital_available: false,
    encumbrance: false, minor_owners: false, sale_type: 'free', docs_ready: false,
    ownership_type: 'individual', urgency: 'medium', description: '', commission: 0,
};

function PropertyStepDots({ step, steps }) {
    return (
        <div className="stepper" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
            {steps.map((s, i) => (
                <React.Fragment key={s}>
                    <div className="step-item">
                        <div className={`step-circle ${i < step ? 'done' : i === step ? 'active' : ''}`}>{i < step ? '✓' : i + 1}</div>
                    </div>
                    {i < steps.length - 1 && <div className={`step-line ${i < step ? 'done' : ''}`} />}
                </React.Fragment>
            ))}
        </div>
    );
}

export function PropertyFormPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const path = window.location.pathname;
    const isEdit = path.includes('/edit');
    const id = isEdit ? path.split('/')[2] : null;
    const existing = id ? state.properties.find(p => p.id === id) : null;
    const params = new URLSearchParams(window.location.search);
    const preClient = params.get('client');

    const [step, setStep] = useState(0);
    const [form, setForm] = useState(existing || { ...defaultProp, client_id: preClient || '', realtor_id: state.currentUser?.id });

    function setF(key, val) { setForm(f => ({ ...f, [key]: val })); }

    function handleSubmit() {
        const prop = {
            ...form,
            price: cleanPrice(form.price),
            price_min: cleanPrice(form.price_min),
            area_total: Number(form.area_total) || null,
            area_living: Number(form.area_living) || null,
            area_kitchen: Number(form.area_kitchen) || null,
            floor: Number(form.floor) || null,
            floors_total: Number(form.floors_total) || null,
            year_built: Number(form.year_built) || null,
            rooms: Number(form.rooms) || 0,
            client_id: form.client_id || null,
            commission: Number(form.commission) || null,
            district: form.district || null,
            microdistrict: form.microdistrict || null
        };
        if (isEdit) {
            dispatch({ type: 'UPDATE_PROPERTY', property: { ...prop, id } });
            navigate(`/properties/${id}`);
        } else {
            dispatch({ type: 'ADD_PROPERTY', property: { ...prop, realtor_id: state.currentUser?.id } });
            navigate('/properties');
        }
    }

    const myClients = state.clients.filter(c => c.realtor_id === state.currentUser?.id);

    return (
        <div className="page fade-in">
            <div className="topbar">
                <button className="topbar-back" onClick={() => step > 0 ? setStep(s => s - 1) : navigate(isEdit ? `/properties/${id}` : '/properties')}>←</button>
                <span className="topbar-title">{isEdit ? 'Редактировать объект' : 'Новый объект'}</span>
            </div>

            <PropertyStepDots step={step} steps={STEPS} />

            <div className="page-content">
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4 }}>Шаг {step + 1} — {STEPS[step]}</div>

                {step === 0 && (
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Продавец</label>
                            <select className="form-select" value={form.client_id || ''} onChange={e => {
                                if (e.target.value === 'new') {
                                    navigate(`/clients/new?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`);
                                } else {
                                    setF('client_id', e.target.value);
                                }
                            }}>
                                <option value="">— Выбрать клиента —</option>
                                <option value="new">+ Создать нового клиента</option>
                                {myClients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Тип объекта <span className="required">*</span></label>
                            <div className="chip-group">
                                {[['apartment', 'Квартира'], ['house', 'Дом'], ['land', 'Участок'], ['commercial', 'Коммерческая'], ['room', 'Комната']].map(([v, l]) => (
                                    <button key={v} type="button" className={`chip ${form.property_type === v ? 'active' : ''}`} onClick={() => setF('property_type', v)}>{l}</button>
                                ))}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Рынок <span className="required">*</span></label>
                            <div className="chip-group">
                                {[['secondary', 'Вторичка'], ['new_building', 'Новостройка']].map(([v, l]) => (
                                    <button key={v} type="button" className={`chip ${form.market_type === v ? 'active' : ''}`} onClick={() => setF('market_type', v)}>{l}</button>
                                ))}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Город <span className="required">*</span></label>
                            <div className="chip-group">
                                {CITIES.map(c => (
                                    <button key={c} type="button" className={`chip ${form.city === c ? 'active' : ''}`} onClick={() => { setF('city', c); setF('district', ''); setF('microdistrict', ''); }}>{c}</button>
                                ))}
                            </div>
                            {form.city === 'Другой' && (
                                <input className="form-input" style={{ marginTop: 8 }} value={form.city_custom || ''} onChange={e => setF('city_custom', e.target.value)} placeholder="Введите город" />
                            )}
                        </div>

                        {form.city === 'Киров' && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Район Кирова</label>
                                    <select className="form-select" value={form.district || ''} onChange={e => { setF('district', e.target.value); setF('microdistrict', ''); }}>
                                        <option value="">— Выберите район —</option>
                                        {KIROV_DISTRICTS.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                                    </select>
                                </div>
                                {form.district && (
                                    <div className="form-group">
                                        <label className="form-label">Микрорайон / Местность</label>
                                        <select className="form-select" value={form.microdistrict || ''} onChange={e => setF('microdistrict', e.target.value)}>
                                            <option value="">— Любой —</option>
                                            {KIROV_DISTRICTS.find(d => d.name === form.district)?.microdistricts.map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                            <option value="custom">— Свой вариант —</option>
                                        </select>
                                        {form.microdistrict === 'custom' && (
                                            <input className="form-input" style={{ marginTop: 8 }} value={form.microdistrict_custom || ''} onChange={e => setF('microdistrict_custom', e.target.value)} placeholder="Введите микрорайон" />
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                        {form.city !== 'Киров' && form.city !== '' && (
                            <div className="form-group">
                                <label className="form-label">Район</label>
                                <input className="form-input" value={form.district || ''} onChange={e => setF('district', e.target.value)} placeholder="Название района" />
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Адрес <span className="required">*</span></label>
                            <input className="form-input" value={form.address} onChange={e => setF('address', e.target.value)} placeholder="ул. Ленина, 42" />
                        </div>
                        {form.market_type === 'new_building' && (
                            <div className="form-group">
                                <label className="form-label">Жилой комплекс</label>
                                <input className="form-input" value={form.residential_complex || ''} onChange={e => setF('residential_complex', e.target.value)} placeholder="ЖК Заря" />
                            </div>
                        )}
                    </div>
                )}

                {step === 1 && (
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="input-row">
                            <div className="form-group">
                                <label className="form-label">Цена, ₽ <span className="required">*</span></label>
                                <input className="form-input" value={form.price ? formatNumber(form.price) : ''} onChange={e => setF('price', e.target.value.replace(/\s/g, ''))} placeholder="3 800 000" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Мин. цена (торг)</label>
                                <input className="form-input" value={form.price_min ? formatNumber(form.price_min) : ''} onChange={e => setF('price_min', e.target.value.replace(/\s/g, ''))} placeholder="3 600 000" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Комиссия, ₽</label>
                            <input className="form-input" value={form.commission ? formatNumber(form.commission) : ''} onChange={e => setF('commission', e.target.value.replace(/\s/g, ''))} placeholder="100 000" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Комнаты (0=студия) <span className="required">*</span></label>
                            <div className="chip-group">
                                {[0, 1, 2, 3, 4].map(r => (
                                    <button key={r} type="button" className={`chip ${+form.rooms === r ? 'active' : ''}`} onClick={() => setF('rooms', r)}>{r === 0 ? 'Студия' : r === 4 ? '4+' : r}</button>
                                ))}
                            </div>
                        </div>
                        <div className="input-row">
                            <div className="form-group">
                                <label className="form-label">Площадь общая, м² <span className="required">*</span></label>
                                <input className="form-input" type="number" value={form.area_total} onChange={e => setF('area_total', e.target.value)} placeholder="54" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Жилая, м²</label>
                                <input className="form-input" type="number" value={form.area_living || ''} onChange={e => setF('area_living', e.target.value)} placeholder="32" />
                            </div>
                        </div>
                        <div className="input-row">
                            <div className="form-group">
                                <label className="form-label">Кухня, м²</label>
                                <input className="form-input" type="number" value={form.area_kitchen || ''} onChange={e => setF('area_kitchen', e.target.value)} placeholder="9" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Год постройки</label>
                                <input className="form-input" type="number" value={form.year_built || ''} onChange={e => setF('year_built', e.target.value)} placeholder="2005" />
                            </div>
                        </div>
                        <div className="input-row">
                            <div className="form-group">
                                <label className="form-label">Этаж <span className="required">*</span></label>
                                <input className="form-input" type="number" value={form.floor} onChange={e => setF('floor', e.target.value)} placeholder="5" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Этажей в доме <span className="required">*</span></label>
                                <input className="form-input" type="number" value={form.floors_total} onChange={e => setF('floors_total', e.target.value)} placeholder="9" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Тип дома</label>
                            <div className="chip-group">
                                {[['panel', 'Панель'], ['brick', 'Кирпич'], ['monolith', 'Монолит'], ['wood', 'Дерево'], ['block', 'Блок']].map(([v, l]) => (
                                    <button key={v} type="button" className={`chip ${form.building_type === v ? 'active' : ''}`} onClick={() => setF('building_type', v)}>{l}</button>
                                ))}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Ремонт</label>
                            <div className="chip-group">
                                {[['none', 'Нет'], ['cosmetic', 'Косметический'], ['euro', 'Евро'], ['designer', 'Дизайнерский']].map(([v, l]) => (
                                    <button key={v} type="button" className={`chip ${form.renovation === v ? 'active' : ''}`} onClick={() => setF('renovation', v)}>{l}</button>
                                ))}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Балкон</label>
                            <div className="chip-group">
                                {[['none', 'Нет'], ['balcony', 'Балкон'], ['loggia', 'Лоджия'], ['both', 'Оба']].map(([v, l]) => (
                                    <button key={v} type="button" className={`chip ${form.balcony === v ? 'active' : ''}`} onClick={() => setF('balcony', v)}>{l}</button>
                                ))}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Парковка</label>
                            <div className="chip-group">
                                {[['none', 'Нет'], ['yard', 'Двор'], ['underground', 'Подземная'], ['garage', 'Гараж']].map(([v, l]) => (
                                    <button key={v} type="button" className={`chip ${form.parking === v ? 'active' : ''}`} onClick={() => setF('parking', v)}>{l}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {[
                            { label: 'Подходит под ипотеку', key: 'mortgage_available' },
                            { label: 'Подходит под маткапитал', key: 'matcapital_available' },
                            { label: 'Мебель', key: 'furniture' },
                            { label: 'Обременение', key: 'encumbrance' },
                            { label: 'Несовершеннолетние собственники', key: 'minor_owners' },
                            { label: 'Документы готовы', key: 'docs_ready' },
                        ].map(({ label, key }) => (
                            <div key={key} className="toggle-row">
                                <span className="toggle-label">{label}</span>
                                <label className="toggle-switch">
                                    <input type="checkbox" checked={!!form[key]} onChange={e => setF(key, e.target.checked)} />
                                    <span className="toggle-slider" />
                                </label>
                            </div>
                        ))}
                        <div className="form-group" style={{ marginTop: 8 }}>
                            <label className="form-label">Тип продажи</label>
                            <div className="chip-group">
                                {[['free', 'Свободная'], ['alternative', 'Альтернатива']].map(([v, l]) => (
                                    <button key={v} type="button" className={`chip ${form.sale_type === v ? 'active' : ''}`} onClick={() => setF('sale_type', v)}>{l}</button>
                                ))}
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Срочность</label>
                            <div className="chip-group">
                                {[['low', 'Низкая'], ['medium', 'Средняя'], ['high', 'Высокая']].map(([v, l]) => (
                                    <button key={v} type="button" className={`chip ${form.urgency === v ? 'active' : ''}`} onClick={() => setF('urgency', v)}>{l}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Описание</label>
                            <textarea className="form-textarea" rows={5} value={form.description || ''} onChange={e => setF('description', e.target.value)} placeholder="Расскажите об объекте подробнее..." />
                        </div>
                    </div>
                )}

                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    {step > 0 && <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(s => s - 1)}>← Назад</button>}
                    {step < STEPS.length - 1 ? (
                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setStep(s => s + 1)}>Далее →</button>
                    ) : (
                        <button className="btn btn-success" style={{ flex: 1 }} onClick={handleSubmit}>Сохранить</button>
                    )}
                </div>
            </div>
        </div>
    );
}
