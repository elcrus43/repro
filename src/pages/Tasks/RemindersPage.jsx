import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Bell, Plus, ChevronLeft, Phone, Calendar, FileText, Circle, Check, Trash, X } from 'lucide-react';

const TYPE_ICONS = {
  call:     <Phone size={16} />,
  meeting:  <Calendar size={16} />,
  document: <FileText size={16} />,
  other:    <Circle size={16} />,
};

const TYPE_LABELS = {
  call:     'Звонок',
  meeting:  'Встреча',
  document: 'Документы',
  other:    'Другое',
};

const TYPE_COLORS = {
  call:     '#3b82f6',
  meeting:  '#f59e0b',
  document: '#8b5cf6',
  other:    '#94a3b8',
};

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

export default function RemindersPage() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);

  const emptyForm = {
    title: '',
    type: 'call',
    due_date: new Date().toISOString().slice(0, 10),
    property_id: '',
    client_id: '',
    notes: '',
  };
  const [form, setForm] = useState(emptyForm);

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const myTasks = useMemo(() => {
    const userId = state.currentUser?.id;
    const isAdmin = state.currentUser?.role === 'admin';
    return state.tasks.filter(t => isAdmin || t.realtor_id === userId);
  }, [state.tasks, state.currentUser]);

  const groups = useMemo(() => [
    {
      label: '🔴 Просрочено',
      color: '#ef4444',
      items: myTasks.filter(t => t.due_date < today && t.status !== 'done'),
    },
    {
      label: '📅 Сегодня',
      color: '#f59e0b',
      items: myTasks.filter(t => t.due_date === today && t.status !== 'done'),
    },
    {
      label: '⏰ Завтра',
      color: '#3b82f6',
      items: myTasks.filter(t => t.due_date === tomorrow && t.status !== 'done'),
    },
    {
      label: 'Позже',
      color: 'var(--text-secondary)',
      items: myTasks.filter(t => t.due_date > tomorrow && t.status !== 'done'),
    },
    {
      label: '✓ Выполнено',
      color: '#10b981',
      items: myTasks.filter(t => t.status === 'done').slice(0, 5),
    },
  ], [myTasks, today, tomorrow]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    dispatch({
      type: 'ADD_TASK',
      task: {
        ...form,
        id: crypto.randomUUID(),
        realtor_id: state.currentUser?.id,
        status: 'pending',
        created_at: new Date().toISOString(),
      },
    });
    setForm(emptyForm);
    setShowForm(false);
  };

  const markDone = (task) => {
    dispatch({ type: 'UPDATE_TASK', task: { ...task, status: 'done' } });
  };

  const deleteTask = (id) => {
    if (window.confirm('Удалить задачу?')) {
      dispatch({ type: 'DELETE_TASK', id });
    }
  };

  const propertyOptions = state.properties;
  const clientOptions = state.clients;

  return (
    <div className="page fade-in" style={{ background: 'var(--surface)' }}>
      {/* TOPBAR */}
      <div className="topbar sticky" style={{
        background: 'var(--topbar-bg)',
        backdropFilter: 'blur(24px) saturate(180%)',
        padding: '20px',
        borderBottom: '1px solid var(--border-light)',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        height: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="card-clickable"
              onClick={() => navigate(-1)}
              style={{
                width: 40, height: 40, borderRadius: 12, border: 'none',
                background: 'var(--bg-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text)',
              }}
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <span className="topbar-title font-oswald" style={{ fontSize: 22, fontWeight: 600 }}>Задачи</span>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Напоминания
              </div>
            </div>
          </div>
          <button
            className="card-clickable"
            onClick={() => setShowForm(v => !v)}
            style={{
              width: 44, height: 44, borderRadius: 14, border: 'none',
              background: showForm ? 'var(--bg-light)' : 'var(--primary)',
              color: showForm ? 'var(--text)' : 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: showForm ? 'none' : '0 8px 16px rgba(0, 82, 255, 0.2)',
            }}
          >
            {showForm ? <X size={20} /> : <Plus size={24} strokeWidth={3} />}
          </button>
        </div>
      </div>

      <div className="page-content" style={{ padding: '20px 20px 140px', gap: 16 }}>
        {/* CREATE FORM */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="card fade-in"
            style={{
              padding: 24, borderRadius: 28, border: 'none',
              boxShadow: '0 12px 48px rgba(0,82,255,0.08)',
              background: 'var(--surface)',
              display: 'flex', flexDirection: 'column', gap: 14,
            }}
          >
            <div className="font-oswald" style={{ fontSize: 16, fontWeight: 600, color: 'var(--primary)' }}>
              Новая задача
            </div>

            <input
              className="form-input"
              placeholder="Название задачи..."
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              required
              style={{ height: 48, borderRadius: 14, background: 'var(--bg-light)', border: 'none', fontWeight: 500 }}
            />

            {/* Type selector */}
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.entries(TYPE_LABELS).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, type: val }))}
                  className="card-clickable"
                  style={{
                    flex: 1, height: 40, borderRadius: 12, border: 'none',
                    background: form.type === val ? TYPE_COLORS[val] : 'var(--bg-light)',
                    color: form.type === val ? 'white' : 'var(--text-secondary)',
                    fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', gap: 4,
                  }}
                >
                  {React.cloneElement(TYPE_ICONS[val], { size: 14 })}
                  <span style={{ display: window.innerWidth < 380 ? 'none' : 'inline' }}>{label}</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', fontFamily: 'Oswald' }}>
                  Дата
                </div>
                <input
                  type="date"
                  className="form-input"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none' }}
                />
              </div>
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', fontFamily: 'Oswald' }}>
                  Объект
                </div>
                <select
                  className="form-input"
                  value={form.property_id}
                  onChange={e => setForm(f => ({ ...f, property_id: e.target.value }))}
                  style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 12 }}
                >
                  <option value="">— объект —</option>
                  {propertyOptions.map(p => (
                    <option key={p.id} value={p.id}>{p.address || p.city}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', fontFamily: 'Oswald' }}>
                Клиент
              </div>
              <select
                className="form-input"
                value={form.client_id}
                onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 12 }}
              >
                <option value="">— клиент —</option>
                {clientOptions.map(c => (
                  <option key={c.id} value={c.id}>{c.full_name}</option>
                ))}
              </select>
            </div>

            <textarea
              className="form-input"
              placeholder="Заметки (опционально)..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              style={{
                borderRadius: 12, background: 'var(--bg-light)', border: 'none',
                resize: 'none', fontSize: 13, padding: '12px 16px',
              }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="submit"
                className="card-clickable"
                style={{
                  flex: 1, height: 50, borderRadius: 16, border: 'none',
                  background: 'var(--primary)', color: 'white',
                  fontWeight: 600, fontSize: 14,
                }}
              >
                Создать задачу
              </button>
              <button
                type="button"
                className="card-clickable"
                onClick={() => { setShowForm(false); setForm(emptyForm); }}
                style={{
                  height: 50, width: 50, borderRadius: 16, border: 'none',
                  background: 'var(--bg-light)', color: 'var(--text-secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>
          </form>
        )}

        {/* GROUPED TASK LIST */}
        {groups.map(group => {
          if (group.items.length === 0) return null;
          return (
            <div key={group.label}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: group.color,
                textTransform: 'uppercase', letterSpacing: '0.04em',
                marginBottom: 10, paddingLeft: 4,
                fontFamily: 'Oswald',
              }}>
                {group.label} · {group.items.length}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {group.items.map(task => {
                  const relatedProp = task.property_id
                    ? state.properties.find(p => p.id === task.property_id)
                    : null;
                  const relatedClient = task.client_id
                    ? state.clients.find(c => c.id === task.client_id)
                    : null;
                  const color = TYPE_COLORS[task.type] || TYPE_COLORS.other;
                  const isDone = task.status === 'done';

                  return (
                    <div
                      key={task.id}
                      className="card"
                      style={{
                        padding: '14px 16px',
                        borderRadius: 20,
                        border: 'none',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
                        background: isDone ? 'var(--bg-light)' : 'var(--surface)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        opacity: isDone ? 0.6 : 1,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      {/* Type icon */}
                      <div style={{
                        width: 36, height: 36, borderRadius: 12, flexShrink: 0,
                        background: `${color}18`,
                        color: color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {TYPE_ICONS[task.type] || TYPE_ICONS.other}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 14, fontWeight: 600,
                          color: isDone ? 'var(--text-secondary)' : 'var(--text)',
                          textDecoration: isDone ? 'line-through' : 'none',
                          marginBottom: 2,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {task.title}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                          <span style={{ fontSize: 11, color: group.color, fontWeight: 600 }}>
                            {formatDateDisplay(task.due_date)}
                          </span>
                          {TYPE_LABELS[task.type] && (
                            <span style={{
                              fontSize: 10, padding: '2px 8px', borderRadius: 6,
                              background: `${color}15`, color: color, fontWeight: 600,
                            }}>
                              {TYPE_LABELS[task.type]}
                            </span>
                          )}
                          {relatedProp && (
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                              🏠 {relatedProp.address || relatedProp.city}
                            </span>
                          )}
                          {relatedClient && (
                            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                              👤 {relatedClient.full_name}
                            </span>
                          )}
                        </div>
                        {task.notes && (
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, opacity: 0.7 }}>
                            {task.notes}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {!isDone && (
                          <button
                            className="card-clickable"
                            onClick={() => markDone(task)}
                            style={{
                              width: 34, height: 34, borderRadius: 10, border: 'none',
                              background: '#10b98118',
                              color: '#10b981',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                            title="Выполнено"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        <button
                          className="card-clickable"
                          onClick={() => deleteTask(task.id)}
                          style={{
                            width: 34, height: 34, borderRadius: 10, border: 'none',
                            background: 'var(--danger-light, #fef2f2)',
                            color: 'var(--danger, #ef4444)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                          title="Удалить"
                        >
                          <Trash size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {myTasks.length === 0 && (
          <div className="empty-state" style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: 30,
              background: 'rgba(0,0,0,0.03)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <Bell size={40} style={{ opacity: 0.2 }} />
            </div>
            <div className="font-oswald" style={{ fontSize: 20, fontWeight: 600, color: 'var(--text)' }}>
              Нет задач
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 24 }}>
              Создайте первое напоминание
            </div>
            <button
              className="card-clickable"
              onClick={() => setShowForm(true)}
              style={{
                padding: '12px 24px', borderRadius: 16, border: 'none',
                background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: 13,
              }}
            >
              Создать задачу
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
