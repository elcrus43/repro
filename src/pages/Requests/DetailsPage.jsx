import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatNumber } from '../../utils/format';
import { Pencil, Trash, Sparkles, User, MapPin, Building2, Wallet, ChevronRight, TrendingUp, ChevronLeft } from 'lucide-react';
import { PROPERTY_TYPES, REQUEST_STATUS_LABELS, REQUEST_STATUS_COLORS } from '../../data/constants';
import { hasPassedDealStage, isDealTypeCompatible } from '../../utils/matching';

export function DetailsPage() {
    const { id } = useParams();
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const req = state.requests.find(r => r.id === id);
    const clients = state.clients.filter(c => (req?.client_ids || [req?.client_id]).includes(c.id));
    
    const status = req?.status || 'active';
    const isActive = status === 'active';
    
    const matches = isActive ? state.matches.filter(m => {
        if (m.request_id !== id) return false;
        const prop = state.properties.find(p => p.id === m.property_id);
        return prop && !hasPassedDealStage(prop, state.deals) && isDealTypeCompatible(prop, req);
    }) : [];

    if (!req) return (
        <div className="page fade-in">
            <div className="topbar sticky" style={{ background: 'var(--topbar-bg)', backdropFilter: 'blur(20px) saturate(180%)' }}>
                <button className="topbar-back" onClick={() => navigate('/requests')} style={{ borderRadius: 14 }}>←</button>
                <span className="topbar-title font-oswald" style={{ fontWeight: 300, fontSize: 20 }}>Запрос не найден</span>
            </div>
        </div>
    );

    function handleUpdateStatus(newStatus) {
        if ((req.status || 'active') === newStatus) return;
        dispatch({
            type: 'UPDATE_REQUEST',
            request: {
                ...req,
                status: newStatus
            }
        });
    }

    function handleDelete() {
        if (window.confirm('Удалить этот запрос?')) {
            dispatch({ type: 'DELETE_REQUEST', id });
            navigate('/requests');
        }
    }

    return (
        <div className="page fade-in" style={{ background: 'var(--surface)' }}>
            {/* STICKY TOPBAR */}
            <div className="topbar sticky" style={{ 
                background: 'var(--topbar-bg)', 
                backdropFilter: 'blur(24px) saturate(180%)',
                padding: '20px',
                borderBottom: '1px solid var(--border-light)',
                zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <button 
                    onClick={() => navigate('/requests')} 
                    className="card-clickable" 
                    style={{ 
                        width: 44, height: 44, borderRadius: 14, border: 'none', 
                        background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)', color: 'var(--text)' 
                    }}
                >
                    <ChevronLeft size={20} />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <span className="topbar-title font-oswald" style={{ letterSpacing: '0.01em', fontSize: 20, fontWeight: 300 }}>
                        Детали запроса
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300, opacity: 0.6 }}>Запрос на подбор</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button 
                        className="card-clickable" 
                        onClick={() => navigate(`/requests/${id}/edit`)} 
                        title="Редактировать"
                        style={{ 
                            width: 44, height: 44, borderRadius: 14, border: 'none', 
                            background: 'var(--surface)', color: 'var(--text)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)' 
                        }}
                    >
                        <Pencil size={18} />
                    </button>
                    <button 
                        className="card-clickable" 
                        onClick={handleDelete} 
                        title="Удалить"
                        style={{ 
                            width: 44, height: 44, borderRadius: 14, border: 'none', 
                            background: 'var(--surface)', color: 'var(--danger)', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)' 
                        }}
                    >
                        <Trash size={18} />
                    </button>
                </div>
            </div>

            <div className="page-content" style={{ padding: '20px 20px 120px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {/* Header Card */}
                <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 28, background: 'var(--surface)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <h2 className="font-oswald" style={{ fontSize: 22, fontWeight: 300, letterSpacing: '0.02em', color: 'var(--text)', marginBottom: 6 }}>
                                {req.property_types?.map(t => PROPERTY_TYPES[t] || t).join(' / ') || 'Любой объект'}
                            </h2>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', fontWeight: 300 }}>
                                <MapPin size={14} color="var(--primary)" /> 
                                {req.districts?.join(', ') || 'Все районы'}
                            </div>
                        </div>

                        {/* Переключатель статуса прямо из карточки */}
                        <div style={{ 
                            display: 'inline-flex', 
                            background: 'var(--bg-light)', 
                            padding: 3, 
                            borderRadius: 14, 
                            gap: 3,
                            border: '1px solid var(--border-light)'
                        }}>
                            <button
                                type="button"
                                onClick={() => handleUpdateStatus('active')}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: 11,
                                    border: 'none',
                                    fontSize: 12,
                                    fontFamily: "'Medeo Sans', ui-sans-serif, sans-serif",
                                    fontWeight: isActive ? 500 : 300,
                                    background: isActive ? '#10b981' : 'transparent',
                                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    boxShadow: isActive ? '0 2px 8px rgba(16, 185, 129, 0.25)' : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#fff' : '#10b981' }} />
                                Актуально
                            </button>
                            <button
                                type="button"
                                onClick={() => handleUpdateStatus('completed')}
                                style={{
                                    padding: '6px 14px',
                                    borderRadius: 11,
                                    border: 'none',
                                    fontSize: 12,
                                    fontFamily: "'Medeo Sans', ui-sans-serif, sans-serif",
                                    fontWeight: !isActive ? 500 : 300,
                                    background: !isActive ? '#64748b' : 'transparent',
                                    color: !isActive ? '#ffffff' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    boxShadow: !isActive ? '0 2px 8px rgba(100, 116, 139, 0.25)' : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6
                                }}
                            >
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: !isActive ? '#fff' : '#64748b' }} />
                                Завершен
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                        <div style={{ background: 'var(--bg-light)', padding: '14px 16px', borderRadius: 18 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300, marginBottom: 4 }}>Макс. бюджет</div>
                            <div className="font-oswald" style={{ fontSize: 22, fontWeight: 300, color: 'var(--primary)' }}>{formatNumber(req.budget_max)} ₽</div>
                        </div>
                        <div style={{ background: 'var(--bg-light)', padding: '14px 16px', borderRadius: 18 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300, marginBottom: 4 }}>Комиссия</div>
                            <div className="font-oswald" style={{ fontSize: 22, fontWeight: 300, color: '#10b981' }}>{formatNumber(req.commission)} ₽</div>
                        </div>
                    </div>

                    {isActive ? (
                        <button 
                            className="btn btn-primary btn-full card-clickable" 
                            style={{ 
                                height: 50, borderRadius: 16, fontSize: 14, fontWeight: 400, 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 
                            }} 
                            onClick={() => navigate(`/matches?request=${id}`)}
                        >
                            <Sparkles size={18} /> Совпадений: {matches.length}
                        </button>
                    ) : (
                        <div style={{ 
                            padding: '14px 16px', borderRadius: 16, fontSize: 13, fontWeight: 300, 
                            background: 'var(--bg-light)', color: 'var(--text-muted)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            border: '1px dashed var(--border-light)'
                        }}>
                            <Sparkles size={16} style={{ opacity: 0.4 }} />
                            <span>Запрос завершен — не участвует в анализе совпадений</span>
                        </div>
                    )}
                </div>

                {/* Clients Card */}
                {clients.length > 0 && (
                    <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 28, background: 'var(--surface)' }}>
                        <div className="font-oswald" style={{ fontWeight: 300, fontSize: 16, color: 'var(--text)', marginBottom: 16 }}>Покупатели</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {clients.map(c => (
                                <div key={c.id} className="card-clickable" onClick={() => navigate(`/clients/${c.id}`)} style={{ padding: '12px 16px', background: 'var(--bg-light)', borderRadius: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div style={{ 
                                        width: 38, height: 38, borderRadius: 12, background: 'var(--primary)', color: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 300, fontFamily: "'Medeo Sans', ui-sans-serif, sans-serif"
                                    }}>
                                        {(c.full_name || '?')[0].toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 400, fontSize: 14, color: 'var(--text)' }}>{c.full_name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 300 }}>{c.phone}</div>
                                    </div>
                                    <ChevronRight size={16} style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Requirements Card */}
                <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 28, background: 'var(--surface)' }}>
                    <div className="font-oswald" style={{ fontWeight: 300, fontSize: 16, color: 'var(--text)', marginBottom: 16 }}>Характеристики</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px dashed var(--border-light)' }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>Тип недвижимости</span>
                            <span style={{ fontWeight: 400, color: 'var(--text)' }}>{req.property_types?.map(t => PROPERTY_TYPES[t] || t).join(', ') || 'Любой'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px dashed var(--border-light)' }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>Комнатность</span>
                            <span style={{ fontWeight: 400, color: 'var(--text)' }}>{req.rooms?.map(r => r === 0 ? 'С' : r).join(', ') || 'Любая'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px dashed var(--border-light)' }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>Этажность</span>
                            <span style={{ fontWeight: 400, color: 'var(--text)' }}>{req.floor_min || 1} - {req.floor_max || 'макс'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px dashed var(--border-light)' }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>Площадь</span>
                            <span style={{ fontWeight: 400, color: 'var(--text)' }}>от {req.area_min || 0} м²</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 300 }}>Ипотека</span>
                            <span style={{ fontWeight: 400, color: req.mortgage ? 'var(--primary)' : 'var(--text)' }}>{req.mortgage ? 'Да' : 'Нет'}</span>
                        </div>
                    </div>
                </div>

                {/* Notes Card */}
                {req.notes && (
                    <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 28, background: 'var(--surface)' }}>
                        <div className="font-oswald" style={{ fontWeight: 300, fontSize: 15, color: 'var(--text)', marginBottom: 8 }}>Комментарий</div>
                        <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-secondary)', fontWeight: 300, whiteSpace: 'pre-wrap' }}>{req.notes}</div>
                    </div>
                )}

            </div>
        </div>
    );
}
