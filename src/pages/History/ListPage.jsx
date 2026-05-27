import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatPhone, getEventStatusLabel } from '../../utils/format';
import { Trash, Pencil, Calendar as CalendarIcon, Clock, MapPin, Users, CheckCircle2, AlertCircle, Plus, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';

export function ListPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const user = state.currentUser;
    const toLocalDateStr = (dateOrStr) => {
        if (!dateOrStr) return '';
        const d = new Date(dateOrStr);
        if (isNaN(d.getTime())) return '';
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const [selectedDate, setSelectedDate] = useState(toLocalDateStr(new Date()));
    const [feedbackId, setFeedbackId] = useState(null);
    const [feedbackComment, setFeedbackComment] = useState('');
    
    const eventTypeLabels = {
        showing: 'Показ',
        meeting: 'Встреча',
        viewing: 'Просмотр',
        deposit: 'Задаток',
        deal: 'Сделка',
        call: 'Звонок'
    };

    const myShowings = state.showings.filter(s => user?.role === 'admin' || s.realtor_id === user?.id);

    // Calendar logic
    const now = new Date();
    const [calYear, setCalYear] = useState(now.getFullYear());
    const [calMonth, setCalMonth] = useState(now.getMonth());
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const todayStr = toLocalDateStr(new Date());

    const calDays = [];
    const startPad = (firstDay.getDay() + 6) % 7; 
    for (let i = 0; i < startPad; i++) calDays.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) calDays.push(d);

    const showingsOnDate = myShowings.filter(s => toLocalDateStr(s.showing_date) === selectedDate);


    const feedbackOptions = [
        { val: 'liked', label: 'Понравилось' },
        { val: 'thinking', label: 'Думает' },
        { val: 'not_interested', label: 'Не заинтересован' },
    ];

    function completShowing(showing) {
        setFeedbackId(showing.id);
        setFeedbackComment(showing.feedback_comment || '');
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

    function dStr(year, month, d) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const pendingFeedbackShowings = myShowings.filter(s => {
        if (s.status !== 'planned' || !s.showing_date) return false;
        const showingTime = new Date(s.showing_date).getTime();
        return (now.getTime() - showingTime) > TWENTY_FOUR_HOURS;
    }).sort((a, b) => new Date(b.showing_date).getTime() - new Date(a.showing_date).getTime());

    return (
        <div className="page fade-in" style={{ background: 'var(--surface)' }}>
            {/* Premium Glassmorphic Topbar */}
            <div className="topbar sticky" style={{ 
                background: 'var(--topbar-bg)', 
                backdropFilter: 'blur(24px) saturate(180%)',
                padding: '20px',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 1000
            }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="font-oswald" style={{ fontSize: 24, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text)' }}>
                        История
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>Журнал событий</span>
                </div>
                
                <button 
                    onClick={() => navigate('/history/new')}
                    className="card-clickable"
                    style={{ 
                        width: 44, height: 44, borderRadius: 14, background: 'var(--primary)', 
                        color: 'white', border: 'none', display: 'flex', alignItems: 'center', 
                        justifyContent: 'center', boxShadow: '0 8px 16px rgba(0, 82, 255, 0.2)' 
                    }}
                >
                    <Plus size={24} />
                </button>
            </div>

            <div className="page-content" style={{ padding: '20px 20px 120px' }}>

                {/* Sync Status */}
                {state.calendarStatus && (
                    <div style={{
                        marginBottom: 24, padding: '14px 20px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: 12,
                        background: state.calendarStatus === 'ok' ? '#ecfdf5' : state.calendarStatus === 'error' ? '#fef2f2' : '#eff6ff',
                        color: state.calendarStatus === 'ok' ? '#059669' : state.calendarStatus === 'error' ? '#dc2626' : '#2563eb',
                        border: '1px solid currentColor', borderOpacity: 0.1
                    }}>
                        {state.calendarStatus === 'loading' && <Clock size={16} className="spin" />}
                        {state.calendarStatus === 'ok' && <CheckCircle2 size={16} />}
                        {state.calendarStatus === 'error' && <AlertCircle size={16} />}
                        {state.calendarStatus === 'loading' && 'Синхронизация...'}
                        {state.calendarStatus === 'ok' && 'Календарь обновлен'}
                        {state.calendarStatus === 'error' && 'Ошибка синхронизации'}
                    </div>
                )}

                {/* Pending Feedback alerted cards */}
                {pendingFeedbackShowings.length > 0 && (
                    <div style={{ marginBottom: 32 }}>
                        <div className="font-oswald" style={{ fontSize: 14, fontWeight: 500, color: '#dc2626', marginBottom: 12, textTransform: 'uppercase' }}>
                            Требуют подтверждения ({pendingFeedbackShowings.length})
                        </div>
                        {pendingFeedbackShowings.map(s => {
                            const prop = state.properties.find(p => p.id === s.property_id);
                            const clients = state.clients.filter(c => (s.client_ids || [s.client_id]).includes(c.id));
                            const clientNames = clients.map(c => c.full_name).join(', ') || 'клиентом';
                            const timeStr = new Date(s.showing_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

                            return (
                                <div key={s.id} className="card" style={{ 
                                    border: '1.5px solid rgba(239, 68, 68, 0.2)', background: 'var(--danger-light)', marginBottom: 16,
                                    boxShadow: '0 8px 24px rgba(220, 38, 38, 0.04)'
                                }}>
                                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <AlertCircle size={20} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 500, fontSize: 15, color: 'var(--text)' }}>Результат события?</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{prop?.address || 'Объект не указан'}</div>
                                        </div>
                                    </div>

                                    {feedbackId === s.id ? (
                                        <div className="fade-in">
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                                                {feedbackOptions.map(f => (
                                                    <button key={f.val} className="card-clickable" 
                                                        style={{ 
                                                            flex: 1, minWidth: '80px', padding: '12px 8px', borderRadius: 14, 
                                                            background: 'var(--surface)', border: '1px solid rgba(0,0,0,0.05)',
                                                            fontSize: 11, fontWeight: 400, textAlign: 'center'
                                                        }} 
                                                        onClick={() => saveFeedback(s, f.val)}
                                                    >
                                                        {f.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <textarea 
                                                className="form-textarea" 
                                                style={{ borderRadius: 16, fontSize: 13, background: 'var(--surface)' }}
                                                value={feedbackComment} 
                                                onChange={e => setFeedbackComment(e.target.value)} 
                                                placeholder="Детали встречи..." 
                                                rows={2} 
                                            />
                                            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                                                <button className="card-clickable" style={{ flex: 1, height: 44, borderRadius: 12, background: 'rgba(0,0,0,0.03)', border: 'none', fontSize: 12, fontWeight: 400 }} onClick={() => saveFeedback(s, 'failed')}>Не состоялся</button>
                                                <button className="card-clickable" style={{ width: 80, height: 44, borderRadius: 12, border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontSize: 12 }} onClick={() => setFeedbackId(null)}>Отмена</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: 10 }}>
                                            <button 
                                                className="card-clickable" 
                                                style={{ flex: 2, height: 44, background: '#dc2626', color: 'white', border: 'none', borderRadius: 14, fontWeight: 500, fontSize: 13, fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase' }} 
                                                onClick={() => completShowing(s)}
                                            >
                                                Записать
                                            </button>
                                            <button 
                                                className="card-clickable" 
                                                style={{ flex: 1, height: 44, background: 'var(--surface)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--danger)', borderRadius: 14, fontWeight: 400, fontSize: 12 }} 
                                                onClick={() => { if (window.confirm('Отметить как "Не состоялся"?')) saveFeedback(s, 'failed'); }}
                                            >
                                                НЕТ
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Premium Calendar */}
                <div className="card" style={{ padding: '20px 16px', marginBottom: 24, border: '1px solid var(--border)', borderRadius: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                        <button className="card-clickable" style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', background: 'var(--bg-light)', color: 'var(--text)' }} onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}>
                            <ChevronLeft size={18} />
                        </button>
                        <span className="font-oswald" style={{ fontWeight: 500, fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text)' }}>{monthNames[calMonth]} {calYear}</span>
                        <button className="card-clickable" style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', background: 'var(--bg-light)', color: 'var(--text)' }} onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}>
                            <ChevronRight size={18} />
                        </button>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
                            <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 400, color: 'var(--text-secondary)', opacity: 0.5, marginBottom: 8 }}>{d}</div>
                        ))}
                        {calDays.map((d, i) => {
                            if (!d) return <div key={`e-${i}`} />;
                            const ds = dStr(calYear, calMonth, d);
                            const hasEv = myShowings.some(s => toLocalDateStr(s.showing_date) === ds);
                            const isToday = ds === todayStr;
                            const isSel = ds === selectedDate;
                            
                            return (
                                <button 
                                    key={d} 
                                    onClick={() => setSelectedDate(ds)}
                                    style={{
                                        aspectRatio: '1/1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        borderRadius: 10, border: 'none', fontSize: 13, fontWeight: isSel ? 600 : 300,
                                        background: isSel ? 'var(--primary)' : isToday ? 'var(--primary-light)' : 'transparent',
                                        color: isSel ? 'white' : isToday ? 'var(--primary)' : 'var(--text)',
                                        position: 'relative', transition: 'all 0.2s', cursor: 'pointer',
                                        fontFamily: "'Oswald', sans-serif"
                                    }}
                                >
                                    {d}
                                    {hasEv && !isSel && (
                                        <div style={{ position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: '50%', background: isToday ? 'var(--primary)' : 'var(--text-muted)' }} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Selected Date Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div className="font-oswald" style={{ fontSize: 16, fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                        {selectedDate === todayStr ? 'Сегодня' : new Date(selectedDate + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                        <span style={{ marginLeft: 8, opacity: 0.3 }}>({showingsOnDate.length})</span>
                    </div>
                </div>

                {/* Event Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {showingsOnDate.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', opacity: 0.5, fontSize: 13, fontWeight: 300 }}>Нет событий на этот день</div>
                    ) : (
                        showingsOnDate.map(s => {
                            const prop = state.properties.find(p => p.id === s.property_id);
                            const clients = state.clients.filter(c => (s.client_ids || [s.client_id]).includes(c.id));
                            const clientNames = clients.map(c => c.full_name).join(', ');
                            const time = new Date(s.showing_date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

                            return (
                                <div key={s.id} className="card" style={{ padding: 20 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                        <div className="font-oswald" style={{ fontSize: 24, fontWeight: 200, color: '#000000', lineHeight: 1 }}>{time}</div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <span style={{ 
                                                fontSize: 10, fontWeight: 600, textTransform: 'uppercase', padding: '4px 10px', 
                                                borderRadius: 20, background: s.status === 'completed' ? '#ecfdf5' : s.status === 'failed' ? '#fef2f2' : 'var(--primary-light)',
                                                color: s.status === 'completed' ? '#059669' : s.status === 'failed' ? '#dc2626' : 'var(--primary)'
                                            }}>
                                                    {getEventStatusLabel(s.event_type, s.status)}
                                            </span>
                                            {s.realtor_id === user?.id && (
                                                <button className="card-clickable" onClick={() => navigate(`/history/new?id=${s.id}`)} style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', padding: 0 }}>
                                                    <Pencil size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <div style={{ display: 'flex', gap: 10 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <Building2 size={14} color="var(--text-secondary)" />
                                            </div>
                                            <div style={{ fontSize: 14, fontWeight: 200, color: 'var(--text)', lineHeight: 1.4 }}>
                                                <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{eventTypeLabels[s.event_type] || 'Событие'}</span>: <span style={{ fontWeight: 600 }}>{prop?.address || 'Объект не указан'}</span>
                                            </div>
                                        </div>

                                        {clients.length > 0 && (
                                            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                                <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                    <Users size={14} color="var(--text-secondary)" />
                                                </div>
                                                <div style={{ fontSize: 13, color: '#000000', fontWeight: 200 }}>{clientNames}</div>
                                            </div>
                                        )}
                                    </div>

                                    {s.client_feedback && (
                                        <div style={{ 
                                            marginTop: 16, padding: '12px 14px', borderRadius: 14, background: 'var(--bg-light)',
                                            borderLeft: '3px solid var(--primary)'
                                        }}>
                                            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 4 }}>Результат</div>
                                            <div style={{ fontSize: 13, fontWeight: 300, color: 'var(--text)' }}>
                                                {feedbackOptions.find(f => f.val === s.client_feedback)?.label}
                                                {s.feedback_comment && <span style={{ opacity: 0.5, fontWeight: 300 }}> · {s.feedback_comment}</span>}
                                            </div>
                                        </div>
                                    )}

                                    {s.status === 'planned' && s.realtor_id === user?.id && !feedbackId && (
                                        <button 
                                            className="card-clickable" 
                                            style={{ 
                                                marginTop: 16, width: '100%', height: 44, borderRadius: 14, border: 'none', 
                                                background: 'var(--primary)', color: 'white', fontWeight: 500, fontSize: 12,
                                                fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em'
                                            }} 
                                            onClick={() => completShowing(s)}
                                        >
                                            Записать итог
                                        </button>
                                    )}
                                    
                                    {feedbackId === s.id && (
                                        <div style={{ marginTop: 20, borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 20 }}>
                                            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 12 }}>Итог встречи</div>
                                            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                                {feedbackOptions.map(f => (
                                                    <button key={f.val} className="card-clickable" 
                                                        style={{ 
                                                            flex: 1, padding: '12px 4px', borderRadius: 12, border: '1px solid rgba(0,0,0,0.05)',
                                                            fontSize: 10, fontWeight: 400, background: 'var(--surface)'
                                                        }} 
                                                        onClick={() => saveFeedback(s, f.val)}
                                                    >
                                                        {f.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <textarea 
                                                className="form-textarea" 
                                                style={{ borderRadius: 16, fontSize: 13 }}
                                                value={feedbackComment} 
                                                onChange={e => setFeedbackComment(e.target.value)} 
                                                placeholder="Комментарий..." 
                                                rows={2} 
                                            />
                                            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                                                <button className="card-clickable" style={{ flex: 1, height: 40, borderRadius: 12, background: '#f1f5f9', border: 'none', fontSize: 11, fontWeight: 400 }} onClick={() => saveFeedback(s, 'failed')}>Не состоялся</button>
                                                <button className="card-clickable" style={{ width: 70, height: 40, borderRadius: 12, border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontSize: 11 }} onClick={() => setFeedbackId(null)}>Отмена</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Timeline Section */}
                <div style={{ marginTop: 40 }}>
                    <div className="font-oswald" style={{ fontSize: 16, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.02em', marginBottom: 20 }}>Лента событий</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {myShowings
                            .sort((a, b) => new Date(b.showing_date).getTime() - new Date(a.showing_date).getTime())
                            .map(s => {
                                const prop = state.properties.find(p => p.id === s.property_id);
                                const clients = state.clients.filter(c => (s.client_ids || [s.client_id]).includes(c.id));
                                const clientNames = clients.map(c => c.full_name).join(', ');
                                const d = new Date(s.showing_date);
                                const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
                                const timeStr = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                                
                                return (
                                    <div key={s.id} className="card-clickable" style={{ 
                                        display: 'flex', gap: 16, padding: '16px', borderRadius: 20, 
                                        background: 'var(--surface)', border: '1px solid rgba(0,0,0,0.02)'
                                    }} onClick={() => navigate(`/history/new?id=${s.id}`)}>
                                        <div style={{ 
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', 
                                            justifyContent: 'center', width: 50, flexShrink: 0,
                                            borderRight: '1px solid rgba(0,0,0,0.05)', paddingRight: 16
                                        }}>
                                            <div className="font-oswald" style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase' }}>{dateStr}</div>
                                            <div style={{ fontSize: 10, fontWeight: 200, color: '#000000' }}>{timeStr}</div>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase' }}>{eventTypeLabels[s.event_type] || 'Событие'}</div>
                                                <div style={{ fontSize: 10, fontWeight: 600, color: s.status === 'completed' ? '#059669' : '#94a3b8' }}>{getEventStatusLabel(s.event_type, s.status)}</div>
                                            </div>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{prop?.address || 'Без объекта'}</div>
                                            <div style={{ fontSize: 12, color: '#000000', fontWeight: 200 }}>{clientNames || '—'}</div>
                                        </div>
                                    </div>
                                );
                            })
                        }
                    </div>
                </div>

                {myShowings.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 64, height: 64, borderRadius: 24, background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', opacity: 0.3 }}>
                            <History size={32} />
                        </div>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>История пуста</div>
                            <div style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 200 }}>Добавляйте события, чтобы отслеживать активность по объектам.</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
