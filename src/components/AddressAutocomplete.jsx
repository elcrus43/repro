import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, X, Loader } from 'lucide-react';

const DADATA_TOKEN = import.meta.env.VITE_DADATA_TOKEN;
const DADATA_URL = 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address';

/**
 * Поле ввода адреса с автодополнением через DaData (КЛАДР/ФИАС).
 *
 * Props:
 *   value        — текущее строковое значение адреса
 *   onChange     — (addressString) => void — вызывается при изменении текста
 *   onSelect     — (suggestion) => void    — вызывается при выборе из списка (содержит data.*)
 *   city         — ограничить поиск по городу (напр. 'Киров')
 *   placeholder  — placeholder для input
 *   disabled     — boolean
 */
export function AddressAutocomplete({
    value,
    onChange,
    onSelect,
    city,
    placeholder = 'Начните вводить адрес...',
    disabled = false,
}) {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [highlightIdx, setHighlightIdx] = useState(-1);
    const debounceRef = useRef(null);
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Закрываем дропдаун при клике вне компонента
    useEffect(() => {
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchSuggestions = useCallback(async (query) => {
        if (!query || query.length < 3) {
            setSuggestions([]);
            setOpen(false);
            return;
        }

        if (!DADATA_TOKEN) {
            console.warn('[AddressAutocomplete] VITE_DADATA_TOKEN не задан');
            return;
        }

        setLoading(true);
        try {
            const body = {
                query,
                count: 7,
                // Ограничиваем поиск по городу, если передан
                ...(city ? {
                    locations: [{ city }],
                    locations_boost: [{ city }],
                } : {}),
            };

            const res = await fetch(DADATA_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Token ${DADATA_TOKEN}`,
                },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error(`DaData error: ${res.status}`);
            const json = await res.json();
            setSuggestions(json.suggestions || []);
            setOpen((json.suggestions || []).length > 0);
        } catch (err) {
            console.error('[AddressAutocomplete]', err);
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    }, [city]);

    function handleInputChange(e) {
        const val = e.target.value;
        onChange(val);
        setHighlightIdx(-1);

        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
    }

    function handleSelect(suggestion) {
        onChange(suggestion.value);
        setSuggestions([]);
        setOpen(false);
        if (onSelect) onSelect(suggestion);
        inputRef.current?.focus();
    }

    function handleKeyDown(e) {
        if (!open) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIdx(i => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIdx(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && highlightIdx >= 0) {
            e.preventDefault();
            handleSelect(suggestions[highlightIdx]);
        } else if (e.key === 'Escape') {
            setOpen(false);
        }
    }

    function handleClear() {
        onChange('');
        setSuggestions([]);
        setOpen(false);
        inputRef.current?.focus();
    }

    // Форматируем подсказку: выделяем уже введённую часть
    function formatSuggestion(suggestion) {
        const d = suggestion.data;
        // Формируем читаемую строку: улица + дом
        const street = d.street_with_type || '';
        const house = d.house ? `д ${d.house}` : '';
        const block = d.block ? `корп ${d.block}` : '';
        const flat = d.flat ? `кв ${d.flat}` : '';

        const main = [street, house, block, flat].filter(Boolean).join(', ') || suggestion.value;
        const secondary = d.city_with_type || d.region_with_type || '';

        return { main, secondary };
    }

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            <div style={{ position: 'relative' }}>
                <div style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)', pointerEvents: 'none', display: 'flex',
                }}>
                    {loading
                        ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                        : <MapPin size={16} />
                    }
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    className="form-input"
                    value={value}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => suggestions.length > 0 && setOpen(true)}
                    placeholder={placeholder}
                    disabled={disabled}
                    autoComplete="off"
                    style={{
                        paddingLeft: 38,
                        paddingRight: value ? 36 : 12,
                        borderRadius: 14,
                        borderBottomLeftRadius: open ? 0 : 14,
                        borderBottomRightRadius: open ? 0 : 14,
                        transition: 'border-radius 0.1s',
                    }}
                />
                {value && !disabled && (
                    <button
                        type="button"
                        onClick={handleClear}
                        style={{
                            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                            background: 'none', border: 'none', cursor: 'pointer', padding: 2,
                            color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                        }}
                        tabIndex={-1}
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {open && suggestions.length > 0 && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                    background: 'white', border: '1.5px solid var(--border)',
                    borderTop: 'none', borderRadius: '0 0 14px 14px',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                    overflow: 'hidden',
                    maxHeight: 320,
                    overflowY: 'auto',
                }}>
                    {suggestions.map((s, i) => {
                        const { main, secondary } = formatSuggestion(s);
                        const isHighlighted = i === highlightIdx;
                        return (
                            <button
                                key={i}
                                type="button"
                                onMouseDown={() => handleSelect(s)}
                                onMouseEnter={() => setHighlightIdx(i)}
                                style={{
                                    width: '100%', textAlign: 'left', border: 'none',
                                    padding: '11px 14px', cursor: 'pointer', fontFamily: 'inherit',
                                    background: isHighlighted ? 'var(--primary-light, #eff6ff)' : 'transparent',
                                    display: 'flex', flexDirection: 'column', gap: 2,
                                    transition: 'background 0.1s',
                                    borderBottom: i < suggestions.length - 1 ? '1px solid var(--border-light, #f1f5f9)' : 'none',
                                }}
                            >
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {main}
                                </span>
                                {secondary && (
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        {secondary}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                    <div style={{
                        padding: '6px 14px',
                        fontSize: 10, color: '#94a3b8',
                        borderTop: '1px solid var(--border-light, #f1f5f9)',
                        textAlign: 'right',
                    }}>
                        данные: КЛАДР / ФИАС
                    </div>
                </div>
            )}

            {!DADATA_TOKEN && (
                <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>
                    ⚠ Задайте VITE_DADATA_TOKEN в .env для подсказок адресов
                </div>
            )}
        </div>
    );
}
