import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { Calendar, User, Home, Save, UserPlus, X, ChevronLeft, Clock, Info, Check, MessageSquare } from 'lucide-react';
import { nanoid } from '../../utils/nanoid';
import { MultiClientSelector } from '../../components/MultiClientSelector';

function FormCard({ title, children, description }) {
    return (
        <div className="card fade-in" style={{ 
            padding: '20px', marginBottom: 16, border: 'none', 
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)', borderRadius: 20,
            background: 'white'
        }}>
            <div style={{ marginBottom: 16 }}>
                <div className="font-oswald" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{title}</div>
                {description && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{description}</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {children}
            </div>
        </div>
    );
}

export function FormPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const { toast } = useToastContext();
    const params = new URLSearchParams(window.location.search);
    const prePropId = params.get('propertyId') || params.get('property_id');
    const preClientId = params.get('clientId') || params.get('client_id');
    const editId = params.get('id');

    const existingShowing = editId ? state.showings.find(s => s.id === editId) : null;

    const [form, setForm] = useState(existingShowing ? {
        ...existingShowing,
        client_ids: existingShowing.client_ids || (existingShowing.client_id ? [existingShowing.client_id] : []),
        showing_date: existingShowing.showing_date ? new Date(existingShowing.showing_date).toISOString().slice(0, 16) : '',
    } : {
        property_id: prePropId || '',
        client_id: preClientId || '',
        client_ids: preClientId ? [preClientId] : [],
        showing_date: '',
        status: 'planned',
        client_feedback: '',
        feedback_comment: '',
        event_type: 'showing',
        realtor_id: state.currentUser?.id
    });

    const [showNewClient, setShowNewClient] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');

    const myClients = state.clients.filter(c => c.realtor_id === state.currentUser?.id);
    const allProperties = state.properties;

    function handleCreateClient() {
        if (!newClientName.trim()) { toast.error('Введите имя клиента'); return; }
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
        setForm(f => ({ 
            ...f, 
            client_id: client.id,
            client_ids: [...(f.client_ids || []), client.id]
        }));
        setShowNewClient(false);
        setNewClientName('');
        setNewClientPhone('');
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (!form.property_id || !form.client_ids?.length || !form.showing_date) {
            toast.error('Пожалуйста, выберите объект, клиента и дату/время');
            return;
        }

        const showing = {
            ...form,
            client_id: form.client_ids[0],
            showing_date: new Date(form.showing_date).toISOString()
        };

        if (editId) {
            dispatch({ type: 'UPDATE_SHOWING', showing: { ...showing, id: editId } });
        } else {
            dispatch({ type: 'ADD_SHOWING', showing });
        }
        navigate('/history');
    }

    return (
        <div className="page fade-in" style={{ background: 'var(--surface)' }}>
            <div className="topbar sticky" style={{ 
                background: 'rgba(255,255,255,0.7)', 
                backdropFilter: 'blur(24px) saturate(180%)',
                padding: '20px',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 1000
            }}>
                <button 
                    onClick={() => navigate(-1)}
                    className="card-clickable"
                    style={{ 
                        width: 44, height: 44, borderRadius: 14, border: 'none', background: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)', color: 'var(--text)'
                    }}
                >
                    <ChevronLeft size={20} />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <span className="font-oswald" style={{ fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text)' }}>
                        {editId ? 'Редактор' : 'Новое событие'}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>Календарь встреч</span>
                </div>
                <div style={{ width: 44 }} />
            </div>

            <div className="page-content" style={{ padding: '20px 20px 120px' }}>
                {state.calendarStatus && (
                    <div style={{
                        marginBottom: 20, padding: '12px 16px', borderRadius: 16, fontSize: 12, fontWeight: 700,
                        display: 'flex', alignItems: 'center', gap: 10,
                        background: state.calendarStatus === 'ok' ? '#ecfdf5' : state.calendarStatus === 'error' ? '#fef2f2' : '#eff6ff',
                        color: state.calendarStatus === 'ok' ? '#059669' : state.calendarStatus === 'error' ? '#dc2626' : '#2563eb'
                    }}>
                        {state.calendarStatus === 'loading' ? <Clock size={14} className="spin" /> : <Info size={14} />}
                        {state.calendarStatus === 'loading' && 'Синхронизация...'}
                        {state.calendarStatus === 'ok' && 'Календарь синхронизирован'}
                        {state.calendarStatus === 'error' && 'Локальное сохранение'}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <FormCard title="Детали события" icon={<Home size={20} />} description="Выберите объект и тип встречи">
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Объект недвижимости *</label>
                            <select className="form-select" value={form.property_id} onChange={e => setForm({ ...form, property_id: e.target.value })} required disabled={editId && form.realtor_id !== state.currentUser?.id} style={{ borderRadius: 14, height: 50, border: '1.5px solid rgba(0,0,0,0.05)', background: '#f8fafc' }}>
                                <option value="">— Выбрать объект —</option>
                                {allProperties.map(p => (
                                    <option key={p.id} value={p.id}>{p.address} ({(p.price || 0).toLocaleString()} ₽)</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Тип события</label>
                            <select className="form-select" value={form.event_type || 'showing'} onChange={e => setForm({ ...form, event_type: e.target.value })} style={{ borderRadius: 14, height: 50, border: '1.5px solid rgba(0,0,0,0.05)', background: '#f8fafc' }}>
                                <option value="showing">Показ</option>
                                <option value="meeting">Встреча с собственником</option>
                                <option value="viewing">Просмотр</option>
                                <option value="deposit">Задаток</option>
                                <option value="deal">Сделка</option>
                            </select>
                        </div>
                    </FormCard>

                    <FormCard title="Участники" icon={<User size={20} />} description="Укажите клиентов для встречи">
                        <div className="form-group">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <label className="form-label" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0 }}>Клиенты *</label>
                                <button type="button" className="card-clickable" onClick={() => setShowNewClient(v => !v)}
                                    style={{ 
                                        display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800,
                                        color: showNewClient ? '#dc2626' : 'var(--primary)', border: 'none', background: 'transparent', padding: 0
                                    }}>
                                    {showNewClient ? <><X size={14} /> ОТМЕНА</> : <><UserPlus size={14} /> НОВЫЙ</>}
                                </button>
                            </div>

                            {showNewClient ? (
                                <div className="fade-in" style={{ background: '#f8fafc', borderRadius: 20, padding: 16, border: '1.5px solid var(--primary-light)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <input className="form-input" style={{ borderRadius: 12, height: 44, background: 'white' }} placeholder="ФИО клиента *" value={newClientName} onChange={e => setNewClientName(e.target.value)} />
                                    <input className="form-input" style={{ borderRadius: 12, height: 44, background: 'white' }} placeholder="Телефон" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} />
                                    <button type="button" className="card-clickable" style={{ height: 44, borderRadius: 12, border: 'none', background: 'var(--primary)', color: 'white', fontWeight: 800, fontSize: 12 }} onClick={handleCreateClient}>
                                        СОЗДАТЬ И ДОБАВИТЬ
                                    </button>
                                </div>
                            ) : (
                                <MultiClientSelector 
                                    selectedIds={form.client_ids || []}
                                    onChange={ids => setForm({ ...form, client_ids: ids })}
                                    clients={state.clients}
                                    placeholder="Выберите клиентов..."
                                />
                            )}
                        </div>
                    </FormCard>

                    <FormCard title="Время и статус" icon={<Clock size={20} />} description="Когда состоится встреча">
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Дата и время *</label>
                            <input className="form-input" type="datetime-local" value={form.showing_date} onChange={e => setForm({ ...form, showing_date: e.target.value })} required disabled={editId && form.realtor_id !== state.currentUser?.id} style={{ borderRadius: 14, height: 50, border: '1.5px solid rgba(0,0,0,0.05)', background: '#f8fafc' }} />
                        </div>

                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Текущий статус</label>
                            <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={{ borderRadius: 14, height: 50, border: '1.5px solid rgba(0,0,0,0.05)', background: '#f8fafc' }}>
                                <option value="planned">Запланирован</option>
                                <option value="completed">Проведен</option>
                                <option value="failed">Не состоялся</option>
                            </select>
                        </div>
                    </FormCard>

                    <FormCard title="Итоги" icon={<MessageSquare size={20} />} description="Зафиксируйте результат встречи">
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Отзыв клиента</label>
                            <select className="form-select" value={form.client_feedback || ''} onChange={e => setForm({ ...form, client_feedback: e.target.value })} style={{ borderRadius: 14, height: 50, border: '1.5px solid rgba(0,0,0,0.05)', background: '#f8fafc' }}>
                                <option value="">— Выбрать —</option>
                                <option value="interested">Заинтересован</option>
                                <option value="other_options">Ищет другие варианты</option>
                                <option value="price_high">Дорого</option>
                                <option value="layout_bad">Не нравится планировка</option>
                                <option value="location_bad">Не нравится расположение</option>
                                <option value="condition_bad">Плохое состояние</option>
                                <option value="ready">Готов к сделке</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 8, display: 'block' }}>Комментарий</label>
                            <textarea className="form-textarea" rows={4} value={form.feedback_comment || ''} onChange={e => setForm({ ...form, feedback_comment: e.target.value })} placeholder="Заметки по встрече, договоренности..." style={{ borderRadius: 16, border: '1.5px solid rgba(0,0,0,0.05)', background: '#f8fafc', padding: 16 }} />
                        </div>
                    </FormCard>

                    {(!editId || form.realtor_id === state.currentUser?.id) && (
                        <div style={{ marginTop: 20 }}>
                            <button 
                                type="submit" 
                                className="card-clickable" 
                                style={{ 
                                    width: '100%', height: 56, borderRadius: 16, border: 'none', 
                                    background: 'var(--primary)', color: 'white', fontWeight: 800, fontSize: 14,
                                    fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                                    boxShadow: '0 12px 24px rgba(0, 82, 255, 0.2)'
                                }}
                            >
                                <Save size={20} />
                                {editId ? 'СОХРАНИТЬ ИЗМЕНЕНИЯ' : 'СОХРАНИТЬ СОБЫТИЕ'}
                            </button>
                        </div>
                    )}
                    
                    {editId && form.realtor_id !== state.currentUser?.id && (
                        <div style={{ 
                            textAlign: 'center', padding: 20, borderRadius: 20, background: 'rgba(0,0,0,0.03)',
                            color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, border: '1px dashed rgba(0,0,0,0.1)'
                        }}>
                            Редактирование ограничено: только создатель может вносить изменения.
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
