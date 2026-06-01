import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatNumber } from '../../utils/format';
import { Pencil, Trash, MapPin, ChevronLeft, ChevronRight, Search, Plus, Building2, Filter, Columns3, LayoutList, SlidersHorizontal, Check } from 'lucide-react';
import { usePagination } from '../../hooks/usePagination';
import { PROPERTY_TYPES } from '../../data/constants';
import { GlobalSearch } from '../../components/GlobalSearch';
import { PipelinePage } from './PipelinePage';
import { useExport } from '../../hooks/useExport';

export function ListPage() {
    const { state } = useApp();
    const navigate = useNavigate();
    const user = state.currentUser;
    const { exportToCSV } = useExport();
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [scope, setScope] = useState('all');
    const [viewMode, setViewMode] = useState('list');
    const [priceMin, setPriceMin] = useState('');
    const [priceMax, setPriceMax] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);

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
                // Support both legacy client_id and new client_ids array
                const allClientIds = [...(p.client_ids || []), ...(p.client_id ? [p.client_id] : [])];
                const clientName = allClientIds.map(cid => state.clients.find(c => c.id === cid)?.full_name || '').join(' ');
                return (p.address || '').toLowerCase().includes(search.toLowerCase()) ||
                    (p.city || '').toLowerCase().includes(search.toLowerCase()) ||
                    clientName.toLowerCase().includes(search.toLowerCase());
            })
            .filter(p => (!priceMin || p.price >= Number(priceMin)) && (!priceMax || p.price <= Number(priceMax)));
    }, [state.properties, scope, user?.id, filter, search, state.clients, priceMin, priceMax]);

    const { paginatedItems: properties, currentPage, totalPages, hasNext, hasPrev, nextPage, prevPage, resetPage } = usePagination(filteredProperties, 20);

    useEffect(() => { resetPage(); }, [filteredProperties, resetPage]);

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
                        <button
                            className="card-clickable font-oswald"
                            onClick={handleExport}
                            style={{
                                padding: '0 12px', height: 44, borderRadius: 14, border: 'none',
                                background: 'var(--bg-light)', color: 'var(--text-secondary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em'
                            }}
                        >
                            Экспорт CSV
                        </button>
                        <button
                            className="card-clickable"
                            onClick={() => setViewMode(m => m === 'list' ? 'pipeline' : 'list')}
                            style={{
                                width: 44, height: 44, borderRadius: 14, border: 'none',
                                background: 'var(--bg-light)',
                                color: viewMode === 'pipeline' ? 'var(--primary)' : 'var(--text-secondary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                            title={viewMode === 'list' ? 'Воронка продаж' : 'Список'}
                        >
                            {viewMode === 'list' ? <Columns3 size={20} /> : <LayoutList size={20} />}
                        </button>
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
                        background: 'var(--surface)', borderRadius: 20, padding: '6px 16px', 
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

                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                        {[
                            ['all', 'Все'], ['sale', 'Продажа'], ['rent', 'Аренда'], ['active', 'Активные']
                        ].map(([val, label]) => (
                            <button 
                                key={val} 
                                onClick={() => setFilter(val)} 
                                style={{ 
                                    whiteSpace: 'nowrap', padding: '8px 16px', border: 'none',
                                    background: 'transparent',
                                    color: filter === val ? 'var(--primary)' : 'var(--text-secondary)',
                                    fontSize: 12, fontWeight: filter === val ? 700 : 400, textTransform: 'uppercase', letterSpacing: '0.05em',
                                    fontFamily: "'Oswald', sans-serif"
                                }}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Price Range Filter */}
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
                </div>

                {/* PIPELINE VIEW */}
                {viewMode === 'pipeline' && <PipelinePage />}

                {/* LIST VIEW */}
                {viewMode === 'list' && properties.length === 0 && (
                    <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
                        <div style={{ width: 80, height: 80, borderRadius: 30, background: 'rgba(0,0,0,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <Building2 size={40} style={{ opacity: 0.2 }} />
                        </div>
                        <div className="font-oswald" style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>Нет объектов</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 24 }}>Начните наполнять свой портфель</div>
                        <button className="card-clickable" onClick={() => navigate('/properties/new')} style={{ padding: '12px 24px', borderRadius: 16, border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: 13 }}>Добавить объект</button>
                    </div>
                )}

                {viewMode === 'list' && <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {properties.map(prop => {
                        const status = prop.status || 'active';
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
                                    {/* Selection Checkbox only — status badge moved to content */}
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

                                {/* CONTENT WRAPPER */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div className="font-oswald" style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)', lineHeight: 1.1 }}>
                                        {formatNumber(prop.price)} <span style={{ fontSize: 13, opacity: 0.6 }}>₽</span>
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 400, color: 'var(--text)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
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
                                        <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(0,0,0,0.2)' }} />
                                        <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>{PROPERTY_TYPES[prop.property_type]}</span>
                                    </div>
                                    <div style={{ 
                                        fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, 
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4,
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 200, opacity: 0.8, minWidth: 0 }}>
                                            <MapPin size={12} style={{ marginTop: 1, flexShrink: 0, color: 'var(--primary)' }} />
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {prop.address || prop.city}
                                            </span>
                                        </div>
                                        <span style={{
                                            flexShrink: 0, fontSize: 10, fontWeight: 400,
                                            color: status === 'deal' ? '#16a34a' : status === 'deposit' ? '#059669' : status === 'advertising' ? '#7c3aed' : status === 'agreement' ? '#d97706' : '#2563eb',
                                            background: status === 'deal' ? 'rgba(22,163,74,0.08)' : status === 'deposit' ? 'rgba(5,150,105,0.08)' : status === 'advertising' ? 'rgba(124,58,237,0.08)' : status === 'agreement' ? 'rgba(217,119,6,0.08)' : 'rgba(37,99,235,0.08)',
                                            padding: '3px 8px', borderRadius: 20, border: '1px solid currentColor',
                                            borderColor: status === 'deal' ? 'rgba(22,163,74,0.2)' : status === 'deposit' ? 'rgba(5,150,105,0.2)' : status === 'advertising' ? 'rgba(124,58,237,0.2)' : status === 'agreement' ? 'rgba(217,119,6,0.2)' : 'rgba(37,99,235,0.2)',
                                        }}>
                                            {statusLabels[status] || status}
                                        </span>
                                    </div>
                                    

                                </div>
                            </div>
                        );
                    })}
                </div>}

                {/* PAGINATION — only in list mode */}
                {viewMode === 'list' && totalPages > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 32 }}>
                        <button
                            className="card-clickable"
                            onClick={prevPage}
                            disabled={!hasPrev}
                            style={{ 
                                padding: '10px 20px', borderRadius: 14, border: 'none', background: 'var(--surface)',
                                opacity: hasPrev ? 1 : 0.4, display: 'flex', alignItems: 'center', gap: 8,
                                fontWeight: 200, fontSize: 12, color: 'var(--text)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                            }}
                        >
                            <ChevronLeft size={16} /> НАЗАД
                        </button>
                        <span className="font-oswald" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            className="card-clickable"
                            onClick={nextPage}
                            disabled={!hasNext}
                            style={{ 
                                padding: '10px 20px', borderRadius: 14, border: 'none', background: 'var(--surface)',
                                opacity: hasNext ? 1 : 0.4, display: 'flex', alignItems: 'center', gap: 8,
                                fontWeight: 200, fontSize: 12, color: 'var(--text)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                            }}
                        >
                            ВПЕРЁД <ChevronRight size={16} />
                        </button>
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
