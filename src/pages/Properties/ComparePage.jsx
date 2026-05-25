import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { ChevronLeft, Home, Trash2 } from 'lucide-react';
import { formatNumber } from '../../utils/format';
import { PROPERTY_TYPES } from '../../data/constants';

export function ComparePage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { state } = useApp();

    const idsStr = searchParams.get('ids') || '';
    const ids = idsStr ? idsStr.split(',').filter(Boolean) : [];

    const properties = state.properties.filter(p => ids.includes(p.id));

    // Calculate best values
    const prices = properties.map(p => p.price).filter(p => typeof p === 'number' && p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : null;

    const totalAreas = properties.map(p => p.area_total).filter(a => typeof a === 'number' && a > 0);
    const maxTotalArea = totalAreas.length > 0 ? Math.max(...totalAreas) : null;

    const livingAreas = properties.map(p => p.area_living).filter(a => typeof a === 'number' && a > 0);
    const maxLivingArea = livingAreas.length > 0 ? Math.max(...livingAreas) : null;

    const handleRemove = (id) => {
        const newIds = ids.filter(x => x !== id);
        if (newIds.length === 0) {
            navigate('/properties');
        } else {
            setSearchParams({ ids: newIds.join(',') });
        }
    };

    return (
        <div className="page fade-in" style={{ background: 'var(--surface)', minHeight: '100vh', paddingBottom: 80 }}>
            {/* Topbar */}
            <div className="topbar sticky" style={{ 
                background: 'var(--topbar-bg)', 
                backdropFilter: 'blur(24px) saturate(180%)',
                padding: '20px',
                borderBottom: '1px solid var(--border-light)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                gap: 16
            }}>
                <button onClick={() => navigate('/properties')} className="card-clickable" style={{ width: 44, height: 44, borderRadius: 14, border: 'none', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', color: 'var(--text)' }}>
                    <ChevronLeft size={20} />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="font-oswald" style={{ fontSize: 18, fontWeight: 300, color: 'var(--text)' }}>
                        Сравнение объектов
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300, opacity: 0.6 }}>
                        Выбрано: {properties.length}
                    </span>
                </div>
            </div>

            {/* Page Content */}
            <div className="page-content" style={{ padding: 20 }}>
                {properties.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-secondary)' }}>
                        Нет объектов для сравнения. Выберите от 2 до 4 объектов на списке.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto', background: 'var(--surface)', borderRadius: 20, border: '1px solid var(--border-light)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-light)' }}>
                                    <th style={{ padding: '16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, fontSize: 13, width: 140, background: 'var(--bg-light)' }}>Параметр</th>
                                    {properties.map((p, index) => (
                                        <th key={p.id} style={{ padding: '16px', textAlign: 'center', minWidth: 150, position: 'relative', borderLeft: '1px solid var(--border-light)' }}>
                                            <button 
                                                onClick={() => handleRemove(p.id)}
                                                style={{ position: 'absolute', top: 8, right: 8, border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: 4 }}
                                                title="Удалить из сравнения"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            
                                            <div style={{ width: 60, height: 40, background: '#E5E7EB', borderRadius: 8, margin: '8px auto', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                                {p.images && p.images.length > 0 ? (
                                                    <img src={p.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <Home size={18} color="#9CA3AF" />
                                                )}
                                            </div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>
                                                {p.address || p.city}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {/* Price */}
                                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                                    <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-light)' }}>Цена</td>
                                    {properties.map(p => {
                                        const isBest = minPrice !== null && p.price === minPrice;
                                        return (
                                            <td key={p.id} style={{ 
                                                padding: '14px 16px', 
                                                textAlign: 'center', 
                                                fontSize: 14, 
                                                borderLeft: '1px solid var(--border-light)',
                                                color: isBest ? '#10b981' : 'var(--text)',
                                                fontWeight: isBest ? 'bold' : 'normal',
                                                background: isBest ? '#ecfdf5' : 'transparent'
                                            }}>
                                                {formatNumber(p.price)} ₽
                                            </td>
                                        );
                                    })}
                                </tr>

                                {/* Total Area */}
                                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                                    <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-light)' }}>Площадь (общая / жилая)</td>
                                    {properties.map(p => {
                                        const isBestTotal = maxTotalArea !== null && p.area_total === maxTotalArea;
                                        return (
                                            <td key={p.id} style={{ 
                                                padding: '14px 16px', 
                                                textAlign: 'center', 
                                                fontSize: 14, 
                                                borderLeft: '1px solid var(--border-light)',
                                                background: isBestTotal ? '#ecfdf5' : 'transparent'
                                            }}>
                                                <span style={{ 
                                                    color: isBestTotal ? '#10b981' : 'var(--text)',
                                                    fontWeight: isBestTotal ? 'bold' : 'normal'
                                                }}>
                                                    {p.area_total ? `${p.area_total} м²` : '—'}
                                                </span>
                                                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                                    {p.area_living ? ` / ${p.area_living} м²` : ''}
                                                </span>
                                            </td>
                                        );
                                    })}
                                </tr>

                                {/* Floor / Floors Total */}
                                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                                    <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-light)' }}>Этаж / Этажность</td>
                                    {properties.map(p => (
                                        <td key={p.id} style={{ padding: '14px 16px', textAlign: 'center', fontSize: 14, borderLeft: '1px solid var(--border-light)', color: 'var(--text)' }}>
                                            {p.floor || '—'} {p.floors_total ? `/ ${p.floors_total}` : ''}
                                        </td>
                                    ))}
                                </tr>

                                {/* Property Type */}
                                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                                    <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-light)' }}>Тип недвижимости</td>
                                    {properties.map(p => (
                                        <td key={p.id} style={{ padding: '14px 16px', textAlign: 'center', fontSize: 14, borderLeft: '1px solid var(--border-light)', color: 'var(--text)' }}>
                                            {PROPERTY_TYPES[p.property_type] || p.property_type}
                                        </td>
                                    ))}
                                </tr>

                                {/* District */}
                                <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                                    <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-light)' }}>Район</td>
                                    {properties.map(p => (
                                        <td key={p.id} style={{ padding: '14px 16px', textAlign: 'center', fontSize: 14, borderLeft: '1px solid var(--border-light)', color: 'var(--text)' }}>
                                            {p.district || p.microdistrict || '—'}
                                        </td>
                                    ))}
                                </tr>

                                {/* Description */}
                                <tr>
                                    <td style={{ padding: '14px 16px', fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', background: 'var(--bg-light)' }}>Описание</td>
                                    {properties.map(p => (
                                        <td key={p.id} style={{ 
                                            padding: '14px 16px', 
                                            fontSize: 12, 
                                            borderLeft: '1px solid var(--border-light)', 
                                            color: 'var(--text-secondary)',
                                            verticalAlign: 'top',
                                            lineHeight: 1.5,
                                            maxHeight: 120,
                                            overflowY: 'auto',
                                            textAlign: 'left'
                                        }}>
                                            <div style={{ display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                {p.description || '—'}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
