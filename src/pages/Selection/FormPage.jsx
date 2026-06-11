import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { AddressAutocomplete } from '../../components/AddressAutocomplete';
import { decodeImportData } from '../../utils/importDecoder';
import { nanoid } from '../../utils/nanoid';
import { formatPhone, stripPhone } from '../../utils/format';
import { ChevronLeft, MapPin, DollarSign, User, Phone, Check, Ruler, Image, Upload } from 'lucide-react';
import { PROPERTY_TYPES } from '../../data/constants';
import { compressBlob } from '../../utils/image';
import { MultiClientSelector } from '../../components/MultiClientSelector';


export function FormPage() {
    const fileInputRef = useRef(null);
    const importToastShown = useRef(false);
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const { toast } = useToastContext();

    const existing = id ? state.selectionItems?.find(i => i.id === id) : null;
    const initialForm = existing ? {
        ...existing,
        contact_phone: formatPhone(existing.contact_phone || '', true),
        contact_client_type: existing.contact_client_type || 'seller',
        rooms: existing.rooms !== undefined ? existing.rooms : 1,
        area_total: existing.area_total || '',
        floor: existing.floor || '',
        floors_total: existing.floors_total || '',
        property_type: existing.property_type || 'apartment',
        images: existing.images || [],
        link: existing.link || '',
        client_ids: existing.client_ids || (existing.client_id ? [existing.client_id] : [])
    } : {
        client_ids: searchParams.get('client') ? [searchParams.get('client')] : [],
        client_id: searchParams.get('client') || '',
        address: '',
        price: 0,
        contact_name: '',
        contact_phone: '',
        contact_client_type: 'seller',
        rooms: 1,
        area_total: '',
        floor: '',
        floors_total: '',
        property_type: 'apartment',
        images: [],
        link: ''
    };

    const [form, setForm] = useState(initialForm);
    const [matchingClient, setMatchingClient] = useState(null);

    useEffect(() => {
        if (existing && !form.id) {
            setForm({ ...existing });
        }
    }, [existing, form.id]);

    useEffect(() => {
        const importData = searchParams.get('import');
        if (importData) {
            try {
                const data = decodeImportData(importData);
                if (data) {
                    setForm(f => ({
                        ...f,
                        address: data.address || data.title || '',
                        price: data.price ? (Number(String(data.price).replace(/\D/g, '')) || 0) : 0,
                        rooms: data.rooms !== undefined ? Number(data.rooms) : 1,
                        area_total: data.area_total ? Number(data.area_total) : '',
                        floor: data.floor ? Number(data.floor) : '',
                        floors_total: data.floors_total ? Number(data.floors_total) : '',
                        property_type: data.property_type || 'apartment',
                        link: data.link || data.url || '',
                        images: data.images && data.images.length > 0 
                            ? [data.images[0]] 
                            : (data.image 
                                ? [data.image] 
                                : (data.photos && data.photos.length > 0 ? [data.photos[0]] : []))
                    }));
                    // Show toast only once per page load to avoid spam
                    if (!importToastShown.current) {
                        importToastShown.current = true;
                        toast.success('Данные импортированы. Проверьте и сохраните.');
                    }
                }
            } catch (err) {
                console.error('Failed to parse import data:', err);
            }
        }
    }, [searchParams, toast]);

    // Check for existing client by phone number as the user types
    useEffect(() => {
        const clean = stripPhone(form.contact_phone);
        if (clean && clean.length >= 10) {
            const found = state.clients.find(c => {
                const cleanTarget = stripPhone(c.phone);
                const cleanPhones = (c.phones || []).map(p => stripPhone(p));
                return cleanTarget === clean || cleanPhones.includes(clean);
            });
            setMatchingClient(found || null);
            if (found) {
                setForm(f => {
                    if (!f.contact_name) {
                        return {
                            ...f,
                            contact_name: found.full_name,
                            contact_client_type: found.client_types?.[0] || 'seller'
                        };
                    }
                    return f;
                });
            }
        } else {
            setMatchingClient(null);
        }
    }, [form.contact_phone, state.clients]);

    const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.address) {
            toast.error('Укажите адрес объекта');
            return;
        }

        // Auto-save contact as client in database if filled
        const cleanContactPhone = stripPhone(form.contact_phone);
        if (form.contact_name?.trim() && cleanContactPhone) {
            const found = state.clients.find(c => {
                const cleanTarget = stripPhone(c.phone);
                const cleanPhones = (c.phones || []).map(p => stripPhone(p));
                return cleanTarget === cleanContactPhone || cleanPhones.includes(cleanContactPhone);
            });

            const selectedType = form.contact_client_type || 'seller';

            if (!found) {
                // Create new client
                const newContactClient = {
                    id: nanoid(),
                    full_name: form.contact_name.trim(),
                    phone: cleanContactPhone,
                    client_types: [selectedType],
                    status: 'active',
                    notes: `Создан автоматически из подбора объекта по адресу: ${form.address}`,
                    realtor_id: state.currentUser?.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                dispatch({ type: 'ADD_CLIENT', client: newContactClient });
            } else {
                // Update client types if not already present
                if (!found.client_types?.includes(selectedType)) {
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
        }

        // Destructure to prevent contact_client_type from being stored in selection_items database
        const { contact_client_type, ...cleanForm } = form;

        if (id) {
            dispatch({ type: 'UPDATE_SELECTION_ITEM', item: {
                ...cleanForm,
                updated_at: new Date().toISOString()
            } });
            toast.success('Подбор обновлен');
        } else {
            const newItem = {
                ...cleanForm,
                id: nanoid(),
                realtor_id: state.currentUser?.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            dispatch({ type: 'ADD_SELECTION_ITEM', item: newItem });
            toast.success('Объект добавлен в подбор');
        }

        // Safer navigation to prevent being stuck on a blank history tab
        const returnTo = searchParams.get('returnTo');
        if (returnTo) {
            navigate(returnTo);
        } else {
            const hasHistory = window.history.state && window.history.state.idx > 0;
            if (hasHistory) {
                navigate(-1);
            } else {
                navigate('/properties?filter=selection');
            }
        }
    };

    return (
        <div className="page" style={{ 
            background: 'var(--bg-light)', 
            fontFamily: "'Oswald', sans-serif" 
        }}>
            <div style={{
                position: 'sticky', top: 0, zIndex: 100,
                background: 'var(--topbar-bg)', backdropFilter: 'blur(20px) saturate(180%)',
                padding: '20px 24px', borderBottom: '1px solid var(--topbar-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
            }}>
                <button onClick={() => navigate(-1)} className="card-clickable" style={{
                    width: 44, height: 44, borderRadius: 14, border: 'none',
                    background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    color: 'var(--text)'
                }}>
                    <ChevronLeft size={22} />
                </button>
                <div className="font-oswald" style={{ fontWeight: 300, fontSize: 17, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    {id ? 'Редактирование подбора' : 'Новый подбор'}
                </div>
                <div style={{ width: 44 }}></div>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '20px', maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Клиенты подбора */}
                <div className="card fade-in" style={{ 
                    padding: '24px', borderRadius: 24, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.8)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: 16
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <User size={20} color="var(--primary)" />
                        <div className="font-oswald" style={{ fontSize: 14, fontWeight: 300, textTransform: 'uppercase' }}>Клиенты подбора</div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 300, fontSize: 13 }}>Выберите одного или нескольких клиентов</label>
                        <MultiClientSelector 
                            selectedIds={form.client_ids || []}
                            onChange={ids => setForm(f => ({ ...f, client_ids: ids, client_id: ids[0] || '' }))}
                            clients={state.clients || []}
                        />
                    </div>
                </div>

                {/* Основные данные объекта */}
                <div className="card fade-in" style={{ 
                    padding: '24px', borderRadius: 24, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.8)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: 16
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MapPin size={20} color="var(--primary)" />
                        <div className="font-oswald" style={{ fontSize: 14, fontWeight: 300, textTransform: 'uppercase' }}>Объект</div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 300, fontSize: 13 }}>Адрес</label>
                        <AddressAutocomplete
                            value={form.address}
                            onChange={val => setF('address', val)}
                            placeholder="Введите адрес объекта..."
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 300, fontSize: 13 }}>Цена (₽)</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                className="form-input"
                                style={{ paddingLeft: 36, fontSize: 16, fontWeight: 500, borderRadius: 14 }}
                                value={form.price !== undefined && form.price !== null && form.price !== '' ? form.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''}
                                onChange={e => setF('price', Number(e.target.value.replace(/\D/g, '')))}
                                placeholder="0"
                            />
                            <DollarSign size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 15 }} />
                        </div>
                    </div>
                </div>

                {/* Контактное лицо */}
                <div className="card fade-in" style={{ 
                    padding: '24px', borderRadius: 24, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.8)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: 16
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Phone size={20} color="var(--primary)" />
                        <div className="font-oswald" style={{ fontSize: 14, fontWeight: 300, textTransform: 'uppercase' }}>Контакты</div>
                    </div>

                    {matchingClient && (
                        <div style={{ 
                            fontSize: 12, 
                            color: 'var(--success)', 
                            background: 'var(--success-light)', 
                            padding: '6px 12px', 
                            borderRadius: 8, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 6,
                            fontWeight: 500
                        }}>
                            <span>✓ Найден в базе: <strong>{matchingClient.full_name}</strong> ({
                                matchingClient.client_types?.map(t => {
                                    const labels = { buyer: 'Покупатель', seller: 'Продавец', developer: 'Застройщик', agent: 'Агент', landlord: 'Арендодатель', tenant: 'Арендатор' };
                                    return labels[t] || t;
                                }).join(', ')
                            })</span>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 300, fontSize: 13 }}>Контактное лицо</label>
                        <input
                            type="text"
                            className="form-input"
                            style={{ borderRadius: 14 }}
                            value={form.contact_name}
                            onChange={e => setF('contact_name', e.target.value)}
                            placeholder="ФИО собственника или агента"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 300, fontSize: 13 }}>Телефон</label>
                        <input
                            type="text"
                            className="form-input"
                            style={{ borderRadius: 14 }}
                            value={form.contact_phone}
                            onChange={e => setF('contact_phone', formatPhone(e.target.value, true))}
                            placeholder="+7 (999) 999-99-99"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 300, fontSize: 13 }}>Тип контакта для сохранения</label>
                        <div className="chip-group" style={{ gap: 8 }}>
                            {[
                                { id: 'seller', label: 'Продавец' },
                                { id: 'buyer', label: 'Покупатель' },
                                { id: 'developer', label: 'Застройщик' },
                                { id: 'agent', label: 'Агент' }
                            ].map(t => (
                                <button key={t.id} type="button"
                                    className={`chip ${form.contact_client_type === t.id ? 'active' : ''}`}
                                    onClick={() => setF('contact_client_type', t.id)}
                                    style={{ padding: '6px 12px', borderRadius: 10, fontSize: 12 }}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Параметры объекта */}
                <div className="card fade-in" style={{ 
                    padding: '24px', borderRadius: 24, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.8)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: 16
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Ruler size={20} color="var(--primary)" />
                        <div className="font-oswald" style={{ fontSize: 14, fontWeight: 300, textTransform: 'uppercase' }}>Параметры объекта</div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 300, fontSize: 13 }}>Тип недвижимости</label>
                        <select 
                            className="form-select" 
                            style={{ borderRadius: 14 }}
                            value={form.property_type || 'apartment'} 
                            onChange={e => setF('property_type', e.target.value)}
                        >
                            {Object.entries(PROPERTY_TYPES).map(([val, label]) => (
                                <option key={val} value={val}>{label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 300, fontSize: 13 }}>Количество комнат</label>
                        <div className="chip-group" style={{ gap: 8, marginTop: 4 }}>
                            {[
                                { val: 0, label: 'Студия' },
                                { val: 1, label: '1' },
                                { val: 2, label: '2' },
                                { val: 3, label: '3' },
                                { val: 4, label: '4' },
                                { val: 5, label: '5+' }
                            ].map(opt => (
                                <button key={opt.val} type="button"
                                    className={`chip ${form.rooms === opt.val ? 'active' : ''}`}
                                    onClick={() => setF('rooms', opt.val)}
                                    style={{ padding: '6px 12px', borderRadius: 10, fontSize: 12 }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Общая м²</label>
                            <input 
                                type="number" 
                                className="form-input" 
                                style={{ borderRadius: 12 }}
                                value={form.area_total || ''} 
                                onChange={e => setF('area_total', e.target.value ? Number(e.target.value) : '')} 
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Этаж</label>
                            <input 
                                type="number" 
                                className="form-input" 
                                style={{ borderRadius: 12 }}
                                value={form.floor || ''} 
                                onChange={e => setF('floor', e.target.value ? Number(e.target.value) : '')} 
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Всего этажей</label>
                            <input 
                                type="number" 
                                className="form-input" 
                                style={{ borderRadius: 12 }}
                                value={form.floors_total || ''} 
                                onChange={e => setF('floors_total', e.target.value ? Number(e.target.value) : '')} 
                            />
                        </div>
                    </div>

                </div>



                {/* Кнопка отправки */}
                <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ 
                        height: 52, borderRadius: 16, fontSize: 15, fontWeight: 300, letterSpacing: '0.05em',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: '0 8px 24px rgba(0, 82, 255, 0.25)', marginTop: 8
                    }}
                >
                    <Check size={18} strokeWidth={3} /> {id ? 'Сохранить изменения' : 'Добавить в подбор'}
                </button>
            </form>
        </div>
    );
}
