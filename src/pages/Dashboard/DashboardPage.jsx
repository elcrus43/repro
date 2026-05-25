import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatNumber } from '../../utils/format';
import { Sparkles, TrendingUp, Users, Home, Search, Target, ArrowRight } from 'lucide-react';

export function DashboardPage() {
    const { state } = useApp();
    const navigate = useNavigate();

    const myProperties = useMemo(() =>
        state.properties.filter(p => state.currentUser?.role === 'admin' || p.realtor_id === state.currentUser?.id),
        [state.properties, state.currentUser?.role, state.currentUser?.id]
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

    const analyticsData = useMemo(() => {
        const total = myProperties.length;
        const sold = myProperties.filter(p => p.status === 'deal_closed' || p.status === 'sold').length;
        const conversion = total > 0 ? Math.round((sold / total) * 100) : 0;

        const closedProps = myProperties.filter(p => p.updated_at && (p.status === 'deal_closed' || p.status === 'sold'));
        const avgDays = closedProps.length > 0
            ? Math.round(closedProps.reduce((sum, p) => {
                const diff = (new Date(p.updated_at) - new Date(p.created_at)) / (1000 * 60 * 60 * 24);
                return sum + diff;
            }, 0) / closedProps.length)
            : 0;

        const now = new Date();
        const weeks = Array.from({ length: 7 }, (_, i) => {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - (6 - i) * 7);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 7);
            return myProperties.filter(p => {
                const d = new Date(p.created_at);
                return d >= weekStart && d < weekEnd;
            }).length;
        });
        const maxWeek = Math.max(...weeks, 1);
        const weekPercents = weeks.map(w => Math.round((w / maxWeek) * 100));

        return { conversion, avgDays, weekPercents };
    }, [myProperties]);

    const user = state.currentUser;
    if (!user) return null;

    return (
        <div className="page fade-in" style={{ background: 'var(--bg)' }}>
            {/* Premium Header — Open Design */}
            <div className="topbar" style={{ 
                padding: '24px 20px 12px', 
                flexDirection: 'column', 
                alignItems: 'stretch', 
                gap: 8, 
                height: 'auto', 
                borderBottom: 'none', 
                background: 'transparent', 
                backdropFilter: 'none', 
                position: 'relative' 
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div className="fade-in" style={{ animationDelay: '0.1s' }}>
                        <h1 className="font-oswald" style={{ fontSize: 26, fontWeight: 300, color: 'var(--text)', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                            Привет, {user.full_name?.split(' ')[1] || user.full_name?.split(' ')[0] || user.full_name}!
                        </h1>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                            <div style={{ 
                                padding: '4px 10px', fontSize: 10, fontWeight: 400, letterSpacing: '0.05em',
                                background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6
                            }}>
                                <Target size={12} /> 
                                {user.agency_name || 'Частный риэлтор'}
                            </div>
                        </div>
                    </div>
                    <div className="card-clickable" style={{
                        width: 44, height: 44, borderRadius: 14,
                        background: 'linear-gradient(135deg, var(--primary) 0%, #003db3 100%)', 
                        color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 400,
                        boxShadow: '0 8px 16px rgba(0, 82, 255, 0.2)',
                        border: '2px solid white',
                        fontFamily: "'Oswald', sans-serif"
                    }} onClick={() => navigate('/profile')}>
                        {user.full_name?.split(' ').map(n => n[0]).join('')}
                    </div>
                </div>
            </div>

            <div className="page-content" style={{ gap: 20, padding: '16px 16px', paddingBottom: 120 }}>
                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="card card-clickable" onClick={() => navigate('/clients')} style={{ padding: '16px 20px', borderRadius: 20, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', background: 'var(--surface)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ background: 'var(--bg-light)', padding: 8, borderRadius: 10, color: 'var(--primary)' }}>
                                <Users size={18} />
                            </div>
                            <ArrowRight size={12} color="var(--text-muted)" />
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <div className="font-oswald" style={{ fontSize: 28, fontWeight: 300, color: 'var(--text)' }}>{myClients.length}</div>
                            <div className="font-oswald" style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, letterSpacing: '0.05em', marginTop: 4 }}>Клиенты</div>
                        </div>
                    </div>
                    <div className="card card-clickable" onClick={() => navigate('/properties')} style={{ padding: '16px 20px', borderRadius: 20, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', background: 'var(--surface)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ background: 'var(--bg-light)', padding: 8, borderRadius: 10, color: 'var(--primary)' }}>
                                <Home size={18} />
                            </div>
                            <ArrowRight size={12} color="var(--text-muted)" />
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <div className="font-oswald" style={{ fontSize: 28, fontWeight: 300, color: 'var(--text)' }}>{myProperties.length}</div>
                            <div className="font-oswald" style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, letterSpacing: '0.05em', marginTop: 4 }}>Объекты</div>
                        </div>
                    </div>
                    <div className="card card-clickable" onClick={() => navigate('/requests')} style={{ padding: '16px 20px', borderRadius: 20, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', background: 'var(--surface)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ background: 'var(--bg-light)', padding: 8, borderRadius: 10, color: 'var(--primary)' }}>
                                <Search size={18} />
                            </div>
                            <ArrowRight size={12} color="var(--text-muted)" />
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <div className="font-oswald" style={{ fontSize: 28, fontWeight: 300, color: 'var(--text)' }}>{myRequests.length}</div>
                            <div className="font-oswald" style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, letterSpacing: '0.05em', marginTop: 4 }}>Запросы</div>
                        </div>
                    </div>
                    <div className="card card-clickable" onClick={() => navigate('/matches')} style={{ padding: '16px 20px', borderRadius: 20, border: 'none', boxShadow: '0 12px 32px rgba(212, 212, 43, 0.15)', background: 'linear-gradient(135deg, var(--accent) 0%, #b8b825 100%)', color: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ background: 'rgba(255,255,255,0.95)', padding: 8, borderRadius: 10, color: '#858518' }}>
                                <Sparkles size={18} />
                            </div>
                            <ArrowRight size={12} color="white" />
                        </div>
                        <div style={{ marginTop: 12 }}>
                            <div className="font-oswald" style={{ fontSize: 28, fontWeight: 300 }}>{myMatches.length}</div>
                            <div className="font-oswald" style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 400, letterSpacing: '0.05em', marginTop: 4 }}>Совпадения</div>
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
                                    <div key={m.id} className="card card-clickable" onClick={() => navigate(`/matches/${m.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', borderRadius: 24, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', background: 'var(--surface)' }}>
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

                {/* Today's Tasks Widget */}
                {(() => {
                    const today = new Date().toISOString().slice(0, 10);
                    const todayTasks = (state.tasks || []).filter(t => t.date === today || t.due_date === today);
                    const todayShowings = (state.showings || []).filter(s => s.date === today);
                    const todayItems = [...todayTasks, ...todayShowings].slice(0, 5);
                    if (todayItems.length === 0) return null;
                    return (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <span className="font-oswald" style={{ fontSize: 18, fontWeight: 300, letterSpacing: '0.05em' }}>На сегодня</span>
                                <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 400 }}>{todayItems.length} событий</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {todayItems.map((item, i) => {
                                    const client = state.clients.find(c => c.id === item.client_id);
                                    const property = state.properties.find(p => p.id === item.property_id);
                                    return (
                                        <div key={item.id || i} style={{ 
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '12px 16px', background: 'var(--surface)',
                                            borderRadius: 16, border: '1px solid var(--border-light)'
                                        }}>
                                            <div style={{ 
                                                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                                background: item.type === 'call' ? '#3b82f6' : item.type === 'meeting' ? '#10b981' : 'var(--primary)'
                                            }} />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {item.notes || item.title || (item.type === 'call' ? 'Звонок' : 'Встреча')}
                                                </div>
                                                {(client || property) && (
                                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                                                        {client?.full_name?.split(' ')[0] || property?.address}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}

                {/* Analytics Widget */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span className="font-oswald" style={{ fontSize: 16, fontWeight: 300, letterSpacing: '0.05em' }}>Эффективность</span>
                        <TrendingUp size={16} color="var(--primary)" />
                    </div>
                    <div className="card" style={{ 
                        padding: '16px 20px', 
                        background: 'linear-gradient(135deg, var(--primary) 0%, #003db3 100%)', 
                        color: 'white', 
                        border: 'none',
                        borderRadius: 20,
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 8px 24px rgba(0, 82, 255, 0.15)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, position: 'relative', zIndex: 1 }}>
                            <div>
                                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', fontWeight: 400 }}>Конверсия</div>
                                <div className="font-oswald" style={{ fontSize: 32, fontWeight: 300, marginTop: 2, display: 'flex', alignItems: 'baseline' }}>
                                    {analyticsData.conversion}<span style={{ fontSize: 14, opacity: 0.6, marginLeft: 2 }}>%</span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', fontWeight: 400 }}>Цикл сделки</div>
                                <div className="font-oswald" style={{ fontSize: 32, fontWeight: 300, marginTop: 2, display: 'flex', alignItems: 'baseline' }}>
                                    {analyticsData.avgDays > 0 ? analyticsData.avgDays : '—'}<span style={{ fontSize: 14, opacity: 0.6, marginLeft: 2 }}>дн</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 48, position: 'relative', zIndex: 1 }}>
                            {analyticsData.weekPercents.map((h, i) => {
                                const maxIdx = analyticsData.weekPercents.indexOf(Math.max(...analyticsData.weekPercents));
                                return (
                                    <div key={i} style={{
                                        flex: 1,
                                        height: `${h}%`,
                                        background: i === maxIdx ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
                                        borderRadius: '4px 4px 2px 2px',
                                        boxShadow: i === maxIdx ? '0 0 10px rgba(212, 212, 43, 0.4)' : 'none'
                                    }} />
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Quick actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <button className="btn btn-primary" style={{ borderRadius: 20, height: 56, fontSize: 14, fontWeight: 300, letterSpacing: '0.05em' }} onClick={() => navigate('/properties/new')}>
                        + Объект
                    </button>
                    <button className="btn btn-secondary" style={{ borderRadius: 20, height: 56, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border-light)', fontSize: 14, fontWeight: 300, letterSpacing: '0.05em' }} onClick={() => navigate('/clients/new')}>
                        + Клиент
                    </button>
                </div>
            </div>
        </div>
    );
}

export default DashboardPage;
