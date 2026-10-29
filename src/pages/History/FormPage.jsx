import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { formatPhone, getEventStatusLabel, parseLocalDateTime, toLocalISOString, stripPhone } from '../../utils/format';
import {
    Calendar, User, Home, Save, UserPlus, X, ChevronLeft, Clock,
    Info, Check, MessageSquare, Trash2, Plus, Sparkles, Building2,
    ChevronDown, ChevronUp, ExternalLink
} from 'lucide-react';
import { PROPERTY_TYPES } from '../../data/constants';
import { nanoid } from '../../utils/nanoid';
import { MultiClientSelector } from '../../components/MultiClientSelector';
import { AddressAutocomplete } from '../../components/AddressAutocomplete';
import { compressImage, readClipboardAndCompress } from '../../utils/image';

const getPropertyClientIds = (p) => {
    let ids = p?.client_ids || [];
    if (typeof ids === 'string') {
        ids = ids.replace(/[{}]/g, '').split(',').filter(Boolean);
    }
    if (p?.client_id && !ids.includes(p.client_id)) {
        ids = [...ids, p.client_id];
    }
    return ids;
};

const parseClientIds = (ids, singleId) => {
    let list = ids;
    if (typeof list === 'string') {
        list = list.replace(/[{}]/g, '').split(',').filter(Boolean);
    }
    if (!Array.isArray(list) || list.length === 0) {
        list = singleId ? [singleId] : [];
    }
    return list.filter(Boolean);
};

const EVENT_TYPES = [
    { id: 'showing', label: 'Показ' },
    { id: 'meeting', label: 'Встреча' },
    { id: 'call', label: 'Звонок' },
    { id: 'viewing', label: 'Подбор' },
    { id: 'deposit', label: 'Задаток' },
    { id: 'deal', label: 'Сделка' },
];

