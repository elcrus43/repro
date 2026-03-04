import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { nanoid } from '../../utils/matching';
import { Edit2, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

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
                {prop && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Объект: {prop.address}</div>}
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
    const user = state.currentUser;
    const location = useLocation();

    const searchParams = new URLSearchParams(location.search);
    const prefillClientId = searchParams.get('client');
    const autoOpenForm = searchParams.get('action') === 'new';

    const [filter, setFilter] = useState('today');
    const [showForm, setShowForm] = useState(autoOpenForm);
    const [newTask, setNewTask] = useState({
        title: '', description: '', due_date: '', priority: 'medium',
        client_id: prefillClientId || '', property_id: '', task_type: ''
    });

    const myClients = state.clients.filter(c => c.realtor_id === user?.id && c.status === 'active');
    const myProperties = state.properties.filter(p => p.realtor_id === user?.id && p.status === 'active');

    const TASK_TYPES = ['Позвонить', 'Встреча с собственником', 'Показ', 'Задаток', 'Сделка', 'Другое'];

    function handleFieldChange(field, value) {
        setNewTask(prev => {
            const updated = { ...prev, [field]: value };

            if (field === 'task_type' || field === 'client_id' || field === 'property_id') {
                const type = field === 'task_type' ? value : prev.task_type;
                if (type && type !== 'Другое') {
                    const cid = field === 'client_id' ? value : prev.client_id;
                    const pid = field === 'property_id' ? value : prev.property_id;
                    const client = state.clients.find(c => c.id === cid);
                    const prop = state.properties.find(p => p.id === pid);

                    const parts = [type];
                    if (client) parts.push(client.full_name);
                    if (prop) {
                        const shortAddr = prop.address ? prop.address.split(',')[0] : prop.city;
                        if (shortAddr) parts.push(shortAddr);
                    }
                    updated.title = parts.join(' ');
                }
            }
            return updated;
        });
    }

    const tasks = state.tasks
        .filter(t => t.realtor_id === user?.id)
        .filter(t => {
            if (filter === 'today') return t.due_date?.startsWith(today);
            if (filter === 'week') {
                const d = t.due_date?.slice(0, 10);
                return d >= today && d <= weekEnd;
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

    function addTask(e) {
        e.preventDefault();
        const taskToSave = { ...newTask, client_id: newTask.client_id || null, property_id: newTask.property_id || null, due_date: newTask.due_date || null };
        delete taskToSave.task_type;
        if (newTask.id) {
            dispatch({ type: 'UPDATE_TASK', task: taskToSave });
        } else {
            if (newTask.task_type === 'Показ') {
                dispatch({
                    type: 'ADD_SHOWING',
                    showing: {
                        realtor_id: user?.id,
                        client_id: taskToSave.client_id,
                        property_id: taskToSave.property_id,
                        showing_date: taskToSave.due_date || new Date().toISOString(),
                        status: 'planned'
                    },
                    customTask: { ...taskToSave, realtor_id: user?.id, status: 'pending' }
                });
            } else {
                dispatch({ type: 'ADD_TASK', task: { ...taskToSave, realtor_id: user?.id, status: 'pending' } });
            }
        }
        setNewTask({ title: '', description: '', due_date: '', priority: 'medium', client_id: '', property_id: '', task_type: '' });
        setShowForm(false);
    }

    function deleteTask(task) {
        if (window.confirm('Удалить задачу?')) {
            dispatch({ type: 'DELETE_TASK', id: task.id });
        }
    }

    function editTask(task) {
        setNewTask({ ...task, task_type: task.task_type || '' });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    return (
        <div className="page fade-in">
            <div className="topbar">
                <span className="topbar-title">Задачи</span>
                <button className="btn btn-sm btn-primary" onClick={() => setShowForm(f => !f)}>+ Добавить</button>
            </div>
            <div className="tab-filters">
                {[['today', 'Сегодня'], ['week', 'Неделя'], ['all', 'Все']].map(([v, l]) => (
                    <button key={v} className={`tab-filter ${filter === v ? 'active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
                ))}
            </div>
            <div className="page-content" style={{ paddingTop: 8 }}>
                {showForm && (
                    <form className="card" onSubmit={addTask} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{newTask.id ? 'Редактировать задачу' : 'Новая задача'}</div>

                        <select className="form-select" value={newTask.task_type || ''} onChange={e => handleFieldChange('task_type', e.target.value)}>
                            <option value="">Шаблон задачи...</option>
                            {TASK_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <select className="form-select" value={newTask.client_id || ''} onChange={e => handleFieldChange('client_id', e.target.value)}>
                                <option value="">Без клиента</option>
                                {myClients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                            </select>
                            <select className="form-select" value={newTask.property_id || ''} onChange={e => handleFieldChange('property_id', e.target.value)}>
                                <option value="">Без объекта</option>
                                {myProperties.map(p => <option key={p.id} value={p.id}>{p.address || p.city}</option>)}
                            </select>
                        </div>

                        <input className="form-input" placeholder="Название задачи" value={newTask.title} required onChange={e => handleFieldChange('title', e.target.value)} />
                        <input className="form-input" type="datetime-local" value={newTask.due_date ? newTask.due_date.slice(0, 16) : ''} onChange={e => handleFieldChange('due_date', e.target.value)} />
                        <div className="chip-group">
                            {[['high', 'Важная'], ['medium', 'Средняя'], ['low', 'Низкая']].map(([v, l]) => (
                                <button key={v} type="button" className={`chip ${newTask.priority === v ? 'active' : ''}`} onClick={() => handleFieldChange('priority', v)}>{l}</button>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowForm(false)}>Отмена</button>
                            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{newTask.id ? 'Сохранить' : 'Добавить'}</button>
                        </div>
                    </form>
                )}

                <Group label="Просрочено" tasks={overdue} color="var(--danger)" onToggle={toggleDone} onDelete={deleteTask} onEdit={editTask} />
                <Group label="Сегодня" tasks={todayT.filter(t => !overdue.find(o => o.id === t.id))} color="var(--warning)" onToggle={toggleDone} onDelete={deleteTask} onEdit={editTask} />
                <Group label="Завтра" tasks={tomorrowT} color="var(--success)" onToggle={toggleDone} onDelete={deleteTask} onEdit={editTask} />
                <Group label="Позже" tasks={later} color="var(--text-secondary)" onToggle={toggleDone} onDelete={deleteTask} onEdit={editTask} />
                {filter === 'all' && <Group label="Выполнено" tasks={done} color="var(--text-muted)" onToggle={toggleDone} onDelete={deleteTask} onEdit={editTask} />}

                {tasks.length === 0 && !showForm && (
                    <div className="empty-state">
                        <div className="empty-title">Нет задач</div>
                        <div className="empty-desc">Добавьте задачу или напоминание</div>
                        <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Добавить задачу</button>
                    </div>
                )}
            </div>
        </div>
    );
}
