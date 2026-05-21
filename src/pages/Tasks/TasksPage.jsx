import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Pencil, Trash, Calendar, Phone, User, Plus, CheckCircle, Activity, Clock, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { nanoid } from '../../utils/nanoid';
import { FormCard } from '../../components/FormCard';
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
        <div style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: '1px solid var(--border-light)', alignItems: 'flex-start' }}>
            <button
                onClick={() => onToggle(task)}
                style={{
                    width: 26, height: 26, border: `2px solid ${task.status === 'done' ? '#10b981' : 'var(--border)'}`,
                    borderRadius: 8, background: task.status === 'done' ? '#10b981' : 'var(--surface)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    flexShrink: 0, marginTop: 2, color: 'white', fontSize: 14, fontWeight: 400,
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                }}>
                {task.status === 'done' ? '✓' : ''}
            </button>
            <div style={{ flex: 1 }}>
                <div className="font-oswald" style={{ 
                    fontWeight: 300, fontSize: 16, letterSpacing: '0.02em',
                    textDecoration: task.status === 'done' ? 'line-through' : 'none', 
                    color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text)' 
                }}>
                    {task.title}
                </div>
                {task.description && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{task.description}</div>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', marginTop: 6 }}>
                    {client && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 300, color: 'var(--primary)' }}>
                            <User size={12} /> {client.full_name}
                        </div>
                    )}
                    {task.due_date && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 300, color: 'var(--text-muted)' }}>
                            <Clock size={12} /> {new Date(task.due_date).toLocaleDateString('ru-RU')}
                        </div>
                    )}
                </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="card-clickable" style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--bg-light)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => onEdit(task)}>
                    <Pencil size={14} />
                </button>
                <button className="card-clickable" style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--danger-light)', color: 'var(--danger)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => onDelete(task)}>
                    <Trash size={14} />
                </button>
            </div>
        </div>
    );
}