export function FormPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const { toast } = useToastContext();
    const [searchParams] = useSearchParams();

    const prePropId = searchParams.get('propertyId') || searchParams.get('property_id');
    const preClientId = searchParams.get('clientId') || searchParams.get('client_id');
    const preClientIds = searchParams.get('client_ids')
        ? searchParams.get('client_ids').split(',')
        : (preClientId ? [preClientId] : []);
    const editId = searchParams.get('id');

    const existingShowing = editId ? state.showings.find(s => s.id === editId) : null;

    const [form, setForm] = useState(() => {
        if (existingShowing) {
            const cIds = parseClientIds(existingShowing.client_ids, existingShowing.client_id);
            return {
                ...existingShowing,
                client_id: cIds[0] || existingShowing.client_id || '',
                client_ids: cIds,
                showing_date: existingShowing.showing_date ? toLocalISOString(existingShowing.showing_date) : '',
            };
        }
        return {
            property_id: prePropId || '',
            client_id: preClientIds[0] || '',
            client_ids: preClientIds,
            showing_date: toLocalISOString(new Date()),
            status: 'planned',
            client_feedback: '',
            feedback_comment: '',
            event_type: searchParams.get('event_type') || 'showing',
            realtor_id: state.currentUser?.id
        };
    });

    // Synchronize form when existingShowing is loaded (or arrives async from Neon DB)
    useEffect(() => {
        if (editId && existingShowing) {
            const cIds = parseClientIds(existingShowing.client_ids, existingShowing.client_id);
            setForm(prev => ({
                ...prev,
                ...existingShowing,
                client_id: cIds[0] || existingShowing.client_id || '',
                client_ids: cIds,
                showing_date: existingShowing.showing_date ? toLocalISOString(existingShowing.showing_date) : prev.showing_date,
            }));
        }
    }, [editId, existingShowing]);

    const [showNewClient, setShowNewClient] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [newClientPhone, setNewClientPhone] = useState('');

    const [showNewSelection, setShowNewSelection] = useState(false);
    const [newSelAddress, setNewSelAddress] = useState('');
    const [newSelPrice, setNewSelPrice] = useState(0);
    const [newSelContactName, setNewSelContactName] = useState('');
    const [newSelContactPhone, setNewSelContactPhone] = useState('');
    const [newSelContactType, setNewSelContactType] = useState('seller');
    const [newSelMatchingClient, setNewSelMatchingClient] = useState(null);
    const [newSelRooms, setNewSelRooms] = useState(1);
    const [newSelAreaTotal, setNewSelAreaTotal] = useState('');
    const [newSelFloor, setNewSelFloor] = useState('');
    const [newSelFloorsTotal, setNewSelFloorsTotal] = useState('');
    const [newSelPropertyType, setNewSelPropertyType] = useState('apartment');
    const [newSelCity, setNewSelCity] = useState('');
    const [newSelImage, setNewSelImage] = useState('');
    const [newSelLink, setNewSelLink] = useState('');

    const [showAllProperties, setShowAllProperties] = useState(false);

    useEffect(() => {
        const clean = stripPhone(newSelContactPhone);
        if (clean && clean.length >= 10) {
            const found = state.clients.find(c => {
                const cleanTarget = stripPhone(c.phone);
                const cleanPhones = (c.phones || []).map(p => stripPhone(p));
                return cleanTarget === clean || cleanPhones.includes(clean);
            });
            setNewSelMatchingClient(found || null);
            if (found && !newSelContactName) {
                setNewSelContactName(found.full_name);
                setNewSelContactType(found.client_types?.[0] || 'seller');
            }
        } else {
            setNewSelMatchingClient(null);
        }
    }, [newSelContactPhone, state.clients]);

    const myClients = state.clients.filter(c => c.realtor_id === state.currentUser?.id);
    const allProperties = state.properties.filter(p => p.realtor_id === state.currentUser?.id);
    const allSelectionItems = (state.selectionItems || []).filter(item => {
        if (form.client_ids && form.client_ids.length > 0) {
            return form.client_ids.includes(item.client_id) || (item.client_ids || []).some(id => form.client_ids.includes(id));
        }
        return true;
    });

    // ─── Owner Properties Resolution ──────────────────────────────────────
    const selectedClientIds = useMemo(() => {
        return form.client_ids || (form.client_id ? [form.client_id] : []);
    }, [form.client_ids, form.client_id]);

    const ownerProperties = useMemo(() => {
        if (!selectedClientIds || selectedClientIds.length === 0) return [];
        return state.properties.filter(p => {
            const pClientIds = getPropertyClientIds(p);
            return selectedClientIds.some(cid => pClientIds.includes(cid));
        });
    }, [selectedClientIds, state.properties]);

    // Auto-select property if the owner has exactly 1 property
    useEffect(() => {
        if (form.event_type === 'viewing') return;
        if (ownerProperties.length === 1) {
            if (form.property_id !== ownerProperties[0].id) {
                setForm(f => ({ ...f, property_id: ownerProperties[0].id }));
            }
        }
    }, [ownerProperties, form.event_type]);

    function handleCreateSelection() {
        if (!form.client_ids?.length) {
            toast.error('Сначала выберите клиента для события');
            return;
        }
        if (!newSelAddress.trim()) {
            toast.error('Введите адрес объекта');
            return;
        }

        const cleanPhone = stripPhone(newSelContactPhone);
        if (newSelContactName.trim() && cleanPhone) {
            const found = state.clients.find(c => {
                const cleanTarget = stripPhone(c.phone);
                const cleanPhones = (c.phones || []).map(p => stripPhone(p));
                return cleanTarget === cleanPhone || cleanPhones.includes(cleanPhone);
            });

            const selectedType = newSelContactType || 'seller';
            if (!found) {
                const newContactClient = {
                    id: nanoid(),
                    full_name: newSelContactName.trim(),
                    phone: cleanPhone,
                    client_types: [selectedType],
                    status: 'active',
                    notes: `Создан автоматически при встрече по объекту: ${newSelAddress.trim()}`,
                    realtor_id: state.currentUser?.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                dispatch({ type: 'ADD_CLIENT', client: newContactClient });
            } else if (!found.client_types?.includes(selectedType)) {
                dispatch({
                    type: 'UPDATE_CLIENT',
                    client: {
                        ...found,
                        client_types: [...(found.client_types || []), selectedType],
                        updated_at: new Date().toISOString()
                    }
                });
            }
        }

        const newId = nanoid();
        const item = {
            id: newId,
            client_id: form.client_ids[0],
            client_ids: form.client_ids || [],
            address: newSelAddress.trim(),
            price: Number(newSelPrice),
            contact_name: newSelContactName.trim(),
            contact_phone: newSelContactPhone.trim(),
            rooms: newSelRooms,
            area_total: newSelAreaTotal ? Number(newSelAreaTotal) : null,
            floor: newSelFloor ? Number(newSelFloor) : null,
            floors_total: newSelFloorsTotal ? Number(newSelFloorsTotal) : null,
            property_type: newSelPropertyType,
            city: newSelCity.trim() || null,
            images: newSelImage.trim() ? [newSelImage.trim()] : [],
            link: newSelLink.trim() || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        dispatch({ type: 'ADD_SELECTION_ITEM', item });
        setForm(f => ({ ...f, property_id: newId }));
        setShowNewSelection(false);
        setNewSelAddress('');
        setNewSelPrice(0);
        setNewSelContactName('');
        setNewSelContactPhone('');
        setNewSelRooms(1);
        setNewSelAreaTotal('');
        setNewSelFloor('');
        setNewSelFloorsTotal('');
        setNewSelPropertyType('apartment');
        setNewSelCity('');
        setNewSelImage('');
        setNewSelLink('');
        toast.success('Подбор создан и выбран');
    }

    function handleCreateClient() {
        if (!newClientName.trim()) { toast.error('Введите имя клиента'); return; }
        const cleanPhone = stripPhone(newClientPhone);
        const existing = cleanPhone ? state.clients.find(c => {
            const cPhone = stripPhone(c.phone);
            const cPhones = (c.phones || []).map(p => stripPhone(p));
            return cPhone === cleanPhone || cPhones.includes(cleanPhone);
        }) : null;

        if (existing) {
            const updated = {
                ...existing,
                full_name: newClientName.trim() || existing.full_name,
                phone: cleanPhone || existing.phone,
                updated_at: new Date().toISOString()
            };
            dispatch({ type: 'UPDATE_CLIENT', client: updated });
            setForm(f => ({
                ...f,
                client_id: existing.id,
                client_ids: Array.from(new Set([...(f.client_ids || []), existing.id]))
            }));
            toast.info(`Контакт «${existing.full_name}» обновлён и выбран`);
        } else {
            const client = {
                id: nanoid(),
                realtor_id: state.currentUser?.id,
                full_name: newClientName.trim(),
                phone: cleanPhone,
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
            toast.success('Клиент создан и выбран');
        }
        setShowNewClient(false);
        setNewClientName('');
        setNewClientPhone('');
    }

    const canEdit = !editId || !form.realtor_id || form.realtor_id === state.currentUser?.id || state.currentUser?.role === 'admin';

    function handleSubmit(e) {
        e.preventDefault();
        if (!form.client_ids?.length) {
            toast.error('Выберите клиента для события');
            return;
        }
        if (!form.showing_date) {
            toast.error('Укажите дату и время события');
            return;
        }

        let dateIso = null;
        const parsedDate = parseLocalDateTime(form.showing_date);
        if (parsedDate && !isNaN(parsedDate.getTime())) {
            dateIso = parsedDate.toISOString();
        } else {
            const fallbackDate = new Date(form.showing_date);
            if (!isNaN(fallbackDate.getTime())) dateIso = fallbackDate.toISOString();
        }

        if (!dateIso) {
            toast.error('Некорректная дата');
            return;
        }

        const cleanClientIds = (form.client_ids || []).filter(Boolean);

        const showing = {
            ...form,
            id: editId || form.id || nanoid(),
            realtor_id: form.realtor_id || state.currentUser?.id || null,
            client_id: cleanClientIds[0] || null,
            client_ids: cleanClientIds,
            property_id: form.property_id || null,
            showing_date: dateIso,
            updated_at: new Date().toISOString(),
        };

        if (editId) {
            dispatch({ type: 'UPDATE_SHOWING', showing: { ...showing, id: editId } });
            toast.success('Изменения сохранены');
        } else {
            showing.created_at = new Date().toISOString();
            dispatch({ type: 'ADD_SHOWING', showing });
            toast.success('Событие добавлено в календарь');
        }
        navigate('/history');
    }

    function handleDelete() {
        if (!window.confirm('Удалить это событие? Это действие нельзя отменить.')) return;
        dispatch({ type: 'DELETE_SHOWING', id: editId });
        toast.success('Событие удалено');
        navigate('/history');
    }

    const selectedProperty = form.event_type === 'viewing'
        ? allSelectionItems.find(p => p.id === form.property_id)
        : state.properties.find(p => p.id === form.property_id);

    return (
        <div className="page fade-in" style={{ background: 'var(--bg)', minHeight: '100vh' }}>
            {/* ─── Compact Topbar ────────────────────────────────────────── */}
            <div className="topbar sticky" style={{
                background: 'var(--topbar-bg)',
                backdropFilter: 'blur(20px) saturate(180%)',
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 1000
            }}>
                <button
                    onClick={() => navigate(-1)}
                    className="card-clickable"
                    style={{
                        width: 36, height: 36, borderRadius: 10, border: 'none', background: 'var(--surface)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.06)', color: 'var(--text)'
                    }}
                >
                    <ChevronLeft size={18} />
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <span className="font-oswald" style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text)' }}>
                        {editId ? 'Редактор события' : 'Новое событие'}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', opacity: 0.6 }}>
                        Календарь
                    </span>
                </div>

                {editId && canEdit ? (
                    <button
                        onClick={handleDelete}
                        className="card-clickable"
                        title="Удалить событие"
                        style={{
                            width: 36, height: 36, borderRadius: 10, border: 'none', background: 'rgba(239, 68, 68, 0.08)',
                            color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <Trash2 size={16} />
                    </button>
                ) : (
                    <div style={{ width: 36 }} />
                )}
            </div>

            {/* ─── Page Content ─────────────────────────────────────────── */}
            <div className="page-content" style={{ padding: '14px 16px 100px', maxWidth: 640, margin: '0 auto' }}>

                {/* Calendar Sync Banner */}
                {state.calendarStatus && (
                    <div style={{
                        marginBottom: 12, padding: '8px 12px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 8,
                        background: state.calendarStatus === 'ok' ? '#ecfdf5' : state.calendarStatus === 'error' ? '#fef2f2' : '#eff6ff',
                        color: state.calendarStatus === 'ok' ? '#059669' : state.calendarStatus === 'error' ? '#dc2626' : '#2563eb',
                    }}>
                        {state.calendarStatus === 'loading' ? <Clock size={13} className="spin" /> : <Info size={13} />}
                        <span>
                            {state.calendarStatus === 'loading' && 'Синхронизация с Google Calendar...'}
                            {state.calendarStatus === 'ok' && '✓ Синхронизировано с Google Calendar'}
                            {state.calendarStatus === 'error' && '✗ Ошибка Google Calendar'}
                        </span>
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                    {/* ─── Compact Card 1: Event Type & Status & Timing ─── */}
                    <div className="card" style={{ padding: '14px 16px', borderRadius: 18, border: '1px solid var(--border-light)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                        
                        {/* Event Type Pills */}
                        <div>
                            <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>
                                Тип события
                            </label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {EVENT_TYPES.map(t => {
                                    const active = form.event_type === t.id;
                                    return (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setForm(f => ({ ...f, event_type: t.id, property_id: '' }))}
                                            style={{
                                                padding: '5px 11px',
                                                borderRadius: 8,
                                                fontSize: 12,
                                                fontWeight: active ? 700 : 500,
                                                border: active ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                                                background: active ? 'var(--primary)' : 'var(--bg-light)',
                                                color: active ? '#ffffff' : 'var(--text)',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {t.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Date/Time + Status (2 columns) */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                            <div>
                                <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Calendar size={11} color="var(--primary)" /> Дата и время *
                                </label>
                                <input
                                    type="datetime-local"
                                    className="form-input"
                                    required
                                    value={form.showing_date}
                                    onChange={e => setForm({ ...form, showing_date: e.target.value })}
                                    disabled={!canEdit}
                                    style={{ height: 40, borderRadius: 10, fontSize: 12, padding: '0 8px', background: 'var(--bg)', width: '100%' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
                                    Статус
                                </label>
                                <select
                                    className="form-select"
                                    value={form.status}
                                    onChange={e => setForm({ ...form, status: e.target.value })}
                                    disabled={!canEdit}
                                    style={{ height: 40, borderRadius: 10, fontSize: 12, padding: '0 8px', background: 'var(--bg)', width: '100%' }}
                                >
                                    <option value="planned">{getEventStatusLabel(form.event_type, 'planned')}</option>
                                    <option value="completed">{getEventStatusLabel(form.event_type, 'completed')}</option>
                                    <option value="failed">{getEventStatusLabel(form.event_type, 'failed')}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* ─── Compact Card 2: Clients & Property ───────────── */}
                    <div className="card" style={{ padding: '14px 16px', borderRadius: 18, border: '1px solid var(--border-light)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 12 }}>

                        {/* Client Selector */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <User size={11} color="var(--primary)" /> Клиент / Участники *
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowNewClient(v => !v)}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 3,
                                        fontSize: 10, fontWeight: 700, color: showNewClient ? 'var(--danger)' : 'var(--primary)',
                                        background: 'transparent', border: 'none', cursor: 'pointer', padding: 0
                                    }}
                                >
                                    {showNewClient ? <><X size={12} /> Отмена</> : <><UserPlus size={12} /> + Новый</>}
                                </button>
                            </div>

                            {showNewClient ? (
                                <div style={{ background: 'var(--bg-light)', borderRadius: 12, padding: 10, border: '1px dashed var(--primary)', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                                    <input
                                        className="form-input"
                                        style={{ height: 36, fontSize: 12, borderRadius: 8 }}
                                        placeholder="ФИО клиента *"
                                        value={newClientName}
                                        onChange={e => setNewClientName(e.target.value)}
                                    />
                                    <input
                                        type="tel"
                                        inputMode="tel"
                                        className="form-input"
                                        style={{ height: 36, fontSize: 12, borderRadius: 8 }}
                                        placeholder="+7 (___) ___-__-__"
                                        value={newClientPhone}
                                        onChange={e => setNewClientPhone(formatPhone(e.target.value, true))}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCreateClient}
                                        style={{ height: 34, borderRadius: 8, background: 'var(--primary)', color: 'white', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        Создать и выбрать
                                    </button>
                                </div>
                            ) : (
                                <MultiClientSelector
                                    selectedIds={form.client_ids || []}
                                    onChange={ids => setForm(f => ({ ...f, client_ids: ids, client_id: ids[0] || '' }))}
                                    clients={myClients.length > 0 ? myClients : state.clients}
                                    placeholder="Выберите клиента..."
                                />
                            )}
                        </div>

                        {/* Property Section with Owner Property Auto-Load */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                                <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Home size={11} color="var(--primary)" />
                                    {form.event_type === 'viewing' ? 'Объект из подбора' : 'Объект недвижимости'}
                                </label>
                                {form.event_type === 'viewing' && (
                                    <button
                                        type="button"
                                        onClick={() => setShowNewSelection(v => !v)}
                                        style={{ border: 'none', background: 'transparent', color: 'var(--primary)', fontSize: 10, fontWeight: 700, cursor: 'pointer', padding: 0 }}
                                    >
                                        {showNewSelection ? 'Отмена' : '+ Новый подбор'}
                                    </button>
                                )}
                            </div>

                            {form.event_type === 'viewing' ? (
                                /* Viewing Selection Item Mode */
                                showNewSelection ? (
                                    <div style={{ background: 'var(--bg-light)', borderRadius: 12, padding: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <AddressAutocomplete
                                            value={newSelAddress}
                                            onChange={val => setNewSelAddress(val)}
                                            placeholder="Адрес объекта подбора *"
                                        />
                                        <input
                                            type="text"
                                            className="form-input"
                                            style={{ height: 36, fontSize: 12, borderRadius: 8 }}
                                            value={newSelPrice ? String(newSelPrice).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''}
                                            onChange={e => setNewSelPrice(Number(e.target.value.replace(/\D/g, '')))}
                                            placeholder="Цена (₽)"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCreateSelection}
                                            style={{ height: 34, borderRadius: 8, background: 'var(--primary)', color: 'white', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                                        >
                                            Создать и выбрать
                                        </button>
                                    </div>
                                ) : (
                                    <select
                                        className="form-select"
                                        value={form.property_id || ''}
                                        onChange={e => setForm({ ...form, property_id: e.target.value })}
                                        disabled={!canEdit}
                                        style={{ height: 40, borderRadius: 10, fontSize: 12, background: 'var(--bg)', width: '100%' }}
                                    >
                                        <option value="">— Выберите объект из подбора —</option>
                                        {allSelectionItems.map(p => (
                                            <option key={p.id} value={p.id}>{p.address} ({(p.price || 0).toLocaleString()} ₽)</option>
                                        ))}
                                    </select>
                                )
                            ) : (
                                /* Standard Property Selector with Owner Resolution */
                                <div>
                                    {/* A. If owner has exactly 1 property */}
                                    {ownerProperties.length === 1 && !showAllProperties && (
                                        <div style={{
                                            background: 'var(--primary-light)',
                                            padding: '8px 12px',
                                            borderRadius: 12,
                                            border: '1px solid rgba(0, 82, 255, 0.2)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 8
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                                <div style={{
                                                    width: 28, height: 28, borderRadius: 8, background: 'var(--primary)',
                                                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                }}>
                                                    <Home size={14} />
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                        {ownerProperties[0].address}
                                                    </div>
                                                    <div style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 600 }}>
                                                        ✓ Объект собственника · {(ownerProperties[0].price || 0).toLocaleString()} ₽
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setShowAllProperties(true)}
                                                style={{
                                                    border: 'none', background: 'transparent', color: 'var(--primary)',
                                                    fontSize: 10, fontWeight: 700, cursor: 'pointer', padding: '4px 6px', flexShrink: 0
                                                }}
                                            >
                                                Сменить
                                            </button>
                                        </div>
                                    )}

                                    {/* B. If owner has MULTIPLE properties (предоставлять выбор если несколько) */}
                                    {ownerProperties.length > 1 && !showAllProperties && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Sparkles size={11} /> Объекты собственника ({ownerProperties.length}):
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: ownerProperties.length === 2 ? '1fr 1fr' : '1fr', gap: 6 }}>
                                                {ownerProperties.map(p => {
                                                    const isSelected = form.property_id === p.id;
                                                    return (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            onClick={() => setForm(f => ({ ...f, property_id: p.id }))}
                                                            style={{
                                                                padding: '8px 10px',
                                                                borderRadius: 10,
                                                                border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                                                                background: isSelected ? 'var(--primary-light)' : 'var(--bg)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                cursor: 'pointer',
                                                                textAlign: 'left',
                                                                transition: 'all 0.15s ease'
                                                            }}
                                                        >
                                                            <div style={{ minWidth: 0, paddingRight: 6 }}>
                                                                <div style={{ fontSize: 12, fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--primary)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {p.address}
                                                                </div>
                                                                <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>
                                                                    {(p.price || 0).toLocaleString()} ₽ {p.rooms ? `· ${p.rooms}к` : ''}
                                                                </div>
                                                            </div>
                                                            {isSelected && <Check size={14} color="var(--primary)" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAllProperties(true)}
                                                    style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: 10, cursor: 'pointer', padding: 0 }}
                                                >
                                                    Выбрать другой объект из базы...
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* C. Fallback: Full property dropdown (when 0 owner props, or user clicked "Сменить/Выбрать другой") */}
                                    {(ownerProperties.length === 0 || showAllProperties) && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <select
                                                className="form-select"
                                                value={form.property_id || ''}
                                                onChange={e => setForm({ ...form, property_id: e.target.value })}
                                                disabled={!canEdit}
                                                style={{ height: 40, borderRadius: 10, fontSize: 12, background: 'var(--bg)', width: '100%' }}
                                            >
                                                <option value="">— Без объекта недвижимости —</option>
                                                {ownerProperties.length > 0 && (
                                                    <optgroup label="Объекты собственника">
                                                        {ownerProperties.map(p => (
                                                            <option key={p.id} value={p.id}>⭐ {p.address} ({(p.price || 0).toLocaleString()} ₽)</option>
                                                        ))}
                                                    </optgroup>
                                                )}
                                                <optgroup label="Все объекты">
                                                    {allProperties.map(p => (
                                                        <option key={p.id} value={p.id}>{p.address} ({(p.price || 0).toLocaleString()} ₽)</option>
                                                    ))}
                                                </optgroup>
                                            </select>
                                            {ownerProperties.length > 0 && showAllProperties && (
                                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowAllProperties(false)}
                                                        style={{ border: 'none', background: 'transparent', color: 'var(--primary)', fontSize: 10, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                                                    >
                                                        Вернуться к объектам собственника ({ownerProperties.length})
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ─── Compact Card 3: Feedback & Notes ─────────────── */}
                    <div className="card" style={{ padding: '14px 16px', borderRadius: 18, border: '1px solid var(--border-light)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div>
                            <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>
                                Отзыв / Результат
                            </label>
                            <select
                                className="form-select"
                                value={form.client_feedback || ''}
                                onChange={e => setForm({ ...form, client_feedback: e.target.value })}
                                disabled={!canEdit}
                                style={{ height: 38, borderRadius: 10, fontSize: 12, padding: '0 8px', background: 'var(--bg)', width: '100%' }}
                            >
                                <option value="">— Не указан —</option>
                                <option value="interested">Заинтересован</option>
                                <option value="thinking">Думает</option>
                                <option value="other_options">Ищет другие варианты</option>
                                <option value="price_high">Дорого</option>
                                <option value="layout_bad">Не нравится планировка</option>
                                <option value="location_bad">Не нравится расположение</option>
                                <option value="condition_bad">Плохое состояние</option>
                                <option value="ready">Готов к сделке</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <MessageSquare size={11} color="var(--primary)" /> Комментарий / Заметки
                            </label>
                            <textarea
                                className="form-textarea"
                                rows={2}
                                value={form.feedback_comment || ''}
                                onChange={e => setForm({ ...form, feedback_comment: e.target.value })}
                                placeholder="Заметки по встрече, договоренности..."
                                disabled={!canEdit}
                                style={{ borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', padding: '8px 10px', fontSize: 12, resize: 'none', width: '100%' }}
                            />
                        </div>
                    </div>

                    {/* ─── Action Buttons ───────────────────────────────── */}
                    {canEdit ? (
                        <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <button
                                type="submit"
                                className="card-clickable"
                                style={{
                                    height: 46, borderRadius: 12, border: 'none',
                                    background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: 13,
                                    fontFamily: "'Medeo Sans', ui-sans-serif, sans-serif", textTransform: 'uppercase', letterSpacing: '0.04em',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    boxShadow: '0 4px 14px rgba(0, 82, 255, 0.25)', cursor: 'pointer'
                                }}
                            >
                                <Save size={16} />
                                {editId ? 'Сохранить изменения' : 'Сохранить событие'}
                            </button>

                            {editId && (
                                <button
                                    type="button"
                                    className="card-clickable"
                                    onClick={handleDelete}
                                    style={{
                                        height: 38, borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.3)',
                                        background: 'transparent', color: 'var(--danger)', fontWeight: 600, fontSize: 12,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer'
                                    }}
                                >
                                    <Trash2 size={14} />
                                    Удалить событие
                                </button>
                            )}
                        </div>
                    ) : (
                        <div style={{
                            textAlign: 'center', padding: 12, borderRadius: 12, background: 'rgba(0,0,0,0.03)',
                            color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500, border: '1px dashed var(--border)'
                        }}>
                            Редактирование ограничено: только создатель или администратор может вносить изменения.
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
