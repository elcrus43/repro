import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Search, X, Building2, Users, Target, Sparkles, FileCheck, ArrowRight } from 'lucide-react';
import { PROPERTY_TYPES } from '../data/constants';
import { hasPassedDealStage, isDealTypeCompatible } from '../utils/matching';
import { formatNumber, formatPhone, stripPhone } from '../utils/format';

/**
 * Поле сквозного поиска по объектам, клиентам, запросам, сделкам и совпадениям.
 * Располагается в шапке каждой вкладки.
 */
export function GlobalSearch({ placeholder = 'Сквозной поиск...', style = {} }) {
    const { state } = useApp();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Закрытие при клике снаружи
    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Закрытие по Escape
    useEffect(() => {
        function handleKeyDown(e) {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const results = useMemo(() => {
        if (!query.trim()) return { properties: [], clients: [], requests: [], deals: [], matches: [] };
        const q = query.toLowerCase().trim();

        return {
            properties: (state.properties || []).filter(p =>
                p.address?.toLowerCase().includes(q) ||
                p.city?.toLowerCase().includes(q) ||
                p.complex_name?.toLowerCase().includes(q) ||
                p.price?.toString().includes(q)
            ).slice(0, 5),
            clients: (state.clients || []).filter(c => {
                const cleanQ = q.replace(/\D/g, '');
                const clientPhones = [c.phone, ...(c.phones || [])].filter(Boolean);
                return c.full_name?.toLowerCase().includes(q) ||
                    clientPhones.some(p => p.includes(q) || formatPhone(p).includes(q) || (cleanQ.length >= 3 && stripPhone(p).includes(cleanQ)));
            }).slice(0, 5),
            deals: (state.deals || []).filter(d =>
                d.title?.toLowerCase().includes(q) ||
                d.notes?.toLowerCase().includes(q) ||
                d.commission?.toString().includes(q)
            ).slice(0, 4),
            requests: (state.requests || []).filter(r =>
                r.districts?.some(d => d.toLowerCase().includes(q)) ||
                r.property_types?.some(t => (PROPERTY_TYPES[t] || t).toLowerCase().includes(q)) ||
                r.budget_max?.toString().includes(q)
            ).slice(0, 4),
            matches: (state.matches || []).filter(m => {
                const prop = state.properties?.find(p => p.id === m.property_id);
                if (!prop || hasPassedDealStage(prop, state.deals)) return false;
                const req = state.requests?.find(r => r.id === m.request_id);
                if (!req || req.status !== 'active') return false;
                if (!isDealTypeCompatible(prop, req)) return false;
                const client = state.clients?.find(c => c.id === m.client_id || c.id === req.client_id);
                const text = `${prop?.address || ''} ${prop?.city || ''} ${client?.full_name || ''} ${m.status || ''}`.toLowerCase();
                return text.includes(q) && m.score > 70;
            }).slice(0, 3),
        };
    }, [query, state.properties, state.clients, state.requests, state.deals, state.matches]);

    const totalCount = results.properties.length + results.clients.length + results.deals.length + results.requests.length + results.matches.length;
    const hasResults = totalCount > 0;

    const handleSelect = (url) => {
        setIsOpen(false);
        navigate(url);
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', flex: '1 1 auto', maxWidth: 360, minWidth: 140, ...style }}>
            {/* Поле ввода поиска */}
            <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                background: 'var(--bg-light, rgba(0,0,0,0.03))',
                borderRadius: 12,
                border: isOpen ? '1px solid var(--primary)' : '1px solid var(--border-light, rgba(0,0,0,0.08))',
                transition: 'all 0.2s ease',
                boxShadow: isOpen ? '0 0 0 3px rgba(0, 82, 255, 0.12)' : 'none'
            }}>
                <Search size={16} color={isOpen ? 'var(--primary)' : 'var(--text-muted)'} style={{ position: 'absolute', left: 12, pointerEvents: 'none', transition: 'color 0.2s', flexShrink: 0 }} />
                <input
                    type="text"
                    value={query}
                    onChange={e => {
                        setQuery(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    style={{
                        width: '100%',
                        height: 38,
                        padding: '0 30px 0 36px',
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontSize: 13,
                        color: 'var(--text)',
                        borderRadius: 12
                    }}
                />
                {query && (
                    <button
                        type="button"
                        onClick={() => {
                            setQuery('');
                        }}
                        style={{
                            position: 'absolute',
                            right: 8,
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: 'rgba(0,0,0,0.06)',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            color: 'var(--text-muted)'
                        }}
                    >
                        <X size={12} />
                    </button>
                )}
            </div>

            {/* Выпадающие результаты поиска */}
            {isOpen && query.trim().length > 0 && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    minWidth: 320,
                    width: '100%',
                    maxWidth: 440,
                    maxHeight: '440px',
                    background: 'var(--surface, #ffffff)',
                    border: '1px solid var(--border-light, #e2e8f0)',
                    borderRadius: 16,
                    boxShadow: '0 16px 40px rgba(0,0,0,0.14)',
                    zIndex: 2500,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'fadeIn 0.15s ease'
                }}>
                    {!hasResults ? (
                        <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                            Ничего не найдено по запросу «{query}»
                        </div>
                    ) : (
                        <div style={{ padding: '6px 0' }}>
                            {/* Объекты */}
                            {results.properties.length > 0 && (
                                <div>
                                    <div style={{ padding: '6px 14px', fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Building2 size={13} /> Объекты ({results.properties.length})
                                    </div>
                                    {results.properties.map(p => (
                                        <div
                                            key={p.id}
                                            onClick={() => handleSelect(`/properties/${p.id}`)}
                                            className="card-clickable"
                                            style={{ padding: '8px 14px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                        >
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {p.address || p.city || 'Объект'}
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                    {p.rooms ? `${p.rooms}-комн., ` : ''}{p.area_total ? `${p.area_total} м², ` : ''}{p.price ? `${formatNumber(p.price)} ₽` : ''}
                                                </div>
                                            </div>
                                            <ArrowRight size={13} color="var(--text-muted)" style={{ flexShrink: 0, marginLeft: 8 }} />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Клиенты */}
                            {results.clients.length > 0 && (
                                <div style={{ marginTop: 4 }}>
                                    <div style={{ padding: '6px 14px', fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Users size={13} /> Клиенты ({results.clients.length})
                                    </div>
                                    {results.clients.map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => handleSelect(`/clients/${c.id}`)}
                                            className="card-clickable"
                                            style={{ padding: '8px 14px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                        >
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {c.full_name}
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                    {formatPhone(c.phone || (c.phones && c.phones[0])) || 'Телефон не указан'}
                                                </div>
                                            </div>
                                            <ArrowRight size={13} color="var(--text-muted)" style={{ flexShrink: 0, marginLeft: 8 }} />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Сделки */}
                            {results.deals.length > 0 && (
                                <div style={{ marginTop: 4 }}>
                                    <div style={{ padding: '6px 14px', fontSize: 11, fontWeight: 700, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <FileCheck size={13} /> Сделки ({results.deals.length})
                                    </div>
                                    {results.deals.map(d => (
                                        <div
                                            key={d.id}
                                            onClick={() => handleSelect(`/tasks`)}
                                            className="card-clickable"
                                            style={{ padding: '8px 14px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                        >
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {d.title || 'Сделка'}
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                    {d.commission ? `Комиссия: ${formatNumber(d.commission)} ₽` : d.stage || 'В работе'}
                                                </div>
                                            </div>
                                            <ArrowRight size={13} color="var(--text-muted)" style={{ flexShrink: 0, marginLeft: 8 }} />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Запросы */}
                            {results.requests.length > 0 && (
                                <div style={{ marginTop: 4 }}>
                                    <div style={{ padding: '6px 14px', fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Target size={13} /> Запросы ({results.requests.length})
                                    </div>
                                    {results.requests.map(r => (
                                        <div
                                            key={r.id}
                                            onClick={() => handleSelect(`/requests/${r.id}`)}
                                            className="card-clickable"
                                            style={{ padding: '8px 14px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                        >
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {r.property_types?.map(t => PROPERTY_TYPES[t] || t).join(', ') || 'Запрос'}
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                    {r.budget_max ? `До ${formatNumber(r.budget_max)} ₽` : r.districts?.join(', ') || ''}
                                                </div>
                                            </div>
                                            <ArrowRight size={13} color="var(--text-muted)" style={{ flexShrink: 0, marginLeft: 8 }} />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Совпадения */}
                            {results.matches.length > 0 && (
                                <div style={{ marginTop: 4 }}>
                                    <div style={{ padding: '6px 14px', fontSize: 11, fontWeight: 700, color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Sparkles size={13} /> Совпадения ({results.matches.length})
                                    </div>
                                    {results.matches.map(m => (
                                        <div
                                            key={m.id}
                                            onClick={() => handleSelect(`/matches/${m.id}`)}
                                            className="card-clickable"
                                            style={{ padding: '8px 14px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                        >
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>
                                                    Совпадение {m.score}%
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                    {m.status === 'deal' ? 'Сделка' : m.status || 'Активно'}
                                                </div>
                                            </div>
                                            <ArrowRight size={13} color="var(--text-muted)" style={{ flexShrink: 0, marginLeft: 8 }} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
