import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatPhone } from '../../utils/format';
import { usePagination } from '../../hooks/usePagination';
import { Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export function ListPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const user = state.currentUser;
    const isAdmin = user?.role === 'admin';
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [scope, setScope] = useState(isAdmin ? 'all' : 'mine');

    // Memoized filtered clients
    const filteredClients = useMemo(() => {
        return state.clients
            .filter(c => scope === 'all' || c.realtor_id === user?.id)
            .filter(c => {
                if (filter === 'buyer') return c.client_types?.includes('buyer');
                if (filter === 'seller') return c.client_types?.includes('seller');
                if (filter === 'landlord') return c.client_types?.includes('landlord');
                if (filter === 'tenant') return c.client_types?.includes('tenant');
                if (filter === 'active') return c.status === 'active';
                return true;
            })
            .filter(c =>
                !search || c.full_name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)
            );
    }, [state.clients, scope, user?.id, filter, search]);

    // Pagination - show 20 items per page
    const { paginatedItems: clients, currentPage, totalPages, hasNext, hasPrev, nextPage, prevPage, resetPage } = usePagination(filteredClients, 20);

    // Reset to page 1 when filtered data changes
    useEffect(() => { resetPage(); }, [filteredClients, resetPage]);

    const typeLabels = { buyer: 'Покупатель', seller: 'Продавец', landlord: 'Арендодатель', tenant: 'Арендатор' };
    const statusColors = { active: 'success', paused: 'warning', deal_closed: 'primary', refused: 'muted' };
    const statusLabels = { active: 'Активен', paused: 'Пауза', deal_closed: 'Сделка', refused: 'Отказ' };

    return (
        <div className="page fade-in">
            <div className="topbar">
                <span className="topbar-title">Клиенты</span>
                <button className="icon-btn" onClick={() => navigate('/clients/new')} style={{ color: 'var(--primary)', fontSize: 24, fontWeight: 'bold' }}>+</button>
            </div>

            <div style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div className="search-bar">
                    <span className="search-icon">S</span>
                    <input className="form-input" placeholder="Поиск по имени или телефону" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                {isAdmin && (
                    <div style={{ display: 'flex', background: 'var(--bg)', padding: 4, borderRadius: 8, gap: 4 }}>
                        <button style={{ flex: 1, padding: '6px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, background: scope === 'all' ? 'white' : 'transparent', boxShadow: scope === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: scope === 'all' ? 'var(--text)' : 'var(--text-muted)' }} onClick={() => setScope('all')}>Общая база</button>
                        <button style={{ flex: 1, padding: '6px', borderRadius: 6, border: 'none', fontSize: 13, fontWeight: 600, background: scope === 'mine' ? 'white' : 'transparent', boxShadow: scope === 'mine' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: scope === 'mine' ? 'var(--text)' : 'var(--text-muted)' }} onClick={() => setScope('mine')}>Мои клиенты</button>
                    </div>
                )}
            </div>

            <div className="tab-filters">
                {[['all', 'Все'], ['buyer', 'Покупатели'], ['seller', 'Продавцы'], ['landlord', 'Арендодатели'], ['tenant', 'Арендаторы'], ['active', 'Активные']].map(([val, label]) => (
                    <button key={val} className={`tab-filter ${filter === val ? 'active' : ''}`} onClick={() => setFilter(val)}>{label}</button>
                ))}
            </div>

            <div className="page-content" style={{ paddingTop: 8 }}>
                {clients.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-title">Нет клиентов</div>
                        <div className="empty-desc">Добавьте первого клиента</div>
                        <button className="btn btn-primary" onClick={() => navigate('/clients/new')}>+ Добавить клиента</button>
                    </div>
                )}
                {clients.map(client => {
                    const matches = state.matches.filter(m => {
                        const prop = state.properties.find(p => p.id === m.property_id);
                        const req = state.requests.find(r => r.id === m.request_id);
                        return prop?.client_id === client.id || req?.client_id === client.id;
                    });
                    const handleDelete = (e) => {
                        e.stopPropagation();
                        if (window.confirm(`Удалить клиента ${client.full_name}?`)) {
                            dispatch({ type: 'DELETE_CLIENT', id: client.id });
                        }
                    };
                    const handleEdit = (e) => {
                        e.stopPropagation();
                        navigate(`/clients/${client.id}/edit`);
                    };
                    return (
                        <div key={client.id} className="card" style={{ position: 'relative' }} onClick={() => navigate(`/clients/${client.id}`)}>
                            <div className="flex items-center gap-12">
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="flex items-center gap-8" style={{ marginBottom: 2 }}>
                                        <span style={{ fontWeight: 700, fontSize: 15 }}>{client.full_name}</span>
                                        <span className={`badge badge-${statusColors[client.status] || 'muted'}`} style={{ fontSize: 11 }}>
                                            {statusLabels[client.status] || client.status}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                        {client.client_types?.map(t => (
                                            <span key={t} style={{ opacity: 0.8 }}>{typeLabels[t]}</span>
                                        )).reduce((prev, curr) => [prev, ' · ', curr])}
                                        {client.client_types?.length > 0 && ' · '} <span style={{ color: '#2563EB', fontWeight: 600 }}>{formatPhone(client.phone)}</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                                        {client.additional_contacts?.length > 0 && `+${client.additional_contacts.length} чел. · `}
                                        {matches.length > 0 && `Совпадений: ${matches.length}`}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button className="icon-btn" onClick={handleEdit}><Edit2 size={16} /></button>
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

            <button className="fab" onClick={() => navigate('/clients/new')}>+</button>
        </div >
    );
}
