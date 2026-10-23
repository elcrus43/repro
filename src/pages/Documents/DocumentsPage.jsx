import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { 
    ChevronLeft, Printer, FileText, Download, User, Building2, Briefcase, 
    ChevronDown, ChevronUp, Search, Save, CheckCircle2, AlertCircle, Sparkles, Check, Loader2,
    UserPlus, X, Calendar, Plus, Key, Edit3, RotateCcw, Undo2, Redo2
} from 'lucide-react';
import { generateAndDownloadDocx, getDocumentTemplates, DOCUMENT_CATEGORIES, numberToWordsRu, formatPropertyKind } from '../../utils/docxGenerator';
import { formatPhone, stripPhone, parsePgArray } from '../../utils/format';
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
                        height: 46, borderRadius: 14, cursor: 'pointer',
                        color: selected ? 'var(--text)' : 'var(--text-secondary)',
                    }}
                    onClick={() => setOpen(o => !o)}
                >
                    <span>{selected ? selected.full_name : placeholder}</span>
                    {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {onAddNew && (
                    <button
                        type="button"
                        className="card-clickable"
                        title="Создать нового клиента"
                        onClick={() => onAddNew('')}
                        style={{
                            height: 46,
                            padding: '0 12px',
                            borderRadius: 14,
                            border: '1px solid var(--border)',
                            background: 'var(--surface)',
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            flexShrink: 0,
                        }}
                    >
                        <UserPlus size={15} />
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

    // Условия договора (вознаграждение и срок)
    const [commission, setCommission] = useState(() => prefill.commission ? String(prefill.commission) : '');
    const [contractEndDate, setContractEndDate] = useState(() => {
        if (prefill.contractEndDate) return prefill.contractEndDate;
        const d = new Date();
        d.setMonth(d.getMonth() + 2);
        return d.toISOString().split('T')[0];
    });

    // 3-сторонний договор оказания услуг
    const [service1Cost, setService1Cost] = useState(() => prefill.service1Cost ? String(prefill.service1Cost) : '5 000');
    const [service2Cost, setService2Cost] = useState(() => prefill.service2Cost ? String(prefill.service2Cost) : (prefill.commission ? String(prefill.commission) : '15 000'));
    const [actDate, setActDate] = useState(() => prefill.actDate || new Date().toISOString().split('T')[0]);
    const [movableProperty, setMovableProperty] = useState(() => prefill.movableProperty || '');
    const [realtorTaxStatus, setRealtorTaxStatus] = useState(() => prefill.realtorTaxStatus || state.currentUser?.tax_status || state.currentUser?.passport_details?.tax_status || 'Самозанятый');

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
    const isAgencySale = selectedTemplate === 'agency_sale_1' || isAgencyRentLandlord;
    const isAgencyContract = selectedTemplate === 'yuss_buy_1' || selectedTemplate === 'agency_sale_1' || isAgencyRentLandlord;

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
        return state.clients.find(c => String(c.id) === String(targetId)) || null;
    }, [sourceMode, selectedDealId, isAgencySale, buyerId, sellerId, state.deals, state.clients]);

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
        }
    };

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
    });

    useEffect(() => {
        if (activeClient) {
            const p = activeClient.passport_details || {};
            const cd = activeClient.company_details || {};
            const ap = activeClient.authorized_person || {};
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
                authorized_name: activeClient.authorized_name || ap.name || cd.director_name || (!isLegal ? activeClient.full_name : ''),
                authorized_basis: activeClient.authorized_basis || ap.basis_document || 'Устава',
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

    /* ── Сохранение в CRM ─────────────────────────────────────────────────── */
    const handleSaveToCrm = async () => {
        setIsSavingToCrm(true);
        try {
            const isLegal = Boolean(clientDraft.is_legal_entity);
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
                    const cleanComm = Number(String(commission).replace(/\D/g, '')) || 0;
                    const updatedDeal = { ...currentDeal };
                    if (cleanComm > 0) updatedDeal.commission = cleanComm;
                    if (contractEndDate) updatedDeal.contract_end_date = contractEndDate;
                    await dispatch({ type: 'UPDATE_DEAL', deal: updatedDeal });
                }
            }

            setIsSavedToCrm(true);
            toast?.success?.('Данные сохранены в карточку клиента в CRM!');
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

        const isRealtorSelfEmployed = (realtorTaxStatus || 'Самозанятый').toLowerCase().includes('самозанят');
        return {
            seller, buyer, property,
            realtor: { ...(realtor || {}), tax_status: realtorTaxStatus },
            agencyName, deal, contractEndDate,
            service1Cost, service2Cost, actDate,
            movableProperty: movableProperty || property?.movable_property || '',
            realtorTaxStatus,
            isRealtorSelfEmployed,
            isLegalEntity: Boolean(clientDraft.is_legal_entity)
        };
    }, [sourceMode, selectedDealId, sellerId, buyerId, propertyId, state, realtor, agencyName, enrichedClient, enrichedProperty, commission, contractEndDate, service1Cost, service2Cost, actDate, movableProperty, clientDraft.is_legal_entity, realtorTaxStatus]);

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
            {/* Print style */}
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
            `}} />

            {/* Topbar */}
            <div className="topbar sticky no-print" style={{
                background: 'var(--topbar-bg)',
                backdropFilter: 'blur(24px) saturate(180%)',
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                    <button
                        className="card-clickable"
                        onClick={() => navigate(-1)}
                        style={{
                            width: 40, height: 40, borderRadius: 12, border: 'none',
                            background: 'var(--surface)', color: 'var(--text)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.05)', flexShrink: 0
                        }}
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="topbar-title font-oswald" style={{ letterSpacing: '0.01em', fontSize: 20, fontWeight: 300 }}>
                            Документы
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300, opacity: 0.6 }}>
                            Заполнение из CRM + DOCX
                        </span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end' }}>
                    <GlobalSearch />
                </div>
            </div>

            <div className="page-content" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Категории и выбор шаблона */}
                <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                                        padding: '7px 14px',
                                        borderRadius: 12,
                                        border: '1px solid',
                                        borderColor: isActive ? 'var(--primary)' : 'var(--border)',
                                        background: isActive ? 'var(--primary)' : 'var(--surface)',
                                        color: isActive ? '#ffffff' : 'var(--text-secondary)',
                                        fontSize: 13,
                                        fontWeight: isActive ? 600 : 500,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        boxShadow: isActive ? '0 2px 8px rgba(0,82,255,0.22)' : 'none',
                                        flexShrink: 0
                                    }}
                                >
                                    <span>{cat.label}</span>
                                    <span style={{
                                        fontSize: 10,
                                        padding: '1px 6px',
                                        borderRadius: 8,
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
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                        {displayedTemplates.map(t => (
                            <button
                                key={t.key}
                                className={`tab-filter ${selectedTemplate === t.key ? 'active' : ''}`}
                                onClick={() => setSelectedTemplate(t.key)}
                                style={{
                                    whiteSpace: 'nowrap', padding: '10px 18px', borderRadius: 14, border: 'none',
                                    background: selectedTemplate === t.key ? 'var(--primary)' : 'var(--surface)',
                                    color: selectedTemplate === t.key ? 'white' : 'var(--text-secondary)',
                                    fontSize: 13, fontWeight: 500,
                                    boxShadow: selectedTemplate === t.key ? '0 4px 12px rgba(0,82,255,0.2)' : 'none',
                                    display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0
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
                                    whiteSpace: 'nowrap', padding: '9px 14px', borderRadius: 14,
                                    border: '1px dashed var(--border)', background: 'var(--surface)',
                                    color: 'var(--text-secondary)', fontSize: 12, fontWeight: 500,
                                    display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                                    cursor: 'pointer'
                                }}
                            >
                                <span>Показать все ({templates.length})</span>
                            </button>
                        )}
                        {!hideOtherTemplates && selectedContractId && (
                            <button
                                type="button"
                                onClick={() => setHideOtherTemplates(true)}
                                title="Скрыть остальные шаблоны"
                                style={{
                                    whiteSpace: 'nowrap', padding: '9px 14px', borderRadius: 14,
                                    border: '1px dashed var(--border)', background: 'transparent',
                                    color: 'var(--text-secondary)', fontSize: 12,
                                    display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                                    cursor: 'pointer'
                                }}
                            >
                                <span>Скрыть остальные</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Режим источника данных */}
                <div className="no-print" style={{
                    background: 'var(--surface)', borderRadius: 20, padding: 20,
                    border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Источник данных</span>
                    </div>

                    {/* Переключатель режима */}
                    <div style={{ display: 'flex', gap: 8, maxWidth: 360 }}>
                        {[
                            { id: 'deal', label: 'Из сделки', icon: <Briefcase size={14} /> },
                            { id: 'manual', label: 'Выбрать вручную', icon: <User size={14} /> },
                        ].map(m => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => setSourceMode(m.id)}
                                style={{
                                    flex: 1, height: 42, borderRadius: 12, border: '1px solid',
                                    borderColor: sourceMode === m.id ? 'var(--primary)' : 'var(--border)',
                                    background: sourceMode === m.id ? 'rgba(0,82,255,0.06)' : 'var(--bg)',
                                    color: sourceMode === m.id ? 'var(--primary)' : 'var(--text-secondary)',
                                    fontSize: 13, fontWeight: sourceMode === m.id ? 600 : 400,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    cursor: 'pointer', transition: 'all 0.2s',
                                }}
                            >
                                {m.icon} {m.label}
                            </button>
                        ))}
                    </div>

                    {/* Режим — из сделки */}
                    {sourceMode === 'deal' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Выберите сделку</label>
                            <select
                                className="form-input"
                                style={{ height: 46, borderRadius: 14 }}
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

                {/* Интерактивное заполнение и подсветка недостающих данных Принципала / Заказчика */}
                {(isAgencyContract || isServicesRent3Party || sourceMode === 'manual' || activeClient) && (
                    <div className="no-print" style={{
                        background: 'var(--surface)', borderRadius: 20, padding: 20,
                        border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Sparkles size={16} style={{ color: 'var(--primary)' }} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                                    {activeClient 
                                        ? (isServicesRent3Party 
                                            ? `Реквизиты Заказчика (${clientDraft.is_legal_entity ? (clientDraft.company_name || activeClient.full_name) : activeClient.full_name})` 
                                            : `Реквизиты Принципала (${clientDraft.is_legal_entity ? (clientDraft.company_name || activeClient.full_name) : activeClient.full_name})`) 
                                        : (isServicesRent3Party 
                                            ? `Реквизиты Заказчика (${clientDraft.is_legal_entity ? 'Юрлицо / новый клиент' : 'ручной ввод / новый клиент'})` 
                                            : `Реквизиты Принципала (${clientDraft.is_legal_entity ? 'Юрлицо / новый принципал' : 'ручной ввод / новый принципал'})`)
                                    }
                                </span>
                                {activeClient && (
                                    <button
                                        type="button"
                                        onClick={handleClearClient}
                                        style={{
                                            background: 'none', border: 'none', color: 'var(--primary)',
                                            fontSize: 11, cursor: 'pointer', textDecoration: 'underline', padding: '2px 6px'
                                        }}
                                        title="Очистить и ввести нового принципала вручную"
                                    >
                                        Сменить / Ввести нового
                                    </button>
                                )}
                            </div>

                            {/* Переключатель: Физлицо / Юридическое лицо */}
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--bg)', padding: '3px', borderRadius: 10, border: '1px solid var(--border)' }}>
                                <button
                                    type="button"
                                    onClick={() => handleDraftChange('is_legal_entity', false)}
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: 7,
                                        border: 'none',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        background: !clientDraft.is_legal_entity ? 'var(--surface)' : 'transparent',
                                        color: !clientDraft.is_legal_entity ? 'var(--primary)' : 'var(--text-secondary)',
                                        boxShadow: !clientDraft.is_legal_entity ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    Физлицо
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDraftChange('is_legal_entity', true)}
                                    style={{
                                        padding: '4px 10px',
                                        borderRadius: 7,
                                        border: 'none',
                                        fontSize: 11,
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        background: clientDraft.is_legal_entity ? 'var(--surface)' : 'transparent',
                                        color: clientDraft.is_legal_entity ? 'var(--primary)' : 'var(--text-secondary)',
                                        boxShadow: clientDraft.is_legal_entity ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    Юрлицо (ООО, АО и др.)
                                </button>
                            </div>

                            {(() => {
                                const isLegal = Boolean(clientDraft.is_legal_entity);
                                const missing = isLegal ? [
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

                                if (missing > 0) {
                                    return (
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', padding: '4px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                                            <AlertCircle size={13} />
                                            <span>Не заполнено: {missing}</span>
                                        </div>
                                    );
                                }
                                return (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16, 185, 129, 0.12)', color: '#059669', padding: '4px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                                        <CheckCircle2 size={13} />
                                        <span>Все реквизиты заполнены</span>
                                    </div>
                                );
                            })()}
                        </div>

                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {clientDraft.is_legal_entity 
                                ? 'Реквизиты организации (ИНН, ОГРН, юр. адрес) и полномочия представителя подставляются в договор, а кнопка ниже синхронизирует их с CRM.'
                                : 'Паспортные и контактные данные Принципала подставляются в преамбулу и подписи договора, а кнопка ниже синхронизирует их с CRM.'
                            }
                        </div>

                        {/* Сетка полей с подсветкой недостающих */}
                        {clientDraft.is_legal_entity ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                                {/* Наименование организации */}
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Наименование организации (ООО, АО и т.д.)</span>
                                        {!clientDraft.company_name?.trim() ? <span style={{ color: '#d97706', fontWeight: 600 }}>● Заполнить</span> : <span style={{ color: '#10b981' }}>✓ Заполнено</span>}
                                    </div>
                                    <input
                                        id="doc-input-company-name"
                                        className="form-input"
                                        value={clientDraft.company_name}
                                        onChange={e => {
                                            handleDraftChange('company_name', e.target.value);
                                            if (!clientDraft.full_name) handleDraftChange('full_name', e.target.value);
                                        }}
                                        placeholder="Общество с ограниченной ответственностью «Альфа»"
                                        style={{
                                            width: '100%', height: 42, borderRadius: 12, fontSize: 13,
                                            border: !clientDraft.company_name?.trim() ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                                            background: !clientDraft.company_name?.trim() ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                                        }}
                                    />
                                </div>

                                {/* ИНН */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>ИНН</span>
                                        {!clientDraft.inn?.trim() ? <span style={{ color: '#d97706', fontWeight: 600 }}>● Заполнить</span> : <span style={{ color: '#10b981' }}>✓ Заполнено</span>}
                                    </div>
                                    <input
                                        id="doc-input-inn"
                                        className="form-input"
                                        value={clientDraft.inn}
                                        onChange={e => handleDraftChange('inn', e.target.value)}
                                        placeholder="4345000000"
                                        maxLength={12}
                                        style={{
                                            width: '100%', height: 42, borderRadius: 12, fontSize: 13,
                                            border: !clientDraft.inn?.trim() ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                                            background: !clientDraft.inn?.trim() ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                                        }}
                                    />
                                </div>

                                {/* КПП */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>КПП (при наличии)</span>
                                        <span style={{ color: 'var(--text-secondary)' }}>опционально</span>
                                    </div>
                                    <input
                                        id="doc-input-kpp"
                                        className="form-input"
                                        value={clientDraft.kpp}
                                        onChange={e => handleDraftChange('kpp', e.target.value)}
                                        placeholder="434501001"
                                        maxLength={9}
                                        style={{ width: '100%', height: 42, borderRadius: 12, fontSize: 13, border: '1px solid var(--border)', background: 'var(--bg)' }}
                                    />
                                </div>

                                {/* ОГРН */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>ОГРН</span>
                                        {!clientDraft.ogrn?.trim() ? <span style={{ color: '#d97706', fontWeight: 600 }}>● Заполнить</span> : <span style={{ color: '#10b981' }}>✓ Заполнено</span>}
                                    </div>
                                    <input
                                        id="doc-input-ogrn"
                                        className="form-input"
                                        value={clientDraft.ogrn}
                                        onChange={e => handleDraftChange('ogrn', e.target.value)}
                                        placeholder="1154300000000"
                                        maxLength={15}
                                        style={{
                                            width: '100%', height: 42, borderRadius: 12, fontSize: 13,
                                            border: !clientDraft.ogrn?.trim() ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                                            background: !clientDraft.ogrn?.trim() ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                                        }}
                                    />
                                </div>

                                {/* Телефон */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Телефон организации / представителя</span>
                                        {!clientDraft.phone?.trim() ? <span style={{ color: '#d97706', fontWeight: 600 }}>● Заполнить</span> : <span style={{ color: '#10b981' }}>✓ Заполнено</span>}
                                    </div>
                                    <input
                                        id="doc-input-phone"
                                        type="tel"
                                        inputMode="tel"
                                        className="form-input"
                                        value={clientDraft.phone}
                                        onChange={e => handleDraftChange('phone', formatPhone(e.target.value, true))}
                                        placeholder="+7 (___) ___-__-__"
                                        style={{
                                            width: '100%', height: 42, borderRadius: 12, fontSize: 13,
                                            border: !clientDraft.phone?.trim() ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                                            background: !clientDraft.phone?.trim() ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                                        }}
                                    />
                                </div>

                                {/* Юридический адрес */}
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Юридический адрес местонахождения</span>
                                        {!clientDraft.legal_address?.trim() ? <span style={{ color: '#d97706', fontWeight: 600 }}>● Заполнить</span> : <span style={{ color: '#10b981' }}>✓ Заполнено</span>}
                                    </div>
                                    <input
                                        id="doc-input-legal-address"
                                        className="form-input"
                                        value={clientDraft.legal_address}
                                        onChange={e => handleDraftChange('legal_address', e.target.value)}
                                        placeholder="610000, Кировская обл., г. Киров, ул. Ленина, д. 10, оф. 5"
                                        style={{
                                            width: '100%', height: 42, borderRadius: 12, fontSize: 13,
                                            border: !clientDraft.legal_address?.trim() ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                                            background: !clientDraft.legal_address?.trim() ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                                        }}
                                    />
                                </div>

                                {/* Должность представителя */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Должность представителя</span>
                                        {!clientDraft.authorized_position?.trim() ? <span style={{ color: '#d97706', fontWeight: 600 }}>● Заполнить</span> : <span style={{ color: '#10b981' }}>✓ Заполнено</span>}
                                    </div>
                                    <input
                                        id="doc-input-auth-position"
                                        className="form-input"
                                        value={clientDraft.authorized_position}
                                        onChange={e => handleDraftChange('authorized_position', e.target.value)}
                                        placeholder="Генерального директора"
                                        style={{
                                            width: '100%', height: 42, borderRadius: 12, fontSize: 13,
                                            border: !clientDraft.authorized_position?.trim() ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                                            background: !clientDraft.authorized_position?.trim() ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                                        }}
                                    />
                                </div>

                                {/* ФИО представителя */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>ФИО представителя</span>
                                        {!clientDraft.authorized_name?.trim() ? <span style={{ color: '#d97706', fontWeight: 600 }}>● Заполнить</span> : <span style={{ color: '#10b981' }}>✓ Заполнено</span>}
                                    </div>
                                    <input
                                        id="doc-input-auth-name"
                                        className="form-input"
                                        value={clientDraft.authorized_name}
                                        onChange={e => handleDraftChange('authorized_name', e.target.value)}
                                        placeholder="Иванова Ивана Ивановича"
                                        style={{
                                            width: '100%', height: 42, borderRadius: 12, fontSize: 13,
                                            border: !clientDraft.authorized_name?.trim() ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                                            background: !clientDraft.authorized_name?.trim() ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                                        }}
                                    />
                                </div>

                                {/* Основание полномочий */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Действует на основании</span>
                                        {!clientDraft.authorized_basis?.trim() ? <span style={{ color: '#d97706', fontWeight: 600 }}>● Заполнить</span> : <span style={{ color: '#10b981' }}>✓ Заполнено</span>}
                                    </div>
                                    <input
                                        id="doc-input-auth-basis"
                                        className="form-input"
                                        value={clientDraft.authorized_basis}
                                        onChange={e => handleDraftChange('authorized_basis', e.target.value)}
                                        placeholder="Устава / Доверенности № 1 от 10.01.2025"
                                        style={{
                                            width: '100%', height: 42, borderRadius: 12, fontSize: 13,
                                            border: !clientDraft.authorized_basis?.trim() ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                                            background: !clientDraft.authorized_basis?.trim() ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                                        }}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                                {/* ФИО */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>ФИО Принципала</span>
                                        {!clientDraft.full_name?.trim() ? <span style={{ color: '#d97706', fontWeight: 600 }}>● Заполнить</span> : <span style={{ color: '#10b981' }}>✓ Заполнено</span>}
                                    </div>
                                    <input
                                        id="doc-input-full-name"
                                        className="form-input"
                                        value={clientDraft.full_name}
                                        onChange={e => handleDraftChange('full_name', e.target.value)}
                                        placeholder="Иванов Иван Иванович"
                                        style={{
                                            width: '100%', height: 42, borderRadius: 12, fontSize: 13,
                                            border: !clientDraft.full_name?.trim() ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                                            background: !clientDraft.full_name?.trim() ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                                        }}
                                    />
                                </div>

                                {/* Телефон */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Телефон</span>
                                        {!clientDraft.phone?.trim() ? <span style={{ color: '#d97706', fontWeight: 600 }}>● Заполнить</span> : <span style={{ color: '#10b981' }}>✓ Заполнено</span>}
                                    </div>
                                    <input
                                        id="doc-input-phone"
                                        type="tel"
                                        inputMode="tel"
                                        className="form-input"
                                        value={clientDraft.phone}
                                        onChange={e => handleDraftChange('phone', formatPhone(e.target.value, true))}
                                        placeholder="+7 (___) ___-__-__"
                                        style={{
                                            width: '100%', height: 42, borderRadius: 12, fontSize: 13,
                                            border: !clientDraft.phone?.trim() ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                                            background: !clientDraft.phone?.trim() ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                                        }}
                                    />
                                </div>

                                {/* Дата рождения */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Дата рождения</span>
                                        {!clientDraft.birth_date?.trim() ? <span style={{ color: '#d97706', fontWeight: 600 }}>● Заполнить</span> : <span style={{ color: '#10b981' }}>✓ Заполнено</span>}
                                    </div>
                                    <input
                                        id="doc-input-birth-date"
                                        type="date"
                                        className="form-input"
                                        value={clientDraft.birth_date}
                                        onChange={e => handleDraftChange('birth_date', e.target.value)}
                                        style={{
                                            width: '100%', height: 42, borderRadius: 12, fontSize: 13,
                                            border: !clientDraft.birth_date?.trim() ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                                            background: !clientDraft.birth_date?.trim() ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                                        }}
                                    />
                                </div>

                                {/* Серия паспорта */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Серия паспорта</span>
                                        {!clientDraft.passport_series?.trim() ? <span style={{ color: '#d97706', fontWeight: 600 }}>● Заполнить</span> : <span style={{ color: '#10b981' }}>✓ Заполнено</span>}
                                    </div>
                                    <input
                                        id="doc-input-series"
                                        className="form-input"
                                        value={clientDraft.passport_series}
                                        onChange={e => handleDraftChange('passport_series', e.target.value)}
                                        placeholder="33 14"
                                        maxLength={7}
                                        style={{
                                            width: '100%', height: 42, borderRadius: 12, fontSize: 13,
                                            border: !clientDraft.passport_series?.trim() ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                                            background: !clientDraft.passport_series?.trim() ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                                        }}
                                    />
                                </div>

                                {/* Номер паспорта */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Номер паспорта</span>
                                        {!clientDraft.passport_number?.trim() ? <span style={{ color: '#d97706', fontWeight: 600 }}>● Заполнить</span> : <span style={{ color: '#10b981' }}>✓ Заполнено</span>}
                                    </div>
                                    <input
                                        id="doc-input-number"
                                        className="form-input"
                                        value={clientDraft.passport_number}
                                        onChange={e => handleDraftChange('passport_number', e.target.value)}
                                        placeholder="123456"
                                        maxLength={10}
                                        style={{
                                            width: '100%', height: 42, borderRadius: 12, fontSize: 13,
                                            border: !clientDraft.passport_number?.trim() ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                                            background: !clientDraft.passport_number?.trim() ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                                        }}
                                    />
                                </div>

                                {/* Дата выдачи паспорта */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Дата выдачи паспорта</span>
                                        {!clientDraft.passport_issue_date?.trim() ? <span style={{ color: '#d97706', fontWeight: 600 }}>● Заполнить</span> : <span style={{ color: '#10b981' }}>✓ Заполнено</span>}
                                    </div>
                                    <input
                                        id="doc-input-issue-date"
                                        type="date"
                                        className="form-input"
                                        value={clientDraft.passport_issue_date}
                                        onChange={e => handleDraftChange('passport_issue_date', e.target.value)}
                                        style={{
                                            width: '100%', height: 42, borderRadius: 12, fontSize: 13,
                                            border: !clientDraft.passport_issue_date?.trim() ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                                            background: !clientDraft.passport_issue_date?.trim() ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                                        }}
                                    />
                                </div>

                                {/* Код подразделения */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Код подразделения</span>
                                        {!clientDraft.passport_unit_code?.trim() ? <span style={{ color: '#d97706', fontWeight: 600 }}>● Заполнить</span> : <span style={{ color: '#10b981' }}>✓ Заполнено</span>}
                                    </div>
                                    <input
                                        id="doc-input-unit-code"
                                        className="form-input"
                                        value={clientDraft.passport_unit_code}
                                        onChange={e => handleDraftChange('passport_unit_code', e.target.value)}
                                        placeholder="430-001"
                                        maxLength={8}
                                        style={{
                                            width: '100%', height: 42, borderRadius: 12, fontSize: 13,
                                            border: !clientDraft.passport_unit_code?.trim() ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                                            background: !clientDraft.passport_unit_code?.trim() ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                                        }}
                                    />
                                </div>

                                {/* Кем выдан паспорт */}
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Кем выдан паспорт</span>
                                        {!clientDraft.passport_issued_by?.trim() ? <span style={{ color: '#d97706', fontWeight: 600 }}>● Заполнить</span> : <span style={{ color: '#10b981' }}>✓ Заполнено</span>}
                                    </div>
                                    <input
                                        id="doc-input-issued-by"
                                        className="form-input"
                                        value={clientDraft.passport_issued_by}
                                        onChange={e => handleDraftChange('passport_issued_by', e.target.value)}
                                        placeholder="Отделом УФМС России по Кировской области в Первомайском р-не г. Кирова"
                                        style={{
                                            width: '100%', height: 42, borderRadius: 12, fontSize: 13,
                                            border: !clientDraft.passport_issued_by?.trim() ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                                            background: !clientDraft.passport_issued_by?.trim() ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                                        }}
                                    />
                                </div>

                                {/* Адрес регистрации */}
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Адрес регистрации (по паспорту)</span>
                                        {!clientDraft.registration_address?.trim() ? <span style={{ color: '#d97706', fontWeight: 600 }}>● Заполнить</span> : <span style={{ color: '#10b981' }}>✓ Заполнено</span>}
                                    </div>
                                    <input
                                        id="doc-input-reg-address"
                                        className="form-input"
                                        value={clientDraft.registration_address}
                                        onChange={e => handleDraftChange('registration_address', e.target.value)}
                                        placeholder="г. Киров, ул. Ленина, д. 10, кв. 15"
                                        style={{
                                            width: '100%', height: 42, borderRadius: 12, fontSize: 13,
                                            border: !clientDraft.registration_address?.trim() ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                                            background: !clientDraft.registration_address?.trim() ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Кнопка сохранения в CRM */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                            {activeClient ? (
                                <button
                                    type="button"
                                    className="card-clickable"
                                    onClick={handleSaveToCrm}
                                    disabled={isSavingToCrm}
                                    style={{
                                        height: 44, padding: '0 20px', borderRadius: 14, border: 'none',
                                        background: isSavedToCrm ? '#10b981' : 'var(--primary)',
                                        color: 'white', fontWeight: 600, fontSize: 13,
                                        boxShadow: isSavedToCrm ? '0 4px 14px rgba(16, 185, 129, 0.25)' : '0 4px 14px rgba(0,82,255,0.2)',
                                        display: 'flex', alignItems: 'center', gap: 8, cursor: isSavingToCrm ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s',
                                        opacity: isSavingToCrm ? 0.7 : 1,
                                    }}
                                >
                                    {isSavingToCrm ? <Loader2 size={16} className="animate-spin" /> : (isSavedToCrm ? <Check size={16} /> : <Save size={16} />)}
                                    {isSavingToCrm ? 'Сохранение в CRM...' : (isSavedToCrm ? 'Данные сохранены в CRM' : 'Сохранить в карточку клиента')}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="card-clickable"
                                    onClick={handleSaveNewClientToCrm}
                                    disabled={isSavingToCrm || !clientDraft.full_name?.trim()}
                                    style={{
                                        height: 44, padding: '0 20px', borderRadius: 14, border: 'none',
                                        background: isSavedToCrm ? '#10b981' : 'var(--primary)',
                                        color: 'white', fontWeight: 600, fontSize: 13,
                                        boxShadow: isSavedToCrm ? '0 4px 14px rgba(16, 185, 129, 0.25)' : '0 4px 14px rgba(0,82,255,0.2)',
                                        display: 'flex', alignItems: 'center', gap: 8, cursor: (isSavingToCrm || !clientDraft.full_name?.trim()) ? 'not-allowed' : 'pointer',
                                        transition: 'all 0.2s',
                                        opacity: (isSavingToCrm || !clientDraft.full_name?.trim()) ? 0.7 : 1,
                                    }}
                                    title="Создать нового клиента в CRM с введенными данными"
                                >
                                    {isSavingToCrm ? <Loader2 size={16} className="animate-spin" /> : (isSavedToCrm ? <Check size={16} /> : <UserPlus size={16} />)}
                                    {isSavingToCrm ? 'Создание клиента...' : (isSavedToCrm ? 'Клиент сохранен в CRM' : 'Сохранить нового клиента в CRM')}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Интерактивное заполнение и подсветка характеристик объекта недвижимости */}
                {(activeProperty || isAgencySale || selectedTemplate === 'yuss_buy_1' || propertyId) && (
                    <div className="no-print" style={{
                        background: 'var(--surface)', borderRadius: 20, padding: 20,
                        border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Building2 size={16} style={{ color: 'var(--primary)' }} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                                    {activeProperty ? 'Характеристики объекта (карточка CRM)' : 'Характеристики объекта'}
                                </span>
                            </div>
                            {(() => {
                                const missing = [
                                    !propDraft.address?.trim(),
                                    !propDraft.cadastral_number?.trim(),
                                    !propDraft.price,
                                ].filter(Boolean).length;

                                if (missing > 0) {
                                    return (
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', padding: '4px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                                            <AlertCircle size={13} />
                                            <span>Не заполнено: {missing}</span>
                                        </div>
                                    );
                                }
                                return (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16, 185, 129, 0.12)', color: '#059669', padding: '4px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                                        <CheckCircle2 size={13} />
                                        <span>Все характеристики заполнены</span>
                                    </div>
                                );
                            })()}
                        </div>

                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            Адрес, кадастровый номер и ориентировочная стоимость подставляются в п. 1.1 и таблицу договора. Сохранение синхронизирует их с CRM.
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                            {/* Вид объекта недвижимости */}
                            <div style={{ gridColumn: '1 / -1' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Вид объекта недвижимости (п. 1.1)</span>
                                    {!propDraft.property_kind?.trim() ? <span style={{ color: '#d97706', fontWeight: 600 }}>● Заполнить</span> : <span style={{ color: '#10b981' }}>✓ Заполнено</span>}
                                </div>
                                <input
                                    id="doc-input-prop-kind"
                                    className="form-input"
                                    value={propDraft.property_kind}
                                    onChange={e => handlePropDraftChange('property_kind', e.target.value)}
                                    placeholder="2-комн. квартира"
                                    style={{
                                        width: '100%', height: 42, borderRadius: 12, fontSize: 13,
                                        border: !propDraft.property_kind?.trim() ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                                        background: !propDraft.property_kind?.trim() ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                                    }}
                                />
                            </div>

                            {/* Адрес */}
                            <div style={{ gridColumn: '1 / -1' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Адрес (местоположение) объекта</span>
                                    {!propDraft.address?.trim() ? <span style={{ color: '#d97706', fontWeight: 600 }}>● Заполнить</span> : <span style={{ color: '#10b981' }}>✓ Заполнено</span>}
                                </div>
                                <input
                                    id="doc-input-prop-address"
                                    className="form-input"
                                    value={propDraft.address}
                                    onChange={e => handlePropDraftChange('address', e.target.value)}
                                    placeholder="г. Киров, ул. Ленина, д. 10, кв. 15"
                                    style={{
                                        width: '100%', height: 42, borderRadius: 12, fontSize: 13,
                                        border: !propDraft.address?.trim() ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                                        background: !propDraft.address?.trim() ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                                    }}
                                />
                            </div>

                            {/* Кадастровый номер */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Кадастровый номер</span>
                                    {!propDraft.cadastral_number?.trim() ? <span style={{ color: '#d97706', fontWeight: 600 }}>● Заполнить</span> : <span style={{ color: '#10b981' }}>✓ Заполнено</span>}
                                </div>
                                <input
                                    id="doc-input-prop-cadastral"
                                    className="form-input"
                                    value={propDraft.cadastral_number}
                                    onChange={e => handlePropDraftChange('cadastral_number', e.target.value)}
                                    placeholder="43:40:000000:000"
                                    style={{
                                        width: '100%', height: 42, borderRadius: 12, fontSize: 13,
                                        border: !propDraft.cadastral_number?.trim() ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                                        background: !propDraft.cadastral_number?.trim() ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                                    }}
                                />
                            </div>

                            {/* Площадь */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Общая площадь (кв. м)</span>
                                    {!propDraft.area_total ? <span style={{ color: '#d97706', fontWeight: 600 }}>● Заполнить</span> : <span style={{ color: '#10b981' }}>✓ Заполнено</span>}
                                </div>
                                <input
                                    id="doc-input-prop-area"
                                    className="form-input"
                                    value={propDraft.area_total}
                                    onChange={e => handlePropDraftChange('area_total', e.target.value.replace(/[^\d.,]/g, ''))}
                                    placeholder="45,4"
                                    style={{
                                        width: '100%', height: 42, borderRadius: 12, fontSize: 13,
                                        border: !propDraft.area_total ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                                        background: !propDraft.area_total ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                                    }}
                                />
                            </div>

                            {/* Стоимость объекта */}
                            <div style={{ gridColumn: '1 / -1' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11 }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Ориентировочная стоимость объекта (₽) — п. 1.1.1</span>
                                    {!propDraft.price ? <span style={{ color: '#d97706', fontWeight: 600 }}>● Заполнить</span> : <span style={{ color: '#10b981' }}>✓ Заполнено</span>}
                                </div>
                                <input
                                    id="doc-input-prop-price"
                                    className="form-input"
                                    value={propDraft.price ? Number(String(propDraft.price).replace(/\D/g, '')).toLocaleString('ru-RU') : ''}
                                    onChange={e => {
                                        const digits = e.target.value.replace(/\D/g, '');
                                        handlePropDraftChange('price', digits);
                                    }}
                                    placeholder="4 500 000"
                                    style={{
                                        width: '100%', height: 42, borderRadius: 12, fontSize: 14, fontWeight: 600,
                                        border: !propDraft.price ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                                        background: !propDraft.price ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                                    }}
                                />
                                {propDraft.price && Number(String(propDraft.price).replace(/\D/g, '')) > 0 && (
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.3, fontStyle: 'italic', background: 'var(--bg)', padding: '6px 10px', borderRadius: 8, marginTop: 4 }}>
                                        Прописью: <strong>{numberToWordsRu(Number(String(propDraft.price).replace(/\D/g, '')))}</strong> рублей
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Кнопка сохранения в CRM */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                            <button
                                type="button"
                                className="card-clickable"
                                onClick={handleSaveToCrm}
                                disabled={isSavingToCrm}
                                style={{
                                    height: 44, padding: '0 20px', borderRadius: 14, border: 'none',
                                    background: isSavedToCrm ? '#10b981' : 'var(--primary)',
                                    color: 'white', fontWeight: 600, fontSize: 13,
                                    boxShadow: isSavedToCrm ? '0 4px 14px rgba(16, 185, 129, 0.25)' : '0 4px 14px rgba(0,82,255,0.2)',
                                    display: 'flex', alignItems: 'center', gap: 8, cursor: isSavingToCrm ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s',
                                    opacity: isSavingToCrm ? 0.7 : 1,
                                }}
                            >
                                {isSavingToCrm ? <Loader2 size={16} className="animate-spin" /> : (isSavedToCrm ? <Check size={16} /> : <Save size={16} />)}
                                {isSavingToCrm ? 'Сохранение в CRM...' : (isSavedToCrm ? 'Данные сохранены в CRM' : 'Сохранить характеристики в CRM')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Блок параметров для договора: 3-сторонний или стандартный агентский */}
                {isServicesRent3Party ? (
                    <div className="no-print" style={{
                        background: 'var(--surface)', borderRadius: 20, padding: 20,
                        border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Briefcase size={16} style={{ color: 'var(--primary)' }} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                                    Условия 3-стороннего договора и оплаты
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {service1Cost?.trim() && service2Cost?.trim() ? (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16, 185, 129, 0.12)', color: '#059669', padding: '4px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                                        <CheckCircle2 size={13} />
                                        <span>Стоимости указаны</span>
                                    </div>
                                ) : (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', padding: '4px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                                        <AlertCircle size={13} />
                                        <span>Укажите суммы</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            В 3-стороннем договоре оплата Исполнителю 1 (ИП Муравьева) и Исполнителю 2 производится Заказчиком раздельно.
                        </div>

                        {/* Карточка Исполнителя 2 */}
                        <div style={{
                            background: 'var(--bg)', borderRadius: 14, padding: 14,
                            border: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', gap: 8
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <User size={15} style={{ color: 'var(--primary)' }} />
                                    <strong style={{ fontSize: 13, color: 'var(--text)' }}>Исполнитель 2:</strong>
                                    <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>{realtor?.full_name || 'Не указан'}</span>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--surface)', padding: '2px 6px', borderRadius: 8, border: '1px solid var(--border)' }}>
                                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Статус:</span>
                                        <select
                                            value={realtorTaxStatus}
                                            onChange={e => setRealtorTaxStatus(e.target.value)}
                                            style={{
                                                fontSize: 11, fontWeight: 600, border: 'none', background: 'transparent',
                                                color: realtorTaxStatus === 'Самозанятый' ? 'var(--primary)' : 'var(--text)',
                                                cursor: 'pointer', outline: 'none'
                                            }}
                                        >
                                            <option value="Самозанятый">Самозанятый</option>
                                            <option value="Физическое лицо">Физическое лицо</option>
                                            <option value="Индивидуальный предприниматель">Индивидуальный предприниматель</option>
                                        </select>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => navigate('/profile')}
                                    style={{
                                        background: 'none', border: 'none', color: 'var(--primary)',
                                        fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
                                    }}
                                >
                                    <Edit3 size={12} /> Изменить в профиле
                                </button>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 6 }}>
                                <div>ИНН: <strong style={{ color: 'var(--text)' }}>{realtor?.inn || 'Не указан в профиле'}</strong></div>
                                <div>Телефон: <strong style={{ color: 'var(--text)' }}>{formatPhone(realtor?.phone) || 'Не указан'}</strong></div>
                                <div>Паспорт: <strong style={{ color: 'var(--text)' }}>{realtor?.passport_details?.series && realtor?.passport_details?.number ? `${realtor.passport_details.series} ${realtor.passport_details.number}` : 'Не указан'}</strong></div>
                                <div>Прописка: <strong style={{ color: 'var(--text)' }}>{realtor?.passport_details?.registration_address || realtor?.reg_address || 'Не указан'}</strong></div>
                            </div>
                            {(!realtor?.inn || !realtor?.passport_details?.series) && (
                                <div style={{ fontSize: 11, color: '#d97706', background: 'rgba(245, 158, 11, 0.08)', padding: '6px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <AlertCircle size={13} />
                                    <span>Заполните ИНН и паспорт в вашем Профиле, чтобы они автоматически подставились в договор.</span>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                            {/* Стоимость услуг Исполнителя 1 */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                                        Исполнитель 1 (ИП Муравьева) (₽) — п. 3.2
                                    </span>
                                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>в т.ч. НДС 5%</span>
                                </div>
                                <input
                                    id="doc-input-service1-cost"
                                    className="form-input"
                                    value={service1Cost}
                                    onChange={e => {
                                        const digits = e.target.value.replace(/\D/g, '');
                                        setService1Cost(digits ? Number(digits).toLocaleString('ru-RU') : '');
                                    }}
                                    placeholder="5 000"
                                    style={{
                                        width: '100%', height: 42, borderRadius: 12, fontSize: 14, fontWeight: 600,
                                        border: '1px solid var(--border)', background: 'var(--bg)',
                                    }}
                                />
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                                    {[3000, 5000, 7000, 10000].map(amt => (
                                        <button
                                            key={amt}
                                            type="button"
                                            onClick={() => setService1Cost(amt.toLocaleString('ru-RU'))}
                                            style={{
                                                padding: '4px 9px', borderRadius: 8, border: '1px solid var(--border)',
                                                background: 'var(--bg)', color: 'var(--text-secondary)', fontSize: 11,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {amt.toLocaleString('ru-RU')} ₽
                                        </button>
                                    ))}
                                </div>
                                {service1Cost && Number(service1Cost.replace(/\D/g, '')) > 0 && (
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.3, fontStyle: 'italic', background: 'var(--bg)', padding: '6px 10px', borderRadius: 8 }}>
                                        Прописью: <strong>{numberToWordsRu(Number(service1Cost.replace(/\D/g, '')))}</strong> рублей, в т.ч. НДС 5%
                                    </div>
                                )}
                            </div>

                            {/* Стоимость услуг Исполнителя 2 */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                                        Исполнитель 2 (₽) — п. 3.3
                                    </span>
                                    <span style={{ color: 'var(--text-secondary)' }}>{realtorTaxStatus === 'Самозанятый' ? 'самозанятый' : realtorTaxStatus?.toLowerCase()}</span>
                                </div>
                                <input
                                    id="doc-input-service2-cost"
                                    className="form-input"
                                    value={service2Cost}
                                    onChange={e => {
                                        const digits = e.target.value.replace(/\D/g, '');
                                        setService2Cost(digits ? Number(digits).toLocaleString('ru-RU') : '');
                                    }}
                                    placeholder="15 000"
                                    style={{
                                        width: '100%', height: 42, borderRadius: 12, fontSize: 14, fontWeight: 600,
                                        border: '1px solid var(--border)', background: 'var(--bg)',
                                    }}
                                />
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                                    {[10000, 15000, 20000, 25000, 30000].map(amt => (
                                        <button
                                            key={amt}
                                            type="button"
                                            onClick={() => setService2Cost(amt.toLocaleString('ru-RU'))}
                                            style={{
                                                padding: '4px 9px', borderRadius: 8, border: '1px solid var(--border)',
                                                background: 'var(--bg)', color: 'var(--text-secondary)', fontSize: 11,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {amt.toLocaleString('ru-RU')} ₽
                                        </button>
                                    ))}
                                </div>
                                {service2Cost && Number(service2Cost.replace(/\D/g, '')) > 0 && (
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.3, fontStyle: 'italic', background: 'var(--bg)', padding: '6px 10px', borderRadius: 8 }}>
                                        Прописью: <strong>{numberToWordsRu(Number(service2Cost.replace(/\D/g, '')))}</strong> рублей
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Даты: Срок оказания услуг и дата Акта */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                                        Срок оказания услуг (до даты) — п. 1.3
                                    </span>
                                </div>
                                <input
                                    id="doc-input-contract-end-date"
                                    type="date"
                                    className="form-input"
                                    value={contractEndDate}
                                    onChange={e => setContractEndDate(e.target.value)}
                                    style={{ width: '100%', height: 42, borderRadius: 12, fontSize: 13, background: 'var(--bg)' }}
                                />
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
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
                                            style={{
                                                padding: '4px 9px', borderRadius: 8, border: '1px solid var(--border)',
                                                background: 'var(--bg)', color: 'var(--text-secondary)', fontSize: 11,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                                        Дата Акта выполненных работ
                                    </span>
                                </div>
                                <input
                                    id="doc-input-act-date"
                                    type="date"
                                    className="form-input"
                                    value={actDate}
                                    onChange={e => setActDate(e.target.value)}
                                    style={{ width: '100%', height: 42, borderRadius: 12, fontSize: 13, background: 'var(--bg)' }}
                                />
                                {actDate && (
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.3, background: 'var(--bg)', padding: '6px 10px', borderRadius: 8 }}>
                                        В акте: от <strong>«{new Date(actDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}»</strong>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : selectedTemplate === 'act' ? (
                    <div className="no-print" style={{
                        background: 'var(--surface)', borderRadius: 20, padding: 20,
                        border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <FileText size={16} style={{ color: 'var(--primary)' }} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                                    Параметры акта приема-передачи квартиры
                                </span>
                            </div>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16, 185, 129, 0.12)', color: '#059669', padding: '4px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                                <CheckCircle2 size={13} />
                                <span>Готов к печати и выгрузке</span>
                            </div>
                        </div>

                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            Акт приема-передачи фиксирует передачу квартиры от Продавца к Покупателю, показания счетчиков учета ресурсов и отсутствие взаимных претензий.
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                            {/* Дата составления акта */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                                        Дата составления акта
                                    </span>
                                </div>
                                <input
                                    id="doc-input-act-date"
                                    type="date"
                                    className="form-input"
                                    value={actDate}
                                    onChange={e => setActDate(e.target.value)}
                                    style={{ width: '100%', height: 42, borderRadius: 12, fontSize: 13, background: 'var(--bg)' }}
                                />
                                {actDate && (
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.3, background: 'var(--bg)', padding: '6px 10px', borderRadius: 8 }}>
                                        В акте: от <strong>«{new Date(actDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}»</strong>
                                    </div>
                                )}
                            </div>

                            {/* Неотделимое оборудование и движимое имущество */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                                        Оборудование и движимое имущество (опционально)
                                    </span>
                                </div>
                                <input
                                    className="form-input"
                                    value={movableProperty}
                                    onChange={e => setMovableProperty(e.target.value)}
                                    placeholder="кухонный гарнитур, встроенная техника..."
                                    style={{ width: '100%', height: 42, borderRadius: 12, fontSize: 13, background: 'var(--bg)' }}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="no-print" style={{
                        background: 'var(--surface)', borderRadius: 20, padding: 20,
                        border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Briefcase size={16} style={{ color: 'var(--primary)' }} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                                    Условия договора и вознаграждение агента
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {commission?.trim() && contractEndDate ? (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16, 185, 129, 0.12)', color: '#059669', padding: '4px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                                        <CheckCircle2 size={13} />
                                        <span>Условия заполнены</span>
                                    </div>
                                ) : (
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(245, 158, 11, 0.12)', color: '#d97706', padding: '4px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                                        <AlertCircle size={13} />
                                        <span>Укажите вознаграждение и срок</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            Размер вознаграждения подставляется в п. 3.1, а срок действия договора — в п. 5.1. Данные сразу синхронизируются в предпросмотре и DOCX.
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                            {/* Вознаграждение Агента */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                                        Вознаграждение Агента (₽) — п. 3.1
                                    </span>
                                    {!commission?.trim() ? (
                                        <span style={{ color: '#d97706', fontWeight: 600 }}>● Заполнить</span>
                                    ) : (
                                        <span style={{ color: '#10b981' }}>✓ Указано</span>
                                    )}
                                </div>
                                <input
                                    id="doc-input-commission"
                                    className="form-input"
                                    value={commission}
                                    onChange={e => {
                                        const digits = e.target.value.replace(/\D/g, '');
                                        setCommission(digits ? Number(digits).toLocaleString('ru-RU') : '');
                                    }}
                                    placeholder="50 000"
                                    style={{
                                        width: '100%', height: 42, borderRadius: 12, fontSize: 14, fontWeight: 600,
                                        border: !commission?.trim() ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                                        background: !commission?.trim() ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                                    }}
                                />
                                {/* Быстрые кнопки сумм */}
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                                    {[30000, 50000, 70000, 100000].map(amt => (
                                        <button
                                            key={amt}
                                            type="button"
                                            onClick={() => setCommission(amt.toLocaleString('ru-RU'))}
                                            style={{
                                                padding: '4px 9px', borderRadius: 8, border: '1px solid var(--border)',
                                                background: 'var(--bg)', color: 'var(--text-secondary)', fontSize: 11,
                                                cursor: 'pointer', transition: 'all 0.15s'
                                            }}
                                        >
                                            {amt.toLocaleString('ru-RU')} ₽
                                        </button>
                                    ))}
                                </div>
                                {/* Сумма прописью */}
                                {commission && Number(commission.replace(/\D/g, '')) > 0 && (
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.3, fontStyle: 'italic', background: 'var(--bg)', padding: '6px 10px', borderRadius: 8 }}>
                                        Прописью: <strong>{numberToWordsRu(Number(commission.replace(/\D/g, '')))}</strong> рублей, в т.ч. НДС 5%
                                    </div>
                                )}
                            </div>

                            {/* Срок действия договора */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                                        Срок действия договора (до даты) — п. 5.1
                                    </span>
                                    {!contractEndDate ? (
                                        <span style={{ color: '#d97706', fontWeight: 600 }}>● Выбрать дату</span>
                                    ) : (
                                        <span style={{ color: '#10b981' }}>✓ Выбран</span>
                                    )}
                                </div>
                                <input
                                    id="doc-input-contract-end-date"
                                    type="date"
                                    className="form-input"
                                    value={contractEndDate}
                                    onChange={e => setContractEndDate(e.target.value)}
                                    style={{
                                        width: '100%', height: 42, borderRadius: 12, fontSize: 13,
                                        border: !contractEndDate ? '1.5px solid #f59e0b' : '1px solid var(--border)',
                                        background: !contractEndDate ? 'rgba(245, 158, 11, 0.04)' : 'var(--bg)',
                                    }}
                                />
                                {/* Быстрые кнопки срока */}
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
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
                                            style={{
                                                padding: '4px 9px', borderRadius: 8, border: '1px solid var(--border)',
                                                background: 'var(--bg)', color: 'var(--text-secondary)', fontSize: 11,
                                                cursor: 'pointer'
                                            }}
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
                                        style={{
                                            padding: '4px 9px', borderRadius: 8, border: '1px solid var(--border)',
                                            background: 'var(--bg)', color: 'var(--text-secondary)', fontSize: 11,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        До 31 дек
                                    </button>
                                </div>
                                {contractEndDate && (
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.3, background: 'var(--bg)', padding: '6px 10px', borderRadius: 8 }}>
                                        В договоре: действует до <strong>«{new Date(contractEndDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}»</strong> включительно
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

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

                {/* Предпросмотр подставляемых данных */}
                {(seller || buyer || property || deal) && (
                    <div className="no-print" style={{
                        background: 'var(--surface)', borderRadius: 20, padding: 20,
                        border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10
                    }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                            Данные для документа
                        </span>
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

                {/* Кнопки действий */}
                <div className="no-print" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                        className="card-clickable"
                        onClick={handleDownload}
                        disabled={isGenerating}
                        style={{
                            height: 48, padding: '0 28px', borderRadius: 14, border: 'none',
                            background: 'var(--primary)', color: 'white', fontWeight: 600, fontSize: 14,
                            boxShadow: '0 4px 14px rgba(0,82,255,0.25)',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            opacity: isGenerating ? 0.7 : 1, cursor: isGenerating ? 'not-allowed' : 'pointer',
                        }}
                    >
                        <Download size={18} />
                        {isGenerating ? 'Генерация...' : 'Скачать DOCX'}
                    </button>
                    <button
                        className="card-clickable"
                        onClick={() => window.print()}
                        style={{
                            height: 48, padding: '0 22px', borderRadius: 14,
                            border: '1px solid var(--border)', background: 'var(--surface)',
                            color: 'var(--text-secondary)', fontWeight: 500, fontSize: 14,
                            display: 'inline-flex', alignItems: 'center', gap: 8,
                            cursor: 'pointer'
                        }}
                    >
                        <Printer size={18} />
                        Печать
                    </button>
                </div>

                {/* Панель управления предпросмотром и правкой */}
                <div className="no-print" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 18px',
                    background: 'var(--surface)',
                    border: isEditMode ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: 18,
                    flexWrap: 'wrap',
                    gap: 12,
                    transition: 'all 0.2s',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                            Предпросмотр договора
                        </span>
                        {isEditMode ? (
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                padding: '3px 10px', borderRadius: 8,
                                background: 'rgba(0,102,255,0.12)', color: 'var(--primary)',
                                fontWeight: 600, fontSize: 11
                            }}>
                                <Edit3 size={13} />
                                Режим правки включен
                            </span>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, flexWrap: 'wrap' }}>
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    padding: '3px 8px', borderRadius: 6,
                                    background: 'rgba(0,102,255,0.08)', color: '#0052cc', fontWeight: 600,
                                    borderBottom: '2px solid #0066ff'
                                }}>
                                    🟦 Из CRM
                                </span>
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    padding: '3px 8px', borderRadius: 6,
                                    background: 'rgba(245,158,11,0.14)', color: '#b45309', fontWeight: 600,
                                    border: '1px dashed #f59e0b'
                                }}>
                                    🟧 Заполнить
                                </span>
                                {savedTemplateHtml && (
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        padding: '3px 8px', borderRadius: 6,
                                        background: 'rgba(16,185,129,0.12)', color: '#059669', fontWeight: 600
                                    }}>
                                        ✓ Свой шаблон
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        {/* Кнопка включения режима правки */}
                        <button
                            type="button"
                            className="card-clickable"
                            onClick={() => {
                                const next = !isEditMode;
                                setIsEditMode(next);
                                if (next) {
                                    setHighlightSlots(false);
                                }
                            }}
                            style={{
                                height: 36,
                                padding: '0 14px',
                                borderRadius: 12,
                                border: isEditMode ? '1px solid var(--primary)' : '1px solid var(--border)',
                                background: isEditMode ? 'var(--primary)' : 'var(--bg)',
                                color: isEditMode ? 'white' : 'var(--text)',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                transition: 'all 0.15s ease-in-out',
                                boxShadow: isEditMode ? '0 2px 8px rgba(0,82,255,0.3)' : 'none',
                            }}
                            title={isEditMode ? "Завершить редактирование текста" : "Включить редактирование текста прямо на листе договора"}
                        >
                            <Edit3 size={14} />
                            {isEditMode ? 'Завершить правку' : 'Редактировать текст'}
                        </button>

                        {/* Панель быстрого форматирования при активной правке */}
                        {isEditMode && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 2,
                                background: 'var(--bg)', padding: '2px 4px',
                                borderRadius: 10, border: '1px solid var(--border)'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => document.execCommand('bold', false, null)}
                                    title="Жирный (Ctrl+B)"
                                    style={{
                                        width: 28, height: 28, borderRadius: 6, border: 'none',
                                        background: 'transparent', cursor: 'pointer', fontWeight: 'bold',
                                        color: 'var(--text)', fontSize: 13
                                    }}
                                >
                                    Ж
                                </button>
                                <button
                                    type="button"
                                    onClick={() => document.execCommand('italic', false, null)}
                                    title="Курсив (Ctrl+I)"
                                    style={{
                                        width: 28, height: 28, borderRadius: 6, border: 'none',
                                        background: 'transparent', cursor: 'pointer', fontStyle: 'italic',
                                        color: 'var(--text)', fontSize: 13
                                    }}
                                >
                                    К
                                </button>
                                <button
                                    type="button"
                                    onClick={() => document.execCommand('underline', false, null)}
                                    title="Подчеркнутый (Ctrl+U)"
                                    style={{
                                        width: 28, height: 28, borderRadius: 6, border: 'none',
                                        background: 'transparent', cursor: 'pointer', textDecoration: 'underline',
                                        color: 'var(--text)', fontSize: 13
                                    }}
                                >
                                    Ч
                                </button>
                                <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px' }} />
                                <button
                                    type="button"
                                    onClick={() => document.execCommand('undo', false, null)}
                                    title="Отменить действие (Ctrl+Z)"
                                    style={{
                                        width: 28, height: 28, borderRadius: 6, border: 'none',
                                        background: 'transparent', cursor: 'pointer', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', color: 'var(--text)'
                                    }}
                                >
                                    <Undo2 size={13} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => document.execCommand('redo', false, null)}
                                    title="Повторить действие (Ctrl+Y)"
                                    style={{
                                        width: 28, height: 28, borderRadius: 6, border: 'none',
                                        background: 'transparent', cursor: 'pointer', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', color: 'var(--text)'
                                    }}
                                >
                                    <Redo2 size={13} />
                                </button>
                            </div>
                        )}

                        {/* Кнопка сохранения как шаблон */}
                        {(isEditMode || hasManualEdits) && (
                            <button
                                type="button"
                                className="card-clickable"
                                onClick={handleSaveAsTemplate}
                                style={{
                                    height: 36,
                                    padding: '0 12px',
                                    borderRadius: 12,
                                    border: '1px solid rgba(16,185,129,0.3)',
                                    background: 'rgba(16,185,129,0.1)',
                                    color: '#059669',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                }}
                                title="Сохранить эти формулировки как постоянный шаблон для договоров данного типа"
                            >
                                <Save size={14} />
                                Сохранить шаблон
                            </button>
                        )}

                        {/* Кнопка сброса правок */}
                        {(hasManualEdits || savedTemplateHtml) && (
                            <button
                                type="button"
                                className="card-clickable"
                                onClick={handleResetTemplate}
                                style={{
                                    height: 36,
                                    padding: '0 12px',
                                    borderRadius: 12,
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg)',
                                    color: 'var(--text-secondary)',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                }}
                                title="Сбросить все правки и вернуться к исходному шаблону CRM"
                            >
                                <RotateCcw size={13} />
                                Сбросить
                            </button>
                        )}

                        {/* Кнопка подсветки полей */}
                        {!isEditMode && (
                            <button
                                type="button"
                                className="card-clickable"
                                onClick={() => setHighlightSlots(!highlightSlots)}
                                style={{
                                    height: 36,
                                    padding: '0 12px',
                                    borderRadius: 12,
                                    border: '1px solid var(--border)',
                                    background: highlightSlots ? 'rgba(0,102,255,0.08)' : 'var(--bg)',
                                    color: highlightSlots ? 'var(--primary)' : 'var(--text-secondary)',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    transition: 'all 0.2s',
                                }}
                            >
                                <Sparkles size={14} />
                                {highlightSlots ? 'Подсветка: ВКЛ' : 'Подсветка: ВЫКЛ'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Баннер подсказки в режиме правки */}
                {isEditMode && (
                    <div className="no-print" style={{
                        marginTop: 10,
                        padding: '10px 16px',
                        borderRadius: 14,
                        background: 'rgba(0,102,255,0.06)',
                        border: '1px solid rgba(0,102,255,0.2)',
                        fontSize: 12,
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontWeight: 500,
                    }}>
                        <Sparkles size={16} style={{ flexShrink: 0 }} />
                        <span>
                            <strong>Режим правки активен:</strong> Кликните в любой абзац, пункт или таблицу документа ниже, чтобы изменить текст, дописать свои условия или удалить ненужное. Все правки сохранятся при печати и выгрузке в DOCX.
                        </span>
                    </div>
                )}

                {/* Оповещение об активном сохраненном шаблоне */}
                {savedTemplateHtml && (
                    <div className="no-print" style={{
                        marginTop: 10,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 18px', borderRadius: 16,
                        background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)',
                        fontSize: 12, color: 'var(--text)', gap: 12, flexWrap: 'wrap'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <FileText size={18} style={{ color: '#059669', flexShrink: 0 }} />
                            <span>
                                Используется ваш <strong>сохранённый шаблон</strong> для этого типа договора. Данные принципала и объекта обновляются автоматически.
                            </span>
                        </div>
                        <button
                            type="button"
                            className="card-clickable"
                            onClick={handleResetTemplate}
                            style={{
                                padding: '6px 14px', borderRadius: 10,
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                background: 'rgba(239, 68, 68, 0.08)',
                                color: '#dc2626', fontSize: 12, fontWeight: 600,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
                            }}
                            title="Сбросить все правки шаблона и вернуть стандартный системный вариант договора"
                        >
                            <RotateCcw size={13} />
                            Сбросить к стандартному CRM
                        </button>
                    </div>
                )}

                {/* Предпросмотр документа (для экрана и печати) */}
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
                        borderRadius: 24,
                        padding: '44px 40px',
                        marginTop: 14,
                        border: isEditMode ? '2px dashed var(--primary)' : '1px solid var(--border)',
                        boxShadow: isEditMode ? '0 0 0 4px rgba(0,102,255,0.08)' : '0 8px 32px rgba(0,0,0,0.03)',
                        fontFamily: isAgencyContract ? 'Arial, Helvetica, sans-serif' : 'Georgia, Cambria, "Times New Roman", serif',
                        fontSize: isAgencyContract ? 13 : 14,
                        lineHeight: isAgencyContract ? 1.6 : 1.8,
                        minHeight: 600,
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
            const el = document.getElementById(inputId);
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
    const propPrefix = [propRooms, propArea].filter(Boolean).join(', ');

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
    const customerUnitCode = f(cDetails.unit_code);
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
