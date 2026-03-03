import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { nanoid } from '../../utils/nanoid';

export function TasksPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const user = state.currentUser;
    const [filter, setFilter] = useState('today');
    const [showForm, setShowForm] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', description: '', due_date: '', priority: 'medium' });

    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

    const tasks = state.tasks
        .filter(t => t.realtor_id === user?.id)
        .filter(t => {
            if (filter === 'today') return t.due_date?.startsWith(today);
            if (filter === 'week') {
                const d = t.due_date?.slice(0, 10);
                return d >= today && d <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
            }
            return true;
        });

    const overdue = tasks.filter(t => t.due_date < new Date().toISOString() && t.status === 'pending');
    const todayT = tasks.filter(t => t.due_date?.startsWith(today) && t.status === 'pending');
    const tomorrowT = tasks.filter(t => t.due_date?.startsWith(tomorrow) && t.status === 'pending');
    const later = tasks.filter(t => t.due_date?.slice(0, 10) > tomorrow && t.status === 'pending');
    const done = tasks.filter(t => t.status === 'done');

    function toggleDone(task) {
        dispatch({ type: 'UPDATE_TASK', task: { ...task, status: task.status === 'done' ? 'pending' : 'done' } });
    }

    function addTask(e) {
        e.preventDefault();
        dispatch({ type: 'ADD_TASK', task: { ...newTask, realtor_id: user?.id, status: 'pending' } });
        setNewTask({ title: '', description: '', due_date: '', priority: 'medium' });
        setShowForm(false);
    }

    function TaskItem({ task }) {
        const client = task.client_id ? state.clients.find(c => c.id === task.client_id) : null;
        const prop = task.property_id ? state.properties.find(p => p.id === task.property_id) : null;
        const priorColors = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--success)' };
        return (
            <div style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border-light)', alignItems: 'flex-start' }}>
                <button
                    onClick={() => toggleDone(task)}
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
                <div style={{ width: 6, height: '100%', minHeight: 20, borderRadius: 3, background: priorColors[task.priority] || '#ccc', flexShrink: 0 }} />
            </div>
        );
    }

    function Group({ label, tasks: ts, color }) {
        if (ts.length === 0) return null;
        return (
            <div className="card">
                <div style={{ fontWeight: 700, fontSize: 14, color, marginBottom: 4 }}>{label} ({ts.length})</div>
                {ts.map(t => <TaskItem key={t.id} task={t} />)}
            </div>
        );
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
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>Новая задача</div>
                        <input className="form-input" placeholder="Название задачи" value={newTask.title} required onChange={e => setNewTask(t => ({ ...t, title: e.target.value }))} />
                        <input className="form-input" type="datetime-local" value={newTask.due_date} onChange={e => setNewTask(t => ({ ...t, due_date: e.target.value }))} />
                        <div className="chip-group">
                            {[['high', 'Важная'], ['medium', 'Средняя'], ['low', 'Низкая']].map(([v, l]) => (
                                <button key={v} type="button" className={`chip ${newTask.priority === v ? 'active' : ''}`} onClick={() => setNewTask(t => ({ ...t, priority: v }))}>{l}</button>
                            ))}
                        </div>
                        <button type="submit" className="btn btn-primary">Добавить</button>
                    </form>
                )}

                <Group label="Просрочено" tasks={overdue} color="var(--danger)" />
                <Group label="Сегодня" tasks={todayT.filter(t => !overdue.find(o => o.id === t.id))} color="var(--warning)" />
                <Group label="Завтра" tasks={tomorrowT} color="var(--success)" />
                <Group label="Позже" tasks={later} color="var(--text-secondary)" />
                {filter === 'all' && <Group label="Выполнено" tasks={done} color="var(--text-muted)" />}

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
