import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatNumber } from '../../utils/format';
import { Pencil, Trash, Sparkles, User, MapPin, Building2, Wallet, ChevronRight, TrendingUp, ChevronLeft } from 'lucide-react';
import { PROPERTY_TYPES } from '../../data/constants';

export function DetailsPage() {
    const { id } = useParams();
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const req = state.requests.find(r => r.id === id);
    const clients = state.clients.filter(c => (req?.client_ids || [req?.client_id]).includes(c.id));
    const matches = state.matches.filter(m => m.request_id === id);

    if (!req) return (
        <div className="page">
            <div className="topbar">
                <button className="topbar-back" onClick={() => navigate('/requests')}>←</button>
                <span className="topbar-title font-oswald">Запрос не найден</span>
            </div>
        </div>
    );

    const statusLabels = { active: 'Активен', paused: 'Пауза', deal_closed: 'Сделка', refused: 'Отказ' };
    const statusColors = { active: '#10b981', paused: '#f59e0b', deal_closed: '#0052FF', refused: '#94a3b8' };
    const status = req.status || 'active';

    function handleDelete() {
        if (window.confirm('Удалить этот запрос?')) {
            dispatch({ type: 'DELETE_REQUEST', id });
            navigate('/requests');
        }
    }

    return (
        <div className="page fade-in" style={{ background: 'var(--surface)' }}>
            <div className="topbar sticky" style={{ 
                background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(24px) saturate(180%)',
                padding: '20px', borderBottom: '1px solid rgba(0,0,0,0.05)', zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
                <button onClick={() => navigate('/requests')} className="card-clickable" style={{ width: 44, height: 44, borderRadius: 14, border: 'none', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', color: 'var(--text)' }}>
                    <ChevronLeft size={20} />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <span className="font-oswald" style={{ fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text)' }}>
                        Детали запроса
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>Покупатель</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="card-clickable" onClick={() => navigate(`/requests/${id}/edit`)} style={{ 
                        width: 40, height: 40, borderRadius: 12, border: 'none', background: 'var(--primary-light)', color: 'var(--primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Pencil size={18} />
                    </button>
                </div>
            </div>

            <div className="page-content" style={{ padding: '20px 20px 120px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {/* Header Card */}
                <div className="card" style={{ padding: '28px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                        <div style={{ flex: 1 }}>
                            <div className="font-oswald" style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, textTransform: 'uppercase' }}>
                                {req.property_types?.map(t => PROPERTY_TYPES[t] || t).join(' / ')}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>
                                <MapPin size={16} color="var(--primary)" /> 
                                {req.districts?.join(', ') || 'Все районы'}
                            </div>
                        </div>
                        <span style={{ 
                            padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                            background: `${statusColors[status]}15`,
                            color: statusColors[status]
                        }}>{statusLabels[status]}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                        <div style={{ background: 'var(--bg-light)', padding: '16px', borderRadius: 20 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: 4 }}>Бюджет до</div>
                            <div className="font-oswald" style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>{formatNumber(req.budget_max)} ₽</div>
                        </div>
                        <div style={{ background: 'var(--bg-light)', padding: '16px', borderRadius: 20 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: 4 }}>Комиссия</div>
                            <div className="font-oswald" style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>{formatNumber(req.commission)} ₽</div>
                        </div>
                    </div>

                    <button className="btn btn-primary btn-full" style={{ height: 56, borderRadius: 18, fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }} onClick={() => navigate(`/matches?request_id=${id}`)}>
                        <Sparkles size={20} /> Смотреть совпадения ({matches.length})
                    </button>
                </div>

                {/* Clients Card */}
                <div className="card" style={{ padding: '28px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: 'white' }}>
                    <div className="font-oswald" style={{ fontWeight: 700, fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text)', marginBottom: 20 }}>Покупатели</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {clients.map(c => (
                            <div key={c.id} className="card-clickable" onClick={() => navigate(`/clients/${c.id}`)} style={{ padding: '16px', background: 'var(--bg-light)', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ 
                                    width: 44, height: 44, borderRadius: 14, background: 'var(--primary)', color: 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, fontFamily: "'Oswald', sans-serif"
                                }}>
                                    {(c.full_name || '?')[0].toUpperCase()}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: 15 }}>{c.full_name}</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{c.phone}</div>
                                </div>
                                <ChevronRight size={18} color="var(--text-muted)" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Requirements Card */}
                <div className="card" style={{ padding: '28px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: 'white' }}>
                    <div className="font-oswald" style={{ fontWeight: 700, fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text)', marginBottom: 20 }}>Характеристики</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Тип</span>
                            <span style={{ fontWeight: 700 }}>{req.property_types?.map(t => PROPERTY_TYPES[t] || t).join(', ')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Комнатность</span>
                            <span style={{ fontWeight: 700 }}>{req.rooms?.map(r => r === 0 ? 'С' : r).join(', ') || 'Любая'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Этажность</span>
                            <span style={{ fontWeight: 700 }}>{req.floor_min || 1} - {req.floor_max || 'макс'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Площадь</span>
                            <span style={{ fontWeight: 700 }}>от {req.area_min || 0} м²</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ипотека</span>
                            <span style={{ fontWeight: 700, color: req.mortgage ? 'var(--primary)' : 'var(--text)' }}>{req.mortgage ? 'Да' : 'Нет'}</span>
                        </div>
                    </div>
                </div>

                {/* Notes Card */}
                {req.notes && (
                    <div className="card" style={{ padding: '28px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: 'white' }}>
                        <div className="font-oswald" style={{ fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text)', marginBottom: 12 }}>Комментарий</div>
                        <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{req.notes}</div>
                    </div>
                )}

            </div>
        </div>
    );
}
