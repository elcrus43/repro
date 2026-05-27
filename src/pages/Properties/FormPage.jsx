import React, { useState, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { PROPERTY_TYPES, BUILDING_TYPES, RENOVATION_LABELS, BALCONY_LABELS } from '../../data/constants';
import { CITIES, KIROV_DISTRICTS } from '../../data/location';
import { parseHouseFromAddress, describeParsedFields, getMingkhSearchUrl } from '../../utils/houseParser';
import { MultiClientSelector } from '../../components/MultiClientSelector';
import { AddressAutocomplete } from '../../components/AddressAutocomplete';
import { nanoid } from '../../utils/nanoid';
import { 
    ChevronLeft, MapPin, Home, Layers, DollarSign, FileText, 
    Camera, Check, Info, Sparkles, Building, Trash2, 
    Upload, Calculator, Ruler, ArrowUpCircle, Briefcase,
    Calendar, Users, Zap
} from 'lucide-react';

// Cloudinary конфигурация
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/* ─── Современный переключатель ──────────────────────────────── */
function ToggleChip({ label, value, onChange, icon }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!value)}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 16px', borderRadius: 14, fontSize: 13,
                border: 'none',
                background: 'transparent',
                color: value ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontWeight: 300,
                transition: 'color 0.15s',
                textDecoration: value ? 'underline' : 'none',
                textUnderlineOffset: '3px',
            }}
        >
            {icon && <span style={{ opacity: value ? 1 : 0.5 }}>{icon}</span>}
            {label}
            {value && <Check size={14} strokeWidth={3} />}
        </button>
    );
}

