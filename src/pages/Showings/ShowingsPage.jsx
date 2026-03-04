import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatPhone } from '../../utils/format';

export function ShowingsPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const user = state.currentUser;
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
    const [feedbackId, setFeedbackId] = useState(null);
    const [feedbackComment, setFeedbackComment] = useState('');

    const myShowings = state.showings.filter(s => s.realtor_id === user?.id);

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

    const statusLabels = { planned: 'Запланирован', completed: 'Проведён', cancelled: 'Отменён', no_show: 'Не пришёл' };
    const feedbackOptions = [
        { val: 'liked', label: 'Понравилось' },
        { val: 'thinking', label: 'Думает' },
        { val: 'not_interested', label: 'Не заинтересован' },
    ];

    function completShowing(showing) {
        setFeedbackId(showing.id);
        setFeedbackComment('');
    }

    function saveFeedback(showing, feed) {
        dispatch({ type: 'UPDATE_SHOWING', showing: { ...showing, status: 'completed', client_feedback: feed, feedback_comment: feedbackComment } });
        setFeedbackId(null);
    }

    function dStr(date, d) {
        return `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    return (
        <div className="page fade-in">
            <div className="topbar">
                <span className="topbar-title">Показы</span>
                <button className="icon-btn" onClick={() => navigate('/matches')}>+</button>
            </div>
            <div className="page-content">
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
                                    <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => setFeedbackId(null)}>Отмена</button>
                                </div>
                            );
                        }

                        return (
                            <div key={s.id} className="card" style={{ marginBottom: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>{time}</span>
                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <span className="badge badge-primary">{statusLabels[s.status]}</span>
                                        <button className="icon-btn" onClick={() => { if (window.confirm('Удалить показ?')) dispatch({ type: 'DELETE_SHOWING', id: s.id }); }}>🗑️</button>
                                    </div>
                                </div>
                                {prop && <div style={{ fontWeight: 600, fontSize: 14 }}>Объект: {prop.address}</div>}
                                {client && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Клиент: {client.full_name} · {formatPhone(client.phone)}</div>}
                                {s.client_feedback && (
                                    <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                                        {feedbackOptions.find(f => f.val === s.client_feedback)?.label}
                                        {s.feedback_comment && ` · ${s.feedback_comment}`}
                                    </div>
                                )}
                                {s.status === 'planned' && (
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
