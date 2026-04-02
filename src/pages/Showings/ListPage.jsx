import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatPhone } from '../../utils/format';
import { Trash2, Edit2 } from 'lucide-react';

export function ListPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const user = state.currentUser;
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const [feedbackId, setFeedbackId] = useState(null);
    const [feedbackComment, setFeedbackComment] = useState('');

    const myShowings = state.showings.filter(s => user?.role === 'admin' || s.realtor_id === user?.id);

    // Calendar
    const now = new Date();
    const [calYear, setCalYear] = useState(now.getFullYear());
    const [calMonth, setCalMonth] = useState(now.getMonth());
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const todayStr = new Date().toISOString().slice(0, 10);

    // build calendar grid
    const calDays = [];
    const startPad = (firstDay.getDay() + 6) % 7; // Monday start
    for (let i = 0; i < startPad; i++) calDays.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) calDays.push(d);

    const showingsOnDate = myShowings.filter(s => s.showing_date?.startsWith(selectedDate));

    const statusLabels = { planned: 'Запланирован', completed: 'Проведен', failed: 'Не состоялся' };
    const feedbackOptions = [
        { val: 'liked', label: 'Понравилось' },
        { val: 'thinking', label: 'Думает' },
        { val: 'not_interested', label: 'Не заинтересован' },
    ];

    function completShowing(showing) {
        setFeedbackId(showing.id);
        setFeedbackComment('');
    }

    function saveFeedback(showing, result) {
        let updatedShowing = { ...showing };
        if (result === 'failed') {
            updatedShowing.status = 'failed';
        } else {
            updatedShowing.status = 'completed';
            updatedShowing.client_feedback = result;
            updatedShowing.feedback_comment = feedbackComment;
        }
        dispatch({ type: 'UPDATE_SHOWING', showing: updatedShowing });
        setFeedbackId(null);
        setFeedbackComment('');
    }

    function dStr(date, d) {
        return `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const pendingFeedbackShowings = myShowings.filter(s => {
        if (s.status !== 'planned' || !s.showing_date) return false;
        const showingTime = new Date(s.showing_date).getTime();
        return (now.getTime() - showingTime) > TWENTY_FOUR_HOURS;
    }).sort((a, b) => new Date(b.showing_date).getTime() - new Date(a.showing_date).getTime());

    return (
        <div className="page fade-in">
            <div className="topbar">
                <span className="topbar-title">Показы</span>
                <button className="icon-btn" onClick={() => navigate('/showings/new')} style={{ color: 'var(--primary)', fontSize: 24, fontWeight: 'bold' }}>+</button>
            </div>
            <div className="page-content">
                {state.calendarStatus && (
                    <div style={{
                        margin: '0 0 16px 0',
                        padding: '12px 16px',
                        borderRadius: 12,
                        fontSize: 13,
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        background: state.calendarStatus === 'ok' ? '#e8f5e9' : state.calendarStatus === 'error' ? '#fdecea' : '#e3f2fd',
                        color: state.calendarStatus === 'ok' ? '#2e7d32' : state.calendarStatus === 'error' ? '#c62828' : '#1565c0',
                    }}>
                        {state.calendarStatus === 'loading' && '🔄 Синхронизация с Google Календарем...'}
                        {state.calendarStatus === 'ok' && '✅ Обновлено в Google Календаре'}
                        {state.calendarStatus === 'error' && '⚠️ Ошибка синхронизации (сохранено локально)'}
                    </div>
                )}
                {/* Pending Feedback Prompt */}
                {pendingFeedbackShowings.length > 0 && (
                    <div style={{ marginBottom: 24 }}>
                        <div className="section-title" style={{ marginBottom: 12, color: 'var(--danger)' }}>
                            📋 Ожидают подтверждения ({pendingFeedbackShowings.length})
                        </div>
                        {pendingFeedbackShowings.map(s => {
                            const prop = state.properties.find(p => p.id === s.property_id);
                            const client = state.clients.find(c => c.id === s.client_id);
                            const timeStr = new Date(s.showing_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                            
                            if (feedbackId === s.id) {
                                return (
                                    <div key={s.id} className="card" style={{ border: '2px solid var(--danger-light)' }}>
                                        <div style={{ fontWeight: 700, marginBottom: 12 }}>Как прошёл показ?</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{prop?.address} · {client?.full_name}</div>
                                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                            {feedbackOptions.map(f => (
                                                <button key={f.val} className="btn btn-secondary" style={{ flex: 1, flexDirection: 'column', gap: 4, padding: '12px 8px' }} onClick={() => saveFeedback(s, f.val)}>
                                                    <span style={{ fontSize: 12 }}>{f.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                        <textarea className="form-textarea" value={feedbackComment} onChange={e => setFeedbackComment(e.target.value)} placeholder="Комментарий после показа..." rows={3} />
                                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                            <button className="btn btn-primary btn-sm" onClick={() => saveFeedback(s, 'failed')}>Не состоялся</button>
                                            <button className="btn btn-secondary btn-sm" onClick={() => setFeedbackId(null)}>Отмена</button>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={s.id} className="card" style={{ borderLeft: '4px solid var(--danger)', marginBottom: 12 }}>
                                    <div style={{ fontSize: 13, color: 'var(--danger)', fontWeight: 600, marginBottom: 4 }}>Прошло более 24 часов</div>
                                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Встреча с {client?.full_name || 'клиентом'}</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                                        📅 {timeStr} · {prop?.address || 'Объект не указан'}
                                    </div>
                                    <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 15 }}>Событие состоялось?</div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => completShowing(s)}>✅ Да</button>
                                        <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { if (window.confirm('Отметить как "Не состоялся"?')) saveFeedback(s, 'failed'); }}>❌ Нет</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Calendar */}
                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <button className="icon-btn" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}>◀</button>
                        <span style={{ fontWeight: 700 }}>{monthNames[calMonth]} {calYear}</span>
                        <button className="icon-btn" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}>▶</button>
                    </div>
                    <div className="calendar-grid">
                        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => <div key={d} className="cal-day-name">{d}</div>)}
                        {calDays.map((d, i) => {
                            if (!d) return <div key={`e-${i}`} />;
                            const ds = dStr(calYear, d);
                            const hasEv = myShowings.some(s => s.showing_date?.startsWith(ds));
                            const isToday = ds === todayStr;
                            const isSel = ds === selectedDate;
                            return (
                                <div key={d} className={`cal-day ${isToday ? 'today' : ''} ${hasEv && !isToday ? 'has-events' : ''}`}
                                    style={{ fontWeight: isSel ? 700 : 400, background: isSel && !isToday ? 'var(--primary-light)' : undefined, color: isSel && !isToday ? 'var(--primary)' : undefined }}
                                    onClick={() => setSelectedDate(ds)}>
                                    {d}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Selected day showings */}
                <div>
                    <div className="section-title" style={{ marginBottom: 8 }}>
                        {selectedDate === todayStr ? 'Сегодня' : new Date(selectedDate + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                        {showingsOnDate.length > 0 && ` (${showingsOnDate.length})`}
                    </div>
                    {showingsOnDate.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: 14 }}>Нет показов на эту дату</div>
                    )}
                    {showingsOnDate.map(s => {
                        const prop = state.properties.find(p => p.id === s.property_id);
                        const client = state.clients.find(c => c.id === s.client_id);
                        const time = new Date(s.showing_date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

                        if (feedbackId === s.id) {
                            return (
                                <div key={s.id} className="card">
                                    <div style={{ fontWeight: 700, marginBottom: 12 }}>Как прошёл показ?</div>
                                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{prop?.address} · {client?.full_name}</div>
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                        {feedbackOptions.map(f => (
                                            <button key={f.val} className="btn btn-secondary" style={{ flex: 1, flexDirection: 'column', gap: 4, padding: '12px 8px' }} onClick={() => saveFeedback(s, f.val)}>
                                                <span style={{ fontSize: 12 }}>{f.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <textarea className="form-textarea" value={feedbackComment} onChange={e => setFeedbackComment(e.target.value)} placeholder="Комментарий после показа..." rows={3} />
                                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                        <button className="btn btn-primary btn-sm" onClick={() => saveFeedback(s, 'failed')}>Не состоялся</button>
                                        <button className="btn btn-secondary btn-sm" onClick={() => setFeedbackId(null)}>Отмена</button>
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={s.id} className="card" style={{ marginBottom: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>{time}</span>
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <span className="badge badge-primary">{statusLabels[s.status] || s.status}</span>
                                        {s.realtor_id === user?.id && (
                                            <>
                                                <button className="icon-btn" title="Редактировать" onClick={() => navigate(`/showings/new?id=${s.id}`)}><Edit2 size={16} /></button>
                                                <button className="icon-btn" onClick={() => { if (window.confirm('Удалить показ?')) dispatch({ type: 'DELETE_SHOWING', id: s.id }); }}><Trash2 size={16} /></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                {prop && <div style={{ fontWeight: 600, fontSize: 14 }}>Продажа: {prop.address}</div>}
                                {client && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Клиент: {client.full_name} · {formatPhone(client.phone)}</div>}
                                {s.client_feedback && (
                                    <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                                        {feedbackOptions.find(f => f.val === s.client_feedback)?.label}
                                        {s.feedback_comment && ` · ${s.feedback_comment}`}
                                    </div>
                                )}
                                {s.status === 'planned' && s.realtor_id === user?.id && (
                                    <button className="btn btn-success btn-sm" style={{ marginTop: 8 }} onClick={() => completShowing(s)}>Записать результат</button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* All upcoming */}
                {myShowings.filter(s => s.showing_date > new Date().toISOString() && s.status === 'planned').length > 0 && (
                    <div>
                        <div className="section-title" style={{ marginBottom: 8 }}>Ближайшие показы</div>
                        {myShowings.filter(s => s.showing_date > new Date().toISOString() && s.status === 'planned')
                            .sort((a, b) => a.showing_date.localeCompare(b.showing_date))
                            .map(s => {
                                const prop = state.properties.find(p => p.id === s.property_id);
                                const client = state.clients.find(c => c.id === s.client_id);
                                return (
                                    <div key={s.id} className="list-row" onClick={() => setSelectedDate(s.showing_date.slice(0, 10))}>
                                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{new Date(s.showing_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 14, fontWeight: 600 }}>{prop?.address}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{client?.full_name}</div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                )}

                {myShowings.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-title">Нет показов</div>
                        <div className="empty-desc">Назначьте показ из карточки матча</div>
                    </div>
                )}
            </div>
        </div>
    );
}
