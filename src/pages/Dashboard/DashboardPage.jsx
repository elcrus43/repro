import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import {
    Sparkles, Users, Home, Search, Target, ArrowRight, Cake,
    Check, Calendar, Clock, Phone, Plus, AlertCircle, CheckCircle2, ChevronRight,
    Pencil, Trash2, X, Handshake, FileCheck
} from 'lucide-react';
import { hasPassedDealStage, isDealTypeCompatible } from '../../utils/matching';
import { nanoid } from '../../utils/nanoid';
import { toLocalISOString, parseLocalDateTime } from '../../utils/format';

export function DashboardPage() {
    const { state, dispatch } = useApp();
    const { toast } = useToastContext();
    const navigate = useNavigate();

    const [plannerFilter, setPlannerFilter] = useState('today'); // 'today' | 'week' | 'overdue' | 'selectedDay'
    const [selectedDayStr, setSelectedDayStr] = useState(null);

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
        const base = state.currentUser?.role === 'admin'
            ? state.matches
            : state.matches.filter(m => {
                const req = state.requests.find(r => r.id === m.request_id);
                return req?.realtor_id === state.currentUser?.id;
            });
        return base.filter(m => {
            const prop = state.properties.find(p => p.id === m.property_id);
            const req = state.requests.find(r => r.id === m.request_id);
            return prop && !hasPassedDealStage(prop, state.deals) && req?.status === 'active' && isDealTypeCompatible(prop, req);
        });
    }, [state.matches, state.requests, state.properties, state.deals, state.currentUser?.role, state.currentUser?.id]);

    const myClosedDeals = useMemo(() =>
        (state.deals || []).filter(d => (state.currentUser?.role === 'admin' || d.realtor_id === state.currentUser?.id) && d.status === 'closed'),
        [state.deals, state.currentUser?.role, state.currentUser?.id]
    );

    const newMatches = useMemo(() =>
        myMatches
            .filter(m => m.status === 'new')
            .sort((a, b) => b.score - a.score)
            .slice(0, 5),
        [myMatches]
    );

    // Хелпер даты YYYY-MM-DD
    const toLocalDateStr = (dateOrStr) => {
        if (!dateOrStr) return '';
        const d = new Date(dateOrStr);
        if (isNaN(d.getTime())) return '';
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const todayStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    // 7 дней текущей недели (Пн – Вс)
    const weekDays = useMemo(() => {
        const now = new Date();
        const currentDay = now.getDay(); // 0 - Вс, 1 - Пн ... 6 - Сб
        const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
        const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + distanceToMonday);

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
    }, [todayStr]);

    const weekStartStr = weekDays[0]?.dateStr;
    const weekEndStr = weekDays[6]?.dateStr;

    const weekRangeLabel = useMemo(() => {
        if (!weekDays.length) return '';
        const start = weekDays[0].date;
        const end = weekDays[6].date;
        const startMonth = start.toLocaleDateString('ru-RU', { month: 'short' });
        const endMonth = end.toLocaleDateString('ru-RU', { month: 'short' });
        if (startMonth === endMonth) {
            return `${start.getDate()}–${end.getDate()} ${endMonth}`;
        }
        return `${start.getDate()} ${startMonth} – ${end.getDate()} ${endMonth}`;
    }, [weekDays]);

    // Все задачи и события для планировщика
    const plannerItems = useMemo(() => {
        const isAdmin = state.currentUser?.role === 'admin';
        const userId = state.currentUser?.id;

        const rawTasks = (state.tasks || []).filter(t => isAdmin || t.realtor_id === userId);
        const rawShowings = (state.showings || []).filter(s => {
            if (isAdmin) return true;
            if (s.realtor_id === userId) return true;
            const prop = state.properties.find(p => p.id === s.property_id);
            return prop?.realtor_id === userId;
        });
        const rawDeals = (state.deals || []).filter(d => {
            if (isAdmin) return true;
            if (d.realtor_id === userId) return true;
            const prop = state.properties.find(p => p.id === d.property_id);
            return prop?.realtor_id === userId;
        });

        const toDateStr = (val) => {
            if (!val) return '';
            const d = new Date(val);
            if (isNaN(d.getTime())) return '';
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };

        const taskItems = rawTasks.map(t => {
            const dateStr = toDateStr(t.due_date);
            return {
                id: t.id,
                isShowing: false,
                isDeal: false,
                title: t.title || t.notes || (t.task_type || 'Задача'),
                description: t.description || '',
                dateStr,
                rawDate: t.due_date,
                status: t.status || 'pending',
                isDone: t.status === 'done',
                type: t.task_type || t.type || 'task',
                client_id: t.client_id,
                property_id: t.property_id,
                raw: t,
            };
        });

        const showingItems = rawShowings
            .filter(s => !rawTasks.some(t => t.id === s.id || (toDateStr(t.due_date) === toDateStr(s.showing_date) && t.property_id === s.property_id)))
            .map(s => {
                const dateStr = toDateStr(s.showing_date);
                return {
                    id: s.id,
                    isShowing: true,
                    isDeal: false,
                    title: s.notes || 'Показ объекта',
                    description: '',
                    dateStr,
                    rawDate: s.showing_date,
                    status: s.status || 'scheduled',
                    isDone: s.status === 'completed',
                    type: 'showing',
                    client_id: s.client_id,
                    property_id: s.property_id,
                    raw: s,
                };
            });

        const dealItems = [];
        rawDeals.forEach(d => {
            const client_id = (d.buyer_ids && d.buyer_ids[0]) || d.buyer_id || (d.seller_ids && d.seller_ids[0]) || d.seller_id || null;
            if (d.deal_date) {
                const dateStr = toDateStr(d.deal_date);
                dealItems.push({
                    id: d.id,
                    dealId: d.id,
                    isDeal: true,
                    isDeposit: false,
                    isShowing: false,
                    title: d.title ? `Сделка: ${d.title}` : 'Сделка',
                    description: d.deal_location ? `Место: ${d.deal_location}` : (d.notes || ''),
                    dateStr,
                    rawDate: d.deal_date,
                    status: d.status || 'active',
                    isDone: d.status === 'closed',
                    type: 'Сделка',
                    client_id,
                    property_id: d.property_id,
                    price: d.price,
                    raw: d,
                });
            }
            if (d.deposit_date && toDateStr(d.deposit_date) !== toDateStr(d.deal_date)) {
                const dateStr = toDateStr(d.deposit_date);
                const isDepositDone = Boolean(d.deposit_paid || d.status === 'closed');
                dealItems.push({
                    id: `${d.id}-deposit`,
                    dealId: d.id,
                    isDeal: true,
                    isDeposit: true,
                    isShowing: false,
                    title: d.title ? `Задаток: ${d.title}` : 'Задаток',
                    description: d.deposit_amount ? `Сумма: ${Number(d.deposit_amount).toLocaleString('ru-RU')} ₽` : (d.notes || ''),
                    dateStr,
                    rawDate: d.deposit_date,
                    status: isDepositDone ? 'closed' : 'active',
                    isDone: isDepositDone,
                    type: 'Задаток',
                    client_id,
                    property_id: d.property_id,
                    price: d.deposit_amount,
                    raw: d,
                });
            }
        });

        return [...taskItems, ...showingItems, ...dealItems];
    }, [state.tasks, state.showings, state.deals, state.properties, state.currentUser?.role, state.currentUser?.id]);

    const dayTaskCounts = useMemo(() => {
        const counts = {};
        weekDays.forEach(wd => {
            counts[wd.dateStr] = { total: 0, pending: 0, done: 0 };
        });
        plannerItems.forEach(item => {
            if (counts[item.dateStr]) {
                counts[item.dateStr].total++;
                if (item.isDone) {
                    counts[item.dateStr].done++;
                } else {
                    counts[item.dateStr].pending++;
                }
            }
        });
        return counts;
    }, [plannerItems, weekDays]);

    const overdueCount = useMemo(() => {
        return plannerItems.filter(i => i.dateStr && i.dateStr < todayStr && !i.isDone).length;
    }, [plannerItems, todayStr]);

    const weekTotal = useMemo(() => {
        return plannerItems.filter(i => i.dateStr >= weekStartStr && i.dateStr <= weekEndStr).length;
    }, [plannerItems, weekStartStr, weekEndStr]);

    const weekDone = useMemo(() => {
        return plannerItems.filter(i => i.dateStr >= weekStartStr && i.dateStr <= weekEndStr && i.isDone).length;
    }, [plannerItems, weekStartStr, weekEndStr]);

    const todayPending = useMemo(() => {
        return plannerItems.filter(i => i.dateStr === todayStr && !i.isDone).length;
    }, [plannerItems, todayStr]);

    const displayedItems = useMemo(() => {
        let list = [];
        if (plannerFilter === 'selectedDay' && selectedDayStr) {
            list = plannerItems.filter(i => i.dateStr === selectedDayStr);
        } else if (plannerFilter === 'today') {
            list = plannerItems.filter(i => i.dateStr === todayStr);
        } else if (plannerFilter === 'overdue') {
            list = plannerItems.filter(i => i.dateStr && i.dateStr < todayStr && !i.isDone);
        } else {
            // 'week'
            list = plannerItems.filter(i => i.dateStr >= weekStartStr && i.dateStr <= weekEndStr);
        }
        return list.sort((a, b) => {
            if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
            return (a.dateStr || '').localeCompare(b.dateStr || '');
        });
    }, [plannerItems, plannerFilter, selectedDayStr, todayStr, weekStartStr, weekEndStr]);

    // Выполнение задачи в 1 клик
    const handleToggleTask = (item, e) => {
        e?.stopPropagation();
        if (item.isDeal) {
            if (item.isDeposit) {
                const nextPaid = !item.isDone;
                dispatch({
                    type: 'UPDATE_DEAL',
                    deal: { ...item.raw, deposit_paid: nextPaid, updated_at: new Date().toISOString() },
                });
                if (nextPaid) {
                    toast.success('✓ Задаток внесён!');
                } else {
                    toast.info('Задаток возвращён в работу');
                }
            } else {
                const nextStatus = item.isDone ? 'active' : 'closed';
                dispatch({
                    type: 'UPDATE_DEAL',
                    deal: { ...item.raw, status: nextStatus, updated_at: new Date().toISOString() },
                });
                if (nextStatus === 'closed') {
                    toast.success('✓ Сделка завершена!');
                } else {
                    toast.info('Сделка возвращена в работу');
                }
            }
        } else if (item.isShowing) {
            const nextStatus = item.isDone ? 'scheduled' : 'completed';
            dispatch({
                type: 'UPDATE_SHOWING',
                showing: { ...item.raw, status: nextStatus },
            });
            if (nextStatus === 'completed') {
                toast.success('✓ Показ завершен');
            } else {
                toast.info('Показ возвращен в план');
            }
        } else {
            const nextStatus = item.isDone ? 'pending' : 'done';
            dispatch({
                type: 'UPDATE_TASK',
                task: { ...item.raw, status: nextStatus },
            });
            if (nextStatus === 'done') {
                toast.success('✓ Задача выполнена!');
            } else {
                toast.info('Задача возвращена в работу');
            }
        }
    };

    // Состояние модального окна просмотра/редактирования/создания задачи
    const [taskModal, setTaskModal] = useState({
        isOpen: false,
        item: null,
        isNew: false,
        id: '',
        dealId: null,
        title: '',
        task_type: 'Позвонить',
        due_date: '',
        client_id: '',
        property_id: '',
        description: '',
        status: 'pending',
        isShowing: false,
        isDeal: false,
        isDeposit: false,
    });

    const handleOpenCreateModal = (defaultDateStr) => {
        const targetDate = defaultDateStr || selectedDayStr || todayStr;
        const initialDue = `${targetDate}T10:00`;
        setTaskModal({
            isOpen: true,
            item: null,
            isNew: true,
            id: '',
            dealId: null,
            title: '',
            task_type: 'Позвонить',
            due_date: initialDue,
            client_id: '',
            property_id: '',
            description: '',
            status: 'pending',
            isShowing: false,
            isDeal: false,
            isDeposit: false,
        });
    };

    const handleOpenEditModal = (item) => {
        let localDue = '';
        if (item.rawDate) {
            localDue = toLocalISOString(item.rawDate);
        } else if (item.dateStr) {
            localDue = `${item.dateStr}T10:00`;
        }
        setTaskModal({
            isOpen: true,
            item,
            isNew: false,
            id: item.id,
            dealId: item.dealId || (item.isDeal ? item.raw?.id : null),
            title: item.title || '',
            task_type: item.type || (item.isShowing ? 'Показ' : item.isDeal ? (item.isDeposit ? 'Задаток' : 'Сделка') : 'Позвонить'),
            due_date: localDue,
            client_id: item.client_id || '',
            property_id: item.property_id || '',
            description: item.description || item.raw?.notes || item.raw?.feedback_comment || '',
            status: item.isDone
                ? (item.isShowing ? 'completed' : item.isDeposit ? 'done' : item.isDeal ? 'closed' : 'done')
                : (item.isShowing ? 'scheduled' : item.isDeposit ? 'pending' : item.isDeal ? 'active' : 'pending'),
            isShowing: Boolean(item.isShowing),
            isDeal: Boolean(item.isDeal),
            isDeposit: Boolean(item.isDeposit),
        });
    };

    const handleModalFieldChange = (field, value) => {
        setTaskModal(prev => {
            const updated = { ...prev, [field]: value };
            if (field === 'task_type' || field === 'client_id') {
                const currentType = field === 'task_type' ? value : prev.task_type;
                const currentCid = field === 'client_id' ? value : prev.client_id;
                const client = state.clients.find(c => c.id === currentCid);
                const standardPrefixes = ['Позвонить', 'Встреча', 'Показ', 'Задаток', 'Сделка', 'Документы'];
                const isAutoTitle = !prev.title || standardPrefixes.some(p => prev.title.startsWith(p));
                if (isAutoTitle && currentType && currentType !== 'Другое') {
                    const parts = [currentType];
                    if (client?.full_name) parts.push(client.full_name);
                    updated.title = parts.join(' ');
                }
            }
            return updated;
        });
    };

    const handleSaveTaskModal = (e) => {
        e?.preventDefault();
        if (!taskModal.title?.trim()) {
            toast.error('Укажите название');
            return;
        }

        const parsedDate = taskModal.due_date ? parseLocalDateTime(taskModal.due_date) : null;
        const isoDate = parsedDate ? parsedDate.toISOString() : null;

        if (taskModal.isDeal) {
            const rawDeal = taskModal.item.raw;
            if (taskModal.isDeposit) {
                const isPaid = (taskModal.status === 'done' || taskModal.status === 'closed' || taskModal.status === 'completed');
                const updatedDeal = {
                    ...rawDeal,
                    title: taskModal.title.replace(/^Сделка:\s*|^Задаток:\s*/i, '').trim() || rawDeal.title,
                    notes: taskModal.description?.trim() || rawDeal.notes,
                    deposit_paid: isPaid,
                    deposit_date: isoDate || rawDeal.deposit_date,
                    client_id: taskModal.client_id || rawDeal.client_id,
                    property_id: taskModal.property_id || rawDeal.property_id,
                    updated_at: new Date().toISOString(),
                };
                dispatch({
                    type: 'UPDATE_DEAL',
                    deal: updatedDeal,
                });
                toast.success('Задаток сохранён');
            } else {
                const isClosed = (taskModal.status === 'done' || taskModal.status === 'closed' || taskModal.status === 'completed');
                const updatedDeal = {
                    ...rawDeal,
                    title: taskModal.title.replace(/^Сделка:\s*|^Задаток:\s*/i, '').trim() || rawDeal.title,
                    notes: taskModal.description?.trim() || rawDeal.notes,
                    status: isClosed ? 'closed' : 'active',
                    deal_date: isoDate || rawDeal.deal_date,
                    client_id: taskModal.client_id || rawDeal.client_id,
                    property_id: taskModal.property_id || rawDeal.property_id,
                    updated_at: new Date().toISOString(),
                };
                dispatch({
                    type: 'UPDATE_DEAL',
                    deal: updatedDeal,
                });
                toast.success('Сделка сохранена');
            }
        } else if (taskModal.isShowing) {
            const updatedShowing = {
                ...taskModal.item.raw,
                showing_date: isoDate || taskModal.item.raw?.showing_date || new Date().toISOString(),
                client_id: taskModal.client_id || null,
                property_id: taskModal.property_id || null,
                notes: taskModal.title.trim(),
                feedback_comment: taskModal.description?.trim() || null,
                status: taskModal.status === 'done' || taskModal.status === 'completed' ? 'completed' : 'scheduled',
            };
            dispatch({
                type: 'UPDATE_SHOWING',
                showing: updatedShowing,
            });
            toast.success('Показ обновлен');
        } else if (taskModal.isNew) {
            const newTask = {
                id: nanoid(),
                realtor_id: state.currentUser?.id,
                title: taskModal.title.trim(),
                description: taskModal.description?.trim() || '',
                task_type: taskModal.task_type || 'Другое',
                due_date: isoDate,
                client_id: taskModal.client_id || null,
                property_id: taskModal.property_id || null,
                status: taskModal.status || 'pending',
                priority: 'medium',
                created_at: new Date().toISOString(),
            };
            dispatch({
                type: 'ADD_TASK',
                task: newTask,
            });
            toast.success('Задача создана');
        } else {
            const updatedTask = {
                ...taskModal.item.raw,
                title: taskModal.title.trim(),
                description: taskModal.description?.trim() || '',
                task_type: taskModal.task_type || taskModal.item.raw?.task_type || 'Другое',
                due_date: isoDate,
                client_id: taskModal.client_id || null,
                property_id: taskModal.property_id || null,
                status: taskModal.status || 'pending',
                updated_at: new Date().toISOString(),
            };
            dispatch({
                type: 'UPDATE_TASK',
                task: updatedTask,
            });
            toast.success('Задача сохранена');
        }

        setTaskModal(prev => ({ ...prev, isOpen: false }));
    };

    const handleDeleteTaskModal = (itemOrId, isShowing) => {
        const id = typeof itemOrId === 'string' ? itemOrId : itemOrId?.id;
        const isDeal = typeof itemOrId === 'object' ? itemOrId?.isDeal : (isShowing === 'deal');
        const showing = typeof itemOrId === 'object' ? itemOrId?.isShowing : isShowing;
        const isDeposit = typeof itemOrId === 'object' ? itemOrId?.isDeposit : taskModal.isDeposit;

        if (isDeal || taskModal.isDeal) {
            if (isDeposit) {
                if (!window.confirm('Удалить задаток из этой сделки?')) {
                    return;
                }
                const rawDeal = (typeof itemOrId === 'object' ? itemOrId?.raw : null) || taskModal.item?.raw;
                if (rawDeal) {
                    dispatch({
                        type: 'UPDATE_DEAL',
                        deal: {
                            ...rawDeal,
                            deposit_date: null,
                            deposit_amount: 0,
                            deposit_paid: false,
                            updated_at: new Date().toISOString(),
                        }
                    });
                    toast.success('Задаток удален');
                    setTaskModal(prev => ({ ...prev, isOpen: false }));
                    return;
                }
            }
            if (!window.confirm('Удалить эту сделку?')) {
                return;
            }
            const dealId = itemOrId?.dealId || itemOrId?.raw?.id || id || taskModal.dealId;
            dispatch({ type: 'DELETE_DEAL', id: dealId });
            toast.success('Сделка удалена');
            setTaskModal(prev => ({ ...prev, isOpen: false }));
            return;
        }

        if (!window.confirm(showing ? 'Удалить этот показ?' : 'Удалить эту задачу?')) {
            return;
        }

        if (showing) {
            dispatch({ type: 'DELETE_SHOWING', id });
            toast.success('Показ удален');
        } else {
            dispatch({ type: 'DELETE_TASK', id });
            toast.success('Задача удалена');
        }

        setTaskModal(prev => ({ ...prev, isOpen: false }));
    };

    const getItemIconAndColor = (type, isShowing) => {
        if (isShowing || type === 'showing' || type === 'Показ') {
            return { icon: <Home size={13} />, label: 'Показ', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' };
        }
        switch (type) {
            case 'call':
            case 'Позвонить':
                return { icon: <Phone size={13} />, label: 'Звонок', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' };
            case 'meeting':
            case 'Встреча':
                return { icon: <Users size={13} />, label: 'Встреча', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
            case 'deposit':
            case 'Задаток':
                return { icon: <Target size={13} />, label: 'Задаток', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
            case 'deal':
            case 'Сделка':
                return { icon: <Handshake size={13} />, label: 'Сделка', color: '#059669', bg: 'rgba(5, 150, 105, 0.1)' };
            case 'document':
            case 'Документы':
                return { icon: <Clock size={13} />, label: 'Документы', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.1)' };
            default:
                return { icon: <Calendar size={13} />, label: type || 'Дело', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.1)' };
        }
    };

    const formatItemDateLabel = (dateStr, rawDate) => {
        if (!dateStr) return '';
        let time = '';
        if (rawDate && rawDate.includes('T')) {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) {
                const h = d.getHours();
                const m = d.getMinutes();
                if (h !== 0 || m !== 0) {
                    time = ` в ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                }
            }
        }
        if (dateStr === todayStr) return `Сегодня${time}`;
        const d = new Date(dateStr + 'T00:00:00');
        if (isNaN(d.getTime())) return dateStr;
        const DAY_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
        return `${DAY_SHORT[d.getDay()]}, ${d.getDate()} ${d.toLocaleDateString('ru-RU', { month: 'short' })}${time}`;
    };

    // Дни рождения клиентов (сегодня + ближайшие 7 дней)
    const birthdayClients = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return myClients
            .map(c => {
                const bd = c.birth_date || c.passport_details?.birth_date;
                if (!bd) return null;
                const bDate = new Date(bd);
                if (isNaN(bDate)) return null;
                // Дата ДР в этом году
                const thisYear = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
                let daysLeft = Math.round((thisYear - today) / (1000 * 60 * 60 * 24));
                // Если ДР уже прошёл в этом году — берём следующий
                if (daysLeft < 0) {
                    const nextYear = new Date(today.getFullYear() + 1, bDate.getMonth(), bDate.getDate());
                    daysLeft = Math.round((nextYear - today) / (1000 * 60 * 60 * 24));
                }
                if (daysLeft > 7) return null;
                const age = today.getFullYear() - bDate.getFullYear() + (daysLeft === 0 ? 0 : 0);
                return { ...c, _daysLeft: daysLeft, _age: age };
            })
            .filter(Boolean)
            .sort((a, b) => a._daysLeft - b._daysLeft);
    }, [myClients]);



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

            <div className="page-content" style={{ gap: 14, padding: '12px 16px', paddingBottom: 110 }}>
                {/* Unified CRM Stats Ribbon */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    background: 'var(--surface)',
                    borderRadius: 16,
                    border: '1px solid var(--border-light)',
                    padding: '8px 2px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                }}>
                    {/* Клиенты */}
                    <div
                        onClick={() => navigate('/clients')}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: '4px 2px',
                            borderRight: '1px solid var(--border-light)',
                        }}
                    >
                        <div style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: 'rgba(37, 99, 235, 0.08)',
                            color: '#2563eb',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: 4,
                        }}>
                            <Users size={14} />
                        </div>
                        <div className="font-oswald" style={{ fontSize: 17, fontWeight: 500, color: 'var(--text)', lineHeight: 1 }}>
                            {myClients.length}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>
                            Клиенты
                        </div>
                    </div>

                    {/* Объекты */}
                    <div
                        onClick={() => navigate('/properties')}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: '4px 2px',
                            borderRight: '1px solid var(--border-light)',
                        }}
                    >
                        <div style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: 'rgba(5, 150, 105, 0.08)',
                            color: '#059669',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: 4,
                        }}>
                            <Home size={14} />
                        </div>
                        <div className="font-oswald" style={{ fontSize: 17, fontWeight: 500, color: 'var(--text)', lineHeight: 1 }}>
                            {myProperties.length}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>
                            Объекты
                        </div>
                    </div>

                    {/* Запросы */}
                    <div
                        onClick={() => navigate('/requests')}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: '4px 2px',
                            borderRight: '1px solid var(--border-light)',
                        }}
                    >
                        <div style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: 'rgba(124, 58, 237, 0.08)',
                            color: '#7c3aed',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: 4,
                        }}>
                            <Search size={14} />
                        </div>
                        <div className="font-oswald" style={{ fontSize: 17, fontWeight: 500, color: 'var(--text)', lineHeight: 1 }}>
                            {myRequests.length}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>
                            Запросы
                        </div>
                    </div>

                    {/* Совпадения */}
                    <div
                        onClick={() => navigate('/matches')}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: '4px 2px',
                            borderRight: '1px solid var(--border-light)',
                        }}
                    >
                        <div style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: myMatches.length > 0 ? 'rgba(217, 119, 6, 0.15)' : 'var(--bg-light)',
                            color: myMatches.length > 0 ? '#d97706' : 'var(--text-muted)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: 4,
                        }}>
                            <Sparkles size={14} />
                        </div>
                        <div className="font-oswald" style={{ fontSize: 17, fontWeight: 500, color: myMatches.length > 0 ? '#d97706' : 'var(--text)', lineHeight: 1 }}>
                            {myMatches.length}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>
                            Матчи
                        </div>
                    </div>

                    {/* Сделки (завершенные) */}
                    <div
                        onClick={() => navigate('/tasks?filter=closed')}
                        title={`Завершенные сделки: ${myClosedDeals.length}`}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: '4px 2px',
                        }}
                    >
                        <div style={{
                            width: 28, height: 28, borderRadius: 8,
                            background: myClosedDeals.length > 0 ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-light)',
                            color: myClosedDeals.length > 0 ? '#10b981' : 'var(--text-muted)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            marginBottom: 4,
                        }}>
                            <CheckCircle2 size={14} />
                        </div>
                        <div className="font-oswald" style={{ fontSize: 17, fontWeight: 500, color: myClosedDeals.length > 0 ? '#10b981' : 'var(--text)', lineHeight: 1 }}>
                            {myClosedDeals.length}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>
                            Сделки
                        </div>
                    </div>
                </div>

                {/* Elevated Weekly Planner Card */}
                <div style={{
                    background: 'var(--surface)',
                    borderRadius: 20,
                    border: '1px solid var(--border-light)',
                    padding: '14px 14px',
                    boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                }}>
                    {/* Header: Title + Week Range + Tabs + Add Button */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                                width: 30, height: 30, borderRadius: 9,
                                background: 'var(--primary-light)', color: 'var(--primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Calendar size={16} />
                            </div>
                            <div>
                                <div className="font-oswald" style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)', lineHeight: 1.1 }}>
                                    Планы на неделю
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, marginTop: 1 }}>
                                    {weekRangeLabel}
                                </div>
                            </div>
                        </div>

                        {/* Tabs + Add Button */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ display: 'flex', background: 'var(--bg-light)', padding: 2, borderRadius: 8, gap: 2 }}>
                                <button
                                    type="button"
                                    onClick={() => { setPlannerFilter('today'); setSelectedDayStr(null); }}
                                    style={{
                                        padding: '4px 8px',
                                        borderRadius: 6,
                                        border: 'none',
                                        background: (plannerFilter === 'today' && !selectedDayStr) ? 'var(--surface)' : 'transparent',
                                        color: (plannerFilter === 'today' && !selectedDayStr) ? 'var(--primary)' : 'var(--text-muted)',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        boxShadow: (plannerFilter === 'today' && !selectedDayStr) ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                    }}
                                >
                                    Сегодня {todayPending > 0 ? `(${todayPending})` : ''}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setPlannerFilter('week'); setSelectedDayStr(null); }}
                                    style={{
                                        padding: '4px 8px',
                                        borderRadius: 6,
                                        border: 'none',
                                        background: (plannerFilter === 'week' && !selectedDayStr) ? 'var(--surface)' : 'transparent',
                                        color: (plannerFilter === 'week' && !selectedDayStr) ? 'var(--primary)' : 'var(--text-muted)',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        boxShadow: (plannerFilter === 'week' && !selectedDayStr) ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                    }}
                                >
                                    Неделя
                                </button>
                                {overdueCount > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => { setPlannerFilter('overdue'); setSelectedDayStr(null); }}
                                        style={{
                                            padding: '4px 7px',
                                            borderRadius: 6,
                                            border: 'none',
                                            background: plannerFilter === 'overdue' ? 'var(--danger)' : '#fee2e2',
                                            color: plannerFilter === 'overdue' ? 'white' : 'var(--danger)',
                                            fontSize: 11,
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        Долги ({overdueCount})
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => handleOpenCreateModal()}
                                className="btn btn-primary"
                                style={{
                                    padding: '5px 8px',
                                    height: 'auto',
                                    borderRadius: 8,
                                    fontSize: 11,
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 3,
                                }}
                                title="Новая задача"
                            >
                                <Plus size={13} />
                            </button>
                        </div>
                    </div>

                    {/* Week Strip (Пн - Вс) with Calendar track */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: 4,
                        padding: '6px 4px',
                        background: 'var(--bg-light)',
                        borderRadius: 12,
                    }}>
                        {weekDays.map(d => {
                            const isSelected = selectedDayStr === d.dateStr || (plannerFilter === 'today' && d.isToday && !selectedDayStr);
                            const dayCounts = dayTaskCounts[d.dateStr] || { total: 0, pending: 0, done: 0 };
                            return (
                                <button
                                    key={d.dateStr}
                                    type="button"
                                    onClick={() => {
                                        if (selectedDayStr === d.dateStr) {
                                            setSelectedDayStr(null);
                                            setPlannerFilter('week');
                                        } else {
                                            setSelectedDayStr(d.dateStr);
                                            setPlannerFilter('selectedDay');
                                        }
                                    }}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        padding: '6px 2px',
                                        borderRadius: 8,
                                        border: isSelected
                                            ? 'none'
                                            : d.isToday
                                                ? '1.5px solid var(--primary)'
                                                : '1px solid transparent',
                                        background: isSelected
                                            ? 'var(--primary)'
                                            : d.isToday
                                                ? 'var(--surface)'
                                                : 'transparent',
                                        color: isSelected
                                            ? 'white'
                                            : d.isToday
                                                ? 'var(--primary)'
                                                : 'var(--text)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        minWidth: 0,
                                        boxShadow: isSelected ? '0 2px 8px rgba(0, 82, 255, 0.25)' : 'none',
                                    }}
                                >
                                    <span style={{
                                        fontSize: 9,
                                        fontWeight: 600,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.02em',
                                        opacity: isSelected ? 0.9 : 0.6,
                                    }}>
                                        {d.dayName}
                                    </span>
                                    <span className="font-oswald" style={{
                                        fontSize: 14,
                                        fontWeight: isSelected || d.isToday ? 600 : 400,
                                        marginTop: 1,
                                        lineHeight: 1.1,
                                    }}>
                                        {d.dayNumber}
                                    </span>
                                    <div style={{ height: 4, marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {dayCounts.pending > 0 ? (
                                            <span style={{
                                                width: 4,
                                                height: 4,
                                                borderRadius: '50%',
                                                background: isSelected ? 'white' : 'var(--primary)',
                                            }} />
                                        ) : dayCounts.done > 0 ? (
                                            <span style={{
                                                width: 4,
                                                height: 4,
                                                borderRadius: '50%',
                                                background: isSelected ? 'white' : '#10b981',
                                                opacity: 0.8,
                                            }} />
                                        ) : null}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Task list inside the card */}
                    {displayedItems.length === 0 ? (
                        <div style={{
                            padding: '16px 12px',
                            background: 'var(--bg-light)',
                            borderRadius: 12,
                            textAlign: 'center',
                        }}>
                            <CheckCircle2 size={20} color="#10b981" style={{ margin: '0 auto 4px', opacity: 0.8 }} />
                            <div className="font-oswald" style={{ fontSize: 13, fontWeight: 400, color: 'var(--text)' }}>
                                {plannerFilter === 'overdue' ? 'Нет просроченных задач' : 'На этот день задач нет'}
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {displayedItems.map((item) => {
                                const client = state.clients.find(c => c.id === item.client_id);
                                const property = state.properties.find(p => p.id === item.property_id);
                                const typeConf = getItemIconAndColor(item.type, item.isShowing);

                                return (
                                    <div
                                        key={item.id}
                                        className="card-clickable"
                                        onClick={() => handleOpenEditModal(item)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: '9px 11px',
                                            background: item.isDone ? 'var(--bg-light)' : 'var(--bg)',
                                            borderRadius: 12,
                                            border: item.isDone ? '1px dashed var(--border)' : '1px solid var(--border-light)',
                                            opacity: item.isDone ? 0.65 : 1,
                                            transition: 'all 0.15s ease',
                                        }}
                                    >
                                        {/* 1-Click Complete Button */}
                                        <button
                                            type="button"
                                            onClick={(e) => handleToggleTask(item, e)}
                                            title={item.isDone ? "Вернуть в работу" : "Выполнить в 1 клик"}
                                            style={{
                                                width: 26,
                                                height: 26,
                                                borderRadius: 7,
                                                border: item.isDone ? 'none' : '2px solid var(--border)',
                                                background: item.isDone
                                                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                                    : 'var(--surface)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer',
                                                flexShrink: 0,
                                                color: 'white',
                                                boxShadow: item.isDone ? '0 2px 6px rgba(16, 185, 129, 0.25)' : 'none',
                                                transition: 'all 0.15s ease',
                                            }}
                                        >
                                            {item.isDone ? <Check size={15} strokeWidth={3} /> : null}
                                        </button>

                                        {/* Task Details */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                marginBottom: 2,
                                                flexWrap: 'wrap',
                                            }}>
                                                <span style={{
                                                    fontSize: 9,
                                                    fontWeight: 600,
                                                    color: typeConf.color,
                                                    background: typeConf.bg,
                                                    padding: '1px 5px',
                                                    borderRadius: 5,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 3,
                                                }}>
                                                    {typeConf.icon}
                                                    {typeConf.label}
                                                </span>

                                                {item.dateStr && (
                                                    <span style={{
                                                        fontSize: 10,
                                                        color: item.dateStr < todayStr && !item.isDone ? 'var(--danger)' : 'var(--text-muted)',
                                                        fontWeight: item.dateStr < todayStr && !item.isDone ? 600 : 400,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 3,
                                                    }}>
                                                        <Clock size={10} />
                                                        {formatItemDateLabel(item.dateStr, item.rawDate)}
                                                    </span>
                                                )}
                                            </div>

                                            <div style={{
                                                fontSize: 13,
                                                fontWeight: 500,
                                                color: item.isDone ? 'var(--text-muted)' : 'var(--text)',
                                                textDecoration: item.isDone ? 'line-through' : 'none',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}>
                                                {item.title}
                                            </div>

                                            {/* Client and Property tags */}
                                            {(client || property) && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
                                                    {client && (
                                                        <span
                                                            onClick={(e) => { e.stopPropagation(); navigate(`/clients/${client.id}`); }}
                                                            style={{
                                                                fontSize: 10,
                                                                color: 'var(--primary)',
                                                                background: 'var(--primary-light)',
                                                                padding: '1px 5px',
                                                                borderRadius: 5,
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            {client.full_name?.split(' ')[0]}
                                                        </span>
                                                    )}
                                                    {property && (
                                                        <span
                                                            onClick={(e) => { e.stopPropagation(); navigate(`/properties/${property.id}`); }}
                                                            style={{
                                                                fontSize: 10,
                                                                color: 'var(--text-secondary)',
                                                                background: 'var(--bg-light)',
                                                                padding: '1px 5px',
                                                                borderRadius: 5,
                                                                cursor: 'pointer',
                                                                maxWidth: 160,
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                        >
                                                            {property.address}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteTaskModal(item);
                                                }}
                                                title="Удалить"
                                                style={{
                                                    width: 26,
                                                    height: 26,
                                                    borderRadius: 6,
                                                    border: 'none',
                                                    background: 'transparent',
                                                    color: 'var(--text-muted)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease',
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                            <ChevronRight size={14} color="var(--text-muted)" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Week Progress summary */}
                    {weekTotal > 0 && (
                        <div style={{
                            padding: '6px 10px',
                            background: 'var(--bg-light)',
                            borderRadius: 8,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: 10,
                            color: 'var(--text-secondary)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <CheckCircle2 size={12} color="#10b981" />
                                <span>План недели: {weekDone} из {weekTotal} выполнено</span>
                            </div>
                            <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                                {Math.round((weekDone / weekTotal) * 100)}%
                            </div>
                        </div>
                    )}
                </div>

                {/* New Matches Feed */}
                {newMatches.length > 0 && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span className="font-oswald" style={{ fontSize: 16, fontWeight: 300, letterSpacing: '0.03em' }}>Новые совпадения</span>
                            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--primary)', cursor: 'pointer' }} onClick={() => navigate('/matches')}>Все ({myMatches.length}) →</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {newMatches.map(m => {
                                const prop = state.properties.find(p => p.id === m.property_id);
                                const req = state.requests.find(r => r.id === m.request_id);
                                const client = req ? state.clients.find(c => c.id === req.client_id) : null;
                                return (
                                    <div key={m.id} className="card card-clickable" onClick={() => navigate(`/matches/${m.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 16, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', background: 'var(--surface)' }}>
                                        <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#858518', fontWeight: 400, fontSize: 13, fontFamily: "'Oswald', sans-serif" }}>
                                            {m.score}%
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="font-oswald" style={{ fontWeight: 400, fontSize: 14, color: 'var(--text)' }}>{client?.full_name?.split(' ')[0]}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>{prop?.address || 'Объект без адреса'}</div>
                                        </div>
                                        <div style={{ 
                                            padding: '2px 6px', borderRadius: 6, fontSize: 9, fontWeight: 500, 
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

                {/* Дни рождения */}
                {birthdayClients.length > 0 && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Cake size={16} color="#d97706" />
                                <span className="font-oswald" style={{ fontSize: 16, fontWeight: 300, letterSpacing: '0.05em' }}>Дни рождения</span>
                            </div>
                            <span style={{
                                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
                                background: '#fef3c7', color: '#d97706'
                            }}>{birthdayClients.length} сл. в 7 дн.</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {birthdayClients.map(c => {
                                const isToday = c._daysLeft === 0;
                                return (
                                    <div
                                        key={c.id}
                                        className="card-clickable"
                                        onClick={() => navigate(`/clients/${c.id}`)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '12px 16px',
                                            borderRadius: 16,
                                            background: isToday
                                                ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                                                : 'var(--surface)',
                                            border: isToday ? '1.5px solid #f59e0b' : '1px solid var(--border-light)',
                                            boxShadow: isToday ? '0 4px 12px rgba(245,158,11,0.15)' : '0 2px 8px rgba(0,0,0,0.03)',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <div style={{
                                            width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                                            background: isToday ? '#f59e0b' : 'var(--bg-light)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: isToday ? 18 : 14
                                        }}>
                                            {isToday ? '🎂' : <Cake size={16} color="#d97706" />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{
                                                fontSize: 13, fontWeight: 600,
                                                color: isToday ? '#92400e' : 'var(--text)',
                                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                            }}>
                                                {c.full_name || 'Без имени'}
                                            </div>
                                            <div style={{ fontSize: 11, color: isToday ? '#b45309' : 'var(--text-secondary)', marginTop: 2 }}>
                                                {isToday ? `🎉 Сегодня ${c._age} лет!` : `через ${c._daysLeft} дн.  •  ${c._age} лет`}
                                            </div>
                                        </div>
                                        <ArrowRight size={14} color={isToday ? '#d97706' : 'var(--text-muted)'} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}



                {/* Quick actions */}
                <div className="dashboard-quick-actions" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <button className="btn btn-primary" style={{ borderRadius: 16, height: 52, fontSize: 13, fontWeight: 300, letterSpacing: '0.03em', padding: '0 8px' }} onClick={() => navigate('/properties/new')}>
                        + Объект
                    </button>
                    <button className="btn btn-secondary" style={{ borderRadius: 16, height: 52, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border-light)', fontSize: 13, fontWeight: 300, letterSpacing: '0.03em', padding: '0 8px' }} onClick={() => navigate('/clients/new')}>
                        + Клиент
                    </button>
                    <button className="btn btn-secondary" style={{ borderRadius: 16, height: 52, background: 'var(--surface)', color: 'var(--primary)', border: '1px solid var(--primary-light)', fontSize: 13, fontWeight: 500, letterSpacing: '0.03em', padding: '0 8px' }} onClick={() => handleOpenCreateModal()}>
                        + Задача
                    </button>
                </div>
            </div>

            {/* Modal for Creating / Editing Task */}
            {taskModal.isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1000,
                        background: 'rgba(15, 23, 42, 0.45)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 16,
                    }}
                    onClick={() => setTaskModal(prev => ({ ...prev, isOpen: false }))}
                >
                    <div
                        className="fade-in"
                        onClick={e => e.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: 480,
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            background: 'var(--surface)',
                            borderRadius: 24,
                            padding: '24px 20px',
                            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.25)',
                            border: '1px solid var(--border-light)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16,
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10,
                                    background: 'var(--primary-light)', color: 'var(--primary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {taskModal.isDeal ? <Handshake size={18} /> : (taskModal.isShowing ? <Home size={18} /> : <Calendar size={18} />)}
                                </div>
                                <div>
                                    <h3 className="font-oswald" style={{ fontSize: 18, fontWeight: 500, margin: 0, color: 'var(--text)' }}>
                                        {taskModal.isNew
                                            ? 'Новая задача'
                                            : (taskModal.isDeal
                                                ? (taskModal.isDeposit ? 'Задаток по сделке' : 'Редактирование сделки')
                                                : (taskModal.isShowing ? 'Редактирование показа' : 'Редактирование задачи'))}
                                    </h3>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        {taskModal.isNew ? 'Запланируйте звонок, встречу или дело' : 'Измените параметры или удалите'}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setTaskModal(prev => ({ ...prev, isOpen: false }))}
                                style={{
                                    width: 32, height: 32, borderRadius: 8, border: 'none',
                                    background: 'var(--bg-light)', color: 'var(--text-muted)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer',
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Deal quick link */}
                        {taskModal.isDeal && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                background: 'rgba(5, 150, 105, 0.08)',
                                borderRadius: 10,
                                border: '1px solid rgba(5, 150, 105, 0.2)',
                            }}>
                                <span style={{ fontSize: 12, color: '#059669', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Handshake size={14} /> Сделка в CRM
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTaskModal(prev => ({ ...prev, isOpen: false }));
                                        navigate('/tasks');
                                    }}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#059669',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                        padding: 0,
                                    }}
                                >
                                    Перейти в раздел «Сделки» →
                                </button>
                            </div>
                        )}

                        {/* Task Type selector */}
                        {!taskModal.isShowing && !taskModal.isDeal && (
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                                    Тип задачи
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {['Позвонить', 'Встреча', 'Показ', 'Задаток', 'Сделка', 'Документы', 'Другое'].map(t => {
                                        const isSel = taskModal.task_type === t;
                                        return (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => handleModalFieldChange('task_type', t)}
                                                style={{
                                                    padding: '5px 10px',
                                                    borderRadius: 8,
                                                    fontSize: 12,
                                                    fontWeight: isSel ? 600 : 400,
                                                    border: isSel ? '1px solid var(--primary)' : '1px solid var(--border-light)',
                                                    background: isSel ? 'var(--primary-light)' : 'var(--bg-light)',
                                                    color: isSel ? 'var(--primary)' : 'var(--text)',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                {t}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Title input */}
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                                {taskModal.isShowing ? 'Заметка к показу' : 'Название задачи *'}
                            </label>
                            <input
                                className="form-input"
                                style={{ height: 42, borderRadius: 10, fontSize: 14 }}
                                placeholder="Например: Позвонить по поводу задатка"
                                value={taskModal.title}
                                onChange={e => handleModalFieldChange('title', e.target.value)}
                            />
                        </div>

                        {/* Date & Time */}
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                                Дата и время
                            </label>
                            <input
                                type="datetime-local"
                                className="form-input"
                                style={{ height: 42, borderRadius: 10, fontSize: 13 }}
                                value={taskModal.due_date}
                                onChange={e => handleModalFieldChange('due_date', e.target.value)}
                            />
                        </div>

                        {/* Client selector */}
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                                Клиент
                            </label>
                            <select
                                className="form-input"
                                style={{ height: 42, borderRadius: 10, fontSize: 13 }}
                                value={taskModal.client_id}
                                onChange={e => handleModalFieldChange('client_id', e.target.value)}
                            >
                                <option value="">— Без клиента —</option>
                                {myClients.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.full_name} {c.phone ? `(${c.phone})` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Property selector */}
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                                Объект
                            </label>
                            <select
                                className="form-input"
                                style={{ height: 42, borderRadius: 10, fontSize: 13 }}
                                value={taskModal.property_id}
                                onChange={e => handleModalFieldChange('property_id', e.target.value)}
                            >
                                <option value="">— Без объекта —</option>
                                {myProperties.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.address || p.city} {p.price ? `(${p.price.toLocaleString()} ₽)` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Description / Notes */}
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                                Комментарий / детали
                            </label>
                            <textarea
                                className="form-input"
                                rows={2}
                                style={{ height: 'auto', borderRadius: 10, fontSize: 13, resize: 'vertical' }}
                                placeholder="Дополнительная информация..."
                                value={taskModal.description}
                                onChange={e => handleModalFieldChange('description', e.target.value)}
                            />
                        </div>

                        {/* Status switcher */}
                        {!taskModal.isNew && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-light)', borderRadius: 12 }}>
                                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Статус:</span>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <button
                                        type="button"
                                        onClick={() => handleModalFieldChange('status', taskModal.isShowing ? 'scheduled' : taskModal.isDeal ? (taskModal.isDeposit ? 'pending' : 'active') : 'pending')}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: 6,
                                            fontSize: 12,
                                            fontWeight: 500,
                                            border: 'none',
                                            cursor: 'pointer',
                                            background: (taskModal.status === 'pending' || taskModal.status === 'scheduled' || taskModal.status === 'active') ? 'var(--primary)' : 'transparent',
                                            color: (taskModal.status === 'pending' || taskModal.status === 'scheduled' || taskModal.status === 'active') ? 'white' : 'var(--text-muted)',
                                        }}
                                    >
                                        В работе
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleModalFieldChange('status', taskModal.isShowing ? 'completed' : taskModal.isDeal ? (taskModal.isDeposit ? 'done' : 'closed') : 'done')}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: 6,
                                            fontSize: 12,
                                            fontWeight: 500,
                                            border: 'none',
                                            cursor: 'pointer',
                                            background: (taskModal.status === 'done' || taskModal.status === 'completed' || taskModal.status === 'closed') ? '#10b981' : 'transparent',
                                            color: (taskModal.status === 'done' || taskModal.status === 'completed' || taskModal.status === 'closed') ? 'white' : 'var(--text-muted)',
                                        }}
                                    >
                                        {taskModal.isDeposit ? 'Внесён' : (taskModal.isDeal ? 'Завершена' : 'Выполнено')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                            {!taskModal.isNew && (
                                <button
                                    type="button"
                                    onClick={() => handleDeleteTaskModal(taskModal.item)}
                                    className="btn btn-secondary"
                                    style={{
                                        height: 46,
                                        borderRadius: 12,
                                        border: '1px solid #fee2e2',
                                        background: '#fff1f2',
                                        color: '#ef4444',
                                        padding: '0 14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        fontSize: 13,
                                        fontWeight: 500,
                                    }}
                                >
                                    <Trash2 size={15} />
                                    Удалить
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={() => setTaskModal(prev => ({ ...prev, isOpen: false }))}
                                className="btn btn-secondary"
                                style={{
                                    flex: 1,
                                    height: 46,
                                    borderRadius: 12,
                                    fontSize: 13,
                                    fontWeight: 400,
                                    background: 'var(--bg-light)',
                                    border: 'none',
                                    color: 'var(--text-secondary)',
                                }}
                            >
                                Отмена
                            </button>

                            <button
                                type="button"
                                onClick={handleSaveTaskModal}
                                className="btn btn-primary"
                                style={{
                                    flex: 1.3,
                                    height: 46,
                                    borderRadius: 12,
                                    fontSize: 13,
                                    fontWeight: 500,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                }}
                            >
                                <Check size={16} />
                                Сохранить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default DashboardPage;
