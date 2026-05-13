import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { Calendar, User, Home, UserPlus, X, ChevronLeft, Save, Clock, AlertCircle } from 'lucide-react';
import { nanoid } from '../../utils/nanoid';

/**
 * Форма "Встреча с собственником"
 * Создаёт задачу с task_type='Встреча с собственником' и привязкой к клиенту/объекту
 */
export function MeetingOwnerFormPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const { toast } = useToastContext();
    const [searchParams] = useSearchParams();

    const prefillClientId = searchParams.get('client') || '';
    const prefillPropertyId = searchParams.get('property') || '';
    const editId = searchParams.get('id') || '';

    const existing = editId ? state.tasks.find(t => t.id === editId) : null;

    const [form, setForm] = useState(existing ? {
        ...existing,
        due_date: existing.due_date ? new Date(existing.due_date).toISOString().slice(0, 16) : '',
    } : {
        client_id: prefillClientId || '',
        property_id: prefillPropertyId || '',
        due_date: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
        status: 'pending',
        priority: 'high',
        description: '',
        task_type: 'Встреча с собственником',
        realtor_id: state.currentUser?.id
    });

    const [showNewClient, setShowNewClient] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');

    const myClients = state.clients.filter(c => c.realtor_id === state.currentUser?.id);
    const myProperties = state.properties.filter(p => p.realtor_id === state.currentUser?.id);

    const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));

    function handleCreateClient() {
        if (!newClientName.trim()) { toast.error('Введите имя клиента'); return; }
        const client = {
            id: nanoid(),
            realtor_id: state.currentUser?.id,
            full_name: newClientName.trim(),
            phone: newClientPhone.trim(),
            client_types: ['owner'],
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        dispatch({ type: 'ADD_CLIENT', client });
        setF('client_id', client.id);
        setShowNewClient(false);
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (!form.client_id || !form.due_date) {
            toast.error('Выберите клиента и дату/время');
            return;
        }

        const task = {
            id: editId || nanoid(),
            realtor_id: state.currentUser?.id,
            client_id: form.client_id,
            property_id: form.property_id || null,
            title: `Встреча с собственником — ${state.clients.find(c => c.id === form.client_id)?.full_name || ''}`,
            description: form.description || '',
            due_date: new Date(form.due_date).toISOString(),
            status: form.status,
            priority: form.priority,
            task_type: 'Встреча с собственником',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        if (editId) {
            dispatch({ type: 'UPDATE_TASK', task });
            toast.success('Встреча обновлена');
        } else {
            dispatch({ type: 'ADD_TASK', task });
            toast.success('Встреча создана');
        }
        navigate('/tasks');
    }

    return (
        <div className="page fade-in" style={{ background: 'var(--surface)' }}>
            <div className="topbar sticky" style={{ 
                background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(24px) saturate(180%)',
                padding: '20px', borderBottom: '1px solid rgba(0,0,0,0.05)', zIndex: 1000,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <button onClick={() => navigate(-1)} className="card-clickable" style={{ width: 44, height: 44, borderRadius: 14, border: 'none', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', color: 'var(--text)' }}>
                    <ChevronLeft size={20} />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <span className="font-oswald" style={{ fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text)' }}>
                        {editId ? 'Редактировать' : 'Встреча'}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>С собственником</span>
                </div>
                <div style={{ width: 44 }} />
            </div>

            <div className="page-content" style={{ padding: '20px 20px 120px' }}>
                <form onSubmit={handleSubmit} className="card" style={{ padding: 24, borderRadius: 32, border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.03)', background: 'white', display: 'flex', flexDirection: 'column', gap: 20 }}>
                    
                    {/* Клиент */}
                    <div className="form-group">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <label className="font-oswald" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <User size={14} color="var(--primary)" /> Клиент <span style={{ color: '#dc2626' }}>*</span>
                            </label>
                            <button type="button" className="card-clickable" onClick={() => setShowNewClient(v => !v)} style={{ border: 'none', background: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 10px', borderRadius: 10, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                                {showNewClient ? <><X size={12} /> Отмена</> : <><UserPlus size={12} /> Новый</>}
                            </button>
                        </div>

                        {showNewClient ? (
                            <div className="fade-in" style={{ background: '#f8fafc', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12, border: '1.5px dashed rgba(0,82,255,0.2)' }}>
                                <input className="form-input" style={{ background: 'white' }} placeholder="ФИО клиента *" value={newClientName} onChange={e => setNewClientName(e.target.value)} />
                                <input className="form-input" style={{ background: 'white' }} placeholder="Телефон" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} />
                                <button type="button" className="card-clickable" style={{ height: 40, borderRadius: 12, border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 800, fontSize: 12, textTransform: 'uppercase' }} onClick={handleCreateClient}>Создать</button>
                            </div>
                        ) : (
                            <select className="form-select" style={{ height: 52, borderRadius: 14, background: '#f8fafc', border: '1.5px solid rgba(0,0,0,0.05)' }} value={form.client_id} onChange={e => setF('client_id', e.target.value)} required>
                                <option value="">— Выбрать клиента —</option>
                                {myClients.map(c => <option key={c.id} value={c.id}>{c.full_name}{c.phone ? ` · ${c.phone}` : ''}</option>)}
                            </select>
                        )}
                    </div>

                    {/* Объект (опционально) */}
                    <div className="form-group">
                        <label className="font-oswald" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Home size={14} color="var(--primary)" /> Объект
                        </label>
                        <select className="form-select" style={{ height: 52, borderRadius: 14, background: '#f8fafc', border: '1.5px solid rgba(0,0,0,0.05)' }} value={form.property_id || ''} onChange={e => setF('property_id', e.target.value)}>
                            <option value="">— Без объекта —</option>
                            {myProperties.map(p => (
                                <option key={p.id} value={p.id}>{p.address} ({(p.price || 0).toLocaleString()} ₽)</option>
                            ))}
                        </select>
                    </div>

                    {/* Дата и время */}
                    <div className="form-group">
                        <label className="font-oswald" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Calendar size={14} color="var(--primary)" /> Дата и время <span style={{ color: '#dc2626' }}>*</span>
                        </label>
                        <input className="form-input" style={{ height: 52, borderRadius: 14, background: '#f8fafc', border: '1.5px solid rgba(0,0,0,0.05)' }} type="datetime-local" value={form.due_date} onChange={e => setF('due_date', e.target.value)} required />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {/* Статус */}
                        <div className="form-group">
                            <label className="font-oswald" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Статус</label>
                            <select className="form-select" style={{ height: 52, borderRadius: 14, background: '#f8fafc', border: '1.5px solid rgba(0,0,0,0.05)' }} value={form.status} onChange={e => setF('status', e.target.value)}>
                                <option value="pending">План</option>
                                <option value="done">Готово</option>
                                <option value="cancelled">Отказ</option>
                            </select>
                        </div>

                        {/* Приоритет */}
                        <div className="form-group">
                            <label className="font-oswald" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Приоритет</label>
                            <select className="form-select" style={{ height: 52, borderRadius: 14, background: '#f8fafc', border: '1.5px solid rgba(0,0,0,0.05)' }} value={form.priority} onChange={e => setF('priority', e.target.value)}>
                                <option value="high">Высокий</option>
                                <option value="medium">Средний</option>
                                <option value="low">Низкий</option>
                            </select>
                        </div>
                    </div>

                    {/* Комментарий */}
                    <div className="form-group">
                        <label className="font-oswald" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Комментарий</label>
                        <textarea className="form-textarea" style={{ borderRadius: 16, background: '#f8fafc', border: '1.5px solid rgba(0,0,0,0.05)', padding: 16 }} rows={3} value={form.description || ''} onChange={e => setF('description', e.target.value)} placeholder="Тема встречи, что обсудить..." />
                    </div>

                    <button type="submit" className="card-clickable" style={{ marginTop: 12, height: 56, borderRadius: 16, border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 800, fontSize: 14, fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em', boxShadow: '0 8px 24px rgba(0, 82, 255, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                        <Save size={20} />
                        {editId ? 'Сохранить изменения' : 'Создать встречу'}
                    </button>
                </form>
            </div>
        </div>
    );
}

