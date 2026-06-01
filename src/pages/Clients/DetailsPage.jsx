import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { formatPhone, stripPhone, formatNumber } from '../../utils/format';
import { Pencil, Phone, Mail, Calendar, TrendingUp, ChevronRight, Plus, ChevronLeft, Share2, Briefcase, Sparkles, Home, FileText } from 'lucide-react';
import { PROPERTY_TYPES } from '../../data/constants';

const EXCLUDED_PROP_STATUSES = ['sold', 'deal_closed'];
const EXCLUDED_MATCH_STATUSES = ['deal', 'rejected'];

export function DetailsPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast } = useToastContext();
    const client = state.clients.find(c => c.id === id);

    if (!client) return (
        <div className="page">
            <div className="topbar" style={{ background: 'var(--topbar-bg)', backdropFilter: 'blur(20px) saturate(180%)' }}>
                <button className="topbar-back" onClick={() => navigate('/clients')}>←</button>
                <span className="topbar-title font-oswald">Клиент не найден</span>
            </div>
        </div>
    );

    /* ─── Данные клиента ─────────────────────────────── */
    const myProperties = state.properties.filter(p =>
        p.client_id === id || (p.client_ids || []).includes(id)
    );
    // Объекты в продаже — все кроме sold / deal_closed
    const activeProperties = myProperties.filter(p => !EXCLUDED_PROP_STATUSES.includes(p.status));

    const myRequests = state.requests.filter(r =>
        r.client_id === id || (r.client_ids || []).includes(id)
    );

    // Матчи — все кроме deal / rejected
    const propMatches = state.matches.filter(m =>
        !EXCLUDED_MATCH_STATUSES.includes(m.status) &&
        state.properties.find(p => p.id === m.property_id && (p.client_id === id || (p.client_ids || []).includes(id)))
    );
    const reqMatches = state.matches.filter(m =>
        !EXCLUDED_MATCH_STATUSES.includes(m.status) &&
        state.requests.find(r => r.id === m.request_id && (r.client_id === id || (r.client_ids || []).includes(id)))
    );
    const allMatches = [...new Map([...propMatches, ...reqMatches].map(m => [m.id, m])).values()];

    // Сделки клиента (продавец или покупатель)
    const myDeals = state.deals.filter(d => {
        const sellerIds = d.seller_ids || (d.seller_id ? [d.seller_id] : []);
        const buyerIds  = d.buyer_ids  || (d.buyer_id  ? [d.buyer_id]  : []);
        return sellerIds.includes(id) || buyerIds.includes(id);
    });

    // Показы / звонки клиента
    const myShowings = state.showings.filter(s =>
        s.client_id === id || (s.client_ids || []).includes(id)
    ).sort((a, b) => new Date(b.showing_date) - new Date(a.showing_date));

    const totalCommission = myDeals.reduce((sum, d) => sum + (Number(d.commission) || 0), 0);

    const statusLabels = { active: 'Активен', paused: 'Пауза', deal_closed: 'Сделка', refused: 'Отказ' };
    const typeLabels   = { buyer: 'Покупатель', seller: 'Продавец', developer: 'Застройщик', landlord: 'Арендодатель', tenant: 'Арендатор' };

    const matchStatusLabel = { new: 'Новый', viewed: 'Просмотрен', showing_planned: 'Показ', showing_done: 'Показ проведён' };
    const matchStatusColor = { new: '#3b82f6', viewed: '#64748b', showing_planned: '#f59e0b', showing_done: '#10b981' };
    const dealStatusLabel  = { active: 'Активна', closed: 'Закрыта', cancelled: 'Отменена' };
    const dealStatusColor  = { active: 'var(--primary)', closed: '#10b981', cancelled: 'var(--danger)' };

    /* ─── Обработчики ───────────────────────────────── */
    function handleCall() {
        const callNote = {
            id: crypto.randomUUID(),
            realtor_id: state.currentUser?.id,
            client_id: id,
            property_id: null,
            showing_date: new Date().toISOString(),
            status: 'completed',
            client_feedback: 'interested',
            feedback_comment: `Звонок клиенту ${client.full_name}`,
            event_type: 'call',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        dispatch({ type: 'ADD_SHOWING', showing: callNote });
        toast.success('Звонок зарегистрирован');
    }

    function handleShareLink() {
        if (!client.public_token) { toast.error('У клиента нет публичного токена'); return; }
        const link = window.location.origin + '/c/' + client.public_token;
        navigator.clipboard.writeText(link)
            .then(() => toast.success('Ссылка скопирована'))
            .catch(() => toast.error('Не удалось скопировать ссылку'));
    }

    function handleCreateDeal() {
        const sellerIds = myProperties.length > 0 ? [id] : [];
        const buyerIds  = myRequests.length  > 0 ? [id] : [];
        navigate('/tasks', {
            state: {
                prefillDeal: {
                    title: `Сделка: ${client.full_name}`,
                    seller_ids: sellerIds,
                    buyer_ids: buyerIds,
                    property_id: myProperties[0]?.id || '',
                    price: myProperties[0]?.price ? String(myProperties[0].price) : '',
                    commission: myProperties[0]?.commission ? String(myProperties[0].commission) : '',
                    deal_date: '',
                }
            }
        });
    }

    const initial  = client.full_name?.charAt(0).toUpperCase() || '?';
    const colors   = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    const avatarBg = colors[initial.charCodeAt(0) % colors.length];

    return (
        <div className="page fade-in" style={{ background: 'var(--surface)' }}>
            {/* ── Topbar ── */}
            <div className="topbar sticky" style={{
                background: 'var(--topbar-bg)', backdropFilter: 'blur(24px) saturate(180%)',
                padding: '20px', borderBottom: '1px solid var(--border-light)',
                zIndex: 1000, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <button onClick={() => navigate('/clients')} className="card-clickable" style={{
                    width: 44, height: 44, borderRadius: 14, border: 'none',
                    background: 'var(--surface)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', color: 'var(--text)'
                }}>
                    <ChevronLeft size={20} />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <span className="font-oswald" style={{ fontSize: 18, fontWeight: 300, letterSpacing: '0.01em', color: 'var(--text)' }}>
                        Профиль клиента
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300, opacity: 0.6 }}>Управление</span>
                </div>
                <button className="card-clickable" onClick={() => navigate(`/clients/${id}/edit`)} style={{
                    width: 40, height: 40, borderRadius: 12, border: 'none',
                    background: 'var(--primary-light)', color: 'var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <Pencil size={18} />
                </button>
            </div>

            <div className="page-content" style={{ padding: '20px 20px 120px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* ── Профиль ── */}
                <div className="card" style={{ padding: '28px 24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: 'var(--surface)', textAlign: 'center' }}>
                    <div className="font-oswald" style={{ fontSize: 24, fontWeight: 300, color: 'var(--text)', marginBottom: 8 }}>{client.full_name}</div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                        {client.client_types?.map(t => (
                            <span key={t} style={{ padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 300, background: 'var(--primary-light)', color: 'var(--primary)' }}>
                                {typeLabels[t]}
                            </span>
                        ))}
                        <span style={{
                            padding: '6px 12px', borderRadius: 10, fontSize: 11, fontWeight: 300,
                            background: client.status === 'active' ? '#ecfdf5' : '#fef3c7',
                            color: client.status === 'active' ? '#10b981' : '#f59e0b'
                        }}>{statusLabels[client.status]}</span>
                    </div>

                    {client.public_token && (
                        <button className="card-clickable" onClick={handleShareLink} style={{
                            width: '100%', height: 44, borderRadius: 12, border: '1px solid var(--border)',
                            background: 'var(--surface)', color: 'var(--primary)', fontWeight: 300, fontSize: 14,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12
                        }}>
                            <Share2 size={16} /> Поделиться подборкой
                        </button>
                    )}

                    <div style={{ display: 'flex', gap: 12, marginTop: 12, justifyContent: 'center' }}>
                        <a href={`tel:+${stripPhone(client.phone)}`} className="card-clickable" onClick={handleCall} style={{
                            width: 48, height: 48, borderRadius: 16, background: 'var(--bg-light)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)'
                        }}><Phone size={20} /></a>
                        <a href={`https://wa.me/${stripPhone(client.phone)}`} target="_blank" rel="noopener noreferrer" className="card-clickable" style={{
                            width: 48, height: 48, borderRadius: 16, background: '#e7f9ee',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#25D366'
                        }}>
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                        </a>
                        <a href={`https://t.me/+${stripPhone(client.phone)}`} target="_blank" rel="noopener noreferrer" className="card-clickable" style={{
                            width: 48, height: 48, borderRadius: 16, background: '#e1f3ff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0088cc'
                        }}>
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" /></svg>
                        </a>
                    </div>
                </div>

                {/* ── Финансовые метрики ── */}
                <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div className="font-oswald" style={{ fontWeight: 300, fontSize: 13, letterSpacing: '0.05em', opacity: 0.8 }}>Комиссия по сделкам</div>
                        <TrendingUp size={20} style={{ opacity: 0.8 }} />
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 300, marginBottom: 4, fontFamily: "'Oswald', sans-serif" }}>{formatNumber(totalCommission)} ₽</div>
                    <div style={{ fontSize: 13, opacity: 0.9 }}>{myDeals.length > 0 ? `${myDeals.length} ${myDeals.length === 1 ? 'сделка' : myDeals.length < 5 ? 'сделки' : 'сделок'}` : 'Сделок пока нет'}</div>
                </div>

                {/* ── Статистика ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div className="card card-clickable" onClick={() => navigate(`/properties?client=${id}`)} style={{ padding: '16px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 24, background: 'var(--surface)', textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 300, color: 'var(--primary)', fontFamily: "'Oswald', sans-serif" }}>{myProperties.length}</div>
                        <div style={{ fontSize: 10, fontWeight: 300, color: 'var(--text-secondary)', marginTop: 2 }}>Объектов</div>
                    </div>
                    <div className="card card-clickable" onClick={() => navigate(`/requests?client=${id}`)} style={{ padding: '16px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 24, background: 'var(--surface)', textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 300, color: '#f59e0b', fontFamily: "'Oswald', sans-serif" }}>{myRequests.length}</div>
                        <div style={{ fontSize: 10, fontWeight: 300, color: 'var(--text-secondary)', marginTop: 2 }}>Запросов</div>
                    </div>
                    <div className="card card-clickable" onClick={() => navigate('/tasks')} style={{ padding: '16px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 24, background: 'var(--surface)', textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 300, color: '#10b981', fontFamily: "'Oswald', sans-serif" }}>{myDeals.length}</div>
                        <div style={{ fontSize: 10, fontWeight: 300, color: 'var(--text-secondary)', marginTop: 2 }}>Сделок</div>
                    </div>
                </div>

                {/* ── Контакты ── */}
                <div className="card" style={{ padding: '28px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: 'var(--surface)' }}>
                    <div className="font-oswald" style={{ fontWeight: 300, fontSize: 18, letterSpacing: '0.02em', color: 'var(--text)', marginBottom: 20 }}>Контактные данные</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <a href={`tel:+${stripPhone(client.phone)}`} onClick={handleCall} className="card-clickable" style={{ display: 'flex', alignItems: 'center', gap: 16, textDecoration: 'none', color: 'inherit', width: '100%', borderRadius: 14, padding: '4px', margin: '-4px' }}>
                            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--bg-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Phone size={20} /></div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 300, color: 'var(--text-muted)' }}>Телефон</div>
                                <div style={{ fontSize: 16, fontWeight: 300, color: 'var(--text)' }}>{formatPhone(client.phone)}</div>
                            </div>
                        </a>
                        {client.email && (
                            <a href={`mailto:${client.email}`} className="card-clickable" style={{ display: 'flex', alignItems: 'center', gap: 16, textDecoration: 'none', color: 'inherit', width: '100%', borderRadius: 14, padding: '4px', margin: '-4px' }}>
                                <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--bg-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Mail size={20} /></div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 11, fontWeight: 300, color: 'var(--text-muted)' }}>Email</div>
                                    <div style={{ fontSize: 16, fontWeight: 300, color: 'var(--text)' }}>{client.email}</div>
                                </div>
                            </a>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--bg-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}><Calendar size={20} /></div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 11, fontWeight: 300, color: 'var(--text-muted)' }}>Клиент с</div>
                                <div style={{ fontSize: 16, fontWeight: 300, color: 'var(--text)' }}>{new Date(client.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Последняя активность ──────────────────────────── */}
                <div className="card" style={{ padding: '28px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: 'var(--surface)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div className="font-oswald" style={{ fontWeight: 300, fontSize: 18, letterSpacing: '0.02em', color: 'var(--text)' }}>Последняя активность</div>
                        <button className="icon-btn" onClick={() => navigate(`/history/new?client_id=${id}`)}><Plus size={18} /></button>
                    </div>

                    {activeProperties.length === 0 && myRequests.length === 0 && allMatches.length === 0 ? (
                        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, opacity: 0.6 }}>Активности пока нет</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                            {/* Объекты в продаже (все статусы кроме sold/deal_closed) */}
                            {activeProperties.map(p => {
                                const propStatusLabel = { active: 'В продаже', reserved: 'Резерв', new: 'Новый' };
                                const propStatusColor = { active: 'var(--primary)', reserved: '#f59e0b', new: '#10b981' };
                                return (
                                    <div key={p.id} className="card-clickable" onClick={() => navigate(`/properties/${p.id}`)}
                                        style={{ padding: '14px 16px', background: 'var(--bg-light)', borderRadius: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                                <Home size={16} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 10, fontWeight: 300, color: propStatusColor[p.status] || 'var(--primary)' }}>
                                                    {propStatusLabel[p.status] || 'Объект в продаже'}
                                                </div>
                                                <div style={{ fontSize: 14, fontWeight: 300 }}>{p.address || p.city}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 200 }}>{p.price ? formatNumber(p.price) + ' ₽' : ''}</div>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} color="var(--text-muted)" />
                                    </div>
                                );
                            })}

                            {/* Запросы на покупку */}
                            {myRequests.map(r => (
                                <div key={r.id} className="card-clickable" onClick={() => navigate(`/requests/${r.id}`)}
                                    style={{ padding: '14px 16px', background: 'var(--bg-light)', borderRadius: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                                            <FileText size={16} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 10, fontWeight: 300, color: '#f59e0b' }}>Запрос на покупку</div>
                                            <div style={{ fontSize: 14, fontWeight: 300 }}>{r.property_types?.map(t => PROPERTY_TYPES[t] || t).join(', ') || 'Любой тип'}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 200 }}>до {r.budget_max ? formatNumber(r.budget_max) + ' ₽' : '—'}</div>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} color="var(--text-muted)" />
                                </div>
                            ))}

                            {/* Совпадения (кроме deal / rejected) */}
                            {allMatches.map(m => {
                                const prop = state.properties.find(p => p.id === m.property_id);
                                return (
                                    <div key={m.id} className="card-clickable" onClick={() => navigate(`/matches/${m.id}`)}
                                        style={{ padding: '14px 16px', background: 'var(--bg-light)', borderRadius: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                                                <Sparkles size={16} />
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div style={{ fontSize: 10, fontWeight: 300, color: matchStatusColor[m.status] || '#64748b' }}>
                                                        Совпадение · {matchStatusLabel[m.status] || m.status}
                                                    </div>
                                                    <div style={{ fontSize: 10, background: `${matchStatusColor[m.status] || '#64748b'}15`, color: matchStatusColor[m.status] || '#64748b', padding: '1px 6px', borderRadius: 6 }}>
                                                        {m.score}%
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: 14, fontWeight: 300 }}>{prop?.address || prop?.city || 'Объект'}</div>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} color="var(--text-muted)" />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Сделки клиента ───────────────────────────────── */}
                <div className="card" style={{ padding: '28px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: 'var(--surface)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div className="font-oswald" style={{ fontWeight: 300, fontSize: 18, letterSpacing: '0.02em', color: 'var(--text)' }}>Сделки</div>
                        <button className="card-clickable" onClick={handleCreateDeal} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 14px', borderRadius: 12, border: 'none',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#fff', fontSize: 12, fontWeight: 300
                        }}>
                            <Briefcase size={14} /> Создать сделку
                        </button>
                    </div>

                    {myDeals.length === 0 ? (
                        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, opacity: 0.6 }}>
                            Сделок пока нет
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {myDeals.map(d => {
                                const prop = state.properties.find(p => p.id === d.property_id);
                                const color = dealStatusColor[d.status] || 'var(--primary)';
                                const sellerIds = d.seller_ids || (d.seller_id ? [d.seller_id] : []);
                                const isSellerRole = sellerIds.includes(id);
                                return (
                                    <div key={d.id} className="card-clickable" onClick={() => navigate('/tasks')}
                                        style={{ padding: '14px 16px', background: 'var(--bg-light)', borderRadius: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                                                <Briefcase size={16} />
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div style={{ fontSize: 10, fontWeight: 300, color }}>
                                                        {dealStatusLabel[d.status] || 'Сделка'} · {isSellerRole ? 'Продавец' : 'Покупатель'}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: 14, fontWeight: 300 }}>{d.title}</div>
                                                {d.price > 0 && (
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 200 }}>{formatNumber(d.price)} ₽</div>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight size={16} color="var(--text-muted)" />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Заметки ── */}
                {client.notes && (
                    <div className="card" style={{ padding: '28px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: 'var(--surface)' }}>
                        <div className="font-oswald" style={{ fontWeight: 300, fontSize: 16, letterSpacing: '0.02em', color: 'var(--text)', marginBottom: 12 }}>Особые заметки</div>
                        <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{client.notes}</div>
                    </div>
                )}
            </div>
        </div>
    );
}
