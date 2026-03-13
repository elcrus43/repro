import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Calendar, User, Home, Save, UserPlus, X } from 'lucide-react';
import { nanoid } from '../../utils/nanoid';

export function ShowFormPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const params = new URLSearchParams(window.location.search);
    const prePropId = params.get('propertyId') || params.get('property_id');
    const preClientId = params.get('clientId') || params.get('client_id');
    const editId = params.get('id'); // edit mode

    const existingShowing = editId ? state.showings.find(s => s.id === editId) : null;

    const [form, setForm] = useState(existingShowing ? {
        ...existingShowing,
        showing_date: existingShowing.showing_date
            ? new Date(existingShowing.showing_date).toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16),
    } : {
        property_id: prePropId || '',
        client_id: preClientId || '',
        showing_date: new Date().toISOString().slice(0, 16),
        status: 'planned',
        client_feedback: '',
        feedback_comment: '',
        realtor_id: state.currentUser?.id
    });

    // Inline new client creation
    const [showNewClient, setShowNewClient] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');

    const myClients = state.clients.filter(c => c.realtor_id === state.currentUser?.id);
    const allProperties = state.properties;

    function handleCreateClient() {
        if (!newClientName.trim()) { alert('Введите имя клиента'); return; }
        const client = {
            id: nanoid(),
            realtor_id: state.currentUser?.id,
            full_name: newClientName.trim(),
            phone: newClientPhone.trim(),
            client_types: ['buyer'],
            status: 'active',
            additional_contacts: [],
            notes: '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        dispatch({ type: 'ADD_CLIENT', client });
        setForm(f => ({ ...f, client_id: client.id }));
        setShowNewClient(false);
        setNewClientName('');
        setNewClientPhone('');
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (!form.property_id || !form.client_id || !form.showing_date) {
            alert('Пожалуйста, выберите продажу, клиента и дату/время');
            return;
        }

        const showing = {
            ...form,
            showing_date: new Date(form.showing_date).toISOString()
        };

        if (editId) {
            dispatch({ type: 'UPDATE_SHOWING', showing: { ...showing, id: editId } });
        } else {
            dispatch({ type: 'ADD_SHOWING', showing });
        }
        navigate('/showings');
    }

    return (
        <div className="page fade-in">
            <div className="topbar">
                <button className="topbar-back" onClick={() => navigate(-1)}>←</button>
                <span className="topbar-title">{editId ? 'Редактировать показ' : 'Новый показ'}</span>
            </div>
            <div className="page-content">
                <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Property */}
                    <div className="form-group">
                        <label className="form-label"><Home size={14} style={{ marginRight: 4 }} /> Продажа <span className="required">*</span></label>
                        <select className="form-select" value={form.property_id} onChange={e => setForm({ ...form, property_id: e.target.value })} required disabled={editId && form.realtor_id !== state.currentUser?.id}>
                            <option value="">— Выбрать продажу —</option>
                            {allProperties.map(p => (
                                <option key={p.id} value={p.id}>{p.address} ({(p.price || 0).toLocaleString()} ₽)</option>
                            ))}
                        </select>
                    </div>

                    {/* Client */}
                    <div className="form-group">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <label className="form-label" style={{ margin: 0 }}><User size={14} style={{ marginRight: 4 }} /> Клиент <span className="required">*</span></label>
                            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setShowNewClient(v => !v)}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                                {showNewClient ? <><X size={12} /> Отмена</> : <><UserPlus size={12} /> Новый клиент</>}
                            </button>
                        </div>

                        {showNewClient ? (
                            <div style={{ background: 'var(--bg-secondary)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Быстрое добавление клиента</div>
                                <input className="form-input" placeholder="ФИО клиента *" value={newClientName} onChange={e => setNewClientName(e.target.value)} />
                                <input className="form-input" placeholder="Телефон" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} />
                                <button type="button" className="btn btn-primary btn-sm" onClick={handleCreateClient}>
                                    Создать и выбрать
                                </button>
                            </div>
                        ) : (
                            <select className="form-select" value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} required disabled={editId && form.realtor_id !== state.currentUser?.id}>
                                <option value="">— Выбрать клиента —</option>
                                {myClients.map(c => (
                                    <option key={c.id} value={c.id}>{c.full_name}{c.phone ? ` · ${c.phone}` : ''}</option>
                                ))}
                            </select>
                        )}
                    </div>

                    {/* Date/Time */}
                    <div className="form-group">
                        <label className="form-label"><Calendar size={14} style={{ marginRight: 4 }} /> Дата и время <span className="required">*</span></label>
                        <input className="form-input" type="datetime-local" value={form.showing_date} onChange={e => setForm({ ...form, showing_date: e.target.value })} required disabled={editId && form.realtor_id !== state.currentUser?.id} />
                    </div>

                    {/* Status (edit mode only) */}
                    {editId && (
                        <div className="form-group">
                            <label className="form-label">Статус</label>
                            <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} disabled={form.realtor_id !== state.currentUser?.id}>
                                <option value="planned">Запланирован</option>
                                <option value="completed">Проведен</option>
                                <option value="failed">Не состоялся</option>
                            </select>
                        </div>
                    )}

                    {/* Feedback comment (edit mode only) */}
                    {editId && (
                        <div className="form-group">
                            <label className="form-label">Комментарий после показа</label>
                            <textarea className="form-textarea" rows={3} value={form.feedback_comment || ''} onChange={e => setForm({ ...form, feedback_comment: e.target.value })} placeholder="Впечатления клиента..." disabled={form.realtor_id !== state.currentUser?.id} />
                        </div>
                    )}

                    {(!editId || form.realtor_id === state.currentUser?.id) && (
                        <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 8 }}>
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                            {editId ? 'Сохранить изменения' : 'Запланировать показ'}
                        </button>
                    )}
                    {editId && form.realtor_id !== state.currentUser?.id && (
                        <div style={{ textAlign: 'center', padding: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                            Только создатель показа может вносить изменения
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
