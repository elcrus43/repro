import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatPhone } from '../../utils/format';
import { usePagination } from '../../hooks/usePagination';
import { Pencil, Trash, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Search, Plus, Columns3, LayoutList } from 'lucide-react';
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

    const [collapsedStatuses, setCollapsedStatuses] = useState({
        active: true,
        selection: true,
        new: true,
        refused: true
    });

    const mapStatus = (status) => {
        switch (status) {
            case 'new':
                return 'new';
            case 'refused':
                return 'refused';
            case 'search':
            case 'request':
            case 'selection':
                return 'selection';
            case 'active':
            case 'deposit':
            case 'deal':
            case 'agreement':
            case 'paused':
            case 'completed':
            case 'deal_closed':
            default:
                return 'active';
        }
    };

    const statusColors = {
        new: 'muted',
        selection: 'blue',
        active: 'success',
        refused: 'danger'
    };

    const statusLabels = {
        new: 'Не отработан',
        selection: 'Подбор',
        active: 'В работе',
        refused: 'Отказ'
    };

    const statusSolidColors = {
        new: '#6b7280',
        selection: '#3b82f6',
        active: '#10b981',
        refused: '#ef4444'
    };

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
                    return mapStatus(c.status) !== 'refused';
                }
                return true;
            })
            .filter(c => {
                const phones = c.phones || [c.phone];
                return !search || c.full_name?.toLowerCase().includes(search.toLowerCase()) || phones.some(p => p?.includes(search));
            })
            .sort((a, b) => {
                const order = { active: 1, selection: 2, new: 3, refused: 4 };
                const orderA = order[mapStatus(a.status)] || 99;
                const orderB = order[mapStatus(b.status)] || 99;
                if (orderA !== orderB) return orderA - orderB;
                return new Date(b.created_at || 0) - new Date(a.created_at || 0);
            });
    }, [state.clients, scope, user?.id, filter, search]);

    const groupedClients = useMemo(() => {
        const groups = {
            selection: [],
            active: [],
            new: [],
            refused: []
        };
        filteredClients.forEach(c => {
            const mapped = mapStatus(c.status);
            if (!groups[mapped]) {
                groups[mapped] = [];
            }
            groups[mapped].push(c);
        });
        return groups;
    }, [filteredClients]);

    const statusOrder = useMemo(() => {
        if (filter === 'active') return ['active', 'selection', 'new'];
        return ['active', 'selection', 'new', 'refused'];
    }, [filter]);

    const toggleStatus = (status) => {
        setCollapsedStatuses(prev => ({
            ...prev,
            [status]: !prev[status]
        }));
    };

    const typeLabels = { buyer: 'Покупатель', seller: 'Продавец', developer: 'Застройщик', agent: 'Агент', landlord: 'Арендодатель', tenant: 'Арендатор' };

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

                {viewMode === 'list' && filteredClients.length === 0 && (
                    <div className="empty-state" style={{ background: 'var(--surface)', borderRadius: 28, padding: '60px 40px', boxShadow: '0 8px 32px rgba(0,0,0,0.03)' }}>
                        <div className="empty-title font-oswald" style={{ fontSize: 20, fontWeight: 300 }}>Нет клиентов</div>
                        <div className="empty-desc" style={{ fontWeight: 200 }}>Самое время добавить новый контакт в базу</div>
                        <button className="card-clickable" style={{ 
                            padding: '12px 24px', borderRadius: 14, border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 300, fontSize: 14, marginTop: 10
                        }} onClick={() => navigate('/clients/new')}>Добавить клиента</button>
                    </div>
                )}

                {viewMode === 'list' && filteredClients.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {statusOrder.map(status => {
                            const items = groupedClients[status] || [];
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
                                                background: statusSolidColors[status] || 'var(--primary)',
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
                                                    Нет клиентов
                                                </div>
                                            ) : (
                                                items.map(client => {
                                                    const matches = state.matches.filter(m => {
                                                        const prop = state.properties.find(p => p.id === m.property_id);
                                                        const req = state.requests.find(r => r.id === m.request_id);
                                                        return prop?.client_id === client.id || req?.client_id === client.id;
                                                    });

                                                    const initial = client.full_name?.charAt(0).toUpperCase() || '?';
                                                    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                                                    const avatarBg = colors[initial.charCodeAt(0) % colors.length];

                                                    const getStatusClass = (st) => {
                                                        const mapped = mapStatus(st);
                                                        if (mapped === 'new') return 'badge-muted';
                                                        if (mapped === 'selection') return 'badge-primary';
                                                        if (mapped === 'active') return 'badge-success';
                                                        if (mapped === 'refused') return 'badge-danger';
                                                        return 'badge-muted';
                                                    };

                                                    return (
                                                        <div 
                                                            key={client.id} 
                                                            className="card card-clickable fade-in" 
                                                            style={{ 
                                                                padding: '12px 16px', border: 'none', background: 'var(--surface)', borderRadius: 20, 
                                                                boxShadow: '0 4px 20px rgba(0,0,0,0.02)', position: 'relative', overflow: 'hidden',
                                                                borderLeft: `4px solid ${avatarBg}`,
                                                                display: 'flex', flexDirection: 'column', gap: 6
                                                            }} 
                                                            onClick={() => navigate(`/clients/${client.id}`)}
                                                        >
                                                            {/* Строка 1: ФИО и статус */}
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                                                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                                                                    {client.full_name}
                                                                </div>
                                                                <span className={`badge ${getStatusClass(client.status)}`} style={{ 
                                                                    padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 500, letterSpacing: '0.02em',
                                                                    whiteSpace: 'nowrap'
                                                                }}>
                                                                    {statusLabels[mapStatus(client.status)] || client.status}
                                                                </span>
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
                                                                                {typeLabels[t] || t}
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
        </div>
    );
}
