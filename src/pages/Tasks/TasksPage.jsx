import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { nanoid } from '../../utils/nanoid';
import {
    isCalendarConfigured,
    isCalendarConnected,
    requestAccessToken,
    disconnectCalendar,
} from '../../lib/googleCalendar';

const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(new Date().getTime() + 86400000).toISOString().slice(0, 10);
const weekEnd = new Date(new Date().getTime() + 7 * 86400000).toISOString().slice(0, 10);

function TaskItem({ task, onToggle, onDelete, onEdit }) {
    const { state } = useApp();
    const client = task.client_id ? state.clients.find(c => c.id === task.client_id) : null;
    const prop = task.property_id ? state.properties.find(p => p.id === task.property_id) : null;
    const priorColors = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--success)' };
    return (
        <div style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-light)', alignItems: 'flex-start' }}>
            <button
                onClick={() => onToggle(task)}
                style={{
                    width: 22, height: 22, border: `2px solid ${task.status === 'done' ? 'var(--success)' : '#ccc'}`,
                    borderRadius: 6, background: task.status === 'done' ? 'var(--success)' : 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    flexShrink: 0, marginTop: 1, color: 'white', fontSize: 12, fontWeight: 700
                }}>
                {task.status === 'done' ? '✓' : ''}
            </button>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14, textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text)' }}>
                    {task.title}
                </div>
                {task.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>{task.description}</div>}
                {client && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Клиент: {client.full_name}</div>}
                {prop && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Продажа: {prop.address}</div>}
                {task.due_date && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{new Date(task.due_date).toLocaleDateString('ru-RU')}</div>}
            </div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button className="icon-btn" onClick={() => onEdit(task)}><Edit2 size={16} /></button>
                <button className="icon-btn" onClick={() => onDelete(task)}><Trash2 size={16} /></button>
                <div style={{ width: 6, height: 20, borderRadius: 3, background: priorColors[task.priority] || '#ccc', flexShrink: 0 }} />
            </div>
        </div>
    );
}

function Group({ label, tasks: ts, color, onToggle, onDelete, onEdit }) {
    if (ts.length === 0) return null;
    return (
        <div className="card">
            <div style={{ fontWeight: 700, fontSize: 14, color, marginBottom: 4 }}>{label} ({ts.length})</div>
            {ts.map(t => <TaskItem key={t.id} task={t} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />)}
        </div>
    );
}

