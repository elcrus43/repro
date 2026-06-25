import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatNumber, formatPhone, stripPhone } from '../../utils/format';
import { Trash, MapPin, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Search, Plus, Building2, Filter, Columns3, LayoutList, SlidersHorizontal, Check, Phone, Pencil, User, Trash2, Calendar, Download } from 'lucide-react';
import { PROPERTY_TYPES } from '../../data/constants';
import { GlobalSearch } from '../../components/GlobalSearch';
import { PipelinePage } from './PipelinePage';
import { useExport } from '../../hooks/useExport';
import { useToastContext } from '../../components/Toast';



export function ListPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const user = state.currentUser;
    const { exportToCSV } = useExport();
    const { toast } = useToastContext();

    const handleImportToProperties = async (item) => {
        if (!window.confirm('Импортировать этот объект подбора в активные объекты?')) return;
        
        try {
            const notes = [item.notes, item.link ? `Ссылка: ${item.link}` : null]
                .filter(Boolean).join('\n');

            const newProperty = {
                realtor_id: user?.id,
                client_id: item.client_id || null,
                client_ids: item.client_ids && item.client_ids.length > 0 ? item.client_ids : (item.client_id ? [item.client_id] : []),
                status: 'meeting',
                address: item.address || '',
                price: item.price || 0,
                rooms: item.rooms !== undefined && item.rooms !== null ? Number(item.rooms) : null,
                area_total: item.area_total !== undefined && item.area_total !== null ? Number(item.area_total) : null,
                floor: item.floor !== undefined && item.floor !== null ? Number(item.floor) : null,
                floors_total: item.floors_total !== undefined && item.floors_total !== null ? Number(item.floors_total) : null,
                property_type: item.property_type || null,
                city: item.city || '',
                images: item.images || [],
                notes: notes,
                description: `Импортировано из подбора. ${item.notes || ''}`,
                contact_name: item.contact_name || null,
                contact_phone: item.contact_phone || null,
            };

            await dispatch({ type: 'ADD_PROPERTY', property: newProperty });
            await dispatch({ type: 'DELETE_SELECTION_ITEM', id: item.id });
            
            toast.success('Объект успешно импортирован в активные!');
        } catch (err) {
            console.error('[Import Error]', err);
            toast.error('Не удалось импортировать объект: ' + err.message);
        }
    };



    const [search, setSearch] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();
    const filter = searchParams.get('filter') || 'active';
    const setFilter = (val) => {
        setSearchParams({ filter: val });
        setSearch('');
    };
    const [scope, setScope] = useState('all');
    const [viewMode, setViewMode] = useState('list');
    const [priceMin, setPriceMin] = useState('');
    const [priceMax, setPriceMax] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [collapsedStatuses, setCollapsedStatuses] = useState({});

    const handleExport = () => {
        const headers = [
            { key: 'address', label: 'Адрес' },
            { key: 'price', label: 'Цена' },
            { key: 'area_total', label: 'Площадь' },
            { key: 'floor', label: 'Этаж' },
            { key: 'realtor_id', label: 'Realtor ID' }
        ];
        exportToCSV(filteredProperties, 'properties_export', headers);
    };

    // Closed statuses = deal completed
    const CLOSED_STATUSES = ['deal'];
    const ACTIVE_STATUSES = ['meeting', 'agreement', 'advertising', 'deposit', 'deal'];

    const filteredProperties = useMemo(() => {
        return state.properties
            .filter(p => scope === 'all' || p.realtor_id === user?.id)
            .filter(p => {
                if (filter === 'active') return ACTIVE_STATUSES.includes(p.status);
                if (filter === 'closed') return CLOSED_STATUSES.includes(p.status);
                return true;
            })
            .filter(p => {
                if (!search) return true;
                // Support both legacy client_id and new client_ids array
                const allClientIds = [...(p.client_ids || []), ...(p.client_id ? [p.client_id] : [])];
                const clientName = allClientIds.map(cid => state.clients.find(c => c.id === cid)?.full_name || '').join(' ');
                return (p.address || '').toLowerCase().includes(search.toLowerCase()) ||
                    (p.city || '').toLowerCase().includes(search.toLowerCase()) ||
                    clientName.toLowerCase().includes(search.toLowerCase());
            })
            .filter(p => (!priceMin || p.price >= Number(priceMin)) && (!priceMax || p.price <= Number(priceMax)))
            .sort((a, b) => {
                const statusOrder = { deal: 1, deposit: 2, advertising: 3, agreement: 4, meeting: 5 };
                const orderA = statusOrder[a.status] || 99;
                const orderB = statusOrder[b.status] || 99;
                if (orderA !== orderB) return orderA - orderB;
                return new Date(b.created_at || 0) - new Date(a.created_at || 0);
            });
    }, [state.properties, scope, user?.id, filter, search, state.clients, priceMin, priceMax]);

    const groupedProperties = useMemo(() => {
        const groups = {
            meeting: [],
            agreement: [],
            advertising: [],
            deposit: [],
            deal: []
        };
        filteredProperties.forEach(p => {
            const status = p.status || 'meeting';
            if (!groups[status]) {
                groups[status] = [];
            }
            groups[status].push(p);
        });
        return groups;
    }, [filteredProperties]);

    const statusOrder = useMemo(() => {
        if (filter === 'closed') return ['deal'];
        return ['deal', 'deposit', 'advertising', 'agreement', 'meeting'];
    }, [filter]);

    const toggleStatus = (status) => {
        setCollapsedStatuses(prev => ({
            ...prev,
            [status]: !prev[status]
        }));
    };

    const statusSolidColors = {
        meeting: '#3b82f6',
        agreement: '#f59e0b',
        advertising: '#8b5cf6',
        deposit: '#10b981',
        deal: '#22c55e'
    };

    const handleToggleSelect = (id) => {
        setSelectedIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(x => x !== id);
            }
            if (prev.length >= 4) {
                alert('Вы можете сравнить не более 4 объектов одновременно.');
                return prev;
            }
            return [...prev, id];
        });
    };

    const selectionItemsByClient = useMemo(() => {
        if (filter !== 'selection') return [];
        const items = state.selectionItems || [];
        const filtered = items.filter(item => {
            if (!search) return true;
            const itemClientIds = item.client_ids && item.client_ids.length > 0 ? item.client_ids : (item.client_id ? [item.client_id] : []);
            const matchingClients = state.clients.filter(c => itemClientIds.includes(c.id));
            const clientMatch = matchingClients.some(c => (c.full_name || '').toLowerCase().includes(search.toLowerCase()));
            return (item.address || '').toLowerCase().includes(search.toLowerCase()) ||
                clientMatch ||
                (item.contact_name || '').toLowerCase().includes(search.toLowerCase());
        });

        // Group by client_id
        const groups = {};
        filtered.forEach(item => {
            const itemClientIds = item.client_ids && item.client_ids.length > 0 ? item.client_ids : (item.client_id ? [item.client_id] : ['unassigned']);
            itemClientIds.forEach(cId => {
                if (!groups[cId]) {
                    const client = state.clients.find(c => c.id === cId);
                    groups[cId] = {
                        clientName: client?.full_name || 'Без клиента',
                        items: []
                    };
                }
                if (!groups[cId].items.some(x => x.id === item.id)) {
                    groups[cId].items.push(item);
                }
            });
        });

        return Object.entries(groups).map(([clientId, group]) => ({
            clientId,
            ...group
        }));
    }, [state.selectionItems, state.clients, search, filter]);

    const handleDeleteSelection = (id) => {
        if (window.confirm('Вы действительно хотите удалить этот объект из подбора?')) {
            dispatch({ type: 'DELETE_SELECTION_ITEM', id });
        }
    };

    const statusLabels = {
        meeting: 'Встреча',
        agreement: 'АД',
        advertising: 'В рекламе',
        deposit: 'Задаток',
        deal: 'Сделка'
    };
    const statusColors = {
        meeting: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
        agreement: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        advertising: 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)',
        deposit: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
        deal: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)'
    };

    return (
        <div className="page fade-in" style={{ background: 'var(--surface)' }}>
            <div className="topbar sticky" style={{ 
                background: 'var(--topbar-bg)', 
                backdropFilter: 'blur(24px) saturate(180%)',
                padding: '20px',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                height: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="topbar-title font-oswald" style={{ letterSpacing: '0.01em', fontSize: 22, fontWeight: 600 }}>Объекты</span>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 200, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Портфель недвижимости</span>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <GlobalSearch />
                        {filter !== 'selection' && (
                            <button
                                className="card-clickable"
                                onClick={() => setViewMode(prev => prev === 'list' ? 'pipeline' : 'list')}
                                style={{
                                    width: 44, height: 44, borderRadius: 14, border: 'none',
                                    background: 'var(--surface)', color: 'var(--text)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                {viewMode === 'list' ? <Columns3 size={20} /> : <LayoutList size={20} />}
                            </button>
                        )}
                        <button 
                            className="card-clickable" 
                            onClick={() => navigate(filter === 'selection' ? '/selection/new' : '/properties/new')} 
                            style={{ 
                                width: 44, height: 44, borderRadius: 14, border: 'none',
                                background: 'var(--surface)', color: 'var(--text)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer'
                            }}
                        >
                            <Plus size={24} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="page-content" style={{ padding: '20px 20px 140px', gap: 16 }}>
                {/* SEARCH & FILTERS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                    {filter !== 'selection' && (
                        <div style={{ display: 'flex', background: 'var(--bg-light)', padding: 4, borderRadius: 16, gap: 4 }}>
                            <button 
                                className="card-clickable font-oswald" 
                                style={{ 
                                    flex: 1, padding: '10px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 400, 
                                    background: scope === 'all' ? 'var(--surface)' : 'transparent', 
                                    boxShadow: scope === 'all' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none', 
                                    color: scope === 'all' ? 'var(--text)' : 'var(--text-secondary)', 
                                    textTransform: 'uppercase', letterSpacing: '0.05em' 
                                }} 
                                onClick={() => setScope('all')}
                            >Все объекты</button>
                            <button 
                                className="card-clickable font-oswald" 
                                style={{ 
                                    flex: 1, padding: '10px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 400, 
                                    background: scope === 'mine' ? 'var(--surface)' : 'transparent', 
                                    boxShadow: scope === 'mine' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none', 
                                    color: scope === 'mine' ? 'var(--text)' : 'var(--text-secondary)', 
                                    textTransform: 'uppercase', letterSpacing: '0.05em' 
                                }} 
                                onClick={() => setScope('mine')}
                            >Мои объекты</button>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: 8, background: 'var(--bg-light)', padding: 4, borderRadius: 16 }}>
                        {[
                            ['active', 'Активные'], ['closed', 'Закрытые'], ['selection', 'Подбор']
                        ].map(([val, label]) => (
                            <button 
                                key={val} 
                                onClick={() => setFilter(val)} 
                                style={{ 
                                    flex: 1,
                                    whiteSpace: 'nowrap', padding: '10px 16px', border: 'none',
                                    borderRadius: 12,
                                    background: filter === val ? 'var(--surface)' : 'transparent',
                                    boxShadow: filter === val ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                                    color: filter === val ? 'var(--text)' : 'var(--text-secondary)',
                                    fontSize: 14, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.05em',
                                    fontFamily: "'Oswald', sans-serif",
                                    cursor: 'pointer'
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Price Range Filter */}
                    {filter !== 'selection' && (
                        <div style={{
                            background: 'var(--bg-light)', padding: '8px 16px', borderRadius: 16,
                            display: 'flex', alignItems: 'center', gap: 8
                        }}>
                            <SlidersHorizontal size={14} style={{ opacity: 0.4, flexShrink: 0, color: 'var(--text-secondary)' }} />
                            <input
                                type="number"
                                value={priceMin}
                                onChange={e => setPriceMin(e.target.value)}
                                placeholder="от"
                                style={{
                                    border: 'none', background: 'transparent', fontSize: 13,
                                    flex: 1, minWidth: 0, outline: 'none', color: 'var(--text)', fontFamily: 'inherit'
                                }}
                            />
                            <span style={{ color: 'var(--text-secondary)', fontSize: 13, opacity: 0.5 }}>—</span>
                            <input
                                type="number"
                                value={priceMax}
                                onChange={e => setPriceMax(e.target.value)}
                                placeholder="до"
                                style={{
                                    border: 'none', background: 'transparent', fontSize: 13,
                                    flex: 1, minWidth: 0, outline: 'none', color: 'var(--text)', fontFamily: 'inherit'
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* PIPELINE VIEW */}
                {viewMode === 'pipeline' && filter !== 'selection' && <PipelinePage />}

                {/* LIST VIEW */}
                {viewMode === 'list' && filter !== 'selection' && filteredProperties.length === 0 && (
                    <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
                        <div style={{ width: 80, height: 80, borderRadius: 30, background: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <Building2 size={40} style={{ opacity: 0.2 }} />
                        </div>
                        <div className="font-oswald" style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>Нет объектов</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 24 }}>Начните наполнять свой портфель</div>
                        <button className="card-clickable" onClick={() => navigate('/properties/new')} style={{ padding: '12px 24px', borderRadius: 16, border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: 13 }}>Добавить объект</button>
                    </div>
                )}

                {/* SELECTION VIEW */}
                {filter === 'selection' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        {selectionItemsByClient.length === 0 ? (
                            <div className="empty-state" style={{ padding: '60px 0', textAlign: 'center' }}>
                                <div style={{ width: 80, height: 80, background: 'var(--bg-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--text-muted)' }}>
                                    <Search size={32} />
                                </div>
                                <div className="font-oswald" style={{ fontSize: 20, fontWeight: 300, marginBottom: 8 }}>Нет подобранных объектов</div>
                                <div style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Создайте новый подбор или импортируйте через расширение</div>
                                <button className="card-clickable" onClick={() => navigate('/selection/new')} style={{ padding: '12px 24px', borderRadius: 16, border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: 13, margin: '0 auto' }}>Создать подбор</button>
                            </div>
                        ) : (
                            selectionItemsByClient.map(group => (
                                <div key={group.clientId} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div className="font-oswald" style={{ fontSize: 16, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', paddingLeft: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <User size={16} /> {group.clientName}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {group.items.map(item => (
                                            <div key={item.id} className="card" style={{ 
                                                display: 'flex', gap: 16, padding: '16px 60px 16px 16px', alignItems: 'center', 
                                                border: '1.5px solid rgba(59,130,246,0.12)', 
                                                boxShadow: '0 4px 16px rgba(0,0,0,0.02)',
                                                background: 'var(--surface)', borderRadius: 24,
                                                position: 'relative'
                                            }}>
                                                {/* ACTION BUTTONS (Absolutely Positioned Column on the right) */}
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '12px',
                                                    right: '12px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '8px',
                                                    alignItems: 'flex-end',
                                                    zIndex: 10
                                                }}>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <button 
                                                            type="button"
                                                            className="icon-btn-import" 
                                                            onClick={() => handleImportToProperties(item)} 
                                                            title="Импортировать в мои объекты"
                                                        >
                                                            <Download size={13} />
                                                        </button>
                                                        <button 
                                                            className="icon-btn-delete" 
                                                            onClick={() => handleDeleteSelection(item.id)} 
                                                            title="Удалить"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                    <button 
                                                        className="icon-btn-edit" 
                                                        onClick={() => navigate(`/selection/${item.id}/edit`)} 
                                                        title="Редактировать"
                                                    >
                                                        <Pencil size={13} />
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        className="icon-btn-calendar" 
                                                        onClick={() => navigate(`/history/new?event_type=viewing&property_id=${item.id}&client_ids=${(item.client_ids || []).join(',')}`)} 
                                                        title="Создать событие в календарь"
                                                    >
                                                        <Calendar size={13} />
                                                    </button>
                                                </div>

                                                {/* CONTENT WRAPPER */}
                                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    {/* Price and Price per sqm */}
                                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                                                        <span className="font-oswald" style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', lineHeight: 1.1 }}>
                                                            {item.price ? formatNumber(item.price) + ' ₽' : '—'}
                                                        </span>
                                                        {item.price && item.area_total ? (
                                                            <span style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.7 }}>
                                                                {formatNumber(Math.round(item.price / item.area_total))} ₽/м²
                                                            </span>
                                                        ) : null}
                                                    </div>

                                                    {/* Address with MapPin */}
                                                    <div style={{ 
                                                        fontSize: 13, color: 'var(--text)',
                                                        display: 'flex', alignItems: 'center', gap: 6,
                                                        fontWeight: 450
                                                    }}>
                                                        <MapPin size={13} style={{ flexShrink: 0, color: 'var(--primary)' }} />
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                                            {item.city ? (item.address ? `${item.city}, ${item.address}` : item.city) : (item.address || '—')}
                                                        </span>
                                                        {item.link && (
                                                            <a 
                                                                href={item.link} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                onClick={e => e.stopPropagation()}
                                                                style={{ 
                                                                    display: 'inline-flex', alignItems: 'center', gap: 4, 
                                                                    fontSize: 11, color: 'var(--primary)', textDecoration: 'none',
                                                                    background: 'var(--primary-light)', padding: '2px 8px', borderRadius: 10,
                                                                    fontWeight: 500, flexShrink: 0
                                                                }}
                                                            >
                                                                Ссылка
                                                            </a>
                                                        )}
                                                    </div>

                                                    {/* Tech details line */}
                                                    {(() => {
                                                        const parts = [];
                                                        if (item.rooms !== undefined && item.rooms !== null) {
                                                            parts.push(item.rooms === 0 ? 'Студия' : `${item.rooms}к`);
                                                        }
                                                        if (item.area_total) {
                                                            parts.push(`${item.area_total} м²`);
                                                        }
                                                        if (item.floor || item.floors_total) {
                                                            if (item.floor && item.floors_total) {
                                                                parts.push(`${item.floor}/${item.floors_total} эт.`);
                                                            } else if (item.floor) {
                                                                parts.push(`${item.floor} эт.`);
                                                            } else {
                                                                parts.push(`/${item.floors_total} эт.`);
                                                            }
                                                        }
                                                        if (item.property_type) {
                                                            parts.push(PROPERTY_TYPES[item.property_type] || item.property_type);
                                                        }
                                                        if (parts.length === 0) return null;
                                                        return (
                                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 300, opacity: 0.85 }}>
                                                                {parts.join(' · ')}
                                                            </div>
                                                        );
                                                    })()}

                                                    {/* Contact Info / Bottom row */}
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 6, borderTop: '1px solid rgba(0,0,0,0.03)' }}>
                                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                            {item.contact_name && (
                                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                                    Контакт: <span style={{ color: 'var(--text)', fontWeight: 450 }}>{item.contact_name}</span>
                                                                </div>
                                                            )}
                                                            {item.contact_phone && (
                                                                <a href={`tel:+${stripPhone(item.contact_phone)}`} style={{ 
                                                                    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--primary)', textDecoration: 'none' 
                                                                }}>
                                                                    <Phone size={10} /> {formatPhone(item.contact_phone)}
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {viewMode === 'list' && filter !== 'selection' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {statusOrder.map(status => {
                            const items = groupedProperties[status] || [];
                            const isCollapsed = !!collapsedStatuses[status];

                            return (
                                <div key={status} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {/* Group Header */}
                                    <div 
                                        onClick={() => toggleStatus(status)}
                                        className="card-clickable"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '12px 16px',
                                            borderRadius: '16px',
                                            background: 'var(--bg-light)',
                                            cursor: 'pointer',
                                            userSelect: 'none',
                                            transition: 'all 0.2s ease',
                                            border: 'none',
                                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{
                                                width: 10,
                                                height: 10,
                                                borderRadius: '50%',
                                                background: statusColors[status] || 'var(--primary)',
                                                boxShadow: `0 0 6px ${statusSolidColors[status] || 'var(--primary)'}80`
                                            }} />
                                            <span className="font-oswald" style={{
                                                fontSize: 13,
                                                fontWeight: 600,
                                                color: 'var(--text)',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em'
                                            }}>
                                                {statusLabels[status] || status}
                                            </span>
                                            <span style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                color: statusSolidColors[status] || 'var(--primary)',
                                                background: `${statusSolidColors[status] || 'var(--primary)'}18`,
                                                borderRadius: 8,
                                                padding: '2px 8px',
                                                marginLeft: 4
                                            }}>
                                                {items.length}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 12 }}>
                                            <span style={{ fontWeight: 300 }}>{isCollapsed ? 'Развернуть' : 'Свернуть'}</span>
                                            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                        </div>
                                    </div>

                                    {/* Group Content */}
                                    {!isCollapsed && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            {items.length === 0 ? (
                                                <div style={{
                                                    padding: '24px 20px',
                                                    borderRadius: 24,
                                                    border: `1.5px dashed ${(statusSolidColors && statusSolidColors[status]) || 'rgba(0,0,0,0.1)'}33`,
                                                    textAlign: 'center',
                                                    color: 'var(--text-secondary)',
                                                    fontSize: 13,
                                                    opacity: 0.6,
                                                    background: 'rgba(0, 0, 0, 0.01)'
                                                }}>
                                                    Нет объектов
                                                </div>
                                            ) : (
                                                items.map(prop => {
                                                    const isSelected = selectedIds.includes(prop.id);
                                                    return (
                                                        <div 
                                                            key={prop.id} 
                                                            className="card fade-in card-clickable"
                                                            onClick={() => navigate(`/properties/${prop.id}`)}
                                                            style={{ 
                                                                display: 'flex', gap: 16, padding: '16px', alignItems: 'center', 
                                                                border: isSelected ? '2px solid var(--primary)' : '1.5px solid rgba(59,130,246,0.18)', 
                                                                boxShadow: '0 4px 16px rgba(59,130,246,0.06)',
                                                                background: 'rgba(239,246,255,0.55)', borderRadius: 24,
                                                                position: 'relative'
                                                            }}
                                                        >
                                                            {/* IMAGE WRAPPER */}
                                                            <div style={{ 
                                                                width: 100, height: 100, minWidth: 100, borderRadius: 20, 
                                                                overflow: 'hidden', background: 'var(--bg-light)', position: 'relative',
                                                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                                            }}>
                                                                {prop.images?.[0] ? (
                                                                    <img src={prop.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                ) : (
                                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.2 }}>
                                                                        <Building2 size={24} />
                                                                        <div style={{ fontSize: 8, fontWeight: 600, marginTop: 4 }}>Нет фото</div>
                                                                    </div>
                                                                )}
                                                                {/* Selection Checkbox */}
                                                                <div 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleToggleSelect(prop.id);
                                                                    }}
                                                                    style={{ 
                                                                        position: 'absolute', 
                                                                        bottom: 8, 
                                                                        right: 8, 
                                                                        zIndex: 10,
                                                                        width: 22, 
                                                                        height: 22, 
                                                                        borderRadius: 6,
                                                                        background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.8)',
                                                                        border: '2px solid ' + (isSelected ? 'var(--primary)' : '#9ca3af'),
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        cursor: 'pointer',
                                                                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                                                                    }}
                                                                >
                                                                    {isSelected && <Check size={14} color="white" strokeWidth={3} />}
                                                                </div>
                                                            </div>

                                                            {/* PHONE ICON */}
                                                            {(() => {
                                                                const agent = state.profiles.find(p => p.id === prop.realtor_id) || (prop.realtor_id === user?.id ? user : null);
                                                                const phone = agent?.phone;
                                                                if (!phone) return null;
                                                                return (
                                                                    <a
                                                                        href={`tel:${phone}`}
                                                                        onClick={e => e.stopPropagation()}
                                                                        style={{
                                                                            position: 'absolute', top: 8, right: 8, zIndex: 10,
                                                                            width: 30, height: 30, borderRadius: 10,
                                                                            background: 'rgba(255,255,255,0.92)',
                                                                            backdropFilter: 'blur(8px)',
                                                                            border: '1px solid rgba(0,0,0,0.07)',
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                            color: 'var(--primary)', textDecoration: 'none',
                                                                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                                                        }}
                                                                    >
                                                                        <Phone size={14} strokeWidth={2} />
                                                                    </a>
                                                                );
                                                            })()}

                                                            {/* CONTENT WRAPPER */}
                                                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                                {/* Tech details line */}
                                                                <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                                    {['apartment', 'room', 'house'].includes(prop.property_type) && (
                                                                        <>
                                                                            <span>
                                                                                {prop.property_type === 'room' 
                                                                                    ? 'Комната' 
                                                                                    : prop.property_type === 'house'
                                                                                        ? (prop.rooms > 0 ? `${prop.rooms}к` : 'Дом')
                                                                                        : (prop.rooms > 0 ? `${prop.rooms}к` : 'Студия')}
                                                                            </span>
                                                                            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(0,0,0,0.2)' }} />
                                                                        </>
                                                                    )}
                                                                    <span>{prop.area_total} м²</span>
                                                                    {prop.floor || prop.floors_total ? (
                                                                        <>
                                                                            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(0,0,0,0.2)' }} />
                                                                            <span>
                                                                                {prop.floor && prop.floors_total 
                                                                                    ? `${prop.floor}/${prop.floors_total} эт.` 
                                                                                    : prop.floor 
                                                                                        ? `${prop.floor} эт.` 
                                                                                        : `/${prop.floors_total} эт.`}
                                                                            </span>
                                                                        </>
                                                                    ) : null}
                                                                    <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(0,0,0,0.2)' }} />
                                                                    <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{PROPERTY_TYPES[prop.property_type]}</span>
                                                                </div>

                                                                {/* Адрес */}
                                                                <div style={{ 
                                                                    fontSize: 13, color: 'var(--text)',
                                                                    display: 'flex', alignItems: 'center', gap: 4,
                                                                    fontWeight: 450
                                                                }}>
                                                                    <MapPin size={13} style={{ flexShrink: 0, color: 'var(--primary)' }} />
                                                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        {prop.city ? (prop.address ? `${prop.city}, ${prop.address}` : prop.city) : (prop.address || '—')}
                                                                    </span>
                                                                </div>

                                                                {/* Цена */}
                                                                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                                                                    <span className="font-oswald" style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', lineHeight: 1.1 }}>
                                                                        {formatNumber(prop.price)} <span style={{ fontSize: 12, opacity: 0.6 }}>₽</span>
                                                                    </span>
                                                                    {prop.price && prop.area_total ? (
                                                                        <span style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.7 }}>
                                                                            {formatNumber(Math.round(prop.price / prop.area_total))} ₽/м²
                                                                        </span>
                                                                    ) : null}
                                                                </div>

                                                                {/* Бейджи: Цель + Статус */}
                                                                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                                    {(() => {
                                                                        const dt = prop.deal_type || 'sale';
                                                                        const goalMap = {
                                                                            sale: { label: 'Продажа', color: '#2563eb', bg: 'rgba(37,99,235,0.08)',   border: 'rgba(37,99,235,0.22)' },
                                                                            rent: { label: 'Аренда',  color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.22)' },
                                                                            buy:  { label: 'Покупка', color: '#0891b2', bg: 'rgba(8,145,178,0.08)',   border: 'rgba(8,145,178,0.22)' },
                                                                            hire: { label: 'Найм',    color: '#be185d', bg: 'rgba(190,24,93,0.08)',   border: 'rgba(190,24,93,0.22)' },
                                                                        };
                                                                        const g = goalMap[dt] || { label: dt, color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.22)' };
                                                                        return (
                                                                            <span style={{
                                                                                fontSize: 10, fontWeight: 500,
                                                                                color: g.color, background: g.bg,
                                                                                padding: '3px 8px', borderRadius: 20,
                                                                                border: `1px solid ${g.border}`,
                                                                                textTransform: 'uppercase', letterSpacing: '0.04em',
                                                                                flexShrink: 0
                                                                            }}>
                                                                                {g.label}
                                                                            </span>
                                                                        );
                                                                    })()}
                                                                    <span style={{
                                                                        fontSize: 10, fontWeight: 400, flexShrink: 0,
                                                                        color: status === 'deal' ? '#16a34a' : status === 'deposit' ? '#059669' : status === 'advertising' ? '#7c3aed' : status === 'agreement' ? '#d97706' : '#2563eb',
                                                                        background: status === 'deal' ? 'rgba(22,163,74,0.08)' : status === 'deposit' ? 'rgba(5,150,105,0.08)' : status === 'advertising' ? 'rgba(124,58,237,0.08)' : status === 'agreement' ? 'rgba(217,119,6,0.08)' : 'rgba(37,99,235,0.08)',
                                                                        padding: '3px 8px', borderRadius: 20,
                                                                        border: `1px solid ${status === 'deal' ? 'rgba(22,163,74,0.2)' : status === 'deposit' ? 'rgba(5,150,105,0.2)' : status === 'advertising' ? 'rgba(124,58,237,0.2)' : status === 'agreement' ? 'rgba(217,119,6,0.2)' : 'rgba(37,99,235,0.2)'}`,
                                                                    }}>
                                                                        {statusLabels[status] || status}
                                                                    </span>
                                                                </div>

                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}


            </div>

            {selectedIds.length >= 1 && (
                <div style={{
                    position: 'fixed',
                    bottom: 80,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 2000,
                    display: 'flex',
                    gap: 12
                }}>
                    <button 
                        className="card-clickable" 
                        onClick={() => setSelectedIds([])}
                        style={{
                            height: 48,
                            padding: '0 20px',
                            borderRadius: 24,
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--text-secondary)',
                            fontWeight: 600,
                            fontSize: 14,
                            boxShadow: '0 8px 30px rgba(0,0,0,0.1)'
                        }}
                    >
                        Сбросить
                    </button>
                    <button 
                        className="card-clickable" 
                        disabled={selectedIds.length < 2}
                        onClick={() => navigate(`/compare?ids=${selectedIds.join(',')}`)}
                        style={{
                            height: 48,
                            padding: '0 24px',
                            borderRadius: 24,
                            border: 'none',
                            background: selectedIds.length >= 2 ? 'var(--primary)' : '#9ca3af',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: 14,
                            boxShadow: '0 8px 30px rgba(0, 82, 255, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            cursor: selectedIds.length >= 2 ? 'pointer' : 'not-allowed'
                        }}
                    >
                        Сравнить ({selectedIds.length})
                    </button>
                </div>
            )}
        </div>
    );
}
