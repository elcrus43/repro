import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { formatPrice, getLevelLabel } from '../../utils/matching';
import { stripPhone, formatNumber } from '../../utils/format';
import { MessageTemplateModal } from '../Messaging/MessageTemplateModal';
import { Share2, Send } from 'lucide-react';
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
            // Realtor: see matches where they own the REQUEST (matched against all properties)
            const req = state.requests.find(r => r.id === m.request_id);
            return req?.realtor_id === user?.id;
        })
        .filter(m => !propFilter || m.property_id === propFilter)
        .filter(m => !reqFilter || m.request_id === reqFilter)
        .filter(m => {
            if (filter === 'new') return m.status === 'new';
            if (filter === 'showing') return m.status === 'showing_planned' || m.status === 'showing_done';
            if (filter === 'deal') return m.status === 'deal';
            if (filter === 'rejected') return m.status === 'rejected';
            return true;
        })
        .sort((a, b) => b.score - a.score);

    return (
        <div className="page fade-in">
            <div className="topbar">
                <span className="topbar-title">Совпадения</span>
                <span className="badge badge-primary">{matches.length}</span>
            </div>
            <div className="tab-filters">
                {[['all', 'Все'], ['new', 'Новые'], ['showing', 'Показы'], ['deal', 'Сделки'], ['rejected', 'Отказы']].map(([v, l]) => (
                    <button key={v} className={`tab-filter ${filter === v ? 'active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
                ))}
            </div>
            <div className="page-content" style={{ paddingTop: 8 }}>
                {matches.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-title">Нет совпадений</div>
                        <div className="empty-desc">Добавьте объекты и запросы — система автоматически найдёт совпадения</div>
                    </div>
                )}
                {matches.map(m => <MatchCard key={m.id} match={m} onClick={() => navigate(`/matches/${m.id}`)} />)}
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

    const statusLabels = { new: 'Новый', viewed: 'Просмотрен', showing_planned: 'Показ запланирован', showing_done: 'Показ проведён', rejected: 'Отклонён', deal: 'Сделка' };

    return (
        <div className={`match-card ${m.match_level}`} onClick={onClick}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span className={`match-score-badge ${m.match_level}`}>{lvl.label} {m.score}%</span>
                <span className="badge badge-muted" style={{ fontSize: 11 }}>{statusLabels[m.status] || m.status}</span>
            </div>
            {/* Score bar */}
            <div style={{ background: 'var(--border)', borderRadius: 99, height: 5, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ width: m.score + '%', height: '100%', borderRadius: 99, background: m.match_level === 'perfect' ? 'var(--success)' : m.match_level === 'good' ? 'var(--warning)' : 'var(--orange)', transition: 'width 0.6s ease' }} />
            </div>
            {/* Property */}
            <div style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(4px)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 8 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>Продажа</div>
                {prop ? (
                    <>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{formatPrice(prop.price)} · {prop.rooms > 0 ? `${prop.rooms}к` : 'Студия'} · {prop.area_total}м²</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{prop.address}{seller ? ` · ${seller.full_name.split(' ')[0]}` : prop.realtor_id !== user?.id ? ` · ${state.profiles.find(pr => pr.id === prop.realtor_id)?.full_name || 'Агент'}` : ''}</div>
                    </>
                ) : <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Объект удалён</div>}
            </div>
            <div style={{ textAlign: 'center', fontSize: 18, color: 'var(--text-muted)', margin: '4px 0' }}>⇕</div>
            {/* Buyer */}
            <div style={{ background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(4px)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>Покупка / Клиент</div>
                {buyer || req ? (
                    <>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{buyer?.full_name || 'Контакт скрыт'}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{req?.rooms?.map(r => r === 0 ? 'Студия' : `${r}к`).join('/')} · до {formatPrice(req?.budget_max)}</div>
                        {!buyer && req?.realtor_id !== user?.id && <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 2 }}>Агент: {state.profiles.find(pr => pr.id === req.realtor_id)?.full_name || 'Агент'}</div>}
                    </>
                ) : <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Покупка удалена</div>}
            </div>
            {m.mismatched_params?.length > 0 && (
                <div style={{ marginTop: 8, padding: '6px 10px', background: 'var(--warning-light)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: '#92400E' }}>
                    ! {m.mismatched_params[0]}
                </div>
            )}
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

    // Хуки ДОЛЖНЫ быть до любого раннего return
    const [comment, setComment] = useState(match?.realtor_comment || '');
    const [showShowingForm, setShowShowingForm] = useState(false);
    const [showingDate, setShowingDate] = useState('');
    const [saved, setSaved] = useState(false);
    const [publicLink, setPublicLink] = useState(null);
    const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);

    // Mark as viewed when opened
    React.useEffect(() => {
        if (match && match.status === 'new') {
            dispatch({ type: 'UPDATE_MATCH', match: { ...match, status: 'viewed' } });
        }
    }, [match?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!match) return (
        <div className="page"><div className="topbar"><button className="topbar-back" onClick={() => navigate('/matches')}>←</button><span className="topbar-title">Не найдено</span></div></div>
    );

    const prop = state.properties.find(p => p.id === match.property_id);
    const req = state.requests.find(r => r.id === match.request_id);
    const buyer = req ? state.clients.find(c => c.id === req.client_id) : null;
    const seller = prop ? state.clients.find(c => c.id === prop.client_id) : null;
    const lvl = getLevelLabel(match.match_level);

    const statusLabels = { new: 'Новый', viewed: 'Просмотрен', showing_planned: 'Показ', showing_done: 'Показ проведён', rejected: 'Отклонён', deal: 'Сделка' };

    function handleReject() {
        const reason = window.prompt('Причина отказа (необязательно):') || '';
        dispatch({ type: 'UPDATE_MATCH', match: { ...match, status: 'rejected', rejection_reason: reason } });
        navigate('/matches');
    }

    function handleDeal() {
        // Navigate to Deals page with pre-filled data from the match
        navigate('/tasks', {
            state: {
                prefillDeal: {
                    title: `Сделка: ${seller?.full_name || 'Продавец'} → ${buyer?.full_name || 'Покупатель'}`,
                    seller_id: seller?.id || '',
                    buyer_id: buyer?.id || '',
                    property_id: prop?.id || '',
                    price: prop?.price || req?.budget_max || '',
                    commission: prop?.commission || '',
                    deal_date: new Date().toISOString().slice(0, 16),
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
        navigate('/showings');
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
            toast.success('Публичная ссылка скопирована в буфер обмена!');
        } catch (_e) {
            toast.error('Ошибка при генерации ссылки');
        } finally {
            setIsGeneratingLink(false);
        }
    }

    return (
        <div className="page fade-in">
            <div className="topbar">
                <button className="topbar-back" onClick={() => navigate('/matches')}>←</button>
                <span className="topbar-title">Совпадение</span>
                <span className={`match-score-badge ${match.match_level}`}>{match.score}%</span>
            </div>
            <div className="page-content">
                {/* Score bar */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: 16 }}>{lvl.label}</span>
                        <span className="badge badge-muted">{statusLabels[match.status]}</span>
                    </div>
                    <div style={{ background: 'var(--border)', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                        <div style={{ width: match.score + '%', height: '100%', borderRadius: 99, background: match.match_level === 'perfect' ? 'var(--success)' : match.match_level === 'good' ? 'var(--warning)' : 'var(--orange)', transition: 'width 0.6s ease' }} />
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{match.score} / 100</div>
                </div>

                {/* Property */}
                {prop && (
                    <div className="card card-clickable" onClick={() => navigate(`/properties/${prop.id}`)}>
                        <div style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6 }}>ПРОДАЖА</div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>{formatPrice(prop.price)}</div>
                        <div style={{ fontSize: 14, marginTop: 2 }}>{prop.rooms > 0 ? `${prop.rooms}-комнатная` : 'Студия'} · {prop.area_total}м² · {prop.floor}/{prop.floors_total} эт.</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{prop.address}</div>
                        {seller ? (
                            <div style={{ fontSize: 13, color: 'var(--primary)', marginTop: 4 }}>Продавец: {seller.full_name}</div>
                        ) : (
                            prop.realtor_id !== user?.id && <div style={{ fontSize: 13, color: 'var(--primary)', marginTop: 4 }}>Агент продавца: {state.profiles.find(p => p.id === prop.realtor_id)?.full_name}</div>
                        )}
                    </div>
                )}

                <div style={{ textAlign: 'center', fontSize: 24, margin: '0 auto' }}>⇕</div>

                {/* Buyer */}
                {buyer && (
                    <div className="card card-clickable" onClick={() => navigate(`/clients/${buyer.id}`)}>
                        <div style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6 }}>ПОКУПКА</div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{buyer?.full_name || 'Контакт скрыт'}</div>
                        {req && (
                            <>
                                <div style={{ fontSize: 14, marginTop: 2 }}>Бюджет: {req.budget_min ? `${formatPrice(req.budget_min)} — ` : ''}{formatPrice(req.budget_max)}</div>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>Ищет: {req.rooms?.map(r => r === 0 ? 'студию' : `${r}к`).join('/')} · {req.city}</div>
                                {!buyer && req.realtor_id !== user?.id && (
                                    <div style={{ fontSize: 13, color: 'var(--primary)', marginTop: 4 }}>Агент покупателя: {state.profiles.find(p => p.id === req.realtor_id)?.full_name}</div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Financial Breakdown (Alternative Deal Calculator) */}
                {(() => {
                    const sellProp = req?.parent_property_id ? state.properties.find(p => p.id === req.parent_property_id) : null;
                    const targetProp = prop; // matched property

                    if (!sellProp || !targetProp || sellProp.realtor_id !== user?.id) return null;

                    const sellExpenses = (sellProp.deal_expenses?.reduce((sum, ex) => sum + (Number(ex.price) || 0), 0) || 0);
                    const sellCommission = Number(sellProp.commission || 0);
                    const availableBudget = Number(sellProp.price || 0) - sellCommission - sellExpenses + Number(sellProp.surcharge || 0);

                    const buyExpenses = (req.deal_expenses?.reduce((sum, ex) => sum + (Number(ex.price) || 0), 0) || 0);
                    const buyCommission = Number(req.commission || 0);

                    const targetPrice = Number(targetProp.price || 0);
                    const gap = (targetPrice + buyCommission + buyExpenses) - availableBudget;

                    return (
                        <div className="card" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                            <div className="section-title" style={{ marginBottom: 12 }}>Расчет по сделке (Альтернатива)</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)' }}>Продажа (№{sellProp.id.slice(0, 4)})</div>
                                <div className="info-row">
                                    <span className="info-key">Цена продажи</span>
                                    <span className="info-val">{formatPrice(sellProp.price)}</span>
                                </div>
                                <div className="info-row" style={{ color: 'var(--danger)' }}>
                                    <span className="info-key">Комиссия</span>
                                    <span className="info-val">− {formatPrice(sellCommission)}</span>
                                </div>
                                {sellProp.deal_expenses?.map((ex, i) => (
                                    <div key={i} className="info-row" style={{ color: 'var(--danger)', fontSize: 13 }}>
                                        <span className="info-key">{ex.name}</span>
                                        <span className="info-val">− {formatPrice(ex.price)}</span>
                                    </div>
                                ))}
                                {sellProp.surcharge !== 0 && (
                                    <div className="info-row" style={{ color: sellProp.surcharge > 0 ? 'var(--success)' : 'var(--danger)' }}>
                                        <span className="info-key">{sellProp.surcharge > 0 ? 'Доплата клиента' : 'Остаток на руки'}</span>
                                        <span className="info-val">{sellProp.surcharge > 0 ? '+' : '−'} {formatPrice(Math.abs(sellProp.surcharge))}</span>
                                    </div>
                                )}
                                <div className="info-row" style={{ fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 4 }}>
                                    <span className="info-key">Доступный бюджет</span>
                                    <span className="info-val">{formatPrice(availableBudget)}</span>
                                </div>

                                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginTop: 12 }}>Покупка (№{targetProp.id.slice(0, 4)})</div>
                                <div className="info-row">
                                    <span className="info-key">Цена объекта</span>
                                    <span className="info-val">{formatPrice(targetPrice)}</span>
                                </div>
                                {buyCommission > 0 && (
                                    <div className="info-row" style={{ color: 'var(--danger)' }}>
                                        <span className="info-key">Комиссия (покупка)</span>
                                        <span className="info-val">+ {formatPrice(buyCommission)}</span>
                                    </div>
                                )}
                                {req.deal_expenses?.map((ex, i) => (
                                    <div key={i} className="info-row" style={{ color: 'var(--danger)', fontSize: 13 }}>
                                        <span className="info-key">{ex.name}</span>
                                        <span className="info-val">+ {formatPrice(ex.price)}</span>
                                    </div>
                                ))}
                                <div style={{
                                    marginTop: 10,
                                    padding: '12px',
                                    borderRadius: 'var(--radius-sm)',
                                    background: gap > 0 ? 'var(--warning-light)' : 'var(--success-light)',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                        {gap > 0 ? 'Необходимо доплатить:' : 'Останется после покупки:'}
                                    </div>
                                    <div style={{ fontSize: 20, fontWeight: 800, color: gap > 0 ? '#92400E' : 'var(--success)' }}>
                                        {formatPrice(Math.abs(gap))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Comment */}
                <div className="card">
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Комментарий</div>
                    <textarea className="form-textarea" value={comment} onChange={e => setComment(e.target.value)} placeholder="Заметки по этому совпадению..." rows={3} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => {
                            dispatch({ type: 'UPDATE_MATCH', match: { ...match, realtor_comment: comment } });
                            setSaved(true);
                            setTimeout(() => setSaved(false), 2000);
                        }}>Сохранить</button>
                        {saved && <span style={{ color: 'var(--success)', fontSize: 13, fontWeight: 600 }}>Сохранено!</span>}
                    </div>
                </div>

                {/* Showing form */}
                {showShowingForm && (
                    <div className="card">
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>Назначить показ</div>
                        <input className="form-input" type="datetime-local" value={showingDate} onChange={e => setShowingDate(e.target.value)} />
                        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleScheduleShowing}>Записать</button>
                            <button className="btn btn-secondary" onClick={() => setShowShowingForm(false)}>Отмена</button>
                        </div>
                    </div>
                )}

                {/* Actions */}
                {match.status !== 'rejected' && match.status !== 'deal' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {!showShowingForm && (
                            <button className="btn btn-primary btn-full" onClick={() => setShowShowingForm(true)}>Назначить показ</button>
                        )}
                        {buyer && (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <a href={`tel:${buyer.phone}`} className="btn btn-ghost" style={{ flex: 1, color: '#2563EB', fontWeight: 700 }}>Позвонить покупателю</a>
                                <a href={`https://wa.me/${stripPhone(buyer.phone)}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ color: '#25D366', padding: '0 12px' }}>
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                </a>
                                <a href={`https://t.me/+${stripPhone(buyer.phone)}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ color: '#0088cc', padding: '0 12px' }}>
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" /></svg>
                                </a>
                                <button className="btn btn-ghost" style={{ flex: 1, color: 'var(--primary)', fontWeight: 700 }} onClick={() => setIsMsgModalOpen(true)}>
                                    <Send size={18} style={{ marginRight: 6 }} /> По шаблону
                                </button>
                            </div>
                        )}
                        {seller && (
                            <div style={{ display: 'flex', gap: 8 }}>
                                <a href={`tel:${seller.phone}`} className="btn btn-ghost" style={{ flex: 1, color: '#2563EB', fontWeight: 700 }}>Позвонить продавцу</a>
                                <a href={`https://wa.me/${stripPhone(seller.phone)}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ color: '#25D366', padding: '0 12px' }}>
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                </a>
                                <a href={`https://t.me/+${stripPhone(seller.phone)}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ color: '#0088cc', padding: '0 12px' }}>
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" /></svg>
                                </a>
                            </div>
                        )}
                        {match.status === 'showing_done' && (
                            <button className="btn btn-success btn-full" onClick={handleDeal}>Закрыть сделку</button>
                        )}
                        <button className="btn btn-secondary btn-full" onClick={handleGeneratePublicLink} disabled={isGeneratingLink}>
                            <Share2 size={18} style={{ marginRight: 6 }} /> {isGeneratingLink ? 'Генерация...' : 'Публичная ссылка'}
                        </button>
                        <button className="btn btn-danger btn-full" onClick={handleReject}>Отклонить</button>
                    </div>
                )}

                {match.status === 'deal' && (
                    <div style={{ textAlign: 'center', padding: 24, background: 'var(--success-light)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--success)' }}>
                        <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--success)' }}>Сделка закрыта!</div>
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

// Default export for lazy loading
export { MatchesPage as default };
