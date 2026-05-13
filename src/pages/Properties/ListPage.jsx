import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatNumber } from '../../utils/format';
import { Pencil, Trash, MapPin, ChevronLeft, ChevronRight, Search, Plus, Building2, Filter, Share2 } from 'lucide-react';
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

    const filteredProperties = useMemo(() => {
        return state.properties
            .filter(p => scope === 'all' || p.realtor_id === user?.id)
            .filter(p => {
                const dealType = p.deal_type || 'sale';
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

    const { paginatedItems: properties, currentPage, totalPages, hasNext, hasPrev, nextPage, prevPage, resetPage } = usePagination(filteredProperties, 20);

    useEffect(() => { resetPage(); }, [filteredProperties, resetPage]);

    const statusLabels = { active: 'В продаже', paused: 'Пауза', deal_closed: 'Продано', refused: 'Снято' };
    const statusColors = { 
        active: 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)', 
        paused: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', 
        deal_closed: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
        refused: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)' 
    };

    return (
        <div className="page fade-in" style={{ background: 'var(--surface)' }}>
            <div className="topbar sticky" style={{ 
                background: 'rgba(255,255,255,0.7)', 
                backdropFilter: 'blur(24px) saturate(180%)',
                padding: '20px',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                height: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="topbar-title font-oswald" style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 22 }}>Объекты</span>
                        <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 800, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Портфель недвижимости</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <GlobalSearch />
                        <button 
                            className="card-clickable" 
                            onClick={() => navigate('/properties/new')} 
                            style={{ 
                                width: 44, height: 44, borderRadius: 14, border: 'none',
                                background: 'var(--primary)', color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 8px 16px rgba(0, 82, 255, 0.2)'
                            }}
                        >
                            <Plus size={24} strokeWidth={3} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="page-content" style={{ padding: '20px 20px 140px', gap: 16 }}>
                {/* SEARCH & FILTERS */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ 
                        background: 'white', borderRadius: 20, padding: '6px 16px', 
                        display: 'flex', alignItems: 'center', gap: 12,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.04)' 
                    }}>
                        <Search size={18} style={{ color: 'var(--text-secondary)', opacity: 0.4 }} />
                        <input 
                            className="form-input" 
                            placeholder="Адрес, город или клиент..." 
                            value={search} 
                            onChange={e => setSearch(e.target.value)} 
                            style={{ border: 'none', background: 'transparent', padding: '10px 0', fontSize: 14, fontWeight: 600 }} 
                        />
                    </div>

                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.03)', padding: 4, borderRadius: 16, gap: 4 }}>
                        <button 
                            className="card-clickable font-oswald" 
                            style={{ 
                                flex: 1, padding: '10px', borderRadius: 12, border: 'none', fontSize: 12, fontWeight: 700, 
                                background: scope === 'all' ? 'white' : 'transparent', 
                                boxShadow: scope === 'all' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none', 
                                color: scope === 'all' ? 'var(--text)' : 'var(--text-secondary)', 
                                textTransform: 'uppercase', letterSpacing: '0.05em' 
                            }} 
                            onClick={() => setScope('all')}
                        >Все объекты</button>
                        <button 
                            className="card-clickable font-oswald" 
                            style={{ 
                                flex: 1, padding: '10px', borderRadius: 12, border: 'none', fontSize: 12, fontWeight: 700, 
                                background: scope === 'mine' ? 'white' : 'transparent', 
                                boxShadow: scope === 'mine' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none', 
                                color: scope === 'mine' ? 'var(--text)' : 'var(--text-secondary)', 
                                textTransform: 'uppercase', letterSpacing: '0.05em' 
                            }} 
                            onClick={() => setScope('mine')}
                        >Мои объекты</button>
                    </div>

                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                        {[
                            ['all', 'Все'], ['sale', 'Продажа'], ['rent', 'Аренда'], ['active', 'Активные']
                        ].map(([val, label]) => (
                            <button 
                                key={val} 
                                onClick={() => setFilter(val)} 
                                style={{ 
                                    whiteSpace: 'nowrap', padding: '8px 16px', borderRadius: 12, border: 'none',
                                    background: filter === val ? 'var(--primary)' : 'white',
                                    color: filter === val ? 'white' : 'var(--text-secondary)',
                                    fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                                    fontFamily: "'Oswald', sans-serif", boxShadow: filter === val ? '0 4px 12px rgba(0, 82, 255, 0.2)' : 'none'
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {properties.length === 0 && (
                    <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
                        <div style={{ width: 80, height: 80, borderRadius: 30, background: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <Building2 size={40} style={{ opacity: 0.2 }} />
                        </div>
                        <div className="font-oswald" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Нет объектов</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 24 }}>Начните наполнять свой портфель</div>
                        <button className="card-clickable" onClick={() => navigate('/properties/new')} style={{ padding: '12px 24px', borderRadius: 16, border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: 13 }}>Добавить объект</button>
                    </div>
                )}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {properties.map(prop => {
                        let propClientIds = prop.client_ids || [];
                        if (typeof propClientIds === 'string') {
                            propClientIds = propClientIds.replace(/{|}/g, '').split(',').filter(Boolean);
                        }
                        const clientId = propClientIds.length > 0 ? propClientIds[0] : prop.client_id;
                        const client = state.clients.find(c => c.id === clientId);
                        const matches = state.matches.filter(m => m.property_id === prop.id);
                        const status = prop.status || 'active';
                        
                        const handleDelete = (e) => {
                            e.stopPropagation();
                            if (window.confirm(`Удалить объект ${prop.address || prop.city}?`)) {
                                dispatch({ type: 'DELETE_PROPERTY', id: prop.id });
                            }
                        };

                        return (
                            <div 
                                key={prop.id} 
                                className="card fade-in card-clickable"
                                onClick={() => navigate(`/properties/${prop.id}`)}
                                style={{ 
                                    display: 'flex', gap: 16, padding: '16px', alignItems: 'center', 
                                    border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.03)',
                                    background: 'white', borderRadius: 24
                                }}
                            >
                                {/* IMAGE WRAPPER */}
                                <div style={{ 
                                    width: 100, height: 100, minWidth: 100, borderRadius: 20, 
                                    overflow: 'hidden', background: '#f8fafc', position: 'relative',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                                }}>
                                    {prop.images?.[0] ? (
                                        <img src={prop.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.2 }}>
                                            <Building2 size={24} />
                                            <div style={{ fontSize: 8, fontWeight: 700, marginTop: 4 }}>Нет фото</div>
                                        </div>
                                    )}
                                    <div style={{ position: 'absolute', top: 8, left: 8 }}>
                                        <div style={{ 
                                            background: statusColors[status] || '#94a3b8', 
                                            color: 'white', fontSize: 8, fontWeight: 900, 
                                            padding: '3px 8px', borderRadius: 7,
                                            boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
                                        }}>
                                            {statusLabels[status]}
                                        </div>
                                    </div>
                                </div>

                                {/* CONTENT WRAPPER */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="font-oswald" style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', lineHeight: 1.1 }}>
                                        {formatNumber(prop.price)} <span style={{ fontSize: 13, opacity: 0.6 }}>₽</span>
                                    </div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span>{prop.rooms > 0 ? `${prop.rooms}к` : 'Студия'}</span>
                                        <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(0,0,0,0.2)' }} />
                                        <span>{prop.area_total} м²</span>
                                        <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(0,0,0,0.2)' }} />
                                        <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{PROPERTY_TYPES[prop.property_type]}</span>
                                    </div>
                                    <div style={{ 
                                        fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, 
                                        display: 'flex', alignItems: 'flex-start', gap: 4,
                                        fontWeight: 500, opacity: 0.8
                                    }}>
                                        <MapPin size={12} style={{ marginTop: 2, flexShrink: 0, color: 'var(--primary)' }} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
                                            {prop.address || prop.city}
                                        </span>
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, borderTop: '1px solid rgba(0,0,0,0.03)', paddingTop: 10 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <div style={{ width: 20, height: 20, borderRadius: 6, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Share2 size={10} color="var(--primary)" />
                                            </div>
                                            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)' }}>{matches.length} совпадений</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button className="card-clickable" style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }} onClick={(e) => { e.stopPropagation(); navigate(`/properties/${prop.id}/edit`); }}>
                                                <Pencil size={14} />
                                            </button>
                                            <button className="card-clickable" style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: 'rgba(239, 68, 68, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }} onClick={handleDelete}>
                                                <Trash size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* PAGINATION */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 32 }}>
                        <button
                            className="card-clickable"
                            onClick={prevPage}
                            disabled={!hasPrev}
                            style={{ 
                                padding: '10px 20px', borderRadius: 14, border: 'none', background: 'white',
                                opacity: hasPrev ? 1 : 0.4, display: 'flex', alignItems: 'center', gap: 8,
                                fontWeight: 800, fontSize: 12, color: 'var(--text)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                            }}
                        >
                            <ChevronLeft size={16} /> НАЗАД
                        </button>
                        <span className="font-oswald" style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            className="card-clickable"
                            onClick={nextPage}
                            disabled={!hasNext}
                            style={{ 
                                padding: '10px 20px', borderRadius: 14, border: 'none', background: 'white',
                                opacity: hasNext ? 1 : 0.4, display: 'flex', alignItems: 'center', gap: 8,
                                fontWeight: 800, fontSize: 12, color: 'var(--text)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                            }}
                        >
                            ВПЕРЁД <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* FLOATING ACTION BUTTON */}
            <button 
                className="card-clickable font-oswald" 
                onClick={() => navigate('/properties/new')}
                style={{ 
                    position: 'fixed', 
                    bottom: 'calc(var(--nav-h) + 32px + env(safe-area-inset-bottom))', 
                    right: 20, 
                    zIndex: 200, 
                    borderRadius: 24, 
                    padding: '0 32px',
                    height: 64,
                    fontSize: 15,
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: 'var(--primary)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    border: 'none',
                    boxShadow: '0 16px 32px rgba(0, 82, 255, 0.3)'
                }}
            >
                <Plus size={24} strokeWidth={3} />
                Опубликовать
            </button>
        </div>
    );
}
