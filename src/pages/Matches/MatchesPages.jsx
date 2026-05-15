import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { formatPrice, getLevelLabel } from '../../utils/matching';
import { stripPhone, formatNumber } from '../../utils/format';
import { MessageTemplateModal } from '../Messaging/MessageTemplateModal';
import { Share2, Send, Pencil, Trash, Sparkles, ChevronRight, Phone, Wallet, Activity, TrendingUp } from 'lucide-react';
import { API_BASE } from '../../config';

export function MatchesPage() {
    const { state } = useApp();
    const navigate = useNavigate();
    const user = state.currentUser;
    const [filter, setFilter] = useState('all');
    const params = new URLSearchParams(window.location.search);
    const propFilter = params.get('property');
    const reqFilter = params.get('request');

    const matches = state.matches
        .filter(m => {
            if (user?.role === 'admin') return true;
            const req = state.requests.find(r => r.id === m.request_id);
            return req?.realtor_id === user?.id;
        })
        .filter(m => !propFilter || m.property_id === propFilter)
        .filter(m => !reqFilter || m.request_id === reqFilter)
        .filter(m => {
            if (filter === 'all') return m.status !== 'rejected';
            if (filter === 'new') return m.status === 'new';
            if (filter === 'showing') return m.status === 'showing_planned' || m.status === 'showing_done';
            if (filter === 'deal') return m.status === 'deal';
            if (filter === 'rejected') return m.status === 'rejected';
            return true;
        })
        .sort((a, b) => b.score - a.score);

    return (
        <div className="page fade-in">
            {/* Sticky Header — Open Design */}
            <div className="topbar sticky" style={{ 
                background: 'rgba(255,255,255,0.7)', 
                backdropFilter: 'blur(24px) saturate(180%)',
                padding: '20px',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                height: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span className="topbar-title font-oswald" style={{ letterSpacing: '0.01em', fontSize: 22, fontWeight: 300 }}>Умные совпадения</span>
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 300, fontFamily: "'Oswald', sans-serif" }}>
                        {matches.length}
                    </div>
                </div>
            </div>

            <div className="tab-filters" style={{ padding: '8px 20px', gap: 12, overflowX: 'auto' }}>
                {[['all', 'Все'], ['new', 'Новые'], ['showing', 'Показы'], ['deal', 'Сделки'], ['rejected', 'Отказы']].map(([v, l]) => (
                    <button key={v} 
                        className={`tab-filter ${filter === v ? 'active' : ''}`} 
                        style={{ 
                            padding: '8px 16px', borderRadius: 12, border: 'none', fontSize: 13, fontWeight: 300,
                            background: filter === v ? 'var(--primary)' : 'white',
                            color: filter === v ? 'white' : 'var(--text-secondary)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }}
                        onClick={() => setFilter(v)}
                    >
                        {l}
                    </button>
                ))}
            </div>

            <div className="page-content" style={{ padding: '12px 20px 120px', gap: 16 }}>
                {matches.length === 0 ? (
                    <div className="empty-state" style={{ padding: '60px 0' }}>
                        <div style={{ width: 80, height: 80, background: 'var(--bg-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--text-muted)' }}>
                            <Sparkles size={32} />
                        </div>
                        <div className="font-oswald" style={{ fontSize: 20, fontWeight: 300, marginBottom: 8 }}>Совпадений нет</div>
                        <div style={{ color: 'var(--text-muted)', marginBottom: 24, fontWeight: 200 }}>Добавьте больше объектов или уточните запросы</div>
                    </div>
                ) : (
                    matches.map(m => <MatchCard key={m.id} match={m} onClick={() => navigate(`/matches/${m.id}`)} />)
                )}
            </div>
        </div>
    );
}

function MatchCard({ match: m, onClick }) {
    const { state } = useApp();
    const user = state.currentUser;
    const prop = state.properties.find(p => p.id === m.property_id);
    const req = state.requests.find(r => r.id === m.request_id);
    const buyer = req ? state.clients.find(c => c.id === req.client_id) : null;
    const seller = prop ? state.clients.find(c => c.id === prop.client_id) : null;
    const lvl = getLevelLabel(m.match_level);

    const statusLabels = { new: 'Новый', viewed: 'Просмотрен', showing_planned: 'Показ', showing_done: 'Показ проведён', rejected: 'Отклонён', deal: 'Сделка' };
    const statusColors = { new: '#3b82f6', viewed: '#64748b', showing_planned: '#f59e0b', showing_done: '#10b981', rejected: '#ef4444', deal: '#8b5cf6' };

    return (
        <div className="card card-clickable" onClick={onClick} style={{ 
            padding: 24, borderRadius: 32, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', background: 'white', position: 'relative', overflow: 'hidden'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ 
                        width: 44, height: 44, borderRadius: 12, background: m.match_level === 'perfect' ? 'var(--success-light)' : 'var(--warning-light)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.match_level === 'perfect' ? 'var(--success)' : 'var(--warning)',
                        fontWeight: 300, fontFamily: "'Oswald', sans-serif", fontSize: 16
                    }}>
                        {m.score}%
                    </div>
                    <div className="font-oswald" style={{ fontWeight: 300, fontSize: 14, letterSpacing: '0.02em', color: 'var(--text)' }}>
                        {lvl.label}
                    </div>
                </div>
                <div style={{ 
                    padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 300,
                    background: `${statusColors[m.status] || '#64748b'}15`,
                    color: statusColors[m.status] || '#64748b'
                }}>
                    {statusLabels[m.status] || m.status}
                </div>
            </div>

            {/* Progress Bar */}
            <div style={{ background: 'var(--bg-light)', borderRadius: 4, height: 6, overflow: 'hidden', marginBottom: 20 }}>
                <div style={{ 
                    width: `${m.score}%`, height: '100%', background: m.match_level === 'perfect' ? 'var(--success)' : m.match_level === 'good' ? 'var(--warning)' : 'var(--orange)',
                    transition: 'width 0.8s ease-out'
                }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Property Snippet */}
                <div style={{ padding: '12px 16px', background: 'var(--bg-light)', borderRadius: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 2 }}>Объект</div>
                        <div style={{ fontWeight: 300, fontSize: 14 }}>{prop ? `${formatPrice(prop.price)} · ${prop.address || prop.city}` : 'Объект удалён'}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', margin: '-6px 0' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', zIndex: 1 }}>
                        <TrendingUp size={16} />
                    </div>
                </div>

                {/* Buyer Snippet */}
                <div style={{ padding: '12px 16px', background: 'var(--bg-light)', borderRadius: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 2 }}>Клиент</div>
                        <div style={{ fontWeight: 300, fontSize: 14 }}>{buyer?.full_name || 'Контакт скрыт'} · до {formatPrice(req?.budget_max)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function MatchDetailPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const user = state.currentUser;
    const { id: matchId } = useParams();
    const { toast } = useToastContext();
    const match = state.matches.find(m => m.id === matchId);

    const [comment, setComment] = useState(match?.realtor_comment || '');
    const [showShowingForm, setShowShowingForm] = useState(false);
    const [showingDate, setShowingDate] = useState('');
    const [saved, setSaved] = useState(false);
    const [publicLink, setPublicLink] = useState(null);
    const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);

    React.useEffect(() => {
        if (match && match.status === 'new') {
            dispatch({ type: 'UPDATE_MATCH', match: { ...match, status: 'viewed' } });
        }
    }, [match?.id]);

    if (!match) return (
        <div className="page">
            <div className="topbar">
                <button className="topbar-back" onClick={() => navigate('/matches')}>←</button>
                <span className="topbar-title font-oswald" style={{ fontWeight: 300 }}>Не найдено</span>
            </div>
        </div>
    );

    const prop = state.properties.find(p => p.id === match.property_id);
    const req = state.requests.find(r => r.id === match.request_id);
    const buyer = req ? state.clients.find(c => c.id === req.client_id) : null;
    const seller = prop ? state.clients.find(c => c.id === prop.client_id) : null;
    const lvl = getLevelLabel(match.match_level);

    const statusLabels = { new: 'Новый', viewed: 'Просмотрен', showing_planned: 'Показ', showing_done: 'Показ проведён', rejected: 'Отклонён', deal: 'Сделка' };
    const statusColors = { new: '#3b82f6', viewed: '#64748b', showing_planned: '#f59e0b', showing_done: '#10b981', rejected: '#ef4444', deal: '#8b5cf6' };

    function handleReject() {
        const reason = window.prompt('Причина отказа (необязательно):') || '';
        dispatch({ type: 'UPDATE_MATCH', match: { ...match, status: 'rejected', rejection_reason: reason } });
        navigate('/matches');
    }

    function handleDeal() {
        navigate('/tasks', {
            state: {
                prefillDeal: {
                    title: `Сделка: ${seller?.full_name || 'Продавец'} → ${buyer?.full_name || 'Покупатель'}`,
                    seller_id: seller?.id || '',
                    buyer_id: buyer?.id || '',
                    property_id: prop?.id || '',
                    price: prop?.price || req?.budget_max || '',
                    commission: prop?.commission || '',
                    deal_date: '',
                }
            }
        });
    }

    function handleScheduleShowing() {
        if (!showingDate) return;
        dispatch({
            type: 'ADD_SHOWING',
            showing: { match_id: matchId, property_id: match.property_id, client_id: req?.client_id, realtor_id: match.realtor_id, showing_date: showingDate, status: 'planned' }
        });
        dispatch({ type: 'UPDATE_MATCH', match: { ...match, status: 'viewed' } });
        setShowShowingForm(false);
        navigate('/history');
    }

    async function handleGeneratePublicLink() {
        if (!prop) return;
        setIsGeneratingLink(true);
        try {
            const res = await fetch(`${API_BASE}/p/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ property_id: prop.id, user_id: user?.id })
            });
            const data = await res.json();
            const link = `${window.location.origin}/p/${data.slug}`;
            setPublicLink(link);
            navigator.clipboard.writeText(link);
            toast.success('Публичная ссылка скопирована!');
        } catch (_e) {
            toast.error('Ошибка при генерации ссылки');
        } finally {
            setIsGeneratingLink(false);
        }
    }

    return (
        <div className="page fade-in" style={{ paddingBottom: 120 }}>
            <div className="topbar" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px) saturate(180%)', padding: '20px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <button className="topbar-back" onClick={() => navigate('/matches')} style={{ borderRadius: 14 }}>←</button>
                <span className="topbar-title font-oswald" style={{ letterSpacing: '0.01em', fontWeight: 300 }}>Анализ совпадения</span>
                <div style={{ 
                    width: 44, height: 44, borderRadius: 14, background: match.match_level === 'perfect' ? 'var(--success-light)' : 'var(--warning-light)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: match.match_level === 'perfect' ? 'var(--success)' : 'var(--warning)',
                    fontWeight: 300, fontFamily: "'Oswald', sans-serif"
                }}>
                    {match.score}%
                </div>
            </div>

            <div className="page-content" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {/* Score Summary Card */}
                <div className="card" style={{ padding: '28px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span className="font-oswald" style={{ fontWeight: 300, fontSize: 18 }}>{lvl.label}</span>
                        <div style={{ 
                            padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 300,
                            background: `${statusColors[match.status] || '#64748b'}15`,
                            color: statusColors[match.status] || '#64748b'
                        }}>
                            {statusLabels[match.status]}
                        </div>
                    </div>
                    <div style={{ background: 'var(--bg-light)', borderRadius: 6, height: 10, overflow: 'hidden', marginBottom: 8 }}>
                        <div style={{ width: `${match.score}%`, height: '100%', background: match.match_level === 'perfect' ? 'var(--success)' : match.match_level === 'good' ? 'var(--warning)' : 'var(--orange)', transition: 'width 1s ease-out' }} />
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 200, color: 'var(--text-muted)' }}>{match.score} / 100</div>
                </div>

                {/* Property Card */}
                {prop && (
                    <div className="card card-clickable" onClick={() => navigate(`/properties/${prop.id}`)} style={{ padding: '24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: 'white' }}>
                        <div className="font-oswald" style={{ fontWeight: 300, color: 'var(--primary)', fontSize: 11, marginBottom: 8 }}>Объект в продаже</div>
                        <div className="font-oswald" style={{ fontWeight: 300, fontSize: 20, marginBottom: 4 }}>{formatPrice(prop.price)}</div>
                        <div style={{ fontSize: 14, fontWeight: 300, marginBottom: 4 }}>{prop.rooms > 0 ? `${prop.rooms}-комнатная` : 'Студия'} · {prop.area_total}м² · {prop.floor}/{prop.floors_total} эт.</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 200 }}>{prop.address}</div>
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'center', margin: '-8px 0' }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', zIndex: 1 }}>
                        <TrendingUp size={20} />
                    </div>
                </div>

                {/* Buyer Card */}
                {buyer && (
                    <div className="card card-clickable" onClick={() => navigate(`/clients/${buyer.id}`)} style={{ padding: '24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: 'white' }}>
                        <div className="font-oswald" style={{ fontWeight: 300, color: '#f59e0b', fontSize: 11, marginBottom: 8 }}>Запрос на покупку</div>
                        <div className="font-oswald" style={{ fontWeight: 300, fontSize: 20, marginBottom: 4 }}>{buyer.full_name}</div>
                        {req && (
                            <>
                                <div style={{ fontSize: 14, fontWeight: 300, marginBottom: 4 }}>Бюджет: {req.budget_min ? `${formatPrice(req.budget_min)} — ` : ''}{formatPrice(req.budget_max)}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 200 }}>{req.rooms?.map(r => r === 0 ? 'студия' : `${r}к`).join('/')} · {req.city}</div>
                            </>
                        )}
                    </div>
                )}

                {/* Comments Card */}
                <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: 'white' }}>
                    <div className="font-oswald" style={{ fontWeight: 300, fontSize: 14, marginBottom: 12, color: 'var(--text-muted)' }}>Заметки риелтора</div>
                    <textarea className="form-textarea" style={{ minHeight: 80, borderRadius: 16, background: 'var(--bg-light)', border: 'none', padding: 12, fontWeight: 300 }} value={comment} onChange={e => setComment(e.target.value)} placeholder="Заметки по этому совпадению..." />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
                        <button className="btn btn-secondary btn-sm" style={{ borderRadius: 10, height: 36, padding: '0 16px' }} onClick={() => {
                            dispatch({ type: 'UPDATE_MATCH', match: { ...match, realtor_comment: comment } });
                            setSaved(true);
                            setTimeout(() => setSaved(false), 2000);
                        }}>Сохранить</button>
                        {saved && <span style={{ color: 'var(--success)', fontSize: 12, fontWeight: 300 }}>✓ Сохранено</span>}
                    </div>
                </div>

                {/* Showing Form Section */}
                {showShowingForm && (
                    <div className="card fade-in" style={{ padding: '24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.1)', borderRadius: 32, background: 'white' }}>
                        <div className="font-oswald" style={{ fontWeight: 300, marginBottom: 12 }}>Назначить показ</div>
                        <input className="form-input" style={{ height: 50, borderRadius: 14, background: 'var(--bg-light)', border: 'none', marginBottom: 12 }} type="datetime-local" value={showingDate} onChange={e => setShowingDate(e.target.value)} />
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary" style={{ flex: 1, height: 44, borderRadius: 12 }} onClick={handleScheduleShowing}>Записать</button>
                            <button className="btn btn-secondary" style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none' }} onClick={() => setShowingDate('')}>Очистить</button>
                        </div>
                    </div>
                )}

                {/* Actions Section */}
                {match.status !== 'rejected' && match.status !== 'deal' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                        {!showShowingForm && (
                            <button className="btn btn-primary btn-full" style={{ height: 56, borderRadius: 18, fontSize: 15, fontWeight: 300 }} onClick={() => setShowShowingForm(true)}>Назначить показ</button>
                        )}
                        
                        {buyer && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <a href={`tel:${buyer.phone}`} className="card-clickable" style={{ 
                                    height: 56, borderRadius: 18, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--primary)', border: '1px solid var(--border-light)'
                                }}><Phone size={18} /> <span style={{ fontSize: 13, fontWeight: 300 }}>Звонок</span></a>
                                
                                <button className="card-clickable" style={{ 
                                    height: 56, borderRadius: 18, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--primary)', border: '1px solid var(--border-light)'
                                }} onClick={() => setIsMsgModalOpen(true)}><Send size={18} /> <span style={{ fontSize: 13, fontWeight: 300 }}>Шаблон</span></button>
                            </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <button className="card-clickable" style={{ 
                                height: 56, borderRadius: 18, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-secondary)', border: '1px solid var(--border-light)'
                            }} onClick={handleGeneratePublicLink} disabled={isGeneratingLink}>
                                <Share2 size={18} /> <span style={{ fontSize: 13, fontWeight: 300 }}>Ссылка</span>
                            </button>
                            <button className="card-clickable" style={{ 
                                height: 56, borderRadius: 18, background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--danger)', border: 'none'
                            }} onClick={handleReject}>
                                <Trash size={18} /> <span style={{ fontSize: 13, fontWeight: 300 }}>Отказ</span>
                            </button>
                        </div>

                        {match.status === 'showing_done' && (
                            <button className="btn btn-success btn-full" style={{ height: 56, borderRadius: 18, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#fff', fontWeight: 300 }}>Оформить сделку</button>
                        )}
                    </div>
                )}
            </div>

            <MessageTemplateModal
                isOpen={isMsgModalOpen}
                onClose={() => setIsMsgModalOpen(false)}
                context={{
                    client_name: buyer?.full_name || 'Клиент',
                    property_address: prop?.address || prop?.city || 'Объект',
                    property_price: formatNumber(prop?.price || 0),
                    property_link: publicLink || 'Ссылка будет здесь',
                    agent_name: user?.full_name || 'Ваш риелтор',
                    phone: buyer?.phone || ''
                }}
            />
        </div>
    );
}

export { MatchesPage as default };
