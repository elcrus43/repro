import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatPhone, getEventStatusLabel } from '../../utils/format';
import { GlobalSearch } from '../../components/GlobalSearch';
import {
    Trash, Pencil, Calendar as CalendarIcon, Clock, MapPin, Users,
    CheckCircle2, AlertCircle, Plus, ChevronLeft, ChevronRight, Building2,
    History, Handshake, Target, Check
} from 'lucide-react';

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
    const [viewMode, setViewMode] = useState('week'); // 'week' | 'month'
    const [weekOffset, setWeekOffset] = useState(0); // 0 = текущая неделя
    const [feedbackId, setFeedbackId] = useState(null);
    const [feedbackComment, setFeedbackComment] = useState('');
    
    const eventTypeLabels = {
        showing: 'Показ',
        meeting: 'Встреча',
        viewing: 'Подбор',
        deposit: 'Задаток',
        deal: 'Сделка',
        call: 'Звонок',
        registration: 'Регистрация',
        handover: 'Передача объекта'
    };

    const myShowings = state.showings.filter(s => !user?.id || user?.role === 'admin' || s.realtor_id === user?.id || !s.realtor_id);
    const myDeals = (state.deals || []).filter(d => {
        if (!user?.id || user?.role === 'admin') return true;
        if (d.realtor_id === user?.id) return true;
        const prop = state.properties.find(p => p.id === d.property_id);
        return prop?.realtor_id === user?.id;
    });

    // Объединенный список всех событий истории (показы/встречи/звонки + этапы сделок)
    const allHistoryEvents = useMemo(() => {
        const events = [];

        // 1. Показы, встречи, звонки
        myShowings.forEach(s => {
            if (!s.showing_date) return;
            const dateStr = toLocalDateStr(s.showing_date);
            events.push({
                id: s.id,
                isDeal: false,
                isShowing: true,
                event_type: s.event_type || 'showing',
                dateStr,
                rawDate: s.showing_date,
                status: s.status || 'planned',
                isCompleted: s.status === 'completed',
                property_id: s.property_id,
                client_id: s.client_id,
                client_ids: s.client_ids || (s.client_id ? [s.client_id] : []),
                feedback_comment: s.feedback_comment,
                client_feedback: s.client_feedback,
                realtor_id: s.realtor_id,
                raw: s,
            });
        });

        // 2. Этапы сделок (Сделка, Задаток, Регистрация, Передача)
        myDeals.forEach(d => {
            const clientIds = (d.buyer_ids && d.buyer_ids.length ? d.buyer_ids : [])
                .concat(d.seller_ids && d.seller_ids.length ? d.seller_ids : [])
                .concat(d.buyer_id ? [d.buyer_id] : [])
                .concat(d.seller_id ? [d.seller_id] : []);
            const uniqueClientIds = Array.from(new Set(clientIds.filter(Boolean)));
            const primaryClientId = uniqueClientIds[0] || null;

            // Сделка
            if (d.deal_date) {
                const dateStr = toLocalDateStr(d.deal_date);
                events.push({
                    id: d.id,
                    dealId: d.id,
                    isDeal: true,
                    isShowing: false,
                    event_type: 'deal',
                    dateStr,
                    rawDate: d.deal_date,
                    status: d.status === 'closed' ? 'completed' : 'planned',
                    isCompleted: d.status === 'closed',
                    property_id: d.property_id,
                    client_id: primaryClientId,
                    client_ids: uniqueClientIds,
                    title: d.title ? `Сделка: ${d.title}` : 'Сделка',
                    deal_location: d.deal_location,
                    price: d.price,
                    realtor_id: d.realtor_id,
                    raw: d,
                });
            }

            // Задаток
            if (d.deposit_date && toLocalDateStr(d.deposit_date) !== toLocalDateStr(d.deal_date)) {
                const dateStr = toLocalDateStr(d.deposit_date);
                const isDepositDone = Boolean(d.deposit_paid || d.status === 'closed');
                events.push({
                    id: `${d.id}-deposit`,
                    dealId: d.id,
                    isDeal: true,
                    isDeposit: true,
                    isShowing: false,
                    event_type: 'deposit',
                    dateStr,
                    rawDate: d.deposit_date,
                    status: isDepositDone ? 'completed' : 'planned',
                    isCompleted: isDepositDone,
                    property_id: d.property_id,
                    client_id: primaryClientId,
                    client_ids: uniqueClientIds,
                    title: d.title ? `Задаток: ${d.title}` : 'Задаток',
                    price: d.deposit_amount,
                    realtor_id: d.realtor_id,
                    raw: d,
                });
            }

            // Регистрация
            if (d.registration_date && toLocalDateStr(d.registration_date) !== toLocalDateStr(d.deal_date) && toLocalDateStr(d.registration_date) !== toLocalDateStr(d.deposit_date)) {
                const dateStr = toLocalDateStr(d.registration_date);
                events.push({
                    id: `${d.id}-registration`,
                    dealId: d.id,
                    isDeal: true,
                    isShowing: false,
                    event_type: 'registration',
                    dateStr,
                    rawDate: d.registration_date,
                    status: d.status === 'closed' ? 'completed' : 'planned',
                    isCompleted: d.status === 'closed',
                    property_id: d.property_id,
                    client_id: primaryClientId,
                    client_ids: uniqueClientIds,
                    title: d.title ? `Регистрация: ${d.title}` : 'Регистрация',
                    realtor_id: d.realtor_id,
                    raw: d,
                });
            }

            // Передача объекта
            if (d.handover_date && toLocalDateStr(d.handover_date) !== toLocalDateStr(d.deal_date) && toLocalDateStr(d.handover_date) !== toLocalDateStr(d.deposit_date)) {
                const dateStr = toLocalDateStr(d.handover_date);
                events.push({
                    id: `${d.id}-handover`,
                    dealId: d.id,
                    isDeal: true,
                    isShowing: false,
                    event_type: 'handover',
                    dateStr,
                    rawDate: d.handover_date,
                    status: d.status === 'closed' ? 'completed' : 'planned',
                    isCompleted: d.status === 'closed',
                    property_id: d.property_id,
                    client_id: primaryClientId,
                    client_ids: uniqueClientIds,
                    title: d.title ? `Передача объекта: ${d.title}` : 'Передача объекта',
                    price: d.handover_amount,
                    realtor_id: d.realtor_id,
                    raw: d,
                });
            }
        });

        return events.sort((a, b) => new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime());
    }, [myShowings, myDeals, state.properties]);

    // Calendar logic
    const now = new Date();
    const [calYear, setCalYear] = useState(now.getFullYear());
    const [calMonth, setCalMonth] = useState(now.getMonth());
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const todayStr = toLocalDateStr(new Date());

    // Недельная полоска
    const weekDays = useMemo(() => {
        const current = new Date();
        const dow = current.getDay();
        const dist = dow === 0 ? -6 : 1 - dow;
        const monday = new Date(current.getFullYear(), current.getMonth(), current.getDate() + dist + weekOffset * 7);
        const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
            const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            days.push({
                date: d,
                dateStr,
                dayName: DAY_NAMES[d.getDay()],
                dayNumber: d.getDate(),
                isToday: dateStr === todayStr,
            });
        }
        return days;
    }, [todayStr, weekOffset]);

    const weekRangeLabel = useMemo(() => {
        if (!weekDays.length) return '';
        const start = weekDays[0].date;
        const end = weekDays[6].date;
        const sm = start.toLocaleDateString('ru-RU', { month: 'short' });
        const em = end.toLocaleDateString('ru-RU', { month: 'short' });
        if (sm === em) return `${start.getDate()}–${end.getDate()} ${em}`;
        return `${start.getDate()} ${sm} – ${end.getDate()} ${em}`;
    }, [weekDays]);

    // Российские праздники 2025-2026 (формат MM-DD)
    const RU_HOLIDAYS = new Set([
        '01-01','01-02','01-03','01-04','01-05','01-06','01-07','01-08', // Новый год, Рождество
        '02-23', // День защитника Отечества
        '03-08', // Международный женский день
        '05-01', // Праздник Весны и Труда
        '05-09', // День Победы
        '06-12', // День России
        '11-04', // День народного единства
        '12-31', // Канун Нового года (перенос)
    ]);

    function isWeekendOrHoliday(year, month, day) {
        const date = new Date(year, month, day);
        const dow = date.getDay(); // 0=вс, 6=сб
        if (dow === 0 || dow === 6) return true;
        const mmdd = `${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        return RU_HOLIDAYS.has(mmdd);
    }

    const calDays = [];
    const startPad = (firstDay.getDay() + 6) % 7;
    for (let i = 0; i < startPad; i++) calDays.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) calDays.push(d);

    const showingsOnDate = allHistoryEvents.filter(s => s.dateStr === selectedDate);


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
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                zIndex: 1000
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                    <span className="font-oswald" style={{ fontSize: 24, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text)' }}>
                        История
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>Журнал событий</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end' }}>
                    <GlobalSearch />
                    <button 
                        onClick={() => navigate('/history/new')}
                        className="card-clickable"
                        style={{ 
                            width: 40, height: 40, borderRadius: 12, background: 'var(--primary)', 
                            color: 'white', border: 'none', display: 'flex', alignItems: 'center', 
                            justifyContent: 'center', boxShadow: '0 8px 16px rgba(0, 82, 255, 0.2)',
                            flexShrink: 0
                        }}
                    >
                        <Plus size={22} />
                    </button>
                </div>
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
                            const prop = s.event_type === 'viewing'
                                ? state.selectionItems?.find(p => p.id === s.property_id)
                                : state.properties.find(p => p.id === s.property_id);
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

                {/* View switcher: Неделя / Месяц + Controls */}
                <div className="card" style={{ padding: '12px 14px', marginBottom: 20, border: '1px solid var(--border)', borderRadius: 20 }}>
                    {/* Header: Title + Mode Toggle + Prev/Next */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                                className="card-clickable"
                                style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', background: 'var(--bg-light)', color: 'var(--text)' }}
                                onClick={() => {
                                    if (viewMode === 'month') {
                                        if (calMonth === 0) {
                                            setCalMonth(11);
                                            setCalYear(y => y - 1);
                                        } else {
                                            setCalMonth(m => m - 1);
                                        }
                                    } else {
                                        setWeekOffset(o => o - 1);
                                    }
                                }}
                                title={viewMode === 'month' ? 'Предыдущий месяц' : 'Предыдущая неделя'}
                            >
                                <ChevronLeft size={14} />
                            </button>

                            <span className="font-oswald" style={{ fontWeight: 500, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text)' }}>
                                {viewMode === 'month' ? `${monthNames[calMonth]} ${calYear}` : weekRangeLabel}
                            </span>

                            <button
                                className="card-clickable"
                                style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', background: 'var(--bg-light)', color: 'var(--text)' }}
                                onClick={() => {
                                    if (viewMode === 'month') {
                                        if (calMonth === 11) {
                                            setCalMonth(0);
                                            setCalYear(y => y + 1);
                                        } else {
                                            setCalMonth(m => m + 1);
                                        }
                                    } else {
                                        setWeekOffset(o => o + 1);
                                    }
                                }}
                                title={viewMode === 'month' ? 'Следующий месяц' : 'Следующая неделя'}
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>

                        {/* Mode Switcher Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                                type="button"
                                onClick={() => {
                                    const nowD = new Date();
                                    setCalYear(nowD.getFullYear());
                                    setCalMonth(nowD.getMonth());
                                    setWeekOffset(0);
                                    setSelectedDate(todayStr);
                                }}
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: 8,
                                    border: '1px solid var(--border-light)',
                                    background: 'var(--bg-light)',
                                    color: selectedDate === todayStr ? 'var(--primary)' : 'var(--text-secondary)',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Сегодня
                            </button>

                            <div style={{ display: 'flex', background: 'var(--bg-light)', padding: 2, borderRadius: 8, gap: 2 }}>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('week')}
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: 6,
                                        border: 'none',
                                        background: viewMode === 'week' ? 'var(--surface)' : 'transparent',
                                        color: viewMode === 'week' ? 'var(--primary)' : 'var(--text-muted)',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        boxShadow: viewMode === 'week' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                    }}
                                >
                                    Неделя
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('month')}
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: 6,
                                        border: 'none',
                                        background: viewMode === 'month' ? 'var(--surface)' : 'transparent',
                                        color: viewMode === 'month' ? 'var(--primary)' : 'var(--text-muted)',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        boxShadow: viewMode === 'month' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                    }}
                                >
                                    Месяц
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* View 1: Week Strip (7 Days) */}
                    {viewMode === 'week' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
                            {weekDays.map(d => {
                                const isSel = d.dateStr === selectedDate;
                                const isTod = d.dateStr === todayStr;
                                const hasEv = allHistoryEvents.some(s => s.dateStr === d.dateStr);
                                const pendingEv = allHistoryEvents.some(s => s.dateStr === d.dateStr && !s.isCompleted);

                                return (
                                    <button
                                        key={d.dateStr}
                                        type="button"
                                        onClick={() => setSelectedDate(d.dateStr)}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '6px 2px',
                                            borderRadius: 8,
                                            border: isSel
                                                ? 'none'
                                                : isTod
                                                    ? '1.5px solid var(--primary)'
                                                    : '1px solid transparent',
                                            background: isSel
                                                ? 'var(--primary)'
                                                : isTod
                                                    ? 'var(--primary-light)'
                                                    : 'transparent',
                                            color: isSel
                                                ? 'white'
                                                : isTod
                                                    ? 'var(--primary)'
                                                    : 'var(--text)',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            boxShadow: isSel ? '0 2px 8px rgba(0, 82, 255, 0.25)' : 'none',
                                            fontFamily: "'Oswald', sans-serif"
                                        }}
                                    >
                                        <span style={{
                                            fontSize: 9,
                                            fontWeight: 600,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.02em',
                                            opacity: isSel ? 0.9 : 0.6,
                                            fontFamily: 'inherit'
                                        }}>
                                            {d.dayName}
                                        </span>
                                        <span style={{
                                            fontSize: 14,
                                            fontWeight: isSel || isTod ? 600 : 400,
                                            marginTop: 1,
                                            lineHeight: 1.1,
                                        }}>
                                            {d.dayNumber}
                                        </span>
                                        <div style={{ height: 4, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {hasEv && (
                                                <span style={{
                                                    width: 4,
                                                    height: 4,
                                                    borderRadius: '50%',
                                                    background: isSel ? 'white' : (pendingEv ? 'var(--primary)' : '#10b981'),
                                                }} />
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* View 2: Month Grid */}
                    {viewMode === 'month' && (
                        <div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                                {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map((d, i) => (
                                    <div key={d} style={{ textAlign: 'center', fontSize: 9, fontWeight: 600, marginBottom: 4,
                                        color: i >= 5 ? '#ef4444' : 'var(--text-secondary)', opacity: i >= 5 ? 0.8 : 0.5 }}>{d}</div>
                                ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
                                {calDays.map((d, i) => {
                                    if (!d) return <div key={`e-${i}`} style={{ minHeight: 30 }} />;
                                    const ds = dStr(calYear, calMonth, d);
                                    const hasEv = allHistoryEvents.some(s => s.dateStr === ds);
                                    const pendingEv = allHistoryEvents.some(s => s.dateStr === ds && !s.isCompleted);
                                    const isToday = ds === todayStr;
                                    const isSel = ds === selectedDate;
                                    const isRed = isWeekendOrHoliday(calYear, calMonth, d);

                                    return (
                                        <button
                                            key={d}
                                            onClick={() => setSelectedDate(ds)}
                                            style={{
                                                width: 30, height: 30, margin: '0 auto', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                                borderRadius: 7, border: 'none', fontSize: 13,
                                                fontWeight: isSel ? 700 : 400,
                                                background: isSel ? 'var(--primary)' : isToday ? 'var(--primary-light)' : 'transparent',
                                                color: isSel ? 'white' : isToday ? 'var(--primary)' : isRed ? '#ef4444' : 'var(--text)',
                                                position: 'relative', transition: 'all 0.15s', cursor: 'pointer',
                                                fontFamily: "'Oswald', sans-serif"
                                            }}
                                        >
                                            {d}
                                            {hasEv && (
                                                <div style={{
                                                    position: 'absolute', bottom: 2,
                                                    width: 3, height: 3, borderRadius: '50%',
                                                    background: isSel ? 'rgba(255,255,255,0.8)' : (pendingEv ? (isRed ? '#ef4444' : 'var(--primary)') : '#10b981')
                                                }} />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Selected Date Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div className="font-oswald" style={{ fontSize: 16, fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                        {selectedDate === todayStr ? 'Сегодня' : new Date(selectedDate + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                        <span style={{ marginLeft: 8, opacity: 0.3 }}>({showingsOnDate.length})</span>
                    </div>
                </div>

                {/* Event Cards for Selected Date */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {showingsOnDate.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)', opacity: 0.5, fontSize: 13, fontWeight: 300 }}>Нет событий на этот день</div>
                    ) : (
                        showingsOnDate.map(s => {
                            const prop = s.event_type === 'viewing'
                                ? state.selectionItems?.find(p => p.id === s.property_id)
                                : state.properties.find(p => p.id === s.property_id);
                            const clients = state.clients.filter(c => (s.client_ids || [s.client_id]).includes(c.id));
                            const clientNames = clients.map(c => c.full_name).join(', ');
                            
                            const d = new Date(s.rawDate);
                            const time = !isNaN(d.getTime()) ? d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';

                            // Карточка сделки (Сделка / Задаток / Регистрация / Передача)
                            if (s.isDeal) {
                                return (
                                    <div key={s.id} className="card" style={{ 
                                        padding: '12px 16px',
                                        borderRadius: 16,
                                        border: '1px solid rgba(0, 82, 255, 0.2)',
                                        background: 'var(--surface)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <div className="font-oswald" style={{ fontSize: 18, fontWeight: 600, lineHeight: 1, letterSpacing: '0.02em', color: 'var(--text)' }}>
                                                {time || '—'}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ 
                                                    fontSize: 10, fontWeight: 600, textTransform: 'uppercase', padding: '3px 8px', 
                                                    borderRadius: 12,
                                                    background: s.event_type === 'deposit' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(5, 150, 105, 0.12)',
                                                    color: s.event_type === 'deposit' ? '#d97706' : '#059669',
                                                    display: 'inline-flex', alignItems: 'center', gap: 4
                                                }}>
                                                    {s.event_type === 'deposit' ? <Target size={11} /> : <Handshake size={11} />}
                                                    {eventTypeLabels[s.event_type] || 'Сделка'}
                                                </span>
                                                <button
                                                    className="icon-btn-edit"
                                                    onClick={() => navigate('/tasks')}
                                                    title="Перейти к сделке"
                                                    style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 13, lineHeight: 1.3 }}>
                                                <Handshake size={14} color="#059669" style={{ flexShrink: 0, marginTop: 2 }} />
                                                <div>
                                                    <span style={{ fontWeight: 600, color: '#059669' }}>{s.title || 'Сделка'}</span>
                                                    {prop?.address && <span style={{ fontWeight: 500, color: 'var(--text)', marginLeft: 4 }}>· {prop.address}</span>}
                                                </div>
                                            </div>

                                            {s.deal_location && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                                                    <MapPin size={13} color="var(--primary)" style={{ flexShrink: 0 }} />
                                                    <span>{s.deal_location}</span>
                                                </div>
                                            )}

                                            {s.price && Number(s.price) > 0 && (
                                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                                                    {s.event_type === 'deposit' ? 'Сумма задатка:' : 'Цена:'} {Number(s.price).toLocaleString('ru-RU')} ₽
                                                </div>
                                            )}

                                            {clients.length > 0 && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                                                    <Users size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                                                    <span>{clientNames}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div key={s.id} className="card" style={{ 
                                    padding: '12px 16px',
                                    borderRadius: 16,
                                    border: s.status === 'failed' ? '1.5px solid rgba(220,38,38,0.2)' : '1px solid var(--border-light)',
                                    background: s.status === 'failed' ? 'rgba(254,242,242,0.6)' : 'var(--surface)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <div className="font-oswald" style={{ fontSize: 18, fontWeight: 600, lineHeight: 1, letterSpacing: '0.02em',
                                            color: s.status === 'failed' ? '#dc2626' : 'var(--text)'
                                        }}>{time}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span style={{ 
                                                fontSize: 10, fontWeight: 600, textTransform: 'uppercase', padding: '3px 8px', 
                                                borderRadius: 12, background: s.status === 'completed' ? '#ecfdf5' : s.status === 'failed' ? '#fef2f2' : 'var(--primary-light)',
                                                color: s.status === 'completed' ? '#059669' : s.status === 'failed' ? '#dc2626' : 'var(--primary)'
                                            }}>
                                                {getEventStatusLabel(s.event_type, s.status)}
                                            </span>
                                            {(!s.realtor_id || s.realtor_id === user?.id || user?.role === 'admin') && (
                                                <button className="icon-btn-edit" onClick={() => navigate(`/history/new?id=${s.id}`)} title="Редактировать" style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    <Pencil size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 13, lineHeight: 1.3 }}>
                                            <Building2 size={14} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
                                            <div>
                                                <span style={{ fontWeight: 600, color: s.status === 'failed' ? '#dc2626' : 'var(--primary)' }}>{eventTypeLabels[s.event_type] || 'Событие'}: </span>
                                                <span style={{ fontWeight: 500, color: 'var(--text)' }}>{prop?.address || 'Объект не указан'}</span>
                                            </div>
                                        </div>

                                        {clients.length > 0 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                                                <Users size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                                                <span>{clientNames}</span>
                                            </div>
                                        )}
                                    </div>

                                    {s.client_feedback && (
                                        <div style={{ 
                                            marginTop: 8, padding: '6px 10px', borderRadius: 8, background: 'var(--bg-light)',
                                            borderLeft: '3px solid var(--primary)', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12
                                        }}>
                                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Результат:</span>
                                            <span style={{ fontWeight: 400, color: 'var(--text)' }}>
                                                {feedbackOptions.find(f => f.val === s.client_feedback)?.label}
                                                {s.feedback_comment && <span style={{ opacity: 0.6 }}> · {s.feedback_comment}</span>}
                                            </span>
                                        </div>
                                    )}

                                    {s.status === 'planned' && (!s.realtor_id || s.realtor_id === user?.id || user?.role === 'admin') && !feedbackId && (
                                        <button 
                                            className="card-clickable" 
                                            style={{ 
                                                marginTop: 8, width: '100%', height: 34, borderRadius: 10, border: 'none', 
                                                background: 'var(--primary)', color: 'white', fontWeight: 600, fontSize: 11,
                                                fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: '0.04em',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }} 
                                            onClick={() => completShowing(s.raw)}
                                        >
                                            Записать итог
                                        </button>
                                    )}
                                    
                                    {feedbackId === s.id && (
                                        <div style={{ marginTop: 10, borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
                                            <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>Итог встречи</div>
                                            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                                                {feedbackOptions.map(f => (
                                                    <button key={f.val} className="card-clickable" 
                                                        style={{ 
                                                            flex: 1, padding: '8px 4px', borderRadius: 8, border: '1px solid var(--border-light)',
                                                            fontSize: 10, fontWeight: 500, background: 'var(--surface)'
                                                        }} 
                                                        onClick={() => saveFeedback(s.raw, f.val)}
                                                    >
                                                        {f.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <textarea 
                                                className="form-textarea" 
                                                style={{ borderRadius: 10, fontSize: 12, padding: '8px 10px', minHeight: 48 }}
                                                value={feedbackComment} 
                                                onChange={e => setFeedbackComment(e.target.value)} 
                                                placeholder="Комментарий..." 
                                                rows={2} 
                                            />
                                            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                                <button className="card-clickable" style={{ flex: 1, height: 32, borderRadius: 8, background: '#f1f5f9', border: 'none', fontSize: 11, fontWeight: 500 }} onClick={() => saveFeedback(s.raw, 'failed')}>Не состоялся</button>
                                                <button className="card-clickable" style={{ width: 64, height: 32, borderRadius: 8, border: 'none', background: 'transparent', color: 'var(--text-secondary)', fontSize: 11 }} onClick={() => setFeedbackId(null)}>Отмена</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Timeline Section */}
                <div style={{ marginTop: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                        <div className="font-oswald" style={{ fontSize: 15, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text)' }}>Лента событий</div>
                        <button
                            className="card-clickable"
                            onClick={() => navigate('/history/new')}
                            style={{
                                width: 32, height: 32, borderRadius: 10, border: 'none',
                                background: 'var(--primary)', color: 'white',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(0,82,255,0.2)'
                            }}
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {allHistoryEvents.map(s => {
                            const prop = s.event_type === 'viewing'
                                ? state.selectionItems?.find(p => p.id === s.property_id)
                                : state.properties.find(p => p.id === s.property_id);
                            const clients = state.clients.filter(c => (s.client_ids || [s.client_id]).includes(c.id));
                            const clientNames = clients.map(c => c.full_name).join(', ');
                            const d = new Date(s.rawDate);
                            const dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : s.dateStr;
                            const timeStr = !isNaN(d.getTime()) ? d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '';
                            
                            return (
                                <div key={s.id} className="card-clickable" style={{
                                    display: 'flex', gap: 16, padding: '16px', borderRadius: 20,
                                    background: s.status === 'failed' ? 'rgba(254,242,242,0.5)' : 'var(--surface)',
                                    border: s.status === 'failed' ? '1px solid rgba(220,38,38,0.15)' : '1px solid rgba(0,0,0,0.02)'
                                }} onClick={() => {
                                    if (s.isDeal) {
                                        navigate('/tasks');
                                    } else {
                                        navigate(`/history/new?id=${s.id}`);
                                    }
                                }}>
                                    <div style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                                        justifyContent: 'center', width: 50, flexShrink: 0,
                                        borderRight: '1px solid rgba(0,0,0,0.05)', paddingRight: 16
                                    }}>
                                        <div className="font-oswald" style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                                            color: s.status === 'failed' ? '#dc2626' : (s.isDeal ? '#059669' : 'var(--primary)')
                                        }}>{dateStr}</div>
                                        <div style={{ fontSize: 10, fontWeight: 200, color: '#000000' }}>{timeStr}</div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
                                                color: s.status === 'failed' ? '#dc2626' : (s.isDeal ? '#059669' : 'var(--primary)')
                                            }}>{eventTypeLabels[s.event_type] || 'Событие'}</div>
                                            <div style={{ fontSize: 10, fontWeight: 600,
                                                color: s.status === 'completed' ? '#059669' : s.status === 'failed' ? '#dc2626' : '#94a3b8'
                                            }}>{s.isDeal ? (s.status === 'completed' ? 'Завершена' : 'В работе') : getEventStatusLabel(s.event_type, s.status)}</div>
                                        </div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                                            {s.title || (eventTypeLabels[s.event_type] || 'Событие')}{clientNames ? ` — ${clientNames}` : ''}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 300 }}>{prop?.address || 'Объект не указан'}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {allHistoryEvents.length === 0 && (
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
