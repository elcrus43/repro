import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatNumber } from '../../utils/format';
import { Sparkles, TrendingUp, Users, Home, Search, Target, ArrowRight } from 'lucide-react';

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

    const user = state.currentUser;
    if (!user) return null;

    return (
        <div className="page fade-in" style={{ background: 'var(--bg)' }}>
            {/* Premium Header — Open Design */}
            <div className="topbar" style={{ 
                padding: '48px 24px 24px', 
                flexDirection: 'column', 
                alignItems: 'stretch', 
                gap: 20, 
                height: 'auto', 
                borderBottom: 'none', 
                background: 'transparent', 
                backdropFilter: 'none', 
                position: 'relative' 
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="fade-in" style={{ animationDelay: '0.1s' }}>
                        <h1 className="font-oswald" style={{ fontSize: 34, fontWeight: 300, color: 'var(--text)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                            Привет, {user.full_name?.split(' ')[1] || user.full_name?.split(' ')[0] || user.full_name}!
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                            <div style={{ 
                                padding: '6px 12px', fontSize: 10, fontWeight: 400, letterSpacing: '0.05em',
                                background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6
                            }}>
                                <Target size={12} /> 
                                {user.agency_name || 'Частный риэлтор'}
                            </div>
                        </div>
                    </div>
                    <div className="card-clickable" style={{
                        width: 56, height: 56, borderRadius: 20,
                        background: 'linear-gradient(135deg, var(--primary) 0%, #003db3 100%)', 
                        color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 400,
                        boxShadow: '0 12px 24px rgba(0, 82, 255, 0.25)',
                        border: '2px solid white',
                        fontFamily: "'Oswald', sans-serif"
                    }} onClick={() => navigate('/profile')}>
                        {user.full_name?.split(' ').map(n => n[0]).join('')}
                    </div>
                </div>
            </div>

            <div className="page-content" style={{ gap: 28, padding: '24px 20px', paddingBottom: 120 }}>
                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="card card-clickable" onClick={() => navigate('/clients')} style={{ padding: 24, borderRadius: 32, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', background: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ background: 'var(--bg-light)', padding: 12, borderRadius: 14, color: 'var(--primary)' }}>
                                <Users size={22} />
                            </div>
                            <ArrowRight size={14} color="var(--text-muted)" />
                        </div>
                        <div style={{ marginTop: 20 }}>
                            <div className="font-oswald" style={{ fontSize: 32, fontWeight: 300, color: 'var(--text)' }}>{myClients.length}</div>
                            <div className="font-oswald" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, letterSpacing: '0.05em', marginTop: 4 }}>Клиенты</div>
                        </div>
                    </div>
                    <div className="card card-clickable" onClick={() => navigate('/properties')} style={{ padding: 24, borderRadius: 32, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', background: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ background: 'var(--bg-light)', padding: 12, borderRadius: 14, color: 'var(--primary)' }}>
                                <Home size={22} />
                            </div>
                            <ArrowRight size={14} color="var(--text-muted)" />
                        </div>
                        <div style={{ marginTop: 20 }}>
                            <div className="font-oswald" style={{ fontSize: 32, fontWeight: 300, color: 'var(--text)' }}>{myProperties.length}</div>
                            <div className="font-oswald" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, letterSpacing: '0.05em', marginTop: 4 }}>Объекты</div>
                        </div>
                    </div>
                    <div className="card card-clickable" onClick={() => navigate('/requests')} style={{ padding: 24, borderRadius: 32, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', background: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ background: 'var(--bg-light)', padding: 12, borderRadius: 14, color: 'var(--primary)' }}>
                                <Search size={22} />
                            </div>
                            <ArrowRight size={14} color="var(--text-muted)" />
                        </div>
                        <div style={{ marginTop: 20 }}>
                            <div className="font-oswald" style={{ fontSize: 32, fontWeight: 300, color: 'var(--text)' }}>{myRequests.length}</div>
                            <div className="font-oswald" style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, letterSpacing: '0.05em', marginTop: 4 }}>Запросы</div>
                        </div>
                    </div>
                    <div className="card card-clickable" onClick={() => navigate('/matches')} style={{ padding: 24, borderRadius: 32, border: 'none', boxShadow: '0 12px 32px rgba(212, 212, 43, 0.15)', background: 'linear-gradient(135deg, var(--accent) 0%, #b8b825 100%)', color: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ background: 'rgba(255,255,255,0.95)', padding: 12, borderRadius: 14, color: '#858518' }}>
                                <Sparkles size={22} />
                            </div>
                            <ArrowRight size={14} color="white" />
                        </div>
                        <div style={{ marginTop: 20 }}>
                            <div className="font-oswald" style={{ fontSize: 32, fontWeight: 300 }}>{myMatches.length}</div>
                            <div className="font-oswald" style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 400, letterSpacing: '0.05em', marginTop: 4 }}>Совпадения</div>
                        </div>
                    </div>
                </div>

                {/* New Matches Feed */}
                {newMatches.length > 0 && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <span className="font-oswald" style={{ fontSize: 18, fontWeight: 300, letterSpacing: '0.05em' }}>Новые совпадения</span>
                            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--primary)' }} onClick={() => navigate('/matches')}>Все →</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {newMatches.map(m => {
                                const prop = state.properties.find(p => p.id === m.property_id);
                                const req = state.requests.find(r => r.id === m.request_id);
                                const client = req ? state.clients.find(c => c.id === req.client_id) : null;
                                return (
                                    <div key={m.id} className="card card-clickable" onClick={() => navigate(`/matches/${m.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderRadius: 24, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', background: 'white' }}>
                                        <div style={{ width: 48, height: 48, borderRadius: 16, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#858518', fontWeight: 300, fontSize: 15, fontFamily: "'Oswald', sans-serif" }}>
                                            {m.score}%
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div className="font-oswald" style={{ fontWeight: 400, fontSize: 15, color: 'var(--text)' }}>{client?.full_name?.split(' ')[0]}</div>
                                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{prop?.address || 'Объект без адреса'}</div>
                                        </div>
                                        <div style={{ 
                                            padding: '4px 8px', borderRadius: 6, fontSize: 9, fontWeight: 400, 
                                            background: m.match_level === 'perfect' ? 'var(--success-light)' : 'var(--warning-light)',
                                            color: m.match_level === 'perfect' ? 'var(--success)' : 'var(--warning)'
                                        }}>
                                            {m.match_level === 'perfect' ? 'Идеал' : 'Хорошо'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Analytics Widget */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <span className="font-oswald" style={{ fontSize: 18, fontWeight: 300, letterSpacing: '0.05em' }}>Эффективность</span>
                        <TrendingUp size={18} color="var(--primary)" />
                    </div>
                    <div className="card" style={{ 
                        padding: '28px 24px', 
                        background: 'linear-gradient(135deg, var(--primary) 0%, #003db3 100%)', 
                        color: 'white', 
                        border: 'none',
                        borderRadius: 32,
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 12px 40px rgba(0, 82, 255, 0.2)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32, position: 'relative', zIndex: 1 }}>
                            <div>
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', fontWeight: 400 }}>Конверсия</div>
                                <div className="font-oswald" style={{ fontSize: 42, fontWeight: 300, marginTop: 4, display: 'flex', alignItems: 'baseline' }}>
                                    82<span style={{ fontSize: 18, opacity: 0.6, marginLeft: 2 }}>%</span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', fontWeight: 400 }}>Цикл сделки</div>
                                <div className="font-oswald" style={{ fontSize: 42, fontWeight: 300, marginTop: 4, display: 'flex', alignItems: 'baseline' }}>
                                    14<span style={{ fontSize: 18, opacity: 0.6, marginLeft: 2 }}>дн</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 64, position: 'relative', zIndex: 1 }}>
                            {[35, 50, 42, 90, 65, 80, 48].map((h, i) => (
                                <div key={i} style={{
                                    flex: 1,
                                    height: `${h}%`,
                                    background: i === 3 ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
                                    borderRadius: '6px 6px 2px 2px',
                                    boxShadow: i === 3 ? '0 0 15px rgba(212, 212, 43, 0.4)' : 'none'
                                }} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Quick actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <button className="btn btn-primary" style={{ borderRadius: 20, height: 56, fontSize: 14, fontWeight: 300, letterSpacing: '0.05em' }} onClick={() => navigate('/properties/new')}>
                        + Объект
                    </button>
                    <button className="btn btn-secondary" style={{ borderRadius: 20, height: 56, background: 'white', color: 'var(--text)', border: '1px solid var(--border-light)', fontSize: 14, fontWeight: 300, letterSpacing: '0.05em' }} onClick={() => navigate('/clients/new')}>
                        + Клиент
                    </button>
                </div>
            </div>
        </div>
    );
}

export default DashboardPage;
