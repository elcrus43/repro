import React, { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';

/**
 * MultiClientSelector component for selecting multiple clients.
 * 
 * @param {string[]} selectedIds - List of selected client IDs
 * @param {function} onChange - Callback with new list of selected IDs
 * @param {Object[]} clients - List of all available clients
 * @param {string} placeholder - Placeholder text
 */
export function MultiClientSelector({ selectedIds = [], onChange, clients = [], placeholder = 'Выберите клиентов...' }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef(null);

    const filtered = clients.filter(c =>
        c.full_name.toLowerCase().includes(search.toLowerCase()) ||
        (c.phone && c.phone.includes(search))
    );

    const selectedClients = clients.filter(c => selectedIds.includes(c.id));

    useEffect(() => {
        if (!isOpen) setSearch('');
    }, [isOpen]);

    useEffect(() => {
        function handleClickOutside(e) {
            if (ref.current && !ref.current.contains(e.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggle = (id) => {
        const next = selectedIds.includes(id)
            ? selectedIds.filter(x => x !== id)
            : [...selectedIds, id];
        onChange(next);
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <div
                className="form-input"
                style={{ 
                    cursor: 'pointer', 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 6, 
                    minHeight: '44px', 
                    padding: '8px 12px',
                    alignItems: 'center'
                }}
                onClick={() => setIsOpen(!isOpen)}
            >
                {selectedClients.length > 0 ? (
                    selectedClients.map(c => (
                        <span key={c.id} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: 'var(--primary-light)', color: 'var(--primary)',
                            padding: '4px 8px', borderRadius: 6, fontSize: 13, fontWeight: 600
                        }}>
                            {c.full_name}
                            <X size={14} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); toggle(c.id); }} />
                        </span>
                    ))
                ) : (
                    <span style={{ color: 'var(--text-muted)' }}>{placeholder}</span>
                )}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                    <ChevronDown size={16} color="var(--text-muted)" />
                </div>
            </div>

            {isOpen && (
                <div className="card shadow-lg" style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    zIndex: 1000, maxHeight: 300, display: 'flex', flexDirection: 'column',
                    marginTop: 4, padding: 0, overflow: 'hidden',
                    background: 'var(--bg-card, white)',
                    border: '1px solid var(--border-light)'
                }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Search size={16} color="var(--text-muted)" />
                        <input
                            autoFocus
                            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--text)' }}
                            placeholder="Поиск клиента..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onClick={e => e.stopPropagation()}
                        />
                    </div>
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {filtered.length === 0 && (
                            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                                Клиенты не найдены
                            </div>
                        )}
                        {filtered.map(c => {
                            const isSelected = selectedIds.includes(c.id);
                            return (
                                <div
                                    key={c.id}
                                    onClick={(e) => { e.stopPropagation(); toggle(c.id); }}
                                    style={{
                                        padding: '10px 12px', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        background: isSelected ? 'var(--primary-light)' : 'transparent',
                                        borderBottom: '1px solid var(--border-light)'
                                    }}
                                >
                                    <div style={{
                                        width: 18, height: 18, borderRadius: 4,
                                        border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: isSelected ? 'var(--primary)' : 'transparent'
                                    }}>
                                        {isSelected && <Check size={12} color="white" />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 14, fontWeight: isSelected ? 600 : 400, color: 'var(--text)' }}>{c.full_name}</div>
                                        {c.phone && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.phone}</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
