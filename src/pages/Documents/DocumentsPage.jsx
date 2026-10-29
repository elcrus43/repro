import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { 
    ChevronLeft, Printer, FileText, Download, User, Building2, Briefcase, 
    ChevronDown, ChevronUp, Search, Save, CheckCircle2, AlertCircle, Sparkles, Check, Loader2,
    UserPlus, X, Calendar, Plus, Key, Edit3, RotateCcw, Undo2, Redo2
} from 'lucide-react';
import { generateAndDownloadDocx, getDocumentTemplates, DOCUMENT_CATEGORIES, numberToWordsRu, formatPropertyKind, getPropertyKindForms } from '../../utils/docxGenerator';
import { formatPhone, stripPhone, parsePgArray, formatUnitCode, formatPassportInput, parsePassportInput, formatPassportDisplay } from '../../utils/format';
import { YUSS_BUY_1_LOGO_BASE64 } from '../../assets/templates/yuss_buy_1_logo.base64';
import { buildSlotValues, injectDataIntoTemplateHtml, sanitizeTemplateForSaving, toShortName } from './templateUtils';
import { GlobalSearch } from '../../components/GlobalSearch';

/* ─── Иконки шаблонов ─────────────────────────────────────────────────────── */
const TEMPLATE_ICONS = {
    yuss_buy_1: <Briefcase size={16} />,
    agency_sale_1: <Building2 size={16} />,
    agency_rent_landlord_1: <Key size={16} />,
    services_rent_3party: <Briefcase size={16} />,
    sale: <FileText size={16} />,
    rent: <FileText size={16} />,
    act: <FileText size={16} />,
    key_act: <Key size={16} />,
};

/* ─── Предпросмотр данных для подстановки ─────────────────────────────────── */
function DataPreview({ label, value }) {
    if (!value) return null;
    return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', paddingBottom: 8, borderBottom: '1px solid var(--border-light)' }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 120, flexShrink: 0, paddingTop: 2 }}>{label}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', lineHeight: 1.4 }}>{value}</span>
        </div>
    );
}

