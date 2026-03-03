import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatPrice, getLevelLabel } from '../../utils/matching';

export function DashboardPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const user = state.currentUser;
    if (!user) return null;

    const myClients = state.clients.filter(c => c.realtor_id === user.id);
    const myProperties = state.properties.filter(p => p.realtor_id === user.id && p.status === 'active');
    const myRequests = state.requests.filter(r => r.realtor_id === user.id && r.status === 'active');
    const myMatches = state.matches.filter(m => m.realtor_id === user.id);
    const newMatches = myMatches.filter(m => m.status === 'new').sort((a, b) => b.score - a.score).slice(0, 5);
    const deals = myMatches.filter(m => m.status === 'deal').length;

    const today = new Date().toISOString().slice(0, 10);
    const todayTasks = state.tasks.filter(t => t.realtor_id === user.id && t.due_date?.startsWith(today) && t.status === 'pending');

    return (
        <div className="page fade-in">
            <div className="dash-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h1>Привет, {user.full_name?.split(' ')[1] || user.full_name}!</h1>
                        <p>{user.agency_name || 'Риэлтор'}</p>
                    </div>
                    <div style={{
                        width: 48, height: 48, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, cursor: 'pointer', backdropFilter: 'blur(8px)'
                    }} onClick={() => navigate('/profile')}>
                        Профиль
                    </div>
                </div>
            </div>

            <div className="page-content">
                {/* Stats */}
                <div className="stats-grid">
                    <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/clients')}>
                        <div className="stat-value">{myClients.length}</div>
                        <div className="stat-label">Клиентов</div>
                    </div>
                    <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/properties')}>
                        <div className="stat-value">{myProperties.length}</div>
                        <div className="stat-label">Объектов</div>
                    </div>
                    <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/requests')}>
                        <div className="stat-value">{myRequests.length}</div>
                        <div className="stat-label">Запросов</div>
                    </div>
                    <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => navigate('/matches')}>
                        <div className="stat-value">{myMatches.length}</div>
                        <div className="stat-label">Матчей</div>
                    </div>
                </div>

                {/* New matches */}
                {newMatches.length > 0 && (
                    <div>
                        <div className="section-header">
                            <span className="section-title">Новые совпадения ({newMatches.length})</span>
                            <span className="section-link" onClick={() => navigate('/matches')}>Все →</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {newMatches.map(m => {
                                const prop = state.properties.find(p => p.id === m.property_id);
                                const req = state.requests.find(r => r.id === m.request_id);
                                const client = req ? state.clients.find(c => c.id === req.client_id) : null;
                                const lvl = getLevelLabel(m.match_level);
                                return (
                                    <div key={m.id} className="notif-banner" onClick={() => navigate(`/matches/${m.id}`)}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ fontWeight: 700, fontSize: 15 }}>{m.score}%</span>
                                            <span className={`badge badge-${m.match_level === 'perfect' ? 'success' : m.match_level === 'good' ? 'warning' : 'orange'}`}>{m.match_level === 'perfect' ? 'Отлично' : m.match_level === 'good' ? 'Хорошо' : 'Возможно'}</span>
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                                            {client?.full_name?.split(' ')[0]} ↔ {prop?.address || prop?.district}
                                        </div>
                                        <div className="score-bar score-bar-sm" style={{ marginTop: 8 }}>
                                            <div className={`score-bar score-${m.match_level}`}>
                                                <div className="score-bar-fill" style={{ width: m.score + '%', height: 4, borderRadius: 99, background: m.match_level === 'perfect' ? 'var(--success)' : m.match_level === 'good' ? 'var(--warning)' : 'var(--orange)' }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Today tasks */}
                {todayTasks.length > 0 && (
                    <div>
                        <div className="section-header">
                            <span className="section-title">Задачи на сегодня ({todayTasks.length})</span>
                            <span className="section-link" onClick={() => navigate('/tasks')}>Все →</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {todayTasks.map(task => {
                                const time = task.due_date ? new Date(task.due_date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
                                const client = task.client_id ? state.clients.find(c => c.id === task.client_id) : null;
                                return (
                                    <div key={task.id} className="list-row" onClick={() => navigate('/tasks')}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>{time ? `${time} — ` : ''}{task.title}</div>
                                            {client && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{client.full_name}</div>}
                                        </div>
                                        <span className={`badge badge-${task.priority === 'high' ? 'danger' : 'warning'}`}>
                                            {task.priority === 'high' ? 'Важно' : 'Сред.'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Quick actions */}
                <div style={{ marginTop: 16 }}>
                    <div className="section-title" style={{ marginBottom: 8 }}>Быстрые действия</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <button className="btn btn-ghost" onClick={() => navigate('/properties/new')}>Добавить объект</button>
                        <button className="btn btn-ghost" onClick={() => navigate('/clients/new')}>Добавить клиента</button>
                    </div>
                </div>

                {newMatches.length === 0 && todayTasks.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-title">Начните работу!</div>
                        <div className="empty-desc">Добавьте клиентов, объекты и запросы — система автоматически найдёт совпадения</div>
                    </div>
                )}
            </div>
        </div>
    );
}
