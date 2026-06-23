import React, { useState, useEffect } from 'react';
import { X, Loader, ExternalLink, ShieldCheck, HelpCircle, ArrowRight, TrendingUp, AlertTriangle } from 'lucide-react';
import { API_BASE } from '../config';
import { useToastContext } from './Toast';

export function CmaReport({ property, onClose, onApplyPrice }) {
    const { toast } = useToastContext();
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(0);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const steps = [
        "Инициализация парсинга...",
        "Параллельный опрос Avito и CIAN...",
        "Запрос данных с Яндекс Недвижимость и M2...",
        "Агрегация и фильтрация выбросов...",
        "Генерация ценового отчета..."
    ];

    // Cycle through loading steps to show activity
    useEffect(() => {
        if (!loading) return;
        const interval = setInterval(() => {
            setStep(prev => (prev < steps.length - 1 ? prev + 1 : prev));
        }, 2500);
        return () => clearInterval(interval);
    }, [loading]);

    // Fetch CMA data from API
    useEffect(() => {
        const fetchData = async () => {
            try {
                const body = {
                    city: property.city || 'Москва',
                    district: property.district || '',
                    rooms: property.rooms !== undefined && property.rooms !== null ? property.rooms : 0,
                    total_area: property.area_total || property.total_area || 40,
                    floor: property.floor || 1,
                    total_floors: property.floors_total || property.total_floors || 1,
                    deal_type: property.deal_type || 'SALE',
                    property_price: property.price || 0,
                    latitude: property.latitude || null,
                    longitude: property.longitude || null,
                    building_type: property.building_type || null
                };

                const isCapacitor = typeof window !== 'undefined' && (window.Capacitor || window.location.href.startsWith('file:') || window.location.hostname === '');
                const proxyUrl = isCapacitor ? `https://realtor-match.vercel.app/api/ai-proxy` : `/api/ai-proxy`;
                const res = await fetch(proxyUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'runCma',
                        property: body
                    })
                });

                if (!res.ok) {
                    const errText = await res.text();
                    throw new Error(errText || 'Не удалось загрузить отчет СМА');
                }

                const json = await res.json();
                setData(json);
            } catch (err) {
                console.error('[CmaReport] Fetch failed:', err);
                setError(err.message || 'Ошибка подключения к бэкенду');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [property]);

    const formatPrice = (val) => {
        if (!val) return '—';
        return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(val);
    };

    if (loading) {
        return (
            <div style={styles.modalOverlay}>
                <div style={styles.loaderContainer}>
                    <div style={styles.spinner}></div>
                    <div style={styles.loaderTitle}>Анализ рынка в реальном времени</div>
                    <div style={styles.loaderSubtitle}>{steps[step]}</div>
                    <div style={styles.progressContainer}>
                        <div style={{...styles.progressBar, width: `${((step + 1) / steps.length) * 100}%`}}></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={styles.modalOverlay}>
                <div style={styles.errorContainer}>
                    <AlertTriangle size={48} color="var(--danger)" style={{ marginBottom: 16 }} />
                    <div style={styles.errorTitle}>Не удалось построить СМА-отчет</div>
                    <div style={styles.errorText}>{error}</div>
                    <button style={styles.closeBtn} onClick={onClose}>Закрыть</button>
                </div>
            </div>
        );
    }

    if (!data) return null;

    // Calculate slider position
    // market_min = 10%, market_avg = 50%, market_max = 90%
    const getSliderPercentage = () => {
        const { market_min, market_avg, market_max, your_price } = data;
        if (!market_min || !market_max) return 50;
        
        if (your_price <= market_min) {
            return Math.max(5, (your_price / market_min) * 10);
        }
        if (your_price <= market_avg) {
            return 10 + ((your_price - market_min) / (market_avg - market_min)) * 40;
        }
        if (your_price <= market_max) {
            return 50 + ((your_price - market_avg) / (market_max - market_avg)) * 40;
        }
        return Math.min(95, 90 + ((your_price - market_max) / market_max) * 10);
    };

    const sliderPercent = getSliderPercentage();

    // Pricing category badge details
    const getBadgeInfo = () => {
        const pct = data.position_pct;
        if (pct < -5) return { text: "Дешевле рынка", color: "#10b981", bg: "rgba(16,185,129,0.1)" };
        if (pct <= 5) return { text: "В рынке", color: "#00aa00", bg: "rgba(0,170,0,0.1)" };
        if (pct <= 15) return { text: "Выше рынка", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" };
        return { text: "Значительно выше рынка", color: "#ef4444", bg: "rgba(239,68,68,0.1)" };
    };

    const badge = getBadgeInfo();

    return (
        <div style={styles.modalOverlay}>
            <div style={styles.container}>
                {/* Header */}
                <div style={styles.header}>
                    <div>
                        <div style={styles.title}>Сравнительный маркетинговый анализ (СМА)</div>
                        <div style={styles.subtitle}>{property.address || property.city || 'Адрес не указан'}</div>
                    </div>
                    <button style={styles.iconBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={styles.content}>
                    
                    {/* Sources status & Confidence */}
                    <div style={styles.row}>
                        <div style={styles.statsCard}>
                            <div style={styles.statsCardTitle}>Найдено аналогов</div>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                                {Object.entries(data.sources_count).map(([src, count]) => {
                                    const colors = {
                                        AVITO: { bg: '#9acd32', text: 'white' },
                                        CIAN: { bg: '#0055ff', text: 'white' },
                                        YANDEX: { bg: '#ff0000', text: 'white' },
                                        M2: { bg: '#002244', text: 'white' }
                                    };
                                    const style = colors[src] || { bg: 'var(--bg-light)', text: 'var(--text)' };
                                    return (
                                        <span key={src} style={{ ...styles.sourceBadge, backgroundColor: style.bg, color: style.text }}>
                                            {src}: {count}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>

                        <div style={{ ...styles.statsCard, minWidth: 160 }}>
                            <div style={styles.statsCardTitle}>Надежность анализа</div>
                            <div style={{ ...styles.confidenceBadge, 
                                color: data.confidence === 'HIGH' ? '#10b981' : data.confidence === 'MEDIUM' ? '#f59e0b' : '#ef4444',
                                backgroundColor: data.confidence === 'HIGH' ? 'rgba(16,185,129,0.1)' : data.confidence === 'MEDIUM' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)'
                            }}>
                                <ShieldCheck size={16} /> {data.confidence === 'HIGH' ? 'Высокая' : data.confidence === 'MEDIUM' ? 'Средняя' : 'Низкая'}
                            </div>
                        </div>
                    </div>

                    {/* Price Slider Bar */}
                    <div style={styles.sectionCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <span style={styles.sectionTitle}>Сравнение с рынком</span>
                            <span style={{ ...styles.statusBadge, color: badge.color, backgroundColor: badge.bg }}>
                                {badge.text} ({data.position_pct > 0 ? `+${data.position_pct}` : data.position_pct}%)
                            </span>
                        </div>

                        <div style={styles.sliderContainer}>
                            <div style={styles.sliderLine}>
                                <div style={{...styles.sliderLabel, left: '10%'}}>Мин<br/>{formatPrice(data.market_min)}</div>
                                <div style={{...styles.sliderLabel, left: '50%'}}>Средняя<br/>{formatPrice(data.market_avg)}</div>
                                <div style={{...styles.sliderLabel, left: '90%'}}>Макс<br/>{formatPrice(data.market_max)}</div>
                            </div>
                            <div style={{ ...styles.sliderPin, left: `${sliderPercent}%` }}>
                                <div style={styles.pinBubble}>
                                    Ваша цена<br/>
                                    <strong>{formatPrice(data.your_price)}</strong>
                                </div>
                                <div style={styles.pinStick}></div>
                            </div>
                        </div>
                    </div>

                    {/* Price Strategy Options */}
                    <div style={styles.sectionTitle}>Рекомендуемые стратегии продажи</div>
                    <div style={styles.optionsGrid}>
                        <div style={styles.optionCard}>
                            <div style={styles.optionHeader}>
                                <span style={styles.optionLabel}>Быстрая продажа</span>
                                <span style={styles.daysForecast}>Срок: {data.days_forecast_optimal} дней</span>
                            </div>
                            <div style={styles.optionPrice}>{formatPrice(data.price_fast)}</div>
                            <div style={styles.optionDesc}>Для срочной продажи объекта (25-й перцентиль рынка).</div>
                            <button style={styles.optionBtn} onClick={() => {
                                onApplyPrice(data.price_fast);
                                toast.success("Применена цена быстрой продажи");
                                onClose();
                            }}>
                                Применить цену <ArrowRight size={14} />
                            </button>
                        </div>

                        <div style={{ ...styles.optionCard, border: '2px solid var(--primary)' }}>
                            <div style={styles.optionHeader}>
                                <span style={{ ...styles.optionLabel, color: 'var(--primary)', fontWeight: 600 }}>Оптимальная цена</span>
                                <span style={styles.daysForecast}>Срок: ~45 дней</span>
                            </div>
                            <div style={styles.optionPrice}>{formatPrice(data.price_optimal)}</div>
                            <div style={styles.optionDesc}>Наиболее вероятная цена продажи (медиана рынка).</div>
                            <button style={{ ...styles.optionBtn, backgroundColor: 'var(--primary)', color: 'white' }} onClick={() => {
                                onApplyPrice(data.price_optimal);
                                toast.success("Применена оптимальная цена");
                                onClose();
                            }}>
                                Применить цену <ArrowRight size={14} />
                            </button>
                        </div>

                        <div style={styles.optionCard}>
                            <div style={styles.optionHeader}>
                                <span style={styles.optionLabel}>Премиум</span>
                                <span style={styles.daysForecast}>Срок: {data.days_forecast_current} дней</span>
                            </div>
                            <div style={styles.optionPrice}>{formatPrice(data.price_premium)}</div>
                            <div style={styles.optionDesc}>Продажа по максимальной цене (75-й перцентиль рынка).</div>
                            <button style={styles.optionBtn} onClick={() => {
                                onApplyPrice(data.price_premium);
                                toast.success("Применена премиальная цена");
                                onClose();
                            }}>
                                Применить цену <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Recommendations Text */}
                    <div style={styles.sectionCard}>
                        <span style={styles.sectionTitle}>Рекомендации эксперта</span>
                        <div style={styles.recommendationText}>
                            {data.recommendation}
                        </div>
                    </div>

                    {/* Analog Listings Table */}
                    <div style={styles.sectionTitle}>Конкуренты и аналоги ({data.analogs.length})</div>
                    <div style={styles.tableContainer}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Источник</th>
                                    <th style={styles.th}>Цена</th>
                                    <th style={styles.th}>Площадь</th>
                                    <th style={styles.th}>₽/м²</th>
                                    <th style={styles.th}>Этаж</th>
                                    <th style={styles.th}>Описание</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.analogs.map((an, i) => (
                                    <tr key={i} style={styles.tr}>
                                        <td style={styles.td}>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: 6,
                                                fontSize: 11,
                                                fontWeight: 600,
                                                color: 'white',
                                                backgroundColor: 
                                                    an.source === 'AVITO' ? '#9acd32' : 
                                                    an.source === 'CIAN' ? '#0055ff' : 
                                                    an.source === 'YANDEX' ? '#ff0000' : '#002244'
                                            }}>
                                                {an.source}
                                            </span>
                                        </td>
                                        <td style={{ ...styles.td, fontWeight: 600 }}>{formatPrice(an.price)}</td>
                                        <td style={styles.td}>{an.total_area ? `${an.total_area} м²` : '—'}</td>
                                        <td style={styles.td}>{an.total_area ? formatPrice(Math.round(an.price / an.total_area)) : '—'}</td>
                                        <td style={styles.td}>{an.floor && an.total_floors ? `${an.floor}/${an.total_floors}` : '—'}</td>
                                        <td style={styles.td}>
                                            <a href={an.source_url} target="_blank" rel="noopener noreferrer" style={styles.tableLink}>
                                                {an.title || "Открыть объявление"} <ExternalLink size={12} />
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div style={styles.footer}>
                    <button style={styles.closeBtn} onClick={onClose}>Закрыть</button>
                </div>
            </div>
        </div>
    );
}

const styles = {
    modalOverlay: {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--modal-bg, rgba(0,0,0,0.4))',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
    },
    container: {
        backgroundColor: 'var(--surface)',
        borderRadius: 28,
        width: '100%',
        maxWidth: 950,
        maxHeight: '90vh',
        boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid var(--border-light, rgba(0,0,0,0.05))'
    },
    header: {
        padding: '24px 28px',
        borderBottom: '1px solid var(--border-light, rgba(0,0,0,0.05))',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    title: {
        fontFamily: "'Oswald', sans-serif",
        fontSize: 22,
        fontWeight: 400,
        color: 'var(--text)',
        letterSpacing: '0.01em'
    },
    subtitle: {
        fontSize: 14,
        color: 'var(--text-secondary)',
        marginTop: 4,
        opacity: 0.8
    },
    iconBtn: {
        border: 'none',
        background: 'var(--bg-light)',
        width: 40,
        height: 40,
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'var(--text)'
    },
    content: {
        padding: '28px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 24
    },
    row: {
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap'
    },
    statsCard: {
        flex: 1,
        minWidth: 280,
        backgroundColor: 'var(--bg-light)',
        borderRadius: 20,
        padding: '16px 20px',
        border: '1px solid rgba(0,0,0,0.02)'
    },
    statsCardTitle: {
        fontSize: 13,
        color: 'var(--text-secondary)',
        opacity: 0.7
    },
    sourceBadge: {
        padding: '4px 10px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600
    },
    confidenceBadge: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 12px',
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
        marginTop: 8
    },
    sectionCard: {
        backgroundColor: 'var(--bg-light)',
        borderRadius: 24,
        padding: '24px',
        border: '1px solid rgba(0,0,0,0.02)'
    },
    sectionTitle: {
        fontFamily: "'Oswald', sans-serif",
        fontSize: 16,
        fontWeight: 500,
        letterSpacing: '0.01em',
        color: 'var(--text)'
    },
    statusBadge: {
        padding: '6px 14px',
        borderRadius: 20,
        fontSize: 13,
        fontWeight: 600
    },
    sliderContainer: {
        position: 'relative',
        height: 100,
        marginTop: 20,
        padding: '0 20px'
    },
    sliderLine: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        height: 8,
        background: 'linear-gradient(90deg, #10b981 0%, #3b82f6 50%, #ef4444 100%)',
        borderRadius: 4
    },
    sliderLabel: {
        position: 'absolute',
        top: 15,
        transform: 'translateX(-50%)',
        textAlign: 'center',
        fontSize: 12,
        color: 'var(--text-secondary)',
        lineHeight: 1.3
    },
    sliderPin: {
        position: 'absolute',
        top: 10,
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 10
    },
    pinBubble: {
        backgroundColor: 'var(--surface)',
        border: '1.5px solid var(--primary)',
        borderRadius: 10,
        padding: '4px 10px',
        fontSize: 11,
        color: 'var(--text)',
        textAlign: 'center',
        boxShadow: '0 8px 16px rgba(0,0,0,0.08)',
        lineHeight: 1.2,
        whiteSpace: 'nowrap'
    },
    pinStick: {
        width: 2,
        height: 32,
        backgroundColor: 'var(--primary)',
        marginTop: 2
    },
    optionsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 16
    },
    optionCard: {
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border-light, rgba(0,0,0,0.05))',
        borderRadius: 20,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 12px rgba(0,0,0,0.02)',
        transition: 'all 0.25s'
    },
    optionHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    optionLabel: {
        fontSize: 14,
        fontWeight: 500,
        color: 'var(--text-secondary)'
    },
    daysForecast: {
        fontSize: 11,
        color: 'var(--text-muted, #7f8c8d)',
        backgroundColor: 'var(--bg-light)',
        padding: '2px 8px',
        borderRadius: 6
    },
    optionPrice: {
        fontFamily: "'Oswald', sans-serif",
        fontSize: 24,
        fontWeight: 400,
        color: 'var(--text)',
        marginBottom: 8
    },
    optionDesc: {
        fontSize: 13,
        color: 'var(--text-secondary)',
        lineHeight: 1.4,
        marginBottom: 20,
        flex: 1
    },
    optionBtn: {
        border: '1px solid var(--border-light)',
        background: 'var(--bg-light)',
        padding: '10px 16px',
        borderRadius: 12,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: 500,
        color: 'var(--text)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        transition: 'all 0.2s'
    },
    recommendationText: {
        fontSize: 15,
        lineHeight: 1.6,
        color: 'var(--text-secondary)'
    },
    tableContainer: {
        overflowX: 'auto',
        borderRadius: 16,
        border: '1px solid var(--border-light, rgba(0,0,0,0.05))'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        textAlign: 'left'
    },
    th: {
        padding: '14px 18px',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--text-secondary)',
        backgroundColor: 'var(--bg-light)',
        borderBottom: '1px solid var(--border-light, rgba(0,0,0,0.05))'
    },
    td: {
        padding: '14px 18px',
        fontSize: 14,
        color: 'var(--text)',
        borderBottom: '1px solid var(--border-light, rgba(0,0,0,0.02))'
    },
    tr: {
        transition: 'background-color 0.15s'
    },
    tableLink: {
        color: 'var(--primary)',
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 13
    },
    footer: {
        padding: '20px 28px',
        borderTop: '1px solid var(--border-light, rgba(0,0,0,0.05))',
        display: 'flex',
        justifyContent: 'flex-end',
        backgroundColor: 'var(--bg-light)'
    },
    closeBtn: {
        border: '1px solid var(--border-light)',
        background: 'var(--surface)',
        padding: '10px 24px',
        borderRadius: 12,
        cursor: 'pointer',
        fontSize: 14,
        color: 'var(--text)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
    },
    loaderContainer: {
        backgroundColor: 'var(--surface)',
        borderRadius: 24,
        padding: '40px 48px',
        textAlign: 'center',
        boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
        width: '100%',
        maxWidth: 420,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
    },
    spinner: {
        width: 48,
        height: 48,
        borderRadius: '50%',
        border: '3px solid var(--border-light)',
        borderTop: '3px solid var(--primary)',
        animation: 'spin 1s linear infinite',
        marginBottom: 24
    },
    loaderTitle: {
        fontFamily: "'Oswald', sans-serif",
        fontSize: 20,
        fontWeight: 400,
        color: 'var(--text)',
        marginBottom: 8
    },
    loaderSubtitle: {
        fontSize: 14,
        color: 'var(--text-secondary)',
        height: 20,
        marginBottom: 24,
        opacity: 0.8
    },
    progressContainer: {
        width: '100%',
        height: 6,
        backgroundColor: 'var(--bg-light)',
        borderRadius: 3,
        overflow: 'hidden'
    },
    progressBar: {
        height: '100%',
        backgroundColor: 'var(--primary)',
        transition: 'width 0.4s ease'
    },
    errorContainer: {
        backgroundColor: 'var(--surface)',
        borderRadius: 24,
        padding: '36px 40px',
        textAlign: 'center',
        boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
        width: '100%',
        maxWidth: 420,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
    },
    errorTitle: {
        fontFamily: "'Oswald', sans-serif",
        fontSize: 18,
        fontWeight: 500,
        color: 'var(--text)',
        marginBottom: 8
    },
    errorText: {
        fontSize: 14,
        color: 'var(--danger)',
        marginBottom: 24,
        lineHeight: 1.4
    }
};

// Insert rotation animation for the loader spinner dynamically
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
}
