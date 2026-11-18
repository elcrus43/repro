import React, { useState, useRef, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { 
    PROPERTY_TYPES, BUILDING_TYPES, RENOVATION_LABELS, BALCONY_LABELS,
    HOUSE_MATERIALS, HOUSE_CONDITIONS, LAND_CATEGORIES, ROAD_ACCESS,
    FENCE_TYPES, WATER_TYPES, GAS_TYPES, SEWAGE_TYPES,
    COMMERCIAL_TYPES, ENTRANCE_TYPES, COMMERCIAL_LAYOUTS, LOCATION_LINES, VENTILATION_TYPES
} from '../../data/constants';
import { CITIES, KIROV_DISTRICTS, getAllMicrodistricts, saveCustomMicrodistrict } from '../../data/location';
import { parseHouseFromAddress, describeParsedFields, getMingkhSearchUrl } from '../../utils/houseParser';
import { MultiClientSelector } from '../../components/MultiClientSelector';
import { AddressAutocomplete } from '../../components/AddressAutocomplete';
import { nanoid } from '../../utils/nanoid';
import { decodeImportData } from '../../utils/importDecoder';
import { findDuplicateClients } from '../../utils/clientDuplicate';
import { formatPhone, stripPhone } from '../../utils/format';
import { ExtensionInstallModal } from '../../components/ExtensionInstallModal';
import { PriceInput } from '../../components/PriceInput';
import { 
    ChevronLeft, MapPin, Home, Layers, DollarSign, FileText, 
    Camera, Check, Info, Sparkles, Building, Trash2, 
    Upload, Calculator, Ruler, ArrowUpCircle, Briefcase,
    Calendar, Users, Zap, User, AlertTriangle, Package,
    UserPlus, PieChart
} from 'lucide-react';

// Cloudinary конфигурация
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

function compressImage(file, maxW = 1200, maxH = 1200) {
    return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
            resolve(file);
            return;
        }
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(img.src);
            let w = img.width;
            let h = img.height;
            if (w > maxW || h > maxH) {
                if (w > h) {
                    h = Math.round((h * maxW) / w);
                    w = maxW;
                } else {
                    w = Math.round((w * maxH) / h);
                    h = maxH;
                }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob((blob) => {
                if (!blob) {
                    resolve(file);
                    return;
                }
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                });
                resolve(compressedFile);
            }, 'image/jpeg', 0.85);
        };
        img.onerror = () => {
            resolve(file);
        };
    });
}

/* --- Современный переключатель-пилюля --- */
function ToggleChip({ label, value, onChange, icon }) {
    return (
        <button
            type="button"
            onClick={() => onChange(!value)}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 10,
                fontSize: 12.5,
                fontWeight: value ? 600 : 400,
                border: value ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: value ? 'var(--primary-light)' : 'var(--bg-light)',
                color: value ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontFamily: "'Medeo Sans', ui-sans-serif, sans-serif",
                transition: 'all 0.15s ease',
                userSelect: 'none',
            }}
        >
            {icon && <span style={{ display: 'inline-flex', alignItems: 'center', color: value ? 'var(--primary)' : 'var(--text-muted)' }}>{icon}</span>}
            <span>{label}</span>
            {value && <Check size={13} strokeWidth={2.6} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
        </button>
    );
}

/* --- Группа выбора (Pill Group / Segmented Control) --- */
function ChipGroup({ options, value, onChange }) {
    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {options.map(opt => {
                const isSelected = value === opt.val;
                return (
                    <button
                        key={opt.val}
                        type="button"
                        onClick={() => onChange(opt.val)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: 10,
                            fontSize: 12,
                            fontWeight: isSelected ? 600 : 400,
                            border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                            background: isSelected ? 'var(--primary)' : 'var(--bg-light)',
                            color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                            boxShadow: isSelected ? '0 2px 8px rgba(0, 82, 255, 0.22)' : 'none',
                            cursor: 'pointer',
                            fontFamily: "'Medeo Sans', ui-sans-serif, sans-serif",
                            transition: 'all 0.15s ease',
                            userSelect: 'none',
                        }}
                    >
                        {opt.label}
                    </button>
                );
            })}
        </div>
    );
}

/* --- Группа множественного выбора (Multi-Chips) --- */
function MultiChipGroup({ options, value = [], onChange }) {
    const currentValues = Array.isArray(value) ? value : (value ? [value] : []);
    const toggle = (val) => {
        if (currentValues.includes(val)) {
            onChange(currentValues.filter(v => v !== val));
        } else {
            onChange([...currentValues, val]);
        }
    };

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {options.map(opt => {
                const isSelected = currentValues.includes(opt.val);
                return (
                    <button
                        key={opt.val}
                        type="button"
                        onClick={() => toggle(opt.val)}
                        style={{
                            padding: '6px 12px',
                            borderRadius: 10,
                            fontSize: 12,
                            fontWeight: isSelected ? 600 : 400,
                            border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                            background: isSelected ? 'var(--primary-light)' : 'var(--bg-light)',
                            color: isSelected ? 'var(--primary)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontFamily: "'Medeo Sans', ui-sans-serif, sans-serif",
                            transition: 'all 0.15s ease',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            userSelect: 'none',
                        }}
                    >
                        <span>{opt.label}</span>
                        {isSelected && <Check size={13} strokeWidth={2.6} />}
                    </button>
                );
            })}
        </div>
    );
}

