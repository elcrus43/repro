import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatPrice, getLevelLabel } from '../../utils/matching';

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
    const prop = state.properties.find(p => p.id === m.property_id);
    const req = state.requests.find(r => r.id === m.request_id);
    const buyer = req ? state.clients.find(c => c.id === req.client_id) : null;
    const seller = prop ? state.clients.find(c => c.id === prop.client_id) : null;
    const lvl = getLevelLabel(m.match_level);

    const statusLabels = { new: 'Новый', viewed: 'Просмотрен', showing_planned: 'Показ запланирован', showing_done: 'Показ проведён', rejected: 'Отклонён', deal: 'Сделка' };

    return (
        <div className="match-card" onClick={onClick}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span className={`match-score-badge ${m.match_level}`}>{lvl.label} {m.score}%</span>
                <span className="badge badge-muted" style={{ fontSize: 11 }}>{statusLabels[m.status] || m.status}</span>
            </div>
            {/* Score bar */}
            <div style={{ background: 'var(--border)', borderRadius: 99, height: 5, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ width: m.score + '%', height: '100%', borderRadius: 99, background: m.match_level === 'perfect' ? 'var(--success)' : m.match_level === 'good' ? 'var(--warning)' : 'var(--orange)', transition: 'width 0.6s ease' }} />
            </div>
            {/* Property */}
            <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: 8 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>Объект</div>
                {prop ? (
                    <>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{formatPrice(prop.price)} · {prop.rooms > 0 ? `${prop.rooms}к` : 'Студия'} · {prop.area_total}м²</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{prop.address}{seller ? ` · ${seller.full_name.split(' ')[0]}` : prop.realtor_id !== user?.id ? ` · ${state.profiles.find(pr => pr.id === prop.realtor_id)?.full_name || 'Агент'}` : ''}</div>
                    </>
                ) : <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Объект удалён</div>}
            </div>
            <div style={{ textAlign: 'center', fontSize: 18, color: 'var(--text-muted)', margin: '4px 0' }}>⇕</div>
            {/* Buyer */}
            <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>Покупатель</div>
                {buyer || req ? (
                    <>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{buyer?.full_name || 'Контакт скрыт'}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{req?.rooms?.map(r => r === 0 ? 'Студия' : `${r}к`).join('/')} · до {formatPrice(req?.budget_max)}</div>
                        {!buyer && req?.realtor_id !== user?.id && <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 2 }}>Агент: {state.profiles.find(pr => pr.id === req.realtor_id)?.full_name || 'Агент'}</div>}
                    </>
                ) : <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Запрос удалён</div>}
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
    const id = window.location.pathname.split('/')[2];
    const match = state.matches.find(m => m.id === id);

    // Хуки ДОЛЖНЫ быть до любого раннего return
    const [comment, setComment] = useState(match?.realtor_comment || '');
    const [showShowingForm, setShowShowingForm] = useState(false);
    const [showingDate, setShowingDate] = useState('');
    const [saved, setSaved] = useState(false);

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
    }

    function handleDeal() {
        if (window.confirm('Закрыть сделку? Это обновит статус объекта, запроса и всех связанных матчей.')) {
            dispatch({ type: 'CLOSE_DEAL', matchId: id });
            navigate('/matches');
        }
    }

    function handleScheduleShowing() {
        if (!showingDate) return;
        dispatch({
            type: 'ADD_SHOWING',
            showing: { match_id: id, property_id: match.property_id, client_id: req?.client_id, realtor_id: match.realtor_id, showing_date: showingDate, status: 'planned' }
        });
        dispatch({ type: 'UPDATE_MATCH', match: { ...match, status: 'viewed' } });
        setShowShowingForm(false);
        navigate('/showings');
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
                        <div style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6 }}>ОБЪЕКТ</div>
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
                        <div style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6 }}>ПОКУПАТЕЛЬ</div>
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

                    const commissionTotal = Number(sellProp.commission || 0) + Number(sellProp.commission_buyer || 0);
                    const availableBudget = Number(sellProp.price || 0) - commissionTotal + Number(sellProp.surcharge || 0);
                    const targetPrice = Number(targetProp.price || 0);
                    const gap = targetPrice - availableBudget;

                    return (
                        <div className="card" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                            <div className="section-title" style={{ marginBottom: 12 }}>Расчет по сделке (Альтернатива)</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div className="info-row">
                                    <span className="info-key">Цена продажи (№{sellProp.id.slice(0, 4)})</span>
                                    <span className="info-val">{formatNumber(sellProp.price)} ₽</span>
                                </div>
                                <div className="info-row" style={{ color: 'var(--danger)' }}>
                                    <span className="info-key">Комиссия (продажа + покупка)</span>
                                    <span className="info-val">− {formatNumber(commissionTotal)} ₽</span>
                                </div>
                                {sellProp.surcharge !== 0 && (
                                    <div className="info-row" style={{ color: sellProp.surcharge > 0 ? 'var(--success)' : 'var(--danger)' }}>
                                        <span className="info-key">{sellProp.surcharge > 0 ? 'Доплата клиента' : 'Остаток на руки'}</span>
                                        <span className="info-val">{sellProp.surcharge > 0 ? '+' : '−'} {formatNumber(Math.abs(sellProp.surcharge))} ₽</span>
                                    </div>
                                )}
                                <div className="info-row" style={{ fontWeight: 700, borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 4 }}>
                                    <span className="info-key">Доступный бюджет</span>
                                    <span className="info-val">{formatNumber(availableBudget)} ₽</span>
                                </div>

                                <div className="info-row" style={{ marginTop: 12 }}>
                                    <span className="info-key">Цена покупки (№{targetProp.id.slice(0, 4)})</span>
                                    <span className="info-val">{formatNumber(targetPrice)} ₽</span>
                                </div>

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
                                        {formatNumber(Math.abs(gap))} ₽
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
                        {buyer && <a href={`tel:${buyer.phone}`} className="btn btn-ghost btn-full">Позвонить покупателю</a>}
                        {seller && <a href={`tel:${seller.phone}`} className="btn btn-ghost btn-full">Позвонить продавцу</a>}
                        {match.status === 'showing_done' && (
                            <button className="btn btn-success btn-full" onClick={handleDeal}>Закрыть сделку</button>
                        )}
                        <button className="btn btn-danger btn-full" onClick={handleReject}>Отклонить</button>
                    </div>
                )}

                {match.status === 'deal' && (
                    <div style={{ textAlign: 'center', padding: 24, background: 'var(--success-light)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--success)' }}>
                        <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--success)' }}>Сделка закрыта!</div>
                    </div>
                )}
            </div>
        </div>
    );
}
