import React, { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';

/**
 * Выпадающий список с поиском.
 * 
 * @param {string} value - текущее выбранное значение (id)
 * @param {function} onChange - callback при выборе
 * @param {string} placeholder - текст плейсхолдера
 * @param {string} searchPlaceholder - текст поиска
 * @param {Array<{id, label}>} options - варианты
 * @param {string} emptyLabel - метка пустого значения
 */
export function SearchableSelect({ value, onChange, placeholder = 'Выберите...', searchPlaceholder = 'Поиск...', options = [], emptyLabel = '—' }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const ref = useRef(null);

    const filtered = options.filter(o =>
        o.label.toLowerCase().includes(search.toLowerCase())
    );

    const selected = options.find(o => o.id === value);

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

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <div
                className="form-input"
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px' }}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span style={{ color: selected ? 'var(--text)' : 'var(--text-muted)' }}>
                    {selected ? selected.label : placeholder}
                </span>
                <ChevronDown size={16} color="var(--text-muted)" />
            </div>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'var(--bg-card, #fff)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    zIndex: 1000,
                    maxHeight: '240px',
                    display: 'flex',
                    flexDirection: 'column',
                }}>
                    {/* Search */}
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Search size={16} color="var(--text-muted)" />
                        <input
                            autoFocus
                            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '14px' }}
                            placeholder={searchPlaceholder}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onClick={e => e.stopPropagation()}
                        />
                        {search && (
                            <button type="button" onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={14} color="var(--text-muted)" />
                            </button>
                        )}
                    </div>

                    {/* Options */}
                    <div style={{ overflow: 'auto', flex: 1 }}>
                        {filtered.length === 0 && (
                            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                Не найдено
                            </div>
                        )}
                        {filtered.map(o => (
                            <div
                                key={o.id}
                                onClick={() => { onChange(o.id); setIsOpen(false); }}
                                style={{
                                    padding: '10px 12px',
                                    cursor: 'pointer',
                                    background: value === o.id ? 'var(--primary-light)' : 'transparent',
                                    fontWeight: value === o.id ? 600 : 400,
                                    fontSize: '14px',
                                }}
                            >
                                {o.label}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
