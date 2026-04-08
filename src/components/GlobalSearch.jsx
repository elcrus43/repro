import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Search, X, Building2, Users, Target, Sparkles } from 'lucide-react';

/**
 * Глобальный сквозной поиск по объектам, клиентам, запросам и совпадениям.
 * Встраивается в topbar страниц.
 */
export function GlobalSearch() {
    const { state } = useApp();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const results = useMemo(() => {
        if (!query.trim()) return { properties: [], clients: [], requests: [], matches: [] };
        const q = query.toLowerCase();

        return {
            properties: state.properties.filter(p =>
                p.address?.toLowerCase().includes(q) ||
                p.city?.toLowerCase().includes(q) ||
                p.price?.toString().includes(q)
            ).slice(0, 5),
            clients: state.clients.filter(c =>
                c.full_name?.toLowerCase().includes(q) ||
                c.phone?.includes(q) ||
                (c.phones || []).some(p => p.includes(q))
            ).slice(0, 5),
            requests: state.requests.filter(r =>
                r.districts?.some(d => d.toLowerCase().includes(q)) ||
                r.property_types?.some(t => t.toLowerCase().includes(q)) ||
                r.budget_max?.toString().includes(q)
            ).slice(0, 5),
            matches: state.matches.filter(m => m.score > 80).slice(0, 3),
        };
    }, [query, state.properties, state.clients, state.requests, state.matches]);

    const hasResults = results.properties.length + results.clients.length + results.requests.length + results.matches.length > 0;

    return (
        <div style={{ position: 'relative' }}>
            <button
                className="icon-btn"
                onClick={() => setIsOpen(!isOpen)}
                style={{ color: isOpen ? 'var(--primary)' : 'inherit' }}
            >
                {isOpen ? <X size={20} /> : <Search size={20} />}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    width: '320px',
                    maxHeight: '80vh',
                    background: 'var(--bg-card, #fff)',
                    border: '1px solid var(--border)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                        <input
                            autoFocus
                            className="form-input"
                            placeholder="Поиск по всему..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            style={{ fontSize: '14px' }}
                        />
                    </div>

                    <div style={{ overflow: 'auto', flex: 1 }}>
                        {query && !hasResults && (
                            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                Ничего не найдено
                            </div>
                        )}

                        {results.properties.length > 0 && (
                            <div>
                                <div style={{ padding: '8px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                    <Building2 size={12} style={{ display: 'inline', marginRight: 4 }} /> Объекты
                                </div>
                                {results.properties.map(p => (
                                    <div key={p.id} onClick={() => { navigate(`/properties/${p.id}`); setIsOpen(false); }} style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}>
                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{p.price?.toLocaleString()} ₽</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.address || p.city}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {results.clients.length > 0 && (
                            <div>
                                <div style={{ padding: '8px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                    <Users size={12} style={{ display: 'inline', marginRight: 4 }} /> Клиенты
                                </div>
                                {results.clients.map(c => (
                                    <div key={c.id} onClick={() => { navigate(`/clients/${c.id}`); setIsOpen(false); }} style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}>
                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{c.full_name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.phone}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {results.requests.length > 0 && (
                            <div>
                                <div style={{ padding: '8px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                    <Target size={12} style={{ display: 'inline', marginRight: 4 }} /> Запросы
                                </div>
                                {results.requests.map(r => (
                                    <div key={r.id} onClick={() => { navigate(`/requests/${r.id}`); setIsOpen(false); }} style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}>
                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{r.property_types?.map(t => t).join(', ')}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>До {r.budget_max?.toLocaleString()} ₽</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {results.matches.length > 0 && (
                            <div>
                                <div style={{ padding: '8px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                    <Sparkles size={12} style={{ display: 'inline', marginRight: 4 }} /> Совпадения
                                </div>
                                {results.matches.map(m => (
                                    <div key={m.id} onClick={() => { navigate(`/matches/${m.id}`); setIsOpen(false); }} style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)' }}>
                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>Совпадение {m.score}%</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.status === 'deal' ? 'Сделка' : m.status}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
