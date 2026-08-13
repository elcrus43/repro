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
                const types = Array.isArray(c.client_types) ? c.client_types : (c.client_type ? [c.client_type] : []);
                const isAgent = types.includes('agent');
                const isLawyer = types.includes('lawyer');

                if (filter === 'agent') return isAgent;
                if (filter === 'lawyer') return isLawyer;
                if (filter !== 'all' && isAgent) return false;

                if (filter === 'buyer') return types.includes('buyer');
                if (filter === 'seller') return types.includes('seller');
                if (filter === 'developer') return types.includes('developer');
                if (filter === 'landlord') return types.includes('landlord');
                if (filter === 'tenant') return types.includes('tenant');
                return true;
            })
            .filter(c => {
                const phones = c.phones || [c.phone];
                return !search || c.full_name?.toLowerCase().includes(search.toLowerCase()) || phones.some(p => p?.includes(search));
            })
            .sort((a, b) => {
                if (filter === 'agent') {
                    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                }
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

    const typeLabels = { buyer: 'Покупатель', seller: 'Продавец', developer: 'Застройщик', agent: 'Агент', landlord: 'Арендодатель', tenant: 'Арендатор', lawyer: 'Юрист' };

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
                            ['all', 'Все'], ['buyer', 'Покупатели'], ['seller', 'Продавцы'], ['developer', 'Застройщики'], ['agent', 'Агенты'], ['lawyer', 'Юристы']
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {filteredClients.map(client => {
                            const initial = client.full_name?.charAt(0).toUpperCase() || '?';
                            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
                            const avatarBg = colors[initial.charCodeAt(0) % colors.length];

                            return (
                                <div 
                                    key={client.id} 
                                    className="card card-clickable fade-in" 
                                    style={{ 
                                        padding: '10px 16px', 
                                        border: '1px solid var(--border-light, rgba(0,0,0,0.06))', 
                                        background: 'var(--surface)', 
                                        borderRadius: 14, 
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between',
                                        gap: 12,
                                        cursor: 'pointer'
                                    }} 
                                    onClick={() => navigate(`/clients/${client.id}`)}
                                >
                                    {/* Left: Avatar, Name & Phone in 1 Line */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                                        <div style={{ 
                                            width: 32, 
                                            height: 32, 
                                            borderRadius: '50%', 
                                            background: avatarBg, 
                                            color: '#fff', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            fontWeight: 600, 
                                            fontSize: 13,
                                            flexShrink: 0 
                                        }}>
                                            {initial}
                                        </div>
                                        <div style={{ 
                                            fontWeight: 600, 
                                            fontSize: 14, 
                                            color: 'var(--text)', 
                                            whiteSpace: 'nowrap', 
                                            overflow: 'hidden', 
                                            textOverflow: 'ellipsis' 
                                        }}>
                                            {client.full_name}
                                        </div>
                                        {client.phone && (
                                            <div style={{ 
                                                fontSize: 13, 
                                                color: 'var(--text-secondary)', 
                                                fontWeight: 400, 
                                                whiteSpace: 'nowrap',
                                                flexShrink: 0
                                            }}>
                                                {formatPhone(client.phone)}
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Role Badges */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                        {client.client_types?.map(t => {
                                            const isAgent = t === 'agent';
                                            return (
                                                <span key={t} style={{ 
                                                    fontSize: 11, 
                                                    color: isAgent ? '#059669' : 'var(--text-secondary)', 
                                                    fontWeight: isAgent ? 600 : 400, 
                                                    background: isAgent ? '#ecfdf5' : 'var(--bg-light)', 
                                                    border: isAgent ? '1px solid #10b981' : '1px solid transparent',
                                                    padding: '3px 8px', 
                                                    borderRadius: 6,
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {typeLabels[t] || t}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
