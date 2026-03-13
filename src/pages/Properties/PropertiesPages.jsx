import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatPrice, cleanPrice } from '../../utils/matching';
import { formatPhone, stripPhone, formatNumber } from '../../utils/format';
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
                <button className="icon-btn" onClick={() => navigate('/properties/new')} style={{ color: 'var(--primary)', fontSize: 24, fontWeight: 'bold' }}>+</button>
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
                        <button className="btn btn-primary" onClick={() => navigate('/properties/new')}>+</button>
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
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                {prop.city}, {prop.district && `${prop.district}, `}{prop.address}
                                {!client && prop.realtor_id !== user?.id && <div style={{ fontSize: 12, color: 'var(--primary)', marginTop: 2 }}>Владелец: {state.profiles.find(p => p.id === prop.realtor_id)?.full_name || 'Агент'}</div>}
                            </div>

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
                client_birth_date: pd.birth_date ? new Date(pd.birth_date).toLocaleDateString('ru-RU') : '',
                client_snils: pd.snils || '',

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
                realtor_inn: realtor?.inn || '',

                // Данные паспорта Риэлтора
                realtor_passport_series: realtor?.passport_details?.series || '',
                realtor_passport_number: realtor?.passport_details?.number || '',
                realtor_passport_issued_by: realtor?.passport_details?.issued_by || '',
                realtor_passport_unit_code: realtor?.passport_details?.unit_code || '',
                realtor_passport_issue_date: realtor?.passport_details?.issue_date ? new Date(realtor.passport_details.issue_date).toLocaleDateString('ru-RU') : '',
                realtor_passport_address: realtor?.passport_details?.registration_address || '',

                // Системные и доп поля объекта
                current_date: new Date().toLocaleDateString('ru-RU'),
                property_contract_endDate: prop.contract_end_date ? new Date(prop.contract_end_date).toLocaleDateString('ru-RU') : '',
                property_commission: prop.commission ? formatNumber(prop.commission) : '',
                property_commission_buyer: prop.commission_buyer ? formatNumber(prop.commission_buyer) : '',
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
                    {(prop.commission > 0 || (prop.deal_expenses && prop.deal_expenses.length > 0) || prop.surcharge !== 0) && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8, padding: '12px', background: 'var(--success-light)', borderRadius: 'var(--radius-sm)' }}>
                            <div style={{ fontSize: 13, borderBottom: '1px solid var(--success-light)', paddingBottom: 4, marginBottom: 4, fontWeight: 700 }}>Финансовый расчет</div>
                            {prop.commission > 0 && <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}><span>Комиссия:</span> <span>-{formatNumber(prop.commission)} ₽</span></div>}
                            
                            {prop.deal_expenses?.map((ex, i) => (
                                <div key={i} style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                    <span>{ex.name}:</span> <span>-{formatNumber(ex.price)} ₽</span>
                                </div>
                            ))}

                            {prop.surcharge !== 0 && (
                                <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                    <span>{prop.surcharge > 0 ? 'Доплата клиента:' : 'Остаток клиенту:'}</span>
                                    <span>{formatNumber(prop.surcharge)} ₽</span>
                                </div>
                            )}

                            <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed var(--success)', fontSize: 14, fontWeight: 800, color: 'var(--primary)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Чистый бюджет на поиск:</span>
                                    <span>{formatNumber(
                                        Number(prop.price || 0) - 
                                        Number(prop.commission || 0) - 
                                        (prop.deal_expenses?.reduce((sum, ex) => sum + (Number(ex.price) || 0), 0) || 0) + 
                                        Number(prop.surcharge || 0)
                                    )} ₽</span>
                                </div>
                            </div>
                        </div>
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
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                        <a href={`tel:${realtor.phone}`} style={{ fontSize: 14, color: '#2563EB', fontWeight: 700 }}>
                                            {formatPhone(realtor.phone)}
                                        </a>
                                        <a href={`https://wa.me/${stripPhone(realtor.phone)}`} target="_blank" rel="noopener noreferrer" className="icon-btn" style={{ color: '#25D366', padding: 4 }}>
                                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                        </a>
                                        <a href={`https://t.me/+${stripPhone(realtor.phone)}`} target="_blank" rel="noopener noreferrer" className="icon-btn" style={{ color: '#0088cc', padding: 4 }}>
                                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"/></svg>
                                        </a>
                                    </div>
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
                    {prop.contract_end_date && (
                        <div className="info-row" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8, marginBottom: 8 }}>
                            <span className="info-key">Договор до</span>
                            <span className="info-val">{new Date(prop.contract_end_date).toLocaleDateString('ru-RU')}</span>
                        </div>
                    )}
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
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <a href={`tel:${client.phone}`} style={{ fontSize: 13, color: '#2563EB', fontWeight: 600 }} onClick={e => e.stopPropagation()}>{formatPhone(client.phone)}</a>
                                    <a href={`https://wa.me/${stripPhone(client.phone)}`} target="_blank" rel="noopener noreferrer" className="icon-btn" style={{ color: '#25D366', padding: 4 }} onClick={e => e.stopPropagation()}>
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                    </a>
                                    <a href={`https://t.me/+${stripPhone(client.phone)}`} target="_blank" rel="noopener noreferrer" className="icon-btn" style={{ color: '#0088cc', padding: 4 }} onClick={e => e.stopPropagation()}>
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"/></svg>
                                    </a>
                                </div>
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

                {/* Print Contract Button - ONLY FOR OWNERS */}
                {prop.realtor_id === user?.id && (
                    <button className="btn btn-secondary btn-full" onClick={handleGenerateContract} style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                        <span>📄</span> Создать АД
                    </button>
                )}
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
    minor_owners: false, sale_type: 'free', docs_ready: false,
    ownership_type: 'individual', urgency: 'medium', description: '',
    commission: 0, surcharge: 0, deal_expenses: []
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
            microdistrict: form.microdistrict || null,
            contract_end_date: form.contract_end_date || null,
            deal_expenses: form.deal_expenses || []
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
                            <label className="form-label">Комиссия (с этого объекта), ₽</label>
                            <input className="form-input" value={form.commission ? formatNumber(form.commission) : ''} onChange={e => setF('commission', e.target.value.replace(/\s/g, ''))} placeholder="150 000" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Доплата наличными (если есть), ₽</label>
                            <input className="form-input" value={form.surcharge ? formatNumber(form.surcharge) : ''} onChange={e => setF('surcharge', e.target.value.replace(/\s/g, ''))} placeholder="500 000" />
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>Укажите положительное число (доплата от клиента) или отрицательное (сумма, которую клиент хочет оставить себе).</div>
                        </div>

                        {/* TRANSACTION EXPENSES */}
                        <div className="form-group">
                            <label className="form-label" style={{ marginBottom: 8 }}>Расходы по сделке</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                                {state.pricelist.filter(item => item.show_in_sale !== false).map(item => {
                                    const isSelected = form.deal_expenses?.some(ex => ex.name === item.name);
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            className={`chip ${isSelected ? 'active' : ''}`}
                                            onClick={() => {
                                                const newExpenses = isSelected
                                                    ? form.deal_expenses.filter(ex => ex.name !== item.name)
                                                    : [...(form.deal_expenses || []), { name: item.name, price: item.price }];
                                                setF('deal_expenses', newExpenses);
                                            }}
                                        >
                                            {item.name}
                                        </button>
                                    );
                                })}
                                <button
                                    type="button"
                                    className="chip"
                                    onClick={() => {
                                        const name = window.prompt('Название расхода');
                                        const price = window.prompt('Сумма');
                                        if (name && price) {
                                            setF('deal_expenses', [...(form.deal_expenses || []), { name, price: Number(price), manual: true }]);
                                        }
                                    }}
                                    style={{ border: '1px dashed var(--primary)', color: 'var(--primary)' }}
                                >
                                    + Свой расход
                                </button>
                            </div>

                            {form.deal_expenses?.length > 0 && (
                                <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                                    {form.deal_expenses.map((ex, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: idx < form.deal_expenses.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                                            <span style={{ fontSize: 13 }}>{ex.name}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontSize: 13, fontWeight: 700 }}>{ex.price.toLocaleString()} ₽</span>
                                                <button type="button" onClick={() => setF('deal_expenses', form.deal_expenses.filter((_, i) => i !== idx))} style={{ border: 'none', background: 'none', color: 'var(--danger)', padding: 4, cursor: 'pointer' }}>×</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* BUDGET BREAKDOWNPREVIEW */}
                            <div style={{ padding: '12px', background: 'var(--primary-light)', borderRadius: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13, opacity: 0.8 }}>
                                    <span>Цена продажи:</span>
                                    <span>{formatNumber(cleanPrice(form.price))} ₽</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13, color: 'var(--danger)' }}>
                                    <span>Комиссия:</span>
                                    <span>-{formatNumber(form.commission)} ₽</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13, color: 'var(--danger)' }}>
                                    <span>Расходы:</span>
                                    <span>-{formatNumber(form.deal_expenses?.reduce((sum, ex) => sum + (Number(ex.price) || 0), 0))} ₽</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: form.surcharge >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                    <span>{form.surcharge >= 0 ? 'Доплата клиента:' : 'Остаток клиенту:'}</span>
                                    <span>{form.surcharge >= 0 ? '+' : ''}{formatNumber(form.surcharge)} ₽</span>
                                </div>
                                <div style={{ borderTop: '1px solid var(--primary)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: 'var(--primary)' }}>
                                    <span style={{ fontSize: 14 }}>Чистый бюджет на обмен:</span>
                                    <span style={{ fontSize: 16 }}>{formatNumber(
                                        Number(cleanPrice(form.price) || 0) -
                                        Number(form.commission || 0) -
                                        Number(form.deal_expenses?.reduce((sum, ex) => sum + (Number(ex.price) || 0), 0) || 0) +
                                        Number(form.surcharge || 0)
                                    )} ₽</span>
                                </div>
                            </div>
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