function Group({ label, tasks: ts, color, onToggle, onDelete, onEdit }) {
    if (ts.length === 0) return null;
    return (
        <div className="card" style={{ padding: '24px', borderRadius: 32, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', background: 'var(--surface)', marginBottom: 16 }}>
            <div className="font-oswald" style={{ fontWeight: 300, fontSize: 14, color, letterSpacing: '0.01em', marginBottom: 12, display: 'flex', justifyContent: 'space-between' }}>
                {label} <span>{ts.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {ts.map(t => <TaskItem key={t.id} task={t} onToggle={onToggle} onDelete={onDelete} onEdit={onEdit} />)}
            </div>
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
    const [showForm, setShowForm] = useState(false);
    const [newTask, setNewTask] = useState({
        id: '',
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
            if (filter === 'today') return taskDate <= today;
            if (filter === 'week') return taskDate <= weekEnd;
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
        if (!newTask.title?.trim()) {
            toast.error('Укажите название задачи');
            return;
        }
        const taskId = newTask.id || nanoid();
        const taskToSave = { ...newTask, id: taskId, realtor_id: user.id, client_id: newTask.client_id || null, property_id: null, due_date: newTask.due_date || null, status: newTask.status || 'pending', priority: 'medium' };
        try {
            if (newTask.id) {
                dispatch({ type: 'UPDATE_TASK', task: taskToSave });
                toast.success('Обновлено');
            } else {
                dispatch({ type: 'ADD_TASK', task: taskToSave });
                toast.success('Создано');
            }
            setNewTask({ id: '', title: '', description: '', due_date: '', client_id: '', task_type: '' });
            setShowForm(false);
        } catch (err) { toast.error('Ошибка'); }
    }

    async function deleteTask(task) {
        if (!window.confirm('Удалить задачу?')) return;
        try {
            dispatch({ type: 'DELETE_TASK', id: task.id });
            toast.success('Удалено');
        } catch (err) { toast.error('Ошибка'); }
    }

    function editTask(task) {
        setNewTask({ ...task, task_type: task.task_type || '' });
        setShowForm(true);
    }

    return (
        <div className="page fade-in">
            {/* Sticky Header — Open Design */}
            <div className="topbar sticky" style={{ 
                background: 'var(--topbar-bg)', 
                backdropFilter: 'blur(24px) saturate(180%)',
                padding: '20px',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                height: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span className="topbar-title font-oswald" style={{ letterSpacing: '0.01em', fontSize: 22, fontWeight: 300 }}>Задачи и план</span>
                    <button className="card-clickable" onClick={() => { setNewTask({ id: '', title: '', description: '', due_date: '', client_id: '', task_type: '' }); setShowForm(!showForm); }} style={{ 
                        width: 44, height: 44, borderRadius: 14, background: 'var(--primary)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Plus size={24} />
                    </button>
                </div>
            </div>

            <div className="page-content" style={{ padding: '20px 20px 120px', gap: 16 }}>
                
                {/* Quick Actions Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <button className="card-clickable" onClick={() => navigate('/tasks/meeting-owner')} style={{ padding: '16px', borderRadius: 24, background: 'var(--surface)', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} /></div>
                        <span className="font-oswald" style={{ fontSize: 14, fontWeight: 300, letterSpacing: '0.02em' }}>Встреча</span>
                    </button>
                    <button className="card-clickable" onClick={() => navigate('/tasks/call')} style={{ padding: '16px', borderRadius: 24, background: 'var(--surface)', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
                        <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Phone size={20} /></div>
                        <span className="font-oswald" style={{ fontSize: 14, fontWeight: 300, letterSpacing: '0.02em' }}>Звонок</span>
                    </button>
                </div>

                {/* Inline Form */}
                {showForm && (
                    <FormCard title={newTask.id ? 'Изменить задачу' : 'Новая задача'} onClose={() => setShowForm(false)}>
                        <form onSubmit={addTask} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div className="form-group">
                                <label className="font-oswald" style={{ fontSize: 13, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>Шаблон и клиент</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <select className="form-input" style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontWeight: 300 }} value={newTask.task_type || ''} onChange={e => handleFieldChange('task_type', e.target.value)}>
                                        <option value="">Тип задачи...</option>
                                        {TASK_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                                    </select>
                                    <select className="form-input" style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontWeight: 300 }} value={newTask.client_id || ''} onChange={e => handleFieldChange('client_id', e.target.value)}>
                                        <option value="">Без клиента</option>
                                        {myClients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="font-oswald" style={{ fontSize: 13, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>Детали</label>
                                <input className="form-input" style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontWeight: 300, marginBottom: 8 }} placeholder="Название задачи" value={newTask.title} required onChange={e => handleFieldChange('title', e.target.value)} />
                                <input className="form-input" style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontWeight: 300 }} type="datetime-local" value={newTask.due_date ? newTask.due_date.slice(0, 16) : ''} onChange={e => handleFieldChange('due_date', e.target.value)} />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ height: 50, borderRadius: 16, fontWeight: 300, marginTop: 8 }}>{newTask.id ? 'Сохранить' : 'Добавить'}</button>
                        </form>
                    </FormCard>
                )}

                {/* Filters */}
                <div className="tab-filters" style={{ padding: '4px 0', gap: 10 }}>
                    {[['today', 'Сегодня'], ['week', 'Неделя'], ['all', 'Все']].map(([v, l]) => (
                        <button key={v} className={`tab-filter ${filter === v ? 'active' : ''}`} style={{ 
                            padding: '8px 16px', borderRadius: 12, border: 'none', fontSize: 13, fontWeight: 300,
                            background: filter === v ? 'var(--primary)' : 'var(--surface)',
                            color: filter === v ? 'white' : 'var(--text-secondary)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                            fontFamily: 'Oswald'
                        }} onClick={() => setFilter(v)}>{l}</button>
                    ))}
                </div>

                {/* Groups */}
                <Group label="Просрочено" tasks={overdue} color="var(--danger)" onToggle={toggleDone} onDelete={deleteTask} onEdit={editTask} />
                <Group label="Сегодня" tasks={todayT.filter(t => !overdue.find(o => o.id === t.id))} color="#f59e0b" onToggle={toggleDone} onDelete={deleteTask} onEdit={editTask} />
                <Group label="Завтра" tasks={tomorrowT} color="#10b981" onToggle={toggleDone} onDelete={deleteTask} onEdit={editTask} />
                <Group label="Позже" tasks={later} color="var(--text-secondary)" onToggle={toggleDone} onDelete={deleteTask} onEdit={editTask} />
                {filter === 'all' && <Group label="Выполнено" tasks={done} color="var(--text-muted)" onToggle={toggleDone} onDelete={deleteTask} onEdit={editTask} />}

                {tasks.length === 0 && (
                    <div className="empty-state" style={{ padding: '40px 0' }}>
                        <div style={{ width: 64, height: 64, background: 'var(--bg-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--text-muted)' }}>
                            <Activity size={28} />
                        </div>
                        <div className="font-oswald" style={{ fontSize: 16, fontWeight: 300, color: 'var(--text-muted)' }}>Дел нет</div>
                    </div>
                )}
            </div>
        </div>
    );
}

export { TasksPage as default };
