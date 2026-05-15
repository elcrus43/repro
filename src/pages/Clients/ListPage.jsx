import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatPhone } from '../../utils/format';
import { usePagination } from '../../hooks/usePagination';
import { Pencil, Trash, ChevronLeft, ChevronRight, Search, Plus } from 'lucide-react';
import { GlobalSearch } from '../../components/GlobalSearch';

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
                if (filter === 'developer') return c.client_types?.includes('developer');
                if (filter === 'landlord') return c.client_types?.includes('landlord');
                if (filter === 'tenant') return c.client_types?.includes('tenant');
                if (filter === 'active') return c.status === 'active';
                return true;
            })
            .filter(c => {
                const phones = c.phones || [c.phone];
                return !search || c.full_name?.toLowerCase().includes(search.toLowerCase()) || phones.some(p => p?.includes(search));
            });
    }, [state.clients, scope, user?.id, filter, search]);

    // Pagination - show 20 items per page
    const { paginatedItems: clients, currentPage, totalPages, hasNext, hasPrev, nextPage, prevPage, resetPage } = usePagination(filteredClients, 20);

    // Reset to page 1 when filtered data changes
    useEffect(() => { resetPage(); }, [filteredClients, resetPage]);

    const typeLabels = { buyer: 'Покупатель', seller: 'Продавец', developer: 'Застройщик', landlord: 'Арендодатель', tenant: 'Арендатор' };
    const statusColors = { active: 'success', paused: 'warning', deal_closed: 'primary', refused: 'muted' };
    const statusLabels = { active: 'Активен', paused: 'Пауза', deal_closed: 'Сделка', refused: 'Отказ' };

    return (
        <div className="page fade-in" style={{ paddingBottom: 100 }}>
            {/* Premium Sticky Topbar — Open Design */}
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
                        <span className="topbar-title font-oswald" style={{ letterSpacing: '0.01em', fontSize: 22, fontWeight: 300 }}>Клиенты</span>
                        <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 200, opacity: 0.6, letterSpacing: '0.05em' }}>База контактов</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <GlobalSearch />
                        <button className="card-clickable" onClick={() => navigate('/clients/new')} style={{ 
                            width: 44, height: 44, borderRadius: 14, border: 'none', 
                            background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 8px 16px rgba(0, 82, 255, 0.2)'
                        }}>
                            <Plus size={24} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="page-content" style={{ padding: '20px 20px 120px', gap: 16 }}>
                {/* Modern Search & Filters */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="search-bar" style={{ background: 'white', border: '1px solid rgba(0,0,0,0.04)', height: 50, borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                        <span className="search-icon"><Search size={18} /></span>
                        <input className="form-input" placeholder="Поиск по имени или телефону" value={search} onChange={e => setSearch(e.target.value)} style={{ background: 'transparent', border: 'none', fontWeight: 200 }} />
                    </div>
                    
                    <div style={{ display: 'flex', background: 'rgba(0,0,0,0.03)', padding: 4, borderRadius: 16, gap: 4 }}>
                        <button style={{ 
                            flex: 1, padding: '10px', borderRadius: 12, border: 'none', fontSize: 13, fontWeight: 300,
                            background: scope === 'all' ? 'white' : 'transparent', 
                            boxShadow: scope === 'all' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none', 
                            color: scope === 'all' ? 'var(--text)' : 'var(--text-secondary)',
                            transition: 'all 0.2s ease', fontFamily: "'Oswald', sans-serif"
                        }} onClick={() => setScope('all')}>Общая база</button>
                        <button style={{ 
                            flex: 1, padding: '10px', borderRadius: 12, border: 'none', fontSize: 13, fontWeight: 300,
                            background: scope === 'mine' ? 'white' : 'transparent', 
                            boxShadow: scope === 'mine' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none', 
                            color: scope === 'mine' ? 'var(--text)' : 'var(--text-secondary)',
                            transition: 'all 0.2s ease', fontFamily: "'Oswald', sans-serif"
                        }} onClick={() => setScope('mine')}>Мои клиенты</button>
                    </div>

                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                        {[
                            ['all', 'Все'], ['buyer', 'Покупатели'], ['seller', 'Продавцы'], ['developer', 'Застройщики'], ['active', 'Активные']
                        ].map(([val, label]) => (
                            <button 
                                key={val} 
                                className={`tab-filter ${filter === val ? 'active' : ''}`} 
                                onClick={() => setFilter(val)}
                                style={{ 
                                    whiteSpace: 'nowrap', padding: '8px 16px', borderRadius: 12, border: 'none',
                                    background: filter === val ? 'var(--primary)' : 'white',
                                    color: filter === val ? 'white' : 'var(--text-secondary)',
                                    fontSize: 13, fontWeight: 300,
                                    fontFamily: "'Oswald', sans-serif", boxShadow: filter === val ? '0 4px 12px rgba(0, 82, 255, 0.2)' : 'none'
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {clients.length === 0 && (
                    <div className="empty-state" style={{ background: 'white', borderRadius: 28, padding: '60px 40px', boxShadow: '0 8px 32px rgba(0,0,0,0.03)' }}>
                        <div className="empty-title font-oswald" style={{ fontSize: 20, fontWeight: 300 }}>Нет клиентов</div>
                        <div className="empty-desc" style={{ fontWeight: 200 }}>Самое время добавить новый контакт в базу</div>
                        <button className="card-clickable" style={{ 
                            padding: '12px 24px', borderRadius: 14, border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 300, fontSize: 14, marginTop: 10
                        }} onClick={() => navigate('/clients/new')}>Добавить клиента</button>
                    </div>
                )}
                {clients.map(client => {
                    const matches = state.matches.filter(m => {
                        const prop = state.properties.find(p => p.id === m.property_id);
                        const req = state.requests.find(r => r.id === m.request_id);
                        return prop?.client_id === client.id || req?.client_id === client.id;
                    });
                    
                    const initial = client.full_name?.charAt(0).toUpperCase() || '?';
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                    const avatarBg = colors[initial.charCodeAt(0) % colors.length];

                    return (
                        <div key={client.id} className="card card-clickable" style={{ 
                            padding: '16px', border: 'none', background: 'white', borderRadius: 24, 
                            boxShadow: '0 8px 32px rgba(0,0,0,0.03)', position: 'relative', overflow: 'hidden',
                            borderLeft: `4px solid ${avatarBg}`
                        }} onClick={() => navigate(`/clients/${client.id}`)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ fontWeight: 400, fontSize: 16, color: 'var(--text)', marginBottom: 2 }}>{client.full_name}</div>
                                        <div style={{ 
                                            padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 300, letterSpacing: '0.05em',
                                            background: client.status === 'active' ? '#ecfdf5' : '#fef3c7',
                                            color: client.status === 'active' ? '#10b981' : '#f59e0b'
                                        }}>
                                            {statusLabels[client.status] || client.status}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 300, marginBottom: 4 }}>
                                        {formatPhone(client.phone)}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            {client.client_types?.map(t => (
                                                <span key={t} style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 400, background: 'var(--bg-light)', padding: '2px 8px', borderRadius: 6 }}>
                                                    {typeLabels[t]}
                                                </span>
                                            ))}
                                        </div>
                                        {matches.length > 0 && (
                                            <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 400 }}>
                                                {matches.length} совпадений
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 20, paddingBottom: 20 }}>
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
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)' }}>
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
