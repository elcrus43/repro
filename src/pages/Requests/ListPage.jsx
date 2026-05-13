import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatNumber } from '../../utils/format';
import { Pencil, Trash, ChevronLeft, ChevronRight, Search, Plus, MapPin, Sparkles } from 'lucide-react';
import { usePagination } from '../../hooks/usePagination';
import { PROPERTY_TYPES } from '../../data/constants';

export function ListPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const user = state.currentUser;
    const isAdmin = user?.role === 'admin';
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [scope, setScope] = useState(isAdmin ? 'all' : 'mine');

    const filteredRequests = useMemo(() => {
        return state.requests
            .filter(r => scope === 'all' || r.realtor_id === user?.id)
            .filter(r => {
                if (filter === 'active') return r.status === 'active';
                if (filter === 'paused') return r.status === 'paused';
                return true;
            })
            .filter(r => {
                if (!search) return true;
                const client = state.clients.find(c => c.id === r.client_id);
                return client?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
                    r.property_types?.some(t => (PROPERTY_TYPES[t] || t)?.toLowerCase().includes(search.toLowerCase()));
            })
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [state.requests, scope, user?.id, filter, search, state.clients]);

    const { paginatedItems: requests, currentPage, totalPages, hasNext, hasPrev, nextPage, prevPage, resetPage } = usePagination(filteredRequests, 20);

    useEffect(() => { resetPage(); }, [filteredRequests, resetPage]);

    const statusLabels = { active: 'Активен', paused: 'Пауза', deal_closed: 'Сделка', refused: 'Отказ' };
    const statusColors = { active: '#10b981', paused: '#f59e0b', deal_closed: '#0052FF', refused: '#94a3b8' };

    return (
        <div className="page fade-in">
            {/* Sticky Header — Open Design */}
            <div className="topbar sticky" style={{ 
                background: 'rgba(255,255,255,0.7)', 
                backdropFilter: 'blur(20px) saturate(180%)',
                padding: '20px',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                height: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span className="topbar-title font-oswald" style={{ letterSpacing: '0.05em', fontSize: 22 }}>Запросы на совпадения</span>
                    <button className="card-clickable" onClick={() => navigate('/requests/new')} style={{ 
                        width: 44, height: 44, borderRadius: 14, border: 'none', background: 'var(--primary)', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(0, 82, 255, 0.2)'
                    }}>
                        <Plus size={24} />
                    </button>
                </div>

                <div className="search-bar" style={{ 
                    background: 'var(--bg-light)', borderRadius: 16, padding: '0 16px', height: 52, display: 'flex', alignItems: 'center', gap: 12, border: 'none' 
                }}>
                    <Search size={18} color="var(--text-muted)" />
                    <input 
                        className="form-input" 
                        placeholder="Поиск по клиенту или типу..." 
                        style={{ border: 'none', background: 'transparent', padding: 0, fontSize: 15, fontWeight: 600 }}
                        value={search} 
                        onChange={e => setSearch(e.target.value)} 
                    />
                </div>

                {isAdmin && (
                    <div style={{ display: 'flex', background: 'var(--bg-light)', padding: 4, borderRadius: 12, gap: 4 }}>
                        <button style={{ 
                            flex: 1, padding: '10px', borderRadius: 10, border: 'none', fontSize: 12, fontWeight: 800, textTransform: 'uppercase',
                            background: scope === 'all' ? 'white' : 'transparent', 
                            boxShadow: scope === 'all' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none', 
                            color: scope === 'all' ? 'var(--primary)' : 'var(--text-muted)' 
                        }} onClick={() => setScope('all')}>Все</button>
                        <button style={{ 
                            flex: 1, padding: '10px', borderRadius: 10, border: 'none', fontSize: 12, fontWeight: 800, textTransform: 'uppercase',
                            background: scope === 'mine' ? 'white' : 'transparent', 
                            boxShadow: scope === 'mine' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none', 
                            color: scope === 'mine' ? 'var(--primary)' : 'var(--text-muted)' 
                        }} onClick={() => setScope('mine')}>Мои</button>
                    </div>
                )}
            </div>

            <div className="tab-filters" style={{ padding: '8px 20px', gap: 12, overflowX: 'auto' }}>
                {[['all', 'Все'], ['active', 'Активные'], ['paused', 'Пауза']].map(([val, label]) => (
                    <button key={val} 
                        className={`tab-filter ${filter === val ? 'active' : ''}`} 
                        style={{ 
                            padding: '8px 16px', borderRadius: 12, border: 'none', fontSize: 13, fontWeight: 700,
                            background: filter === val ? 'var(--primary)' : 'white',
                            color: filter === val ? 'white' : 'var(--text-secondary)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }}
                        onClick={() => setFilter(val)}
                    >
                        {label}
                    </button>
                ))}
            </div>

            <div className="page-content" style={{ padding: '12px 20px 120px', gap: 16 }}>
                {requests.length === 0 ? (
                    <div className="empty-state" style={{ padding: '60px 0' }}>
                        <div style={{ width: 80, height: 80, background: 'var(--bg-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--text-muted)' }}>
                            <Search size={32} />
                        </div>
                        <div className="font-oswald" style={{ fontSize: 20, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Нет запросов</div>
                        <div style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Попробуйте изменить фильтры или поиск</div>
                        <button className="btn btn-primary" onClick={() => navigate('/requests/new')}>Создать первый запрос</button>
                    </div>
                ) : (
                    requests.map(req => {
                        const client = state.clients.find(c => c.id === req.client_id);
                        const matches = state.matches.filter(m => m.request_id === req.id);
                        return (
                            <div key={req.id} className="card card-clickable" onClick={() => navigate(`/requests/${req.id}`)} style={{ 
                                padding: 24, borderRadius: 32, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', background: 'white', position: 'relative'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                    <div style={{ flex: 1 }}>
                                        <div className="font-oswald" style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', textTransform: 'uppercase', marginBottom: 4 }}>
                                            {client?.full_name || 'Без имени'}
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                            {req.property_types?.map(t => (
                                                <span key={t} style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{PROPERTY_TYPES[t] || t}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ 
                                        padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                                        background: `${statusColors[req.status] || statusColors.active}15`,
                                        color: statusColors[req.status] || statusColors.active
                                    }}>
                                        {statusLabels[req.status] || statusLabels.active}
                                    </div>
                                </div>

                                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)', marginBottom: 12, fontFamily: "'Oswald', sans-serif" }}>
                                    до {formatNumber(req.budget_max)} ₽
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.03)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#858518', fontSize: 12, fontWeight: 700 }}>
                                            <Sparkles size={14} />
                                            <span>{matches.length} совпадения</span>
                                        </div>
                                        {req.districts?.length > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 12 }}>
                                                <MapPin size={12} />
                                                <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.districts[0]}{req.districts.length > 1 ? ` +${req.districts.length - 1}` : ''}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="card-clickable" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-light)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }} onClick={(e) => { e.stopPropagation(); navigate(`/requests/${req.id}/edit`); }}>
                                            <Pencil size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 20 }}>
                        <button
                            className="card-clickable"
                            onClick={prevPage}
                            disabled={!hasPrev}
                            style={{ 
                                width: 44, height: 44, borderRadius: 12, border: 'none', background: 'white', color: 'var(--text)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: hasPrev ? 1 : 0.4,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                            }}
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <span className="font-oswald" style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            className="card-clickable"
                            onClick={nextPage}
                            disabled={!hasNext}
                            style={{ 
                                width: 44, height: 44, borderRadius: 12, border: 'none', background: 'white', color: 'var(--text)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: hasNext ? 1 : 0.4,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                            }}
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