/* --- Компактная карточка секции --- */
function FormCard({ title, icon, action, children, description, style = {} }) {
    return (
        <div className="card fade-in" style={{ 
            padding: '16px 18px',
            marginBottom: 14,
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            borderRadius: 18,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            ...style
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    {icon && (
                        <div style={{ 
                            width: 28, height: 28, borderRadius: 8,
                            background: 'var(--primary-light)', color: 'var(--primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            {React.cloneElement(icon, { size: 16 })}
                        </div>
                    )}
                    <div style={{ 
                        fontSize: 13, 
                        fontWeight: 600, 
                        color: 'var(--text)', 
                        letterSpacing: '0.02em',
                        textTransform: 'uppercase'
                    }}>
                        {title}
                    </div>
                </div>
                {action}
            </div>
            {description && (
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: -6 }}>
                    {description}
                </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {children}
            </div>
        </div>
    );
}

export function FormPage() {
    const { id } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const { toast } = useToastContext();
    const location = useLocation();

    const prefilledData = location.state?.prefillProperty;
    const paramClientId = searchParams.get('client_id') || searchParams.get('client') || '';
    const initialClientId = paramClientId || prefilledData?.client_id || '';
    const initialClientIds = (() => {
        let ids = prefilledData?.client_ids || [];
        if (typeof ids === 'string') {
            ids = ids.replace(/{|}/g, '').split(',').filter(Boolean);
        }
        if (ids.length > 0) return ids;
        if (initialClientId) return [initialClientId];
        return [];
    })();
    const initialClientShares = (prefilledData?.client_shares && Object.keys(prefilledData.client_shares).length > 0)
        ? prefilledData.client_shares
        : (initialClientIds.length === 1 ? { [initialClientIds[0]]: '1/1' } : {});

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
        })(),
        agent_id: existing.agent_id || '',
        client_shares: existing.client_shares || {}
    } : {
        realtor_id: state.currentUser?.id,
        agent_id: '',
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
        movable_property: '',
        images: [],
        floorplan_images: [],
        contact_name: '',
        contact_phone: '',
        // Характеристики дома и участка
        land_area: '',
        land_category: '',
        distance_to_city: '',
        road_access: '',
        has_house: false,
        house_area: '',
        house_floors: '',
        house_material: '',
        house_condition: '',
        house_build_year: '',
        house_has_cadastre: false,
        house_cadastral_number: '',
        has_electricity: false,
        electricity_kw: '',
        has_water: false,
        water_type: '',
        water_types: [],
        has_gas: false,
        gas_type: '',
        has_sewage: false,
        sewage_type: '',
        has_bathhouse: false,
        has_garage: false,
        garage_area: '',
        has_gazebo: false,
        has_greenhouse: false,
        has_well: false,
        has_summer_kitchen: false,
        has_pond: false,
        fence_type: '',
        garden_notes: '',
        // Характеристики коммерческого помещения
        commercial_type: 'free_purpose',
        entrance_type: 'separate_street',
        commercial_layout: 'open_space',
        location_line: 'first_line',
        ventilation_type: 'forced',
        has_shop_windows: false,
        access_24_7: false,
        has_loading_zone: false,
        wet_points: 1,
        has_tenant: false,
        rental_income: '',
        commercial_notes: '',
        ...(prefilledData || {}),
        client_id: initialClientId,
        client_ids: initialClientIds,
        client_shares: initialClientShares
    };

    const [form, setForm] = useState(initialForm);
    const oldPriceRef = React.useRef(existing?.price ?? null);
    const [importUrl, setImportUrl] = useState('');
    
    React.useEffect(() => {
        if (existing && !form.id) {
            setForm({
                ...existing,
                images: existing.images || [],
                client_ids: existing.client_ids || (existing.client_id ? [existing.client_id] : []),
                agent_id: existing.agent_id || '',
                client_shares: existing.client_shares || {}
            });
        }
    }, [existing, form.id]);

    React.useEffect(() => {
        if (!id && !existing) {
            const cid = searchParams.get('client_id') || searchParams.get('client') || location.state?.prefillProperty?.client_id;
            if (cid && (!form.client_ids || form.client_ids.length === 0)) {
                setForm(prev => ({
                    ...prev,
                    client_id: cid,
                    client_ids: [cid],
                    client_shares: (prev.client_shares && Object.keys(prev.client_shares).length > 0) ? prev.client_shares : { [cid]: '1/1' }
                }));
            }
        }
    }, [searchParams, location.state, id, existing, form.client_ids]);

    const importParam = searchParams.get('import');
    const processedImportRef = useRef(null);

    React.useEffect(() => {
        if (importParam && processedImportRef.current !== importParam) {
            processedImportRef.current = importParam;
            try {
                const data = decodeImportData(importParam);
                if (data && typeof data === 'object') {
                    setForm(f => ({
                        ...f,
                        address: data.address || data.title || f.address || '',
                        city: data.city || f.city || 'Киров',
                        price: data.price ? (isNaN(Number(data.price)) ? f.price : Number(data.price)) : f.price,
                        area_total: data.area_total ? (isNaN(parseFloat(String(data.area_total).replace(',', '.'))) ? f.area_total : parseFloat(String(data.area_total).replace(',', '.'))) : f.area_total,
                        area_living: data.area_living ? (isNaN(parseFloat(String(data.area_living).replace(',', '.'))) ? f.area_living : parseFloat(String(data.area_living).replace(',', '.'))) : f.area_living,
                        area_kitchen: data.area_kitchen ? (isNaN(parseFloat(String(data.area_kitchen).replace(',', '.'))) ? f.area_kitchen : parseFloat(String(data.area_kitchen).replace(',', '.'))) : f.area_kitchen,
                        rooms: data.rooms !== undefined && data.rooms !== null ? (isNaN(Number(data.rooms)) ? f.rooms : Number(data.rooms)) : f.rooms,
                        floor: data.floor ? (isNaN(Number(data.floor)) ? f.floor : Number(data.floor)) : f.floor,
                        floors_total: data.floors_total ? (isNaN(Number(data.floors_total)) ? f.floors_total : Number(data.floors_total)) : f.floors_total,
                        build_year: data.year_built ? (isNaN(Number(data.year_built)) ? f.build_year : Number(data.year_built)) : f.build_year,
                        images: Array.isArray(data.images) && data.images.length > 0 ? data.images : (data.image ? [data.image] : (Array.isArray(data.photos) && data.photos.length > 0 ? data.photos : f.images)),
                        notes: `${data.description || f.notes || ''}\n\nИсточник: ${data.source_url || data.link || ''}`.trim(),
                    }));
                    toast.success('Данные успешно импортированы! Проверьте и сохраните.');
                }
            } catch (err) {
                console.error('Failed to parse import data:', err);
                toast.error('Не удалось разобрать данные импорта');
            }
            // Clear the import param from the URL to prevent double imports
            const newParams = new URLSearchParams(searchParams);
            newParams.delete('import');
            setSearchParams(newParams, { replace: true });
        }
    }, [importParam, searchParams, toast, setSearchParams]);

    const fileInputRef = useRef();
    const floorplanInputRef = useRef();
    const [uploading, setUploading] = useState(false);
    const [uploadingFloorplan, setUploadingFloorplan] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [parsedFields, setParsedFields] = useState(null);
    const [showQuickAgentForm, setShowQuickAgentForm] = useState(false);
    const [quickAgent, setQuickAgent] = useState({ full_name: '', phone: '' });
    const [showQuickOwnerForm, setShowQuickOwnerForm] = useState(false);
    const [quickOwner, setQuickOwner] = useState({ full_name: '', phone: '' });
    const [showAddMicro, setShowAddMicro] = useState(false);
    const [newMicroName, setNewMicroName] = useState('');

    const availableMicrodistricts = useMemo(() => {
        const list = getAllMicrodistricts(form.district, state.properties);
        if (form.microdistrict && !list.some(m => m.toLowerCase() === form.microdistrict.toLowerCase())) {
            return [form.microdistrict, ...list];
        }
        return list;
    }, [form.district, form.microdistrict, state.properties]);

    const handleSaveCustomMicro = () => {
        const trimmed = newMicroName.trim();
        if (!trimmed) return;
        const saved = saveCustomMicrodistrict(trimmed, form.district);
        setF('microdistrict', saved || trimmed);
        setNewMicroName('');
        setShowAddMicro(false);
        toast.success(`Микрорайон «${saved || trimmed}» сохранен`);
    };

    const [showExtensionModal, setShowExtensionModal] = useState(false);

    const handleUrlImport = () => {
        if (!importUrl) {
            toast.error('Введите ссылку для импорта');
            return;
        }
        setShowExtensionModal(true);
        const urlLower = importUrl.toLowerCase();
        if (urlLower.includes('avito.ru') || urlLower.includes('cian.ru')) {
            toast.info('Для Авито и Циан используйте расширение Chrome - прямые ссылки блокируются защитой сайтов');
        } else {
            toast.info('Импорт объявлений выполняется через официальное расширение Chrome');
        }
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
                const compressedFile = await compressImage(file);
                const formData = new FormData();
                formData.append('file', compressedFile);
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

    async function handleFloorplanUpload(e) {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        if (!CLOUDINARY_CLOUD_NAME) { toast.error('Cloudinary not configured'); return; }
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
        setUploadingFloorplan(true);
        const newImages = [...(form.floorplan_images || [])];
        for (const file of files) {
            try {
                const compressed = await compressImage(file);
                const fd = new FormData();
                fd.append('file', compressed);
                fd.append('upload_preset', uploadPreset);
                fd.append('folder', 'floorplans');
                const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: 'POST', body: fd });
                const data = await res.json();
                if (data.secure_url) newImages.push(data.secure_url);
            } catch (err) { console.error('Floorplan upload error:', err); }
        }
        setF('floorplan_images', newImages);
        setUploadingFloorplan(false);
    }

    const handleRemoveFloorplan = (index) => {
        const imgs = [...(form.floorplan_images || [])];
        imgs.splice(index, 1);
        setF('floorplan_images', imgs);
    };

    const handleCreateQuickAgent = (e) => {
        if (e) e.preventDefault();
        if (!quickAgent.full_name?.trim()) {
            toast.error('Укажите ФИО или имя агента');
            return;
        }

        const cleanPhone = stripPhone(quickAgent.phone) || quickAgent.phone?.trim() || '';
        const newAgentId = nanoid();
        const client = {
            id: newAgentId,
            full_name: quickAgent.full_name.trim(),
            phone: cleanPhone,
            realtor_id: state.currentUser?.id,
            client_types: ['agent'],
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        dispatch({ type: 'ADD_CLIENT', client });
        setF('agent_id', newAgentId);
        setQuickAgent({ full_name: '', phone: '' });
        setShowQuickAgentForm(false);
        toast.success('Агент создан и выбран');
    };

    const handleReplaceQuickAgent = (existing) => {
        const cleanPhone = stripPhone(quickAgent.phone) || quickAgent.phone?.trim() || existing.phone;
        const updated = {
            ...existing,
            full_name: quickAgent.full_name.trim() || existing.full_name,
            phone: cleanPhone,
            client_types: Array.from(new Set([...(existing.client_types || []), 'agent'])),
            updated_at: new Date().toISOString()
        };
        dispatch({ type: 'UPDATE_CLIENT', client: updated });
        setF('agent_id', existing.id);
        setQuickAgent({ full_name: '', phone: '' });
        setShowQuickAgentForm(false);
        toast.success(`Данные агента «${existing.full_name}» заменены на новые`);
    };

    const handleCreateQuickOwner = (e) => {
        if (e) e.preventDefault();
        if (!quickOwner.full_name?.trim()) {
            toast.error('Укажите ФИО или имя собственника');
            return;
        }

        const cleanPhone = stripPhone(quickOwner.phone) || quickOwner.phone?.trim() || '';
        const newOwnerId = nanoid();
        const client = {
            id: newOwnerId,
            full_name: quickOwner.full_name.trim(),
            phone: cleanPhone,
            realtor_id: state.currentUser?.id,
            client_types: ['seller'],
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        dispatch({ type: 'ADD_CLIENT', client });
        setF('client_ids', [...(form.client_ids || []), newOwnerId]);
        setQuickOwner({ full_name: '', phone: '' });
        setShowQuickOwnerForm(false);
        toast.success('Собственник создан и добавлен к объекту');
    };

    const handleReplaceQuickOwner = (existing) => {
        const cleanPhone = stripPhone(quickOwner.phone) || quickOwner.phone?.trim() || existing.phone;
        const updated = {
            ...existing,
            full_name: quickOwner.full_name.trim() || existing.full_name,
            phone: cleanPhone,
            client_types: Array.from(new Set([...(existing.client_types || []), 'seller'])),
            updated_at: new Date().toISOString()
        };
        dispatch({ type: 'UPDATE_CLIENT', client: updated });
        if (!form.client_ids?.includes(existing.id)) {
            setF('client_ids', [...(form.client_ids || []), existing.id]);
        }
        setQuickOwner({ full_name: '', phone: '' });
        setShowQuickOwnerForm(false);
        toast.success(`Данные собственника «${existing.full_name}» заменены на новые`);
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
        if (finalForm.microdistrict) {
            saveCustomMicrodistrict(finalForm.microdistrict, finalForm.district);
        }
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
            fontFamily: "'Medeo Sans', ui-sans-serif, sans-serif" 
        }}>
            {/* Sticky Header with Glassmorphism */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 100,
                background: 'var(--topbar-bg)', backdropFilter: 'blur(20px) saturate(180%)',
                padding: '12px 18px', borderBottom: '1px solid var(--topbar-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                gap: 12
            }}>
                <button 
                    type="button"
                    onClick={() => navigate(-1)} 
                    className="card-clickable" 
                    title="Назад"
                    style={{
                        width: 38, height: 38, borderRadius: 12, border: '1px solid var(--border)',
                        background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                        color: 'var(--text)'
                    }}
                >
                    <ChevronLeft size={20} />
                </button>

                <div style={{ textAlign: 'center', minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text)' }}>
                        {id ? 'Редактирование' : (location.state?.isCopy ? 'Копия объекта' : 'Новый объект')}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginTop: 1 }}>
                        {PROPERTY_TYPES[form.property_type] || 'Объект'} • {form.deal_type === 'rent' ? 'Аренда' : form.deal_type === 'hire' ? 'Найм' : form.deal_type === 'buy' ? 'Покупка' : 'Продажа'}
                    </div>
                </div>

                {/* Быстрое сохранение прямо в шапке */}
                <button
                    type="button"
                    onClick={handleSubmit}
                    className="btn btn-primary card-clickable"
                    style={{
                        height: 38,
                        padding: '0 14px',
                        borderRadius: 12,
                        fontSize: 12.5,
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 2px 8px rgba(0,82,255,0.25)',
                        flexShrink: 0
                    }}
                >
                    <Check size={15} strokeWidth={2.6} />
                    <span>{id ? 'Сохранить' : 'Создать'}</span>
                </button>
            </div>

             <form onSubmit={handleSubmit} className="page-form" style={{ padding: '14px 16px', width: '100%', margin: '0 auto' }}>
                
                <div className="form-cards-layout">
                    {/* --- ЛЕВАЯ КОЛОНКА (Тип, Адрес, Параметры) --- */}
                    <div className="form-col-main">
                {/* Компактный импорт по ссылке */}
                <FormCard 
                    title="Импорт (Авито / ЦИАН)" 
                    icon={<Sparkles size={16} />} 
                    action={
                        <button
                            type="button"
                            onClick={() => setShowExtensionModal(true)}
                            style={{
                                padding: '4px 10px',
                                fontSize: 11.5,
                                fontWeight: 500,
                                borderRadius: 8,
                                background: 'var(--primary-light)',
                                color: 'var(--primary)',
                                border: '1px solid rgba(0, 82, 255, 0.18)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4
                            }}
                        >
                            <Info size={12} />
                            <span>Расширение Chrome</span>
                        </button>
                    }
                >
                    <div style={{ display: 'flex', gap: 8 }}>
                        <input
                            type="text"
                            className="form-input"
                            style={{ flex: 1, borderRadius: 12, height: 40, fontSize: 13 }}
                            value={importUrl}
                            onChange={e => setImportUrl(e.target.value)}
                            placeholder="Вставьте ссылку на Авито или ЦИАН..."
                        />
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleUrlImport}
                            style={{ borderRadius: 12, height: 40, padding: '0 16px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
                        >
                            <Sparkles size={14} /> Импорт
                        </button>
                    </div>
                </FormCard>

                {/* Основное */}
                <FormCard title="Основные данные" icon={<Zap size={16} />}>
                    <div className="form-group" style={{ marginBottom: 2 }}>
                        <label className="form-label" style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Цель сделки</label>
                        <ChipGroup
                            options={[
                                { val: 'sale', label: 'Продажа' },
                                { val: 'buy',  label: 'Покупка' },
                                { val: 'rent', label: 'Аренда' },
                                { val: 'hire', label: 'Найм' },
                            ]}
                            value={form.deal_type || 'sale'}
                            onChange={val => setF('deal_type', val)}
                        />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Тип недвижимости</label>
                            <select className="form-select" value={form.property_type} onChange={e => {
                                const val = e.target.value;
                                setF('property_type', val);
                                if (val === 'house' && (!form.floors_total || form.floors_total === 9)) {
                                    setF('floors_total', 2);
                                }
                            }} style={{ borderRadius: 12, height: 40, fontSize: 13 }}>
                                {Object.entries(PROPERTY_TYPES).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Статус объекта</label>
                            <select className="form-select" value={form.status} onChange={e => setF('status', e.target.value)} style={{ borderRadius: 12, height: 40, fontSize: 13 }}>
                                <option value="meeting">Встреча</option>
                                <option value="agreement">АД (агент. договор)</option>
                                <option value="no_agreement">Без АД</option>
                                <option value="advertising">В рекламе</option>
                                <option value="selection">Подбор</option>
                                <option value="deposit">Задаток</option>
                                <option value="deal">Сделка</option>
                                <option value="sold">Продан / Закрыта</option>
                            </select>
                        </div>
                    </div>
                </FormCard>

                {/* Владельцы и Агент */}
                <FormCard 
                    title="Собственники и Агент" 
                    icon={<Users size={16} />}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* --- Блок 1: Собственники --- */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label className="form-label" style={{ fontWeight: 500, fontSize: 12, margin: 0, color: 'var(--text-secondary)' }}>
                                    Собственники
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowQuickOwnerForm(true)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        padding: '3px 8px',
                                        borderRadius: 6,
                                        border: '1px solid rgba(0, 82, 255, 0.15)',
                                        background: 'rgba(0, 82, 255, 0.06)',
                                        color: 'var(--primary)',
                                        fontSize: 11.5,
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                    }}
                                    title="Создать нового собственника"
                                >
                                    <UserPlus size={12} />
                                    <span>+ Собственник</span>
                                </button>
                            </div>

                            <MultiClientSelector 
                                selectedIds={form.client_ids || []}
                                onChange={ids => {
                                    setForm(prev => {
                                        const newShares = { ...(prev.client_shares || {}) };
                                        if (ids.length === 1 && !newShares[ids[0]]) {
                                            newShares[ids[0]] = '1/1';
                                        }
                                        return {
                                            ...prev,
                                            client_ids: ids,
                                            client_id: ids.length > 0 ? (ids.includes(prev.client_id) ? prev.client_id : ids[0]) : '',
                                            client_shares: newShares
                                        };
                                    });
                                }}
                                clients={state.clients || []}
                                placeholder="Выберите собственников объекта..."
                            />

                            {/* Доли в праве собственности */}
                            {form.client_ids && form.client_ids.length > 0 && (
                                <div style={{ 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: 8, 
                                    marginTop: 2, 
                                    padding: '10px 12px', 
                                    background: 'var(--bg-light)', 
                                    borderRadius: 12,
                                    border: '1px solid var(--border-light)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            <PieChart size={12} style={{ color: 'var(--primary)' }} />
                                            <span>Доли владения</span>
                                        </div>
                                        {form.client_ids.length === 1 && !form.client_shares?.[form.client_ids[0]] && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newShares = { ...(form.client_shares || {}) };
                                                    newShares[form.client_ids[0]] = '1/1';
                                                    setF('client_shares', newShares);
                                                }}
                                                style={{
                                                    border: 'none',
                                                    background: 'transparent',
                                                    color: 'var(--primary)',
                                                    fontSize: 11,
                                                    fontWeight: 500,
                                                    cursor: 'pointer',
                                                    padding: 0
                                                }}
                                            >
                                                Заполнить 1/1 (100%)
                                            </button>
                                        )}
                                        {form.client_ids.length === 2 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newShares = { ...(form.client_shares || {}) };
                                                    newShares[form.client_ids[0]] = '1/2';
                                                    newShares[form.client_ids[1]] = '1/2';
                                                    setF('client_shares', newShares);
                                                }}
                                                style={{
                                                    border: 'none',
                                                    background: 'transparent',
                                                    color: 'var(--primary)',
                                                    fontSize: 11,
                                                    fontWeight: 500,
                                                    cursor: 'pointer',
                                                    padding: 0
                                                }}
                                            >
                                                По 1/2
                                            </button>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                        {form.client_ids.map(clientId => {
                                            const client = state.clients.find(c => c.id === clientId);
                                            if (!client) return null;
                                            const initials = client.full_name ? client.full_name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
                                            return (
                                                <div 
                                                    key={clientId} 
                                                    style={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'space-between',
                                                        gap: 8,
                                                        padding: '6px 10px',
                                                        background: 'var(--surface)',
                                                        borderRadius: 10,
                                                        border: '1px solid var(--border-light)'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                                                        <div style={{
                                                            width: 24, height: 24, borderRadius: '50%',
                                                            background: 'rgba(0, 82, 255, 0.08)',
                                                            color: 'var(--primary)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: 10, fontWeight: 600, flexShrink: 0
                                                        }}>
                                                            {initials}
                                                        </div>
                                                        <div style={{ minWidth: 0, flex: 1 }}>
                                                            <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {client.full_name}
                                                            </div>
                                                            {client.phone && (
                                                                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                                                    {formatPhone(client.phone)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <input 
                                                        type="text" 
                                                        style={{ 
                                                            width: 90, 
                                                            height: 28, 
                                                            borderRadius: 6, 
                                                            fontSize: 12, 
                                                            fontWeight: 500,
                                                            textAlign: 'center',
                                                            padding: '0 6px', 
                                                            border: '1px solid var(--border)',
                                                            background: 'var(--bg-light)',
                                                            color: 'var(--text)',
                                                            outline: 'none',
                                                            boxSizing: 'border-box'
                                                        }} 
                                                        placeholder={form.client_ids.length === 1 ? '1/1' : 'напр. 1/2'} 
                                                        value={form.client_shares?.[clientId] || ''} 
                                                        onChange={e => {
                                                            const newShares = { ...(form.client_shares || {}) };
                                                            newShares[clientId] = e.target.value;
                                                            setF('client_shares', newShares);
                                                        }} 
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Разделитель */}
                        <div style={{ height: 1, background: 'var(--border-light)', margin: '0' }} />

                        {/* --- Блок 2: Агент объекта --- */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label className="form-label" style={{ fontWeight: 500, fontSize: 12, margin: 0, color: 'var(--text-secondary)' }}>
                                    Агент объекта
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setShowQuickAgentForm(true)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                        padding: '3px 8px',
                                        borderRadius: 6,
                                        border: '1px solid rgba(0, 82, 255, 0.15)',
                                        background: 'rgba(0, 82, 255, 0.06)',
                                        color: 'var(--primary)',
                                        fontSize: 11.5,
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                    }}
                                    title="Создать нового агента"
                                >
                                    <UserPlus size={12} />
                                    <span>+ Агент</span>
                                </button>
                            </div>

                            <select 
                                className="form-select" 
                                value={form.agent_id || ''} 
                                onChange={e => setF('agent_id', e.target.value || null)} 
                                style={{ borderRadius: 12, height: 40, padding: '0 10px', width: '100%', fontSize: 13 }}
                            >
                                <option value="">Без привязанного агента</option>
                                {(() => {
                                    const agents = (state.clients || []).filter(c => c.client_types?.includes('agent'));
                                    const seenNames = new Set();
                                    const uniqueAgents = [];
                                    for (const a of agents) {
                                        const nameKey = (a.full_name || '').trim().toLowerCase();
                                        if (nameKey && seenNames.has(nameKey)) continue;
                                        if (nameKey) seenNames.add(nameKey);
                                        uniqueAgents.push(a);
                                    }
                                    return uniqueAgents.map(a => (
                                        <option key={a.id} value={a.id}>{a.full_name}</option>
                                    ));
                                })()}
                            </select>
                        </div>
                    </div>
                </FormCard>

                {/* Локация */}
                <FormCard title="Локация" icon={<MapPin size={16} />}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Город</label>
                            <select className="form-select" value={form.city} onChange={e => setF('city', e.target.value)} style={{ borderRadius: 12, height: 40, fontSize: 13 }}>
                                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {form.city === 'Киров' ? (
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Район города</label>
                                <select 
                                    className="form-select" 
                                    value={form.district || ''} 
                                    onChange={e => setF('district', e.target.value)} 
                                    style={{ borderRadius: 12, height: 40, fontSize: 13 }}
                                >
                                    <option value="">- Любой район / не выбран -</option>
                                    {KIROV_DISTRICTS.map(d => (
                                        <option key={d.name} value={d.name}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Район / Округ</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={form.district || ''}
                                    onChange={e => setF('district', e.target.value)}
                                    placeholder="Например: Центральный"
                                    style={{ borderRadius: 12, height: 40, fontSize: 13 }}
                                />
                            </div>
                        )}
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <label className="form-label" style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 0 }}>Микрорайон</label>
                                <button
                                    type="button"
                                    className="card-clickable"
                                    onClick={() => setShowAddMicro(v => !v)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--primary)',
                                        fontSize: 11,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 2,
                                        padding: 0,
                                        fontWeight: 500
                                    }}
                                >
                                    {showAddMicro ? '✕ Отмена' : '+ Свой'}
                                </button>
                            </div>

                            <select 
                                className="form-select" 
                                value={form.microdistrict || ''} 
                                onChange={e => {
                                    if (e.target.value === '__NEW__') {
                                        setShowAddMicro(true);
                                    } else {
                                        setF('microdistrict', e.target.value);
                                    }
                                }} 
                                style={{ borderRadius: 12, height: 40, fontSize: 13 }}
                            >
                                <option value="">- Не выбран -</option>
                                {availableMicrodistricts.map(m => (
                                    <option key={m} value={m}>{m}</option>
                                ))}
                                <option value="__NEW__">+ Свой вариант (добавить в базу)...</option>
                            </select>
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                                {form.property_type === 'house' ? 'Посёлок / КП' : 'Жилой комплекс / ЖК'}
                            </label>
                            <input 
                                className="form-input" 
                                value={form.residential_complex || ''} 
                                onChange={e => setF('residential_complex', e.target.value)} 
                                placeholder={form.property_type === 'house' ? 'Название КП' : 'Название ЖК'} 
                                style={{ borderRadius: 12, height: 40, fontSize: 13 }} 
                            />
                        </div>
                    </div>

                    {showAddMicro && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-light)', padding: '8px 10px', borderRadius: 12 }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Название нового микрорайона..."
                                value={newMicroName}
                                onChange={e => setNewMicroName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSaveCustomMicro();
                                    }
                                }}
                                style={{ borderRadius: 8, flex: 1, height: 34, fontSize: 12 }}
                                autoFocus
                            />
                            <button
                                type="button"
                                className="btn btn-primary card-clickable"
                                onClick={handleSaveCustomMicro}
                                style={{ height: 34, padding: '0 12px', borderRadius: 8, fontSize: 12, whiteSpace: 'nowrap' }}
                            >
                                Сохранить
                            </button>
                        </div>
                    )}

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Адрес</label>
                        <AddressAutocomplete
                            value={form.address}
                            onChange={val => setForm(f => ({ ...f, address: val, latitude: null, longitude: null }))}
                            city={form.city !== 'Другой' ? form.city : undefined}
                            placeholder="ул. Ленина, д. 1, кв. 10"
                            onSelect={suggestion => {
                                const d = suggestion.data;
                                const updates = {
                                    latitude: d.geo_lat ? Number(d.geo_lat) : null,
                                    longitude: d.geo_lon ? Number(d.geo_lon) : null,
                                };
                                if (d.city && form.city === 'Другой') {
                                    updates.city = d.city;
                                }
                                if (d.city_district_with_type && !form.district) {
                                    updates.district = d.city_district_with_type;
                                }
                                if (d.floors_count && !form.floors_total) {
                                    updates.floors_total = Number(d.floors_count);
                                }
                                if (d.flat_cadnum && !form.cadastral_number) {
                                    updates.cadastral_number = d.flat_cadnum;
                                }
                                setForm(f => ({ ...f, ...updates }));
                            }}
                        />
                    </div>

                    {form.property_type !== 'garden' && form.property_type !== 'land' && (
                        <>
                            {form.property_type !== 'house' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                                    <button
                                        type="button"
                                        onClick={handleParseHouse}
                                        disabled={parsing || (!form.address && !form.city)}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                            height: 36, borderRadius: 10, fontSize: 12,
                                            border: '1px dashed var(--primary)',
                                            background: 'var(--primary-light)', color: 'var(--primary)',
                                            cursor: parsing ? 'wait' : 'pointer',
                                            fontWeight: 500,
                                            transition: 'all 0.15s ease',
                                            opacity: (!form.address && !form.city) ? 0.5 : 1
                                        }}
                                    >
                                        {parsing ? '⌛ Загрузка...' : <><Sparkles size={14} /> Данные о доме (МинЖКХ)</>}
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
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                                            height: 36, padding: '0 12px', borderRadius: 10, fontSize: 12,
                                            border: '1px solid var(--border)',
                                            background: 'var(--bg-light)', color: 'var(--text-secondary)',
                                            cursor: 'pointer', fontWeight: 500,
                                            transition: 'all 0.15s ease', whiteSpace: 'nowrap',
                                            opacity: (!form.address && !form.city) ? 0.5 : 1
                                        }}
                                    >
                                        dom.mingkh.ru
                                    </button>
                                </div>
                            )}
                            {parsedFields && form.property_type !== 'house' && (
                                <div style={{
                                    background: parsedFields.length > 0 ? 'var(--success-light)' : 'var(--warning-light)',
                                    border: `1px solid ${parsedFields.length > 0 ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.25)'}`,
                                    borderRadius: 12, padding: '10px 12px',
                                }}>
                                    <div style={{ fontSize: 11.5, fontWeight: 500, color: parsedFields.length > 0 ? 'var(--success)' : 'var(--warning)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {parsedFields.length > 0 ? <Check size={13} /> : <Info size={13} />}
                                        {parsedFields.length > 0 ? `Найдено ${parsedFields.length} характеристик:` : 'Данные не найдены'}
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                        {parsedFields.map(({ label, value }) => (
                                            <span key={label} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border-light)', fontWeight: 400 }}>
                                                {label}: <strong style={{ color: 'var(--primary)' }}>{value}</strong>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </FormCard>

                {/* Параметры объекта */}
                {form.property_type !== 'garden' && (
                <FormCard title="Параметры объекта" icon={<Ruler size={16} />}>
                    {form.property_type === 'commercial' ? (
                        <div className="form-group" style={{ marginBottom: 2 }}>
                            <label className="form-label" style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Планировка помещения</label>
                            <ChipGroup 
                                options={Object.entries(COMMERCIAL_LAYOUTS).map(([val, label]) => ({ val, label }))}
                                value={form.commercial_layout || 'open_space'}
                                onChange={val => setF('commercial_layout', val)}
                            />
                        </div>
                    ) : (
                        <div className="form-group" style={{ marginBottom: 2 }}>
                            <label className="form-label" style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Количество комнат</label>
                            <ChipGroup 
                                 options={[
                                     ...(form.property_type === 'house' ? [] : [{ val: 0, label: 'Студия' }]),
                                     { val: 1, label: '1' },
                                     { val: 2, label: '2' },
                                     { val: 3, label: '3' },
                                     { val: 4, label: '4' },
                                     { val: 5, label: '5+' },
                                     ...(form.property_type === 'house' ? [{ val: 0, label: 'Свободная' }] : []),
                                 ]}
                                 value={form.rooms}
                                 onChange={val => setF('rooms', val)}
                             />
                         </div>
                    )}

                    {form.property_type === 'commercial' ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>Общая площадь (м²)</label>
                                <input 
                                    type="number" 
                                    step="any"
                                    className="form-input" 
                                    value={form.area_total || ''} 
                                    onChange={e => setF('area_total', e.target.value === '' ? '' : parseFloat(e.target.value))} 
                                    placeholder="120"
                                    style={{ borderRadius: 10, height: 38, fontSize: 13 }} 
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>Полезная / торговая (м²)</label>
                                <input 
                                    type="number" 
                                    step="any"
                                    className="form-input" 
                                    value={form.area_living || ''} 
                                    onChange={e => setF('area_living', e.target.value === '' ? '' : parseFloat(e.target.value))} 
                                    placeholder="95"
                                    style={{ borderRadius: 10, height: 38, fontSize: 13 }} 
                                />
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>Общая м²</label>
                                <input type="number" step="any" className="form-input" value={form.area_total || ''} onChange={e => {
                                    const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                                    setF('area_total', val);
                                    if (form.property_type === 'house') setF('house_area', val);
                                }} style={{ borderRadius: 10, height: 38, fontSize: 13 }} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>Жилая м²</label>
                                <input type="number" step="any" className="form-input" value={form.area_living || ''} onChange={e => setF('area_living', e.target.value === '' ? '' : parseFloat(e.target.value))} style={{ borderRadius: 10, height: 38, fontSize: 13 }} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>Кухня м²</label>
                                <input type="number" step="any" className="form-input" value={form.area_kitchen || ''} onChange={e => setF('area_kitchen', e.target.value === '' ? '' : parseFloat(e.target.value))} style={{ borderRadius: 10, height: 38, fontSize: 13 }} />
                            </div>
                        </div>
                    )}

                     {form.property_type === 'house' ? (
                         <div className="form-group" style={{ marginBottom: 0 }}>
                             <label className="form-label" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>Этажей в доме</label>
                             <input 
                                 type="number" 
                                 className="form-input" 
                                 value={form.floors_total || ''} 
                                 onChange={e => {
                                     const val = Number(e.target.value);
                                     setF('floors_total', val);
                                     setF('house_floors', val);
                                 }} 
                                 placeholder="2" 
                                 style={{ borderRadius: 10, height: 38, fontSize: 13 }} 
                             />
                         </div>
                     ) : (
                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                             <div className="form-group" style={{ marginBottom: 0 }}>
                                 <label className="form-label" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>Этаж</label>
                                 <input type="number" className="form-input" value={form.floor || ''} onChange={e => setF('floor', Number(e.target.value))} style={{ borderRadius: 10, height: 38, fontSize: 13 }} />
                             </div>
                             <div className="form-group" style={{ marginBottom: 0 }}>
                                 <label className="form-label" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>Всего этажей</label>
                                 <input type="number" className="form-input" value={form.floors_total || ''} onChange={e => setF('floors_total', Number(e.target.value))} style={{ borderRadius: 10, height: 38, fontSize: 13 }} />
                             </div>
                         </div>
                     )}
 
                     <div className="form-group" style={{ marginBottom: 0 }}>
                         <label className="form-label" style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Ремонт</label>
                         <ChipGroup 
                             options={Object.entries(RENOVATION_LABELS).map(([val, label]) => ({ val, label }))}
                             value={form.renovation}
                             onChange={val => setF('renovation', val)}
                         />
                     </div>
                </FormCard>
                )}

                 {/* --- О САДЕ (только для garden) --- */}
                 {form.property_type === 'garden' && (
                     <FormCard title="О саде / участке" icon={<Home size={16} />}>

                         {/* Участок */}
                         <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                             <div className="font-oswald" style={{ fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Участок</div>
                             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                 <div className="form-group" style={{ marginBottom: 0 }}>
                                     <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Площадь (соток)</label>
                                     <input type="number" step="any" className="form-input" value={form.land_area || ''} onChange={e => {
                                         const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                                         setF('land_area', val);
                                     }} placeholder="6" style={{ borderRadius: 10, height: 38 }} />
                                 </div>
                                 <div className="form-group" style={{ marginBottom: 0 }}>
                                     <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Категория</label>
                                     <select className="form-select" value={form.land_category || ''} onChange={e => setF('land_category', e.target.value)} style={{ borderRadius: 10, height: 38 }}>
                                         <option value="">- Не указана -</option>
                                         <option value="snt">СНТ</option>
                                         <option value="dnt">ДНТ</option>
                                         <option value="izhs">ИЖС</option>
                                         <option value="lph">ЛПХ</option>
                                         <option value="other">Другое</option>
                                     </select>
                                 </div>
                             </div>
                             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                 <div className="form-group" style={{ marginBottom: 0 }}>
                                     <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Название СНТ/ДНТ</label>
                                     <input className="form-input" value={form.snt_name || ''} onChange={e => setF('snt_name', e.target.value)} placeholder="Шинник-7" style={{ borderRadius: 10, height: 38 }} />
                                 </div>
                                 <div className="form-group" style={{ marginBottom: 0 }}>
                                     <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>№ участка</label>
                                     <input className="form-input" value={form.snt_number || ''} onChange={e => setF('snt_number', e.target.value)} placeholder="42" style={{ borderRadius: 10, height: 38 }} />
                                 </div>
                             </div>
                             <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                 <div className="form-group" style={{ marginBottom: 0 }}>
                                     <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Расстояние до города (км)</label>
                                     <input type="number" className="form-input" value={form.distance_to_city || ''} onChange={e => setF('distance_to_city', Number(e.target.value))} placeholder="10" style={{ borderRadius: 10, height: 38 }} />
                                 </div>
                                 <div className="form-group" style={{ marginBottom: 0 }}>
                                     <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Подъезд</label>
                                     <select className="form-select" value={form.road_access || ''} onChange={e => setF('road_access', e.target.value)} style={{ borderRadius: 10, height: 38 }}>
                                         <option value="">- Не указан -</option>
                                         <option value="asphalt">Асфальт</option>
                                         <option value="gravel">Гравий/щебень</option>
                                         <option value="dirt">Грунтовка</option>
                                         <option value="none">Нет дороги</option>
                                     </select>
                                 </div>
                             </div>
                         </div>

                         {/* Жилой дом */}
                         <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                             <div className="font-oswald" style={{ fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Жилой дом</div>
                             <ToggleChip label="Есть жилой дом" value={form.has_house} onChange={v => setF('has_house', v)} icon={<Home size={14} />} />
                             {form.has_house && (
                                 <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px', background: 'var(--bg-light)', borderRadius: 14 }}>
                                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                         <div className="form-group">
                                             <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Площадь (м²)</label>
                                             <input type="number" step="any" className="form-input" value={form.house_area || ''} onChange={e => {
                                                 const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                                                 setF('house_area', val);
                                                 setF('area_total', val);
                                             }} style={{ borderRadius: 12 }} />
                                         </div>
                                         <div className="form-group">
                                             <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Этажей</label>
                                             <input type="number" className="form-input" value={form.house_floors || ''} onChange={e => {
                                                 const val = Number(e.target.value);
                                                 setF('house_floors', val);
                                                 setF('floors_total', val);
                                             }} placeholder="1" style={{ borderRadius: 12 }} />
                                         </div>
                                         <div className="form-group">
                                             <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Год постройки</label>
                                             <input type="number" className="form-input" value={form.house_build_year || ''} onChange={e => {
                                                 const val = Number(e.target.value);
                                                 setF('house_build_year', val);
                                                 setF('build_year', val);
                                             }} style={{ borderRadius: 12 }} />
                                         </div>
                                     </div>
                                     <div className="form-group">
                                         <label className="form-label" style={{ fontWeight: 300, fontSize: 12 }}>Материал стен</label>
                                         <ChipGroup
                                             options={[
                                                 { val: 'wood', label: 'Дерево' },
                                                 { val: 'timber', label: 'Брус' },
                                                 { val: 'brick', label: 'Кирпич' },
                                                 { val: 'frame', label: 'Каркас' },
                                                 { val: 'block', label: 'Блок' },
                                             ]}
                                             value={form.house_material}
                                             onChange={val => setF('house_material', val)}
                                         />
                                     </div>
                                     <div className="form-group">
                                         <label className="form-label" style={{ fontWeight: 300, fontSize: 12 }}>Состояние дома</label>
                                         <ChipGroup
                                             options={[
                                                 { val: 'new', label: 'Новый' },
                                                 { val: 'good', label: 'Хорошее' },
                                                 { val: 'normal', label: 'Среднее' },
                                                 { val: 'renovation', label: 'Требует ремонта' },
                                             ]}
                                             value={form.house_condition}
                                             onChange={val => setF('house_condition', val)}
                                         />
                                     </div>

                                     {/* Кадастровый учёт жилого дома */}
                                     <div style={{ paddingTop: 6, borderTop: '1px solid var(--border-light)' }}>
                                         <ToggleChip 
                                             label="Стоит на кадастровом учёте" 
                                             value={form.house_has_cadastre} 
                                             onChange={v => {
                                                 setF('house_has_cadastre', v);
                                                 if (!v) setF('house_cadastral_number', '');
                                             }} 
                                         />
                                         {form.house_has_cadastre && (
                                             <div className="form-group" style={{ marginTop: 8 }}>
                                                 <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Кадастровый номер дома</label>
                                                 <input 
                                                     type="text" 
                                                     className="form-input" 
                                                     value={form.house_cadastral_number || ''} 
                                                     onChange={e => setF('house_cadastral_number', e.target.value)} 
                                                     placeholder="43:40:000000:00" 
                                                     style={{ borderRadius: 12 }} 
                                                 />
                                             </div>
                                         )}
                                     </div>
                                 </div>
                             )}
                         </div>

                         {/* Коммуникации */}
                         <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                             <div className="font-oswald" style={{ fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Коммуникации</div>
                             <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                 <ToggleChip label="Электричество" value={form.has_electricity} onChange={v => setF('has_electricity', v)} />
                                 <ToggleChip label="Водоснабжение" value={form.has_water} onChange={v => setF('has_water', v)} />
                                 <ToggleChip label="Газ" value={form.has_gas} onChange={v => setF('has_gas', v)} />
                                 <ToggleChip label="Канализация" value={form.has_sewage} onChange={v => setF('has_sewage', v)} />
                             </div>
                             {form.has_electricity && (
                                 <div className="form-group">
                                     <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Мощность (кВт)</label>
                                     <input type="number" className="form-input" value={form.electricity_kw || ''} onChange={e => setF('electricity_kw', Number(e.target.value))} placeholder="15" style={{ borderRadius: 12, maxWidth: 160 }} />
                                 </div>
                             )}
                             {form.has_water && (
                                 <div className="form-group">
                                     <label className="form-label" style={{ fontWeight: 300, fontSize: 12 }}>Тип водоснабжения (можно выбрать несколько)</label>
                                     <MultiChipGroup
                                         options={[
                                             { val: 'central', label: 'Центральное' },
                                             { val: 'well', label: 'Скважина' },
                                             { val: 'pit', label: 'Колодец' },
                                             { val: 'summer', label: 'Летний водопровод' },
                                         ]}
                                         value={form.water_types || (form.water_type ? [form.water_type] : [])}
                                         onChange={val => {
                                             setF('water_types', val);
                                             setF('water_type', val[0] || '');
                                         }}
                                     />
                                 </div>
                             )}
                             {form.has_gas && (
                                 <div className="form-group">
                                     <label className="form-label" style={{ fontWeight: 300, fontSize: 12 }}>Тип газоснабжения</label>
                                     <ChipGroup
                                         options={[
                                             { val: 'main', label: 'Магистральный' },
                                             { val: 'cylinder', label: 'Баллонный' },
                                         ]}
                                         value={form.gas_type}
                                         onChange={val => setF('gas_type', val)}
                                     />
                                 </div>
                             )}
                             {form.has_sewage && (
                                 <div className="form-group">
                                     <label className="form-label" style={{ fontWeight: 300, fontSize: 12 }}>Тип канализации</label>
                                     <ChipGroup
                                         options={[
                                             { val: 'central', label: 'Центральная' },
                                             { val: 'septic', label: 'Септик' },
                                             { val: 'pit', label: 'Выгребная яма' },
                                         ]}
                                         value={form.sewage_type}
                                         onChange={val => setF('sewage_type', val)}
                                     />
                                 </div>
                             )}
                         </div>

                         {/* Постройки и удобства */}
                         <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                             <div className="font-oswald" style={{ fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Постройки и удобства</div>
                             <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                 <ToggleChip label="Баня" value={form.has_bathhouse} onChange={v => setF('has_bathhouse', v)} />
                                 <ToggleChip label="Гараж" value={form.has_garage} onChange={v => setF('has_garage', v)} />
                                 <ToggleChip label="Беседка" value={form.has_gazebo} onChange={v => setF('has_gazebo', v)} />
                                 <ToggleChip label="Теплица" value={form.has_greenhouse} onChange={v => setF('has_greenhouse', v)} />
                                 <ToggleChip label="Скважина/Колодец" value={form.has_well} onChange={v => setF('has_well', v)} />
                                 <ToggleChip label="Летняя кухня" value={form.has_summer_kitchen} onChange={v => setF('has_summer_kitchen', v)} />
                                 <ToggleChip label="Водоём/Пруд" value={form.has_pond} onChange={v => setF('has_pond', v)} />
                             </div>
                             {form.has_garage && (
                                 <div className="form-group">
                                     <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Площадь гаража (м²)</label>
                                     <input type="number" className="form-input" value={form.garage_area || ''} onChange={e => setF('garage_area', Number(e.target.value))} style={{ borderRadius: 12, maxWidth: 160 }} />
                                 </div>
                             )}
                         </div>

                         {/* Забор */}
                         <div className="form-group">
                             <label className="form-label" style={{ fontWeight: 300, fontSize: 12 }}>Забор</label>
                             <ChipGroup
                                 options={[
                                     { val: 'none', label: 'Нет' },
                                     { val: 'partial', label: 'Частичный' },
                                     { val: 'full_metal', label: 'Металл' },
                                     { val: 'full_wood', label: 'Дерево' },
                                     { val: 'full_brick', label: 'Кирпич' },
                                     { val: 'full_proflist', label: 'Профлист' },
                                 ]}
                                 value={form.fence_type}
                                 onChange={val => setF('fence_type', val)}
                             />
                         </div>

                         {/* Заметки по саду */}
                         <div className="form-group">
                             <label className="form-label" style={{ fontWeight: 300, fontSize: 13 }}>Дополнительно по участку</label>
                             <textarea className="form-textarea" rows={3} value={form.garden_notes ?? ''} onChange={e => setF('garden_notes', e.target.value)} placeholder="Плодовые деревья, насаждения, особенности рельефа..." style={{ borderRadius: 16, resize: 'none' }} />
                         </div>
                     </FormCard>
                 )}

                {/* --- ХАРАКТЕРИСТИКИ ДОМА (для домов) --- */}
                {form.property_type === 'house' && (
                    <FormCard title="Характеристики дома" icon={<Home size={16} />}>
                        {/* 1. Конструктив дома */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div className="font-oswald" style={{ fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Дом и конструкция
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Год постройки</label>
                                    <input 
                                        type="number" 
                                        className="form-input" 
                                        value={form.build_year || form.house_build_year || ''} 
                                        onChange={e => {
                                            const v = Number(e.target.value);
                                            setF('build_year', v);
                                            setF('house_build_year', v);
                                        }} 
                                        placeholder="2018" 
                                        style={{ borderRadius: 12 }} 
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Высота потолков (м)</label>
                                    <input 
                                        type="number" 
                                        step="0.1" 
                                        className="form-input" 
                                        value={form.ceiling_height || ''} 
                                        onChange={e => setF('ceiling_height', Number(e.target.value))} 
                                        placeholder="2.8" 
                                        style={{ borderRadius: 12 }} 
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 300, fontSize: 12 }}>Материал стен</label>
                                <ChipGroup
                                    options={Object.entries(HOUSE_MATERIALS).map(([val, label]) => ({ val, label }))}
                                    value={form.house_material || form.building_type}
                                    onChange={val => {
                                        setF('house_material', val);
                                        setF('building_type', val === 'timber' ? 'wood' : val);
                                    }}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 300, fontSize: 12 }}>Состояние дома</label>
                                <ChipGroup
                                    options={Object.entries(HOUSE_CONDITIONS).map(([val, label]) => ({ val, label }))}
                                    value={form.house_condition}
                                    onChange={val => setF('house_condition', val)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 300, fontSize: 12 }}>Санузел</label>
                                <ChipGroup
                                    options={[
                                        { val: 'combined', label: 'В доме (совмещённый)' },
                                        { val: 'separate', label: 'В доме (раздельный)' },
                                        { val: 'two', label: '2 и более' },
                                        { val: 'outside', label: 'На улице' },
                                    ]}
                                    value={form.bathroom}
                                    onChange={val => setF('bathroom', val)}
                                />
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                <ToggleChip label="Мебель остаётся" value={form.furniture} onChange={v => setF('furniture', v)} icon={<Zap size={14} />} />
                                <ToggleChip 
                                    label="Дом стоит на кадастровом учёте" 
                                    value={form.house_has_cadastre} 
                                    onChange={v => {
                                        setF('house_has_cadastre', v);
                                        if (!v) setF('house_cadastral_number', '');
                                    }} 
                                />
                            </div>

                            {form.house_has_cadastre && (
                                <div className="form-group" style={{ marginTop: 4 }}>
                                    <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Кадастровый номер дома</label>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        value={form.house_cadastral_number || ''} 
                                        onChange={e => setF('house_cadastral_number', e.target.value)} 
                                        placeholder="43:40:000000:00" 
                                        style={{ borderRadius: 12 }} 
                                    />
                                </div>
                            )}
                        </div>

                        {/* 2. Земельный участок */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
                            <div className="font-oswald" style={{ fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Земельный участок
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Площадь участка (соток)</label>
                                    <input 
                                        type="number" 
                                        className="form-input" 
                                        value={form.land_area || ''} 
                                        onChange={e => setF('land_area', Number(e.target.value))} 
                                        placeholder="12" 
                                        style={{ borderRadius: 12 }} 
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Категория земли</label>
                                    <select 
                                        className="form-select" 
                                        value={form.land_category || ''} 
                                        onChange={e => setF('land_category', e.target.value)} 
                                        style={{ borderRadius: 12 }}
                                    >
                                        <option value="">- Не указана -</option>
                                        {Object.entries(LAND_CATEGORIES).map(([val, label]) => (
                                            <option key={val} value={val}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Расстояние до города (км)</label>
                                    <input 
                                        type="number" 
                                        className="form-input" 
                                        value={form.distance_to_city || ''} 
                                        onChange={e => setF('distance_to_city', Number(e.target.value))} 
                                        placeholder="10" 
                                        style={{ borderRadius: 12 }} 
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Подъездная дорога</label>
                                    <select 
                                        className="form-select" 
                                        value={form.road_access || ''} 
                                        onChange={e => setF('road_access', e.target.value)} 
                                        style={{ borderRadius: 12 }}
                                    >
                                        <option value="">- Не указан -</option>
                                        {Object.entries(ROAD_ACCESS).map(([val, label]) => (
                                            <option key={val} value={val}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 300, fontSize: 12 }}>Забор</label>
                                <ChipGroup
                                    options={Object.entries(FENCE_TYPES).map(([val, label]) => ({ val, label }))}
                                    value={form.fence_type}
                                    onChange={val => setF('fence_type', val)}
                                />
                            </div>
                        </div>

                        {/* 3. Коммуникации */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
                            <div className="font-oswald" style={{ fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Коммуникации
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                <ToggleChip label="Электричество" value={form.has_electricity} onChange={v => setF('has_electricity', v)} />
                                <ToggleChip label="Водоснабжение" value={form.has_water} onChange={v => setF('has_water', v)} />
                                <ToggleChip label="Газ" value={form.has_gas} onChange={v => setF('has_gas', v)} />
                                <ToggleChip label="Канализация" value={form.has_sewage} onChange={v => setF('has_sewage', v)} />
                            </div>

                            {form.has_electricity && (
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Мощность электричества (кВт)</label>
                                    <input 
                                        type="number" 
                                        className="form-input" 
                                        value={form.electricity_kw || ''} 
                                        onChange={e => setF('electricity_kw', Number(e.target.value))} 
                                        placeholder="15" 
                                        style={{ borderRadius: 12, maxWidth: 180 }} 
                                    />
                                </div>
                            )}

                            {form.has_water && (
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: 300, fontSize: 12 }}>Тип водоснабжения</label>
                                    <MultiChipGroup
                                        options={Object.entries(WATER_TYPES).map(([val, label]) => ({ val, label }))}
                                        value={form.water_types || (form.water_type ? [form.water_type] : [])}
                                        onChange={val => {
                                            setF('water_types', val);
                                            setF('water_type', val[0] || '');
                                        }}
                                    />
                                </div>
                            )}

                            {form.has_gas && (
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: 300, fontSize: 12 }}>Тип газоснабжения</label>
                                    <ChipGroup
                                        options={Object.entries(GAS_TYPES).map(([val, label]) => ({ val, label }))}
                                        value={form.gas_type}
                                        onChange={val => setF('gas_type', val)}
                                    />
                                </div>
                            )}

                            {form.has_sewage && (
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: 300, fontSize: 12 }}>Тип канализации</label>
                                    <ChipGroup
                                        options={Object.entries(SEWAGE_TYPES).map(([val, label]) => ({ val, label }))}
                                        value={form.sewage_type}
                                        onChange={val => setF('sewage_type', val)}
                                    />
                                </div>
                            )}
                        </div>

                        {/* 4. Постройки и удобства */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
                            <div className="font-oswald" style={{ fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Постройки и удобства
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                <ToggleChip label="Баня / Сауна" value={form.has_bathhouse} onChange={v => setF('has_bathhouse', v)} />
                                <ToggleChip label="Гараж" value={form.has_garage} onChange={v => setF('has_garage', v)} />
                                <ToggleChip label="Беседка" value={form.has_gazebo} onChange={v => setF('has_gazebo', v)} />
                                <ToggleChip label="Теплица" value={form.has_greenhouse} onChange={v => setF('has_greenhouse', v)} />
                                <ToggleChip label="Скважина/Колодец" value={form.has_well} onChange={v => setF('has_well', v)} />
                                <ToggleChip label="Летняя кухня" value={form.has_summer_kitchen} onChange={v => setF('has_summer_kitchen', v)} />
                                <ToggleChip label="Водоём / Бассейн" value={form.has_pond} onChange={v => setF('has_pond', v)} />
                            </div>
                            {form.has_garage && (
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Площадь гаража (м²)</label>
                                    <input 
                                        type="number" 
                                        className="form-input" 
                                        value={form.garage_area || ''} 
                                        onChange={e => setF('garage_area', Number(e.target.value))} 
                                        placeholder="24" 
                                        style={{ borderRadius: 12, maxWidth: 180 }} 
                                    />
                                </div>
                            )}
                        </div>

                        {/* 5. Дополнительно */}
                        <div className="form-group" style={{ paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
                            <label className="form-label" style={{ fontWeight: 300, fontSize: 13 }}>Дополнительно по дому и участку</label>
                            <textarea 
                                className="form-textarea" 
                                rows={3} 
                                value={form.garden_notes ?? ''} 
                                onChange={e => setF('garden_notes', e.target.value)} 
                                placeholder="Особенности дома, участка, рельеф, насаждения, соседи..." 
                                style={{ borderRadius: 16, resize: 'none' }} 
                            />
                        </div>
                    </FormCard>
                )}

                {/* --- ХАРАКТЕРИСТИКИ КОММЕРЧЕСКОГО ПОМЕЩЕНИЯ (для коммерции) --- */}
                {form.property_type === 'commercial' && (
                    <FormCard 
                        title="Характеристики коммерции" 
                        icon={<Briefcase size={16} />}
                    >
                        {/* 1. Назначение и размещение */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div className="font-oswald" style={{ fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Назначение и расположение
                            </div>
                            
                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 300, fontSize: 12 }}>Тип назначения помещения</label>
                                <ChipGroup
                                    options={Object.entries(COMMERCIAL_TYPES).map(([val, label]) => ({ val, label }))}
                                    value={form.commercial_type || 'free_purpose'}
                                    onChange={val => setF('commercial_type', val)}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: 300, fontSize: 12 }}>Линия домов</label>
                                    <ChipGroup
                                        options={Object.entries(LOCATION_LINES).map(([val, label]) => ({ val, label }))}
                                        value={form.location_line || 'first_line'}
                                        onChange={val => setF('location_line', val)}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: 300, fontSize: 12 }}>Вход в помещение</label>
                                    <select 
                                        className="form-select" 
                                        value={form.entrance_type || 'separate_street'} 
                                        onChange={e => setF('entrance_type', e.target.value)}
                                        style={{ borderRadius: 12 }}
                                    >
                                        {Object.entries(ENTRANCE_TYPES).map(([val, label]) => (
                                            <option key={val} value={val}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                                <ToggleChip 
                                    label="Витринные окна" 
                                    value={form.has_shop_windows} 
                                    onChange={v => setF('has_shop_windows', v)} 
                                />
                                <ToggleChip 
                                    label="Круглосуточный доступ 24/7" 
                                    value={form.access_24_7} 
                                    onChange={v => setF('access_24_7', v)} 
                                />
                                <ToggleChip 
                                    label="Зона разгрузки / дебаркадер" 
                                    value={form.has_loading_zone} 
                                    onChange={v => setF('has_loading_zone', v)} 
                                />
                                <ToggleChip 
                                    label="Мебель / торговое оборудование" 
                                    value={form.furniture} 
                                    onChange={v => setF('furniture', v)} 
                                    icon={<Zap size={14} />} 
                                />
                            </div>
                        </div>

                        {/* 2. Инженерия и коммуникации */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
                            <div className="font-oswald" style={{ fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Инженерия и коммуникации
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Эл. мощность (кВт)</label>
                                    <input 
                                        type="number" 
                                        className="form-input" 
                                        value={form.electricity_kw || ''} 
                                        onChange={e => setF('electricity_kw', Number(e.target.value))} 
                                        placeholder="15" 
                                        style={{ borderRadius: 12 }} 
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Высота потолков (м)</label>
                                    <input 
                                        type="number" 
                                        step="0.1" 
                                        className="form-input" 
                                        value={form.ceiling_height || ''} 
                                        onChange={e => setF('ceiling_height', Number(e.target.value))} 
                                        placeholder="3.2" 
                                        style={{ borderRadius: 12 }} 
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Мокрые точки (шт)</label>
                                    <input 
                                        type="number" 
                                        className="form-input" 
                                        value={form.wet_points ?? 1} 
                                        onChange={e => setF('wet_points', Number(e.target.value))} 
                                        placeholder="1" 
                                        style={{ borderRadius: 12 }} 
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label" style={{ fontWeight: 300, fontSize: 12 }}>Вентиляция</label>
                                <ChipGroup
                                    options={Object.entries(VENTILATION_TYPES).map(([val, label]) => ({ val, label }))}
                                    value={form.ventilation_type || 'forced'}
                                    onChange={val => setF('ventilation_type', val)}
                                />
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                <ToggleChip label="Водоснабжение" value={form.has_water} onChange={v => setF('has_water', v)} />
                                <ToggleChip label="Канализация" value={form.has_sewage} onChange={v => setF('has_sewage', v)} />
                                <ToggleChip label="Газоснабжение" value={form.has_gas} onChange={v => setF('has_gas', v)} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Тип здания / постройки</label>
                                    <select 
                                        className="form-select" 
                                        value={form.building_type || ''} 
                                        onChange={e => setF('building_type', e.target.value)} 
                                        style={{ borderRadius: 12 }}
                                    >
                                        <option value="">- Не указан -</option>
                                        {Object.entries(BUILDING_TYPES).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Парковка</label>
                                    <select 
                                        className="form-select" 
                                        value={form.parking || 'none'} 
                                        onChange={e => setF('parking', e.target.value)} 
                                        style={{ borderRadius: 12 }}
                                    >
                                        <option value="none">Нет</option>
                                        <option value="ground">Наземная открытая</option>
                                        <option value="barrier">Под шлагбаумом / охраняемая</option>
                                        <option value="underground">Подземный паркинг</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* 3. Готовый арендный бизнес (ГАБ) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
                            <div className="font-oswald" style={{ fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Аренда и доходность (ГАБ)
                            </div>
                            
                            <ToggleChip 
                                label="Объект сдан в аренду (есть действующий арендатор)" 
                                value={form.has_tenant} 
                                onChange={v => setF('has_tenant', v)} 
                            />

                            {form.has_tenant && (
                                <div style={{ 
                                    display: 'flex', flexDirection: 'column', gap: 12, 
                                    padding: '16px', background: 'var(--bg-light)', borderRadius: 16 
                                }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                        <div className="form-group">
                                            <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Арендная плата в месяц (₽)</label>
                                            <PriceInput 
                                                value={form.rental_income || ''} 
                                                onChange={val => setF('rental_income', val)} 
                                                placeholder="80 000" 
                                                style={{ borderRadius: 12 }} 
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label" style={{ fontSize: 12, fontWeight: 300 }}>Годовой арендный поток</label>
                                            <div style={{ 
                                                height: 42, display: 'flex', alignItems: 'center', 
                                                padding: '0 12px', background: 'var(--surface)', borderRadius: 12,
                                                fontSize: 14, fontWeight: 500, color: 'var(--primary)'
                                            }}>
                                                {form.rental_income ? `${(Number(form.rental_income) * 12).toLocaleString('ru-RU')} ₽ / год` : '-'}
                                            </div>
                                        </div>
                                    </div>

                                    {form.price > 0 && form.rental_income > 0 && (
                                        <div style={{ 
                                            fontSize: 12, color: 'var(--success)', background: 'rgba(16, 185, 129, 0.08)', 
                                            padding: '8px 12px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 8 
                                        }}>
                                            <Check size={14} />
                                            <span>
                                                Расчётная доходность: <strong>{((Number(form.rental_income) * 12 / Number(form.price)) * 100).toFixed(1)}% годовых</strong> (окупаемость ~{(Number(form.price) / (Number(form.rental_income) * 12)).toFixed(1)} лет)
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 4. Дополнительно */}
                        <div className="form-group" style={{ paddingTop: 12, borderTop: '1px solid var(--border-light)' }}>
                            <label className="form-label" style={{ fontWeight: 300, fontSize: 13 }}>Дополнительные особенности коммерции</label>
                            <textarea 
                                className="form-textarea" 
                                rows={3} 
                                value={form.commercial_notes ?? ''} 
                                onChange={e => setF('commercial_notes', e.target.value)} 
                                placeholder="Пешеходный/автомобильный трафик, возможность размещения фасадной вывески, отдельный вентканал..." 
                                style={{ borderRadius: 16, resize: 'none' }} 
                            />
                        </div>
                    </FormCard>
                )}

                {/* --- ХАРАКТЕРИСТИКИ ДОМА (для квартир, комнат) --- */}
                {form.property_type !== 'garden' && form.property_type !== 'house' && form.property_type !== 'commercial' && (
                <FormCard title="Характеристики дома" icon={<Building size={16} />}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>Год постройки</label>
                            <input type="number" className="form-input" value={form.build_year || ''} onChange={e => setF('build_year', Number(e.target.value))} placeholder="2000" style={{ borderRadius: 10, height: 38, fontSize: 13 }} />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 4 }}>Тип дома</label>
                            <select className="form-select" value={form.building_type || ''} onChange={e => setF('building_type', e.target.value)} style={{ borderRadius: 10, height: 38, fontSize: 13 }}>
                                <option value="">- Не указан -</option>
                                {Object.entries(BUILDING_TYPES).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Лифт</label>
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

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                        <ToggleChip label="Мусоропровод" value={form.has_garbage_chute} onChange={v => setF('has_garbage_chute', v)} icon={<Trash2 size={13} />} />
                        <ToggleChip label="Мебель" value={form.furniture} onChange={v => setF('furniture', v)} icon={<Zap size={13} />} />
                    </div>
                </FormCard>
                )}

                    </div>

                    {/* --- ПРАВАЯ КОЛОНКА (Условия, Владельцы, Фото) --- */}
                    <div className="form-col-side">
                {/* Цена */}
                <FormCard 
                    title="Цена и комиссия" 
                    icon={<DollarSign size={16} />}
                    action={
                        form.price > 0 && form.area_total > 0 && (
                            <span style={{ 
                                color: 'var(--primary)', 
                                fontWeight: 700, 
                                fontSize: 12,
                                background: 'var(--primary-light)',
                                padding: '3px 8px',
                                borderRadius: 8
                            }}>
                                {Math.round(form.price / form.area_total).toLocaleString()} ₽/м²
                            </span>
                        )
                    }
                >
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 600, fontSize: 12, color: 'var(--text)', marginBottom: 4 }}>
                            Цена объекта (₽)
                        </label>
                        <PriceInput
                            style={{ fontSize: 17, fontWeight: 700, color: 'var(--primary)', borderRadius: 12, height: 42 }}
                            value={form.price || ''}
                            onChange={val => setF('price', val)}
                            placeholder="0"
                        />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Мин. цена (торг)</label>
                            <PriceInput
                                style={{ color: 'var(--text-muted)', borderRadius: 10, height: 38, fontSize: 13 }}
                                value={form.price_min || ''}
                                onChange={val => setF('price_min', val)}
                                placeholder="Торг"
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label className="form-label" style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Комиссия (₽)</label>
                            <PriceInput
                                style={{ borderRadius: 10, height: 38, fontSize: 13 }}
                                value={form.commission || ''}
                                onChange={val => setF('commission', val)}
                                placeholder="0"
                            />
                        </div>
                    </div>
                </FormCard>

                {/* Условия сделки */}
                <FormCard title="Условия сделки" icon={<Briefcase size={16} />}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        <ToggleChip label="Ипотека" value={form.mortgage} onChange={v => { setF('mortgage', v); setF('mortgage_available', v); }} />
                        <ToggleChip label="Маткапитал" value={form.matcapital_available} onChange={v => setF('matcapital_available', v)} />
                        <ToggleChip label="Сертификат" value={form.certificate_available} onChange={v => setF('certificate_available', v)} />
                        <ToggleChip label="Обременение" value={form.encumbrance} onChange={v => setF('encumbrance', v)} />
                        <ToggleChip label="Несоверш. собств." value={form.minor_owners} onChange={v => setF('minor_owners', v)} />
                        <ToggleChip label="Документы готовы" value={form.docs_ready} onChange={v => setF('docs_ready', v)} />
                        <ToggleChip label="Альтернатива" value={form.seeking_alternative} onChange={v => setF('seeking_alternative', v)} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, marginTop: 4 }}>
                        <label className="form-label" style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Заметки риэлтора</label>
                        <textarea className="form-textarea" rows={2} value={form.notes ?? ''} onChange={e => setF('notes', e.target.value)} placeholder="Нюансы сделки, контакты..." style={{ borderRadius: 12, resize: 'none', fontSize: 12.5 }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Package size={13} style={{ color: 'var(--primary)' }} />
                            <span>Список имущества</span>
                        </label>
                        <textarea
                            className="form-textarea"
                            rows={2}
                            value={form.movable_property ?? ''}
                            onChange={e => setF('movable_property', e.target.value)}
                            placeholder="Мебель, техника (для Акта приёма-передачи)..."
                            style={{ borderRadius: 12, resize: 'vertical', fontSize: 12.5 }}
                        />
                    </div>
                </FormCard>

                {/* Фотографии */}
                <FormCard 
                    title="Фотографии" 
                    icon={<Camera size={16} />}
                    action={<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(form.images || []).length} фото</span>}
                >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                        {(form.images || []).map((url, index) => (
                            <div key={index} className="fade-in" style={{ position: 'relative', paddingTop: '100%', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                                <img src={url} alt={`Фото ${index + 1}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                                <button
                                    type="button"
                                    onClick={() => handleRemoveImage(index)}
                                    style={{
                                        position: 'absolute', top: 4, right: 4,
                                        width: 22, height: 22, borderRadius: '50%',
                                        background: 'rgba(220,38,38,0.9)', color: 'white',
                                        border: 'none', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 12, backdropFilter: 'blur(4px)'
                                    }}
                                >
                                    <Trash2 size={12} />
                                </button>
                                {index === 0 && (
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,82,255,0.85)', color: 'white', fontSize: 9, fontWeight: 600, textAlign: 'center', padding: '1px 0', letterSpacing: '0.04em' }}>
                                        ОБЛОЖКА
                                    </div>
                                )}
                            </div>
                        ))}
                        <label
                            style={{
                                position: 'relative', paddingTop: '100%', borderRadius: 12,
                                border: '1.5px dashed var(--border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: uploading ? 'wait' : 'pointer',
                                background: 'var(--bg-light)', transition: 'all 0.2s'
                            }}
                            className="upload-label-hover"
                        >
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                {uploading ? <div className="spinner" style={{ width: 18, height: 18 }}></div> : <><Upload size={18} /><span style={{ fontSize: 9.5, fontWeight: 500, marginTop: 3 }}>+ ФОТО</span></>}
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

                {/* Планировка */}
                <FormCard 
                    title="Планировка" 
                    icon={<Layers size={16} />}
                    action={<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(form.floorplan_images || []).length} фото</span>}
                >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                        {(form.floorplan_images || []).map((url, index) => (
                            <div key={index} className="fade-in" style={{ position: 'relative', paddingTop: '100%', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                                <img src={url} alt={`Планировка ${index + 1}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain', background: 'var(--bg-light)' }} />
                                <button
                                    type="button"
                                    onClick={() => handleRemoveFloorplan(index)}
                                    style={{
                                        position: 'absolute', top: 4, right: 4,
                                        width: 22, height: 22, borderRadius: '50%',
                                        background: 'rgba(220,38,38,0.9)', color: 'white',
                                        border: 'none', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 12, backdropFilter: 'blur(4px)'
                                    }}
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                        <label
                            style={{
                                position: 'relative', paddingTop: '100%', borderRadius: 12,
                                border: '1.5px dashed var(--border)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: uploadingFloorplan ? 'wait' : 'pointer',
                                background: 'var(--bg-light)', transition: 'all 0.2s'
                            }}
                            className="upload-label-hover"
                        >
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                {uploadingFloorplan ? <div className="spinner" style={{ width: 18, height: 18 }}></div> : <><Upload size={18} /><span style={{ fontSize: 9.5, fontWeight: 500, marginTop: 3 }}>+ СХЕМА</span></>}
                            </div>
                            <input
                                ref={floorplanInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                style={{ display: 'none' }}
                                onChange={handleFloorplanUpload}
                                disabled={uploadingFloorplan}
                            />
                        </label>
                    </div>
                </FormCard>

                    </div>
                </div>

                <div className="form-submit-container" style={{ marginTop: 14, marginBottom: 28 }}>
                    <button type="submit" className="form-submit-btn btn-primary card-clickable" style={{ height: 48, borderRadius: 14, fontSize: 14, fontWeight: 600 }}>
                        {id ? 'Сохранить изменения' : 'Опубликовать объект'}
                    </button>
                </div>
            </form>

            {/* Quick Agent Modal - Premium Open Design */}
            {showQuickAgentForm && (() => {
                const agentDups = findDuplicateClients(state.clients, quickAgent);
                const matches = [...agentDups.phoneMatches, ...agentDups.nameMatches];
                return (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 1000,
                        background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px) saturate(180%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 24
                    }}>
                        <div className="card fade-in" style={{ width: '100%', maxWidth: 440, padding: 32, borderRadius: 32, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.2)' }}>
                            <div className="font-oswald" style={{ fontWeight: 300, fontSize: 20, marginBottom: 24, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text)' }}>Новый агент</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ФИО</label>
                                    <input 
                                        className="form-input" 
                                        autoFocus
                                        value={quickAgent.full_name} 
                                        onChange={e => setQuickAgent({ ...quickAgent, full_name: e.target.value })} 
                                        placeholder="Иванов Иван Иванович"
                                        style={{ height: 52, borderRadius: 14 }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Телефон</label>
                                    <input 
                                        type="tel"
                                        inputMode="tel"
                                        className="form-input" 
                                        value={quickAgent.phone} 
                                        onChange={e => setQuickAgent({ ...quickAgent, phone: formatPhone(e.target.value, true) })} 
                                        placeholder="+7 (___) ___-__-__"
                                        style={{ height: 52, borderRadius: 14 }}
                                    />
                                </div>

                                {matches.length > 0 && (
                                    <div style={{ padding: 12, borderRadius: 14, background: '#FFFBEB', border: '1px solid #F59E0B', fontSize: 13 }}>
                                        <div style={{ fontWeight: 600, color: '#B45309', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <AlertTriangle size={16} /> Найдено совпадение в базе ({matches.length}):
                                        </div>
                                        {matches.slice(0, 3).map(m => (
                                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6, padding: '8px 10px', background: 'white', borderRadius: 10, border: '1px solid rgba(0,0,0,0.05)' }}>
                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                    <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.full_name || 'Без имени'}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{m.phone || 'Без телефона'}</div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary card-clickable"
                                                        style={{ fontSize: 11, padding: '4px 10px', height: 32, borderRadius: 8, whiteSpace: 'nowrap', background: 'var(--primary)', color: 'white' }}
                                                        onClick={() => handleReplaceQuickAgent(m)}
                                                    >
                                                        Заменить на новый
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary card-clickable"
                                                        style={{ fontSize: 11, padding: '4px 10px', height: 32, borderRadius: 8, whiteSpace: 'nowrap' }}
                                                        onClick={() => {
                                                            setF('agent_id', m.id);
                                                            setShowQuickAgentForm(false);
                                                            setQuickAgent({ full_name: '', phone: '' });
                                                            toast.info(`Выбран агент ${m.full_name}`);
                                                        }}
                                                    >
                                                        Выбрать
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                                    <button type="button" className="btn btn-secondary card-clickable" style={{ flex: 1, height: 52, borderRadius: 14, fontWeight: 300 }} onClick={() => setShowQuickAgentForm(false)}>Отмена</button>
                                    <button type="button" className="btn btn-primary card-clickable" style={{ flex: 1, height: 52, borderRadius: 14, fontWeight: 300, background: 'var(--primary)', boxShadow: '0 8px 16px rgba(0,82,255,0.15)' }} onClick={handleCreateQuickAgent}>Создать</button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Quick Owner Modal */}
            {showQuickOwnerForm && (() => {
                const ownerDups = findDuplicateClients(state.clients, quickOwner);
                const matches = [...ownerDups.phoneMatches, ...ownerDups.nameMatches];
                return (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 1000,
                        background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px) saturate(180%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: 24
                    }}>
                        <div className="card fade-in" style={{ width: '100%', maxWidth: 440, padding: 32, borderRadius: 32, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.2)' }}>
                            <div className="font-oswald" style={{ fontWeight: 300, fontSize: 20, marginBottom: 24, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text)' }}>Новый собственник</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ФИО / Имя</label>
                                    <input 
                                        className="form-input" 
                                        autoFocus
                                        value={quickOwner.full_name} 
                                        onChange={e => setQuickOwner({ ...quickOwner, full_name: e.target.value })} 
                                        placeholder="Петров Петр Петрович"
                                        style={{ height: 52, borderRadius: 14 }}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Телефон</label>
                                    <input 
                                        type="tel"
                                        inputMode="tel"
                                        className="form-input" 
                                        value={quickOwner.phone} 
                                        onChange={e => setQuickOwner({ ...quickOwner, phone: formatPhone(e.target.value, true) })} 
                                        placeholder="+7 (___) ___-__-__"
                                        style={{ height: 52, borderRadius: 14 }}
                                    />
                                </div>

                                {matches.length > 0 && (
                                    <div style={{ padding: 12, borderRadius: 14, background: '#FFFBEB', border: '1px solid #F59E0B', fontSize: 13 }}>
                                        <div style={{ fontWeight: 600, color: '#B45309', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <AlertTriangle size={16} /> Найдено совпадение в базе ({matches.length}):
                                        </div>
                                        {matches.slice(0, 3).map(m => (
                                            <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6, padding: '8px 10px', background: 'white', borderRadius: 10, border: '1px solid rgba(0,0,0,0.05)' }}>
                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                    <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.full_name || 'Без имени'}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{m.phone || 'Без телефона'}</div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                                    <button
                                                        type="button"
                                                        className="btn btn-primary card-clickable"
                                                        style={{ fontSize: 11, padding: '4px 10px', height: 32, borderRadius: 8, whiteSpace: 'nowrap', background: 'var(--primary)', color: 'white' }}
                                                        onClick={() => handleReplaceQuickOwner(m)}
                                                    >
                                                        Заменить на новый
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-secondary card-clickable"
                                                        style={{ fontSize: 11, padding: '4px 10px', height: 32, borderRadius: 8, whiteSpace: 'nowrap' }}
                                                        onClick={() => {
                                                            if (!form.client_ids?.includes(m.id)) {
                                                                setF('client_ids', [...(form.client_ids || []), m.id]);
                                                            }
                                                            setShowQuickOwnerForm(false);
                                                            setQuickOwner({ full_name: '', phone: '' });
                                                            toast.info(`Добавлен собственник ${m.full_name}`);
                                                        }}
                                                    >
                                                        Выбрать
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                                    <button type="button" className="btn btn-secondary card-clickable" style={{ flex: 1, height: 52, borderRadius: 14, fontWeight: 300 }} onClick={() => setShowQuickOwnerForm(false)}>Отмена</button>
                                    <button type="button" className="btn btn-primary card-clickable" style={{ flex: 1, height: 52, borderRadius: 14, fontWeight: 300, background: 'var(--primary)', boxShadow: '0 8px 16px rgba(0,82,255,0.15)' }} onClick={handleCreateQuickOwner}>Создать</button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            <ExtensionInstallModal 
                isOpen={showExtensionModal} 
                onClose={() => setShowExtensionModal(false)} 
            />
        </div>
    );
}