export function TasksPage() {
    const { state, dispatch } = useApp();
    const { toast } = useToastContext();
    const user = state.currentUser;
    const navigate = useNavigate();
    const location = useLocation();

    const searchParams = new URLSearchParams(location.search);
    const prefillClientId = searchParams.get('client');

    const [filter, setFilter] = useState('today');
    const calendarStatus = state.calendarStatus;
    const [gcalConnected, setGcalConnected] = useState(() => isCalendarConnected());
    const gcalConfigured = isCalendarConfigured();
    const [newTask, setNewTask] = useState({
        title: searchParams.get('title') || '',
        description: searchParams.get('description') || '',
        due_date: searchParams.get('due_date') || '',
        client_id: prefillClientId || '',
        task_type: searchParams.get('task_type') || ''
    });

    const myClients = state.clients.filter(c => (user?.role === 'admin' || c.realtor_id === user?.id) && c.status === 'active');

    const TASK_TYPES = ['Позвонить', 'Встреча с собственником', 'Показ', 'Задаток', 'Сделка', 'Другое'];

    function handleFieldChange(field, value) {
        setNewTask(prev => {
            const updated = { ...prev, [field]: value };

            if (field === 'task_type' || field === 'client_id') {
                const type = field === 'task_type' ? value : prev.task_type;
                if (type && type !== 'Другое') {
                    const cid = field === 'client_id' ? value : prev.client_id;
                    const client = state.clients.find(c => c.id === cid);

                    const parts = [type];
                    if (client) parts.push(client.full_name);
                    updated.title = parts.join(' ');
                }
            }
            return updated;
        });
    }

    const tasks = state.tasks
        .filter(t => user?.role === 'admin' || t.realtor_id === user?.id)
        .filter(t => {
            if (t.status === 'done' && filter !== 'all') return false;

            const taskDate = t.due_date?.slice(0, 10);
            if (filter === 'today') {
                // For "today" we show today's tasks OR overdue tasks
                return taskDate <= today;
            }
            if (filter === 'week') {
                // For "week" we show everything up to end of week
                return taskDate <= weekEnd;
            }
            return true;
        });

    const overdue = tasks.filter(t => t.due_date < today && t.status === 'pending');
    const todayT = tasks.filter(t => t.due_date?.startsWith(today) && t.status === 'pending');
    const tomorrowT = tasks.filter(t => t.due_date?.startsWith(tomorrow) && t.status === 'pending');
    const later = tasks.filter(t => t.due_date?.slice(0, 10) > tomorrow && t.status === 'pending');
    const done = tasks.filter(t => t.status === 'done');

    function toggleDone(task) {
        dispatch({ type: 'UPDATE_TASK', task: { ...task, status: task.status === 'done' ? 'pending' : 'done' } });
    }

    async function addTask(e) {
        e.preventDefault();

        // Validation: ensure user is authenticated
        if (!user?.id) {
            toast.error('Ошибка: пользователь не авторизован. Перезагрузите страницу.');
            return;
        }

        // Validation: ensure title is present
        if (!newTask.title?.trim()) {
            toast.error('Укажите название задачи');
            return;
        }

        const taskId = newTask.id || nanoid();
        const taskToSave = {
            ...newTask,
            id: taskId,
            realtor_id: user.id,
            client_id: newTask.client_id || null,
            property_id: null,
            due_date: newTask.due_date || null,
            status: newTask.status || 'pending',
            priority: 'medium',
        };

        try {
            if (newTask.id) {
                dispatch({ type: 'UPDATE_TASK', task: taskToSave });
                toast.success('Задача обновлена');
            } else {
                if (newTask.task_type === 'Показ') {
                    dispatch({
                        type: 'ADD_SHOWING',
                        showing: {
                            realtor_id: user.id,
                            client_id: taskToSave.client_id,
                            property_id: taskToSave.property_id,
                            showing_date: taskToSave.due_date || new Date().toISOString(),
                            status: 'planned'
                        },
                        customTask: { ...taskToSave, realtor_id: user.id, status: 'pending' }
                    });
                    toast.success('Показ и задача созданы');
                } else {
                    dispatch({ type: 'ADD_TASK', task: taskToSave });
                    toast.success('Задача создана');
                }
            }

            setNewTask({ title: '', description: '', due_date: '', client_id: '', task_type: '' });
        } catch (err) {
            console.error('[Task save error]', err);
            toast.error('Ошибка при сохранении задачи');
        }
    }

    async function deleteTask(task) {
        if (window.confirm('Удалить задачу?')) {
            dispatch({ type: 'DELETE_TASK', id: task.id });
            toast.success('Задача удалена');
        }
    }

    function editTask(task) {
        setNewTask({ ...task, task_type: task.task_type || '' });
    }

    async function handleConnectCalendar() {
        try {
            await requestAccessToken(true);
            setGcalConnected(true);
            toast.success('Google Календарь подключен');
        } catch (err) {
            console.warn('[Calendar Connect Error]', err);
            toast.error('Не удалось подключить Google Календарь');
        }
    }

    async function handleDisconnectCalendar() {
        if (!window.confirm('Отключить Google Календарь? События не будут синхронизироваться.')) return;
        try {
            await disconnectCalendar();
            setGcalConnected(false);
            toast.success('Google Календарь отключен');
        } catch (err) {
            console.warn('[Calendar Disconnect Error]', err);
            toast.error('Ошибка при отключении календаря');
        }
    }

    return (
        <div className="page fade-in">
            <div className="topbar">
                <span className="topbar-title">Задачи</span>
            </div>
            <div className="page-content" style={{ paddingTop: 8 }}>
                {/* Google Calendar connection status */}
                {!gcalConfigured ? (
                    <div style={{
                        margin: '0 0 12px 0',
                        padding: '10px 14px',
                        borderRadius: 12,
                        fontSize: 12,
                        background: '#fff3e0',
                        color: '#e65100',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                    }}>
                        <Calendar size={16} />
                        <span>Google Календарь не настроен — перейдите в <a href="#/profile" style={{ color: '#e65100', fontWeight: 600 }}>Профиль</a> для настройки</span>
                    </div>
                ) : (
                    <div style={{
                        margin: '0 0 12px 0',
                        padding: '10px 14px',
                        borderRadius: 12,
                        fontSize: 13,
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        background: gcalConnected ? '#e8f5e9' : '#fff3e0',
                        color: gcalConnected ? '#2e7d32' : '#e65100',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Calendar size={18} />
                            <span>
                                {gcalConnected
                                    ? 'Google Календарь подключен'
                                    : 'Подключите Google Календарь для синхронизации задач'}
                            </span>
                        </div>
                        <button
                            onClick={gcalConnected ? handleDisconnectCalendar : handleConnectCalendar}
                            style={{
                                background: 'none',
                                border: `1px solid ${gcalConnected ? '#2e7d32' : '#e65100'}`,
                                borderRadius: 8,
                                padding: '4px 12px',
                                fontSize: 12,
                                fontWeight: 600,
                                color: gcalConnected ? '#2e7d32' : '#e65100',
                                cursor: 'pointer',
                            }}
                        >
                            {gcalConnected ? 'Отключить' : 'Подключить'}
                        </button>
                    </div>
                )}

                {calendarStatus && (
                    <div style={{
                        margin: '0 0 12px 0',
                        padding: '10px 14px',
                        borderRadius: 12,
                        fontSize: 13,
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        background: calendarStatus === 'ok' ? '#e8f5e9' : calendarStatus === 'error' ? '#fdecea' : '#e3f2fd',
                        color: calendarStatus === 'ok' ? '#2e7d32' : calendarStatus === 'error' ? '#c62828' : '#1565c0',
                    }}>
                        {calendarStatus === 'loading' && '🔄 Синхронизация с Google Календарем...'}
                        {calendarStatus === 'ok' && '✅ Добавлено в Google Календарь'}
                        {calendarStatus === 'error' && '⚠️ Ошибка календаря (задача сохранена локально)'}
                    </div>
                )}

                {/* Inline task form - always visible */}
                <form className="card" onSubmit={addTask} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{newTask.id ? 'Редактировать задачу' : 'Новая задача'}</div>

                    <select className="form-select" value={newTask.task_type || ''} onChange={e => handleFieldChange('task_type', e.target.value)}>
                        <option value="">Шаблон задачи...</option>
                        {TASK_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                    </select>

                    <select className="form-select" value={newTask.client_id || ''} onChange={e => {
                        if (e.target.value === 'new') {
                            const currentParams = new URLSearchParams();
                            currentParams.set('action', 'new');
                            if (newTask.title) currentParams.set('title', newTask.title);
                            if (newTask.due_date) currentParams.set('due_date', newTask.due_date);
                            if (newTask.task_type) currentParams.set('task_type', newTask.task_type);
                            if (newTask.description) currentParams.set('description', newTask.description);

                            navigate(`/clients/new?returnTo=${encodeURIComponent(location.pathname + '?' + currentParams.toString())}`);
                        } else {
                            handleFieldChange('client_id', e.target.value);
                        }
                    }}>
                        <option value="">Без клиента</option>
                        <option value="new">+ Создать нового клиента</option>
                        {myClients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>

                    <input className="form-input" placeholder="Название задачи" value={newTask.title} required onChange={e => handleFieldChange('title', e.target.value)} />
                    <input className="form-input" type="datetime-local" value={newTask.due_date ? newTask.due_date.slice(0, 16) : ''} onChange={e => handleFieldChange('due_date', e.target.value)} />

                    <div style={{ display: 'flex', gap: 8 }}>
                        {newTask.id && (
                            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => {
                                setNewTask({ title: '', description: '', due_date: '', client_id: '', task_type: '' });
                            }}>Очистить</button>
                        )}
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Сохранить</button>
                    </div>
                </form>

                {/* Task feed with filters */}
                <div className="tab-filters" style={{ marginBottom: 12 }}>
                    {[['today', 'Сегодня'], ['week', 'Неделя'], ['all', 'Все']].map(([v, l]) => (
                        <button key={v} className={`tab-filter ${filter === v ? 'active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
                    ))}
                </div>

                <Group label="Просрочено" tasks={overdue} color="var(--danger)" onToggle={toggleDone} onDelete={deleteTask} onEdit={editTask} />
                <Group label="Сегодня" tasks={todayT.filter(t => !overdue.find(o => o.id === t.id))} color="var(--warning)" onToggle={toggleDone} onDelete={deleteTask} onEdit={editTask} />
                <Group label="Завтра" tasks={tomorrowT} color="var(--success)" onToggle={toggleDone} onDelete={deleteTask} onEdit={editTask} />
                <Group label="Позже" tasks={later} color="var(--text-secondary)" onToggle={toggleDone} onDelete={deleteTask} onEdit={editTask} />
                {filter === 'all' && <Group label="Выполнено" tasks={done} color="var(--text-muted)" onToggle={toggleDone} onDelete={deleteTask} onEdit={editTask} />}

                {tasks.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-title">Нет задач</div>
                        <div className="empty-desc">Заполните форму выше, чтобы создать задачу</div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Default export for lazy loading
export { TasksPage as default };
