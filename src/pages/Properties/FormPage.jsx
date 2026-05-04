import React, { useState, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { PROPERTY_TYPES, BUILDING_TYPES, RENOVATION_LABELS, BALCONY_LABELS } from '../../data/constants';
import { CITIES, KIROV_DISTRICTS } from '../../data/location';
import { parseHouseFromAddress, describeParsedFields } from '../../utils/houseParser';

// Cloudinary конфигурация
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/* ─── Маленький переключатель чекбокс-стиль ──────────────────────────────── */
function ToggleChip({ label, value, onChange }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!value)}
            style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 20, fontSize: 13,
                border: `1.5px solid ${value ? 'var(--primary)' : 'var(--border)'}`,
                background: value ? 'var(--primary-light)' : 'transparent',
                color: value ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer', fontFamily: 'inherit', fontWeight: value ? 600 : 400,
                transition: 'all 0.15s',
            }}
        >
            {value ? '✓' : '○'} {label}
        </button>
    );
}

/* ─── Группа заголовка секции ─────────────────────────────────────────────── */
function SectionTitle({ children }) {
    return (
        <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--text-muted)',
            borderBottom: '1px solid var(--border-light)',
            paddingBottom: 6, marginTop: 4,
        }}>
            {children}
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
        images: existing.images || []
    } : {
        client_id: searchParams.get('client') || '',
        realtor_id: state.currentUser?.id,
        // Основное
        property_type: 'apartment',
        deal_type: 'sale',
        market_type: 'secondary',
        status: 'active',
        // Локация
        city: 'Киров',
        address: '',
        district: '',
        microdistrict: '',
        residential_complex: '',
        // Цены
        price: 0,
        price_min: 0,
        commission: 0,
        // Площади
        area_total: 0,
        area_living: 0,
        area_kitchen: 0,
        // Параметры
        rooms: 1,
        floor: 1,
        floors_total: 9,
        build_year: new Date().getFullYear(),
        building_type: '',
        renovation: '',
        bathroom: '',
        balcony: 'none',
        parking: 'none',
        // Удобства
        furniture: false,
        // Условия сделки
        mortgage_available: true,
        matcapital_available: false,
        certificate_available: false,
        encumbrance: false,
        minor_owners: false,
        docs_ready: false,
        // Доп. данные о доме (из парсера)
        apartments_count: null,
        has_elevator: null,
        has_garbage_chute: null,
        ceiling_height: null,
        house_series: '',
        developer: '',
        management_company: '',
        cadastral_number: '',
        // Прочее
        urgency: 'medium',
        notes: '',
        images: []
    };

    const [form, setForm] = useState(initialForm);
    const fileInputRef = useRef();
    const [uploading, setUploading] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [parsedFields, setParsedFields] = useState(null); // array of {label, value}

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
            // Merge found fields into form (only non-empty values)
            const toMerge = {};
            const FORM_FIELDS = [
                'build_year', 'floors_total', 'building_type',
                'apartments_count', 'has_elevator', 'has_garbage_chute',
                'ceiling_height', 'house_series', 'developer',
                'management_company', 'cadastral_number',
            ];
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
            toast.error('Не настроен Cloudinary. Добавьте VITE_CLOUDINARY_CLOUD_NAME и VITE_CLOUDINARY_UPLOAD_PRESET в .env');
            return;
        }

        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
        if (!uploadPreset) {
            toast.error('Не настроен Upload Preset. Добавьте VITE_CLOUDINARY_UPLOAD_PRESET в .env');
            return;
        }

        setUploading(true);
        const newImages = [...(form.images || [])];

        for (const file of files) {
            try {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('upload_preset', uploadPreset);
                formData.append('folder', 'properties');

                const response = await fetch(CLOUDINARY_UPLOAD_URL, {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

                const result = await response.json();
                if (result.secure_url) {
                    newImages.push(result.secure_url);
                } else {
                    throw new Error(result.error?.message || 'Ошибка загрузки на Cloudinary');
                }
            } catch (err) {
                console.error('[Image upload error]', err);
                toast.error('Ошибка загрузки: ' + err.message);
            }
        }

        setF('images', newImages);
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    function handleRemoveImage(index) {
        const newImages = (form.images || []).filter((_, i) => i !== index);
        setF('images', newImages);
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (!form.client_id) {
            toast.error('Выберите клиента');
            return;
        }

        if (id) {
            dispatch({ type: 'UPDATE_PROPERTY', property: { ...form, id } });
            navigate(`/properties/${id}`);
        } else {
            const realtorId = state.currentUser?.id || form.realtor_id;
            if (!realtorId) {
                toast.error('Ошибка: не удалось определить пользователя');
                return;
            }
            dispatch({ type: 'ADD_PROPERTY', property: { ...form, realtor_id: realtorId } });
            navigate('/properties');
        }
    }

    return (
        <div className="page fade-in">
            <div className="topbar">
                <button className="topbar-back" onClick={() => navigate(-1)}>←</button>
                <span className="topbar-title">{id ? 'Редактировать объект' : 'Новый объект'}</span>
            </div>

            <form className="page-content" onSubmit={handleSubmit}>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                    {/* ── ОСНОВНОЕ ─────────────────────────────────── */}
                    <SectionTitle>Основное</SectionTitle>

                    {/* Клиент */}
                    <div className="form-group">
                        <label className="form-label">Собственник <span className="required">*</span></label>
                        <select className="form-select" value={form.client_id} onChange={e => setF('client_id', e.target.value)} disabled={!!id} required>
                            <option value="">Выберите клиента</option>
                            {state.clients.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>)}
                        </select>
                    </div>

                    {/* Тип сделки + Рынок */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Тип сделки</label>
                            <div className="chip-group" style={{ marginTop: 8 }}>
                                <button type="button" className={`chip ${form.deal_type === 'sale' ? 'active' : ''}`} onClick={() => setF('deal_type', 'sale')}>Продажа</button>
                                <button type="button" className={`chip ${form.deal_type === 'rent' ? 'active' : ''}`} onClick={() => setF('deal_type', 'rent')}>Аренда</button>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Рынок</label>
                            <div className="chip-group" style={{ marginTop: 8 }}>
                                <button type="button" className={`chip ${form.market_type === 'secondary' ? 'active' : ''}`} onClick={() => setF('market_type', 'secondary')}>Вторичка</button>
                                <button type="button" className={`chip ${form.market_type === 'new_building' ? 'active' : ''}`} onClick={() => setF('market_type', 'new_building')}>Новостройка</button>
                            </div>
                        </div>
                    </div>

                    {/* Тип недвижимости */}
                    <div className="form-group">
                        <label className="form-label">Тип недвижимости</label>
                        <select className="form-select" value={form.property_type} onChange={e => setF('property_type', e.target.value)} style={{ marginTop: 8 }}>
                            {Object.entries(PROPERTY_TYPES).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                        </select>
                    </div>

                    {/* Статус */}
                    <div className="form-group">
                        <label className="form-label">Статус объекта</label>
                        <select className="form-select" value={form.status} onChange={e => setF('status', e.target.value)}>
                            <option value="active">В продаже</option>
                            <option value="advertising">В рекламе</option>
                            <option value="paused">Пауза / Думает</option>
                            <option value="reserved">Резерв</option>
                            <option value="sold">Продано</option>
                            <option value="withdrawn">Снято с продажи</option>
                        </select>
                    </div>

                    {/* ── ЦЕНА ────────────────────────────────────── */}
                    <SectionTitle>Цена</SectionTitle>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Цена (₽)</label>
                            <input
                                className="form-input"
                                style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}
                                value={form.price ? form.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''}
                                onChange={e => setF('price', Number(e.target.value.replace(/\D/g, '')))}
                                placeholder="0"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Минимальная цена (₽)</label>
                            <input
                                className="form-input"
                                style={{ color: 'var(--text-muted)' }}
                                value={form.price_min ? form.price_min.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''}
                                onChange={e => setF('price_min', Number(e.target.value.replace(/\D/g, '')))}
                                placeholder="Торг"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Ваша комиссия (₽)</label>
                        <input
                            className="form-input"
                            value={form.commission ? form.commission.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''}
                            onChange={e => setF('commission', Number(e.target.value.replace(/\D/g, '')) || 0)}
                            placeholder="0"
                        />
                    </div>

                    {/* ── ЛОКАЦИЯ ─────────────────────────────────── */}
                    <SectionTitle>Локация</SectionTitle>

                    <div className="form-group">
                        <label className="form-label">Город</label>
                        <select className="form-select" value={form.city} onChange={e => setF('city', e.target.value)}>
                            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    {form.city === 'Киров' && (
                        <div className="form-group">
                            <label className="form-label">Район</label>
                            <select className="form-select" value={form.district || ''} onChange={e => setF('district', e.target.value)}>
                                <option value="">— Выбрать район —</option>
                                {KIROV_DISTRICTS.map(d => (
                                    <option key={d.name} value={d.name}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {form.city === 'Киров' && form.district && (
                        <div className="form-group">
                            <label className="form-label">Микрорайон</label>
                            <select className="form-select" value={form.microdistrict || ''} onChange={e => setF('microdistrict', e.target.value)}>
                                <option value="">— Выбрать микрорайон —</option>
                                {KIROV_DISTRICTS
                                    .find(d => d.name === form.district)
                                    ?.microdistricts.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                            </select>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Адрес</label>
                        <textarea className="form-textarea" rows={2} value={form.address} onChange={e => setF('address', e.target.value)} placeholder="ул. Ленина, д. 1, кв. 10" />
                    </div>

                    {/* Парсер данных о доме */}
                    <button
                        type="button"
                        id="parse-house-btn"
                        onClick={handleParseHouse}
                        disabled={parsing || (!form.address && !form.city)}
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            width: '100%', padding: '9px 0', borderRadius: 10, fontSize: 13,
                            border: '1.5px dashed var(--primary)',
                            background: 'var(--primary-light)', color: 'var(--primary)',
                            cursor: parsing ? 'wait' : 'pointer',
                            fontFamily: 'inherit', fontWeight: 600,
                            opacity: (!form.address && !form.city) ? 0.5 : 1,
                            transition: 'opacity 0.15s',
                        }}
                    >
                        {parsing ? '⏳ Поиск данных о доме...' : '🔍 Найти данные о доме'}
                    </button>

                    {/* Результат парсинга */}
                    {parsedFields !== null && (
                        <div style={{
                            background: parsedFields.length > 0 ? 'var(--success-bg, #f0fdf4)' : 'var(--warning-bg, #fffbeb)',
                            border: `1px solid ${parsedFields.length > 0 ? 'var(--success-border, #bbf7d0)' : 'var(--warning-border, #fde68a)'}`,
                            borderRadius: 10, padding: '10px 12px',
                        }}>
                            {parsedFields.length > 0 ? (
                                <>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--success, #16a34a)', marginBottom: 6 }}>
                                        ✔ Найдено и заполнено {parsedFields.length} характеристик:
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                        {parsedFields.map(({ label, value }) => (
                                            <span key={label} style={{
                                                fontSize: 11, padding: '2px 8px', borderRadius: 12,
                                                background: 'var(--success-bg, #dcfce7)',
                                                color: 'var(--success, #15803d)',
                                                border: '1px solid var(--success-border, #86efac)',
                                            }}>
                                                {label}: <strong>{value}</strong>
                                            </span>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div style={{ fontSize: 12, color: 'var(--warning, #b45309)' }}>
                                    ⚠️ Данные о доме не найдены. Уточните адрес или введите данные вручную.
                                </div>
                            )}
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Жилой комплекс / ЖК</label>
                        <input className="form-input" value={form.residential_complex || ''} onChange={e => setF('residential_complex', e.target.value)} placeholder="Название ЖК (если применимо)" />
                    </div>

                    {/* ── ПАРАМЕТРЫ ────────────────────────────────── */}
                    <SectionTitle>Параметры</SectionTitle>

                    {/* Комнаты */}
                    <div className="form-group">
                        <label className="form-label">Комнат</label>
                        <div className="chip-group">
                            {[0, 1, 2, 3, 4, 5].map(r => (
                                <button key={r} type="button" className={`chip ${form.rooms === r ? 'active' : ''}`} onClick={() => setF('rooms', r)}>
                                    {r === 0 ? 'Студия' : r}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Площади */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Общая м²</label>
                            <input type="number" className="form-input" value={form.area_total || ''} onChange={e => setF('area_total', Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Жилая м²</label>
                            <input type="number" className="form-input" value={form.area_living || ''} onChange={e => setF('area_living', Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Кухня м²</label>
                            <input type="number" className="form-input" value={form.area_kitchen || ''} onChange={e => setF('area_kitchen', Number(e.target.value))} />
                        </div>
                    </div>

                    {/* Этаж */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Этаж</label>
                            <input type="number" className="form-input" value={form.floor || ''} onChange={e => setF('floor', Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Всего этажей</label>
                            <input type="number" className="form-input" value={form.floors_total || ''} onChange={e => setF('floors_total', Number(e.target.value))} />
                        </div>
                    </div>

                    {/* Год постройки + Тип дома */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Год постройки</label>
                            <input type="number" className="form-input" value={form.build_year || ''} onChange={e => setF('build_year', Number(e.target.value))} placeholder={new Date().getFullYear().toString()} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Тип дома</label>
                            <select className="form-select" value={form.building_type || ''} onChange={e => setF('building_type', e.target.value)}>
                                <option value="">— Не указан —</option>
                                {Object.entries(BUILDING_TYPES).map(([val, label]) => (
                                    <option key={val} value={val}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Лифт, Мусоропровод, высота потолков, кв-в */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Хв. потолков (м)</label>
                            <input type="number" step="0.1" className="form-input" value={form.ceiling_height || ''} onChange={e => setF('ceiling_height', parseFloat(e.target.value) || null)} placeholder="2.7" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Кол-во квартир в доме</label>
                            <input type="number" className="form-input" value={form.apartments_count || ''} onChange={e => setF('apartments_count', parseInt(e.target.value) || null)} placeholder="80" />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <ToggleChip
                            label="🛠 Лифт"
                            value={form.has_elevator === true}
                            onChange={v => setF('has_elevator', v ? true : false)}
                        />
                        <ToggleChip
                            label="🗑 Мусоропровод"
                            value={form.has_garbage_chute === true}
                            onChange={v => setF('has_garbage_chute', v ? true : false)}
                        />
                    </div>

                    {/* Серия / Проект */}
                    <div className="form-group">
                        <label className="form-label">Серия / проект дома</label>
                        <input className="form-input" value={form.house_series || ''} onChange={e => setF('house_series', e.target.value)} placeholder="напр., П-44, I-335, Индивидуальный" />
                    </div>

                    {/* Застройщик + УК */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Застройщик</label>
                            <input className="form-input" value={form.developer || ''} onChange={e => setF('developer', e.target.value)} placeholder="Название" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Управляющая компания</label>
                            <input className="form-input" value={form.management_company || ''} onChange={e => setF('management_company', e.target.value)} placeholder="Название УК" />
                        </div>
                    </div>

                    {/* Кадастровый номер */}
                    <div className="form-group">
                        <label className="form-label">Кадастровый номер</label>
                        <input className="form-input" value={form.cadastral_number || ''} onChange={e => setF('cadastral_number', e.target.value)} placeholder="43:40:000123:456" />
                    </div>

                    {/* Ремонт */}
                    <div className="form-group">
                        <label className="form-label">Ремонт</label>
                        <div className="chip-group" style={{ marginTop: 8 }}>
                            {Object.entries(RENOVATION_LABELS).map(([val, label]) => (
                                <button key={val} type="button" className={`chip ${form.renovation === val ? 'active' : ''}`} onClick={() => setF('renovation', val)}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Балкон */}
                    <div className="form-group">
                        <label className="form-label">Балкон / лоджия</label>
                        <div className="chip-group" style={{ marginTop: 8 }}>
                            {Object.entries(BALCONY_LABELS).map(([val, label]) => (
                                <button key={val} type="button" className={`chip ${form.balcony === val ? 'active' : ''}`} onClick={() => setF('balcony', val)}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Парковка */}
                    <div className="form-group">
                        <label className="form-label">Парковка</label>
                        <div className="chip-group" style={{ marginTop: 8 }}>
                            {[
                                { val: 'none', label: 'Нет' },
                                { val: 'open', label: 'Открытая' },
                                { val: 'garage', label: 'Гараж' },
                                { val: 'underground', label: 'Подземная' },
                            ].map(({ val, label }) => (
                                <button key={val} type="button" className={`chip ${form.parking === val ? 'active' : ''}`} onClick={() => setF('parking', val)}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Санузел */}
                    <div className="form-group">
                        <label className="form-label">Санузел</label>
                        <div className="chip-group" style={{ marginTop: 8 }}>
                            {[
                                { val: 'combined', label: 'Совмещённый' },
                                { val: 'separate', label: 'Раздельный' },
                                { val: 'two', label: 'Два и более' },
                            ].map(({ val, label }) => (
                                <button key={val} type="button" className={`chip ${form.bathroom === val ? 'active' : ''}`} onClick={() => setF('bathroom', val)}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Мебель */}
                    <div className="form-group">
                        <label className="form-label">Мебель</label>
                        <div className="chip-group" style={{ marginTop: 8 }}>
                            <button type="button" className={`chip ${form.furniture === true ? 'active' : ''}`} onClick={() => setF('furniture', true)}>Есть</button>
                            <button type="button" className={`chip ${form.furniture === false ? 'active' : ''}`} onClick={() => setF('furniture', false)}>Нет</button>
                        </div>
                    </div>

                    {/* ── УСЛОВИЯ СДЕЛКИ ─────────────────────────── */}
                    <SectionTitle>Условия сделки</SectionTitle>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <ToggleChip label="Ипотека" value={form.mortgage_available} onChange={v => setF('mortgage_available', v)} />
                        <ToggleChip label="Маткапитал" value={form.matcapital_available} onChange={v => setF('matcapital_available', v)} />
                        <ToggleChip label="Сертификат" value={form.certificate_available} onChange={v => setF('certificate_available', v)} />
                        <ToggleChip label="Обременение" value={form.encumbrance} onChange={v => setF('encumbrance', v)} />
                        <ToggleChip label="Несоверш. собственники" value={form.minor_owners} onChange={v => setF('minor_owners', v)} />
                        <ToggleChip label="Документы готовы" value={form.docs_ready} onChange={v => setF('docs_ready', v)} />
                    </div>

                    {/* ── ОПИСАНИЕ ──────────────────────────────── */}
                    <SectionTitle>Описание</SectionTitle>

                    <div className="form-group">
                        <label className="form-label">Заметки риэлтора</label>
                        <textarea className="form-textarea" rows={4} value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Особенности, нюансы сделки, пожелания собственника..." />
                    </div>

                    {/* ── ФОТОГРАФИИ ──────────────────────────────── */}
                    <SectionTitle>Фотографии</SectionTitle>

                    <div className="form-group">
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                            {(form.images || []).map((url, index) => (
                                <div key={index} style={{ position: 'relative', width: 80, height: 80 }}>
                                    <img src={url} alt={`Фото ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveImage(index)}
                                        style={{
                                            position: 'absolute', top: -6, right: -6,
                                            width: 22, height: 22, borderRadius: '50%',
                                            background: 'var(--danger)', color: 'white',
                                            border: '2px solid var(--bg)', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 12, fontWeight: 'bold', lineHeight: 1
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                            <label
                                style={{
                                    width: 80, height: 80, borderRadius: 8,
                                    border: '2px dashed var(--border)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: uploading ? 'wait' : 'pointer',
                                    background: 'var(--bg)', fontSize: 28, color: 'var(--text-muted)'
                                }}
                            >
                                {uploading ? '…' : '+'}
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
                        {(form.images || []).length > 0 && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                {form.images.length} фото • Нажмите × для удаления
                            </div>
                        )}
                    </div>
                </div>

                <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 12 }}>
                    {id ? 'Сохранить изменения' : 'Разместить объект'}
                </button>
            </form>
        </div>
    );
}