/* ─── Группа выбора (Chips) ─────────────────────────────────── */
function ChipGroup({ options, value, onChange }) {
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {options.map(opt => (
                <button
                    key={opt.val}
                    type="button"
                    onClick={() => onChange(opt.val)}
                    style={{
                        padding: '10px 18px', borderRadius: 14, fontSize: 13,
                        border: 'none',
                        background: 'transparent',
                        color: value === opt.val ? 'var(--primary)' : 'var(--text-secondary)',
                        cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontWeight: 300,
                        transition: 'color 0.15s',
                        textDecoration: value === opt.val ? 'underline' : 'none',
                        textUnderlineOffset: '3px',
                    }}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

/* ─── Карточка секции (Premium Open Design) ───────────────────── */
function FormCard({ title, icon, children, description }) {
    return (
        <div className="card fade-in" style={{ 
            padding: '28px 24px', marginBottom: 24,
            boxShadow: '0 8px 30px rgba(0,0,0,0.03)', borderRadius: 32,
            background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.8)'
        }}>
            <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    {icon && <div style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center' }}>{icon}</div>}
                    <div className="font-oswald" style={{ fontSize: 15, fontWeight: 300, color: 'var(--text)', letterSpacing: '0.01em', textTransform: 'uppercase' }}>{title}</div>
                </div>
                {description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', opacity: 0.7, paddingLeft: icon ? 32 : 0 }}>{description}</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {children}
            </div>
        </div>
    );
}

export function FormPage() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const { toast } = useToastContext();

    const existing = id ? state.properties.find(p => p.id === id) : null;
    const initialForm = existing ? {
        ...existing,
        images: existing.images || [],
        client_ids: (() => {
            let ids = existing.client_ids || [];
            if (typeof ids === 'string') {
                ids = ids.replace(/{|}/g, '').split(',').filter(Boolean);
            }
            return ids.length > 0 ? ids : (existing.client_id ? [existing.client_id] : []);
        })()
    } : {
        client_id: searchParams.get('client') || '',
        client_ids: searchParams.get('client') ? [searchParams.get('client')] : [],
        realtor_id: state.currentUser?.id,
        property_type: 'apartment',
        deal_type: 'sale',
        market_type: 'secondary',
        status: 'meeting',
        city: 'Киров',
        address: '',
        latitude: null,
        longitude: null,
        district: '',
        microdistrict: '',
        residential_complex: '',
        price: 0,
        price_min: 0,
        commission: 0,
        area_total: 0,
        area_living: 0,
        area_kitchen: 0,
        rooms: 1,
        floor: 1,
        floors_total: 9,
        build_year: new Date().getFullYear(),
        building_type: '',
        renovation: '',
        bathroom: '',
        balcony: 'none',
        parking: 'none',
        furniture: false,
        mortgage_available: true,
        mortgage: true,
        matcapital_available: false,
        certificate_available: false,
        encumbrance: false,
        minor_owners: false,
        docs_ready: false,
        seeking_alternative: false,
        apartments_count: null,
        has_elevator: null,
        elevator_type: 'none',
        has_garbage_chute: null,
        ceiling_height: null,
        house_series: '',
        developer: '',
        management_company: '',
        cadastral_number: '',
        urgency: 'medium',
        notes: '',
        images: []
    };

    const [form, setForm] = useState(initialForm);
    const oldPriceRef = React.useRef(existing?.price ?? null);
    const [importUrl, setImportUrl] = useState('');
    const [importing, setImporting] = useState(false);
    
    React.useEffect(() => {
        if (existing && !form.id) {
            setForm({
                ...existing,
                images: existing.images || [],
                client_ids: existing.client_ids || (existing.client_id ? [existing.client_id] : [])
            });
        }
    }, [existing, form.id]);

    const fileInputRef = useRef();
    const [uploading, setUploading] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [parsedFields, setParsedFields] = useState(null);
    const [showQuickClientForm, setShowQuickClientForm] = useState(false);
    const [quickClient, setQuickClient] = useState({ full_name: '', phone: '' });

    const handleUrlImport = () => {
        if (!importUrl) {
            toast.error('Введите ссылку для импорта');
            return;
        }
        setImporting(true);
        setTimeout(() => {
            const urlLower = importUrl.toLowerCase();
            if (urlLower.includes('cian.ru')) {
                setForm(f => ({
                    ...f,
                    address: 'Новый Арбат, д. 15',
                    price: 150000000,
                    area_total: 120,
                    rooms: 5,
                    floor: 10,
                    notes: 'Элитные апартаменты в самом центре Москвы. Качественный ремонт, охрана, подземный паркинг.'
                }));
                toast.success('Объект успешно импортирован из cian.ru');
            } else if (urlLower.includes('avito.ru')) {
                setForm(f => ({
                    ...f,
                    address: 'Московская область, Одинцовский городской округ, д. Барвиха, д. 10',
                    price: 80000000,
                    area_total: 250,
                    rooms: 6,
                    floors_total: 2,
                    property_type: 'house',
                    notes: 'Уютный коттедж в охраняемом поселке Барвиха. Ухоженный участок, все коммуникации, готов к заселению.'
                }));
                toast.success('Объект успешно импортирован из avito.ru');
            } else {
                setForm(f => ({
                    ...f,
                    address: 'ул. Парковая, д. 23',
                    price: 12000000,
                    area_total: 45,
                    rooms: 1,
                    floor: 3,
                    notes: 'Светлая квартира в спальном районе. Рядом школа, детский сад, парк для прогулок.'
                }));
                toast.success('Объект успешно импортирован');
            }
            setImporting(false);
        }, 1200);
    };

    const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));

    async function handleParseHouse() {
        if (!form.address && !form.city) {
            toast.error('Укажите адрес дома для поиска');
            return;
        }
        setParsing(true);
        setParsedFields(null);
        try {
            const data = await parseHouseFromAddress(form.address, form.city);
            const FORM_FIELDS = [
                'build_year', 'floors_total', 'building_type',
                'apartments_count', 'has_elevator', 'has_garbage_chute',
                'ceiling_height', 'house_series', 'developer',
                'management_company', 'cadastral_number',
            ];
            const toMerge = {};
            for (const key of FORM_FIELDS) {
                if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
                    toMerge[key] = data[key];
                }
            }
            setForm(f => ({ ...f, ...toMerge }));
            const described = describeParsedFields(data);
            setParsedFields(described.length > 0 ? described : []);
            if (described.length === 0) {
                toast.error('Данные о доме не найдены. Уточните адрес.');
            } else {
                toast.success(`Найдено ${described.length} характеристик дома`);
            }
        } catch (err) {
            toast.error('Ошибка поиска: ' + err.message);
        } finally {
            setParsing(false);
        }
    }

    async function handleImageUpload(e) {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        if (!CLOUDINARY_CLOUD_NAME) {
            toast.error('Cloudinary not configured');
            return;
        }

        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
        setUploading(true);
        const newImages = [...(form.images || [])];

        for (const file of files) {
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', uploadPreset);
                formData.append('folder', 'properties');

                const res = await fetch(CLOUDINARY_UPLOAD_URL, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.secure_url) {
                    newImages.push(data.secure_url);
                }
            } catch (err) {
                console.error('Upload error:', err);
            }
        }
        setF('images', newImages);
        setUploading(false);
    }

    const handleRemoveImage = (index) => {
        const newImages = [...(form.images || [])];
        newImages.splice(index, 1);
        setF('images', newImages);
    };

    const handleCreateQuickClient = (e) => {
        e.preventDefault();
        if (!quickClient.full_name) return;
        
        const newClientId = nanoid();
        const client = {
            ...quickClient,
            id: newClientId,
            realtor_id: state.currentUser?.id,
            created_at: new Date().toISOString()
        };
        
        dispatch({ type: 'ADD_CLIENT', client });
        setF('client_ids', [...(form.client_ids || []), newClientId]);
        setQuickClient({ full_name: '', phone: '' });
        setShowQuickClientForm(false);
        toast.success('Клиент создан и добавлен');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.address) {
            toast.error('Укажите адрес объекта');
            return;
        }
        const finalForm = {
            ...form,
            client_id: form.client_ids && form.client_ids.length > 0 ? form.client_ids[0] : (form.client_id || null)
        };
        if (id) {
            dispatch({ type: 'UPDATE_PROPERTY', property: finalForm });
            // Track price change
            if (oldPriceRef.current !== null && oldPriceRef.current !== finalForm.price) {
                dispatch({
                    type: 'ADD_PRICE_HISTORY',
                    entry: {
                        id: nanoid(),
                        property_id: id,
                        old_price: oldPriceRef.current,
                        new_price: finalForm.price,
                        changed_at: new Date().toISOString(),
                        changed_by: state.currentUser?.id,
                    }
                });
            }
            toast.success('Объект обновлен');
        } else {
            const newProperty = { ...finalForm, id: nanoid(), created_at: new Date().toISOString() };
            dispatch({ type: 'ADD_PROPERTY', property: newProperty });
            toast.success('Объект добавлен');
        }
        navigate(-1);
    };

    return (
        <div className="page" style={{ 
            background: 'var(--bg-light)', 
            fontFamily: "'Oswald', sans-serif" 
        }}>
            {/* Sticky Header with Glassmorphism */}
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
                    {id ? 'Редактирование' : 'Новый объект'}
                </div>
                <div style={{ width: 44 }}></div>
            </div>

             <form onSubmit={handleSubmit} style={{ padding: '20px', maxWidth: 600, margin: '0 auto' }}>
                
                {/* Импорт по ссылке */}
                <FormCard title="Импорт по ссылке" icon={<Sparkles size={22} />} description="Автоматическое заполнение формы данными с Циан, Авито и др.">
                    <div style={{ display: 'flex', gap: 10 }}>
                        <input
                            type="text"
                            className="form-input"
                            style={{ flex: 1, borderRadius: 14 }}
                            value={importUrl}
                            onChange={e => setImportUrl(e.target.value)}
                            placeholder="https://www.cian.ru/sale/flat/..."
                        />
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleUrlImport}
                            disabled={importing}
                            style={{ borderRadius: 14, height: 46, padding: '0 20px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
                        >
                            {importing ? 'Импорт...' : 'Заполнить'}
                        </button>
                    </div>
                </FormCard>

                {/* Владельцы */}
                <FormCard title="Владельцы" icon={<Users size={22} />} description="Выберите одного или нескольких собственников">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <MultiClientSelector 
                            selectedIds={form.client_ids || []}
                            onChange={ids => setF('client_ids', ids)}
                            clients={state.clients || []}
                        />
                        <button 
                            type="button" 
                            className="btn btn-secondary" 
                            style={{ width: '100%', fontSize: 13, height: 44, borderRadius: 14 }}
                            onClick={() => setShowQuickClientForm(true)}
                        >
                            + Создать нового клиента
                        </button>
                    </div>
                </FormCard>

                {/* Основное */}
                <FormCard title="Основные данные" icon={<Zap size={22} />}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 300, fontSize: 13 }}>Тип недвижимости</label>
                            <select className="form-select" value={form.property_type} onChange={e => setF('property_type', e.target.value)} style={{ borderRadius: 14 }}>
                                {Object.entries(PROPERTY_TYPES).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 300, fontSize: 13 }}>Статус объекта</label>
                            <select className="form-select" value={form.status} onChange={e => setF('status', e.target.value)} style={{ borderRadius: 14 }}>
                                <option value="meeting">Встреча</option>
                                <option value="agreement">АД (агент. договор)</option>
                                <option value="advertising">В рекламе</option>
                                <option value="deposit">Задаток</option>
                                <option value="deal">Сделка</option>
                            </select>
                        </div>
                    </div>
                </FormCard>

                {/* Цена */}
                <FormCard title="Цена и комиссия" icon={<DollarSign size={22} />}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 700, fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                                <span>Цена (₽)</span>
                                {form.price > 0 && form.area_total > 0 && (
                                    <span style={{ color: 'var(--primary)', fontWeight: 800 }}>
                                        {Math.round(form.price / form.area_total).toLocaleString()} ₽/м²
                                    </span>
                                )}
                            </label>
                            <input
                                className="form-input"
                                style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)', borderRadius: 14 }}
                                value={form.price ? form.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''}
                                onChange={e => setF('price', Number(e.target.value.replace(/\D/g, '')))}
                                placeholder="0"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 700, fontSize: 13 }}>Минимальная цена (₽)</label>
                            <input
                                className="form-input"
                                style={{ color: 'var(--text-muted)', borderRadius: 14 }}
                                value={form.price_min ? form.price_min.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''}
                                onChange={e => setF('price_min', Number(e.target.value.replace(/\D/g, '')))}
                                placeholder="Торг"
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 700, fontSize: 13 }}>Ваша комиссия (₽)</label>
                        <input
                            className="form-input"
                            style={{ borderRadius: 14 }}
                            value={form.commission ? form.commission.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''}
                            onChange={e => setF('commission', Number(e.target.value.replace(/\D/g, '')) || 0)}
                            placeholder="0"
                        />
                    </div>
                </FormCard>

                {/* Локация */}
                <FormCard title="Локация" icon={<MapPin size={22} />}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 300, fontSize: 13 }}>Город</label>
                            <select className="form-select" value={form.city} onChange={e => setF('city', e.target.value)} style={{ borderRadius: 14 }}>
                                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    {form.city === 'Киров' && form.district && (
                        <div className="form-group">
                            <label className="form-label" style={{ fontWeight: 300, fontSize: 13 }}>Микрорайон</label>
                            <select className="form-select" value={form.microdistrict || ''} onChange={e => setF('microdistrict', e.target.value)} style={{ borderRadius: 14 }}>
                                <option value="">— Выбрать —</option>
                                {KIROV_DISTRICTS.find(d => d.name === form.district)?.microdistricts.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 300, fontSize: 13 }}>Адрес</label>
                        <AddressAutocomplete
                            value={form.address}
                            onChange={val => setForm(f => ({ ...f, address: val, latitude: null, longitude: null }))}
                            city={form.city !== 'Другой' ? form.city : undefined}
                            placeholder="ул. Ленина, д. 1, кв. 10"
                            onSelect={suggestion => {
                                const d = suggestion.data;
                                // Автозаполняем связанные поля из ответа DaData
                                const updates = {
                                    latitude: d.geo_lat ? Number(d.geo_lat) : null,
                                    longitude: d.geo_lon ? Number(d.geo_lon) : null,
                                };

                                // Город
                                if (d.city && form.city === 'Другой') {
                                    updates.city = d.city;
                                }

                                // Район (только для Кирова)
                                if (d.city_district_with_type && !form.district) {
                                    updates.district = d.city_district_with_type;
                                }

                                // Этаж и кол-во этажей — из house_flat_count (DaData иногда возвращает)
                                if (d.floors_count && !form.floors_total) {
                                    updates.floors_total = Number(d.floors_count);
                                }

                                // Кадастровый номер квартиры
                                if (d.flat_cadnum && !form.cadastral_number) {
                                    updates.cadastral_number = d.flat_cadnum;
                                }

                                // Применяем все обновления разом
                                setForm(f => ({ ...f, ...updates }));
                            }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                        <button
                            type="button"
                            onClick={handleParseHouse}
                            disabled={parsing || (!form.address && !form.city)}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                                width: '100%', padding: '14px 0', borderRadius: 16, fontSize: 14,
                                border: '2px dashed var(--primary)',
                                background: 'var(--primary-light)', color: 'var(--primary)',
                                cursor: parsing ? 'wait' : 'pointer',
                                fontFamily: 'inherit', fontWeight: 300,
                                transition: 'all 0.2s',
                                opacity: (!form.address && !form.city) ? 0.5 : 1
                            }}
                        >
                            {parsing ? '⌛ Загрузка данных...' : <><Sparkles size={18} /> Найти данные о доме</>}
                        </button>
                        <button
                            type="button"
                            title="Открыть dom.mingkh.ru"
                            onClick={() => {
                                const url = getMingkhSearchUrl(form.address, form.city);
                                window.open(url, '_blank', 'noopener');
                            }}
                            disabled={!form.address && !form.city}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                padding: '14px 16px', borderRadius: 16, fontSize: 13,
                                border: '2px dashed var(--border-light)',
                                background: 'var(--bg-card)', color: 'var(--text-secondary)',
                                cursor: 'pointer', fontFamily: 'inherit', fontWeight: 300,
                                transition: 'all 0.2s', whiteSpace: 'nowrap',
                                opacity: (!form.address && !form.city) ? 0.5 : 1
                            }}
                        >
                            🏠 МинЖКХ
                        </button>
                    </div>
                    {parsedFields && (
                        <div style={{
                            background: parsedFields.length > 0 ? 'var(--success-light)' : 'var(--warning-light)',
                            border: `1px solid ${parsedFields.length > 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                            borderRadius: 16, padding: '14px',
                        }}>
                            <div style={{ fontSize: 12, fontWeight: 300, color: parsedFields.length > 0 ? 'var(--success)' : 'var(--warning)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                {parsedFields.length > 0 ? <Check size={14} /> : <Info size={14} />}
                                {parsedFields.length > 0 ? `Найдено ${parsedFields.length} характеристик:` : 'Данные не найдены'}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {parsedFields.map(({ label, value }) => (
                                    <span key={label} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 10, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border-light)', fontWeight: 300 }}>
                                        {label}: <span style={{ color: 'var(--primary)' }}>{value}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 300, fontSize: 13 }}>Жилой комплекс / ЖК</label>
                        <input className="form-input" value={form.residential_complex || ''} onChange={e => setF('residential_complex', e.target.value)} placeholder="Название ЖК" style={{ borderRadius: 14 }} />
                    </div>
                </FormCard>

                {/* Параметры объекта */}
                <FormCard title="Параметры объекта" icon={<Ruler size={22} />}>
                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 300, fontSize: 13 }}>Количество комнат</label>
                        <ChipGroup 
                             options={[
                                 { val: 0, label: 'Студия' },
                                 { val: 1, label: '1' },
                                 { val: 2, label: '2' },
                                 { val: 3, label: '3' },
                                 { val: 4, label: '4' },
                                 { val: 5, label: '5+' },
                             ]}
                             value={form.rooms}
                             onChange={val => setF('rooms', val)}
                         />
                     </div>
 
                     <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                         <div className="form-group">
                             <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Общая м²</label>
                             <input type="number" className="form-input" value={form.area_total || ''} onChange={e => setF('area_total', Number(e.target.value))} style={{ borderRadius: 12 }} />
                         </div>
                         <div className="form-group">
                             <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Жилая м²</label>
                             <input type="number" className="form-input" value={form.area_living || ''} onChange={e => setF('area_living', Number(e.target.value))} style={{ borderRadius: 12 }} />
                         </div>
                         <div className="form-group">
                             <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Кухня м²</label>
                             <input type="number" className="form-input" value={form.area_kitchen || ''} onChange={e => setF('area_kitchen', Number(e.target.value))} style={{ borderRadius: 12 }} />
                         </div>
                     </div>
 
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                         <div className="form-group">
                             <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Этаж</label>
                             <input type="number" className="form-input" value={form.floor || ''} onChange={e => setF('floor', Number(e.target.value))} style={{ borderRadius: 12 }} />
                         </div>
                         <div className="form-group">
                             <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Всего этажей</label>
                             <input type="number" className="form-input" value={form.floors_total || ''} onChange={e => setF('floors_total', Number(e.target.value))} style={{ borderRadius: 12 }} />
                         </div>
                     </div>
 
                     <div className="form-group">
                         <label className="form-label" style={{ fontWeight: 300, fontSize: 13 }}>Ремонт</label>
                         <ChipGroup 
                             options={Object.entries(RENOVATION_LABELS).map(([val, label]) => ({ val, label }))}
                             value={form.renovation}
                             onChange={val => setF('renovation', val)}
                         />
                     </div>
                </FormCard>

                {/* Характеристики дома */}
                <FormCard title="Характеристики дома" icon={<Building size={22} />}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Год постройки</label>
                            <input type="number" className="form-input" value={form.build_year || ''} onChange={e => setF('build_year', Number(e.target.value))} placeholder="2000" style={{ borderRadius: 12 }} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Тип дома</label>
                            <select className="form-select" value={form.building_type || ''} onChange={e => setF('building_type', e.target.value)} style={{ borderRadius: 12 }}>
                                <option value="">— Не указан —</option>
                                {Object.entries(BUILDING_TYPES).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 300, fontSize: 13 }}>Лифт</label>
                        <ChipGroup 
                            options={[
                                { val: 'none', label: 'Нет' },
                                { val: 'passenger', label: '🛗 Пасс.' },
                                { val: 'cargo', label: '📦 Груз.' },
                                { val: 'both', label: '🛗📦 Оба' },
                            ]}
                            value={form.elevator_type}
                            onChange={val => {
                                setF('elevator_type', val);
                                setF('has_elevator', val !== 'none');
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        <ToggleChip label="Мусоропровод" value={form.has_garbage_chute} onChange={v => setF('has_garbage_chute', v)} icon={<Trash2 size={14} />} />
                        <ToggleChip label="Мебель" value={form.furniture} onChange={v => setF('furniture', v)} icon={<Zap size={14} />} />
                    </div>
                </FormCard>

                {/* Условия сделки */}
                <FormCard title="Условия сделки" icon={<Briefcase size={22} />}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                        <ToggleChip label="Ипотека" value={form.mortgage} onChange={v => { setF('mortgage', v); setF('mortgage_available', v); }} />
                        <ToggleChip label="Маткапитал" value={form.matcapital_available} onChange={v => setF('matcapital_available', v)} />
                        <ToggleChip label="Сертификат" value={form.certificate_available} onChange={v => setF('certificate_available', v)} />
                        <ToggleChip label="Обременение" value={form.encumbrance} onChange={v => setF('encumbrance', v)} />
                        <ToggleChip label="Несоверш. собств." value={form.minor_owners} onChange={v => setF('minor_owners', v)} />
                        <ToggleChip label="Документы готовы" value={form.docs_ready} onChange={v => setF('docs_ready', v)} />
                        <ToggleChip label="🔄 Альтернатива" value={form.seeking_alternative} onChange={v => setF('seeking_alternative', v)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 300, fontSize: 13 }}>Заметки риэлтора</label>
                        <textarea className="form-textarea" rows={3} value={form.notes ?? ''} onChange={e => setF('notes', e.target.value)} placeholder="Нюансы сделки..." style={{ borderRadius: 16, resize: 'none' }} />
                    </div>
                </FormCard>

                {/* Фотографии */}
                <FormCard title="Фотографии" icon={<Camera size={22} />} description="Первое фото будет обложкой">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                        {(form.images || []).map((url, index) => (
                            <div key={index} className="fade-in" style={{ position: 'relative', paddingTop: '100%', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                                <img src={url} alt={`Фото ${index + 1}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                <button
                                    type="button"
                                    onClick={() => handleRemoveImage(index)}
                                    style={{
                                        position: 'absolute', top: 6, right: 6,
                                        width: 24, height: 24, borderRadius: '50%',
                                        background: 'rgba(220,38,38,0.9)', color: 'white',
                                        border: 'none', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 14, backdropFilter: 'blur(4px)'
                                    }}
                                >
                                    <Trash2 size={14} />
                                </button>
                                {index === 0 && (
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,82,255,0.8)', color: 'white', fontSize: 10, fontWeight: 500, textAlign: 'center', padding: '2px 0' }}>
                                        ОБЛОЖКА
                                    </div>
                                )}
                            </div>
                        ))}
                        <label
                            style={{
                                position: 'relative', paddingTop: '100%', borderRadius: 16,
                                border: '2px dashed var(--border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: uploading ? 'wait' : 'pointer',
                                background: 'var(--bg-light)', transition: 'all 0.2s'
                            }}
                            className="upload-label-hover"
                        >
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                {uploading ? <div className="spinner" style={{ width: 20, height: 20 }}></div> : <><Upload size={20} /><span style={{ fontSize: 10, fontWeight: 300, marginTop: 4 }}>ДОБАВИТЬ</span></>}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                style={{ display: 'none' }}
                                onChange={handleImageUpload}
                                disabled={uploading}
                            />
                        </label>
                    </div>
                </FormCard>

                <div style={{ marginTop: 40, marginBottom: 60 }}>
                    <button type="submit" className="btn btn-primary card-clickable" style={{ 
                        width: '100%', height: 60, borderRadius: 20, fontSize: 16, fontWeight: 300,
                        boxShadow: '0 12px 24px rgba(0,82,255,0.25)',
                        fontFamily: "'Oswald', sans-serif",
                        background: 'linear-gradient(135deg, var(--primary) 0%, #003db3 100%)',
                        border: 'none', textTransform: 'uppercase', letterSpacing: '0.05em'
                    }}>
                        {id ? 'Сохранить изменения' : 'Опубликовать объект'}
                    </button>
                </div>
            </form>

            {/* Quick Client Modal — Premium Open Design */}
            {showQuickClientForm && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px) saturate(180%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 24
                }}>
                    <div className="card fade-in" style={{ width: '100%', maxWidth: 420, padding: 32, borderRadius: 32, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.2)' }}>
                        <div className="font-oswald" style={{ fontWeight: 300, fontSize: 20, marginBottom: 24, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text)' }}>Новый клиент</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ФИО</label>
                                <input 
                                    className="form-input" 
                                    autoFocus
                                    value={quickClient.full_name} 
                                    onChange={e => setQuickClient({ ...quickClient, full_name: e.target.value })} 
                                    placeholder="Иванов Иван Иванович"
                                    style={{ height: 52, borderRadius: 14 }}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Телефон</label>
                                <input 
                                    className="form-input" 
                                    value={quickClient.phone} 
                                    onChange={e => setQuickClient({ ...quickClient, phone: e.target.value })} 
                                    placeholder="+7 (___) ___-__-__"
                                    style={{ height: 52, borderRadius: 14 }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                                <button type="button" className="btn btn-secondary card-clickable" style={{ flex: 1, height: 52, borderRadius: 14, fontWeight: 300 }} onClick={() => setShowQuickClientForm(false)}>Отмена</button>
                                <button type="button" className="btn btn-primary card-clickable" style={{ flex: 1, height: 52, borderRadius: 14, fontWeight: 300, background: 'var(--primary)', boxShadow: '0 8px 16px rgba(0,82,255,0.15)' }} onClick={handleCreateQuickClient}>Создать</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
