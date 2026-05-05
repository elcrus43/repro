import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatNumber } from '../../utils/format';
import { MessageSquare, Sparkles, TrendingUp, CheckSquare, Users, Home, Search, Target, ArrowRight } from 'lucide-react';

export function DashboardPage() {
    const { state } = useApp();
    const navigate = useNavigate();

    const myProperties = useMemo(() =>
        state.properties.filter(p => p.status === 'active'),
        [state.properties]
    );

    const myClients = useMemo(() =>
        state.clients.filter(c => state.currentUser?.role === 'admin' || c.realtor_id === state.currentUser?.id),
        [state.clients, state.currentUser?.role, state.currentUser?.id]
    );

    const myRequests = useMemo(() =>
        state.requests.filter(r => (state.currentUser?.role === 'admin' || r.realtor_id === state.currentUser?.id) && r.status === 'active'),
        [state.requests, state.currentUser?.role, state.currentUser?.id]
    );

    const myMatches = useMemo(() => {
        if (state.currentUser?.role === 'admin') return state.matches;
        return state.matches.filter(m => {
            const req = state.requests.find(r => r.id === m.request_id);
            return req?.realtor_id === state.currentUser?.id;
        });
    }, [state.matches, state.requests, state.currentUser?.role, state.currentUser?.id]);

    const newMatches = useMemo(() =>
        myMatches
            .filter(m => m.status === 'new')
            .sort((a, b) => b.score - a.score)
            .slice(0, 5),
        [myMatches]
    );

    const today = new Date().toISOString().slice(0, 10);
    const todayTasks = useMemo(() =>
        state.tasks.filter(t => (state.currentUser?.role === 'admin' || t.realtor_id === state.currentUser?.id) && t.due_date?.startsWith(today) && t.status === 'pending'),
        [state.tasks, state.currentUser?.role, state.currentUser?.id, today]
    );

    const user = state.currentUser;
    if (!user) return null;

    return (
        <div className="page fade-in" style={{ background: 'var(--bg)' }}>
            {/* Premium Header */}
            <div style={{ padding: '40px 20px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: 32, fontWeight: 900, color: 'var(--primary)', lineHeight: 1.1 }}>
                            Привет, {user.full_name?.split(' ')[1] || user.full_name}!
                        </h1>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                            <Target size={14} style={{ color: 'var(--accent)' }} /> 
                            {user.agency_name || 'Частный риэлтор'}
                        </p>
                    </div>
                    <div style={{
                        width: 52, height: 52, borderRadius: '14px',
                        background: 'var(--primary)', color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 800, cursor: 'pointer',
                        boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.15)'
                    }} onClick={() => navigate('/profile')}>
                        {user.full_name?.split(' ').map(n => n[0]).join('')}
                    </div>
                </div>
            </div>

            <div className="page-content" style={{ gap: 28, padding: '24px 20px' }}>
                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div className="card card-clickable" onClick={() => navigate('/clients')} style={{ padding: 18, border: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ background: 'var(--primary-light)', padding: 10, borderRadius: 10, color: 'var(--primary)' }}>
                                <Users size={20} />
                            </div>
                            <ArrowRight size={14} color="var(--text-muted)" />
                        </div>
                        <div style={{ marginTop: 16 }}>
                            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>{myClients.length}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Клиентов</div>
                        </div>
                    </div>
                    <div className="card card-clickable" onClick={() => navigate('/properties')} style={{ padding: 18, border: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ background: 'var(--primary-light)', padding: 10, borderRadius: 10, color: 'var(--primary)' }}>
                                <Home size={20} />
                            </div>
                            <ArrowRight size={14} color="var(--text-muted)" />
                        </div>
                        <div style={{ marginTop: 16 }}>
                            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>{myProperties.length}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Объектов</div>
                        </div>
                    </div>
                    <div className="card card-clickable" onClick={() => navigate('/requests')} style={{ padding: 18, border: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ background: 'var(--primary-light)', padding: 10, borderRadius: 10, color: 'var(--primary)' }}>
                                <Search size={20} />
                            </div>
                            <ArrowRight size={14} color="var(--text-muted)" />
                        </div>
                        <div style={{ marginTop: 16 }}>
                            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>{myRequests.length}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Запросов</div>
                        </div>
                    </div>
                    <div className="card card-clickable" onClick={() => navigate('/matches')} style={{ padding: 18, border: '1px solid var(--border-light)', background: 'var(--accent-soft)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ background: 'white', padding: 10, borderRadius: 10, color: 'var(--primary)', boxShadow: '0 2px 4px rgba(204, 204, 37, 0.2)' }}>
                                <Sparkles size={20} style={{ color: '#858518' }} />
                            </div>
                            <ArrowRight size={14} color="#858518" />
                        </div>
                        <div style={{ marginTop: 16 }}>
                            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', color: '#858518' }}>{myMatches.length}</div>
                            <div style={{ fontSize: 11, color: '#858518', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>Совпадений</div>
                        </div>
                    </div>
                </div>

                {/* New matches — Feed style */}
                {newMatches.length > 0 && (
                    <div>
                        <div className="section-header" style={{ marginBottom: 16 }}>
                            <span className="section-title" style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}>Новые подборы</span>
                            <span className="section-link" onClick={() => navigate('/matches')} style={{ fontWeight: 700 }}>Все →</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {newMatches.map(m => {
                                const prop = state.properties.find(p => p.id === m.property_id);
                                const req = state.requests.find(r => r.id === m.request_id);
                                const client = req ? state.clients.find(c => c.id === req.client_id) : null;
                                return (
                                    <div key={m.id} className="list-row" onClick={() => navigate(`/matches/${m.id}`)} style={{ padding: '14px 18px', border: '1px solid var(--border-light)' }}>
                                        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#858518', fontWeight: 800, fontSize: 15 }}>
                                            {m.score}%
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--primary)' }}>{client?.full_name?.split(' ')[0]}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{prop?.address || 'Объект без адреса'}</div>
                                        </div>
                                        <span className={`badge badge-${m.match_level === 'perfect' ? 'success' : 'warning'}`} style={{ fontSize: 11, padding: '4px 10px' }}>
                                            {m.match_level === 'perfect' ? 'Идеал' : 'Хорошо'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Analytics Widget — Dark Premium */}
                <div>
                    <div className="section-header" style={{ marginBottom: 16 }}>
                        <span className="section-title" style={{ fontSize: 18, fontWeight: 800 }}>Эффективность</span>
                        <TrendingUp size={18} color="var(--text-muted)" />
                    </div>
                    <div className="card" style={{ padding: '24px 20px', background: 'var(--primary)', color: 'white', overflow: 'hidden', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28 }}>
                            <div>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Конверсия</div>
                                <div style={{ fontSize: 36, fontWeight: 900, marginTop: 6, display: 'flex', alignItems: 'baseline' }}>
                                    82<span style={{ fontSize: 18, opacity: 0.4, marginLeft: 2 }}>%</span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Цикл сделки</div>
                                <div style={{ fontSize: 36, fontWeight: 900, marginTop: 6, display: 'flex', alignItems: 'baseline' }}>
                                    14<span style={{ fontSize: 18, opacity: 0.4, marginLeft: 2 }}>дн.</span>
                                </div>
                            </div>
                        </div>

                        {/* Animated Chart */}
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7, height: 60 }}>
                            {[35, 50, 42, 90, 65, 80, 48].map((h, i) => (
                                <div key={i} style={{
                                    flex: 1,
                                    height: `${h}%`,
                                    background: i === 3 ? 'var(--accent)' : 'rgba(255,255,255,0.15)',
                                    borderRadius: '5px 5px 2px 2px',
                                    transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                                }} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Quick actions — Pill style */}
                <div style={{ marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <button className="btn btn-primary" style={{ borderRadius: '16px', height: 52, textTransform: 'none', fontSize: 15, fontWeight: 700 }} onClick={() => navigate('/properties/new')}>
                        <Home size={18} /> Новая продажа
                    </button>
                    <button className="btn btn-secondary" style={{ borderRadius: '16px', height: 52, background: 'var(--surface)', textTransform: 'none', fontSize: 15, fontWeight: 700, border: '1px solid var(--border)' }} onClick={() => navigate('/clients/new')}>
                        <Users size={18} /> Новый клиент
                    </button>
                </div>
            </div>
        </div>
    );
}

export { DashboardPage as default };
