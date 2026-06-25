import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatPhone } from '../../utils/format';
import { usePagination } from '../../hooks/usePagination';
import { Pencil, Trash, ChevronLeft, ChevronRight, Search, Plus, Columns3, LayoutList } from 'lucide-react';
import { GlobalSearch } from '../../components/GlobalSearch';
import { useExport } from '../../hooks/useExport';
import { PipelinePage } from './PipelinePage';

export function ListPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const { exportToCSV } = useExport();
    const user = state.currentUser;
    const isAdmin = user?.role === 'admin';
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [scope, setScope] = useState(isAdmin ? 'all' : 'mine');
    const [viewMode, setViewMode] = useState('list');

    // Auto-revert to list mode if filter is changed away from buyer
    useEffect(() => {
        if (filter !== 'buyer') {
            setViewMode('list');
        }
    }, [filter]);

    // Memoized filtered clients
    const filteredClients = useMemo(() => {
        return state.clients
            .filter(c => scope === 'all' || c.realtor_id === user?.id)
            .filter(c => {
                if (filter === 'buyer') return c.client_types?.includes('buyer');
                if (filter === 'seller') return c.client_types?.includes('seller');
                if (filter === 'developer') return c.client_types?.includes('developer');
                if (filter === 'agent') return c.client_types?.includes('agent');
                if (filter === 'landlord') return c.client_types?.includes('landlord');
                if (filter === 'tenant') return c.client_types?.includes('tenant');
                if (filter === 'active') {
                    const inactiveStatuses = ['refused', 'completed', 'deal_closed'];
                    return !inactiveStatuses.includes(c.status);
                }
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

    const typeLabels = { buyer: 'Покупатель', seller: 'Продавец', developer: 'Застройщик', agent: 'Агент', landlord: 'Арендодатель', tenant: 'Арендатор' };
    const statusColors = {
        new: 'danger',
        active: 'success',
        request: 'info',
        agreement: 'warning',
        search: 'secondary',
        deposit: 'success',
        deal: 'primary',
        paused: 'warning',
        refused: 'muted',
        completed: 'success'
    };
    const statusLabels = {
        new: 'Не отработан',
        active: 'В работе',
        request: 'Запрос',
        agreement: 'АД',
        search: 'Поиск',
        deposit: 'Задаток',
        deal: 'Сделка',
        paused: 'Пауза',
        refused: 'Отказ',
        completed: 'Завершен'
    };

    const handleExport = () => {
        const headers = [
            { key: 'full_name', label: 'ФИО' },
            { key: 'phone', label: 'Телефон' },
            { key: 'email', label: 'Email' },
            { 
                label: 'Тип клиента', 
                resolve: (c) => c.client_types?.map(t => typeLabels[t] || t).join(', ') || '' 
            }
        ];
        exportToCSV(filteredClients, 'clients_export', headers);
    };

    return (
        <div className="page fade-in" style={{ paddingBottom: 100 }}>
            {/* Premium Sticky Topbar — Open Design */}
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
                        <span className="topbar-title font-oswald" style={{ letterSpacing: '0.01em', fontSize: 22, fontWeight: 300 }}>Клиенты</span>
                        <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 200, opacity: 0.6, letterSpacing: '0.05em' }}>База контактов</span>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <GlobalSearch />
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
                        <button className="card-clickable" onClick={() => navigate('/clients/new')} style={{ 
                            width: 44, height: 44, borderRadius: 14, border: 'none', 
                            background: 'var(--surface)', color: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer'
                        }}>
                            <Plus size={24} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="page-content" style={{ padding: '20px 20px 120px', gap: 16 }}>
                {/* Modern Search & Filters */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', background: 'var(--bg-light)', padding: 4, borderRadius: 16, gap: 4 }}>
                        <button style={{ 
                            flex: 1, padding: '10px', borderRadius: 12, border: 'none', fontSize: 13, fontWeight: 300,
                            background: scope === 'all' ? 'var(--surface)' : 'transparent', 
                            boxShadow: scope === 'all' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none', 
                            color: scope === 'all' ? 'var(--text)' : 'var(--text-secondary)',
                            transition: 'all 0.2s ease', fontFamily: "'Oswald', sans-serif"
                        }} onClick={() => setScope('all')}>Общая база</button>
                        <button style={{ 
                            flex: 1, padding: '10px', borderRadius: 12, border: 'none', fontSize: 13, fontWeight: 300,
                            background: scope === 'mine' ? 'var(--surface)' : 'transparent', 
                            boxShadow: scope === 'mine' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none', 
                            color: scope === 'mine' ? 'var(--text)' : 'var(--text-secondary)',
                            transition: 'all 0.2s ease', fontFamily: "'Oswald', sans-serif"
                        }} onClick={() => setScope('mine')}>Мои клиенты</button>
                    </div>

                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                        {[
                            ['all', 'Все'], ['buyer', 'Покупатели'], ['seller', 'Продавцы'], ['developer', 'Застройщики'], ['agent', 'Агенты'], ['active', 'Активные']
                        ].map(([val, label]) => (
                            <button 
                                key={val} 
                                className={`tab-filter ${filter === val ? 'active' : ''}`} 
                                onClick={() => setFilter(val)}
                                style={{ 
                                    whiteSpace: 'nowrap', padding: '8px 16px', borderRadius: 12, border: 'none',
                                    background: filter === val ? 'var(--primary)' : 'var(--surface)',
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

                {viewMode === 'pipeline' && <PipelinePage />}

                {viewMode === 'list' && clients.length === 0 && (
                    <div className="empty-state" style={{ background: 'var(--surface)', borderRadius: 28, padding: '60px 40px', boxShadow: '0 8px 32px rgba(0,0,0,0.03)' }}>
                        <div className="empty-title font-oswald" style={{ fontSize: 20, fontWeight: 300 }}>Нет клиентов</div>
                        <div className="empty-desc" style={{ fontWeight: 200 }}>Самое время добавить новый контакт в базу</div>
                        <button className="card-clickable" style={{ 
                            padding: '12px 24px', borderRadius: 14, border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 300, fontSize: 14, marginTop: 10
                        }} onClick={() => navigate('/clients/new')}>Добавить клиента</button>
                    </div>
                )}
                {viewMode === 'list' && clients.map(client => {
                    const matches = state.matches.filter(m => {
                        const prop = state.properties.find(p => p.id === m.property_id);
                        const req = state.requests.find(r => r.id === m.request_id);
                        return prop?.client_id === client.id || req?.client_id === client.id;
                    });
                    
                    const initial = client.full_name?.charAt(0).toUpperCase() || '?';
                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                    const avatarBg = colors[initial.charCodeAt(0) % colors.length];

                    const getStatusStyle = (status) => {
                        switch(status) {
                            case 'new': return { color: 'var(--danger)', background: 'var(--danger-light)', border: '1px solid rgba(239,68,68,0.2)' };
                            case 'active': return { color: 'var(--success)', background: 'var(--success-light)', border: '1px solid rgba(16,185,129,0.2)' };
                            case 'request': return { color: '#2563eb', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)' };
                            case 'agreement': return { color: '#d97706', background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)' };
                            case 'search': return { color: '#7c3aed', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' };
                            case 'deposit': return { color: '#059669', background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)' };
                            case 'deal': return { color: '#16a34a', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)' };
                            case 'paused': return { color: 'var(--warning)', background: 'var(--warning-light)', border: '1px solid rgba(245,158,11,0.2)' };
                            case 'refused': return { color: 'var(--text-secondary)', background: 'var(--bg-light)', border: '1px solid var(--border-light)' };
                            case 'completed': return { color: '#16a34a', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)' };
                            default: return { color: 'var(--text-secondary)', background: 'var(--bg-light)', border: '1px solid var(--border-light)' };
                        }
                    };
                    const statusStyle = getStatusStyle(client.status);

                    return (
                        <div key={client.id} className="card card-clickable" style={{ 
                            padding: '12px 16px', border: 'none', background: 'var(--surface)', borderRadius: 20, 
                            boxShadow: '0 4px 20px rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden',
                            borderLeft: `4px solid ${avatarBg}`,
                            display: 'flex', flexDirection: 'column', gap: 6
                        }} onClick={() => navigate(`/clients/${client.id}`)}>
                            {/* Строка 1: ФИО и статус */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                    {client.full_name}
                                </div>
                                <div style={{ 
                                    padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 500, letterSpacing: '0.02em',
                                    whiteSpace: 'nowrap',
                                    ...statusStyle
                                }}>
                                    {statusLabels[client.status] || client.status}
                                </div>
                            </div>

                            {/* Строка 2: Телефон, типы и совпадения */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 400, whiteSpace: 'nowrap' }}>
                                    {formatPhone(client.phone)}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                        {client.client_types?.map(t => (
                                            <span key={t} style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 400, background: 'var(--bg-light)', padding: '1px 6px', borderRadius: 4 }}>
                                                {typeLabels[t]}
                                            </span>
                                        ))}
                                    </div>
                                    {matches.length > 0 && (
                                        <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 600, background: 'var(--primary-light)', padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                                            {matches.length} совп.
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Pagination Controls */}
                {viewMode === 'list' && totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 20, paddingBottom: 20 }}>
                        <button
                            className="card-clickable"
                            onClick={prevPage}
                            disabled={!hasPrev}
                            style={{ 
                                width: 44, height: 44, borderRadius: 12, border: 'none', background: 'var(--surface)', color: 'var(--text)',
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
                                width: 44, height: 44, borderRadius: 12, border: 'none', background: 'var(--surface)', color: 'var(--text)',
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
