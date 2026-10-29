import React, { useState, useEffect, useMemo } from 'react';
import { 
    Clock, X, Calendar, User, Building2, Phone, Check, 
    AlertCircle, Sparkles, MessageSquare, PhoneCall, Users, 
    Home, DollarSign, Handshake, FileText, ChevronDown, Flag
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToastContext } from './Toast';
import { toLocalISOString, parseLocalDateTime, formatPhone, formatNumber } from '../utils/format';
import { nanoid } from '../utils/nanoid';

const TASK_TYPES = [
    { id: 'Позвонить', label: 'Позвонить', icon: PhoneCall, color: '#2563eb', bg: 'rgba(37,99,235,0.08)' },
    { id: 'Встреча', label: 'Встреча', icon: Users, color: '#7c3aed', bg: 'rgba(124,58,237,0.08)' },
    { id: 'Показ', label: 'Показ', icon: Home, color: '#059669', bg: 'rgba(5,150,105,0.08)' },
    { id: 'Задаток', label: 'Задаток', icon: DollarSign, color: '#d97706', bg: 'rgba(217,119,6,0.08)' },
    { id: 'Сделка', label: 'Сделка', icon: Handshake, color: '#0891b2', bg: 'rgba(8,145,178,0.08)' },
    { id: 'Документы', label: 'Документы', icon: FileText, color: '#ea580c', bg: 'rgba(234,88,12,0.08)' },
    { id: 'Другое', label: 'Другое', icon: Clock, color: '#64748b', bg: 'rgba(100,116,139,0.08)' },
];

const PRIORITIES = [
    { id: 'low', label: 'Низкий', color: '#64748b' },
    { id: 'medium', label: 'Обычный', color: '#2563eb' },
    { id: 'high', label: 'Срочный', color: '#dc2626' },
];

const getQuickDate = (type) => {
    const now = new Date();
    if (type === '2h') {
        return toLocalISOString(new Date(now.getTime() + 2 * 3600 * 1000));
    }
    if (type === 'tomorrow') {
        const d = new Date(now);
        d.setDate(d.getDate() + 1);
        d.setHours(10, 0, 0, 0);
        return toLocalISOString(d);
    }
    if (type === '3days') {
        const d = new Date(now);
        d.setDate(d.getDate() + 3);
        d.setHours(10, 0, 0, 0);
        return toLocalISOString(d);
    }
    if (type === 'week') {
        const d = new Date(now);
        d.setDate(d.getDate() + 7);
        d.setHours(10, 0, 0, 0);
        return toLocalISOString(d);
    }
    return toLocalISOString(now);
};

