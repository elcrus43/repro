import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatNumber } from '../../utils/format';
import { Edit2, Trash2, Sparkles, User, MapPin, Building2, Wallet } from 'lucide-react';
import { PROPERTY_TYPES } from '../../data/constants';

export function DetailsPage() {
    const { id } = useParams();
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const req = state.requests.find(r => r.id === id);
    const client = state.clients.find(c => c.id === req?.client_id);
    const matches = state.matches.filter(m => m.request_id === id);

    if (!req) return <div className="page"><div className="topbar"><button className="topbar-back" onClick={() => navigate('/requests')}>←</button><span className="topbar-title">Запрос не найден</span></div></div>;

    const statusLabels = { active: 'Активен', paused: 'Пауза', deal_closed: 'Сделка', refused: 'Отказ' };
    const statusColors = { active: 'success', paused: 'warning', deal_closed: 'primary', refused: 'muted' };

    function handleDelete() {
        if (window.confirm('Удалить этот запрос?')) {
            dispatch({ type: 'DELETE_REQUEST', id });
            navigate('/requests');
        }
    }

    return (
        <div className="page fade-in">
            <div className="topbar">
                <button className="topbar-back" onClick={() => navigate('/requests')}>←</button>
                <span className="topbar-title">Детали запроса</span>
                <div className="topbar-actions">
                    <button className="icon-btn" onClick={() => navigate(`/requests/${id}/edit`)}><Edit2 size={18} /></button>
                    <button className="icon-btn" onClick={handleDelete}><Trash2 size={18} /></button>
                </div>
            </div>

            <div className="page-content">
                {/* Main Card */}
                <div className="card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>{req.property_types?.map(t => PROPERTY_TYPES[t] || t).join(' / ')}</div>
                            <div className="flex items-center gap-4" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                <MapPin size={14} /> {req.districts?.join(', ') || 'Все районы'}
                            </div>
                        </div>
                        <span className={`badge badge-${statusColors[req.status]}`} style={{ fontSize: 12 }}>{statusLabels[req.status]}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                        <div style={{ background: 'var(--bg)', padding: '10px', borderRadius: 10, border: '1px solid var(--border-light)' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Бюджет до</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)' }}>{formatNumber(req.budget_max)} ₽</div>
                        </div>
                        <div style={{ background: 'var(--bg)', padding: '10px', borderRadius: 10, border: '1px solid var(--border-light)' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 2 }}>Комиссия</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--success)' }}>{formatNumber(req.commission)} ₽</div>
                        </div>
                    </div>

                    <button className="btn btn-primary btn-full flex items-center justify-center gap-8" onClick={() => navigate(`/matches?request_id=${id}`)}>
                        <Sparkles size={18} /> Смотреть совпадения ({matches.length})
                    </button>
                </div>

                {/* Client Info */}
                <div className="card" onClick={() => navigate(`/clients/${client?.id}`)}>
                    <div className="section-title">Клиент</div>
                    <div className="flex items-center gap-12">
                        <div className="avatar">{(client?.full_name || '?')[0]}</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700 }}>{client?.full_name}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{client?.phone}</div>
                        </div>
                        <span style={{ color: 'var(--primary)', fontSize: 14 }}>➔</span>
                    </div>
                </div>

                {/* Requirements */}
                <div className="card">
                    <div className="section-title">Требования</div>
                    <div className="info-grid">
                        <div className="info-row">
                            <span className="info-key"><Building2 size={14} /> Тип недвижимости</span>
                            <span className="info-val">{req.property_types?.map(t => PROPERTY_TYPES[t] || t).join(', ')}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-key">Комнат</span>
                            <span className="info-val">{req.rooms?.map(r => r === 0 ? 'С' : r).join(', ') || '—'}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-key">Этаж</span>
                            <span className="info-val">{req.floor_min || '—'} - {req.floor_max || 'any'}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-key">Площадь</span>
                            <span className="info-val">от {req.area_min || 0} м²</span>
                        </div>
                        <div className="info-row">
                            <span className="info-key"><Wallet size={14} /> Ипотека</span>
                            <span className="info-val">{req.mortgage ? 'Да' : 'Нет'}</span>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {req.notes && (
                    <div className="card">
                        <div className="section-title">Комментарий</div>
                        <div style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{req.notes}</div>
                    </div>
                )}
            </div>
        </div>
    );
}
