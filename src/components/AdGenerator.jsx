import React, { useState, useEffect, useCallback } from 'react';
import { X, Loader, Copy, RefreshCw, Check, Sparkles } from 'lucide-react';
import { generateAdFromAI } from '../utils/adGenerator';
import { useToastContext } from './Toast';

export function AdGenerator({ property, currentUser, onClose }) {
    const { toast } = useToastContext();
    const [status, setStatus] = useState('loading');
    const [includeContacts, setIncludeContacts] = useState(true);
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);
    
    const isMobile = window.innerWidth < 768;

    const handleGenerate = useCallback(async () => {
        setLoading(true);
        setError(null);
        setStatus('loading');
        try {
            const result = await generateAdFromAI(property, 'professional', includeContacts, currentUser, (s) => {
                setStatus(s);
            });
            setText(result);
        } catch (err) {
            console.error('[AdGenerator] Generation failed:', err);
            setError(err.message || 'Произошла непредвиденная ошибка при генерации.');
        } finally {
            setLoading(false);
        }
    }, [property, includeContacts, currentUser]);

    // Generate automatically on mount
    useEffect(() => {
        handleGenerate();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCopy = async () => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            toast.success('Объявление скопировано в буфер обмена!');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('[AdGenerator] Copy failed:', err);
            toast.error('Не удалось скопировать текст.');
        }
    };

    const activeColor = 'var(--primary)';

    return (
        <div style={{ 
            position: 'fixed', 
            inset: 0, 
            zIndex: 9999, 
            background: 'var(--modal-bg)', 
            backdropFilter: 'blur(20px) saturate(180%)', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: isMobile ? 12 : 20, 
            color: 'var(--text)' 
        }}>
            
            {/* Close Button */}
            <button 
                onClick={onClose} 
                style={{ 
                    position: 'absolute', 
                    top: isMobile ? 16 : 24, 
                    right: isMobile ? 16 : 24, 
                    width: 44, 
                    height: 44, 
                    borderRadius: 14, 
                    border: 'none', 
                    background: 'var(--border-light)', 
                    color: 'var(--text)', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    transition: 'all 0.15s',
                    zIndex: 10002
                }}
            >
                <X size={22} />
            </button>

            {/* Modal Box */}
            <div style={{ 
                display: 'flex', 
                flexDirection: isMobile ? 'column' : 'row', 
                gap: 20, 
                width: '100%', 
                maxWidth: 1000, 
                height: isMobile ? 'calc(100vh - 80px)' : '80vh', 
                maxHeight: 700,
                alignItems: 'stretch',
                marginTop: isMobile ? 40 : 0
            }}>

                {/* Left Panel: Settings */}
                <div style={{ 
                    flex: isMobile ? 'none' : '0 0 280px', 
                    width: isMobile ? '100%' : 'auto', 
                    background: 'var(--surface)', 
                    border: '1px solid var(--border)', 
                    borderRadius: 24, 
                    padding: 20, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 20, 
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08)' 
                }}>
                    <div style={{ 
                        fontFamily: 'Oswald, sans-serif', 
                        fontSize: 12, 
                        fontWeight: 300, 
                        letterSpacing: '0.14em', 
                        color: 'var(--text-muted)', 
                        textTransform: 'uppercase',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                    }}>
                        <Sparkles size={14} style={{ color: activeColor }} /> Генератор объявления
                    </div>

                    {/* Style Indicator */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.05em', fontWeight: 500 }}>СТИЛЬ И ФОРМАТ</div>
                        <div style={{
                            padding: '12px 14px',
                            borderRadius: 12,
                            background: 'rgba(0, 82, 255, 0.04)',
                            border: '1px dashed var(--border)',
                            color: 'var(--text)',
                            fontSize: 13,
                            lineHeight: 1.4
                        }}>
                            Деловой краткий стиль. Текст разбит по блокам: О доме, О квартире, Инфраструктура, Документы, Особенности. Без звездочек и смайликов.
                        </div>
                    </div>

                    {/* Checkbox Contacts */}
                    {currentUser && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}>
                                <input
                                    type="checkbox"
                                    checked={includeContacts}
                                    onChange={(e) => setIncludeContacts(e.target.checked)}
                                    style={{
                                        width: 18,
                                        height: 18,
                                        accentColor: activeColor,
                                        cursor: 'pointer'
                                    }}
                                />
                                Контакты риелтора
                            </label>
                        </div>
                    )}

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        style={{
                            marginTop: 'auto',
                            height: 48,
                            borderRadius: 14,
                            background: activeColor,
                            color: '#ffffff',
                            fontFamily: 'Oswald, sans-serif',
                            fontSize: 15,
                            fontWeight: 400,
                            letterSpacing: '0.02em',
                            border: 'none',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            boxShadow: '0 4px 14px rgba(0, 82, 255, 0.25)',
                            transition: 'all 0.15s',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? (
                            <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                            <RefreshCw size={16} />
                        )}
                        {loading ? 'Генерация...' : 'Перегенерировать'}
                    </button>
                </div>

                {/* Right Panel: Result */}
                <div style={{ 
                    flex: 1, 
                    background: 'var(--surface)', 
                    border: '1px solid var(--border)', 
                    borderRadius: 24, 
                    padding: 24, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 16, 
                    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
                    minWidth: 0
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontFamily: 'Oswald, sans-serif', fontSize: 14, fontWeight: 300, color: 'var(--text)' }}>
                            Результат генерации
                        </div>
                        {text && !loading && !error && (
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                Можно редактировать перед копированием
                            </span>
                        )}
                    </div>

                    <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                        {loading ? (
                            <div style={{ 
                                position: 'absolute', 
                                inset: 0, 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                gap: 12,
                                background: 'rgba(255, 255, 255, 0.02)',
                                borderRadius: 16
                            }}>
                                <Loader size={32} style={{ animation: 'spin 1s linear infinite', color: activeColor }} />
                                <div style={{ fontSize: 14, color: 'var(--text-muted)', fontFamily: 'Oswald, sans-serif', textAlign: 'center', padding: '0 20px', lineHeight: 1.4 }}>
                                    {status === 'parsing' 
                                        ? 'Сбор технических характеристик дома с МинЖКХ...' 
                                        : 'ИИ составляет описание объекта...'}
                                </div>
                            </div>
                        ) : error ? (
                            <div style={{ 
                                position: 'absolute', 
                                inset: 0, 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                gap: 16,
                                padding: 20,
                                textAlign: 'center'
                            }}>
                                <div style={{ color: '#ef4444', fontSize: 15, fontWeight: 500 }}>
                                    Ошибка: {error}
                                </div>
                                <button
                                    onClick={handleGenerate}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: 12,
                                        background: 'var(--border-light)',
                                        border: 'none',
                                        color: 'var(--text)',
                                        cursor: 'pointer',
                                        fontWeight: 500,
                                        fontSize: 14
                                    }}
                                >
                                    Попробовать снова
                                </button>
                            </div>
                        ) : (
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Текст объявления появится здесь..."
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    background: 'var(--bg-light)',
                                    border: '1.5px solid var(--border-light)',
                                    borderRadius: 16,
                                    padding: '16px 20px',
                                    color: 'var(--text)',
                                    fontFamily: 'inherit',
                                    fontSize: 14,
                                    lineHeight: 1.6,
                                    resize: 'none',
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                    transition: 'border-color 0.15s'
                                }}
                            />
                        )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 12, marginTop: 'auto' }}>
                        <button
                            onClick={handleCopy}
                            disabled={!text || loading || error}
                            style={{
                                flex: 1,
                                height: 48,
                                borderRadius: 14,
                                background: copied ? '#10b981' : activeColor,
                                color: '#ffffff',
                                fontFamily: 'Oswald, sans-serif',
                                fontSize: 15,
                                fontWeight: 400,
                                border: 'none',
                                cursor: (!text || loading || error) ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 8,
                                transition: 'all 0.2s',
                                opacity: (!text || loading || error) ? 0.5 : 1
                            }}
                        >
                            {copied ? <Check size={18} /> : <Copy size={16} />}
                            {copied ? 'Скопировано!' : 'Скопировать текст'}
                        </button>
                    </div>
                </div>
            </div>
            
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
