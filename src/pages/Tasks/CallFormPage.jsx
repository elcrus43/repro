import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { Calendar, User, Phone, UserPlus, X } from 'lucide-react';
import { nanoid } from '../../utils/nanoid';

/**
 * Форма "Позвонить"
 * Создаёт задачу с task_type='Позвонить' и привязкой к клиенту
 */
export function CallFormPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const { toast } = useToastContext();
    const [searchParams] = useSearchParams();

    const prefillClientId = searchParams.get('client') || '';
    const editId = searchParams.get('id') || '';

    const existing = editId ? state.tasks.find(t => t.id === editId) : null;

    const [form, setForm] = useState(existing ? {
        ...existing,
        due_date: existing.due_date ? new Date(existing.due_date).toISOString().slice(0, 16) : '',
    } : {
        client_id: prefillClientId || '',
        due_date: new Date(Date.now() + 1800000).toISOString().slice(0, 16),
        status: 'pending',
        priority: 'medium',
        description: '',
        task_type: 'Позвонить',
        realtor_id: state.currentUser?.id
    });

    const [showNewClient, setShowNewClient] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');

    const myClients = state.clients.filter(c => c.realtor_id === state.currentUser?.id);

    const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));

    function handleCreateClient() {
        if (!newClientName.trim()) { toast.error('Введите имя клиента'); return; }
        const client = {
            id: nanoid(),
            realtor_id: state.currentUser?.id,
            full_name: newClientName.trim(),
            phone: newClientPhone.trim(),
            client_types: [],
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

        const client = state.clients.find(c => c.id === form.client_id);
        const task = {
            id: editId || nanoid(),
            realtor_id: state.currentUser?.id,
            client_id: form.client_id,
            property_id: null,
            title: `Позвонить — ${client?.full_name || ''}`,
            description: form.description || '',
            due_date: new Date(form.due_date).toISOString(),
            status: form.status,
            priority: form.priority,
            task_type: 'Позвонить',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        if (editId) {
            dispatch({ type: 'UPDATE_TASK', task });
            toast.success('Задача обновлена');
        } else {
            dispatch({ type: 'ADD_TASK', task });
            toast.success('Задача создана');
        }
        navigate('/tasks');
    }

    return (
        <div className="page fade-in">
            <div className="topbar">
                <button className="topbar-back" onClick={() => navigate(-1)}>←</button>
                <span className="topbar-title">{editId ? 'Редактировать' : 'Позвонить'}</span>
            </div>
            <div className="page-content">
                <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* Клиент */}
                    <div className="form-group">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <label className="form-label" style={{ margin: 0 }}><Phone size={14} style={{ marginRight: 4 }} /> Клиент <span className="required">*</span></label>
                            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowNewClient(v => !v)}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                                {showNewClient ? <><X size={12} /> Отмена</> : <><UserPlus size={12} /> Новый клиент</>}
                            </button>
                        </div>

                        {showNewClient ? (
                            <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <input className="form-input" placeholder="ФИО клиента *" value={newClientName} onChange={e => setNewClientName(e.target.value)} />
                                <input className="form-input" placeholder="Телефон" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} />
                                <button type="button" className="btn btn-primary btn-sm" onClick={handleCreateClient}>Создать и выбрать</button>
                            </div>
                        ) : (
                            <select className="form-select" value={form.client_id} onChange={e => setF('client_id', e.target.value)} required>
                                <option value="">— Выбрать клиента —</option>
                                {myClients.map(c => <option key={c.id} value={c.id}>{c.full_name}{c.phone ? ` · ${c.phone}` : ''}</option>)}
                            </select>
                        )}
                    </div>

                    {/* Дата и время */}
                    <div className="form-group">
                        <label className="form-label"><Calendar size={14} style={{ marginRight: 4 }} /> Дата и время <span className="required">*</span></label>
                        <input className="form-input" type="datetime-local" value={form.due_date} onChange={e => setF('due_date', e.target.value)} required />
                    </div>

                    {/* Статус */}
                    <div className="form-group">
                        <label className="form-label">Статус</label>
                        <select className="form-select" value={form.status} onChange={e => setF('status', e.target.value)}>
                            <option value="pending">Запланирован</option>
                            <option value="done">Позвонили</option>
                            <option value="cancelled">Отменён</option>
                        </select>
                    </div>

                    {/* Приоритет */}
                    <div className="form-group">
                        <label className="form-label">Приоритет</label>
                        <select className="form-select" value={form.priority} onChange={e => setF('priority', e.target.value)}>
                            <option value="high">Высокий</option>
                            <option value="medium">Средний</option>
                            <option value="low">Низкий</option>
                        </select>
                    </div>

                    {/* Комментарий */}
                    <div className="form-group">
                        <label className="form-label">Комментарий</label>
                        <textarea className="form-textarea" rows={3} value={form.description || ''} onChange={e => setF('description', e.target.value)} placeholder="Тема звонка, что обсудить..." />
                    </div>

                    <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 8 }}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        {editId ? 'Сохранить изменения' : 'Запланировать звонок'}
                    </button>
                </form>
            </div>
        </div>
    );
}