export function TaskModal({ isOpen, onClose, client: initialClient, property: initialProp, initialData, onSuccess }) {
    const { state, dispatch } = useApp();
    const { toast } = useToastContext();

    const [taskType, setTaskType] = useState('Позвонить');
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState('medium');
    const [description, setDescription] = useState('');
    const [clientId, setClientId] = useState('');
    const [propertyId, setPropertyId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showClientPicker, setShowClientPicker] = useState(false);
    const [showPropPicker, setShowPropPicker] = useState(false);

    // Active resolved client & property
    const activeClient = useMemo(() => {
        if (clientId) {
            const found = state.clients?.find(c => c.id === clientId);
            if (found) return found;
        }
        return initialClient || null;
    }, [clientId, state.clients, initialClient]);

    const activeProperty = useMemo(() => {
        if (propertyId) {
            const found = state.properties?.find(p => p.id === propertyId);
            if (found) return found;
        }
        return initialProp || null;
    }, [propertyId, state.properties, initialProp]);

    // Helper to generate default title based on type & client
    const buildDefaultTitle = (type, c, p) => {
        const cName = c?.full_name || '';
        const pAddr = p?.address || p?.city || '';
        switch (type) {
            case 'Позвонить':
                return cName ? `Позвонить: ${cName}` : 'Позвонить клиенту';
            case 'Встреча':
                return cName ? `Встреча: ${cName}` : 'Встреча с клиентом';
            case 'Показ':
                return pAddr ? `Показ: ${pAddr}` : (cName ? `Показ для ${cName}` : 'Показ объекта');
            case 'Задаток':
                return cName ? `Задаток: ${cName}` : 'Внесение задатка';
            case 'Сделка':
                return cName ? `Сделка: ${cName}` : 'Проведение сделки';
            case 'Документы':
                return cName ? `Документы: ${cName}` : 'Подготовка документов';
            default:
                return cName ? `Задача: ${cName}` : 'Новая задача';
        }
    };

    // Initialize fields when opening
    useEffect(() => {
        if (!isOpen) return;

        const effectiveClient = initialClient || (initialData?.client_id ? state.clients?.find(c => c.id === initialData.client_id) : null);
        const effectiveProp = initialProp || (initialData?.property_id ? state.properties?.find(p => p.id === initialData.property_id) : null);

        const effClientId = effectiveClient?.id || initialData?.client_id || '';
        const effPropId = effectiveProp?.id || initialData?.property_id || '';

        setClientId(effClientId);
        setPropertyId(effPropId);

        const type = initialData?.task_type || 'Позвонить';
        setTaskType(type);

        const initialTitle = initialData?.title || buildDefaultTitle(type, effectiveClient, effectiveProp);
        setTitle(initialTitle);

        const initialDue = initialData?.due_date 
            ? toLocalISOString(initialData.due_date) 
            : getQuickDate('tomorrow');
        setDueDate(initialDue);

        setPriority(initialData?.priority || 'medium');
        setDescription(initialData?.description || '');
        setShowClientPicker(false);
        setShowPropPicker(false);
    }, [isOpen, initialClient, initialProp, initialData, state.clients, state.properties]);

    // Handle Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleSelectTaskType = (newType) => {
        setTaskType(newType);
        // If current title is empty or has a standard prefix, update it
        const standardPrefixes = ['Позвонить:', 'Встреча:', 'Показ:', 'Задаток:', 'Сделка:', 'Документы:', 'Задача:'];
        const isAutoGenerated = !title.trim() || standardPrefixes.some(p => title.startsWith(p));
        if (isAutoGenerated) {
            setTitle(buildDefaultTitle(newType, activeClient, activeProperty));
        }
    };

    const handleSave = async (e) => {
        e?.preventDefault?.();
        if (!title.trim()) {
            toast.error('Введите название задачи');
            return;
        }

        setIsSubmitting(true);
        try {
            const dueDateIso = dueDate ? parseLocalDateTime(dueDate)?.toISOString() : new Date().toISOString();
            const taskId = initialData?.id || nanoid();
            const now = new Date().toISOString();

            const taskPayload = {
                id: taskId,
                realtor_id: state.currentUser?.id,
                client_id: clientId || null,
                property_id: propertyId || null,
                title: title.trim(),
                description: description.trim(),
                task_type: taskType || 'Позвонить',
                due_date: dueDateIso,
                priority: priority || 'medium',
                status: initialData?.status || 'pending',
                created_at: initialData?.created_at || now,
                updated_at: now
            };

            if (initialData?.id) {
                await dispatch({ type: 'UPDATE_TASK', task: taskPayload });
                toast.success(`✓ Задача «${taskPayload.title}» обновлена`);
            } else {
                await dispatch({ type: 'ADD_TASK', task: taskPayload });
                toast.success(`✓ Задача «${taskPayload.title}» поставлена`);
            }

            onClose();
            if (onSuccess) onSuccess(taskPayload);
        } catch (err) {
            console.error('[TaskModal Save Error]', err);
            toast.error('Ошибка сохранения задачи: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div 
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 1100,
                background: 'rgba(15, 23, 42, 0.5)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px'
            }}
            onClick={onClose}
        >
            <div 
                className="fade-in"
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: 520,
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    background: 'var(--surface)',
                    borderRadius: 24,
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border-light)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 18,
                    padding: '24px 22px'
                }}
            >
                {/* ── HEADER ── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: 'var(--primary-light)', color: 'var(--primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Clock size={20} />
                        </div>
                        <div>
                            <h3 className="font-oswald" style={{ margin: 0, fontSize: 19, fontWeight: 500, color: 'var(--text)' }}>
                                {initialData?.id ? 'Редактирование задачи' : 'Постановка задачи'}
                            </h3>
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                Запланируйте звонок, показ или напоминание
                            </div>
                        </div>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose}
                        style={{
                            width: 32, height: 32, borderRadius: 10,
                            border: 'none', background: 'var(--bg-light)',
                            color: 'var(--text-secondary)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* ── CLIENT & PROPERTY PREVIEW STRIP ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {/* Client card */}
                        {activeClient && (
                            <div style={{
                                padding: '10px 12px',
                                borderRadius: 12,
                                background: 'rgba(37,99,235,0.06)',
                                border: '1px solid rgba(37,99,235,0.18)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 10,
                                        background: 'var(--primary)', color: '#fff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 12, fontWeight: 700, flexShrink: 0
                                    }}>
                                        {activeClient.full_name?.charAt(0)?.toUpperCase() || <User size={14} />}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {activeClient.full_name}
                                        </div>
                                        {activeClient.phone && (
                                            <a 
                                                href={`tel:${activeClient.phone}`}
                                                onClick={e => e.stopPropagation()}
                                                style={{ fontSize: 11, color: 'var(--primary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                                            >
                                                <Phone size={10} /> {formatPhone(activeClient.phone)}
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowClientPicker(v => !v)}
                                    style={{
                                        border: 'none', background: 'transparent',
                                        color: 'var(--primary)', fontSize: 11, fontWeight: 500,
                                        cursor: 'pointer', padding: '4px 8px', borderRadius: 6
                                    }}
                                >
                                    {showClientPicker ? 'Скрыть' : 'Сменить'}
                                </button>
                            </div>
                        )}

                        {/* Optional Client Picker Dropdown */}
                        {(showClientPicker || !activeClient) && (
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>
                                    Клиент
                                </label>
                                <select
                                    className="form-input"
                                    style={{ height: 40, borderRadius: 10, fontSize: 13 }}
                                    value={clientId}
                                    onChange={e => {
                                        setClientId(e.target.value);
                                        const c = state.clients?.find(cl => cl.id === e.target.value);
                                        if (c && (!title.trim() || title.includes(':'))) {
                                            setTitle(buildDefaultTitle(taskType, c, activeProperty));
                                        }
                                    }}
                                >
                                    <option value="">— Без привязки к клиенту —</option>
                                    {(state.clients || []).map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.full_name} {c.phone ? `(${c.phone})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Property card */}
                        {activeProperty && (
                            <div style={{
                                padding: '10px 12px',
                                borderRadius: 12,
                                background: 'rgba(16,185,129,0.06)',
                                border: '1px solid rgba(16,185,129,0.18)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: 10
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 10,
                                        background: '#10b981', color: '#fff',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0
                                    }}>
                                        <Building2 size={16} />
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {activeProperty.address || activeProperty.city || 'Объект недвижимости'}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                            {activeProperty.price ? `${formatNumber(activeProperty.price)} ₽` : 'Цена не указана'}
                                            {activeProperty.deal_type === 'rent' ? '/мес' : ''}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowPropPicker(v => !v)}
                                    style={{
                                        border: 'none', background: 'transparent',
                                        color: '#10b981', fontSize: 11, fontWeight: 500,
                                        cursor: 'pointer', padding: '4px 8px', borderRadius: 6
                                    }}
                                >
                                    {showPropPicker ? 'Скрыть' : 'Сменить'}
                                </button>
                            </div>
                        )}

                        {/* Optional Property Picker */}
                        {(showPropPicker || !activeProperty) && (
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 4 }}>
                                    Объект
                                </label>
                                <select
                                    className="form-input"
                                    style={{ height: 40, borderRadius: 10, fontSize: 13 }}
                                    value={propertyId}
                                    onChange={e => {
                                        setPropertyId(e.target.value);
                                        const p = state.properties?.find(pr => pr.id === e.target.value);
                                        if (p && (!title.trim() || title.includes(':'))) {
                                            setTitle(buildDefaultTitle(taskType, activeClient, p));
                                        }
                                    }}
                                >
                                    <option value="">— Без объекта —</option>
                                    {(state.properties || []).map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.address || p.city} {p.price ? `(${formatNumber(p.price)} ₽)` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* ── TASK TYPE CHIPS ── */}
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
                            Тип задачи
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {TASK_TYPES.map(t => {
                                const isSel = taskType === t.id;
                                const Icon = t.icon;
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => handleSelectTaskType(t.id)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: 10,
                                            fontSize: 12,
                                            fontWeight: isSel ? 600 : 450,
                                            border: isSel ? `1.5px solid ${t.color}` : '1px solid var(--border)',
                                            background: isSel ? t.bg : 'var(--bg-light)',
                                            color: isSel ? t.color : 'var(--text)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <Icon size={13} style={{ color: t.color }} />
                                        <span>{t.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── TITLE INPUT ── */}
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
                            Название задачи *
                        </label>
                        <input
                            type="text"
                            className="form-input"
                            style={{ height: 42, borderRadius: 10, fontSize: 14 }}
                            placeholder="Например: Позвонить по поводу показа"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            required
                        />
                    </div>

                    {/* ── DUE DATE & QUICK SELECTORS ── */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                                Срок выполнения
                            </label>
                            {/* Quick buttons */}
                            <div style={{ display: 'flex', gap: 4 }}>
                                {[
                                    { id: '2h', label: '+2 часа' },
                                    { id: 'tomorrow', label: 'Завтра 10:00' },
                                    { id: '3days', label: '+3 дня' },
                                    { id: 'week', label: 'Неделя' },
                                ].map(q => (
                                    <button
                                        key={q.id}
                                        type="button"
                                        onClick={() => setDueDate(getQuickDate(q.id))}
                                        style={{
                                            border: 'none',
                                            background: 'var(--bg-light)',
                                            color: 'var(--text-secondary)',
                                            fontSize: 10,
                                            fontWeight: 500,
                                            padding: '2px 6px',
                                            borderRadius: 6,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {q.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <input
                            type="datetime-local"
                            className="form-input"
                            style={{ height: 42, borderRadius: 10, fontSize: 13 }}
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                            required
                        />
                    </div>

                    {/* ── PRIORITY ── */}
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
                            Приоритет
                        </label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {PRIORITIES.map(p => {
                                const isSel = priority === p.id;
                                return (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => setPriority(p.id)}
                                        style={{
                                            flex: 1,
                                            padding: '7px 10px',
                                            borderRadius: 8,
                                            fontSize: 11,
                                            fontWeight: isSel ? 600 : 400,
                                            border: isSel ? `1.5px solid ${p.color}` : '1px solid var(--border)',
                                            background: isSel ? 'var(--surface)' : 'var(--bg-light)',
                                            color: isSel ? p.color : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: 4
                                        }}
                                    >
                                        <Flag size={11} style={{ color: p.color }} />
                                        <span>{p.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── DESCRIPTION / NOTES ── */}
                    <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>
                            Комментарий / Детали
                        </label>
                        <textarea
                            className="form-input"
                            rows={3}
                            style={{ height: 'auto', borderRadius: 10, fontSize: 13, resize: 'vertical' }}
                            placeholder="Дополнительные детали, пожелания клиента, вопросы для обсуждения..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    {/* ── ACTIONS ── */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6, paddingTop: 14, borderTop: '1px solid var(--border-light)' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            style={{
                                padding: '10px 18px',
                                borderRadius: 12,
                                border: '1px solid var(--border)',
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: 'pointer'
                            }}
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            style={{
                                padding: '10px 22px',
                                borderRadius: 12,
                                border: 'none',
                                background: 'var(--primary)',
                                color: '#fff',
                                fontSize: 13,
                                fontWeight: 600,
                                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                opacity: isSubmitting ? 0.7 : 1,
                                boxShadow: '0 4px 14px rgba(37,99,235,0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                            }}
                        >
                            <Check size={16} />
                            <span>{isSubmitting ? 'Сохранение...' : (initialData?.id ? 'Сохранить изменения' : 'Поставить задачу')}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
