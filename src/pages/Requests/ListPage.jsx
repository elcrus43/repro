import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatNumber } from '../../utils/format';
import { Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
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

    // Memoized filtered requests
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
                    r.property_types?.some(t => PROPERTY_TYPES[t]?.toLowerCase().includes(search.toLowerCase()));
            });
    }, [state.requests, scope, user?.id, filter, search, state.clients]);

    // Pagination - show 20 items per page
    const { paginatedItems: requests, currentPage, totalPages, hasNext, hasPrev, nextPage, prevPage } = usePagination(filteredRequests, 20);

    const statusLabels = { active: 'Активен', paused: 'Пауза', deal_closed: 'Сделка', refused: 'Отказ' };
    const statusColors = { active: 'success', paused: 'warning', deal_closed: 'primary', refused: 'muted' };

    return (
        <div className="page fade-in">
            <div className="topbar">
                <span className="topbar-title">Запросы</span>
                <button className="icon-btn" onClick={() => navigate('/requests/new')} style={{ color: 'var(--primary)', fontSize: 24, fontWeight: 'bold' }}>+</button>
            </div>

            <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="search-bar">
                    <span className="search-icon">S</span>
                    <input className="form-input" placeholder="Поиск по клиенту или типу" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                {isAdmin && (
                    <div style={{ display: 'flex', background: 'var(--bg)', padding: 4, borderRadius: 8, gap: 4 }}>
                        <button style={{ flex: 1, padding: '6px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, background: scope === 'all' ? 'white' : 'transparent', boxShadow: scope === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: scope === 'all' ? 'var(--text)' : 'var(--text-muted)' }} onClick={() => setScope('all')}>Все запросы</button>
                        <button style={{ flex: 1, padding: '6px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, background: scope === 'mine' ? 'white' : 'transparent', boxShadow: scope === 'mine' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: scope === 'mine' ? 'var(--text)' : 'var(--text-muted)' }} onClick={() => setScope('mine')}>Мои запросы</button>
                    </div>
                )}
            </div>

            <div className="tab-filters">
                {[['all', 'Все'], ['active', 'Активные'], ['paused', 'Пауза']].map(([val, label]) => (
                    <button key={val} className={`tab-filter ${filter === val ? 'active' : ''}`} onClick={() => setFilter(val)}>{label}</button>
                ))}
            </div>

            <div className="page-content" style={{ paddingTop: 8 }}>
                {requests.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-title">Нет запросов</div>
                        <div className="empty-desc">Создайте первый запрос на подбор</div>
                        <button className="btn btn-primary" onClick={() => navigate('/requests/new')}>+ Создать запрос</button>
                    </div>
                )}
                {requests.map(req => {
                    const client = state.clients.find(c => c.id === req.client_id);
                    const matches = state.matches.filter(m => m.request_id === req.id);
                    const handleDelete = (e) => {
                        e.stopPropagation();
                        if (window.confirm(`Удалить запрос от ${client?.full_name}?`)) {
                            dispatch({ type: 'DELETE_REQUEST', id: req.id });
                        }
                    };
                    return (
                        <div key={req.id} className="card" onClick={() => navigate(`/requests/${req.id}`)}>
                            <div className="flex justify-between items-start" style={{ marginBottom: 4 }}>
                                <div style={{ fontWeight: 700, fontSize: 15 }}>{client?.full_name || 'Без имени'}</div>
                                <span className={`badge badge-${statusColors[req.status]}`}>{statusLabels[req.status]}</span>
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>
                                {req.property_types?.map(t => PROPERTY_TYPES[t] || t).join(', ')}
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)', marginBottom: 6 }}>
                                до {formatNumber(req.budget_max)} ₽
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    Совпадений: <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{matches.length}</span>
                                    {req.districts?.length > 0 && ` · ${req.districts.join(', ')}`}
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); navigate(`/requests/${req.id}/edit`); }}><Edit2 size={16} /></button>
                                    <button className="icon-btn" onClick={handleDelete}><Trash2 size={16} /></button>
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
            <button className="fab" onClick={() => navigate('/requests/new')}>+</button>
        </div>
    );
}
