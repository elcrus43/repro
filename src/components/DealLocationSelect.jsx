import React, { useState, useEffect } from 'react';
import { Plus, Check, X } from 'lucide-react';

export const DEFAULT_DEAL_LOCATIONS = [
    'Сбер (Всесвятская 25)',
    'Офис (Ленина 89)'
];

const STORAGE_KEY = 'deal_saved_locations';

export function getSavedDealLocations() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                const merged = [...DEFAULT_DEAL_LOCATIONS];
                parsed.forEach(item => {
                    if (item && typeof item === 'string' && !merged.includes(item.trim())) {
                        merged.push(item.trim());
                    }
                });
                return merged;
            }
        }
    } catch (e) {
        console.error('Failed to load deal locations from localStorage', e);
    }
    return [...DEFAULT_DEAL_LOCATIONS];
}

export function saveDealLocation(newLocation) {
    if (!newLocation || typeof newLocation !== 'string') return getSavedDealLocations();
    const trimmed = newLocation.trim();
    if (!trimmed) return getSavedDealLocations();

    try {
        const current = getSavedDealLocations();
        if (!current.includes(trimmed)) {
            const updated = [...current, trimmed];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            return updated;
        }
        return current;
    } catch (e) {
        console.error('Failed to save deal location to localStorage', e);
        return getSavedDealLocations();
    }
}

export function DealLocationSelect({
    value = '',
    onChange,
    placeholder = '-- Выберите место сделки --',
    inputStyle = {},
    style = {}
}) {
    const [locations, setLocations] = useState(() => getSavedDealLocations());
    const [isAdding, setIsAdding] = useState(false);
    const [customLoc, setCustomLoc] = useState('');

    // Ensure value is selectable even if it's a legacy or external location
    useEffect(() => {
        if (value && typeof value === 'string' && !locations.includes(value.trim())) {
            setLocations(prev => prev.includes(value.trim()) ? prev : [...prev, value.trim()]);
        }
    }, [value, locations]);

    const handleConfirmAdd = () => {
        const trimmed = customLoc.trim();
        if (!trimmed) {
            setIsAdding(false);
            return;
        }
        const updated = saveDealLocation(trimmed);
        setLocations(updated);
        if (onChange) onChange(trimmed);
        setCustomLoc('');
        setIsAdding(false);
    };

    if (isAdding) {
        return (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%', ...style }}>
                <input
                    type="text"
                    autoFocus
                    placeholder="Введите место (напр. ВТБ, Советская 10)..."
                    className="form-input"
                    style={{
                        height: inputStyle.height || 44,
                        borderRadius: inputStyle.borderRadius || 12,
                        background: inputStyle.background || 'var(--bg-light)',
                        border: inputStyle.border || '1px solid var(--primary)',
                        fontWeight: inputStyle.fontWeight || 400,
                        fontSize: inputStyle.fontSize || 13,
                        padding: '0 10px',
                        flex: 1
                    }}
                    value={customLoc}
                    onChange={e => setCustomLoc(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            handleConfirmAdd();
                        } else if (e.key === 'Escape') {
                            setIsAdding(false);
                            setCustomLoc('');
                        }
                    }}
                />
                <button
                    type="button"
                    onClick={handleConfirmAdd}
                    title="Сохранить место"
                    style={{
                        height: inputStyle.height || 44,
                        padding: '0 12px',
                        borderRadius: inputStyle.borderRadius || 10,
                        background: 'var(--primary)',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        flexShrink: 0
                    }}
                >
                    <Check size={14} /> OK
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setIsAdding(false);
                        setCustomLoc('');
                    }}
                    title="Отмена"
                    style={{
                        height: inputStyle.height || 44,
                        width: inputStyle.height || 44,
                        borderRadius: inputStyle.borderRadius || 10,
                        background: 'var(--bg-light)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border-light, rgba(0,0,0,0.1))',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}
                >
                    <X size={14} />
                </button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%', ...style }}>
            <select
                className="form-input"
                style={{
                    height: inputStyle.height || 44,
                    borderRadius: inputStyle.borderRadius || 12,
                    background: inputStyle.background || 'var(--bg-light)',
                    border: inputStyle.border || 'none',
                    fontWeight: inputStyle.fontWeight || 300,
                    fontSize: inputStyle.fontSize || 13,
                    padding: '0 10px',
                    flex: 1,
                    color: value ? 'var(--text)' : 'var(--text-muted)',
                    cursor: 'pointer'
                }}
                value={value || ''}
                onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__add_new__') {
                        setIsAdding(true);
                    } else if (onChange) {
                        onChange(val);
                    }
                }}
            >
                <option value="">{placeholder}</option>
                {locations.map(loc => (
                    <option key={loc} value={loc} style={{ color: 'var(--text)' }}>
                        {loc}
                    </option>
                ))}
                <option value="__add_new__" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                    + Добавить...
                </option>
            </select>

            <button
                type="button"
                onClick={() => setIsAdding(true)}
                title="Добавить место проведения сделки"
                style={{
                    height: inputStyle.height || 44,
                    padding: '0 10px',
                    borderRadius: inputStyle.borderRadius || 10,
                    background: 'rgba(0, 82, 255, 0.08)',
                    color: 'var(--primary)',
                    border: '1px solid rgba(0, 82, 255, 0.2)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    flexShrink: 0
                }}
            >
                <Plus size={14} />
                <span className="hide-mobile">Добавить</span>
            </button>
        </div>
    );
}
