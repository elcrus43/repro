import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatNumber } from '../../utils/format';
import { Pencil, Trash, MapPin, ChevronLeft, ChevronRight, Search, Plus, Building2 } from 'lucide-react';
import { usePagination } from '../../hooks/usePagination';
import { PROPERTY_TYPES } from '../../data/constants';
import { GlobalSearch } from '../../components/GlobalSearch';

export function ListPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const user = state.currentUser;
    const isAdmin = user?.role === 'admin';
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [scope, setScope] = useState('all');

    // Memoized filtered properties
    const filteredProperties = useMemo(() => {
        return state.properties
            .filter(p => scope === 'all' || p.realtor_id === user?.id)
            .filter(p => {
                const dealType = p.deal_type || 'sale'; // Default to sale if missing
                if (filter === 'sale') return dealType === 'sale';
                if (filter === 'rent') return dealType === 'rent';
                if (filter === 'active') return p.status === 'active';
                return true;
            })
            .filter(p => {
                if (!search) return true;
                const client = state.clients.find(c => c.id === p.client_id);
                return (p.address || '').toLowerCase().includes(search.toLowerCase()) ||
                    (p.city || '').toLowerCase().includes(search.toLowerCase()) ||
                    (client?.full_name || '').toLowerCase().includes(search.toLowerCase());
            });
    }, [state.properties, scope, user?.id, filter, search, state.clients]);

    // Pagination - show 20 items per page
    const { paginatedItems: properties, currentPage, totalPages, hasNext, hasPrev, nextPage, prevPage, resetPage } = usePagination(filteredProperties, 20);

    // Reset to page 1 when filtered data changes
    useEffect(() => { resetPage(); }, [filteredProperties, resetPage]);

    const statusLabels = { active: 'В продаже', paused: 'Пауза', deal_closed: 'Продано', refused: 'Снято' };
    const statusColors = { active: 'lime', paused: 'blue', deal_closed: 'green', refused: 'red' };

    return (
        <div className="page fade-in">
            <div className="topbar">
                <span className="topbar-title">Объекты</span>
                <div style={{ display: 'flex', gap: 8 }}>
                    <GlobalSearch />
                    <button className="icon-btn" onClick={() => navigate('/properties/new')} style={{ color: 'var(--primary)' }}><Plus size={24} strokeWidth={3} /></button>
                </div>
            </div>

            <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="search-bar">
                    <span className="search-icon"><Search size={16} /></span>
                    <input className="form-input" placeholder="Поиск по адресу или клиенту" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div style={{ display: 'flex', background: 'var(--bg)', padding: 4, borderRadius: 8, gap: 4 }}>
                    <button style={{ flex: 1, padding: '6px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, background: scope === 'all' ? 'white' : 'transparent', boxShadow: scope === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: scope === 'all' ? 'var(--text)' : 'var(--text-muted)' }} onClick={() => setScope('all')}>Все объекты</button>
                    <button style={{ flex: 1, padding: '6px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, background: scope === 'mine' ? 'white' : 'transparent', boxShadow: scope === 'mine' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: scope === 'mine' ? 'var(--text)' : 'var(--text-muted)' }} onClick={() => setScope('mine')}>Мои объекты</button>
                </div>
            </div>

            <div className="tab-filters">
                {[['all', 'Все'], ['sale', 'Продажа'], ['rent', 'Аренда'], ['active', 'Активные']].map(([val, label]) => (
                    <button key={val} className={`tab-filter ${filter === val ? 'active' : ''}`} onClick={() => setFilter(val)}>{label}</button>
                ))}
            </div>

            <div className="page-content" style={{ paddingTop: 8 }}>
                {properties.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-title">Нет объектов</div>
                        <div className="empty-desc">Добавьте первый объект недвижимости</div>
                        <button className="btn btn-primary" onClick={() => navigate('/properties/new')}>+ Добавить объект</button>
                    </div>
                )}
                {properties.map(prop => {
                    const client = state.clients.find(c => c.id === prop.client_id);
                    const matches = state.matches.filter(m => m.property_id === prop.id);
                    const status = prop.status || 'active'; // По умолчанию «В продаже»
                    const handleDelete = (e) => {
                        e.stopPropagation();
                        if (window.confirm(`Удалить объект ${prop.address || prop.city}?`)) {
                            dispatch({ type: 'DELETE_PROPERTY', id: prop.id });
                        }
                    };
                    return (
                        <div 
                            key={prop.id} 
                            className="card property-card-active card-clickable"
                            onClick={() => navigate(`/properties/${prop.id}`)}
                            style={{ display: 'flex', gap: 14, padding: 12, alignItems: 'stretch' }}
                        >
                            {/* PHOTO ZONE */}
                            <div style={{ 
                                width: 100, 
                                height: 100, 
                                minWidth: 100, 
                                borderRadius: 12, 
                                overflow: 'hidden', 
                                background: 'white',
                                border: '1px solid rgba(0,0,0,0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {prop.images && prop.images.length > 0 ? (
                                    <img src={prop.images[0]} alt="Объект" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <Building2 size={32} color="var(--text-muted)" style={{ opacity: 0.5 }} />
                                )}
                            </div>

                            {/* INFO ZONE */}
                            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                <div>
                                    <div className="flex justify-between items-start" style={{ marginBottom: 4 }}>
                                        <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--primary)', letterSpacing: '-0.3px' }}>{formatNumber(prop.price)} ₽</div>
                                        <span className={`badge badge-${statusColors[status]}`} style={{ fontSize: 10, padding: '2px 8px' }}>{statusLabels[status]}</span>
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2, color: 'var(--text)' }}>
                                        {PROPERTY_TYPES[prop.property_type]} {prop.rooms > 0 ? `· ${prop.rooms}к` : '· Студия'} · {prop.area_total} м²
                                    </div>
                                    <div className="flex items-center gap-4" style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        <MapPin size={12} style={{ flexShrink: 0 }} /> {(prop.address || prop.city || '—').split(', кв.')[0].split(' кв.')[0]}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 6 }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                                        {client?.full_name} · <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{matches.length}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 2 }}>
                                        <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={(e) => { e.stopPropagation(); navigate(`/properties/${prop.id}/edit`); }}><Pencil size={14} /></button>
                                        <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={handleDelete}><Trash size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16, paddingBottom: 80 }}>
                        <button
                            className="btn btn-outline"
                            onClick={prevPage}
                            disabled={!hasPrev}
                            style={{ padding: '8px 16px', opacity: hasPrev ? 1 : 0.5 }}
                        >
                            <ChevronLeft size={18} /> Назад
                        </button>
                        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                            Страница {currentPage} из {totalPages}
                        </span>
                        <button
                            className="btn btn-outline"
                            onClick={nextPage}
                            disabled={!hasNext}
                            style={{ padding: '8px 16px', opacity: hasNext ? 1 : 0.5 }}
                        >
                            Вперёд <ChevronRight size={18} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
