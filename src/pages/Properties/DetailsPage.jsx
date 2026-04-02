import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatNumber } from '../../utils/format';
import { Edit2, Trash2, Sparkles, User, MapPin, Building2, Calendar, CheckCircle2, TrendingUp } from 'lucide-react';
import { PROPERTY_TYPES } from '../../data/constants';

export function DetailsPage() {
    const { id } = useParams();
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const prop = state.properties.find(p => p.id === id);
    const client = state.clients.find(c => c.id === prop?.client_id);
    const matches = state.matches.filter(m => m.property_id === id);
    const showings = state.showings.filter(s => s.property_id === id);
    const tasks = state.tasks.filter(t => t.property_id === id);

    if (!prop) return <div className="page"><div className="topbar"><button className="topbar-back" onClick={() => navigate('/properties')}>←</button><span className="topbar-title">Объект не найден</span></div></div>;

    const statusLabels = { active: 'В продаже', paused: 'Пауза', deal_closed: 'Продано', refused: 'Снято' };
    const statusColors = { active: 'success', paused: 'warning', deal_closed: 'primary', refused: 'muted' };

    function handleDelete() {
        if (window.confirm('Удалить этот объект?')) {
            dispatch({ type: 'DELETE_PROPERTY', id });
            navigate('/properties');
        }
    }

    return (
        <div className="page fade-in">
            <div className="topbar">
                <button className="topbar-back" onClick={() => navigate('/properties')}>←</button>
                <span className="topbar-title">Карточка объекта</span>
                <div className="topbar-actions">
                    <button className="icon-btn" onClick={() => navigate(`/properties/${id}/edit`)}><Edit2 size={18} /></button>
                    <button className="icon-btn" onClick={handleDelete}><Trash2 size={18} /></button>
                </div>
            </div>

            <div className="page-content">
                {/* Header Card */}
                <div className="card" style={{ padding: '0 0 16px 0', overflow: 'hidden' }}>
                    <div style={{ background: 'var(--primary-light)', padding: '20px 16px', borderBottom: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--primary)' }}>{formatNumber(prop.price)} ₽</div>
                            <span className={`badge badge-${statusColors[prop.status]}`} style={{ fontSize: 12 }}>{statusLabels[prop.status]}</span>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 700, marginTop: 4 }}>{prop.address || prop.city}</div>
                    </div>

                    <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
                        <div style={{ background: 'var(--bg)', padding: '8px', borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Общая S</div>
                            <div style={{ fontSize: 15, fontWeight: 800 }}>{prop.area_total} м²</div>
                        </div>
                        <div style={{ background: 'var(--bg)', padding: '8px', borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Жилая S</div>
                            <div style={{ fontSize: 15, fontWeight: 800 }}>{prop.area_living || '—'} м²</div>
                        </div>
                        <div style={{ background: 'var(--bg)', padding: '8px', borderRadius: 8 }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Кухня</div>
                            <div style={{ fontSize: 15, fontWeight: 800 }}>{prop.area_kitchen || '—'} м²</div>
                        </div>
                    </div>

                    <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8 }}>
                        <button className="btn btn-primary flex-1 flex items-center justify-center gap-8" onClick={() => navigate(`/matches?property_id=${id}`)}>
                            <Sparkles size={18} /> Матчи ({matches.length})
                        </button>
                        <button className="btn btn-outline flex items-center justify-center gap-8" onClick={() => navigate(`/properties/${id}/estimate`)}>
                            <TrendingUp size={18} /> Оценка
                        </button>
                    </div>
                </div>

                {/* Client Link */}
                <div className="card" onClick={() => navigate(`/clients/${client?.id}`)}>
                    <div className="section-title">Собственник</div>
                    <div className="flex items-center gap-12">
                        <div className="avatar">{(client?.full_name || '?')[0]}</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700 }}>{client?.full_name}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{client?.phone}</div>
                        </div>
                        <span style={{ color: 'var(--primary)', fontSize: 14 }}>➔</span>
                    </div>
                </div>

                {/* Features */}
                <div className="card">
                    <div className="section-title">Параметры</div>
                    <div className="info-grid">
                        <div className="info-row">
                            <span className="info-key"><Building2 size={14} /> Тип объекта</span>
                            <span className="info-val">{PROPERTY_TYPES[prop.property_type]}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-key">Комнат</span>
                            <span className="info-val">{prop.rooms || 'Студия'}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-key">Этаж</span>
                            <span className="info-val">{prop.floor} из {prop.floor_total}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-key">Год постройки</span>
                            <span className="info-val">{prop.build_year || '—'}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-key">Тип сделки</span>
                            <span className="info-val">{prop.deal_type === 'sale' ? 'Продажа' : 'Аренда'}</span>
                        </div>
                        <div className="info-row" style={{ borderBottom: 'none' }}>
                            <span className="info-key">Комиссия</span>
                            <span className="info-val" style={{ color: 'var(--success)', fontWeight: 700 }}>{formatNumber(prop.commission)} ₽</span>
                        </div>
                    </div>
                </div>

                {/* Showings */}
                <div className="card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div className="section-title" style={{ marginBottom: 0 }}>Показы ({showings.length})</div>
                        <button className="icon-btn" onClick={() => navigate(`/showings/new?property_id=${id}`)} style={{ color: 'var(--primary)', padding: '2px 8px', fontSize: 20 }}>+</button>
                    </div>
                    {showings.length === 0 ? (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>На этот объект пока не было назначено показов</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {showings.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3).map(s => {
                                const buyer = state.clients.find(c => c.id === s.client_id);
                                return (
                                    <div key={s.id} onClick={() => navigate('/showings')} style={{ padding: '10px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--border-light)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <span style={{ fontSize: 13, fontWeight: 700 }}>{buyer?.full_name || 'Покупатель'}</span>
                                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(s.date).toLocaleDateString('ru-RU')}</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: s.feedback ? 'var(--text)' : 'var(--text-muted)', fontStyle: s.feedback ? 'normal' : 'italic' }}>
                                            {s.feedback || 'Обратная связь не оставлена'}
                                        </div>
                                    </div>
                                );
                            })}
                            {showings.length > 3 && (
                                <button className="btn btn-link btn-sm" onClick={() => navigate('/showings')}>Смотреть всю историю</button>
                            )}
                        </div>
                    )}
                </div>

                {/* Tasks */}
                <div className="card" style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div className="section-title" style={{ marginBottom: 0 }}>Задачи ({tasks.length})</div>
                        <button className="icon-btn" onClick={() => navigate(`/tasks?property_id=${id}&action=new`)} style={{ color: 'var(--primary)', padding: '2px 8px', fontSize: 20 }}>+</button>
                    </div>
                    {tasks.length === 0 ? (
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>Нет задач по этому объекту</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {tasks.map(t => (
                                <div key={t.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 10px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border-light)' }}>
                                    <div style={{ width: 14, height: 14, borderRadius: 10, border: `2px solid ${t.status === 'done' ? 'var(--success)' : '#ccc'}`, background: t.status === 'done' ? 'var(--success)' : 'transparent' }} />
                                    <div style={{ fontSize: 13, fontWeight: 600, textDecoration: t.status === 'done' ? 'line-through' : 'none', color: t.status === 'done' ? 'var(--text-muted)' : 'var(--text)' }}>{t.title}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Notes */}
                {prop.notes && (
                    <div className="card">
                        <div className="section-title">Описание</div>
                        <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' }}>{prop.notes}</div>
                    </div>
                )}
            </div>
        </div>
    );
}