/* ─── Поиск клиента с возможностью быстрого добавления ───────────────────── */
function ClientSearch({ clients, value, onChange, placeholder, onAddNew, addLabel = 'Новый клиент' }) {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');

    const filtered = useMemo(() => {
        if (!q) return clients.slice(0, 20);
        const lq = q.toLowerCase();
        return clients.filter(c =>
            (c.full_name || '').toLowerCase().includes(lq) ||
            (c.phone || '').includes(q)
        ).slice(0, 20);
    }, [clients, q]);

    const selected = clients.find(c => c.id === value);

    return (
        <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: 6 }}>
                <button
                    type="button"
                    className="form-input"
                    style={{
                        flex: 1, textAlign: 'left', display: 'flex',
                        justifyContent: 'space-between', alignItems: 'center',
                        height: 36, borderRadius: 9, cursor: 'pointer',
                        color: selected ? 'var(--text)' : 'var(--text-secondary)',
                        fontSize: 12.5, padding: '0 10px'
                    }}
                    onClick={() => setOpen(o => !o)}
                >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {selected ? selected.full_name : placeholder}
                    </span>
                    {open ? <ChevronUp size={14} style={{ flexShrink: 0 }} /> : <ChevronDown size={14} style={{ flexShrink: 0 }} />}
                </button>
                {onAddNew && (
                    <button
                        type="button"
                        className="card-clickable"
                        title="Создать нового клиента"
                        onClick={() => onAddNew('')}
                        style={{
                            height: 36,
                            padding: '0 10px',
                            borderRadius: 9,
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11.5,
                            fontWeight: 600,
                            cursor: 'pointer',
                            flexShrink: 0,
                        }}
                    >
                        <UserPlus size={14} />
                        <span>+ Создать</span>
                    </button>
                )}
            </div>

            {open && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                    background: 'var(--surface)', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                    border: '1px solid var(--border)', marginTop: 4, overflow: 'hidden',
                }}>
                    <div style={{ padding: 8, borderBottom: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', borderRadius: 10, padding: '6px 10px' }}>
                            <Search size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
                            <input
                                autoFocus
                                value={q}
                                onChange={e => setQ(e.target.value)}
                                placeholder="Поиск по имени или телефону..."
                                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: 'var(--text)', width: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Пункт быстрого создания прямо в выпадающем меню */}
                    {onAddNew && (
                        <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-light)', background: 'rgba(0, 82, 255, 0.03)' }}>
                            <button
                                type="button"
                                className="card-clickable"
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 8,
                                    padding: '9px 12px',
                                    borderRadius: 10,
                                    border: '1px dashed var(--primary)',
                                    background: 'rgba(0, 82, 255, 0.06)',
                                    color: 'var(--primary)',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                }}
                                onClick={() => {
                                    setOpen(false);
                                    onAddNew(q);
                                }}
                            >
                                <UserPlus size={15} />
                                <span>+ {addLabel}{q ? ` «${q}»` : ''}</span>
                            </button>
                        </div>
                    )}

                    <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                        <button
                            type="button"
                            className="card-clickable"
                            style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'none', border: 'none', fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}
                            onClick={() => { onChange(null); setOpen(false); setQ(''); }}
                        >
                            — Не выбрано
                        </button>
                        {filtered.map(c => (
                            <button
                                key={c.id}
                                type="button"
                                className="card-clickable"
                                style={{
                                    width: '100%', textAlign: 'left', padding: '10px 14px',
                                    background: value === c.id ? 'var(--primary-light)' : 'none',
                                    border: 'none', fontSize: 13, color: 'var(--text)', cursor: 'pointer',
                                    display: 'flex', flexDirection: 'column', gap: 2,
                                }}
                                onClick={() => { onChange(c.id); setOpen(false); setQ(''); }}
                            >
                                <span style={{ fontWeight: 500 }}>{c.full_name || 'Без имени'}</span>
                                {c.phone && <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{formatPhone(c.phone)}</span>}
                            </button>
                        ))}
                        {filtered.length === 0 && (
                            <div style={{ padding: '14px', textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)' }}>
                                <p style={{ margin: '0 0 8px 0' }}>Клиент не найден</p>
                                {onAddNew && (
                                    <button
                                        type="button"
                                        className="card-clickable"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '6px 14px',
                                            borderRadius: 8,
                                            background: 'var(--primary)',
                                            color: 'white',
                                            border: 'none',
                                            fontSize: 12,
                                            fontWeight: 600,
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => {
                                            setOpen(false);
                                            onAddNew(q);
                                        }}
                                    >
                                        <UserPlus size={13} />
                                        Создать «{q}»
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Модальное окно быстрого добавления клиента ───────────────────────────── */
function QuickClientModal({ isOpen, onClose, initialName = '', role = 'buyer', onCreated }) {
    const { state, dispatch } = useApp();
    const { toast } = useToastContext();
    const [fullName, setFullName] = useState(initialName);
    const [phone, setPhone] = useState('');
    const [clientType, setClientType] = useState(role);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setFullName(initialName || '');
            setPhone('');
            setClientType(role || 'buyer');
        }
    }, [isOpen, initialName, role]);

    if (!isOpen) return null;

    const handleSave = async (e) => {
        e.preventDefault();
        if (!fullName.trim()) {
            toast?.error?.('Укажите ФИО клиента');
            return;
        }

        setSaving(true);
        try {
            const newClient = {
                id: `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                full_name: fullName.trim(),
                phone: stripPhone(phone) || phone.trim(),
                client_types: [clientType],
                status: 'active',
                realtor_id: state.currentUser?.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                passport_details: {},
                bank_details: {},
            };

            const res = await dispatch({ type: 'ADD_CLIENT', client: newClient });
            if (res !== false) {
                toast?.success?.('Клиент успешно добавлен!');
                onCreated(newClient);
                onClose();
            }
        } catch (err) {
            console.error('Failed to create quick client:', err);
            toast?.error?.('Не удалось создать клиента');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
        }}>
            <div style={{
                background: 'var(--surface)', borderRadius: 24, maxWidth: 440, width: '100%',
                padding: 24, border: '1px solid var(--border)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                display: 'flex', flexDirection: 'column', gap: 16, animation: 'fadeIn 0.2s ease-out'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: 'rgba(0, 82, 255, 0.1)', color: 'var(--primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <UserPlus size={18} />
                        </div>
                        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                            Быстрое добавление клиента
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'none', border: 'none', color: 'var(--text-secondary)',
                            cursor: 'pointer', padding: 4, display: 'flex'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                            ФИО клиента *
                        </label>
                        <input
                            autoFocus
                            className="form-input"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            placeholder="Иванов Иван Иванович"
                            required
                            style={{ width: '100%', height: 42, borderRadius: 12, fontSize: 13 }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                            Телефон
                        </label>
                        <input
                            type="tel"
                            inputMode="tel"
                            className="form-input"
                            value={phone}
                            onChange={e => setPhone(formatPhone(e.target.value, true))}
                            placeholder="+7 (___) ___-__-__"
                            style={{ width: '100%', height: 42, borderRadius: 12, fontSize: 13 }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                            Роль клиента
                        </label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {[
                                { id: 'buyer', label: 'Покупатель' },
                                { id: 'seller', label: 'Продавец' },
                            ].map(t => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setClientType(t.id)}
                                    style={{
                                        flex: 1, height: 36, borderRadius: 10, border: '1px solid',
                                        borderColor: clientType === t.id ? 'var(--primary)' : 'var(--border)',
                                        background: clientType === t.id ? 'rgba(0,82,255,0.08)' : 'var(--bg)',
                                        color: clientType === t.id ? 'var(--primary)' : 'var(--text)',
                                        fontSize: 12, fontWeight: clientType === t.id ? 600 : 400,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                flex: 1, height: 42, borderRadius: 12, border: '1px solid var(--border)',
                                background: 'var(--surface)', color: 'var(--text)', fontSize: 13,
                                fontWeight: 500, cursor: 'pointer'
                            }}
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            style={{
                                flex: 1.5, height: 42, borderRadius: 12, border: 'none',
                                background: 'var(--primary)', color: 'white', fontSize: 13,
                                fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                opacity: saving ? 0.7 : 1
                            }}
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            {saving ? 'Создание...' : 'Создать и выбрать'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* ─── Главная страница ───────────────────────────────────────────────────────── */

export function DocumentsPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToastContext();

    // Если открыли со страницы клиента/сделки — получаем prefill
    const prefill = location.state?.docPrefill || {};

    const [selectedCategory, setSelectedCategory] = useState(() => {
        if (prefill.category) return prefill.category;
        return 'all';
    });
    const [selectedTemplate, setSelectedTemplate] = useState(prefill.template || 'yuss_buy_1');
    const [sourceMode, setSourceMode] = useState(prefill.dealId ? 'deal' : 'manual'); // 'deal' | 'manual'
    const [hideOtherTemplates, setHideOtherTemplates] = useState(() => Boolean(prefill.hideOtherTemplates));
    const [selectedContractId, setSelectedContractId] = useState(() => prefill.contractId || '');

    // Для режима «по сделке»
    const [selectedDealId, setSelectedDealId] = useState(prefill.dealId || '');

    // Для режима «вручную»
    const [sellerId, setSellerId] = useState(prefill.sellerId || '');
    const [buyerId, setBuyerId] = useState(prefill.buyerId || '');
    const [propertyId, setPropertyId] = useState(prefill.propertyId || '');

    // Быстрое модальное окно создания клиента
    const [quickModalConfig, setQuickModalConfig] = useState({ isOpen: false, role: 'buyer', initialName: '' });

    // Условия договора (вознаграждение, срок, статус)
    const [commission, setCommission] = useState(() => prefill.commission ? String(prefill.commission) : '');
    const [contractEndDate, setContractEndDate] = useState(() => {
        if (prefill.contractEndDate) return prefill.contractEndDate;
        const d = new Date();
        d.setMonth(d.getMonth() + 2);
        return d.toISOString().split('T')[0];
    });
    const [contractStatus, setContractStatus] = useState(() => prefill.contractStatus || 'active');

    // Сброс статуса сохранения при изменении условий
    useEffect(() => {
        setIsSavedToCrm(false);
    }, [commission, contractEndDate, contractStatus]);

    // 3-сторонний договор оказания услуг
    const [service1Cost, setService1Cost] = useState(() => prefill.service1Cost ? String(prefill.service1Cost) : '5 000');
    const [service2Cost, setService2Cost] = useState(() => prefill.service2Cost ? String(prefill.service2Cost) : (prefill.commission ? String(prefill.commission) : '15 000'));
    const [actDate, setActDate] = useState(() => prefill.actDate || new Date().toISOString().split('T')[0]);
    const [movableProperty, setMovableProperty] = useState(() => prefill.movableProperty || '');
    const [realtorTaxStatus, setRealtorTaxStatus] = useState(() => prefill.realtorTaxStatus || state.currentUser?.tax_status || state.currentUser?.passport_details?.tax_status || 'Самозанятый');
    const [city, setCity] = useState(() => prefill.city || 'г. Киров');
    const [agencyCustomName, setAgencyCustomName] = useState(() => prefill.agencyName || 'ИП Муравьевой Ю.А.');
    const [realtorDraft, setRealtorDraft] = useState({
        full_name: '',
        birth_date: '',
        series: '',
        number: '',
        issued_by: '',
        issue_date: '',
        unit_code: '',
        registration_address: '',
    });

    useEffect(() => {
        if (state.currentUser) {
            const u = state.currentUser;
            const up = u.passport_details || {};
            setRealtorDraft(prev => ({
                full_name: prev.full_name || u.full_name || '',
                birth_date: prev.birth_date || u.birth_date || up.birth_date || '',
                series: prev.series || up.series || '',
                number: prev.number || up.number || '',
                issued_by: prev.issued_by || up.issued_by || '',
                issue_date: prev.issue_date || up.issue_date || '',
                unit_code: prev.unit_code || up.unit_code || '',
                registration_address: prev.registration_address || up.registration_address || u.reg_address || u.address || '',
            }));
        }
    }, [state.currentUser]);

    const [isGenerating, setIsGenerating] = useState(false);
    const [isSavedToCrm, setIsSavedToCrm] = useState(false);
    const [isSavingToCrm, setIsSavingToCrm] = useState(false);
    const [highlightSlots, setHighlightSlots] = useState(true);

    // Правка шаблона в окне предпросмотра
    const [isEditMode, setIsEditMode] = useState(false);
    const [hasManualEdits, setHasManualEdits] = useState(false);
    const [savedTemplateHtml, setSavedTemplateHtml] = useState(() => {
        try {
            return localStorage.getItem(`repro_custom_doc_template_${selectedTemplate}`) || null;
        } catch {
            return null;
        }
    });
    const [previewKey, setPreviewKey] = useState(0);
    const previewRef = useRef(null);

    // Компактный интерфейс: состояния сворачивания аккордеонов
    const [collapsedSections, setCollapsedSections] = useState({
        client: false,
        property: false,
        contractParams: false,
        dataSummary: true, // Сводка данных по умолчанию свернута
    });
    const toggleSection = (key) => setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));

    // Режим отображения на узких экранах: 'all' | 'settings' | 'preview'
    const [mobileTab, setMobileTab] = useState('all');

    // При смене шаблона обновляем сохраненный шаблон и выключаем режим редактирования
    useEffect(() => {
        setIsEditMode(false);
        setHasManualEdits(false);
        try {
            const saved = localStorage.getItem(`repro_custom_doc_template_${selectedTemplate}`);
            setSavedTemplateHtml(saved || null);
        } catch {
            setSavedTemplateHtml(null);
        }
    }, [selectedTemplate]);

    // Поддержка параметров в строке адреса ?clientId=...&propertyId=...&dealId=...
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const qTemplate = params.get('template');
        const qCategory = params.get('category');
        const qClient = params.get('clientId');
        const qDeal = params.get('dealId');
        const qProperty = params.get('propertyId');
        const qHide = params.get('hideOther');

        if (qTemplate) setSelectedTemplate(qTemplate);
        if (qCategory) setSelectedCategory(qCategory);
        if (qHide !== null) setHideOtherTemplates(qHide === 'true');
        if (qDeal) {
            setSourceMode('deal');
            setSelectedDealId(qDeal);
        } else if (qClient) {
            setSourceMode('manual');
            setBuyerId(qClient);
            setSellerId(qClient);
        }
        if (qProperty) setPropertyId(qProperty);
    }, [location.search]);

    // Подгрузка условий сделки при смене сделки
    useEffect(() => {
        if (sourceMode === 'deal' && selectedDealId) {
            const d = state.deals.find(deal => String(deal.id) === String(selectedDealId));
            if (d) {
                if (d.commission && !commission) {
                    setCommission(Number(d.commission).toLocaleString('ru-RU'));
                }
                if (d.contract_end_date) {
                    setContractEndDate(d.contract_end_date.split('T')[0]);
                }
                if (d.handover_date) {
                    setActDate(d.handover_date.split('T')[0]);
                } else if (d.deal_date) {
                    setActDate(d.deal_date.split('T')[0]);
                }
                const prop = state.properties.find(p => String(p.id) === String(d.property_id));
                if (prop?.movable_property) {
                    setMovableProperty(prop.movable_property);
                }
            }
        }
    }, [sourceMode, selectedDealId, state.deals, state.properties]);

    const templates = getDocumentTemplates();
    const selectedTemplateMeta = templates.find(t => t.key === selectedTemplate);
    const realtor = state.currentUser;
    const agencyName = realtor?.agency_name;

    const TEMPLATE_LABELS = {
        yuss_buy_1: 'АД ЮСС Покупка',
        agency_sale_1: 'АД ЮСС Продажа',
        agency_rent_landlord_1: 'АД Найм с наймодателем',
        services_rent_3party: 'ДОУ Аренда и найм (3-сторонний)',
        sale: 'Договор купли-продажи',
        rent: 'Договор аренды',
        act: 'Акт приема-передачи',
        key_act: 'Акт приема-передачи ключей',
    };

    const displayedTemplates = useMemo(() => {
        let list = templates;
        if (selectedCategory && selectedCategory !== 'all') {
            list = list.filter(t => (t.categories || [t.category]).includes(selectedCategory));
        }
        if (hideOtherTemplates) {
            return list.filter(t => t.key === selectedTemplate);
        }
        return list;
    }, [templates, selectedCategory, hideOtherTemplates, selectedTemplate]);

    const handleCategoryChange = (catId) => {
        setSelectedCategory(catId);
        if (hideOtherTemplates) {
            setHideOtherTemplates(false);
        }
        if (catId === 'all') return;

        const curr = templates.find(t => t.key === selectedTemplate);
        const inCat = curr && (curr.categories || [curr.category]).includes(catId);
        if (!inCat) {
            const first = templates.find(t => (t.categories || [t.category]).includes(catId));
            if (first) {
                setSelectedTemplate(first.key);
            }
        }
    };

    /* ── Выбранный клиент для редактирования реквизитов ────────────────────── */
    const isAgencyRentLandlord = selectedTemplate === 'agency_rent_landlord_1';
    const isServicesRent3Party = selectedTemplate === 'services_rent_3party';
    const isKeyAct = selectedTemplate === 'key_act';
    const isAgencySale = selectedTemplate === 'agency_sale_1' || isAgencyRentLandlord || isKeyAct;
    const isAgencyContract = selectedTemplate === 'yuss_buy_1' || selectedTemplate === 'agency_sale_1' || isAgencyRentLandlord || isKeyAct;
    const individualClients = useMemo(() => state.clients.filter(c => !c.is_legal_entity && !c.client_types?.includes('legal_entity') && !c.company_name), [state.clients]);

    const activeClient = useMemo(() => {
        if (sourceMode === 'deal' && selectedDealId) {
            const d = state.deals.find(deal => String(deal.id) === String(selectedDealId));
            if (d) {
                const bList = parsePgArray(d.buyer_ids);
                const buyerIds = bList.length > 0 ? bList : (d.buyer_id ? [String(d.buyer_id)] : []);
                const sList = parsePgArray(d.seller_ids);
                const sellerIds = sList.length > 0 ? sList : (d.seller_id ? [String(d.seller_id)] : []);
                const cId = isAgencySale ? (sellerIds[0] || buyerIds[0]) : (buyerIds[0] || sellerIds[0]);
                return state.clients.find(c => String(c.id) === String(cId)) || null;
            }
        }
        const targetId = isAgencySale ? (sellerId || buyerId) : (buyerId || sellerId);
        if (targetId) {
            return state.clients.find(c => String(c.id) === String(targetId)) || null;
        }
        if (propertyId) {
            const prop = state.properties.find(p => String(p.id) === String(propertyId));
            if (prop?.client_id) {
                return state.clients.find(c => String(c.id) === String(prop.client_id)) || null;
            }
        }
        return null;
    }, [sourceMode, selectedDealId, isAgencySale, buyerId, sellerId, propertyId, state.deals, state.clients, state.properties]);

    // Список договоров выбранного клиента
    const clientContracts = useMemo(() => {
        if (!activeClient) return [];
        const rawList = Array.isArray(activeClient.agency_contracts) ? activeClient.agency_contracts : [];
        if (rawList.length > 0) return rawList;
        if (activeClient.has_agency_contract || activeClient.agency_contract_date) {
            const isBuyer = (activeClient.client_types || []).includes('buyer');
            return [{
                id: 'legacy-' + activeClient.id,
                type: isBuyer ? 'АД ЮСС Покупка' : 'АД ЮСС Продажа',
                contract_date: activeClient.agency_contract_date,
                property_id: activeClient.agency_contract_property_id || null,
                status: 'active'
            }];
        }
        return [];
    }, [activeClient]);

    const handleSelectContract = (cId) => {
        setSelectedContractId(cId);
        if (!cId) {
            setHideOtherTemplates(false);
            return;
        }
        const c = clientContracts.find(item => item.id === cId);
        if (c) {
            let tpl = 'yuss_buy_1';
            if (c.type === 'АД ЮСС Покупка' || c.type === 'АД Покупка') {
                tpl = 'yuss_buy_1';
            } else if (c.type === 'АД ЮСС Продажа' || c.type === 'АД Продажа') {
                tpl = 'agency_sale_1';
            } else if (c.type === 'АД Найм с наймодателем' || c.type === 'АД Аренда с наймодателем' || c.type === 'АД Аренда с арендодателем') {
                tpl = 'agency_rent_landlord_1';
            } else if (c.type?.includes('3-сторонний') || c.type?.includes('3 сторонний') || c.type === 'ДОУ Аренда / найм (3-сторонний)') {
                tpl = 'services_rent_3party';
            } else if (c.type?.includes('Аренда') || c.type?.includes('Найм')) {
                tpl = 'rent';
            }
            setSelectedTemplate(tpl);
            const tplObj = templates.find(t => t.key === tpl);
            if (selectedCategory !== 'all' && tplObj && !(tplObj.categories || [tplObj.category]).includes(selectedCategory)) {
                setSelectedCategory(tplObj.category || 'all');
            }
            setHideOtherTemplates(true);
            if (c.property_id) {
                setPropertyId(c.property_id);
            }
            if (c.commission) {
                setCommission(Number(c.commission).toLocaleString('ru-RU'));
            }
            if (c.valid_until) {
                setContractEndDate(c.valid_until.split('T')[0]);
            }
            if (c.status) {
                setContractStatus(c.status === 'terminated' ? 'closed' : c.status);
            }
        }
    };

    // Автоподгрузка условий договора из карточки клиента
    useEffect(() => {
        if (!activeClient) return;
        const rawContracts = Array.isArray(activeClient.agency_contracts) ? activeClient.agency_contracts : [];
        if (rawContracts.length > 0) {
            const matched = (propertyId ? rawContracts.find(c => String(c.property_id) === String(propertyId)) : null) || 
                            rawContracts.find(c => c.status === 'active') || 
                            rawContracts[0];
            if (matched) {
                if (matched.commission && !commission) {
                    setCommission(Number(matched.commission).toLocaleString('ru-RU'));
                }
                if (matched.valid_until && !prefill.contractEndDate) {
                    setContractEndDate(matched.valid_until.split('T')[0]);
                }
                if (matched.status) {
                    setContractStatus(matched.status === 'terminated' ? 'closed' : matched.status);
                }
            }
        }
    }, [activeClient?.id, propertyId]);

    // Автоподгрузка условий из объекта недвижимости
    useEffect(() => {
        if (!activeProperty) return;
        if (activeProperty.commission && !commission) {
            setCommission(Number(activeProperty.commission).toLocaleString('ru-RU'));
        }
        if (activeProperty.contract_end_date && !prefill.contractEndDate) {
            setContractEndDate(activeProperty.contract_end_date.split('T')[0]);
        }
        if (activeProperty.contract_status) {
            setContractStatus(activeProperty.contract_status === 'terminated' ? 'closed' : activeProperty.contract_status);
        }
    }, [activeProperty?.id]);

    /* ── Черновик реквизитов клиента ──────────────────────────────────────── */
    const [clientDraft, setClientDraft] = useState({
        is_legal_entity: false,
        company_name: '',
        inn: '',
        kpp: '',
        ogrn: '',
        legal_address: '',
        authorized_position: 'Генеральный директор',
        authorized_name: '',
        authorized_basis: 'Устава',
        full_name: '',
        phone: '',
        birth_date: '',
        passport_series: '',
        passport_number: '',
        passport_issued_by: '',
        passport_issue_date: '',
        passport_unit_code: '',
        registration_address: '',
        auth_person_birth: '',
        auth_person_series: '',
        auth_person_number: '',
        auth_person_issued_by: '',
        auth_person_issue_date: '',
        auth_person_unit_code: '',
        auth_person_reg_address: '',
    });

    useEffect(() => {
        if (activeClient) {
            const p = activeClient.passport_details || {};
            const cd = activeClient.company_details || {};
            const ap = activeClient.authorized_person || {};
            const authPersonId = activeClient.authorized_person_id || ap.client_id;
            const authClient = authPersonId ? state.clients.find(c => String(c.id) === String(authPersonId)) : null;
            const apPass = authClient?.passport_details || ap.passport_details || {};
            const isLegal = Boolean(
                activeClient.is_legal_entity ||
                activeClient.client_types?.includes('legal_entity') ||
                activeClient.company_details?.inn ||
                activeClient.company_details?.ogrn ||
                activeClient.company_name ||
                cd.name ||
                /^(ООО|ОАО|ЗАО|ПАО|АО|МУП|ГУП|НКО|АНО)\b/i.test(activeClient.full_name || '')
            );
            setClientDraft({
                is_legal_entity: isLegal,
                company_name: activeClient.company_name || cd.name || cd.short_name || (isLegal ? activeClient.full_name : ''),
                inn: activeClient.inn || cd.inn || p.inn || '',
                kpp: activeClient.kpp || cd.kpp || '',
                ogrn: activeClient.ogrn || cd.ogrn || '',
                legal_address: activeClient.legal_address || cd.legal_address || activeClient.reg_address || activeClient.address || '',
                authorized_position: activeClient.authorized_position || ap.position || cd.director_position || 'Генеральный директор',
                authorized_name: activeClient.authorized_name || ap.name || authClient?.full_name || cd.director_name || (!isLegal ? activeClient.full_name : ''),
                authorized_basis: activeClient.authorized_basis || ap.basis_document || 'Устава',
                auth_person_birth: authClient?.birth_date || apPass.birth_date || ap.birth_date || '',
                auth_person_series: apPass.series || ap.series || '',
                auth_person_number: apPass.number || ap.number || '',
                auth_person_issued_by: apPass.issued_by || ap.issued_by || '',
                auth_person_issue_date: apPass.issue_date || ap.issue_date || '',
                auth_person_unit_code: apPass.unit_code || ap.unit_code || '',
                auth_person_reg_address: apPass.registration_address || authClient?.reg_address || authClient?.address || ap.registration_address || '',
                full_name: activeClient.full_name || '',
                phone: formatPhone(activeClient.phone || ap.phone || '', true),
                birth_date: activeClient.birth_date || p.birth_date || '',
                passport_series: p.series || '',
                passport_number: p.number || '',
                passport_issued_by: p.issued_by || '',
                passport_issue_date: p.issue_date || '',
                passport_unit_code: p.unit_code || '',
                registration_address: p.registration_address || activeClient.reg_address || activeClient.address || '',
            });
            setIsSavedToCrm(false);
        }
    }, [activeClient?.id]);

    const handleDraftChange = (field, val) => {
        setClientDraft(prev => ({ ...prev, [field]: val }));
        setIsSavedToCrm(false);
    };

    /* ── Обогащенный клиент для живого предпросмотра ───────────────────────── */
    const enrichedClient = useMemo(() => {
        const isLegal = Boolean(clientDraft.is_legal_entity);
        const cd = {
            name: clientDraft.company_name || '',
            short_name: clientDraft.company_name || '',
            inn: clientDraft.inn || '',
            kpp: clientDraft.kpp || '',
            ogrn: clientDraft.ogrn || '',
            legal_address: clientDraft.legal_address || '',
            director_name: clientDraft.authorized_name || '',
            director_position: clientDraft.authorized_position || 'Генеральный директор',
        };
        const ap = {
            name: clientDraft.authorized_name || '',
            position: clientDraft.authorized_position || 'Генеральный директор',
            basis_document: clientDraft.authorized_basis || 'Устава',
            phone: clientDraft.phone || '',
        };

        if (!activeClient) {
            const hasDraft = isLegal
                ? Boolean(clientDraft.company_name?.trim() || clientDraft.inn?.trim() || clientDraft.authorized_name?.trim())
                : Boolean(
                    clientDraft.full_name?.trim() || 
                    clientDraft.phone?.trim() || 
                    clientDraft.passport_series?.trim() || 
                    clientDraft.passport_number?.trim() ||
                    clientDraft.registration_address?.trim()
                );
            if (!hasDraft) return null;
            return {
                id: 'draft_manual_client',
                is_legal_entity: isLegal,
                client_types: isLegal ? ['legal_entity'] : ['buyer'],
                company_name: clientDraft.company_name || '',
                inn: clientDraft.inn || '',
                kpp: clientDraft.kpp || '',
                ogrn: clientDraft.ogrn || '',
                legal_address: clientDraft.legal_address || '',
                authorized_position: clientDraft.authorized_position || 'Генеральный директор',
                authorized_name: clientDraft.authorized_name || '',
                authorized_basis: clientDraft.authorized_basis || 'Устава',
                company_details: cd,
                authorized_person: ap,
                full_name: isLegal ? (clientDraft.company_name || 'Юридическое лицо') : (clientDraft.full_name || ''),
                phone: clientDraft.phone || '',
                birth_date: clientDraft.birth_date || '',
                reg_address: isLegal ? (clientDraft.legal_address || '') : (clientDraft.registration_address || ''),
                passport_details: {
                    series: clientDraft.passport_series || '',
                    number: clientDraft.passport_number || '',
                    issued_by: clientDraft.passport_issued_by || '',
                    issue_date: clientDraft.passport_issue_date || '',
                    unit_code: clientDraft.passport_unit_code || '',
                    registration_address: isLegal ? (clientDraft.legal_address || '') : (clientDraft.registration_address || ''),
                    birth_date: clientDraft.birth_date || '',
                }
            };
        }
        return {
            ...activeClient,
            is_legal_entity: isLegal,
            client_types: isLegal 
                ? Array.from(new Set([...(activeClient.client_types || []), 'legal_entity']))
                : (activeClient.client_types || []).filter(t => t !== 'legal_entity'),
            company_name: clientDraft.company_name || '',
            inn: clientDraft.inn || activeClient.inn || '',
            kpp: clientDraft.kpp || '',
            ogrn: clientDraft.ogrn || '',
            legal_address: clientDraft.legal_address || '',
            authorized_position: clientDraft.authorized_position || 'Генеральный директор',
            authorized_name: clientDraft.authorized_name || '',
            authorized_basis: clientDraft.authorized_basis || 'Устава',
            company_details: {
                ...(activeClient.company_details || {}),
                ...cd,
            },
            authorized_person: {
                ...(activeClient.authorized_person || {}),
                ...ap,
            },
            full_name: isLegal ? (clientDraft.company_name || activeClient.full_name) : (clientDraft.full_name || activeClient.full_name),
            phone: clientDraft.phone || activeClient.phone,
            birth_date: isLegal ? '' : (clientDraft.birth_date || activeClient.birth_date),
            reg_address: isLegal ? (clientDraft.legal_address || activeClient.reg_address) : (clientDraft.registration_address || activeClient.reg_address),
            passport_details: {
                ...(activeClient.passport_details || {}),
                series: clientDraft.passport_series,
                number: clientDraft.passport_number,
                issued_by: clientDraft.passport_issued_by,
                issue_date: clientDraft.passport_issue_date,
                unit_code: clientDraft.passport_unit_code,
                registration_address: isLegal ? (clientDraft.legal_address || '') : clientDraft.registration_address,
                birth_date: isLegal ? '' : clientDraft.birth_date,
            }
        };
    }, [activeClient, clientDraft]);

    /* ── Черновик реквизитов объекта недвижимости ───────────────────────── */
    const activeProperty = useMemo(() => {
        return state.properties.find(p => p.id === propertyId) || null;
    }, [propertyId, state.properties]);

    const [propDraft, setPropDraft] = useState({
        property_kind: '',
        address: '',
        cadastral_number: '',
        area_total: '',
        price: '',
    });

    const parseArea = (val) => {
        if (val === null || val === undefined || val === '') return null;
        const cleaned = String(val).replace(',', '.').replace(/[^\d.]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
    };

    useEffect(() => {
        if (activeProperty) {
            setPropDraft({
                property_kind: activeProperty.property_kind || formatPropertyKind(activeProperty),
                address: activeProperty.address || activeProperty.city || '',
                cadastral_number: activeProperty.cadastral_number || '',
                area_total: activeProperty.area_total !== undefined && activeProperty.area_total !== null ? String(activeProperty.area_total).replace('.', ',') : '',
                price: activeProperty.price ? String(activeProperty.price) : '',
            });
            setIsSavedToCrm(false);
        }
    }, [activeProperty?.id]);

    const handlePropDraftChange = (field, val) => {
        setPropDraft(prev => ({ ...prev, [field]: val }));
        setIsSavedToCrm(false);
    };

    const enrichedProperty = useMemo(() => {
        if (!activeProperty) {
            const hasDraft = Boolean(
                propDraft.property_kind?.trim() ||
                propDraft.address?.trim() || 
                propDraft.cadastral_number?.trim() || 
                propDraft.price || 
                propDraft.area_total
            );
            if (!hasDraft) return null;
            const parsedArea = parseArea(propDraft.area_total);
            return {
                id: 'draft_manual_property',
                property_kind: propDraft.property_kind?.trim() || 'Квартира',
                address: propDraft.address || '',
                cadastral_number: propDraft.cadastral_number || '',
                area_total: parsedArea !== null ? parsedArea : null,
                price: propDraft.price ? Number(String(propDraft.price).replace(/\D/g, '')) : null,
            };
        }
        const parsedArea = parseArea(propDraft.area_total);
        return {
            ...activeProperty,
            property_kind: propDraft.property_kind?.trim() || formatPropertyKind(activeProperty),
            address: propDraft.address || activeProperty.address,
            cadastral_number: propDraft.cadastral_number || activeProperty.cadastral_number,
            area_total: parsedArea !== null ? parsedArea : activeProperty.area_total,
            price: propDraft.price ? Number(String(propDraft.price).replace(/\D/g, '')) : activeProperty.price,
        };
    }, [activeProperty, propDraft]);

    const clientMissingCount = useMemo(() => {
        const isLegal = Boolean(clientDraft.is_legal_entity);
        return isLegal ? [
            !clientDraft.company_name?.trim(),
            !clientDraft.inn?.trim(),
            !clientDraft.ogrn?.trim(),
            !clientDraft.legal_address?.trim(),
            !clientDraft.phone?.trim(),
            !clientDraft.authorized_name?.trim(),
            !clientDraft.authorized_position?.trim(),
            !clientDraft.authorized_basis?.trim(),
        ].filter(Boolean).length : [
            !clientDraft.full_name?.trim(),
            !clientDraft.phone?.trim(),
            !clientDraft.birth_date?.trim(),
            !clientDraft.passport_series?.trim(),
            !clientDraft.passport_number?.trim(),
            !clientDraft.passport_issued_by?.trim(),
            !clientDraft.passport_issue_date?.trim(),
            !clientDraft.passport_unit_code?.trim(),
            !clientDraft.registration_address?.trim(),
        ].filter(Boolean).length;
    }, [clientDraft]);

    const propMissingCount = useMemo(() => {
        return [
            !propDraft.property_kind?.trim(),
            !propDraft.address?.trim(),
        ].filter(Boolean).length;
    }, [propDraft]);

    /* ── Сохранение в CRM ─────────────────────────────────────────────────── */
    const handleSaveToCrm = async () => {
        setIsSavingToCrm(true);
        try {
            const isLegal = Boolean(clientDraft.is_legal_entity);
            const cleanComm = Number(String(commission).replace(/\D/g, '')) || 0;
            const validUntilIso = contractEndDate ? (contractEndDate.includes('T') ? contractEndDate : `${contractEndDate}T23:59:59.000Z`) : null;

            if (activeClient) {
                const series = clientDraft.passport_series?.trim() || '';
                const number = clientDraft.passport_number?.trim() || '';
                const passportStr = (series && number) ? `${series} ${number}` : (series || number || activeClient.passport || '');
                const birthDateStr = isLegal ? '' : (clientDraft.birth_date?.trim() || activeClient.birth_date || '');
                const regAddressStr = isLegal ? (clientDraft.legal_address?.trim() || '') : (clientDraft.registration_address?.trim() || activeClient.reg_address || '');
                const innStr = clientDraft.inn?.trim() || activeClient.inn || activeClient.passport_details?.inn || '';

                const cd = {
                    ...(activeClient.company_details || {}),
                    name: clientDraft.company_name?.trim() || activeClient.company_details?.name || '',
                    short_name: clientDraft.company_name?.trim() || activeClient.company_details?.short_name || '',
                    inn: innStr,
                    kpp: clientDraft.kpp?.trim() || '',
                    ogrn: clientDraft.ogrn?.trim() || '',
                    legal_address: clientDraft.legal_address?.trim() || '',
                    director_name: clientDraft.authorized_name?.trim() || '',
                    director_position: clientDraft.authorized_position?.trim() || 'Генеральный директор',
                };

                const ap = {
                    ...(activeClient.authorized_person || {}),
                    name: clientDraft.authorized_name?.trim() || '',
                    position: clientDraft.authorized_position?.trim() || 'Генеральный директор',
                    basis_document: clientDraft.authorized_basis?.trim() || 'Устава',
                    phone: stripPhone(clientDraft.phone) || clientDraft.phone?.trim() || '',
                };

                const clientTypes = isLegal
                    ? Array.from(new Set([...(activeClient.client_types || []), 'legal_entity']))
                    : (activeClient.client_types || []).filter(t => t !== 'legal_entity');

                // Синхронизация условий агентского договора в agency_contracts клиента
                const existingContracts = Array.isArray(activeClient.agency_contracts) ? [...activeClient.agency_contracts] : [];
                let updatedContracts;
                const matchIdx = existingContracts.findIndex(c => 
                    (selectedContractId && c.id === selectedContractId) ||
                    (!selectedContractId && propertyId && String(c.property_id) === String(propertyId))
                );

                const contractType = selectedTemplateMeta?.title || (isAgencySale ? 'АД ЮСС Продажа' : 'АД ЮСС Покупка');

                if (matchIdx >= 0) {
                    updatedContracts = existingContracts.map((c, i) => {
                        if (i === matchIdx) {
                            return {
                                ...c,
                                commission: cleanComm > 0 ? cleanComm : c.commission,
                                valid_until: validUntilIso || c.valid_until,
                                status: contractStatus,
                                property_id: propertyId || activeProperty?.id || c.property_id || null,
                                updated_at: new Date().toISOString()
                            };
                        }
                        return c;
                    });
                } else if (existingContracts.length > 0 && !selectedContractId) {
                    updatedContracts = existingContracts.map((c, i) => {
                        if (i === 0) {
                            return {
                                ...c,
                                commission: cleanComm > 0 ? cleanComm : c.commission,
                                valid_until: validUntilIso || c.valid_until,
                                status: contractStatus,
                                property_id: propertyId || activeProperty?.id || c.property_id || null,
                                updated_at: new Date().toISOString()
                            };
                        }
                        return c;
                    });
                } else {
                    const newContract = {
                        id: `contract_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                        type: contractType,
                        contract_date: new Date().toISOString().split('T')[0],
                        valid_until: validUntilIso,
                        commission: cleanComm > 0 ? cleanComm : null,
                        status: contractStatus,
                        property_id: propertyId || activeProperty?.id || null,
                        created_at: new Date().toISOString()
                    };
                    updatedContracts = [newContract, ...existingContracts];
                }

                const primaryContract = updatedContracts.find(c => c.status === 'active') || updatedContracts[0];

                const updatedClient = {
                    ...activeClient,
                    is_legal_entity: isLegal,
                    company_name: isLegal ? (clientDraft.company_name?.trim() || activeClient.company_name) : (activeClient.company_name || ''),
                    inn: innStr,
                    kpp: clientDraft.kpp?.trim() || '',
                    ogrn: clientDraft.ogrn?.trim() || '',
                    legal_address: clientDraft.legal_address?.trim() || '',
                    authorized_position: clientDraft.authorized_position?.trim() || '',
                    authorized_name: clientDraft.authorized_name?.trim() || '',
                    authorized_basis: clientDraft.authorized_basis?.trim() || '',
                    company_details: cd,
                    authorized_person: ap,
                    client_types: clientTypes,
                    full_name: isLegal 
                        ? (clientDraft.company_name?.trim() || activeClient.full_name) 
                        : (clientDraft.full_name?.trim() || activeClient.full_name),
                    phone: stripPhone(clientDraft.phone) || clientDraft.phone?.trim() || activeClient.phone,
                    birth_date: birthDateStr,
                    reg_address: regAddressStr,
                    passport: isLegal ? '' : passportStr,
                    agency_contracts: updatedContracts,
                    has_agency_contract: contractStatus === 'active',
                    agency_contract_date: primaryContract ? primaryContract.contract_date : activeClient.agency_contract_date,
                    agency_contract_property_id: primaryContract ? primaryContract.property_id : activeClient.agency_contract_property_id,
                    passport_details: {
                        ...(activeClient.passport_details || {}),
                        series: isLegal ? '' : series,
                        number: isLegal ? '' : number,
                        issued_by: isLegal ? '' : (clientDraft.passport_issued_by?.trim() || ''),
                        issue_date: isLegal ? '' : (clientDraft.passport_issue_date?.trim() || ''),
                        unit_code: isLegal ? '' : (clientDraft.passport_unit_code?.trim() || ''),
                        registration_address: regAddressStr,
                        birth_date: birthDateStr,
                        inn: innStr,
                    }
                };
                await dispatch({ type: 'UPDATE_CLIENT', client: updatedClient });
            } else if (clientDraft.full_name?.trim() || clientDraft.company_name?.trim() || clientDraft.phone?.trim()) {
                const series = clientDraft.passport_series?.trim() || '';
                const number = clientDraft.passport_number?.trim() || '';
                const passportStr = (series && number) ? `${series} ${number}` : (series || number || '');
                const birthDateStr = isLegal ? '' : (clientDraft.birth_date?.trim() || '');
                const regAddressStr = isLegal ? (clientDraft.legal_address?.trim() || '') : (clientDraft.registration_address?.trim() || '');
                const innStr = clientDraft.inn?.trim() || '';

                const baseType = isAgencySale ? 'seller' : 'buyer';
                const clientTypes = isLegal ? [baseType, 'legal_entity'] : [baseType];

                const initialContracts = [];
                if (cleanComm > 0 || contractEndDate || contractStatus) {
                    initialContracts.push({
                        id: `contract_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                        type: selectedTemplateMeta?.title || (isAgencySale ? 'АД ЮСС Продажа' : 'АД ЮСС Покупка'),
                        contract_date: new Date().toISOString().split('T')[0],
                        valid_until: validUntilIso,
                        commission: cleanComm > 0 ? cleanComm : null,
                        status: contractStatus,
                        property_id: propertyId || null,
                        created_at: new Date().toISOString()
                    });
                }

                const newClient = {
                    id: `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    is_legal_entity: isLegal,
                    company_name: isLegal ? (clientDraft.company_name?.trim() || '') : '',
                    inn: innStr,
                    kpp: clientDraft.kpp?.trim() || '',
                    ogrn: clientDraft.ogrn?.trim() || '',
                    legal_address: clientDraft.legal_address?.trim() || '',
                    authorized_position: clientDraft.authorized_position?.trim() || '',
                    authorized_name: clientDraft.authorized_name?.trim() || '',
                    authorized_basis: clientDraft.authorized_basis?.trim() || '',
                    company_details: {
                        name: clientDraft.company_name?.trim() || '',
                        short_name: clientDraft.company_name?.trim() || '',
                        inn: innStr,
                        kpp: clientDraft.kpp?.trim() || '',
                        ogrn: clientDraft.ogrn?.trim() || '',
                        legal_address: clientDraft.legal_address?.trim() || '',
                        director_name: clientDraft.authorized_name?.trim() || '',
                        director_position: clientDraft.authorized_position?.trim() || 'Генеральный директор',
                    },
                    authorized_person: {
                        name: clientDraft.authorized_name?.trim() || '',
                        position: clientDraft.authorized_position?.trim() || 'Генеральный директор',
                        basis_document: clientDraft.authorized_basis?.trim() || 'Устава',
                        phone: stripPhone(clientDraft.phone) || clientDraft.phone?.trim() || '',
                    },
                    full_name: isLegal 
                        ? (clientDraft.company_name?.trim() || 'Юридическое лицо')
                        : (clientDraft.full_name?.trim() || 'Клиент'),
                    phone: stripPhone(clientDraft.phone) || clientDraft.phone?.trim() || '',
                    birth_date: birthDateStr,
                    reg_address: regAddressStr,
                    passport: isLegal ? '' : passportStr,
                    client_types: clientTypes,
                    agency_contracts: initialContracts,
                    has_agency_contract: contractStatus === 'active',
                    agency_contract_date: initialContracts[0]?.contract_date || new Date().toISOString().split('T')[0],
                    agency_contract_property_id: initialContracts[0]?.property_id || null,
                    status: 'active',
                    realtor_id: state.currentUser?.id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    passport_details: {
                        series: isLegal ? '' : series,
                        number: isLegal ? '' : number,
                        issued_by: isLegal ? '' : (clientDraft.passport_issued_by?.trim() || ''),
                        issue_date: isLegal ? '' : (clientDraft.passport_issue_date?.trim() || ''),
                        unit_code: isLegal ? '' : (clientDraft.passport_unit_code?.trim() || ''),
                        registration_address: regAddressStr,
                        birth_date: birthDateStr,
                        inn: innStr,
                    }
                };
                await dispatch({ type: 'ADD_CLIENT', client: newClient });
                if (isAgencySale) setSellerId(newClient.id);
                else setBuyerId(newClient.id);
            }

            if (activeProperty) {
                const parsedArea = parseArea(propDraft.area_total);
                const updatedProperty = {
                    ...activeProperty,
                    property_kind: propDraft.property_kind?.trim() || activeProperty.property_kind,
                    address: propDraft.address?.trim() || activeProperty.address,
                    cadastral_number: propDraft.cadastral_number?.trim() || activeProperty.cadastral_number,
                    area_total: parsedArea !== null ? parsedArea : activeProperty.area_total,
                    price: propDraft.price ? Number(String(propDraft.price).replace(/\D/g, '')) : activeProperty.price,
                    commission: cleanComm > 0 ? cleanComm : activeProperty.commission,
                    contract_end_date: contractEndDate || activeProperty.contract_end_date,
                    contract_status: contractStatus,
                    movable_property: movableProperty?.trim() || activeProperty.movable_property || '',
                };
                await dispatch({ type: 'UPDATE_PROPERTY', property: updatedProperty });
            } else if (propDraft.address?.trim() || propDraft.property_kind?.trim()) {
                const parsedArea = parseArea(propDraft.area_total);
                const newProperty = {
                    id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    property_kind: propDraft.property_kind?.trim() || 'Квартира',
                    address: propDraft.address?.trim() || '',
                    cadastral_number: propDraft.cadastral_number?.trim() || '',
                    area_total: parsedArea !== null ? parsedArea : null,
                    price: propDraft.price ? Number(String(propDraft.price).replace(/\D/g, '')) : null,
                    commission: cleanComm > 0 ? cleanComm : null,
                    contract_end_date: contractEndDate || null,
                    contract_status: contractStatus,
                    movable_property: movableProperty?.trim() || '',
                    client_id: activeClient?.id || sellerId || buyerId || null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                await dispatch({ type: 'ADD_PROPERTY', property: newProperty });
                setPropertyId(newProperty.id);
            }

            if (sourceMode === 'deal' && selectedDealId) {
                const currentDeal = state.deals.find(d => d.id === selectedDealId);
                if (currentDeal) {
                    const updatedDeal = { ...currentDeal };
                    if (cleanComm > 0) updatedDeal.commission = cleanComm;
                    if (contractEndDate) updatedDeal.contract_end_date = contractEndDate;
                    if (contractStatus === 'fulfilled' && updatedDeal.status !== 'closed') {
                        updatedDeal.status = 'closed';
                    }
                    await dispatch({ type: 'UPDATE_DEAL', deal: updatedDeal });
                }
            }

            setIsSavedToCrm(true);
            toast?.success?.('Условия договора и реквизиты сохранены в CRM!');
        } catch (err) {
            console.error('Failed to save to CRM:', err);
            toast?.error?.('Ошибка при сохранении данных в CRM');
        } finally {
            setIsSavingToCrm(false);
        }
    };

    /* ── Формируем data для генератора ─────────────────────────────────────── */
    const generatorData = useMemo(() => {
        let seller = null;
        let buyer = null;
        let property = null;
        let deal = null;

        if (sourceMode === 'deal' && selectedDealId) {
            deal = state.deals.find(d => String(d.id) === String(selectedDealId));
            if (deal) {
                const sList = parsePgArray(deal.seller_ids);
                const sellerIds = sList.length > 0 ? sList : (deal.seller_id ? [String(deal.seller_id)] : []);
                const bList = parsePgArray(deal.buyer_ids);
                const buyerIds = bList.length > 0 ? bList : (deal.buyer_id ? [String(deal.buyer_id)] : []);

                seller = state.clients.find(c => sellerIds.includes(String(c.id))) || null;
                buyer = state.clients.find(c => buyerIds.includes(String(c.id))) || null;
                property = state.properties.find(p => String(p.id) === String(deal.property_id)) || null;

                // Если продавца нет прямо в сделке, но есть объект недвижимости — берем собственника объекта
                if (!seller && property) {
                    const propOwners = parsePgArray(property.client_ids);
                    const ownerIds = propOwners.length > 0 ? propOwners : (property.client_id ? [String(property.client_id)] : []);
                    seller = state.clients.find(c => ownerIds.includes(String(c.id))) || null;
                }
            }
        } else {
            seller = state.clients.find(c => String(c.id) === String(sellerId)) || null;
            buyer = state.clients.find(c => String(c.id) === String(buyerId)) || null;
            property = state.properties.find(p => String(p.id) === String(propertyId)) || null;
        }

        // Подменяем клиента обогащенными данными из черновика
        if (enrichedClient) {
            if (buyer && buyer.id === enrichedClient.id) {
                buyer = enrichedClient;
            } else if (seller && seller.id === enrichedClient.id) {
                seller = enrichedClient;
            } else if (!buyer && !seller) {
                buyer = enrichedClient;
                seller = enrichedClient;
            } else if (buyerId && enrichedClient.id === buyerId) {
                buyer = enrichedClient;
            } else if (sellerId && enrichedClient.id === sellerId) {
                seller = enrichedClient;
            }
        }

        // Подменяем объект обогащенным черновиком
        if (enrichedProperty && (enrichedProperty.id === propertyId || enrichedProperty.id === deal?.property_id)) {
            property = enrichedProperty;
        } else if (!property && enrichedProperty) {
            property = enrichedProperty;
        }

        // Подменяем вознаграждение агента
        if (commission) {
            const cleanC = Number(String(commission).replace(/\D/g, ''));
            if (cleanC > 0) {
                deal = { ...(deal || {}), commission: cleanC };
            }
        }

        // Подставляем срок договора
        if (contractEndDate) {
            deal = { ...(deal || {}), contract_end_date: contractEndDate };
        }

        // Подставляем статус договора
        if (contractStatus) {
            deal = { ...(deal || {}), contract_status: contractStatus };
        }

        const isRealtorSelfEmployed = (realtorTaxStatus || 'Самозанятый').toLowerCase().includes('самозанят');
        const effectiveRealtor = {
            ...(realtor || {}),
            full_name: realtorDraft.full_name || realtor?.full_name || '',
            birth_date: realtorDraft.birth_date || realtor?.birth_date || '',
            passport_details: {
                ...(realtor?.passport_details || {}),
                series: realtorDraft.series || realtor?.passport_details?.series || '',
                number: realtorDraft.number || realtor?.passport_details?.number || '',
                issued_by: realtorDraft.issued_by || realtor?.passport_details?.issued_by || '',
                issue_date: realtorDraft.issue_date || realtor?.passport_details?.issue_date || '',
                unit_code: realtorDraft.unit_code || realtor?.passport_details?.unit_code || '',
                registration_address: realtorDraft.registration_address || realtor?.passport_details?.registration_address || '',
            },
            tax_status: realtorTaxStatus,
        };

        const authPersonClient = state.clients.find(c => String(c.id) === String(activeClient?.authorized_person_id || activeClient?.authorized_person?.client_id)) || null;

        return {
            seller, buyer, property,
            realtor: effectiveRealtor,
            agencyName: agencyCustomName || agencyName || 'ИП Муравьевой Ю.А.',
            city: city || property?.city || 'г. Киров',
            deal, contractEndDate, contractStatus,
            service1Cost, service2Cost, actDate,
            movableProperty: movableProperty || property?.movable_property || '',
            realtorTaxStatus,
            isRealtorSelfEmployed,
            isLegalEntity: Boolean(clientDraft.is_legal_entity),
            authPersonName: clientDraft.authorized_name,
            authPersonPosition: clientDraft.authorized_position,
            authPersonBirth: clientDraft.auth_person_birth,
            authPersonSeries: clientDraft.auth_person_series,
            authPersonNumber: clientDraft.auth_person_number,
            authPersonIssuedBy: clientDraft.auth_person_issued_by,
            authPersonIssueDate: clientDraft.auth_person_issue_date,
            authPersonUnitCode: clientDraft.auth_person_unit_code,
            authPersonRegAddress: clientDraft.auth_person_reg_address,
            authPersonClient,
        };
    }, [sourceMode, selectedDealId, sellerId, buyerId, propertyId, state, realtor, realtorDraft, agencyName, agencyCustomName, city, enrichedClient, enrichedProperty, commission, contractEndDate, contractStatus, service1Cost, service2Cost, actDate, movableProperty, clientDraft, realtorTaxStatus, activeClient]);

    /* ── Предпросмотр подставляемых данных ─────────────────────────────────── */
    const { seller, buyer, property, deal } = generatorData;

    /* ── Сохранение правок шаблона ────────────────────────────────────────── */
    const handleSaveAsTemplate = () => {
        if (!previewRef.current) return;
        try {
            const sanitizedHtml = sanitizeTemplateForSaving(previewRef.current);
            localStorage.setItem(`repro_custom_doc_template_${selectedTemplate}`, sanitizedHtml);
            setSavedTemplateHtml(sanitizedHtml);
            setHasManualEdits(false);
            setIsEditMode(false);
            toast?.success?.('Шаблон успешно сохранен! Формулировки сохранены, а данные клиентов будут автоматически заполняться для каждого договора.');
        } catch (e) {
            console.error('Failed to save template to localStorage:', e);
            toast?.error?.('Ошибка при сохранении шаблона');
        }
    };

    /* ── Сброс правок к исходному шаблону ─────────────────────────────────── */
    const handleResetTemplate = () => {
        try {
            localStorage.removeItem(`repro_custom_doc_template_${selectedTemplate}`);
        } catch (e) {
            console.error('Failed to clear template from localStorage:', e);
        }
        setSavedTemplateHtml(null);
        setHasManualEdits(false);
        setIsEditMode(false);
        setPreviewKey(k => k + 1);
        toast?.success?.('Шаблон сброшен к исходному системному виду');
    };

    /* ── Динамическое наполнение сохраненного шаблона актуальными данными ─── */
    const hydratedCustomTemplateHtml = useMemo(() => {
        if (!savedTemplateHtml) return null;
        const slotValues = buildSlotValues(generatorData, selectedTemplate);
        return injectDataIntoTemplateHtml(
            savedTemplateHtml,
            slotValues,
            highlightSlots && !isEditMode,
            isEditMode
        );
    }, [savedTemplateHtml, generatorData, selectedTemplate, highlightSlots, isEditMode]);

    /* ── Клик по слоту в окне предпросмотра ────────────────────────────────── */
    const handlePreviewClick = (e) => {
        if (isEditMode) return;
        const slotEl = e.target.closest('.doc-slot, [data-input-id]');
        if (slotEl) {
            const inputId = slotEl.getAttribute('data-input-id');
            if (inputId) {
                const el = document.getElementById(inputId);
                if (el) {
                    el.focus();
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    };

    /* ── Очистка выбранного клиента для нового набора ─────────────────────── */
    const handleClearClient = () => {
        setSellerId('');
        setBuyerId('');
        setSelectedContractId('');
        setClientDraft({
            is_legal_entity: false,
            company_name: '',
            inn: '',
            kpp: '',
            ogrn: '',
            legal_address: '',
            authorized_position: 'Генеральный директор',
            authorized_name: '',
            authorized_basis: 'Устава',
            full_name: '',
            phone: '',
            birth_date: '',
            passport_series: '',
            passport_number: '',
            passport_issued_by: '',
            passport_issue_date: '',
            passport_unit_code: '',
            registration_address: '',
        });
        setIsSavedToCrm(false);
    };

    /* ── Создание нового клиента из черновика в CRM ───────────────────────── */
    const handleSaveNewClientToCrm = async () => {
        const isLegal = Boolean(clientDraft.is_legal_entity);
        const nameToValidate = isLegal ? clientDraft.company_name?.trim() : clientDraft.full_name?.trim();
        if (!nameToValidate) {
            toast?.error?.(isLegal ? 'Укажите наименование организации' : 'Укажите ФИО принципала');
            return;
        }
        setIsSavingToCrm(true);
        try {
            const series = clientDraft.passport_series?.trim() || '';
            const number = clientDraft.passport_number?.trim() || '';
            const passportStr = (series && number) ? `${series} ${number}` : (series || number || '');
            const birthDateStr = isLegal ? '' : (clientDraft.birth_date?.trim() || '');
            const regAddressStr = isLegal ? (clientDraft.legal_address?.trim() || '') : (clientDraft.registration_address?.trim() || '');
            const innStr = clientDraft.inn?.trim() || '';

            const baseType = isAgencySale ? 'seller' : 'buyer';
            const clientTypes = isLegal ? [baseType, 'legal_entity'] : [baseType];

            const newClient = {
                id: `client_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                is_legal_entity: isLegal,
                company_name: isLegal ? (clientDraft.company_name?.trim() || '') : '',
                inn: innStr,
                kpp: clientDraft.kpp?.trim() || '',
                ogrn: clientDraft.ogrn?.trim() || '',
                legal_address: clientDraft.legal_address?.trim() || '',
                authorized_position: clientDraft.authorized_position?.trim() || '',
                authorized_name: clientDraft.authorized_name?.trim() || '',
                authorized_basis: clientDraft.authorized_basis?.trim() || '',
                company_details: {
                    name: clientDraft.company_name?.trim() || '',
                    short_name: clientDraft.company_name?.trim() || '',
                    inn: innStr,
                    kpp: clientDraft.kpp?.trim() || '',
                    ogrn: clientDraft.ogrn?.trim() || '',
                    legal_address: clientDraft.legal_address?.trim() || '',
                    director_name: clientDraft.authorized_name?.trim() || '',
                    director_position: clientDraft.authorized_position?.trim() || 'Генеральный директор',
                },
                authorized_person: {
                    name: clientDraft.authorized_name?.trim() || '',
                    position: clientDraft.authorized_position?.trim() || 'Генеральный директор',
                    basis_document: clientDraft.authorized_basis?.trim() || 'Устава',
                    phone: stripPhone(clientDraft.phone) || clientDraft.phone?.trim() || '',
                },
                full_name: isLegal 
                    ? (clientDraft.company_name?.trim() || 'Юридическое лицо')
                    : (clientDraft.full_name?.trim() || 'Клиент'),
                phone: stripPhone(clientDraft.phone) || clientDraft.phone?.trim() || '',
                birth_date: birthDateStr,
                reg_address: regAddressStr,
                passport: isLegal ? '' : passportStr,
                client_types: clientTypes,
                status: 'active',
                realtor_id: state.currentUser?.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                passport_details: {
                    series: isLegal ? '' : series,
                    number: isLegal ? '' : number,
                    issued_by: isLegal ? '' : (clientDraft.passport_issued_by?.trim() || ''),
                    issue_date: isLegal ? '' : (clientDraft.passport_issue_date?.trim() || ''),
                    unit_code: isLegal ? '' : (clientDraft.passport_unit_code?.trim() || ''),
                    registration_address: regAddressStr,
                    birth_date: birthDateStr,
                    inn: innStr,
                }
            };
            await dispatch({ type: 'ADD_CLIENT', client: newClient });
            if (isAgencySale) {
                setSellerId(newClient.id);
            } else {
                setBuyerId(newClient.id);
            }
            setIsSavedToCrm(true);
            toast?.success?.(`Новый клиент «${newClient.full_name}» сохранен в CRM!`);
        } catch (e) {
            console.error('Failed to create client in CRM:', e);
            toast?.error?.('Ошибка при создании клиента в CRM');
        } finally {
            setIsSavingToCrm(false);
        }
    };

    const handleDownload = async () => {
        setIsGenerating(true);
        try {
            const printEl = (hasManualEdits || savedTemplateHtml) ? previewRef.current : null;
            await generateAndDownloadDocx(selectedTemplate, generatorData, printEl);
            toast?.success?.('Документ сохранён');
        } catch (e) {
            console.error(e);
            toast?.error?.('Ошибка генерации документа');
        } finally {
            setIsGenerating(false);
        }
    };

    /* ── Автоподстановка объекта при выборе клиента ──────────────────────── */
    useEffect(() => {
        const targetClientId = sellerId || buyerId;
        if (targetClientId && !propertyId) {
            const foundProp = state.properties.find(p => 
                p.client_id === targetClientId || 
                (Array.isArray(p.client_ids) && p.client_ids.includes(targetClientId))
            );
            if (foundProp) {
                setPropertyId(foundProp.id);
            }
        }
    }, [sellerId, buyerId, state.properties, propertyId]);

    /* ── Опции для выбора объекта (объекты клиента вверху списка) ─────────── */
    const propertyOptions = useMemo(() => {
        const targetClientId = sellerId || buyerId;
        return state.properties
            .map(p => {
                const isClientProp = Boolean(targetClientId && (
                    p.client_id === targetClientId || 
                    (Array.isArray(p.client_ids) && p.client_ids.includes(targetClientId))
                ));
                return {
                    id: p.id,
                    isClientProp,
                    full_name: (isClientProp ? '★ [Объект клиента] ' : '') +
                        [p.address, p.city].filter(Boolean).join(', ') + 
                        (p.price ? ` — ${p.price.toLocaleString()} ₽` : ''),
                };
            })
            .sort((a, b) => (b.isClientProp ? 1 : 0) - (a.isClientProp ? 1 : 0));
    }, [state.properties, sellerId, buyerId]);

    const deals = useMemo(() =>
        state.deals.filter(d => !realtor || realtor.role === 'admin' || d.realtor_id === realtor.id),
        [state.deals, realtor]
    );

    return (
        <div className="page fade-in" style={{ paddingBottom: 100 }}>
            {/* Print style and Workbench Layout */}
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    body * { visibility: hidden; }
                    #doc-print-area, #doc-print-area * { visibility: visible; }
                    #doc-print-area {
                        position: absolute; left: 0; top: 0; width: 100%;
                        padding: 24px; color: #000 !important; background: #fff !important;
                        font-family: ${isAgencyContract ? 'Arial, sans-serif' : "'Times New Roman', Times, serif"} !important;
                        font-size: ${isAgencyContract ? '9pt' : '13pt'} !important;
                        line-height: ${isAgencyContract ? '1.25' : '1.4'} !important;
                    }
                    .no-print { display: none !important; }
                    .doc-slot, .doc-slot-filled, .doc-slot-empty {
                        background: transparent !important;
                        background-color: transparent !important;
                        color: #000 !important;
                        border: none !important;
                        border-bottom: none !important;
                        box-shadow: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                        font-weight: normal !important;
                    }
                    .doc-slot-empty {
                        text-decoration: underline !important;
                    }
                }

                /* Компактный рабочий стол (Workbench) */
                .doc-workbench {
                    display: grid;
                    grid-template-columns: 380px minmax(0, 1fr);
                    gap: 16px;
                    align-items: start;
                    width: 100%;
                }
                @media (max-width: 1080px) {
                    .doc-workbench {
                        grid-template-columns: 1fr;
                    }
                    .mobile-hidden {
                        display: none !important;
                    }
                }
                .doc-sidebar {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .doc-main {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    min-width: 0;
                }
                .doc-card {
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 11px 13px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.02);
                }
                .doc-card-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    cursor: pointer;
                    user-select: none;
                    gap: 8px;
                }
                .doc-input-sm {
                    width: 100%;
                    height: 35px;
                    border-radius: 8px;
                    font-size: 12.5px;
                    padding: 6px 10px;
                    border: 1px solid var(--border);
                    background: var(--bg);
                    color: var(--text);
                    outline: none;
                    box-sizing: border-box;
                    transition: all 0.15s ease;
                }
                .doc-input-sm:focus {
                    border-color: var(--primary) !important;
                    box-shadow: 0 0 0 2px var(--primary-glow);
                }
                .doc-toolbar-sticky {
                    position: sticky;
                    top: 60px;
                    z-index: 25;
                    background: var(--surface);
                    backdrop-filter: blur(20px);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    padding: 8px 12px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 8px;
                    flex-wrap: wrap;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.04);
                }
                .btn-compact {
                    height: 34px;
                    padding: 0 12px;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    white-space: nowrap;
                    border: none;
                }
                .btn-compact-primary {
                    background: var(--primary);
                    color: #fff;
                    box-shadow: 0 2px 8px rgba(0,82,255,0.22);
                }
                .btn-compact-primary:hover {
                    background: var(--primary-hover);
                }
                .btn-compact-secondary {
                    background: var(--surface);
                    color: var(--text);
                    border: 1px solid var(--border);
                }
                .btn-compact-secondary:hover {
                    background: var(--bg);
                    border-color: var(--primary);
                }
                .btn-compact-secondary.active-edit {
                    background: var(--primary);
                    color: #fff;
                    border-color: var(--primary);
                }
            `}} />

            {/* Topbar */}
            <div className="topbar sticky no-print" style={{
                background: 'var(--topbar-bg)',
                backdropFilter: 'blur(24px) saturate(180%)',
                padding: '10px 18px',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <button
                        className="card-clickable"
                        onClick={() => navigate(-1)}
                        style={{
                            width: 34, height: 34, borderRadius: 10, border: 'none',
                            background: 'var(--surface)', color: 'var(--text)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)', flexShrink: 0
                        }}
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="topbar-title font-oswald" style={{ letterSpacing: '0.01em', fontSize: 18, fontWeight: 400 }}>
                            Документы
                        </span>
                        <span style={{ fontSize: 9.5, color: 'var(--text-secondary)', fontWeight: 300, opacity: 0.7 }}>
                            Заполнение из CRM + генерация DOCX
                        </span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end' }}>
                    <GlobalSearch />
                </div>
            </div>

            <div className="page-content" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Категории и выбор шаблона (Компактный заголовочный блок) */}
                <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {/* Фильтр по категориям */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
                        {DOCUMENT_CATEGORIES.map(cat => {
                            const isActive = selectedCategory === cat.id;
                            const count = cat.id === 'all'
                                ? templates.length
                                : templates.filter(t => (t.categories || [t.category]).includes(cat.id)).length;

                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => handleCategoryChange(cat.id)}
                                    style={{
                                        whiteSpace: 'nowrap',
                                        padding: '5px 11px',
                                        borderRadius: 9,
                                        border: '1px solid',
                                        borderColor: isActive ? 'var(--primary)' : 'var(--border)',
                                        background: isActive ? 'var(--primary)' : 'var(--surface)',
                                        color: isActive ? '#ffffff' : 'var(--text-secondary)',
                                        fontSize: 12,
                                        fontWeight: isActive ? 600 : 500,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        boxShadow: isActive ? '0 2px 6px rgba(0,82,255,0.2)' : 'none',
                                        flexShrink: 0
                                    }}
                                >
                                    <span>{cat.label}</span>
                                    <span style={{
                                        fontSize: 9.5,
                                        padding: '1px 5px',
                                        borderRadius: 6,
                                        background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--bg)',
                                        color: isActive ? '#ffffff' : 'var(--text-muted)',
                                        fontWeight: 600
                                    }}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Выбор шаблона */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
                        {displayedTemplates.map(t => (
                            <button
                                key={t.key}
                                className={`tab-filter ${selectedTemplate === t.key ? 'active' : ''}`}
                                onClick={() => setSelectedTemplate(t.key)}
                                style={{
                                    whiteSpace: 'nowrap', padding: '6px 12px', borderRadius: 9, border: 'none',
                                    background: selectedTemplate === t.key ? 'var(--primary)' : 'var(--surface)',
                                    color: selectedTemplate === t.key ? 'white' : 'var(--text-secondary)',
                                    fontSize: 12, fontWeight: 500,
                                    boxShadow: selectedTemplate === t.key ? '0 2px 8px rgba(0,82,255,0.2)' : 'none',
                                    display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0
                                }}
                            >
                                {TEMPLATE_ICONS[t.key]}
                                {TEMPLATE_LABELS[t.key] || t.title}
                            </button>
                        ))}
                        {hideOtherTemplates && (
                            <button
                                type="button"
                                onClick={() => {
                                    setHideOtherTemplates(false);
                                    setSelectedCategory('all');
                                }}
                                title="Показать все доступные шаблоны"
                                style={{
                                    whiteSpace: 'nowrap', padding: '6px 10px', borderRadius: 9,
                                    border: '1px dashed var(--border)', background: 'var(--surface)',
                                    color: 'var(--text-secondary)', fontSize: 11.5, fontWeight: 500,
                                    display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                                    cursor: 'pointer'
                                }}
                            >
                                <span>Все ({templates.length})</span>
                            </button>
                        )}
                        {!hideOtherTemplates && selectedContractId && (
                            <button
                                type="button"
                                onClick={() => setHideOtherTemplates(true)}
                                title="Скрыть остальные шаблоны"
                                style={{
                                    whiteSpace: 'nowrap', padding: '6px 10px', borderRadius: 9,
                                    border: '1px dashed var(--border)', background: 'transparent',
                                    color: 'var(--text-secondary)', fontSize: 11.5,
                                    display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                                    cursor: 'pointer'
                                }}
                            >
                                <span>Скрыть остальные</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Мобильный переключатель видов (Параметры / Документ) */}
                <div className="mobile-view-tabs no-print" style={{ display: 'none', gap: 4, background: 'var(--surface)', padding: 3, borderRadius: 10, border: '1px solid var(--border)' }}>
                    <button
                        type="button"
                        onClick={() => setMobileTab('all')}
                        style={{
                            flex: 1, padding: '5px 8px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: mobileTab === 'all' ? 600 : 500,
                            background: mobileTab === 'all' ? 'var(--primary)' : 'transparent',
                            color: mobileTab === 'all' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer'
                        }}
                    >
                        Все вместе
                    </button>
                    <button
                        type="button"
                        onClick={() => setMobileTab('settings')}
                        style={{
                            flex: 1, padding: '5px 8px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: mobileTab === 'settings' ? 600 : 500,
                            background: mobileTab === 'settings' ? 'var(--primary)' : 'transparent',
                            color: mobileTab === 'settings' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer'
                        }}
                    >
                        Параметры
                    </button>
                    <button
                        type="button"
                        onClick={() => setMobileTab('preview')}
                        style={{
                            flex: 1, padding: '5px 8px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: mobileTab === 'preview' ? 600 : 500,
                            background: mobileTab === 'preview' ? 'var(--primary)' : 'transparent',
                            color: mobileTab === 'preview' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer'
                        }}
                    >
                        Документ
                    </button>
                </div>

                {/* Главный рабочий стол (Workbench): Сайдбар параметров слева + Документ справа */}
                <div className="doc-workbench">
                    {/* ЛЕВАЯ КОЛОНКА (Сайдбар настроек) */}
                    <div className={`doc-sidebar no-print ${mobileTab === 'preview' ? 'mobile-hidden' : ''}`}>

                        {/* Карточка 1: Режим источника данных */}
                        <div className="doc-card">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Briefcase size={14} style={{ color: 'var(--primary)' }} />
                                    Источник данных
                                </span>
                                <div style={{ display: 'inline-flex', gap: 3, background: 'var(--bg)', padding: '2px', borderRadius: 8, border: '1px solid var(--border)' }}>
                                    {[
                                        { id: 'deal', label: 'Из сделки', icon: <Briefcase size={12} /> },
                                        { id: 'manual', label: 'Вручную', icon: <User size={12} /> },
                                    ].map(m => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => setSourceMode(m.id)}
                                            style={{
                                                padding: '3px 8px', borderRadius: 6, border: 'none',
                                                background: sourceMode === m.id ? 'var(--surface)' : 'transparent',
                                                color: sourceMode === m.id ? 'var(--primary)' : 'var(--text-secondary)',
                                                fontSize: 11.5, fontWeight: sourceMode === m.id ? 600 : 500,
                                                display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
                                                boxShadow: sourceMode === m.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none'
                                            }}
                                        >
                                            {m.icon} {m.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Режим — из сделки */}
                            {sourceMode === 'deal' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <label style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Выберите сделку</label>
                                    <select
                                        className="form-input doc-input-sm"
                                        value={selectedDealId}
                                        onChange={e => setSelectedDealId(e.target.value)}
                                    >
                                        <option value="">— Выбрать сделку —</option>
                                        {deals.map(d => {
                                            const prop = state.properties.find(p => p.id === d.property_id);
                                            const label = d.title || (prop ? (prop.address || prop.city) : '') || `Сделка от ${new Date(d.created_at).toLocaleDateString('ru-RU')}`;
                                            return <option key={d.id} value={d.id}>{label}</option>;
                                        })}
                                    </select>
                                </div>
                            )}

                    {/* Режим — вручную */}
                    {sourceMode === 'manual' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {isServicesRent3Party ? (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                            Заказчик (Клиент / Наниматель / Арендатор)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setQuickModalConfig({ isOpen: true, role: 'buyer', initialName: '' })}
                                            style={{
                                                background: 'none', border: 'none', color: 'var(--primary)',
                                                fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                                            }}
                                        >
                                            <Plus size={13} /> Создать клиента
                                        </button>
                                    </div>
                                    <ClientSearch
                                        clients={state.clients}
                                        value={buyerId || sellerId}
                                        onChange={(val) => {
                                            setBuyerId(val);
                                            setSellerId(val);
                                            if (val) {
                                                const found = state.properties.find(p => p.client_id === val || (Array.isArray(p.client_ids) && p.client_ids.includes(val)));
                                                if (found) setPropertyId(found.id);
                                            }
                                        }}
                                        placeholder="Выберите клиента-заказчика"
                                        onAddNew={(searchQuery) => setQuickModalConfig({ isOpen: true, role: 'buyer', initialName: searchQuery || '' })}
                                        addLabel="Новый заказчик"
                                    />
                                </div>
                            ) : (selectedTemplate === 'agency_sale_1' || selectedTemplate === 'agency_rent_landlord_1') ? (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                            {selectedTemplate === 'agency_rent_landlord_1' ? 'Принципал (Наймодатель / Собственник)' : 'Принципал (Продавец / Собственник)'}
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setQuickModalConfig({ isOpen: true, role: 'seller', initialName: '' })}
                                            style={{
                                                background: 'none', border: 'none', color: 'var(--primary)',
                                                fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                                            }}
                                        >
                                            <Plus size={13} /> Создать клиента
                                        </button>
                                    </div>
                                    <ClientSearch
                                        clients={state.clients}
                                        value={sellerId || buyerId}
                                        onChange={(val) => {
                                            setSellerId(val);
                                            setBuyerId(val);
                                            if (val) {
                                                const found = state.properties.find(p => p.client_id === val || (Array.isArray(p.client_ids) && p.client_ids.includes(val)));
                                                if (found) setPropertyId(found.id);
                                            }
                                        }}
                                        placeholder={selectedTemplate === 'agency_rent_landlord_1' ? 'Выберите клиента-принципала (наймодателя)' : 'Выберите клиента-принципала (продавца)'}
                                        onAddNew={(searchQuery) => setQuickModalConfig({ isOpen: true, role: 'seller', initialName: searchQuery || '' })}
                                        addLabel="Новый принципал"
                                    />
                                </div>
                            ) : selectedTemplate === 'yuss_buy_1' ? (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                        <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                            Принципал (Покупатель)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => setQuickModalConfig({ isOpen: true, role: 'buyer', initialName: '' })}
                                            style={{
                                                background: 'none', border: 'none', color: 'var(--primary)',
                                                fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                                            }}
                                        >
                                            <Plus size={13} /> Создать клиента
                                        </button>
                                    </div>
                                    <ClientSearch
                                        clients={state.clients}
                                        value={buyerId || sellerId}
                                        onChange={(val) => {
                                            setBuyerId(val);
                                            setSellerId(val);
                                            if (val) {
                                                const found = state.properties.find(p => p.client_id === val || (Array.isArray(p.client_ids) && p.client_ids.includes(val)));
                                                if (found) setPropertyId(found.id);
                                            }
                                        }}
                                        placeholder="Выберите клиента-принципала"
                                        onAddNew={(searchQuery) => setQuickModalConfig({ isOpen: true, role: 'buyer', initialName: searchQuery || '' })}
                                        addLabel="Новый принципал"
                                    />
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                            <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                {selectedTemplate === 'rent' ? 'Наймодатель (продавец/арендодатель)' : 'Продавец / Клиент'}
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setQuickModalConfig({ isOpen: true, role: 'seller', initialName: '' })}
                                                style={{
                                                    background: 'none', border: 'none', color: 'var(--primary)',
                                                    fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                                                }}
                                            >
                                                <Plus size={13} /> Создать
                                            </button>
                                        </div>
                                        <ClientSearch
                                            clients={state.clients}
                                            value={sellerId}
                                            onChange={(val) => {
                                                setSellerId(val);
                                                if (val) {
                                                    const found = state.properties.find(p => p.client_id === val || (Array.isArray(p.client_ids) && p.client_ids.includes(val)));
                                                    if (found) setPropertyId(found.id);
                                                }
                                            }}
                                            placeholder="Выберите клиента"
                                            onAddNew={(searchQuery) => setQuickModalConfig({ isOpen: true, role: 'seller', initialName: searchQuery || '' })}
                                            addLabel="Новый продавец"
                                        />
                                    </div>

                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                            <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                {selectedTemplate === 'rent' ? 'Наниматель (покупатель/арендатор)' : 'Покупатель'}
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setQuickModalConfig({ isOpen: true, role: 'buyer', initialName: '' })}
                                                style={{
                                                    background: 'none', border: 'none', color: 'var(--primary)',
                                                    fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                                                }}
                                            >
                                                <Plus size={13} /> Создать
                                            </button>
                                        </div>
                                        <ClientSearch
                                            clients={state.clients}
                                            value={buyerId}
                                            onChange={(val) => {
                                                setBuyerId(val);
                                                if (val && !propertyId) {
                                                    const found = state.properties.find(p => p.client_id === val || (Array.isArray(p.client_ids) && p.client_ids.includes(val)));
                                                    if (found) setPropertyId(found.id);
                                                }
                                            }}
                                            placeholder="Выберите клиента"
                                            onAddNew={(searchQuery) => setQuickModalConfig({ isOpen: true, role: 'buyer', initialName: searchQuery || '' })}
                                            addLabel="Новый покупатель"
                                        />
                                    </div>
                                </>
                            )}

                            {clientContracts.length > 0 && (
                                <div style={{
                                    padding: '12px 14px',
                                    borderRadius: 14,
                                    background: 'rgba(0, 82, 255, 0.04)',
                                    border: '1px solid rgba(0, 82, 255, 0.15)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 6
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <FileText size={14} /> АД клиента
                                        </label>
                                        {hideOtherTemplates && (
                                            <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 500 }}>
                                                Остальные шаблоны скрыты
                                            </span>
                                        )}
                                    </div>
                                    <select
                                        className="form-input"
                                        style={{ height: 42, borderRadius: 10, fontSize: 13, background: 'var(--surface)' }}
                                        value={selectedContractId}
                                        onChange={e => handleSelectContract(e.target.value)}
                                    >
                                        <option value="">— Показать все шаблоны / без привязки к АД —</option>
                                        {clientContracts.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.type || 'Агентский договор'} {c.contract_date ? `от ${new Date(c.contract_date).toLocaleDateString('ru-RU')}` : ''} {c.property_id ? `(Объект #${c.property_id.slice(-4)})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                        При выборе АД из списка отображается только релевантный шаблон договора (остальные скрываются).
                                    </span>
                                </div>
                            )}

                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                                    Объект недвижимости {selectedTemplate === 'yuss_buy_1' ? '(опционально)' : ''}
                                </label>
                                <ClientSearch
                                    clients={propertyOptions}
                                    value={propertyId}
                                    onChange={(pId) => {
                                        setPropertyId(pId);
                                        if (pId) {
                                            const p = state.properties.find(item => item.id === pId);
                                            if (p?.movable_property && !movableProperty) {
                                                setMovableProperty(p.movable_property);
                                            }
                                        }
                                    }}
                                    placeholder="Выберите объект"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Карточка 2: Реквизиты Принципала / Заказчика */}
                {(isAgencyContract || isServicesRent3Party || sourceMode === 'manual' || activeClient) && (
                    <div className="doc-card no-print">
                        <div
                            className="doc-card-header"
                            onClick={() => toggleSection('client')}
                            role="button"
                            tabIndex={0}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                                <Sparkles size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {isServicesRent3Party ? 'Заказчик' : 'Принципал'}
                                    {activeClient ? `: ${clientDraft.is_legal_entity ? (clientDraft.company_name || activeClient.full_name) : activeClient.full_name}` : ''}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                {clientMissingCount > 0 ? (
                                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', fontWeight: 600 }}>
                                        ● {clientMissingCount}
                                    </span>
                                ) : (
                                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: 'rgba(16, 185, 129, 0.12)', color: '#059669', fontWeight: 600 }}>
                                        ✓ Ок
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => toggleSection('client')}
                                    style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                                >
                                    <ChevronDown size={14} style={{ transform: collapsedSections.client ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
                                </button>
                            </div>
                        </div>

                        {!collapsedSections.client && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                                {/* Физлицо / Юрлицо + Сменить */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                                    <div style={{ display: 'inline-flex', gap: 2, background: 'var(--bg)', padding: '2px', borderRadius: 8, border: '1px solid var(--border)' }}>
                                        <button
                                            type="button"
                                            onClick={() => handleDraftChange('is_legal_entity', false)}
                                            style={{
                                                padding: '3px 8px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                                background: !clientDraft.is_legal_entity ? 'var(--surface)' : 'transparent',
                                                color: !clientDraft.is_legal_entity ? 'var(--primary)' : 'var(--text-secondary)',
                                                boxShadow: !clientDraft.is_legal_entity ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                            }}
                                        >
                                            Физлицо
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDraftChange('is_legal_entity', true)}
                                            style={{
                                                padding: '3px 8px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                                background: clientDraft.is_legal_entity ? 'var(--surface)' : 'transparent',
                                                color: clientDraft.is_legal_entity ? 'var(--primary)' : 'var(--text-secondary)',
                                                boxShadow: clientDraft.is_legal_entity ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                                            }}
                                        >
                                            Юрлицо
                                        </button>
                                    </div>
                                    {activeClient && (
                                        <button
                                            type="button"
                                            onClick={handleClearClient}
                                            style={{
                                                background: 'none', border: 'none', color: 'var(--primary)',
                                                fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: '0 4px'
                                            }}
                                            title="Очистить и ввести вручную"
                                        >
                                            Сменить
                                        </button>
                                    )}
                                </div>

                                {/* Поля ввода реквизитов */}
                                {clientDraft.is_legal_entity ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>Наименование (ООО, АО...)</div>
                                            <input
                                                id="doc-input-company-name"
                                                className="doc-input-sm"
                                                value={clientDraft.company_name}
                                                onChange={e => {
                                                    handleDraftChange('company_name', e.target.value);
                                                    if (!clientDraft.full_name) handleDraftChange('full_name', e.target.value);
                                                }}
                                                placeholder="ООО «Компания»"
                                                style={{ border: !clientDraft.company_name?.trim() ? '1px solid #f59e0b' : '1px solid var(--border)' }}
                                            />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>ИНН</div>
                                            <input
                                                id="doc-input-inn"
                                                className="doc-input-sm"
                                                value={clientDraft.inn}
                                                onChange={e => handleDraftChange('inn', e.target.value)}
                                                placeholder="4345000000"
                                                maxLength={12}
                                                style={{ border: !clientDraft.inn?.trim() ? '1px solid #f59e0b' : '1px solid var(--border)' }}
                                            />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>ОГРН</div>
                                            <input
                                                id="doc-input-ogrn"
                                                className="doc-input-sm"
                                                value={clientDraft.ogrn}
                                                onChange={e => handleDraftChange('ogrn', e.target.value)}
                                                placeholder="1154300000000"
                                                maxLength={15}
                                                style={{ border: !clientDraft.ogrn?.trim() ? '1px solid #f59e0b' : '1px solid var(--border)' }}
                                            />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>КПП (опционально)</div>
                                            <input
                                                id="doc-input-kpp"
                                                className="doc-input-sm"
                                                value={clientDraft.kpp}
                                                onChange={e => handleDraftChange('kpp', e.target.value)}
                                                placeholder="434501001"
                                                maxLength={9}
                                            />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>Телефон</div>
                                            <input
                                                id="doc-input-phone"
                                                type="tel"
                                                className="doc-input-sm"
                                                value={clientDraft.phone}
                                                onChange={e => handleDraftChange('phone', formatPhone(e.target.value, true))}
                                                placeholder="+7 (___) ___-__-__"
                                                style={{ border: !clientDraft.phone?.trim() ? '1px solid #f59e0b' : '1px solid var(--border)' }}
                                            />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>Юр. адрес</div>
                                            <input
                                                id="doc-input-legal-address"
                                                className="doc-input-sm"
                                                value={clientDraft.legal_address}
                                                onChange={e => handleDraftChange('legal_address', e.target.value)}
                                                placeholder="г. Киров, ул. Ленина, д. 10"
                                                style={{ border: !clientDraft.legal_address?.trim() ? '1px solid #f59e0b' : '1px solid var(--border)' }}
                                            />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>Должность</div>
                                            <input
                                                id="doc-input-authorized-pos"
                                                className="doc-input-sm"
                                                value={clientDraft.authorized_position}
                                                onChange={e => handleDraftChange('authorized_position', e.target.value)}
                                                placeholder="Генеральный директор"
                                                style={{ border: !clientDraft.authorized_position?.trim() ? '1px solid #f59e0b' : '1px solid var(--border)' }}
                                            />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>На основании чего</div>
                                            <input
                                                id="doc-input-authorized-basis"
                                                className="doc-input-sm"
                                                value={clientDraft.authorized_basis}
                                                onChange={e => handleDraftChange('authorized_basis', e.target.value)}
                                                placeholder="Устава"
                                                style={{ border: !clientDraft.authorized_basis?.trim() ? '1px solid #f59e0b' : '1px solid var(--border)' }}
                                            />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>ФИО представителя</div>
                                            <input
                                                id="doc-input-authorized-name"
                                                className="doc-input-sm"
                                                value={clientDraft.authorized_name}
                                                onChange={e => handleDraftChange('authorized_name', e.target.value)}
                                                placeholder="Иванов Иван Иванович"
                                                style={{ border: !clientDraft.authorized_name?.trim() ? '1px solid #f59e0b' : '1px solid var(--border)' }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>ФИО принципала</div>
                                            <input
                                                id="doc-input-fullname"
                                                className="doc-input-sm"
                                                value={clientDraft.full_name}
                                                onChange={e => handleDraftChange('full_name', e.target.value)}
                                                placeholder="Иванов Иван Иванович"
                                                style={{ border: !clientDraft.full_name?.trim() ? '1px solid #f59e0b' : '1px solid var(--border)' }}
                                            />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>Телефон</div>
                                            <input
                                                id="doc-input-phone"
                                                type="tel"
                                                className="doc-input-sm"
                                                value={clientDraft.phone}
                                                onChange={e => handleDraftChange('phone', formatPhone(e.target.value, true))}
                                                placeholder="+7 (___) ___-__-__"
                                                style={{ border: !clientDraft.phone?.trim() ? '1px solid #f59e0b' : '1px solid var(--border)' }}
                                            />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>Дата рождения</div>
                                            <input
                                                id="doc-input-birthdate"
                                                type="date"
                                                className="doc-input-sm"
                                                value={clientDraft.birth_date}
                                                onChange={e => handleDraftChange('birth_date', e.target.value)}
                                                style={{ border: !clientDraft.birth_date?.trim() ? '1px solid #f59e0b' : '1px solid var(--border)' }}
                                            />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, fontSize: 10.5 }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>Серия и номер паспорта</span>
                                                {(!clientDraft.passport_series?.trim() || !clientDraft.passport_number?.trim()) ? (
                                                    <span style={{ color: '#d97706', fontWeight: 600 }}>● Заполнить</span>
                                                ) : (
                                                    <span style={{ color: '#10b981' }}>✓ Заполнено</span>
                                                )}
                                            </div>
                                            <input
                                                id="doc-input-passport"
                                                className="doc-input-sm"
                                                value={formatPassportDisplay(clientDraft.passport_series, clientDraft.passport_number)}
                                                onChange={e => {
                                                    const formatted = formatPassportInput(e.target.value);
                                                    const { series, number } = parsePassportInput(formatted);
                                                    handleDraftChange('passport_series', series);
                                                    handleDraftChange('passport_number', number);
                                                }}
                                                placeholder="__ __ ______"
                                                maxLength={12}
                                                style={{
                                                    border: (!clientDraft.passport_series?.trim() || !clientDraft.passport_number?.trim())
                                                        ? '1px solid #f59e0b'
                                                        : '1px solid var(--border)'
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>Дата выдачи</div>
                                            <input
                                                id="doc-input-issue-date"
                                                type="date"
                                                className="doc-input-sm"
                                                value={clientDraft.passport_issue_date}
                                                onChange={e => handleDraftChange('passport_issue_date', e.target.value)}
                                                style={{ border: !clientDraft.passport_issue_date?.trim() ? '1px solid #f59e0b' : '1px solid var(--border)' }}
                                            />
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, fontSize: 10.5 }}>
                                                <span style={{ color: 'var(--text-secondary)' }}>Код подразделения</span>
                                                {!clientDraft.passport_unit_code?.trim() ? (
                                                    <span style={{ color: '#d97706', fontWeight: 600 }}>● Заполнить</span>
                                                ) : (
                                                    <span style={{ color: '#10b981' }}>✓</span>
                                                )}
                                            </div>
                                            <input
                                                id="doc-input-unit-code"
                                                className="doc-input-sm"
                                                value={clientDraft.passport_unit_code}
                                                onChange={e => handleDraftChange('passport_unit_code', formatUnitCode(e.target.value))}
                                                placeholder="___-___"
                                                maxLength={7}
                                                style={{ border: !clientDraft.passport_unit_code?.trim() ? '1px solid #f59e0b' : '1px solid var(--border)' }}
                                            />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>Кем выдан</div>
                                            <input
                                                id="doc-input-issued-by"
                                                className="doc-input-sm"
                                                value={clientDraft.passport_issued_by}
                                                onChange={e => handleDraftChange('passport_issued_by', e.target.value)}
                                                placeholder="Отделом УФМС России..."
                                                style={{ border: !clientDraft.passport_issued_by?.trim() ? '1px solid #f59e0b' : '1px solid var(--border)' }}
                                            />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>Адрес регистрации</div>
                                            <input
                                                id="doc-input-reg-address"
                                                className="doc-input-sm"
                                                value={clientDraft.registration_address}
                                                onChange={e => handleDraftChange('registration_address', e.target.value)}
                                                placeholder="г. Киров, ул. Ленина, д. 10, кв. 15"
                                                style={{ border: !clientDraft.registration_address?.trim() ? '1px solid #f59e0b' : '1px solid var(--border)' }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Кнопка сохранения в CRM */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                                    {activeClient ? (
                                        <button
                                            type="button"
                                            className="btn-compact btn-compact-primary"
                                            onClick={handleSaveToCrm}
                                            disabled={isSavingToCrm}
                                            style={{ background: isSavedToCrm ? '#10b981' : 'var(--primary)' }}
                                        >
                                            {isSavingToCrm ? <Loader2 size={13} className="animate-spin" /> : (isSavedToCrm ? <Check size={13} /> : <Save size={13} />)}
                                            {isSavingToCrm ? 'Сохранение...' : (isSavedToCrm ? 'Сохранено' : 'Сохранить в CRM')}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            className="btn-compact btn-compact-primary"
                                            onClick={handleSaveNewClientToCrm}
                                            disabled={isSavingToCrm || !clientDraft.full_name?.trim()}
                                            style={{ background: isSavedToCrm ? '#10b981' : 'var(--primary)' }}
                                        >
                                            {isSavingToCrm ? <Loader2 size={13} className="animate-spin" /> : (isSavedToCrm ? <Check size={13} /> : <UserPlus size={13} />)}
                                            {isSavingToCrm ? 'Создание...' : (isSavedToCrm ? 'Клиент сохранен' : 'Сохранить в CRM')}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Карточка 3: Характеристики объекта недвижимости */}
                {(activeProperty || isAgencySale || selectedTemplate === 'yuss_buy_1' || propertyId) && (
                    <div className="doc-card no-print">
                        <div
                            className="doc-card-header"
                            onClick={() => toggleSection('property')}
                            role="button"
                            tabIndex={0}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                                <Building2 size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    Объект{propDraft.address ? `: ${propDraft.address}` : ''}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                                {propMissingCount > 0 ? (
                                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', fontWeight: 600 }}>
                                        ● {propMissingCount}
                                    </span>
                                ) : (
                                    <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 6, background: 'rgba(16, 185, 129, 0.12)', color: '#059669', fontWeight: 600 }}>
                                        ✓ Ок
                                    </span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => toggleSection('property')}
                                    style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                                >
                                    <ChevronDown size={14} style={{ transform: collapsedSections.property ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
                                </button>
                            </div>
                        </div>

                        {!collapsedSections.property && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>Вид объекта (п. 1.1)</div>
                                        <input
                                            id="doc-input-prop-kind"
                                            className="doc-input-sm"
                                            value={propDraft.property_kind}
                                            onChange={e => handlePropDraftChange('property_kind', e.target.value)}
                                            placeholder="2-комн. квартира"
                                            style={{ border: !propDraft.property_kind?.trim() ? '1px solid #f59e0b' : '1px solid var(--border)' }}
                                        />
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>Адрес объекта</div>
                                        <input
                                            id="doc-input-prop-address"
                                            className="doc-input-sm"
                                            value={propDraft.address}
                                            onChange={e => handlePropDraftChange('address', e.target.value)}
                                            placeholder="г. Киров, ул. Ленина, д. 10, кв. 15"
                                            style={{ border: !propDraft.address?.trim() ? '1px solid #f59e0b' : '1px solid var(--border)' }}
                                        />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>Кадастровый номер</div>
                                        <input
                                            id="doc-input-prop-cadastral"
                                            className="doc-input-sm"
                                            value={propDraft.cadastral_number}
                                            onChange={e => handlePropDraftChange('cadastral_number', e.target.value)}
                                            placeholder="43:40:000000:000"
                                            style={{ border: !propDraft.cadastral_number?.trim() ? '1px solid #f59e0b' : '1px solid var(--border)' }}
                                        />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>Площадь (кв. м)</div>
                                        <input
                                            id="doc-input-prop-area"
                                            className="doc-input-sm"
                                            value={propDraft.area_total}
                                            onChange={e => handlePropDraftChange('area_total', e.target.value.replace(/[^\d.,]/g, ''))}
                                            placeholder="45,4"
                                            style={{ border: !propDraft.area_total ? '1px solid #f59e0b' : '1px solid var(--border)' }}
                                        />
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>Стоимость (₽) — п. 1.1.1</div>
                                        <input
                                            id="doc-input-prop-price"
                                            className="doc-input-sm"
                                            value={propDraft.price ? Number(String(propDraft.price).replace(/\D/g, '')).toLocaleString('ru-RU') : ''}
                                            onChange={e => {
                                                const digits = e.target.value.replace(/\D/g, '');
                                                handlePropDraftChange('price', digits);
                                            }}
                                            placeholder="4 500 000"
                                            style={{ fontWeight: 600, border: !propDraft.price ? '1px solid #f59e0b' : '1px solid var(--border)' }}
                                        />
                                        {propDraft.price && Number(String(propDraft.price).replace(/\D/g, '')) > 0 && (
                                            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 2 }}>
                                                {numberToWordsRu(Number(String(propDraft.price).replace(/\D/g, '')))} руб.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                                    <button
                                        type="button"
                                        className="btn-compact btn-compact-primary"
                                        onClick={handleSaveToCrm}
                                        disabled={isSavingToCrm}
                                        style={{ background: isSavedToCrm ? '#10b981' : 'var(--primary)' }}
                                    >
                                        {isSavingToCrm ? <Loader2 size={13} className="animate-spin" /> : (isSavedToCrm ? <Check size={13} /> : <Save size={13} />)}
                                        {isSavingToCrm ? 'Сохранение...' : (isSavedToCrm ? 'Сохранено' : 'Сохранить объект')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Карточка 4: Параметры договора / акта */}
                <div className="doc-card no-print">
                    <div
                        className="doc-card-header"
                        onClick={() => toggleSection('contractParams')}
                        role="button"
                        tabIndex={0}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                            {selectedTemplate === 'key_act' ? <Key size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} /> : <Briefcase size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />}
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {isServicesRent3Party ? 'Условия 3-стор. договора' : selectedTemplate === 'act' ? 'Параметры акта приема' : selectedTemplate === 'key_act' ? 'Параметры акта ключей' : 'Условия договора'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                            {!isServicesRent3Party && selectedTemplate !== 'act' && selectedTemplate !== 'key_act' && (
                                <span style={{
                                    fontSize: 10,
                                    fontWeight: 600,
                                    padding: '2px 7px',
                                    borderRadius: 6,
                                    background: contractStatus === 'active' ? 'rgba(16, 185, 129, 0.12)' : (contractStatus === 'fulfilled' ? 'rgba(5, 150, 105, 0.16)' : 'rgba(100, 116, 139, 0.12)'),
                                    color: contractStatus === 'active' ? '#059669' : (contractStatus === 'fulfilled' ? '#047857' : '#64748b'),
                                    border: `1px solid ${contractStatus === 'active' ? 'rgba(16, 185, 129, 0.3)' : (contractStatus === 'fulfilled' ? 'rgba(5, 150, 105, 0.35)' : 'rgba(100, 116, 139, 0.25)')}`
                                }}>
                                    {contractStatus === 'active' ? 'Действующий' : contractStatus === 'fulfilled' ? 'Исполнен' : 'Закрыт'}
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => toggleSection('contractParams')}
                                style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                            >
                                <ChevronDown size={14} style={{ transform: collapsedSections.contractParams ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
                            </button>
                        </div>
                    </div>

                    {!collapsedSections.contractParams && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                            {isServicesRent3Party ? (
                                <>
                                    {/* Риелтор (Исполнитель 2) */}
                                    <div style={{ background: 'var(--bg)', borderRadius: 9, padding: '8px 10px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>
                                                Исполнитель 2: {realtor?.full_name || 'Не указан'}
                                            </span>
                                            <select
                                                value={realtorTaxStatus}
                                                onChange={e => setRealtorTaxStatus(e.target.value)}
                                                style={{ fontSize: 10.5, fontWeight: 600, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--primary)', padding: '1px 4px' }}
                                            >
                                                <option value="Самозанятый">Самозанятый</option>
                                                <option value="Физическое лицо">Физлицо</option>
                                                <option value="Индивидуальный предприниматель">ИП</option>
                                            </select>
                                        </div>
                                        <div style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>
                                            ИНН: {realtor?.inn || 'нет'} | Паспорт: {realtor?.passport_details?.series ? `${realtor.passport_details.series} ${realtor.passport_details.number}` : 'нет'}
                                        </div>
                                    </div>

                                    {/* Стоимость услуг Исполнителя 1 */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, marginBottom: 2 }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Исполнитель 1 (ИП Муравьева) ₽</span>
                                            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>НДС 5%</span>
                                        </div>
                                        <input
                                            id="doc-input-service1-cost"
                                            className="doc-input-sm"
                                            value={service1Cost}
                                            onChange={e => {
                                                const digits = e.target.value.replace(/\D/g, '');
                                                setService1Cost(digits ? Number(digits).toLocaleString('ru-RU') : '');
                                            }}
                                            placeholder="5 000"
                                            style={{ fontWeight: 600 }}
                                        />
                                        <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                                            {[3000, 5000, 7000, 10000].map(amt => (
                                                <button
                                                    key={amt}
                                                    type="button"
                                                    onClick={() => setService1Cost(amt.toLocaleString('ru-RU'))}
                                                    style={{ padding: '2px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-secondary)', fontSize: 10, cursor: 'pointer' }}
                                                >
                                                    {amt / 1000}к
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Стоимость услуг Исполнителя 2 */}
                                    <div>
                                        <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>Исполнитель 2 ₽</div>
                                        <input
                                            id="doc-input-service2-cost"
                                            className="doc-input-sm"
                                            value={service2Cost}
                                            onChange={e => {
                                                const digits = e.target.value.replace(/\D/g, '');
                                                setService2Cost(digits ? Number(digits).toLocaleString('ru-RU') : '');
                                            }}
                                            placeholder="15 000"
                                            style={{ fontWeight: 600 }}
                                        />
                                        <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                                            {[10000, 15000, 20000, 25000].map(amt => (
                                                <button
                                                    key={amt}
                                                    type="button"
                                                    onClick={() => setService2Cost(amt.toLocaleString('ru-RU'))}
                                                    style={{ padding: '2px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-secondary)', fontSize: 10, cursor: 'pointer' }}
                                                >
                                                    {amt / 1000}к
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Даты */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                        <div>
                                            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>Срок договора</div>
                                            <input
                                                id="doc-input-contract-end-date"
                                                type="date"
                                                className="doc-input-sm"
                                                value={contractEndDate}
                                                onChange={e => setContractEndDate(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>Дата Акта</div>
                                            <input
                                                id="doc-input-act-date"
                                                type="date"
                                                className="doc-input-sm"
                                                value={actDate}
                                                onChange={e => setActDate(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : selectedTemplate === 'act' ? (
                                <>
                                    <div>
                                        <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>Дата составления акта</div>
                                        <input
                                            id="doc-input-act-date"
                                            type="date"
                                            className="doc-input-sm"
                                            value={actDate}
                                            onChange={e => setActDate(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>Имущество / мебель (опционально)</div>
                                        <input
                                            className="doc-input-sm"
                                            value={movableProperty}
                                            onChange={e => setMovableProperty(e.target.value)}
                                            placeholder="кухонный гарнитур, техника..."
                                        />
                                    </div>
                                </>
                            ) : selectedTemplate === 'key_act' ? (
                                <>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                                        <div>
                                            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>Дата акта</div>
                                            <input
                                                id="doc-input-act-date"
                                                type="date"
                                                className="doc-input-sm"
                                                value={actDate}
                                                onChange={e => setActDate(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>Город</div>
                                            <input
                                                id="doc-input-key-city"
                                                className="doc-input-sm"
                                                value={city}
                                                onChange={e => setCity(e.target.value)}
                                                placeholder="г. Киров"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', marginBottom: 2 }}>Агент по договору</div>
                                        <input
                                            id="doc-input-key-agency"
                                            className="doc-input-sm"
                                            value={agencyCustomName}
                                            onChange={e => setAgencyCustomName(e.target.value)}
                                            placeholder="ИП Муравьевой Ю.А."
                                        />
                                    </div>

                                    {/* Сторона Передал (Принципал / ответственное лицо) */}
                                    <div style={{ background: 'var(--bg)', borderRadius: 9, padding: '8px 10px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
                                                Передал: {clientDraft.is_legal_entity ? (clientDraft.authorized_name || 'Ответственное лицо') : (clientDraft.full_name || 'Принципал')}
                                            </span>
                                            <span style={{ fontSize: 9.5, padding: '1px 5px', borderRadius: 5, background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', fontWeight: 600 }}>
                                                {clientDraft.is_legal_entity ? 'Отв. лицо' : 'Физлицо'}
                                            </span>
                                        </div>
                                        {clientDraft.is_legal_entity && individualClients.length > 0 && (
                                            <select
                                                style={{ height: 26, borderRadius: 6, fontSize: 10.5, background: 'var(--surface)', border: '1px solid var(--border)', padding: '0 4px' }}
                                                value={activeClient?.authorized_person_id || ''}
                                                onChange={e => {
                                                    const selectedId = e.target.value;
                                                    if (!selectedId) return;
                                                    const ind = state.clients.find(c => String(c.id) === String(selectedId));
                                                    if (ind) {
                                                        const ip = ind.passport_details || {};
                                                        setClientDraft(prev => ({
                                                            ...prev,
                                                            authorized_name: ind.full_name || prev.authorized_name,
                                                            auth_person_birth: ind.birth_date || ip.birth_date || '',
                                                            auth_person_series: ip.series || '',
                                                            auth_person_number: ip.number || '',
                                                            auth_person_issued_by: ip.issued_by || '',
                                                            auth_person_issue_date: ip.issue_date || '',
                                                            auth_person_unit_code: ip.unit_code || '',
                                                            auth_person_reg_address: ip.registration_address || ind.reg_address || ind.address || '',
                                                        }));
                                                    }
                                                }}
                                            >
                                                <option value="">- Заполнить из контакта -</option>
                                                {individualClients.map(c => (
                                                    <option key={c.id} value={c.id}>{c.full_name}</option>
                                                ))}
                                            </select>
                                        )}
                                        <div>
                                            <input
                                                id="doc-input-key-principal-passport"
                                                className="doc-input-sm"
                                                value={formatPassportDisplay(
                                                    clientDraft.is_legal_entity ? clientDraft.auth_person_series : clientDraft.passport_series,
                                                    clientDraft.is_legal_entity ? clientDraft.auth_person_number : clientDraft.passport_number
                                                )}
                                                onChange={e => {
                                                    const formatted = formatPassportInput(e.target.value);
                                                    const { series, number } = parsePassportInput(formatted);
                                                    if (clientDraft.is_legal_entity) {
                                                        handleDraftChange('auth_person_series', series);
                                                        handleDraftChange('auth_person_number', number);
                                                    } else {
                                                        handleDraftChange('passport_series', series);
                                                        handleDraftChange('passport_number', number);
                                                    }
                                                }}
                                                placeholder="Серия и номер: __ __ ______"
                                                maxLength={12}
                                            />
                                        </div>
                                    </div>

                                    {/* Сторона Принял (Риелтор) */}
                                    <div style={{ background: 'var(--bg)', borderRadius: 9, padding: '8px 10px', border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
                                                Принял (Риелтор): {realtorDraft.full_name || realtor?.full_name || ''}
                                            </span>
                                            <span style={{ fontSize: 9.5, color: realtorDraft.number ? '#059669' : '#d97706', fontWeight: 600 }}>
                                                {realtorDraft.number ? '✓ Ок' : '● Нет паспорта'}
                                            </span>
                                        </div>
                                        <div>
                                            <input
                                                id="doc-input-realtor-passport"
                                                className="doc-input-sm"
                                                value={formatPassportDisplay(realtorDraft.series, realtorDraft.number)}
                                                onChange={e => {
                                                    const formatted = formatPassportInput(e.target.value);
                                                    const { series, number } = parsePassportInput(formatted);
                                                    setRealtorDraft(prev => ({ ...prev, series, number }));
                                                }}
                                                placeholder="Серия и номер: __ __ ______"
                                                maxLength={12}
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Статус агентского договора */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, marginBottom: 4 }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Статус договора (АД)</span>
                                            <span style={{
                                                fontSize: 10,
                                                fontWeight: 600,
                                                color: contractStatus === 'active' ? '#059669' : (contractStatus === 'fulfilled' ? '#047857' : '#64748b')
                                            }}>
                                                {contractStatus === 'active' ? '● В работе' : contractStatus === 'fulfilled' ? '✓ Завершен' : '✖ Расторгнут / закрыт'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                                            {[
                                                { id: 'active', label: 'Действующий', color: '#059669', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.35)' },
                                                { id: 'fulfilled', label: 'Исполнен', color: '#047857', bg: 'rgba(5, 150, 105, 0.16)', border: 'rgba(5, 150, 105, 0.4)' },
                                                { id: 'closed', label: 'Закрыт', color: '#64748b', bg: 'rgba(100, 116, 139, 0.12)', border: 'rgba(100, 116, 139, 0.3)' }
                                            ].map(st => {
                                                const isSel = contractStatus === st.id;
                                                return (
                                                    <button
                                                        key={st.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setContractStatus(st.id);
                                                            setIsSavedToCrm(false);
                                                        }}
                                                        style={{
                                                            padding: '6px 4px',
                                                            borderRadius: 8,
                                                            fontSize: 11,
                                                            fontWeight: isSel ? 700 : 500,
                                                            border: isSel ? `1.5px solid ${st.border}` : '1px solid var(--border)',
                                                            background: isSel ? st.bg : 'var(--bg)',
                                                            color: isSel ? st.color : 'var(--text-secondary)',
                                                            cursor: 'pointer',
                                                            transition: 'all 0.15s ease',
                                                            textAlign: 'center'
                                                        }}
                                                    >
                                                        {st.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Стандартный агентский договор */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, marginBottom: 2 }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Вознаграждение агента (₽) — п. 3.1</span>
                                            {commission?.trim() ? <span style={{ color: '#10b981' }}>✓ Указано</span> : <span style={{ color: '#d97706' }}>● Заполнить</span>}
                                        </div>
                                        <input
                                            id="doc-input-commission"
                                            className="doc-input-sm"
                                            value={commission}
                                            onChange={e => {
                                                const digits = e.target.value.replace(/\D/g, '');
                                                setCommission(digits ? Number(digits).toLocaleString('ru-RU') : '');
                                            }}
                                            placeholder="50 000"
                                            style={{ fontWeight: 600, border: !commission?.trim() ? '1px solid #f59e0b' : '1px solid var(--border)' }}
                                        />
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
                                            {[30000, 50000, 70000, 100000].map(amt => (
                                                <button
                                                    key={amt}
                                                    type="button"
                                                    onClick={() => setCommission(amt.toLocaleString('ru-RU'))}
                                                    style={{ padding: '2px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-secondary)', fontSize: 10, cursor: 'pointer' }}
                                                >
                                                    {amt / 1000}к
                                                </button>
                                            ))}
                                        </div>
                                        {commission && Number(commission.replace(/\D/g, '')) > 0 && (
                                            <div style={{ fontSize: 10.5, color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: 2 }}>
                                                {numberToWordsRu(Number(commission.replace(/\D/g, '')))} руб. (в т.ч. НДС 5%)
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, marginBottom: 2 }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>Срок договора (до даты) — п. 5.1</span>
                                            {contractEndDate ? <span style={{ color: '#10b981' }}>✓ Выбран</span> : <span style={{ color: '#d97706' }}>● Выбрать</span>}
                                        </div>
                                        <input
                                            id="doc-input-contract-end-date"
                                            type="date"
                                            className="doc-input-sm"
                                            value={contractEndDate}
                                            onChange={e => setContractEndDate(e.target.value)}
                                            style={{ border: !contractEndDate ? '1px solid #f59e0b' : '1px solid var(--border)' }}
                                        />
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 3 }}>
                                            {[
                                                { label: '+1 мес', m: 1 },
                                                { label: '+2 мес', m: 2 },
                                                { label: '+3 мес', m: 3 },
                                                { label: '+6 мес', m: 6 },
                                            ].map(item => (
                                                <button
                                                    key={item.label}
                                                    type="button"
                                                    onClick={() => {
                                                        const d = new Date();
                                                        d.setMonth(d.getMonth() + item.m);
                                                        setContractEndDate(d.toISOString().split('T')[0]);
                                                    }}
                                                    style={{ padding: '2px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-secondary)', fontSize: 10, cursor: 'pointer' }}
                                                >
                                                    {item.label}
                                                </button>
                                            ))}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const yr = new Date().getFullYear();
                                                    setContractEndDate(`${yr}-12-31`);
                                                }}
                                                style={{ padding: '2px 6px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-secondary)', fontSize: 10, cursor: 'pointer' }}
                                            >
                                                До 31 дек
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Кнопка сохранения условий в CRM */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                                <button
                                    type="button"
                                    className="btn-compact btn-compact-primary"
                                    onClick={handleSaveToCrm}
                                    disabled={isSavingToCrm || (!activeClient && !activeProperty && !selectedDealId)}
                                    style={{ background: isSavedToCrm ? '#10b981' : 'var(--primary)' }}
                                    title="Сохранить условия договора и статус в CRM"
                                >
                                    {isSavingToCrm ? <Loader2 size={13} className="animate-spin" /> : (isSavedToCrm ? <Check size={13} /> : <Save size={13} />)}
                                    {isSavingToCrm ? 'Сохранение...' : (isSavedToCrm ? 'Сохранено' : 'Сохранить условия')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Модальное окно быстрого создания клиента */}
                <QuickClientModal
                    isOpen={quickModalConfig.isOpen}
                    onClose={() => setQuickModalConfig(prev => ({ ...prev, isOpen: false }))}
                    initialName={quickModalConfig.initialName}
                    role={quickModalConfig.role}
                    onCreated={(newClient) => {
                        if (selectedTemplate === 'yuss_buy_1' || selectedTemplate === 'agency_sale_1') {
                            setBuyerId(newClient.id);
                            setSellerId(newClient.id);
                        } else if (quickModalConfig.role === 'seller') {
                            setSellerId(newClient.id);
                        } else {
                            setBuyerId(newClient.id);
                        }
                    }}
                />

                {/* Карточка 5: Сводка данных (Свернута по умолчанию) */}
                {(seller || buyer || property || deal) && (
                    <div className="doc-card no-print">
                        <div
                            className="doc-card-header"
                            onClick={() => toggleSection('dataSummary')}
                            role="button"
                            tabIndex={0}
                        >
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                Сводка данных документа
                            </span>
                            <button
                                type="button"
                                onClick={() => toggleSection('dataSummary')}
                                style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}
                            >
                                <ChevronDown size={14} style={{ transform: collapsedSections.dataSummary ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
                            </button>
                        </div>
                        {!collapsedSections.dataSummary && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                                {isServicesRent3Party ? (
                                    <>
                                        <DataPreview label="Исполнитель 1" value="ИП Муравьева Юлия Анатольевна (г. Киров)" />
                                        <DataPreview label="Исполнитель 2" value={`${(realtorTaxStatus === 'Самозанятый' ? 'Самозанятый ' : '')}${realtor?.full_name || 'Не указан'} (${realtorTaxStatus}, ${realtor?.inn ? `ИНН ${realtor.inn}` : 'ИНН не указан'})`} />
                                        {(buyer || seller) && (
                                            (buyer || seller).is_legal_entity || (buyer || seller).company_name || clientDraft.is_legal_entity ? (
                                                <>
                                                    <DataPreview label="Заказчик (Юрлицо)" value={(buyer || seller).company_name || clientDraft.company_name || (seller || buyer).full_name} />
                                                    {((buyer || seller).inn || clientDraft.inn) && <DataPreview label="ИНН / ОГРН" value={`ИНН ${(buyer || seller).inn || clientDraft.inn}${((buyer || seller).ogrn || clientDraft.ogrn) ? ` / ОГРН ${(buyer || seller).ogrn || clientDraft.ogrn}` : ''}`} />}
                                                    {((buyer || seller).legal_address || clientDraft.legal_address) && <DataPreview label="Юр. адрес" value={(buyer || seller).legal_address || clientDraft.legal_address} />}
                                                    {((buyer || seller).authorized_name || clientDraft.authorized_name) && <DataPreview label="Представитель" value={`${(buyer || seller).authorized_position || clientDraft.authorized_position || 'Руководитель'}: ${(buyer || seller).authorized_name || clientDraft.authorized_name}`} />}
                                                    {(buyer || seller).phone && <DataPreview label="Телефон" value={formatPhone((buyer || seller).phone)} />}
                                                </>
                                            ) : (
                                                <>
                                                    <DataPreview label="Заказчик" value={(seller || buyer).full_name} />
                                                    {(buyer || seller).phone && <DataPreview label="Телефон" value={formatPhone((buyer || seller).phone)} />}
                                                    <DataPreview label="Паспорт" value={((buyer || seller).passport_details?.series && (buyer || seller).passport_details?.number) ? `Серия ${(buyer || seller).passport_details.series} № ${(buyer || seller).passport_details.number}` : null} />
                                                    <DataPreview label="Прописка" value={(buyer || seller).passport_details?.registration_address || (buyer || seller).reg_address || (buyer || seller).address} />
                                                </>
                                            )
                                        )}
                                        {service1Cost && (
                                            <DataPreview label="Исполнитель 1 (ИП)" value={`${Number(String(service1Cost).replace(/\D/g, '')).toLocaleString('ru-RU')} ₽ (в т.ч. НДС 5%)`} />
                                        )}
                                        {service2Cost && (
                                            <DataPreview label="Исполнитель 2" value={`${Number(String(service2Cost).replace(/\D/g, '')).toLocaleString('ru-RU')} ₽`} />
                                        )}
                                        {contractEndDate && (
                                            <DataPreview label="Срок договора" value={`до ${new Date(contractEndDate).toLocaleDateString('ru-RU')} включ.`} />
                                        )}
                                        {actDate && (
                                            <DataPreview label="Дата Акта" value={new Date(actDate).toLocaleDateString('ru-RU')} />
                                        )}
                                    </>
                                ) : selectedTemplate === 'key_act' ? (
                                    <>
                                        <DataPreview label="Документ" value="Акт приема-передачи ключей" />
                                        <DataPreview label="Принял (Риелтор)" value={`${realtorDraft.full_name || realtor?.full_name || 'Не указан'}${realtorDraft.number ? ` (паспорт № ${realtorDraft.number})` : ''}`} />
                                        {(buyer || seller) && (
                                            clientDraft.is_legal_entity || (buyer || seller).is_legal_entity || (buyer || seller).company_name ? (
                                                <>
                                                    <DataPreview label="Принципал (Юрлицо)" value={clientDraft.company_name || (buyer || seller).company_name || (seller || buyer).full_name} />
                                                    <DataPreview label="Передал (Подписант)" value={`${clientDraft.authorized_name || 'Ответственное лицо'} (ответственное лицо)`} />
                                                    {(clientDraft.auth_person_series || clientDraft.auth_person_number) && (
                                                        <DataPreview label="Паспорт подписанта" value={`Серия ${clientDraft.auth_person_series} № ${clientDraft.auth_person_number}`} />
                                                    )}
                                                </>
                                            ) : (
                                                <>
                                                    <DataPreview label="Передал (Принципал)" value={(seller || buyer).full_name} />
                                                    {((buyer || seller).passport_details?.series && (buyer || seller).passport_details?.number) && (
                                                        <DataPreview label="Паспорт" value={`Серия ${(buyer || seller).passport_details.series} № ${(buyer || seller).passport_details.number}`} />
                                                    )}
                                                </>
                                            )
                                        )}
                                        <DataPreview label="Агент по договору" value={agencyCustomName || 'ИП Муравьевой Ю.А.'} />
                                        {property && (
                                            <>
                                                <DataPreview label="Вид объекта" value={formatPropertyKind(property)} />
                                                <DataPreview label="Адрес объекта" value={property.address || property.city} />
                                            </>
                                        )}
                                        {actDate && <DataPreview label="Дата акта" value={new Date(actDate).toLocaleDateString('ru-RU')} />}
                                    </>
                                ) : isAgencyContract ? (
                                    <>
                                        <DataPreview label="Агент" value="ИП Муравьева Юлия Анатольевна (г. Киров)" />
                                        {(buyer || seller) && (
                                            (buyer || seller).is_legal_entity || (buyer || seller).company_name || clientDraft.is_legal_entity ? (
                                                <>
                                                    <DataPreview label="Принципал (Юрлицо)" value={(buyer || seller).company_name || clientDraft.company_name || (seller || buyer).full_name} />
                                                    {((buyer || seller).inn || clientDraft.inn) && <DataPreview label="ИНН / ОГРН" value={`ИНН ${(buyer || seller).inn || clientDraft.inn}${((buyer || seller).ogrn || clientDraft.ogrn) ? ` / ОГРН ${(buyer || seller).ogrn || clientDraft.ogrn}` : ''}`} />}
                                                    {((buyer || seller).legal_address || clientDraft.legal_address) && <DataPreview label="Юр. адрес" value={(buyer || seller).legal_address || clientDraft.legal_address} />}
                                                    {((buyer || seller).authorized_name || clientDraft.authorized_name) && <DataPreview label="Представитель" value={`${(buyer || seller).authorized_position || clientDraft.authorized_position || 'Руководитель'}: ${(buyer || seller).authorized_name || clientDraft.authorized_name}`} />}
                                                    {(buyer || seller).phone && <DataPreview label="Телефон" value={formatPhone((buyer || seller).phone)} />}
                                                </>
                                            ) : (
                                                <>
                                                    <DataPreview label="Принципал" value={(seller || buyer).full_name} />
                                                    {(buyer || seller).phone && <DataPreview label="Телефон" value={formatPhone((buyer || seller).phone)} />}
                                                    <DataPreview label="Паспорт" value={((buyer || seller).passport_details?.series && (buyer || seller).passport_details?.number) ? `Серия ${(buyer || seller).passport_details.series} № ${(buyer || seller).passport_details.number}` : null} />
                                                    <DataPreview label="Прописка" value={(buyer || seller).passport_details?.registration_address || (buyer || seller).reg_address || (buyer || seller).address} />
                                                </>
                                            )
                                        )}
                                        {property && (
                                            <>
                                                <DataPreview label="Вид объекта" value={formatPropertyKind(property)} />
                                                <DataPreview label="Объект" value={property.address || property.city} />
                                                {property.cadastral_number && <DataPreview label="Кадастровый №" value={property.cadastral_number} />}
                                                {(deal?.price || property.price) && <DataPreview label="Ориентир. стоимость" value={`${Number(String(deal?.price || property.price).replace(/\D/g, '')).toLocaleString('ru-RU')} ₽`} />}
                                            </>
                                        )}
                                        {(deal?.commission || property?.commission || commission) && (
                                            <DataPreview label="Вознаграждение" value={`${Number(String(deal?.commission || property?.commission || commission).replace(/\D/g, '')).toLocaleString('ru-RU')} ₽ (в т.ч. НДС 5%)`} />
                                        )}
                                        {contractEndDate && (
                                            <DataPreview label="Срок договора" value={`до ${new Date(contractEndDate).toLocaleDateString('ru-RU')} включ.`} />
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <DataPreview label="Риелтор" value={realtor?.full_name} />
                                        <DataPreview label="Агентство" value={agencyName} />
                                        {seller && <DataPreview label={selectedTemplate === 'rent' ? 'Наймодатель' : 'Продавец'} value={seller.full_name} />}
                                        {buyer && <DataPreview label={selectedTemplate === 'rent' ? 'Наниматель' : 'Покупатель'} value={buyer.full_name} />}
                                        {property && (
                                            <>
                                                <DataPreview label="Адрес объекта" value={property.address || property.city} />
                                                {property.area_total && <DataPreview label="Площадь" value={`${property.area_total} кв.м.`} />}
                                                {property.price && <DataPreview label="Стоимость" value={`${Number(property.price).toLocaleString('ru-RU')} ₽`} />}
                                                {(movableProperty || property.movable_property) && <DataPreview label="Список имущества" value={movableProperty || property.movable_property} />}
                                            </>
                                        )}
                                        {deal && (
                                            <>
                                                {deal.price && <DataPreview label="Цена сделки" value={`${Number(String(deal.price).replace(/\D/g,'')).toLocaleString('ru-RU')} ₽`} />}
                                                {deal.deal_date && <DataPreview label="Дата сделки" value={new Date(deal.deal_date).toLocaleDateString('ru-RU')} />}
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )}
                    </div>
                    {/* КОНЕЦ ЛЕВОЙ КОЛОНКИ (doc-sidebar) */}

                    {/* ПРАВАЯ КОЛОНКА (Документ + Панель инструментов) */}
                    <div className={`doc-main ${mobileTab === 'settings' ? 'mobile-hidden' : ''}`}>
                        {/* Прилипающая верхняя панель действий (Sticky Toolbar) */}
                        <div className="doc-toolbar-sticky no-print">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {TEMPLATE_ICONS[selectedTemplate] || <FileText size={16} />}
                                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                                            {selectedTemplateMeta?.title || 'Предпросмотр документа'}
                                        </span>
                                    </div>

                                    {/* Метки режима */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {isEditMode ? (
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 6, background: 'rgba(0,102,255,0.12)', color: 'var(--primary)', fontWeight: 600, fontSize: 10.5 }}>
                                                <Edit3 size={11} /> Правка
                                            </span>
                                        ) : (
                                            <>
                                                <span style={{ fontSize: 10.5, padding: '2px 6px', borderRadius: 5, background: 'rgba(0,102,255,0.08)', color: '#0052cc', fontWeight: 600, borderBottom: '2px solid #0066ff' }}>
                                                    🟦 CRM
                                                </span>
                                                <span style={{ fontSize: 10.5, padding: '2px 6px', borderRadius: 5, background: 'rgba(245,158,11,0.12)', color: '#b45309', fontWeight: 600, border: '1px dashed #f59e0b' }}>
                                                    🟧 Поле
                                                </span>
                                                {savedTemplateHtml && (
                                                    <span style={{ fontSize: 10.5, padding: '2px 6px', borderRadius: 5, background: 'rgba(16,185,129,0.12)', color: '#059669', fontWeight: 600 }}>
                                                        ✓ Свой шаблон
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Кнопки действий */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    {/* Подсветка */}
                                    {!isEditMode && (
                                        <button
                                            type="button"
                                            className="btn-compact btn-compact-secondary"
                                            onClick={() => setHighlightSlots(!highlightSlots)}
                                            style={{
                                                background: highlightSlots ? 'rgba(0,102,255,0.08)' : 'var(--bg)',
                                                color: highlightSlots ? 'var(--primary)' : 'var(--text-secondary)',
                                            }}
                                            title="Включить / выключить цветовую подсветку авто-заполненных полей"
                                        >
                                            <Sparkles size={13} />
                                            {highlightSlots ? 'Подсветка: ВКЛ' : 'Подсветка'}
                                        </button>
                                    )}

                                    {/* Редактировать текст */}
                                    <button
                                        type="button"
                                        className={`btn-compact ${isEditMode ? 'btn-compact-primary' : 'btn-compact-secondary'}`}
                                        onClick={() => {
                                            const next = !isEditMode;
                                            setIsEditMode(next);
                                            if (next) setHighlightSlots(false);
                                        }}
                                        title={isEditMode ? "Завершить редактирование текста" : "Редактировать текст документа прямо на листе"}
                                    >
                                        <Edit3 size={13} />
                                        {isEditMode ? 'Завершить' : 'Правка'}
                                    </button>

                                    {/* Сохранить шаблон */}
                                    {(isEditMode || hasManualEdits) && (
                                        <button
                                            type="button"
                                            className="btn-compact"
                                            onClick={handleSaveAsTemplate}
                                            style={{
                                                border: '1px solid rgba(16,185,129,0.3)',
                                                background: 'rgba(16,185,129,0.1)',
                                                color: '#059669',
                                                fontWeight: 600
                                            }}
                                            title="Сохранить текущий текст как постоянный шаблон"
                                        >
                                            <Save size={13} />
                                            Шаблон
                                        </button>
                                    )}

                                    {/* Сбросить */}
                                    {(hasManualEdits || savedTemplateHtml) && (
                                        <button
                                            type="button"
                                            className="btn-compact btn-compact-secondary"
                                            onClick={handleResetTemplate}
                                            title="Сбросить все правки к системному шаблону"
                                        >
                                            <RotateCcw size={12} />
                                            Сброс
                                        </button>
                                    )}

                                    {/* Печать */}
                                    <button
                                        type="button"
                                        className="btn-compact btn-compact-secondary"
                                        onClick={() => window.print()}
                                        title="Распечатать документ"
                                    >
                                        <Printer size={13} />
                                        Печать
                                    </button>

                                    {/* Скачать DOCX */}
                                    <button
                                        type="button"
                                        className="btn-compact btn-compact-primary"
                                        onClick={handleDownload}
                                        disabled={isGenerating}
                                        style={{
                                            opacity: isGenerating ? 0.7 : 1,
                                            cursor: isGenerating ? 'not-allowed' : 'pointer',
                                            padding: '0 14px',
                                        }}
                                        title="Скачать документ в формате Word (.docx)"
                                    >
                                        <Download size={14} />
                                        {isGenerating ? 'Генерация...' : 'Скачать DOCX'}
                                    </button>
                                </div>
                            </div>

                            {/* Подпанель форматирования текста (при isEditMode) */}
                            {isEditMode && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--border-light)', flexWrap: 'wrap', gap: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'var(--bg)', padding: '2px 4px', borderRadius: 8, border: '1px solid var(--border)' }}>
                                        <button
                                            type="button"
                                            onClick={() => document.execCommand('bold', false, null)}
                                            title="Жирный (Ctrl+B)"
                                            style={{ width: 24, height: 24, borderRadius: 5, border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold', color: 'var(--text)', fontSize: 12 }}
                                        >
                                            Ж
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => document.execCommand('italic', false, null)}
                                            title="Курсив (Ctrl+I)"
                                            style={{ width: 24, height: 24, borderRadius: 5, border: 'none', background: 'transparent', cursor: 'pointer', fontStyle: 'italic', color: 'var(--text)', fontSize: 12 }}
                                        >
                                            К
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => document.execCommand('underline', false, null)}
                                            title="Подчеркнутый (Ctrl+U)"
                                            style={{ width: 24, height: 24, borderRadius: 5, border: 'none', background: 'transparent', cursor: 'pointer', textDecoration: 'underline', color: 'var(--text)', fontSize: 12 }}
                                        >
                                            Ч
                                        </button>
                                        <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 2px' }} />
                                        <button
                                            type="button"
                                            onClick={() => document.execCommand('undo', false, null)}
                                            title="Отменить действие (Ctrl+Z)"
                                            style={{ width: 24, height: 24, borderRadius: 5, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}
                                        >
                                            <Undo2 size={12} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => document.execCommand('redo', false, null)}
                                            title="Повторить действие (Ctrl+Y)"
                                            style={{ width: 24, height: 24, borderRadius: 5, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)' }}
                                        >
                                            <Redo2 size={12} />
                                        </button>
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Sparkles size={12} />
                                        <span>Кликните по любому месту текста для правки</span>
                                    </div>
                                </div>
                            )}

                            {/* Баннер сохраненного шаблона */}
                            {savedTemplateHtml && !isEditMode && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, padding: '4px 10px', borderRadius: 8, background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: 11, color: 'var(--text)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <FileText size={13} style={{ color: '#059669' }} />
                                        <span>Активен ваш <strong>сохранённый шаблон</strong></span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleResetTemplate}
                                        style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                                    >
                                        Сбросить к стандартному CRM
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Холст документа (А4 лист) */}
                        <div
                            ref={previewRef}
                            id="doc-print-area"
                            contentEditable={isEditMode}
                            suppressContentEditableWarning={true}
                            onClick={handlePreviewClick}
                            onInput={() => setHasManualEdits(true)}
                            style={{
                                background: 'var(--surface)',
                                color: 'var(--text)',
                                borderRadius: 18,
                                padding: '36px 40px',
                                border: isEditMode ? '2px dashed var(--primary)' : '1px solid var(--border)',
                                boxShadow: isEditMode ? '0 0 0 4px rgba(0,102,255,0.08)' : '0 4px 24px rgba(0,0,0,0.04)',
                                fontFamily: (isAgencyContract || selectedTemplate === 'key_act') ? 'Arial, Helvetica, sans-serif' : 'Georgia, Cambria, "Times New Roman", serif',
                                fontSize: (isAgencyContract || selectedTemplate === 'key_act') ? 13 : 13.5,
                                lineHeight: (isAgencyContract || selectedTemplate === 'key_act') ? 1.55 : 1.75,
                                minHeight: 700,
                                outline: 'none',
                                cursor: isEditMode ? 'text' : 'default',
                                transition: 'border 0.2s, box-shadow 0.2s',
                            }}
                        >
                            {hydratedCustomTemplateHtml ? (
                                <div dangerouslySetInnerHTML={{ __html: hydratedCustomTemplateHtml }} />
                            ) : (
                                <DocumentPreview
                                    key={previewKey}
                                    template={selectedTemplate}
                                    data={generatorData}
                                    highlight={highlightSlots && !isEditMode}
                                    isEditing={isEditMode}
                                />
                            )}
                        </div>
                    </div>
                    {/* КОНЕЦ ПРАВОЙ КОЛОНКИ (doc-main) */}
                </div>
                {/* КОНЕЦ doc-workbench */}
            </div>
        </div>
    );
}

/* ─── Интерактивный слот подстановки данных ──────────────────────────────── */

function Slot({ value, label, fallback, inputId, slotId, highlight = true, isEditing = false }) {
    const hasVal = Boolean(value && String(value).trim());
    const displayVal = hasVal ? String(value) : (fallback || `[● Заполнить: ${label}]`);

    const handleClick = (e) => {
        if (isEditing) return;
        if (inputId) {
            e?.stopPropagation?.();
            const el = document.getElementById(inputId) ||
                ((inputId === 'doc-input-series' || inputId === 'doc-input-number') ? document.getElementById('doc-input-passport') : null) ||
                ((inputId === 'doc-input-key-principal-series' || inputId === 'doc-input-key-principal-number') ? document.getElementById('doc-input-key-principal-passport') : null) ||
                ((inputId === 'doc-input-realtor-series' || inputId === 'doc-input-realtor-number') ? document.getElementById('doc-input-realtor-passport') : null);
            if (el) {
                el.focus();
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };

    return (
        <span
            className={`doc-slot ${hasVal ? 'doc-slot-filled' : 'doc-slot-empty'}`}
            data-slot-id={slotId || ''}
            data-label={label || ''}
            data-input-id={inputId || ''}
            data-fallback={fallback || ''}
            title={hasVal ? `Поле из CRM: ${label}. Нажмите для редактирования.` : `Не заполнено: ${label}. Нажмите, чтобы ввести.`}
            onClick={handleClick}
            style={{
                backgroundColor: highlight && !isEditing ? (hasVal ? 'rgba(0, 102, 255, 0.08)' : 'rgba(245, 158, 11, 0.14)') : 'transparent',
                color: highlight && !isEditing ? (hasVal ? '#0052cc' : '#b45309') : 'inherit',
                fontWeight: hasVal ? (highlight && !isEditing ? 600 : 'normal') : 600,
                padding: highlight && !isEditing ? (hasVal ? '1px 6px' : '2px 8px') : 0,
                borderRadius: 4,
                borderBottom: highlight && !isEditing ? (hasVal ? '2px solid #0066ff' : 'none') : 'none',
                border: highlight && !isEditing ? (hasVal ? 'none' : '1.5px dashed #f59e0b') : 'none',
                margin: highlight && !isEditing ? '0 2px' : 0,
                cursor: inputId ? 'pointer' : 'default',
                display: 'inline',
                transition: 'all 0.15s ease-in-out',
            }}
        >
            {displayVal}
        </span>
    );
}

function renderPassportDetails(person, highlight) {
    if (!person) return <Slot value="" label="Паспортные данные" fallback="________________________" highlight={highlight} />;
    const p = person.passport_details || {};
    const hasP = Boolean(p.series || p.number || p.issued_by || p.registration_address || person.reg_address);
    if (!hasP) return <Slot value="" label="Паспортные данные" fallback="________________________" highlight={highlight} />;
    
    return (
        <span>
            паспорт: серия <Slot slotId="principal_series" value={p.series} label="Серия паспорта" inputId="doc-input-series" highlight={highlight} /> № <Slot slotId="principal_number" value={p.number} label="Номер паспорта" inputId="doc-input-number" highlight={highlight} />
            {p.issued_by ? <>, выдан <Slot slotId="principal_issued_by" value={p.issued_by} label="Кем выдан" inputId="doc-input-issued-by" highlight={highlight} /></> : null}
            {p.unit_code ? <>, код подразделения <Slot slotId="principal_unit_code" value={p.unit_code} label="Код" inputId="doc-input-unit-code" highlight={highlight} /></> : null}
            {(p.registration_address || person.reg_address) ? <>, зарегистрирован: <Slot slotId="principal_reg_address" value={p.registration_address || person.reg_address} label="Адрес регистрации" inputId="doc-input-reg-address" highlight={highlight} /></> : null}
        </span>
    );
}

/* ─── Структурированный предпросмотр документов ───────────────────────────── */

function DocumentPreview({ template, data, highlight = true }) {
    const { seller, buyer, property, realtor, agencyName, deal } = data;

    function f(val, fb = '') {
        if (val === null || val === undefined || val === '') return fb;
        return String(val);
    }
    function fDate(d) {
        if (!d) return '';
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return '';
        return dt.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    function fPrice(p) {
        if (!p && p !== 0) return '';
        const n = Number(String(p).replace(/\D/g, ''));
        return isNaN(n) ? String(p) : n.toLocaleString('ru-RU') + ' ₽';
    }

    const realtorName = f(realtor?.full_name);
    const agency = f(agencyName || realtor?.agency_name);
    const sellerName = f(seller?.full_name);
    const buyerName = f(buyer?.full_name);
    const address = f(property?.address || property?.city);
    const area = property?.area_total ? `${property.area_total} кв.м.` : '';
    const price = fPrice(deal?.price || property?.price);
    const dealDate = fDate(deal?.deal_date);
    const today = fDate(deal?.deal_date || new Date().toISOString());

    const isAgencySale = template === 'agency_sale_1';
    const principal = isAgencySale ? (seller || buyer) : (buyer || seller);
    const pDetails = principal?.passport_details || {};
    const pCompany = principal?.company_details || {};
    const pAuth = principal?.authorized_person || {};
    const isLegalEntity = Boolean(
        data.isLegalEntity ||
        principal?.is_legal_entity ||
        principal?.client_types?.includes('legal_entity') ||
        principal?.company_name ||
        pCompany.name ||
        pCompany.inn ||
        pCompany.ogrn ||
        /^(ООО|ОАО|ЗАО|ПАО|АО|МУП|ГУП|НКО|АНО)\b/i.test(principal?.full_name || '')
    );
    const companyName = f(principal?.company_name || pCompany.name || pCompany.short_name || (isLegalEntity ? principal?.full_name : ''));
    const companyInn = f(principal?.inn || pCompany.inn);
    const companyKpp = f(principal?.kpp || pCompany.kpp);
    const companyOgrn = f(principal?.ogrn || pCompany.ogrn);
    const companyLegalAddress = f(principal?.legal_address || pCompany.legal_address || principal?.reg_address || principal?.address);
    const authPosition = f(principal?.authorized_position || pAuth.position || pCompany.director_position || 'Генерального директора');
    const authPositionNom = f(principal?.authorized_position || pAuth.position || pCompany.director_position || 'Генеральный директор');
    const authName = f(principal?.authorized_name || pAuth.name || pCompany.director_name || (!isLegalEntity ? principal?.full_name : ''));
    const authBasis = f(principal?.authorized_basis || pAuth.basis_document || 'Устава');
    const authShort = toShortName(authName);

    const principalName = f(principal?.full_name);
    const principalBirth = principal?.birth_date ? fDate(principal.birth_date) : (pDetails.birth_date ? fDate(pDetails.birth_date) : '');
    const principalSeries = f(pDetails.series);
    const principalNumber = f(pDetails.number);
    const principalIssuedBy = f(pDetails.issued_by);
    const principalIssueDate = pDetails.issue_date ? fDate(pDetails.issue_date) : '';
    const principalUnitCode = f(pDetails.unit_code);
    const principalRegAddress = f(pDetails.registration_address || principal?.reg_address || principal?.address);
    const principalPhone = f(formatPhone(principal?.phone) || principal?.phone);
    const principalShort = isLegalEntity ? authShort : toShortName(principalName);

    // Характеристики объекта для агентского договора на продажу
    const propKind = formatPropertyKind(property);
    const propAddress = f(property?.address || property?.city);
    const propCadastral = f(property?.cadastral_number);
    const propArea = property?.area_total ? `${property.area_total} кв.м.` : '';
    const propRooms = property?.rooms ? (property.rooms === 'studio' ? 'Студия' : `${property.rooms}-комн. кв.`) : (property?.property_type === 'house' ? 'Жилой дом' : (property?.property_type === 'land' ? 'Земельный участок' : ''));
    const _propPrefix = [propRooms, propArea].filter(Boolean).join(', ');

    const rawPrice = deal?.price || property?.price;
    const cleanPriceNum = rawPrice ? Number(String(rawPrice).replace(/\D/g, '')) : 0;
    const priceFormatted = cleanPriceNum > 0 ? cleanPriceNum.toLocaleString('ru-RU') : '';
    const priceWords = cleanPriceNum > 0 ? `(${numberToWordsRu(cleanPriceNum)})` : '';

    const rawCommission = deal?.commission || property?.commission;
    const cleanComm = rawCommission ? Number(String(rawCommission).replace(/\D/g, '')) : 0;
    const commFormatted = cleanComm > 0 ? cleanComm.toLocaleString('ru-RU') : '';
    const commWords = cleanComm > 0 ? `(${numberToWordsRu(cleanComm)})` : '';
    const rawEndDate = data.contractEndDate || deal?.contract_end_date;
    const contractEndDate = rawEndDate ? fDate(rawEndDate) : '';

    // Исполнитель 2 (из профиля или generatorData)
    const rDetails = realtor?.passport_details || {};
    const realtorTaxStatus = data.realtorTaxStatus || realtor?.tax_status || rDetails?.tax_status || 'Самозанятый';
    const isRealtorSelfEmployed = Boolean(
        data.isRealtorSelfEmployed !== undefined 
            ? data.isRealtorSelfEmployed 
            : (realtorTaxStatus || '').toLowerCase().includes('самозанят')
    );
    const realtorPrefix = isRealtorSelfEmployed ? 'Самозанятый ' : (realtorTaxStatus === 'Индивидуальный предприниматель' ? 'Индивидуальный предприниматель ' : 'Гр. ');
    const realtorFullName = f(realtor?.full_name);
    const realtorBirth = realtor?.birth_date ? fDate(realtor.birth_date) : (rDetails.birth_date ? fDate(rDetails.birth_date) : '');
    const realtorSeries = f(rDetails.series);
    const realtorNumber = f(rDetails.number);
    const realtorIssuedBy = f(rDetails.issued_by);
    const realtorIssueDate = rDetails.issue_date ? fDate(rDetails.issue_date) : '';
    const realtorUnitCode = f(rDetails.unit_code);
    const realtorRegAddress = f(rDetails.registration_address || realtor?.reg_address || realtor?.address);
    const realtorPhone = f(formatPhone(realtor?.phone) || realtor?.phone);
    const realtorInn = f(realtor?.inn);
    const realtorShort = toShortName(realtorFullName);

    // Заказчик (Клиент)
    const customer = buyer || seller || principal;
    const cDetails = customer?.passport_details || {};
    const cCompany = customer?.company_details || {};
    const cAuth = customer?.authorized_person || {};
    const isCustomerLegalEntity = Boolean(
        data.isLegalEntity ||
        customer?.is_legal_entity ||
        customer?.client_types?.includes('legal_entity') ||
        customer?.company_name ||
        cCompany.name ||
        cCompany.inn ||
        cCompany.ogrn ||
        /^(ООО|ОАО|ЗАО|ПАО|АО|МУП|ГУП|НКО|АНО)\b/i.test(customer?.full_name || '')
    );
    const customerCompanyName = f(customer?.company_name || cCompany.name || cCompany.short_name || (isCustomerLegalEntity ? customer?.full_name : ''));
    const customerCompanyInn = f(customer?.inn || cCompany.inn);
    const customerCompanyKpp = f(customer?.kpp || cCompany.kpp);
    const customerCompanyOgrn = f(customer?.ogrn || cCompany.ogrn);
    const customerCompanyLegalAddress = f(customer?.legal_address || cCompany.legal_address || customer?.reg_address || customer?.address);
    const customerAuthPosition = f(customer?.authorized_position || cAuth.position || cCompany.director_position || 'Генерального директора');
    const customerAuthPositionNom = f(customer?.authorized_position || cAuth.position || cCompany.director_position || 'Генеральный директор');
    const customerAuthName = f(customer?.authorized_name || cAuth.name || cCompany.director_name || (!isCustomerLegalEntity ? customer?.full_name : ''));
    const customerAuthBasis = f(customer?.authorized_basis || cAuth.basis_document || 'Устава');
    const customerAuthShort = toShortName(customerAuthName);

    const customerFullName = f(customer?.full_name);
    const customerBirth = customer?.birth_date ? fDate(customer.birth_date) : (cDetails.birth_date ? fDate(cDetails.birth_date) : '');
    const customerSeries = f(cDetails.series);
    const customerNumber = f(cDetails.number);
    const customerIssuedBy = f(cDetails.issued_by);
    const customerIssueDate = cDetails.issue_date ? fDate(cDetails.issue_date) : '';
    const _customerUnitCode = f(cDetails.unit_code);
    const customerRegAddress = f(cDetails.registration_address || customer?.reg_address || customer?.address);
    const customerPhone = f(formatPhone(customer?.phone) || customer?.phone);
    const customerEmail = f(customer?.email);
    const customerShort = isCustomerLegalEntity ? customerAuthShort : toShortName(customerFullName);

    // Стоимости услуг (Исполнитель 1 и Исполнитель 2)
    const rawS1 = data.service1Cost !== undefined ? data.service1Cost : (deal?.service1_cost || '');
    const cleanS1 = rawS1 ? Number(String(rawS1).replace(/\D/g, '')) : 0;
    const s1Formatted = cleanS1 > 0 ? cleanS1.toLocaleString('ru-RU') : '';
    const s1Words = cleanS1 > 0 ? `(${numberToWordsRu(cleanS1)})` : '';

    const rawS2 = data.service2Cost !== undefined ? data.service2Cost : (deal?.service2_cost || '');
    const cleanS2 = rawS2 ? Number(String(rawS2).replace(/\D/g, '')) : 0;
    const s2Formatted = cleanS2 > 0 ? cleanS2.toLocaleString('ru-RU') : '';
    const s2Words = cleanS2 > 0 ? `(${numberToWordsRu(cleanS2)})` : '';

    const customActDate = fDate(data.actDate || deal?.act_date || deal?.deal_date || new Date().toISOString());
    const contractNumber = f(data.contractNumber || deal?.contract_number || 'б/н');

    /* ── Шаблон: ДОУ Аренда / найм 3-сторонний ──────────────────────────────── */
    if (template === 'services_rent_3party') {
        return (
            <div>
                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 16, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    ДОГОВОР ОКАЗАНИЯ УСЛУГ
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, fontSize: 14, fontWeight: 500 }}>
                    <span>Город Киров, Кировская область</span>
                    <span>«<Slot slotId="contract_date" value={today} label="Дата договора" highlight={highlight} />»</span>
                </div>

                <p style={{ textIndent: '2.5em', marginBottom: 12, textAlign: 'justify' }}>
                    <strong>Индивидуальный предприниматель Муравьева Юлия Анатольевна</strong>, ИНН 434560366213, ОГРН 323784700414782, 
                    адрес фактического местонахождения: 610000, Кировская область, г. Киров, ул. Ленина, д. 89, помещение 4; 
                    р/сч 40802810400005970330 в АО «Тинькофф Банк», БИК 044525974, к/сч 30101810145250000974, 
                    с одной стороны, именуемая в дальнейшем <strong>«Исполнитель 1»</strong>,
                </p>

                <p style={{ textIndent: '2.5em', marginBottom: 12, textAlign: 'justify' }}>
                    {realtorPrefix}<strong><Slot slotId="realtor_name" value={realtorFullName} label="ФИО Исполнителя 2" inputId="doc-input-realtor-name" highlight={highlight} /></strong>, 
                    ИНН: <Slot slotId="realtor_inn" value={realtorInn} label="ИНН Исполнителя 2" inputId="doc-input-realtor-inn" highlight={highlight} />, 
                    дата рождения: <Slot slotId="realtor_birth" value={realtorBirth} label="Дата рождения" inputId="doc-input-realtor-birth" highlight={highlight} />, 
                    паспорт РФ серия <Slot slotId="realtor_series" value={realtorSeries} label="Серия паспорта" inputId="doc-input-realtor-series" highlight={highlight} /> номер <Slot slotId="realtor_number" value={realtorNumber} label="Номер паспорта" inputId="doc-input-realtor-number" highlight={highlight} />, 
                    выдан <Slot slotId="realtor_issued_by" value={realtorIssuedBy} label="Кем выдан" inputId="doc-input-realtor-issued-by" highlight={highlight} /> дата выдачи: <Slot slotId="realtor_issue_date" value={realtorIssueDate} label="Дата выдачи" inputId="doc-input-realtor-issue-date" highlight={highlight} />, 
                    зарегистрированный(-ая) по адресу: <Slot slotId="realtor_reg_address" value={realtorRegAddress} label="Адрес регистрации" inputId="doc-input-realtor-reg-address" highlight={highlight} />, 
                    телефон: <Slot slotId="realtor_phone" value={realtorPhone} label="Телефон" inputId="doc-input-realtor-phone" highlight={highlight} />, 
                    {isRealtorSelfEmployed ? 'действующий(-ая) в качестве плательщика налога на профессиональный доход (самозанятый), ' : ''}со второй стороны, 
                    именуемый(-ая) в дальнейшем <strong>«Исполнитель 2»</strong>,
                </p>

                {isCustomerLegalEntity ? (
                    <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                        <strong><Slot slotId="company_name" value={customerCompanyName} label="Наименование организации" inputId="doc-input-company-name" highlight={highlight} /></strong>, 
                        ОГРН <Slot slotId="company_ogrn" value={customerCompanyOgrn} label="ОГРН" inputId="doc-input-ogrn" highlight={highlight} />, 
                        ИНН <Slot slotId="company_inn" value={customerCompanyInn} label="ИНН" inputId="doc-input-inn" highlight={highlight} />
                        {customerCompanyKpp ? <span>, КПП <Slot slotId="company_kpp" value={customerCompanyKpp} label="КПП" inputId="doc-input-kpp" highlight={highlight} /></span> : ''}, 
                        адрес местонахождения: <Slot slotId="company_legal_address" value={customerCompanyLegalAddress} label="Юридический адрес" inputId="doc-input-legal-address" highlight={highlight} />, 
                        в лице <Slot slotId="auth_position" value={customerAuthPosition} label="Должность представителя" inputId="doc-input-auth-position" highlight={highlight} /> <strong><Slot slotId="auth_name" value={customerAuthName} label="ФИО представителя" inputId="doc-input-auth-name" highlight={highlight} /></strong>, 
                        действующего(-ей) на основании <Slot slotId="auth_basis" value={customerAuthBasis} label="Основание полномочий" inputId="doc-input-auth-basis" highlight={highlight} />, 
                        далее по тексту <strong>«Заказчик»</strong>, с третьей стороны, вместе именуемые «Стороны», а по отдельности «Сторона», 
                        заключили настоящий договор (далее договор) о нижеследующем:
                    </p>
                ) : (
                    <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                        Гр. <strong><Slot slotId="customer_name" value={customerFullName} label="ФИО Заказчика" inputId="doc-input-full-name" highlight={highlight} /></strong>, 
                        паспорт серия <Slot slotId="customer_series" value={customerSeries} label="Серия паспорта" inputId="doc-input-series" highlight={highlight} /> номер <Slot slotId="customer_number" value={customerNumber} label="Номер паспорта" inputId="doc-input-number" highlight={highlight} />, 
                        выдан <Slot slotId="customer_issued_by" value={customerIssuedBy} label="Кем выдан" inputId="doc-input-issued-by" highlight={highlight} /> дата выдачи: <Slot slotId="customer_issue_date" value={customerIssueDate} label="Дата выдачи" inputId="doc-input-issue-date" highlight={highlight} />, 
                        зарегистрированный (-ая) по адресу: <Slot slotId="customer_reg_address" value={customerRegAddress} label="Адрес регистрации" inputId="doc-input-reg-address" highlight={highlight} />, 
                        дата рождения: <Slot slotId="customer_birth" value={customerBirth} label="Дата рождения" inputId="doc-input-birth-date" highlight={highlight} />, 
                        телефон: <Slot slotId="customer_phone" value={customerPhone} label="Телефон" inputId="doc-input-phone" highlight={highlight} />, 
                        адрес эл. почты: <Slot slotId="customer_email" value={customerEmail} label="Email" highlight={highlight} />, 
                        далее по тексту <strong>«Заказчик»</strong>, с третьей стороны, вместе именуемые «Стороны», а по отдельности «Сторона», 
                        заключили настоящий договор (далее договор) о нижеследующем:
                    </p>
                )}

                <div style={{ fontWeight: 'bold', marginTop: 18, marginBottom: 8 }}>1. ПРЕДМЕТ ДОГОВОРА</div>
                <p style={{ textIndent: '2.5em', marginBottom: 6, textAlign: 'justify' }}>
                    1.1. Предметом Договора в отношении Исполнителя 1 является:
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 4, textAlign: 'justify' }}>
                    1.1.1. Организовать просмотры вариантов объектов недвижимости, извещая о времени и месте просмотра Заказчика.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 4, textAlign: 'justify' }}>
                    1.1.2. Согласовать место и время проведения переговоров с арендодателем/наймодателем Объекта.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    1.1.3. Правовая экспертиза договоров.
                </p>

                <p style={{ textIndent: '2.5em', marginBottom: 6, textAlign: 'justify' }}>
                    1.2. Предметом Договора в отношении Исполнителя 2 является:
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 4, textAlign: 'justify' }}>
                    1.2.1. Консультирование Заказчика по правовым, организационным и маркетинговым аспектам совершения сделок на рынке недвижимости, а также информирование его о правилах и особенностях совершения сделок по аренде недвижимого имущества.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 4, textAlign: 'justify' }}>
                    1.2.2. Определение реалистичной цены и реалистичных условий аренды, на основании финансовых возможностей Заказчика и ценовой конъюнктуры рынка.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 4, textAlign: 'justify' }}>
                    1.2.3. Анализ рынка недвижимости, выявление вариантов объектов.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    1.2.4. Подготовка, составление и заполнение документов для проведения сделки по аренде/найму объекта недвижимости между Заказчиком и Арендодателем/Наймодателем выбранного Заказчиком объекта недвижимости.
                </p>

                <p style={{ textIndent: '2.5em', marginBottom: 12, textAlign: 'justify' }}>
                    1.3. Услуги оказываются Исполнителями в период с момента заключения Договора до «<Slot slotId="contract_end_date" value={contractEndDate} label="Срок договора" inputId="doc-input-contract-end-date" highlight={highlight} />». 
                    Если ни одна из Сторон не заявит о своем намерении прекратить действие договора, то настоящий договор считается возобновленным на тех же условиях и на тот же срок.
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 18, marginBottom: 8 }}>2. ОБЯЗАННОСТИ СТОРОН</div>
                <p style={{ textIndent: '2.5em', marginBottom: 4, textAlign: 'justify' }}>
                    <strong>2.1. Исполнитель 1 обязан:</strong>
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 4, textAlign: 'justify' }}>
                    2.1.1. Оказать Заказчику услуги, перечисленные в п.1.1. Договора на условиях, установленных в разделах 2-4 Договора.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    2.1.2. Составить и направить Заказчику Акт выполненных работ.
                </p>

                <p style={{ textIndent: '2.5em', marginBottom: 4, textAlign: 'justify' }}>
                    <strong>2.2. Исполнитель 2 обязан:</strong>
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 4, textAlign: 'justify' }}>
                    2.2.1. Оказать Заказчику услуги, перечисленные в п.1.2. Договора на условиях, установленных в разделах 2-4 Договора.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    2.2.2. Составить и направить Заказчику Акт выполненных работ.
                </p>

                <p style={{ textIndent: '2.5em', marginBottom: 4, textAlign: 'justify' }}>
                    <strong>2.3. Заказчик Обязан:</strong>
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 4, textAlign: 'justify' }}>
                    2.3.1. Проводить действия, связанные с поиском Объекта только при содействии Исполнителя.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 4, textAlign: 'justify' }}>
                    2.3.2. Оплатить Исполнителям вознаграждение в размере и в сроки, предусмотренные настоящим договором.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 4, textAlign: 'justify' }}>
                    2.3.3. Сохранять конфиденциальность предоставленной ему информации и передавать ее третьим лицам, без согласия Исполнителей.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 4, textAlign: 'justify' }}>
                    2.3.4. Не заключать договоры аналогичные настоящему Договору с другими физическими и/или юридическими лицами до истечения срока действия Договора.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 4, textAlign: 'justify' }}>
                    2.3.5. Предоставить Исполнителям информацию и документы, необходимые для надлежащего исполнения Договора.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 4, textAlign: 'justify' }}>
                    2.3.6. Незамедлительно информировать Исполнителей обо всех обстоятельствах, влияющих на совершение сделки по аренде/найме Объекта.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 4, textAlign: 'justify' }}>
                    2.3.7. Своевременно являться для просмотров вариантов объектов недвижимости, подписания необходимых документов, в том числе Актов осмотра объектов недвижимости, и заключения договора о аренде/найме Объекта.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 4, textAlign: 'justify' }}>
                    2.3.8. В случае выбора из представленных вариантов объектов недвижимости Объекта с целью его аренды/найма оповестить об этом Исполнителей.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 4, textAlign: 'justify' }}>
                    2.3.9. Не вести самостоятельно никаких переговоров с собственником (-ами) Объекта.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 4, textAlign: 'justify' }}>
                    2.3.10. В случае возникновения такой необходимости, оплатить расходы по оформлению договора аренды/найма Объекта и возможной последующей регистрации обременения.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 4, textAlign: 'justify' }}>
                    2.3.11. В день заключения договора аренды/найма подписать Акт об оказании услуг с Исполнителем 1. Если Акт выполненных работ не будет подписан, а также не будут предоставлены мотивированные возражения Заказчика от подписания Акта, Акт считается подписанным Заказчиком, а Услуги, указанные в Акте принятыми Заказчиком, что является основанием для оплаты услуг Исполнителя.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 12, textAlign: 'justify' }}>
                    2.3.12. В день заключения договора аренды/найма подписать Акт об оказании услуг с Исполнителем 2. Если Акт выполненных работ не будет подписан, а также не будут предоставлены мотивированные возражения Заказчика от подписания Акта, Акт считается подписанным Заказчиком, а Услуги, указанные в Акте принятыми Заказчиком, что является основанием для оплаты услуг Исполнителя.
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 18, marginBottom: 8 }}>3. ОПЛАТА УСЛУГ</div>
                <p style={{ textIndent: '2.5em', marginBottom: 6, textAlign: 'justify' }}>
                    3.1. Оплата Исполнителю 1 и Исполнителю 2 производится Заказчиком индивидуально.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 6, textAlign: 'justify' }}>
                    3.2. Стоимость услуг, оказываемых Исполнителем 1 по настоящему Договору, определена сторонами в сумме <strong><Slot slotId="service1_cost" value={s1Formatted} label="Сумма Исполнителю 1 (₽)" inputId="doc-input-service1-cost" highlight={highlight} /></strong> {s1Words ? <Slot slotId="service1_words" value={s1Words} label="Сумма прописью" inputId="doc-input-service1-cost" highlight={highlight} /> : ''} рублей, в том числе НДС 5%.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 6, textAlign: 'justify' }}>
                    3.3. Стоимость услуг, оказываемых Исполнителем 2 по настоящему Договору, определена сторонами в сумме <strong><Slot slotId="service2_cost" value={s2Formatted} label="Сумма Исполнителю 2 (₽)" inputId="doc-input-service2-cost" highlight={highlight} /></strong> {s2Words ? <Slot slotId="service2_words" value={s2Words} label="Сумма прописью" inputId="doc-input-service2-cost" highlight={highlight} /> : ''} рублей.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 12, textAlign: 'justify' }}>
                    3.4. Услуги Исполнителей оплачиваются в день подписания договора аренды/найма.
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 18, marginBottom: 8 }}>4. РАЗЪЯСНЕНИЯ, ГАРАНТИИ И ПОДТВЕРЖДЕНИЯ СТОРОН</div>
                <p style={{ textIndent: '2.5em', marginBottom: 6, textAlign: 'justify' }}>
                    4.1. В случае неисполнения обязательств по настоящему договору Стороны несут ответственность в порядке и по основаниям, предусмотренным действующим законодательством РФ.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 12, textAlign: 'justify' }}>
                    4.2. В случае отказа Заказчика от аренды/найма Объекта по причине, не связанной с действиями Арендодателя/Наймодателя Объекта, либо уклонения от аренды/найма данного Объекта, в том числе при неявке на заключение договора о аренде/найме Объекта, Заказчик обязан уплатить Исполнителям вознаграждение соразмерно оказанным на момент прекращения Договора услугам, размер которого в любом случае не может составлять менее 50% от сумм, указанных в п. 3 настоящего договора.
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 18, marginBottom: 8 }}>5. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ</div>
                <p style={{ textIndent: '2.5em', marginBottom: 6, textAlign: 'justify' }}>
                    5.1. Стороны гарантируют друг другу конфиденциальность условий договора и предстоящих сделок.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 6, textAlign: 'justify' }}>
                    5.2. Исполнители не несут ответственности за задержку выдачи документов регистрирующим органом.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 6, textAlign: 'justify' }}>
                    5.3. Заказчик в соответствии с требованиями законодательства Российской Федерации, в том числе на основании статьи 9 Федерального закона «О персональных данных» от 27.07.2006 №152-ФЗ, путем подписания данного Договора предоставляет Исполнителям согласие на обработку и использование своих персональных данных, содержащихся в настоящем договоре и представленных им документах в целях надлежащего исполнения обязанностей Исполнителя в соответствии с настоящем Договором. Заказчик подтверждает наличие у него прав на передачу Исполнителям всех персональных данных, содержащихся в передаваемых документах (копиях документов).
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 6, textAlign: 'justify' }}>
                    5.4. Во избежание сомнений Стороны установили, что Исполнители, оказывая услуги в рамках настоящего договора, не осуществляют управление денежными средствами, ценными бумагами или иным имуществом Заказчика.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 6, textAlign: 'justify' }}>
                    5.5. Настоящий Договор составлен в трех экземплярах, по одному для каждой стороны.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 6, textAlign: 'justify' }}>
                    5.6. Все споры, возникающие в связи с исполнением настоящего Договора разрешаются путем переговоров. В случае не достижения согласия путем переговоров, спор подлежит рассмотрению судом.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 6, textAlign: 'justify' }}>
                    5.7. Все изменения и дополнения к настоящему Договору действительны, если они совершены в письменной форме и подписаны представителями обеих сторон. Стороны пришли к соглашению, что все уведомления, запросы, документы, связанные с исполнением Сторонами своих обязательств по настоящему Договору, могут направляться Сторонами по реквизитам, указанным в договоре: на электронный адрес, смс сообщением или сообщением посредством Telegram. Стороны обязаны уведомлять друг друга об изменении адресов и телефонов в течении 3 (трех) рабочих дней с момента их изменения.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 6, textAlign: 'justify' }}>
                    5.8. Все уведомления, запросы, документы, связанные с исполнением Сторонами своих обязательств по настоящему Договору, должны направляться Сторонами по указанным ниже адресам и реквизитам. Стороны обязаны уведомлять друг друга об изменении адресов и реквизитов в течение 3 (трех) рабочих дней с момента их изменения.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 6, textAlign: 'justify' }}>
                    5.9. Все приложения к Договору являются его неотъемлемой частью.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    5.10. Вопросы, не урегулированные Договором, и споры подлежат разрешению в соответствии с действующим законодательством.
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 18, marginBottom: 8 }}>6. ПОДПИСИ СТОРОН</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28, fontSize: 13 }}>
                    <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
                        <strong>Исполнитель 1:</strong><br />
                        ИП Муравьева Юлия Анатольевна<br />
                        ИНН 434560366213, ОГРН 323784700414782<br />
                        г. Киров, ул. Ленина, д. 89, пом. 4<br />
                        АО «Тинькофф Банк»<br />
                        р/с 40802810400005970330<br />
                        БИК 044525974<br /><br />
                        Подпись: ________________ / Муравьева Ю.А. /
                    </div>
                    <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
                        <strong>Исполнитель 2:</strong><br />
                        {isRealtorSelfEmployed ? 'Самозанятый ' : ''}<Slot slotId="realtor_name" value={realtorFullName} label="ФИО Исполнителя 2" inputId="doc-input-realtor-name" highlight={highlight} /><br />
                        ИНН: <Slot slotId="realtor_inn" value={realtorInn} label="ИНН" inputId="doc-input-realtor-inn" highlight={highlight} /><br />
                        Паспорт: <Slot slotId="realtor_series" value={realtorSeries} label="Серия" inputId="doc-input-realtor-series" highlight={highlight} /> № <Slot slotId="realtor_number" value={realtorNumber} label="Номер" inputId="doc-input-realtor-number" highlight={highlight} /><br />
                        Адрес: <Slot slotId="realtor_reg_address" value={realtorRegAddress} label="Адрес регистрации" inputId="doc-input-realtor-reg-address" highlight={highlight} /><br />
                        Тел: <Slot slotId="realtor_phone" value={realtorPhone} label="Телефон" inputId="doc-input-realtor-phone" highlight={highlight} /><br /><br />
                        Подпись: ________________ / <Slot slotId="realtor_short" value={realtorShort} label="Инициалы" inputId="doc-input-realtor-short" highlight={highlight} /> /
                    </div>
                    <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8 }}>
                        <strong>Заказчик:</strong><br />
                        {isCustomerLegalEntity ? (
                            <>
                                <strong><Slot slotId="company_name" value={customerCompanyName} label="Наименование организации" inputId="doc-input-company-name" highlight={highlight} /></strong><br />
                                ОГРН: <Slot slotId="company_ogrn" value={customerCompanyOgrn} label="ОГРН" inputId="doc-input-ogrn" highlight={highlight} /><br />
                                ИНН: <Slot slotId="company_inn" value={customerCompanyInn} label="ИНН" inputId="doc-input-inn" highlight={highlight} />{customerCompanyKpp ? ` / КПП: ${customerCompanyKpp}` : ''}<br />
                                Адрес: <Slot slotId="company_legal_address" value={customerCompanyLegalAddress} label="Юридический адрес" inputId="doc-input-legal-address" highlight={highlight} /><br />
                                Тел: <Slot slotId="customer_phone" value={customerPhone} label="Телефон" inputId="doc-input-phone" highlight={highlight} /><br /><br />
                                <Slot slotId="auth_position" value={customerAuthPositionNom} label="Должность" inputId="doc-input-auth-position" highlight={highlight} />: ________________ / <Slot slotId="auth_short" value={customerAuthShort} label="Инициалы" inputId="doc-input-auth-name" highlight={highlight} /> /  М.П.
                            </>
                        ) : (
                            <>
                                <Slot slotId="customer_name" value={customerFullName} label="ФИО Заказчика" inputId="doc-input-full-name" highlight={highlight} /><br />
                                Паспорт: <Slot slotId="customer_series" value={customerSeries} label="Серия" inputId="doc-input-series" highlight={highlight} /> № <Slot slotId="customer_number" value={customerNumber} label="Номер" inputId="doc-input-number" highlight={highlight} /><br />
                                Адрес: <Slot slotId="customer_reg_address" value={customerRegAddress} label="Адрес регистрации" inputId="doc-input-reg-address" highlight={highlight} /><br />
                                Тел: <Slot slotId="customer_phone" value={customerPhone} label="Телефон" inputId="doc-input-phone" highlight={highlight} /><br />
                                Email: <Slot slotId="customer_email" value={customerEmail} label="Email" highlight={highlight} /><br /><br />
                                Подпись: ________________ / <Slot slotId="customer_short" value={customerShort} label="Инициалы" highlight={highlight} /> /
                            </>
                        )}
                    </div>
                </div>

                {/* Разделитель перед Актом выполненных работ */}
                <div style={{ pageBreakBefore: 'always', borderTop: '2px dashed #999', paddingTop: 24, marginTop: 32 }}>
                    <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 16, marginBottom: 6, textTransform: 'uppercase' }}>
                        АКТ ВЫПОЛНЕННЫХ РАБОТ
                    </div>
                    <div style={{ textAlign: 'center', fontSize: 14, marginBottom: 16 }}>
                        К ДОГОВОРУ № <Slot slotId="contract_number" value={contractNumber} label="Номер договора" inputId="doc-input-contract-number" highlight={highlight} /> от «<Slot slotId="contract_date" value={today} label="Дата договора" highlight={highlight} />»
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, fontSize: 14 }}>
                        <span>г. Киров</span>
                        <span>«<Slot slotId="act_date" value={customActDate} label="Дата акта" inputId="doc-input-act-date" highlight={highlight} />»</span>
                    </div>

                    <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                        1. Мы, нижеподписавшиеся, составили настоящий акт по факту завершения услуг по Договору об оказании услуг. Исполнители выполнили в полном объеме свои обязательства согласно Договору об оказании услуг № <Slot slotId="contract_number" value={contractNumber} label="Номер договора" highlight={highlight} /> от «<Slot slotId="contract_date" value={today} label="Дата договора" highlight={highlight} />».
                    </p>
                    <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                        2. Заказчик считает услуги полностью выполненными и претензий к сроку выполнения, полноте и качеству услуг не имеет.
                    </p>
                    <p style={{ textIndent: '2.5em', marginBottom: 20, textAlign: 'justify' }}>
                        3. Настоящий акт является основанием для оплаты Заказчиком вознаграждения Исполнителю 1 и Исполнителю 2.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginTop: 16 }}>
                        <div>
                            <strong>Заказчик:</strong>
                            <div style={{ borderBottom: '1.5px solid #000', height: 26, marginTop: 12 }}></div>
                            <div style={{ fontSize: 11, color: '#666', textAlign: 'center', marginTop: 2 }}>
                                {isCustomerLegalEntity 
                                    ? `(Подпись) / ${customerAuthShort} /  М.П.`
                                    : <>(Подпись) / <Slot slotId="customer_short" value={customerShort} label="ФИО" highlight={highlight} /></>
                                }
                            </div>
                        </div>
                        <div>
                            <strong>Исполнитель 1:</strong>
                            <div style={{ borderBottom: '1.5px solid #000', height: 26, marginTop: 12 }}></div>
                            <div style={{ fontSize: 11, color: '#666', textAlign: 'center', marginTop: 2 }}>
                                (Подпись) / Муравьева Ю.А.
                            </div>
                        </div>
                        <div>
                            <strong>Исполнитель 2:</strong>
                            <div style={{ borderBottom: '1.5px solid #000', height: 26, marginTop: 12 }}></div>
                            <div style={{ fontSize: 11, color: '#666', textAlign: 'center', marginTop: 2 }}>
                                (Подпись) / {isRealtorSelfEmployed ? 'Самозанятый ' : ''}<Slot slotId="realtor_short" value={realtorShort} label="ФИО" highlight={highlight} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Шаблон: Агентский договор — Продажа (1 принципал) ──────────────────── */
    if (template === 'agency_sale_1') {
        return (
            <div>
                {/* Логотип агентства ЮСС как в шаблоне пользователя */}
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 20 }}>
                    <img
                        src={`data:image/png;base64,${YUSS_BUY_1_LOGO_BASE64}`}
                        alt="ЮСС Риэлти"
                        style={{ width: 150, height: 124, objectFit: 'contain' }}
                    />
                </div>

                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 16, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Агентский договор
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, fontSize: 14, fontWeight: 500 }}>
                    <span>Город Киров, Кировская область</span>
                    <span>«<Slot slotId="contract_date" value={today} label="Дата договора" highlight={highlight} />»</span>
                </div>

                {isLegalEntity ? (
                    <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                        <strong><Slot slotId="company_name" value={companyName} label="Наименование организации" inputId="doc-input-company-name" highlight={highlight} /></strong>, 
                        ОГРН <Slot slotId="company_ogrn" value={companyOgrn} label="ОГРН" inputId="doc-input-ogrn" highlight={highlight} />, 
                        ИНН <Slot slotId="company_inn" value={companyInn} label="ИНН" inputId="doc-input-inn" highlight={highlight} />
                        {companyKpp ? <span>, КПП <Slot slotId="company_kpp" value={companyKpp} label="КПП" inputId="doc-input-kpp" highlight={highlight} /></span> : ''}, 
                        адрес местонахождения: <Slot slotId="company_legal_address" value={companyLegalAddress} label="Юридический адрес" inputId="doc-input-legal-address" highlight={highlight} />, 
                        телефон: <Slot slotId="principal_phone" value={principalPhone} label="Телефон" inputId="doc-input-phone" highlight={highlight} />, 
                        в лице <Slot slotId="auth_position" value={authPosition} label="Должность представителя" inputId="doc-input-auth-position" highlight={highlight} /> <strong><Slot slotId="auth_name" value={authName} label="ФИО представителя" inputId="doc-input-auth-name" highlight={highlight} /></strong>, 
                        действующего(-ей) на основании <Slot slotId="auth_basis" value={authBasis} label="Основание полномочий" inputId="doc-input-auth-basis" highlight={highlight} />, 
                        именуемое в дальнейшем «Принципал», с одной стороны,
                    </p>
                ) : (
                    <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                        Мы, <Slot slotId="principal_name" value={principalName} label="ФИО Принципала" inputId="doc-input-full-name" highlight={highlight} />, 
                        дата рождения: <Slot slotId="principal_birth" value={principalBirth} label="Дата рождения" inputId="doc-input-birth-date" highlight={highlight} />, 
                        паспорт: серия <Slot slotId="principal_series" value={principalSeries} label="Серия паспорта" inputId="doc-input-series" highlight={highlight} /> номер <Slot slotId="principal_number" value={principalNumber} label="Номер паспорта" inputId="doc-input-number" highlight={highlight} />, 
                        выдан <Slot slotId="principal_issued_by" value={principalIssuedBy} label="Кем выдан паспорт" inputId="doc-input-issued-by" highlight={highlight} />, 
                        дата выдачи: <Slot slotId="principal_issue_date" value={principalIssueDate} label="Дата выдачи паспорта" inputId="doc-input-issue-date" highlight={highlight} />, 
                        код подразделения: <Slot slotId="principal_unit_code" value={principalUnitCode} label="Код подразделения" inputId="doc-input-unit-code" highlight={highlight} />, 
                        зарегистрированный(-ая) по адресу: <Slot slotId="principal_reg_address" value={principalRegAddress} label="Адрес регистрации" inputId="doc-input-reg-address" highlight={highlight} />, 
                        телефон: <Slot slotId="principal_phone" value={principalPhone} label="Телефон" inputId="doc-input-phone" highlight={highlight} />, 
                        именуемый(-ая) в дальнейшем «Принципал», с одной стороны,
                    </p>
                )}

                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    и Индивидуальный предприниматель <strong>Муравьева Юлия Анатольевна</strong>, ИНН 434560366213, ОГРН 323784700414782, 
                    адрес фактического местонахождения: 610000, Кировская область, г. Киров, ул. Ленина, д. 89, помещение 4; 
                    р/сч 40802810400005970330 в АО «Тинькофф Банк», БИК 044525974, к/сч 30101810145250000974., 
                    именуемая в дальнейшем «Агент», с другой стороны, именуемые в дальнейшем совместно <strong>«Стороны»</strong>, 
                    заключили Агентский договор о следующем:
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 18, marginBottom: 8 }}>1. Предмет договора</div>
                <p style={{ textIndent: '2.5em', marginBottom: 12, textAlign: 'justify' }}>
                    1.1. Принципал поручает, а Агент обязуется за вознаграждение осуществить поиск покупателя (правоприобретателя) на объект недвижимого имущества, имеющего следующие характеристики в Едином государственном реестре недвижимости:<br />
                    (далее – объект недвижимости).
                </p>

                {/* Таблица характеристик объекта */}
                <div style={{ marginBottom: 14, overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: 13 }}>
                        <tbody>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '6px 10px', width: '32%', fontWeight: 'bold', verticalAlign: 'top' }}>
                                    Вид объекта недвижимости
                                </td>
                                <td style={{ border: '1px solid #000', padding: '6px 10px' }}>
                                    <Slot slotId="prop_kind" value={propKind} label="Вид объекта недвижимости" inputId="doc-input-prop-kind" highlight={highlight} />
                                </td>
                            </tr>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '6px 10px', fontWeight: 'bold', verticalAlign: 'top' }}>
                                    Адрес (местоположение)
                                </td>
                                <td style={{ border: '1px solid #000', padding: '6px 10px' }}>
                                    <Slot slotId="prop_address" value={propAddress} label="Адрес объекта" inputId="doc-input-prop-address" highlight={highlight} />
                                    {propCadastral ? (
                                        <span>, кад. № <Slot slotId="prop_cadastral" value={propCadastral} label="Кадастровый номер" inputId="doc-input-prop-cadastral" highlight={highlight} /></span>
                                    ) : (
                                        <span> <Slot slotId="prop_cadastral" value="" label="Кадастровый номер" inputId="doc-input-prop-cadastral" fallback="[Кадастровый номер]" highlight={highlight} /></span>
                                    )}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    1.1.1. Ориентировочная стоимость отчуждаемого объекта недвижимости составляет <Slot slotId="price_formatted" value={priceFormatted} label="Ориентировочная стоимость" inputId="doc-input-prop-price" highlight={highlight} /> {priceWords ? <Slot slotId="price_words" value={priceWords} label="Сумма прописью" inputId="doc-input-prop-price" highlight={highlight} /> : ''} рублей.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    1.1.2. При увеличении / снижении / отсутствии предложения на рынке недвижимости стороны вправе изменить стоимость объекта недвижимости путем заключения дополнительного соглашения к Агентскому договору.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    1.2. Принципал гарантирует, что до заключения договора недвижимое имущество никому не отчуждено. не заложено, не обещано.
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 18, marginBottom: 8 }}>2. Обязанности сторон</div>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    <strong>2.1. Обязанности Принципала:</strong>
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    2.1.1. По своей воле заключить договор об отчуждении объекта недвижимого имущества (договор купли-продажи, договор участия в долевом строительстве, договор уступки прав и обязанностей и т.п., именуемый далее по тексту – сделка с объектом недвижимости), передаточный акт и иные необходимые документы, а также выполнить иные оговоренные сторонами сделки условия; предоставить заявление и иные необходимые для государственной регистрации перехода права собственности (сделки, подлежащей государственной регистрации) документы в Многофункциональный центр предоставления государственных и муниципальных услуг, Территориальный орган Федеральной службы государственной регистрации, кадастра и картографии (Росреестр), в другие организации; предоставить запрошенные Агентом необходимые документы (сведения) и т.п. до момента заключения сделки с объектом недвижимости; совершать иные законные действия, в т. ч. рекомендованные Агентом.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    2.1.2. В день заключения предварительного договора купли-продажи или соглашения об авансе принять составляемый Агентом Отчет о частичном исполнении Агентского договора, в день заключения сделки с объектом недвижимости принять составляемый Агентом Отчет об исполнении Агентского договора (далее – Отчеты Агента).
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    2.1.3. За счет собственных средств оплачивать предусмотренные действующим законодательством государственные пошлины и платы (в т.ч. за нотариальные действия), услуги кадастрового инженера, оценщика, банковские комиссии и т.п., в случае необходимости в совершении таких действий и получении указанных услуг.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    2.1.4. Не разглашать свои персональные и контактные данные (номер телефона, адрес проживания и/или места работы и т.д.) третьим лицам, с которыми могут возникнуть какие-либо отношения, связанные с исполнением настоящего договора (потенциальные покупатели (правоприобретатели) объекта недвижимости и иные заинтересованные лица) до момента принятия Отчета Агента.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    2.1.5. В период действия настоящего договора не заключать аналогичных Агентских договоров с третьими лицами и воздерживаться от самостоятельной деятельности, являющейся предметом настоящего договора (размещать объявления о реализации объекта недвижимости в сети Интернет, печатных изданиях и т.д., вести переговоры и проводить осмотры объектов недвижимости без участия Агента и т.д.).
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    2.1.6. Самостоятельное заключение Принципалом сделки с найденным Агентом покупателем (правоприобретателем) объекта недвижимости, его аффилированным лицом либо лицом, находящимся в родстве или свойстве, считается фактом исполнения обязательств Агентом по Агентскому договору, о чем Агентом направляется соответствующее уведомление в соответствии с порядком, установленным настоящим договором.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    2.1.7. Права и обязанности по сделкам, совершенным при участии Агента, возникают непосредственно у Принципала.
                </p>

                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    <strong>2.2. Обязанности Агента:</strong>
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    2.2.1. Осуществить поиск (подбор) потенциального покупателя (правоприобретателя) отчуждаемого объекта недвижимости, используя все законные методы и инструменты (реклама и т.п.), вести переговоры, а также совместно с Принципалом составить проект договора о отчуждении объекта недвижимого имущества, передаточного акта и иных документов, необходимых для государственной регистрации перехода права собственности (сделки, подлежащей государственной регистрации) на объект недвижимости.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    2.2.2. Составить для Принципала Отчет Агента.
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 18, marginBottom: 8 }}>3. Агентское вознаграждение и расчеты между сторонами</div>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    3.1. Размер вознаграждения Агента (Агентского вознаграждения) составляет: <Slot slotId="comm_formatted" value={commFormatted} label="Вознаграждение (₽)" inputId="doc-input-commission" highlight={highlight} /> {commWords ? <Slot slotId="comm_words" value={commWords} label="Сумма прописью" inputId="doc-input-commission" highlight={highlight} /> : ''} рублей, в том числе НДС 5 %.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    3.2. Принципал обязуется уплатить Агенту вознаграждение путем внесения обеспечительного платежа при заключении соглашения об авансе/обеспечительно платеже/предварительного договора о задатке с Покупателем, окончательный расчет производится в день заключения сделки с объектом недвижимости.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    3.3. Принципал обязуется уплатить Агенту вознаграждение на основании Отчета Агента в день сделки.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    3.4. Расчеты по Агентскому договору осуществляются в следующем порядке: путем внесения наличных денежных средств в кассу Агента или в безналичном порядке платежными поручениями на расчетный счет Агента.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    3.5. Обязательства Принципала по оплате считаются исполненными в момент зачисления денежных средств на расчетный счет Агента или внесения Принципалом денежных средств в кассу Агента.
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 18, marginBottom: 8 }}>4. Ответственность сторон</div>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    4.1. При нарушении Принципалом условий настоящего договора без уважительных причин (временная нетрудоспособность и т.п.), в том числе - если он не будет присутствовать лично или не обеспечит присутствие своего уполномоченного представителя в назначенный день для совершения необходимых действий по заключению сделки с объектом недвижимости, либо заключит аналогичный Агентский договор с третьим лицом, являющуюся предметом настоящего договора, Принципал уплачивает неустойку Агенту в размере 50 (пятидесяти) процентов от установленных Агентским договором размеров Агентских вознаграждений.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    4.2. Материальная ответственность Агента перед Принципалом не может превышать размер Агентского вознаграждения.
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 18, marginBottom: 8 }}>5. Срок действия настоящего договора</div>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    5.1. Настоящий договор вступает в силу с момента его заключения Сторонами и действует до <Slot slotId="contract_end_date" value={contractEndDate} label="Срок действия договора" inputId="doc-input-contract-end-date" fallback="«___» ________________ 202__ г." highlight={highlight} /> включительно, а в части расчетов между сторонами – до полного исполнения всех обязательств.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    5.2. Если ни одна из Сторон не заявит о своем намерении прекратить действие договора, то настоящий договор считается возобновленным на тех же условиях и на тот же срок.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    5.3. Договор может быть изменен или расторгнут только по письменному соглашению сторон.
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 18, marginBottom: 8 }}>6. Дополнительные условия</div>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    6.1. Все споры, возникающие при выполнении настоящего договора, решаются сторонами путем переговоров, направления и вручения письменных претензий, а при недостижении согласия – в судебном порядке, в соответствии с действующим законодательством.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    6.2. Агент вправе направить Принципалу по последнему известному ему адресу регистрации Принципала письменные сообщения и (или) электронные сообщения на указанные Принципалом мобильный номер телефона и (или) электронную почту о ходе и результатах исполнения Агентского договора. Все юридически значимые сообщения в адрес Агента должны направляться исключительно по почтовому адресу, который указан в преамбуле Агентского договора. Направление сообщения по другим адресам не может считаться надлежащим. Сообщение считается доставленным и в тех случаях, если оно поступило лицу, которому оно направлено (адресату), но по обстоятельствам, зависящим от него, не было ему вручено или адресат не ознакомился с ним.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    6.3. Настоящим пунктом Принципал подтверждает, что у него отсутствуют какие-либо обстоятельства и ситуации, которые препятствуют или могут препятствовать заключению им законным образом настоящего Агентского договора и впоследствии – сделки с объектом недвижимости.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    6.4. Принципал дает согласие на получение от Агента рекламной и иной информации, необходимой для осуществления деятельности Агента, путем направления сообщений смс на телефон, электронных писем на электронную почту, указанных Принципалом в настоящем договоре.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    6.5. Настоящим пунктом Принципал выражает свое письменное заявление о согласии на обработку и использование Агентом своих персональных данных, содержащихся в настоящем договоре и в представленных (подготовленных) документах на срок действия настоящего договора.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    6.6. Договор составлен в двух экземплярах, по одному экземпляру каждой из сторон.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 20, textAlign: 'justify' }}>
                    6.7. Настоящим стороны Договора заверяют и гарантируют, что они и близкие родственники не имеют гражданства иностранных(ого) государств(а), совершающих(его) в отношении Российской Федерации, российских юридических и физических лиц недружественные действия, а также местом регистрации, местом преимущественного пребывания, местом преимущественного ведения хозяйственной деятельности или извлечения прибыли от деятельности не являются(ется) указанные(ое) государства(о) и территория(ии), перечень которых установлен Распоряжением Правительства Российской Федерации от 05.03.2022 N 430-р «Об утверждении перечня иностранных государств и территорий, совершающих недружественные действия в отношении Российской Федерации, российских юридических и физических лиц».
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 24, marginBottom: 12 }}>7. Подписи сторон</div>
                <div style={{ marginTop: 12 }}>
                    {isLegalEntity ? (
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                                Принципал: <Slot slotId="company_name" value={companyName} label="Организация" inputId="doc-input-company-name" highlight={highlight} />
                            </div>
                            <div style={{ fontSize: 13, color: '#374151', marginBottom: 6 }}>
                                ОГРН <Slot slotId="company_ogrn" value={companyOgrn} label="ОГРН" inputId="doc-input-ogrn" highlight={highlight} />, ИНН <Slot slotId="company_inn" value={companyInn} label="ИНН" inputId="doc-input-inn" highlight={highlight} />{companyKpp ? `, КПП ${companyKpp}` : ''}
                            </div>
                            <div style={{ fontSize: 13, color: '#374151', marginBottom: 10 }}>
                                Адрес: <Slot slotId="company_legal_address" value={companyLegalAddress} label="Юридический адрес" inputId="doc-input-legal-address" highlight={highlight} />
                            </div>
                            <div style={{ marginTop: 8, fontSize: 14 }}>
                                <Slot slotId="auth_position" value={authPositionNom} label="Должность" inputId="doc-input-auth-position" highlight={highlight} />: _________________ / <Slot slotId="auth_name" value={authShort} label="Подпись представителя" inputId="doc-input-auth-name" highlight={highlight} /> / &nbsp; М.П.
                            </div>
                        </div>
                    ) : (
                        <>
                            <div style={{ borderBottom: '1.5px solid #000', paddingBottom: 2, marginBottom: 16 }}>
                                <strong>Принципал:</strong>
                            </div>
                            <div style={{ borderBottom: '1.5px solid #000', height: 20, marginBottom: 16 }}></div>
                            <div style={{ borderBottom: '1.5px solid #000', height: 20, marginBottom: 28 }}></div>
                        </>
                    )}

                    <div style={{ marginTop: 16, marginBottom: 6 }}>
                        <strong>Агент:</strong>
                    </div>
                    <div style={{ borderBottom: '1.5px solid #000', height: 20, marginBottom: 16 }}></div>
                </div>
            </div>
        );
    }

    /* ── Шаблон: АД Найм с наймодателем ─────────────────────────────────────── */
    if (template === 'agency_rent_landlord_1') {
        return (
            <div>
                {/* Логотип агентства ЮСС как в шаблоне пользователя */}
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 20 }}>
                    <img
                        src={`data:image/png;base64,${YUSS_BUY_1_LOGO_BASE64}`}
                        alt="ЮСС Риэлти"
                        style={{ width: 150, height: 124, objectFit: 'contain' }}
                    />
                </div>

                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 16, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Агентский договор
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, fontSize: 14, fontWeight: 500 }}>
                    <span>Город Киров, Кировская область</span>
                    <span>«<Slot slotId="contract_date" value={today} label="Дата договора" highlight={highlight} />»</span>
                </div>

                {isLegalEntity ? (
                    <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                        <strong><Slot slotId="company_name" value={companyName} label="Наименование организации" inputId="doc-input-company-name" highlight={highlight} /></strong>, 
                        ОГРН <Slot slotId="company_ogrn" value={companyOgrn} label="ОГРН" inputId="doc-input-ogrn" highlight={highlight} />, 
                        ИНН <Slot slotId="company_inn" value={companyInn} label="ИНН" inputId="doc-input-inn" highlight={highlight} />
                        {companyKpp ? <span>, КПП <Slot slotId="company_kpp" value={companyKpp} label="КПП" inputId="doc-input-kpp" highlight={highlight} /></span> : ''}, 
                        адрес местонахождения: <Slot slotId="company_legal_address" value={companyLegalAddress} label="Юридический адрес" inputId="doc-input-legal-address" highlight={highlight} />, 
                        телефон: <Slot slotId="principal_phone" value={principalPhone} label="Телефон" inputId="doc-input-phone" highlight={highlight} />, 
                        в лице <Slot slotId="auth_position" value={authPosition} label="Должность представителя" inputId="doc-input-auth-position" highlight={highlight} /> <strong><Slot slotId="auth_name" value={authName} label="ФИО представителя" inputId="doc-input-auth-name" highlight={highlight} /></strong>, 
                        действующего(-ей) на основании <Slot slotId="auth_basis" value={authBasis} label="Основание полномочий" inputId="doc-input-auth-basis" highlight={highlight} />, 
                        именуемое в дальнейшем «Принципал», с одной стороны,
                    </p>
                ) : (
                    <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                        Мы, Гр. <Slot slotId="principal_name" value={principalName} label="ФИО Принципала" inputId="doc-input-full-name" highlight={highlight} />, 
                        дата рождения: <Slot slotId="principal_birth" value={principalBirth} label="Дата рождения" inputId="doc-input-birth-date" highlight={highlight} />, 
                        паспорт РФ серия <Slot slotId="principal_series" value={principalSeries} label="Серия паспорта" inputId="doc-input-series" highlight={highlight} /> номер <Slot slotId="principal_number" value={principalNumber} label="Номер паспорта" inputId="doc-input-number" highlight={highlight} />, 
                        выдан <Slot slotId="principal_issue_date" value={principalIssueDate} label="Дата выдачи" inputId="doc-input-issue-date" highlight={highlight} /> года <Slot slotId="principal_issued_by" value={principalIssuedBy} label="Кем выдан паспорт" inputId="doc-input-issued-by" highlight={highlight} /> зарегистрированный(-ая) по адресу: <Slot slotId="principal_reg_address" value={principalRegAddress} label="Адрес регистрации" inputId="doc-input-reg-address" highlight={highlight} /> именуемый(-ая,-ые) в дальнейшем «Принципал», с одной стороны,
                    </p>
                )}

                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    и Индивидуальный предприниматель <strong>Муравьева Юлия Анатольевна</strong>, ИНН 434560366213, ОГРН 323784700414782, 
                    адрес фактического местонахождения: 610000, Кировская область, г. Киров, ул. Ленина, д. 89, помещение 4; 
                    р/сч 40802810400005970330 в АО «Тинькофф Банк», БИК 044525974, к/сч 30101810145250000974., 
                    именуемая в дальнейшем «Агент», с другой стороны, именуемые в дальнейшем совместно <strong>«Стороны»</strong>, 
                    заключили Агентский договор о следующем:
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 18, marginBottom: 8 }}>1. Предмет договора</div>
                <p style={{ textIndent: '2.5em', marginBottom: 12, textAlign: 'justify' }}>
                    1.1. Принципал поручает, а Агент обязуется за вознаграждение осуществить поиск нанимателя/арендатора на объект недвижимого имущества, имеющего следующие характеристики в Едином государственном реестре недвижимости:<br />
                    (далее – объект недвижимости).
                </p>

                {/* Таблица характеристик объекта */}
                <div style={{ marginBottom: 14, overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: 13 }}>
                        <tbody>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '6px 10px', width: '32%', fontWeight: 'bold', verticalAlign: 'top' }}>
                                    Вид объекта недвижимости
                                </td>
                                <td style={{ border: '1px solid #000', padding: '6px 10px' }}>
                                    <Slot slotId="prop_kind" value={propKind} label="Вид объекта недвижимости" inputId="doc-input-prop-kind" highlight={highlight} />
                                </td>
                            </tr>
                            <tr>
                                <td style={{ border: '1px solid #000', padding: '6px 10px', fontWeight: 'bold', verticalAlign: 'top' }}>
                                    Адрес (местоположение)
                                </td>
                                <td style={{ border: '1px solid #000', padding: '6px 10px' }}>
                                    <Slot slotId="prop_address" value={propAddress} label="Адрес объекта" inputId="doc-input-prop-address" highlight={highlight} />
                                    {propCadastral ? (
                                        <span>, кад. № <Slot slotId="prop_cadastral" value={propCadastral} label="Кадастровый номер" inputId="doc-input-prop-cadastral" highlight={highlight} /></span>
                                    ) : (
                                        <span> <Slot slotId="prop_cadastral" value="" label="Кадастровый номер" inputId="doc-input-prop-cadastral" fallback="[Кадастровый номер]" highlight={highlight} /></span>
                                    )}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <p style={{ textIndent: '2.5em', marginBottom: 12, textAlign: 'justify' }}>
                    1.1.1. Ориентировочная стоимость платы за найм/арендной платы в месяц составляет: <strong><Slot slotId="price_formatted" value={priceFormatted} label="Плата за найм" inputId="doc-input-prop-price" highlight={highlight} /></strong> {priceWords ? ` ${priceWords}` : ''} рублей.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 12, textAlign: 'justify' }}>
                    1.1.2. При увеличении / снижении / отсутствии предложения на рынке недвижимости стороны вправе изменить стоимость, указанную в п. 1.1.1 настоящего договора.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    1.2. Принципал гарантирует, что до заключения договора недвижимое имущество никому не отчуждено. не заложено, не обещано, в найм и аренду не передано.
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 18, marginBottom: 8 }}>2. Обязанности сторон</div>
                <div style={{ fontWeight: 'bold', marginTop: 8, marginBottom: 6 }}>2.1. Обязанности Принципала:</div>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    2.1.1. По своей воле заключить договор найма жилого помещения/аренды нежилого помещения (именуемый далее по тексту – сделка с объектом недвижимости), передаточный акт и иные необходимые документы, а также выполнить иные оговоренные сторонами сделки условия; совершать иные законные действия, в т. ч. рекомендованные Агентом.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    2.1.2. В день заключения сделки с объектом недвижимости принять составляемый Агентом Отчет об исполнении Агентского договора (далее – Отчет Агента).
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    2.1.3. Не разглашать свои персональные и контактные данные (номер телефона, адрес проживания и/или места работы и т.д.) третьим лицам, с которыми могут возникнуть какие-либо отношения, связанные с исполнением настоящего договора до момента принятия Отчета Агента.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    2.1.4. В период действия настоящего договора не заключать аналогичных Агентских договоров с третьими лицами и воздерживаться от самостоятельной деятельности, являющейся предметом настоящего договора (размещать объявления о реализации объекта недвижимости в сети Интернет, печатных изданиях и т.д., вести переговоры и проводить осмотры объектов недвижимости без участия Агента и т.д.).
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    2.1.5. Самостоятельное заключение Принципалом сделки с найденным Агентом нанимателем/арендатором (объекта недвижимости, его аффилированным лицом либо лицом, находящимся в родстве или свойстве, считается фактом исполнения обязательств Агентом по Агентскому договору, о чем Агентом направляется соответствующее уведомление в соответствии с порядком, установленным настоящим договором.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 12, textAlign: 'justify' }}>
                    2.1.6. Права и обязанности по сделкам, совершенным при участии Агента, возникают непосредственно у Принципала.
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 8, marginBottom: 6 }}>2.2. Обязанности Агента:</div>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    2.2.1. Осуществить поиск (подбор) потенциального нанимателя/арендатора отчуждаемого объекта недвижимости, используя все законные методы и инструменты (реклама и т.п.), вести переговоры, а также составить проект договора найма жилого помещения/аренды нежилого помещения, передаточного акта и иных документов, необходимых для заключения сделки.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    2.2.2. В день исполнения обязательств по Агентскому договору составить для Принципала Отчет Агента.
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 18, marginBottom: 8 }}>3. Агентское вознаграждение и расчеты между сторонами</div>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    3.1. Размер вознаграждения Агента (Агентского вознаграждения) составляет: <strong><Slot slotId="comm_formatted" value={commFormatted} label="Вознаграждение Агента" inputId="doc-input-commission" highlight={highlight} /></strong> {commWords ? ` ${commWords}` : ''} рублей, в том числе НДС 5 %.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    3.2. Настоящим пунктом Принципал предоставляет Агенту право получить с нанимателя/арендатора объекта недвижимости аванс в сумме, не превышающей размер агентского вознаграждения, в счет частичной оплаты его стоимости. Полученный Агентом аванс засчитывается в счет стоимости агентского вознаграждения, подлежащего оплате Принципалом.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    3.3. Принципал обязуется уплатить Агенту вознаграждение на основании Отчета Агента в день заключения сделки с объектом недвижимости.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    3.4. Расчеты по Агентскому договору осуществляются в следующем порядке: путем внесения наличных денежных средств в кассу Агента или в безналичном порядке платежными поручениями на расчетный счет Агента.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    3.5. Обязательства Принципала по оплате считаются исполненными в момент зачисления денежных средств на расчетный счет Агента или внесения Принципалом денежных средств в кассу Агента.
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 18, marginBottom: 8 }}>4. Ответственность сторон</div>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    4.1. При нарушении Принципалом условий настоящего договора без уважительных причин (временная нетрудоспособность и т.п.), в том числе - если он не будет присутствовать лично или не обеспечит присутствие своего уполномоченного представителя в назначенный день для совершения необходимых действий по заключению сделки с объектом недвижимости, либо заключит аналогичный Агентский договор с третьим лицом или будет осуществлять самостоятельную деятельность, являющуюся предметом настоящего договора, Принципал уплачивает неустойку Агенту в размере 50 (пятидесяти) процентов от установленных Агентским договором размеров Агентских вознаграждений.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    4.2. Материальная ответственность Агента перед Принципалом не может превышать размер Агентского вознаграждения.
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 18, marginBottom: 8 }}>5. Срок действия настоящего договора</div>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    5.1. Настоящий договор вступает в силу с момента его заключения Сторонами и действует до <strong><Slot slotId="contract_end_date" value={contractEndDate} label="Срок действия договора" inputId="doc-input-contract-end-date" highlight={highlight} /></strong> включительно, а в части расчетов между сторонами – до полного исполнения всех обязательств.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    5.2. Если ни одна из Сторон не заявит о своем намерении прекратить действие договора, то настоящий договор считается возобновленным на тех же условиях и на тот же срок.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    5.3. Договор может быть изменен или расторгнут только по письменному соглашению сторон.
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 18, marginBottom: 8 }}>6. Дополнительные условия</div>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    6.1. Все споры, возникающие при выполнении настоящего договора, решаются сторонами путем переговоров, направления и вручения письменных претензий, а при недостижении согласия – в судебном порядке, в соответствии с действующим законодательством.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    6.2. Агент вправе направить Принципалу по последнему известному ему адресу регистрации Принципала письменные сообщения и (или) электронные сообщения на указанные Принципалом мобильный номер телефона и (или) электронную почту о ходе и результатах исполнения Агентского договора. Все юридически значимые сообщения в адрес Агента должны направляться исключительно по почтовому адресу, который указан в преамбуле Агентского договора. Направление сообщения по другим адресам не может считаться надлежащим. Сообщение считается доставленным и в тех случаях, если оно поступило лицу, которому оно направлено (адресату), но по обстоятельствам, зависящим от него, не было ему вручено или адресат не ознакомился с ним.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    6.3. Настоящим пунктом Принципал подтверждает, что у него отсутствуют какие-либо обстоятельства и ситуации, которые препятствуют или могут препятствовать заключению им законным образом настоящего Агентского договора и впоследствии – сделки с объектом недвижимости.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    6.4. Принципал дает согласие на получение от Агента рекламной и иной информации, необходимой для осуществления деятельности Агента, путем направления сообщений смс на телефон, электронных писем на электронную почту, указанных Принципалом в настоящем договоре.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    6.5. Настоящим пунктом Принципал выражает свое письменное заявление о согласии на обработку и использование Агентом своих персональных данных, содержащихся в настоящем договоре и в представленных (подготовленных) документах на срок, необходимый для исполнения Агентского договора.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 18, textAlign: 'justify' }}>
                    6.6. Договор составлен в двух экземплярах, по одному экземпляру каждой из сторон.
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 18, marginBottom: 14 }}>7. Подписи сторон</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
                    <div>
                        {isLegalEntity ? (
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                                    Принципал: <Slot slotId="company_name" value={companyName} label="Организация" inputId="doc-input-company-name" highlight={highlight} />
                                </div>
                                <div style={{ fontSize: 13, color: '#374151', marginBottom: 6 }}>
                                    ОГРН <Slot slotId="company_ogrn" value={companyOgrn} label="ОГРН" inputId="doc-input-ogrn" highlight={highlight} />, ИНН <Slot slotId="company_inn" value={companyInn} label="ИНН" inputId="doc-input-inn" highlight={highlight} />{companyKpp ? `, КПП ${companyKpp}` : ''}
                                </div>
                                <div style={{ fontSize: 13, color: '#374151', marginBottom: 10 }}>
                                    Адрес: <Slot slotId="company_legal_address" value={companyLegalAddress} label="Юридический адрес" inputId="doc-input-legal-address" highlight={highlight} />
                                </div>
                                <div style={{ marginTop: 8, fontSize: 14 }}>
                                    <Slot slotId="auth_position" value={authPositionNom} label="Должность" inputId="doc-input-auth-position" highlight={highlight} />: _________________ / <Slot slotId="auth_name" value={authShort} label="Подпись представителя" inputId="doc-input-auth-name" highlight={highlight} /> / &nbsp; М.П.
                                </div>
                            </div>
                        ) : (
                            <>
                                <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Принципал:</div>
                                <div style={{ borderBottom: '1px solid #000', height: 26, marginBottom: 8 }}></div>
                                <div style={{ borderBottom: '1px solid #000', height: 26, marginBottom: 8 }}></div>
                                <div style={{ borderBottom: '1px solid #000', height: 26, marginBottom: 8 }}></div>
                            </>
                        )}
                    </div>
                    <div>
                        <div style={{ fontWeight: 'bold', marginBottom: 6 }}>Агент:</div>
                        <div style={{ borderBottom: '1px solid #000', height: 26, marginBottom: 8 }}></div>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Шаблон: ЮСС Покупка 1 ─────────────────────────────────────────────── */
    if (template === 'yuss_buy_1') {
        return (
            <div>
                {/* Логотип агентства ЮСС как в шаблоне пользователя */}
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 20 }}>
                    <img
                        src={`data:image/png;base64,${YUSS_BUY_1_LOGO_BASE64}`}
                        alt="ЮСС Риэлти"
                        style={{ width: 150, height: 124, objectFit: 'contain' }}
                    />
                </div>

                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 16, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Агентский договор
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, fontSize: 14, fontWeight: 500 }}>
                    <span>Город Киров, Кировская область</span>
                    <span>«<Slot slotId="contract_date" value={today} label="Дата договора" highlight={highlight} />»</span>
                </div>

                {isLegalEntity ? (
                    <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                        <strong><Slot slotId="company_name" value={companyName} label="Наименование организации" inputId="doc-input-company-name" highlight={highlight} /></strong>, 
                        ОГРН <Slot slotId="company_ogrn" value={companyOgrn} label="ОГРН" inputId="doc-input-ogrn" highlight={highlight} />, 
                        ИНН <Slot slotId="company_inn" value={companyInn} label="ИНН" inputId="doc-input-inn" highlight={highlight} />
                        {companyKpp ? <span>, КПП <Slot slotId="company_kpp" value={companyKpp} label="КПП" inputId="doc-input-kpp" highlight={highlight} /></span> : ''}, 
                        адрес местонахождения: <Slot slotId="company_legal_address" value={companyLegalAddress} label="Юридический адрес" inputId="doc-input-legal-address" highlight={highlight} />, 
                        телефон: <Slot slotId="principal_phone" value={principalPhone} label="Телефон" inputId="doc-input-phone" highlight={highlight} />, 
                        в лице <Slot slotId="auth_position" value={authPosition} label="Должность представителя" inputId="doc-input-auth-position" highlight={highlight} /> <strong><Slot slotId="auth_name" value={authName} label="ФИО представителя" inputId="doc-input-auth-name" highlight={highlight} /></strong>, 
                        действующего(-ей) на основании <Slot slotId="auth_basis" value={authBasis} label="Основание полномочий" inputId="doc-input-auth-basis" highlight={highlight} />, 
                        именуемое в дальнейшем «Принципал», с одной стороны,
                    </p>
                ) : (
                    <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                        Мы, <Slot slotId="principal_name" value={principalName} label="ФИО Принципала" inputId="doc-input-full-name" highlight={highlight} />, 
                        дата рождения: <Slot slotId="principal_birth" value={principalBirth} label="Дата рождения" inputId="doc-input-birth-date" highlight={highlight} />, 
                        паспорт: серия <Slot slotId="principal_series" value={principalSeries} label="Серия паспорта" inputId="doc-input-series" highlight={highlight} /> номер <Slot slotId="principal_number" value={principalNumber} label="Номер паспорта" inputId="doc-input-number" highlight={highlight} />, 
                        выдан <Slot slotId="principal_issued_by" value={principalIssuedBy} label="Кем выдан паспорт" inputId="doc-input-issued-by" highlight={highlight} />, 
                        дата выдачи: <Slot slotId="principal_issue_date" value={principalIssueDate} label="Дата выдачи паспорта" inputId="doc-input-issue-date" highlight={highlight} />, 
                        код подразделения: <Slot slotId="principal_unit_code" value={principalUnitCode} label="Код подразделения" inputId="doc-input-unit-code" highlight={highlight} />, 
                        зарегистрированный(-ая) по адресу: <Slot slotId="principal_reg_address" value={principalRegAddress} label="Адрес регистрации" inputId="doc-input-reg-address" highlight={highlight} />, 
                        телефон: <Slot slotId="principal_phone" value={principalPhone} label="Телефон" inputId="doc-input-phone" highlight={highlight} />, 
                        именуемый(-ая) в дальнейшем «Принципал», с одной стороны,
                    </p>
                )}

                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    и Индивидуальный предприниматель <strong>Муравьева Юлия Анатольевна</strong>, ИНН 434560366213, ОГРН 323784700414782, 
                    адрес фактического местонахождения: 610000, Кировская область, г. Киров, ул. Ленина, д. 89, помещение 4; 
                    р/сч 40802810400005970330 в АО «Тинькофф Банк», БИК 044525974, к/сч 30101810145250000974, 
                    именуемая в дальнейшем «Агент», с другой стороны, именуемые в дальнейшем совместно «Стороны», 
                    заключили Агентский договор о следующем:
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 18, marginBottom: 8 }}>1. Предмет договора</div>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    1.1. Принципал поручает, а Агент обязуется за вознаграждение осуществить юридическое сопровождение планируемой Принципалом сделки по ПРИОБРЕТЕНИЮ объекта недвижимого имущества в соответствии с условиями настоящего договора.
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 18, marginBottom: 8 }}>2. Обязанности сторон</div>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    <strong>2.1. Обязанности Принципала:</strong>
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    2.1.1. Сообщить Агенту описание (основные характеристики объекта недвижимости, соответствующие сведениям Единого государственного реестра недвижимости, а также его стоимость не позднее, чем за 2 (два) рабочих дня до предполагаемой даты сделки. Стороны вправе изменить стоимость объекта недвижимости путем заключения дополнительного соглашения к Агентскому договору.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    2.1.2. По своей воле заключить договор о приобретении объекта недвижимого имущества (договор купли-продажи, договор участия в долевом строительстве, договор уступки прав и обязанностей и т.п., именуемый далее по тексту – сделка с объектом недвижимости), передаточный акт и иные необходимые документы, а также выполнить иные оговоренные сторонами сделки условия; предоставить заявление и иные необходимые для государственной регистрации перехода права собственности (сделки, подлежащей государственной регистрации) документы в Многофункциональный центр предоставления государственных и муниципальных услуг, Территориальный орган Федеральной службы государственной регистрации, кадастра и картографии (Росреестр), в другие организации; предоставить запрошенные Агентом необходимые документы (сведения) и т.п. до момента заключения сделки с объектом недвижимости; совершать иные законные действия, в т. ч. рекомендованные Агентом.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    2.1.3. В день заключения предварительного договора купли-продажи или соглашения об авансе принять составляемый Агентом Отчет о частичном исполнении Агентского договора, в день заключения сделки с объектом недвижимости принять составляемый Агентом Отчет об исполнении Агентского договора (далее – Отчеты Агента).
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    2.1.4. За счет собственных средств оплачивать предусмотренные действующим законодательством государственные пошлины и платы (в т.ч. за нотариальные действия), услуги кадастрового инженера, оценщика, банковские комиссии и т.п., в случае необходимости в совершении таких действий и получении указанных услуг.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    2.1.5. В период действия настоящего договора не заключать аналогичных Агентских договоров с третьими лицами и воздерживаться от самостоятельной деятельности, являющейся предметом настоящего договора без участия Агента.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    2.1.6. Самостоятельное заключение Принципалом, его аффилированным лицом либо лицом, находящимся в родстве или свойстве сделки с объектом недвижимости, считается фактом исполнения обязательств Агентом по Агентскому договору, о чем Агентом направляется соответствующее уведомление в соответствии с порядком, установленным настоящим договором.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    2.1.7. Права и обязанности по сделкам, совершенным при участии Агента, возникают непосредственно у Принципала.
                </p>

                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    <strong>2.2. Обязанности Агента:</strong>
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    2.2.1. Вести переговоры с продавцами (правоотчуждателями) объекта недвижимости, а также составить проект договора о приобретении объекта недвижимого имущества, передаточного акта и иных документов, необходимых для государственной регистрации перехода права собственности (сделки, подлежащей государственной регистрации) на объект недвижимости; организовать предоставление Принципалом заявления и иных необходимых для государственной регистрации перехода права собственности (сделки, подлежащей государственной регистрации) документов в Многофункциональный центр предоставления государственных и муниципальных услуг, Территориальный орган Федеральной службы государственной регистрации, кадастра и картографии (Росреестр), в другие организации; в необходимых случаях давать Принципалу соответствующие рекомендации.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    2.2.2. Составить для Принципала Отчеты Агента.
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 18, marginBottom: 8 }}>3. Агентское вознаграждение и расчеты между сторонами</div>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    3.1. Размер вознаграждения Агента (Агентского вознаграждения) составляет: <Slot slotId="comm_formatted" value={commFormatted} label="Вознаграждение (₽)" inputId="doc-input-commission" highlight={highlight} /> {commWords ? <Slot slotId="comm_words" value={commWords} label="Сумма прописью" inputId="doc-input-commission" highlight={highlight} /> : ''} рублей, в том числе НДС 5 %.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    3.2. Принципал обязуется уплатить Агенту вознаграждение путем внесения обеспечительного платежа, окончательный расчет производится в день заключения сделки с объектом недвижимости.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    3.3. Расчеты по Агентскому договору осуществляются в следующем порядке: путем внесения наличных денежных средств в кассу Агента или в безналичном порядке платежными поручениями на расчетный счет Агента.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    3.4. Обязательства Принципала по оплате считаются исполненными в момент зачисления денежных средств на расчетный счет Агента или внесения Принципалом денежных средств в кассу Агента.
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 18, marginBottom: 8 }}>4. Ответственность сторон</div>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    4.1. При нарушении Принципалом условий настоящего договора без уважительных причин (временная нетрудоспособность и т.п.), в том числе - если он не будет присутствовать лично или не обеспечит присутствие своего уполномоченного представителя в назначенный день для совершения необходимых действий по заключению сделки с объектом недвижимости, либо заключит аналогичный Агентский договор с третьим лицом или будет осуществлять самостоятельную деятельность, являющуюся предметом настоящего договора, Принципал уплачивает неустойку Агенту в размере 50 (пятидесяти) процентов от установленных Агентским договором размеров Агентских вознаграждений.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    4.2. Материальная ответственность Агента перед Принципалом не может превышать размер Агентского вознаграждения.
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 18, marginBottom: 8 }}>5. Срок действия настоящего договора</div>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    5.1. Настоящий договор вступает в силу с момента его заключения Сторонами и действует до <Slot slotId="contract_end_date" value={contractEndDate} label="Срок действия договора" inputId="doc-input-contract-end-date" fallback="«___» ________________ 202__ г." highlight={highlight} /> включительно, а в части расчетов между сторонами – до полного исполнения всех обязательств.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    5.2. Если ни одна из Сторон не заявит о своем намерении прекратить действие договора, то настоящий договор считается возобновленным на тех же условиях и на тот же срок.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    5.3. Договор может быть изменен или расторгнут только по письменному соглашению сторон.
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 18, marginBottom: 8 }}>6. Дополнительные условия</div>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    6.1. Все споры, возникающие при выполнении настоящего договора, решаются сторонами путем переговоров, направления и вручения письменных претензий, а при недостижении согласия – в судебном порядке, в соответствии с действующим законодательством.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    6.2. Агент вправе направить Принципалу по последнему известному ему адресу регистрации Принципала письменные сообщения и (или) электронные сообщения на указанные Принципалом мобильный номер телефона и (или) электронную почту о ходе и результатах исполнения Агентского договора. Все юридически значимые сообщения в адрес Агента должны направляться исключительно по почтовому адресу, который указан в преамбуле Агентского договора. Направление сообщения по другим адресам не может считаться надлежащим. Сообщение считается доставленным и в тех случаях, если оно поступило лицу, которому оно направлено (адресату), но по обстоятельствам, зависящим от него, не было ему вручено или адресат не ознакомился с ним.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    6.3. Настоящим пунктом Принципал подтверждает, что у него отсутствуют какие-либо обстоятельства и ситуации, которые препятствуют или могут препятствовать заключению им законным образом настоящего Агентского договора и впоследствии – сделки с объектом недвижимости.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    6.4. Принципал дает согласие на получение от Агента рекламной и иной информации, необходимой для осуществления деятельности Агента, путем направления сообщений смс на телефон, электронных писем на электронную почту, указанных Принципалом в настоящем договоре.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    6.5. Настоящим пунктом Принципал выражает свое письменное заявление о согласии на обработку и использование Агентом своих персональных данных, содержащихся в настоящем договоре и в представленных (подготовленных) документах на срок, необходимый для исполнения Агентского договора.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    6.6. Договор составлен в двух экземплярах, по одному экземпляру каждой из сторон.
                </p>
                <p style={{ textIndent: '2.5em', marginBottom: 20, textAlign: 'justify' }}>
                    6.7. Настоящим стороны Договора заверяют и гарантируют, что они и близкие родственники не имеют гражданства иностранных(ого) государств(а), совершающих(его) в отношении Российской Федерации, российских юридических и физических лиц недружественные действия, а также местом регистрации, местом преимущественного пребывания, местом преимущественного ведения хозяйственной деятельности или извлечения прибыли от деятельности не являются(ется) указанные(ое) государства(о) и территория(ии), перечень которых установлен Распоряжением Правительства Российской Федерации от 05.03.2022 N 430-р «Об утверждении перечня иностранных государств и территорий, совершающих недружественные действия в отношении Российской Федерации, российских юридических и физических лиц».
                </p>

                <div style={{ fontWeight: 'bold', marginTop: 24, marginBottom: 12 }}>7. Подписи сторон</div>
                <div style={{ marginTop: 12 }}>
                    {isLegalEntity ? (
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                                Принципал: <Slot slotId="company_name" value={companyName} label="Организация" inputId="doc-input-company-name" highlight={highlight} />
                            </div>
                            <div style={{ fontSize: 13, color: '#374151', marginBottom: 6 }}>
                                ОГРН <Slot slotId="company_ogrn" value={companyOgrn} label="ОГРН" inputId="doc-input-ogrn" highlight={highlight} />, ИНН <Slot slotId="company_inn" value={companyInn} label="ИНН" inputId="doc-input-inn" highlight={highlight} />{companyKpp ? `, КПП ${companyKpp}` : ''}
                            </div>
                            <div style={{ fontSize: 13, color: '#374151', marginBottom: 10 }}>
                                Адрес: <Slot slotId="company_legal_address" value={companyLegalAddress} label="Юридический адрес" inputId="doc-input-legal-address" highlight={highlight} />
                            </div>
                            <div style={{ marginTop: 8, fontSize: 14 }}>
                                <Slot slotId="auth_position" value={authPositionNom} label="Должность" inputId="doc-input-auth-position" highlight={highlight} />: _________________ / <Slot slotId="auth_name" value={authShort} label="Подпись представителя" inputId="doc-input-auth-name" highlight={highlight} /> / &nbsp; М.П.
                            </div>
                        </div>
                    ) : (
                        <>
                            <div style={{ borderBottom: '1.5px solid #000', paddingBottom: 2, marginBottom: 16 }}>
                                <strong>Принципал:</strong>
                            </div>
                            <div style={{ borderBottom: '1.5px solid #000', height: 20, marginBottom: 16 }}></div>
                            <div style={{ borderBottom: '1.5px solid #000', height: 20, marginBottom: 28 }}></div>
                        </>
                    )}

                    <div style={{ marginTop: 16, marginBottom: 6 }}>
                        <strong>Агент:</strong>
                    </div>
                    <div style={{ borderBottom: '1.5px solid #000', height: 20, marginBottom: 16 }}></div>
                </div>
            </div>
        );
    }

    /* ── Шаблон: Купля-продажа ─────────────────────────────────────────────── */
    if (template === 'sale') {
        return (
            <div>
                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 16, marginBottom: 16, textTransform: 'uppercase' }}>
                    ДОГОВОР КУПЛИ-ПРОДАЖИ НЕДВИЖИМОСТИ
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <span>г. Киров</span>
                    <span>«<Slot slotId="deal_date" value={dealDate || today} label="Дата сделки" highlight={highlight} />»</span>
                </div>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    Мы, нижеподписавшиеся:<br/>
                    Гр. <Slot slotId="seller_name" value={sellerName} label="Продавец" highlight={highlight} />, {renderPassportDetails(seller, highlight)}, именуемый(ая) в дальнейшем «Продавец», с одной стороны, и<br/>
                    Гр. <Slot slotId="buyer_name" value={buyerName} label="Покупатель" highlight={highlight} />, {renderPassportDetails(buyer, highlight)}, именуемый(ая) в дальнейшем «Покупатель», с другой стороны,<br/>
                    при посредничестве Агентства недвижимости «<Slot slotId="agency_name" value={agency} label="Агентство" highlight={highlight} />» в лице риелтора <Slot slotId="realtor_name" value={realtorName} label="Риелтор" highlight={highlight} />, заключили настоящий Договор о нижеследующем:
                </p>
                <div style={{ fontWeight: 'bold', marginTop: 16, marginBottom: 8 }}>1. ПРЕДМЕТ ДОГОВОРА</div>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    1.1. Продавец продает, а Покупатель покупает в собственность недвижимое имущество (далее – «Объект»):<br/>
                    Адрес: <Slot slotId="address" value={address} label="Адрес объекта" highlight={highlight} /><br/>
                    Общая площадь: <Slot slotId="area" value={area} label="Площадь" fallback="________ кв.м." highlight={highlight} />
                </p>
                <div style={{ fontWeight: 'bold', marginTop: 16, marginBottom: 8 }}>2. ЦЕНА И ПОРЯДОК РАСЧЕТОВ</div>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    2.1. Объект продается за цену в размере <Slot slotId="price" value={price} label="Стоимость" fallback="________________________" highlight={highlight} />.<br/>
                    2.2. Покупатель обязуется выплатить указанную сумму в течение ___ банковских дней с момента государственной регистрации перехода права собственности.
                </p>
                <div style={{ fontWeight: 'bold', marginTop: 16, marginBottom: 12 }}>3. ПОДПИСИ СТОРОН</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 12 }}>
                    <div>
                        <p style={{ fontWeight: 'bold', marginBottom: 4 }}>Продавец:</p>
                        <p style={{ marginBottom: 16 }}>____________________ / <Slot slotId="seller_name" value={sellerName} label="Продавец" highlight={highlight} /> /</p>
                    </div>
                    <div>
                        <p style={{ fontWeight: 'bold', marginBottom: 4 }}>Покупатель:</p>
                        <p style={{ marginBottom: 16 }}>____________________ / <Slot slotId="buyer_name" value={buyerName} label="Покупатель" highlight={highlight} /> /</p>
                    </div>
                </div>
                <div style={{ marginTop: 12 }}>
                    <p style={{ fontWeight: 'bold', marginBottom: 4 }}>Риелтор:</p>
                    <p>____________________ / <Slot slotId="realtor_name" value={realtorName} label="Риелтор" highlight={highlight} /> /</p>
                </div>
            </div>
        );
    }

    /* ── Шаблон: Аренда ────────────────────────────────────────────────────── */
    if (template === 'rent') {
        return (
            <div>
                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 16, marginBottom: 16, textTransform: 'uppercase' }}>
                    ДОГОВОР АРЕНДЫ ЖИЛОГО ПОМЕЩЕНИЯ
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <span>г. Киров</span>
                    <span>«<Slot slotId="deal_date" value={dealDate || today} label="Дата" highlight={highlight} />»</span>
                </div>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    Гр. <Slot slotId="seller_name" value={sellerName} label="Наймодатель" highlight={highlight} />, {renderPassportDetails(seller, highlight)}, именуемый(ая) в дальнейшем «Наймодатель», с одной стороны, и<br/>
                    Гр. <Slot slotId="buyer_name" value={buyerName} label="Наниматель" highlight={highlight} />, {renderPassportDetails(buyer, highlight)}, именуемый(ая) в дальнейшем «Наниматель», с другой стороны,<br/>
                    при содействии риелтора <Slot slotId="realtor_name" value={realtorName} label="Риелтор" highlight={highlight} /> (Агентство недвижимости «<Slot slotId="agency_name" value={agency} label="Агентство" highlight={highlight} />»), заключили настоящий Договор о нижеследующем:
                </p>
                <div style={{ fontWeight: 'bold', marginTop: 16, marginBottom: 8 }}>1. ПРЕДМЕТ ДОГОВОРА</div>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    1.1. Наймодатель предоставляет Нанимателю за плату во владение и пользование жилое помещение по адресу: <Slot slotId="address" value={address} label="Адрес объекта" highlight={highlight} />.
                </p>
                <div style={{ fontWeight: 'bold', marginTop: 16, marginBottom: 8 }}>2. АРЕНДНАЯ ПЛАТА</div>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    2.1. Ежемесячная плата за пользование помещением составляет <Slot slotId="price" value={price} label="Арендная плата" fallback="________________________" highlight={highlight} />.<br/>
                    2.2. Арендная плата вносится ежемесячно не позднее ___ числа каждого месяца.
                </p>
                <div style={{ fontWeight: 'bold', marginTop: 16, marginBottom: 12 }}>3. ПОДПИСИ СТОРОН</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 12 }}>
                    <div>
                        <p style={{ fontWeight: 'bold', marginBottom: 4 }}>Наймодатель:</p>
                        <p style={{ marginBottom: 16 }}>____________________ / <Slot slotId="seller_name" value={sellerName} label="Наймодатель" highlight={highlight} /> /</p>
                    </div>
                    <div>
                        <p style={{ fontWeight: 'bold', marginBottom: 4 }}>Наниматель:</p>
                        <p style={{ marginBottom: 16 }}>____________________ / <Slot slotId="buyer_name" value={buyerName} label="Наниматель" highlight={highlight} /> /</p>
                    </div>
                </div>
                <div style={{ marginTop: 12 }}>
                    <p style={{ fontWeight: 'bold', marginBottom: 4 }}>Риелтор:</p>
                    <p>____________________ / <Slot slotId="realtor_name" value={realtorName} label="Риелтор" highlight={highlight} /> /</p>
                </div>
            </div>
        );
    }

    /* ── Шаблон: Акт приема-передачи квартиры ───────────────────────────────── */
    if (template === 'act') {
        const customActDate = fDate(data.actDate || deal?.handover_date || deal?.deal_date) || today;
        const sellerShort = toShortName(seller?.full_name);
        const buyerShort = toShortName(buyer?.full_name);
        const movable = data.movableProperty || property?.movable_property || '';

        return (
            <div>
                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 18, marginBottom: 2 }}>
                    Акт
                </div>
                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 16, marginBottom: 16 }}>
                    Приема-передачи квартиры
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <span>г. Киров</span>
                    <span>«<Slot slotId="act_date" value={customActDate} label="Дата акта" inputId="doc-input-act-date" highlight={highlight} />»</span>
                </div>

                <div style={{ marginBottom: 10, lineHeight: 1.6, textAlign: 'justify' }}>
                    <strong>Продавец: </strong>
                    <Slot slotId="seller_name" value={sellerName} label="ФИО Продавца" fallback="________________________" highlight={highlight} />
                    {seller ? (
                        <span>, {renderPassportDetails(seller, highlight)}</span>
                    ) : (
                        <span>: __________________________________________________________________________________________</span>
                    )}
                </div>

                <div style={{ marginBottom: 10, lineHeight: 1.6, textAlign: 'justify' }}>
                    <strong>Покупатель: </strong>
                    <Slot slotId="buyer_name" value={buyerName} label="ФИО Покупателя" fallback="________________________" highlight={highlight} />
                    {buyer ? (
                        <span>, {renderPassportDetails(buyer, highlight)}</span>
                    ) : (
                        <span>: __________________________________________________________________________________________</span>
                    )}
                </div>

                <p style={{ marginBottom: 10 }}>
                    составили настоящий акт о нижеследующем:
                </p>

                <p style={{ textIndent: '2.5em', marginBottom: 10, textAlign: 'justify' }}>
                    Продавцы передали Покупателю квартиру, расположенную по адресу: <strong><Slot slotId="address" value={address} label="Адрес квартиры" fallback="__________________________________________________" highlight={highlight} /></strong>.
                </p>

                <p style={{ textIndent: '2.5em', marginBottom: 10, textAlign: 'justify' }}>
                    Продавцы передали Покупателю квартиру в полном соответствии со всеми условиями договора. Иные условия в ходе приема-передачи недвижимости, о которых покупатель не был уведомлен заранее, не выявлены.
                </p>

                <p style={{ textIndent: '2.5em', marginBottom: 10, textAlign: 'justify' }}>
                    Квартира передается с неотделимым оборудованием, коммуникациями, а также движимым имуществом: <Slot slotId="movable_property" value={movable} label="Движимое имущество" fallback="__________________________________________________________________________________________" highlight={highlight} />.
                </p>

                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    На момент подписания настоящего акта в Квартире имеются следующие счетчики учета потребления с соответствующими показаниями:
                </p>

                <table style={{ width: '100%', borderCollapse: 'collapse', margin: '10px 0 14px', border: '1px solid #000' }}>
                    <tbody>
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '6px 10px', width: '40%', fontSize: 13, fontWeight: 500 }}>Счетчик потребления электроэнергии</td>
                            <td style={{ border: '1px solid #000', padding: '6px 10px', width: '60%', fontSize: 13 }}>Серийный номер __________________ Показания ________________________</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '6px 10px', width: '40%', fontSize: 13, fontWeight: 500 }}>Счетчик потребления ХВС</td>
                            <td style={{ border: '1px solid #000', padding: '6px 10px', width: '60%', fontSize: 13 }}>Серийный номер __________________ Показания ________________________</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '6px 10px', width: '40%', fontSize: 13, fontWeight: 500 }}>Счетчик потребления ХВС</td>
                            <td style={{ border: '1px solid #000', padding: '6px 10px', width: '60%', fontSize: 13 }}>Серийный номер __________________ Показания ________________________</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '6px 10px', width: '40%', fontSize: 13, fontWeight: 500 }}>Счетчик потребления ГВС</td>
                            <td style={{ border: '1px solid #000', padding: '6px 10px', width: '60%', fontSize: 13 }}>Серийный номер __________________ Показания ________________________</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '6px 10px', width: '40%', fontSize: 13, fontWeight: 500 }}>Счетчик потребления ГВС</td>
                            <td style={{ border: '1px solid #000', padding: '6px 10px', width: '60%', fontSize: 13 }}>Серийный номер __________________ Показания ________________________</td>
                        </tr>
                        <tr>
                            <td style={{ border: '1px solid #000', padding: '6px 10px', width: '40%', fontSize: 13, fontWeight: 500 }}>Счетчик потребления газа</td>
                            <td style={{ border: '1px solid #000', padding: '6px 10px', width: '60%', fontSize: 13 }}>Серийный номер __________________ Показания ________________________</td>
                        </tr>
                    </tbody>
                </table>

                <p style={{ textIndent: '2.5em', marginBottom: 10, textAlign: 'justify' }}>
                    Обязательства Продавцов передать Квартиру Покупателю считается исполненным, претензий Покупатель к Продавцам о состоянии Квартиры не имеет.
                </p>

                <p style={{ textIndent: '2.5em', marginBottom: 10, textAlign: 'justify' }}>
                    С момента подписания настоящего акта Покупатель принимает на себя все обязательства по содержанию Квартиры, в том числе по оплате коммунальных услуг и капитальному ремонту, риск случайной гибели или случайного повреждения имущества.
                </p>

                <p style={{ textIndent: '2.5em', marginBottom: 10, textAlign: 'justify' }}>
                    Настоящий акт составлен в 2-х экземплярах, имеющих равную юридическую силу, по одному у каждой из сторон.
                </p>

                <div style={{ marginTop: 14, marginBottom: 14 }}>
                    <p style={{ marginBottom: 4 }}>
                        Особые условия: _________________________________________________________________________
                    </p>
                    <p style={{ marginBottom: 4 }}>
                        __________________________________________________________________________________________
                    </p>
                    <p style={{ marginBottom: 4 }}>
                        __________________________________________________________________________________________
                    </p>
                </div>

                <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <p style={{ fontWeight: 'bold', marginBottom: 4 }}>Продавец:</p>
                        <p style={{ marginBottom: 4 }}>
                            ____________________ / <Slot slotId="seller_short" value={sellerShort} label="Подпись продавца" fallback="____________________" highlight={highlight} /> /                  (подпись, ФИО)
                        </p>
                        <p style={{ color: 'var(--text-secondary)' }}>__________________________________________________________________________________________</p>
                    </div>
                    <div>
                        <p style={{ fontWeight: 'bold', marginBottom: 4 }}>Покупатель:</p>
                        <p style={{ marginBottom: 4 }}>
                            ____________________ / <Slot slotId="buyer_short" value={buyerShort} label="Подпись покупателя" fallback="____________________" highlight={highlight} /> /                  (подпись, ФИО)
                        </p>
                        <p style={{ color: 'var(--text-secondary)' }}>__________________________________________________________________________________________</p>
                    </div>
                </div>
            </div>
        );
    }

    /* ── Шаблон: Акт приема-передачи ключей ─────────────────────────────────── */
    if (template === 'key_act') {
        const customActDate = fDate(data.actDate || deal?.handover_date || deal?.deal_date) || today;
        const keyCity = f(data.city || property?.city || 'г. Киров');
        const keyAgency = f(data.agencyName || realtor?.agency_name || 'ИП Муравьевой Ю.А.');

        const authClient = data.authPersonClient || null;
        const apPass = authClient?.passport_details || pAuth?.passport_details || {};
        const effectiveAuthName = f(data.authPersonName || principal?.authorized_name || pAuth?.name || authClient?.full_name || pCompany?.director_name || '');
        const authBirth = data.authPersonBirth ? fDate(data.authPersonBirth) : (authClient?.birth_date ? fDate(authClient.birth_date) : (apPass.birth_date ? fDate(apPass.birth_date) : (pAuth?.birth_date ? fDate(pAuth.birth_date) : '')));
        const authSeries = f(data.authPersonSeries || apPass.series || pAuth?.series);
        const authNumber = f(data.authPersonNumber || apPass.number || pAuth?.number);
        const authIssuedBy = f(data.authPersonIssuedBy || apPass.issued_by || pAuth?.issued_by);
        const authIssueDate = data.authPersonIssueDate ? fDate(data.authPersonIssueDate) : (apPass.issue_date ? fDate(apPass.issue_date) : (pAuth?.issue_date ? fDate(pAuth.issue_date) : ''));
        const authUnitCode = f(data.authPersonUnitCode || apPass.unit_code || pAuth?.unit_code);
        const authRegAddress = f(data.authPersonRegAddress || apPass.registration_address || authClient?.reg_address || authClient?.address || pAuth?.registration_address);

        // Передающая сторона (Передал): ВСЕГДА физлицо! Если юрлицо — ответственное лицо
        const transferrerDisplayName = isLegalEntity
            ? (effectiveAuthName ? `${effectiveAuthName} (ответственное лицо ${companyName || 'организации'})` : `[Ответственное лицо] (${companyName || 'организации'})`)
            : principalName;
        const transferrerShort = isLegalEntity ? toShortName(effectiveAuthName) : principalShort;
        const transferrerBirth = isLegalEntity ? authBirth : principalBirth;
        const transferrerSeries = isLegalEntity ? authSeries : principalSeries;
        const transferrerNumber = isLegalEntity ? authNumber : principalNumber;
        const transferrerIssuedBy = isLegalEntity ? authIssuedBy : principalIssuedBy;
        const transferrerIssueDate = isLegalEntity ? authIssueDate : principalIssueDate;
        const transferrerUnitCode = isLegalEntity ? authUnitCode : principalUnitCode;
        const transferrerRegAddress = isLegalEntity ? authRegAddress : principalRegAddress;

        // Принимающая сторона (Принял): Риелтор
        const receiverName = realtorFullName;
        const receiverShort = realtorShort;
        const receiverBirth = realtorBirth;
        const receiverSeries = realtorSeries;
        const receiverNumber = realtorNumber;
        const receiverIssuedBy = realtorIssuedBy;
        const receiverIssueDate = realtorIssueDate;
        const receiverUnitCode = realtorUnitCode;
        const receiverRegAddress = realtorRegAddress;

        // Объект недвижимости
        const forms = getPropertyKindForms(propKind);

        return (
            <div>
                {/* Логотип Самолет Плюс */}
                <div style={{ marginBottom: 12 }}>
                    <img
                        src={`data:image/png;base64,${YUSS_BUY_1_LOGO_BASE64}`}
                        alt="Самолет Плюс"
                        style={{ width: 140, height: 110, objectFit: 'contain' }}
                    />
                </div>

                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 18, marginBottom: 18, color: '#000' }}>
                    Акт приема-передачи ключей
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <span><Slot slotId="key_city" value={keyCity} label="Город" fallback="г. Киров" highlight={highlight} /></span>
                    <span>«<Slot slotId="act_date" value={customActDate} label="Дата составления акта" inputId="doc-input-act-date" highlight={highlight} />»</span>
                </div>

                <p style={{ marginBottom: 14, lineHeight: 1.6, textAlign: 'justify' }}>
                    Гр. <strong><Slot slotId="realtor_name" value={receiverName} label="ФИО сотрудника (Принял)" fallback="____________________________________________________________________" highlight={highlight} /></strong>,<br />
                    <Slot slotId="realtor_birth" value={receiverBirth} label="Дата рождения" fallback="________" highlight={highlight} /> года рождения, паспорт <Slot slotId="realtor_series" value={receiverSeries} label="Серия паспорта" fallback="________" highlight={highlight} /> <Slot slotId="realtor_number" value={receiverNumber} label="Номер паспорта" fallback="________" highlight={highlight} /> выдан <Slot slotId="realtor_issued_by" value={receiverIssuedBy} label="Кем выдан" fallback="____________________" highlight={highlight} /> <Slot slotId="realtor_issue_date" value={receiverIssueDate} label="Дата выдачи" fallback="________" highlight={highlight} /> г.<br />
                    код подразделения <Slot slotId="realtor_unit_code" value={receiverUnitCode} label="Код подразделения" fallback="_____________" highlight={highlight} />, зарегистрирован по адресу: <Slot slotId="realtor_reg_address" value={receiverRegAddress} label="Адрес регистрации" fallback="____________________" highlight={highlight} />
                </p>

                <p style={{ margin: '14px 0 10px', fontWeight: 'bold' }}>
                    получил от Принципала:
                </p>

                <p style={{ marginBottom: 14, lineHeight: 1.6, textAlign: 'justify' }}>
                    Гр. <strong><Slot slotId="key_principal_name" value={transferrerDisplayName} label="ФИО Принципала / Ответственного лица" fallback="____________________________________________________________________" highlight={highlight} /></strong>,<br />
                    <Slot slotId="key_principal_birth" value={transferrerBirth} label="Дата рождения" fallback="________" highlight={highlight} /> года рождения, паспорт <Slot slotId="key_principal_series" value={transferrerSeries} label="Серия паспорта" fallback="________" highlight={highlight} /> <Slot slotId="key_principal_number" value={transferrerNumber} label="Номер паспорта" fallback="________" highlight={highlight} /> выдан <Slot slotId="key_principal_issued_by" value={transferrerIssuedBy} label="Кем выдан" fallback="____________________" highlight={highlight} /> <Slot slotId="key_principal_issue_date" value={transferrerIssueDate} label="Дата выдачи" fallback="________" highlight={highlight} /> г.<br />
                    код подразделения <Slot slotId="key_principal_unit_code" value={transferrerUnitCode} label="Код подразделения" fallback="_____________" highlight={highlight} />, зарегистрирован по адресу: <Slot slotId="key_principal_reg_address" value={transferrerRegAddress} label="Адрес регистрации" fallback="____________________" highlight={highlight} />
                </p>

                <p style={{ marginBottom: 12, lineHeight: 1.6, textAlign: 'justify' }}>
                    ключи от <Slot slotId="key_prop_kind" value={forms.genitive} label="Вид объекта (род. падеж)" fallback="квартиры" highlight={highlight} /> для исполнение агентского договора, заключенного между Принципалом и Агентом <Slot slotId="key_agency_name" value={keyAgency} label="Агент по договору" fallback="ИП Муравьевой Ю.А." highlight={highlight} />.<br />
                    <Slot slotId="key_prop_kind_cap" value={forms.nominative} label="Вид объекта" fallback="Квартира" highlight={highlight} /> <Slot slotId="key_located_verb" value={forms.locatedVerb} label="расположен / расположена" fallback="расположена" highlight={highlight} /> по адресу: <strong><Slot slotId="prop_address" value={propAddress} label="Адрес объекта" fallback="__________________________________________________________________________________________" highlight={highlight} /></strong>.
                </p>

                <p style={{ fontWeight: 'bold', margin: '22px 0 18px', lineHeight: 1.5, textAlign: 'justify' }}>
                    Передающая сторона гарантирует, что <Slot slotId="key_guarantee_location" value={forms.prepositional} label="Местонахождение" fallback="в квартире" highlight={highlight} /> не находятся деньги, драгоценности и иные ценные вещи.
                </p>

                <div style={{ marginTop: 24, lineHeight: 2 }}>
                    <p style={{ fontWeight: 'bold', marginBottom: 12 }}>Подписи:</p>
                    <p style={{ marginBottom: 18 }}>
                        Передал /_____________________________/ <strong>{transferrerShort ? ` ${transferrerShort}` : ''}</strong>
                    </p>
                    <p>
                        Принял /______________________________/ <strong>{receiverShort ? ` ${receiverShort}` : ''}</strong>
                    </p>
                </div>
            </div>
        );
    }

    /* ── Шаблон: Агентский договор (общий) ─────────────────────────────────── */
    return (
        <div>
            <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 16, marginBottom: 16, textTransform: 'uppercase' }}>
                АГЕНТСКИЙ ДОГОВОР
            </div>
            <div style={{ textAlign: 'center', fontSize: 13, marginBottom: 16, color: 'var(--text-secondary)' }}>
                на оказание услуг по подбору и реализации объекта недвижимости
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <span>г. Киров</span>
                <span>«<Slot slotId="contract_date" value={today} label="Дата" highlight={highlight} />»</span>
            </div>
            <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                Гр. <Slot slotId="principal_name" value={sellerName || principalName} label="Принципал" highlight={highlight} />, {renderPassportDetails(seller || principal, highlight)}, именуемый(ая) в дальнейшем «Принципал», с одной стороны, и<br/>
                Агентство недвижимости «<Slot slotId="agency_name" value={agency} label="Агентство" highlight={highlight} />» в лице риелтора <Slot slotId="realtor_name" value={realtorName} label="Риелтор" highlight={highlight} />, именуемое в дальнейшем «Агент», с другой стороны, заключили настоящий Договор о нижеследующем:
            </p>
            <div style={{ fontWeight: 'bold', marginTop: 16, marginBottom: 8 }}>1. ПРЕДМЕТ ДОГОВОРА</div>
            <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                1.1. Принципал поручает, а Агент принимает на себя обязательство совершать от имени и за счёт Принципала юридические и фактические действия по поиску, подбору и оформлению объекта недвижимости.
            </p>
            <div style={{ fontWeight: 'bold', marginTop: 16, marginBottom: 8 }}>2. ВОЗНАГРАЖДЕНИЕ</div>
            <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                2.1. Размер агентского вознаграждения составляет: <Slot slotId="comm_formatted" value={commFormatted ? `${commFormatted} ₽` : ''} label="Размер вознаграждения" fallback="________________________ рублей" highlight={highlight} />.
            </p>
            <div style={{ fontWeight: 'bold', marginTop: 16, marginBottom: 12 }}>3. ПОДПИСИ СТОРОН</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 12 }}>
                <div>
                    <p style={{ fontWeight: 'bold', marginBottom: 4 }}>Принципал:</p>
                    <p style={{ marginBottom: 16 }}>____________________ / <Slot slotId="principal_name" value={sellerName || principalName} label="Принципал" highlight={highlight} /> /</p>
                </div>
                <div>
                    <p style={{ fontWeight: 'bold', marginBottom: 4 }}>Агент:</p>
                    <p style={{ marginBottom: 16 }}>____________________ / <Slot slotId="realtor_name" value={realtorName} label="Риелтор" highlight={highlight} /> /</p>
                </div>
            </div>
        </div>
    );
}

export default DocumentsPage;
