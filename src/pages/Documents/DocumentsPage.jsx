import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { 
    ChevronLeft, Printer, FileText, Download, User, Building2, Briefcase, 
    ChevronDown, ChevronUp, Search, Save, CheckCircle2, AlertCircle, Sparkles, Check, Loader2,
    UserPlus, X, Calendar, Plus
} from 'lucide-react';
import { generateAndDownloadDocx, getDocumentTemplates, numberToWordsRu } from '../../utils/docxGenerator';
import { formatPhone, stripPhone } from '../../utils/format';
import { YUSS_BUY_1_LOGO_BASE64 } from '../../assets/templates/yuss_buy_1_logo.base64';

/* ─── Иконки шаблонов ─────────────────────────────────────────────────────── */
const TEMPLATE_ICONS = {
    yuss_buy_1: <Briefcase size={16} />,
    sale: <Building2 size={16} />,
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

    const [selectedTemplate, setSelectedTemplate] = useState(prefill.template || 'yuss_buy_1');
    const [sourceMode, setSourceMode] = useState(prefill.dealId ? 'deal' : 'manual'); // 'deal' | 'manual'

    // Для режима «по сделке»
    const [selectedDealId, setSelectedDealId] = useState(prefill.dealId || '');

    // Для режима «вручную»
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

    const [isGenerating, setIsGenerating] = useState(false);
    const [isSavedToCrm, setIsSavedToCrm] = useState(false);
    const [isSavingToCrm, setIsSavingToCrm] = useState(false);
    const [highlightSlots, setHighlightSlots] = useState(true);

    // Поддержка параметров в строке адреса ?clientId=...&propertyId=...&dealId=...
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const qTemplate = params.get('template');
        const qClient = params.get('clientId');
        const qDeal = params.get('dealId');
        const qProperty = params.get('propertyId');

        if (qTemplate) setSelectedTemplate(qTemplate);
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
            const d = state.deals.find(deal => deal.id === selectedDealId);
            if (d) {
                if (d.commission && !commission) {
                    setCommission(Number(d.commission).toLocaleString('ru-RU'));
                }
                if (d.contract_end_date) {
                    setContractEndDate(d.contract_end_date.split('T')[0]);
                }
            }
        }
    }, [sourceMode, selectedDealId, state.deals]);

    const templates = getDocumentTemplates();
    const realtor = state.currentUser;
    const agencyName = realtor?.agency_name;

    /* ── Выбранный клиент для редактирования реквизитов ────────────────────── */
    const activeClient = useMemo(() => {
        if (sourceMode === 'deal' && selectedDealId) {
            const d = state.deals.find(deal => deal.id === selectedDealId);
            if (d) {
                const buyerIds = d.buyer_ids || (d.buyer_id ? [d.buyer_id] : []);
                const sellerIds = d.seller_ids || (d.seller_id ? [d.seller_id] : []);
                const cId = buyerIds[0] || sellerIds[0];
                return state.clients.find(c => c.id === cId) || null;
            }
        }
        return state.clients.find(c => c.id === (buyerId || sellerId)) || null;
    }, [sourceMode, selectedDealId, buyerId, sellerId, state.deals, state.clients]);

    /* ── Черновик реквизитов клиента ──────────────────────────────────────── */
    const [clientDraft, setClientDraft] = useState({
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
            setClientDraft({
                full_name: activeClient.full_name || '',
                phone: formatPhone(activeClient.phone || '', true),
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
        if (!activeClient) return null;
        return {
            ...activeClient,
            full_name: clientDraft.full_name || activeClient.full_name,
            phone: clientDraft.phone || activeClient.phone,
            birth_date: clientDraft.birth_date || activeClient.birth_date,
            reg_address: clientDraft.registration_address || activeClient.reg_address,
            passport_details: {
                ...(activeClient.passport_details || {}),
                series: clientDraft.passport_series,
                number: clientDraft.passport_number,
                issued_by: clientDraft.passport_issued_by,
                issue_date: clientDraft.passport_issue_date,
                unit_code: clientDraft.passport_unit_code,
                registration_address: clientDraft.registration_address,
                birth_date: clientDraft.birth_date,
            }
        };
    }, [activeClient, clientDraft]);

    /* ── Черновик реквизитов объекта недвижимости ───────────────────────── */
    const activeProperty = useMemo(() => {
        return state.properties.find(p => p.id === propertyId) || null;
    }, [propertyId, state.properties]);

    const [propDraft, setPropDraft] = useState({
        address: '',
        cadastral_number: '',
        area_total: '',
        price: '',
    });

    useEffect(() => {
        if (activeProperty) {
            setPropDraft({
                address: activeProperty.address || activeProperty.city || '',
                cadastral_number: activeProperty.cadastral_number || '',
                area_total: activeProperty.area_total ? String(activeProperty.area_total) : '',
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
        if (!activeProperty) return null;
        return {
            ...activeProperty,
            address: propDraft.address || activeProperty.address,
            cadastral_number: propDraft.cadastral_number || activeProperty.cadastral_number,
            area_total: propDraft.area_total ? Number(String(propDraft.area_total).replace(/\D/g, '')) : activeProperty.area_total,
            price: propDraft.price ? Number(String(propDraft.price).replace(/\D/g, '')) : activeProperty.price,
        };
    }, [activeProperty, propDraft]);

    /* ── Сохранение в CRM ─────────────────────────────────────────────────── */
    const handleSaveToCrm = async () => {
        setIsSavingToCrm(true);
        try {
            if (activeClient) {
                const series = clientDraft.passport_series?.trim() || '';
                const number = clientDraft.passport_number?.trim() || '';
                const passportStr = (series && number) ? `${series} ${number}` : (series || number || activeClient.passport || '');
                const birthDateStr = clientDraft.birth_date?.trim() || activeClient.birth_date || '';
                const regAddressStr = clientDraft.registration_address?.trim() || activeClient.reg_address || '';
                const innStr = activeClient.inn || activeClient.passport_details?.inn || '';

                const updatedClient = {
                    ...activeClient,
                    full_name: clientDraft.full_name?.trim() || activeClient.full_name,
                    phone: stripPhone(clientDraft.phone) || clientDraft.phone?.trim() || activeClient.phone,
                    birth_date: birthDateStr,
                    reg_address: regAddressStr,
                    passport: passportStr,
                    passport_details: {
                        ...(activeClient.passport_details || {}),
                        series,
                        number,
                        issued_by: clientDraft.passport_issued_by?.trim() || '',
                        issue_date: clientDraft.passport_issue_date?.trim() || '',
                        unit_code: clientDraft.passport_unit_code?.trim() || '',
                        registration_address: regAddressStr,
                        birth_date: birthDateStr,
                        inn: innStr,
                    }
                };
                await dispatch({ type: 'UPDATE_CLIENT', client: updatedClient });
            }

            if (activeProperty) {
                const updatedProperty = {
                    ...activeProperty,
                    address: propDraft.address?.trim() || activeProperty.address,
                    cadastral_number: propDraft.cadastral_number?.trim() || activeProperty.cadastral_number,
                    area_total: propDraft.area_total ? Number(String(propDraft.area_total).replace(/\D/g, '')) : activeProperty.area_total,
                    price: propDraft.price ? Number(String(propDraft.price).replace(/\D/g, '')) : activeProperty.price,
                };
                await dispatch({ type: 'UPDATE_PROPERTY', property: updatedProperty });
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
            deal = state.deals.find(d => d.id === selectedDealId);
            if (deal) {
                const sellerIds = deal.seller_ids || (deal.seller_id ? [deal.seller_id] : []);
                const buyerIds = deal.buyer_ids || (deal.buyer_id ? [deal.buyer_id] : []);
                seller = state.clients.find(c => sellerIds.includes(c.id)) || null;
                buyer = state.clients.find(c => buyerIds.includes(c.id)) || null;
                property = state.properties.find(p => p.id === deal.property_id) || null;
            }
        } else {
            seller = state.clients.find(c => c.id === sellerId) || null;
            buyer = state.clients.find(c => c.id === buyerId) || null;
            property = state.properties.find(p => p.id === propertyId) || null;
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

        return { seller, buyer, property, realtor, agencyName, deal, contractEndDate };
    }, [sourceMode, selectedDealId, sellerId, buyerId, propertyId, state, realtor, agencyName, enrichedClient, enrichedProperty, commission, contractEndDate]);

    /* ── Предпросмотр подставляемых данных ─────────────────────────────────── */
    const { seller, buyer, property, deal } = generatorData;

    const handleDownload = async () => {
        setIsGenerating(true);
        try {
            await generateAndDownloadDocx(selectedTemplate, generatorData);
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
                        font-family: ${selectedTemplate === 'yuss_buy_1' ? 'Arial, sans-serif' : "'Times New Roman', Times, serif"} !important;
                        font-size: ${selectedTemplate === 'yuss_buy_1' ? '9pt' : '13pt'} !important;
                        line-height: ${selectedTemplate === 'yuss_buy_1' ? '1.25' : '1.4'} !important;
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
                padding: '20px',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                alignItems: 'center',
                gap: 16
            }}>
                <button
                    className="card-clickable"
                    onClick={() => navigate(-1)}
                    style={{
                        width: 44, height: 44, borderRadius: 14, border: 'none',
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

            <div className="page-content" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Выбор шаблона */}
                <div className="no-print" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
                    {templates.map(t => (
                        <button
                            key={t.key}
                            className={`tab-filter ${selectedTemplate === t.key ? 'active' : ''}`}
                            onClick={() => setSelectedTemplate(t.key)}
                            style={{
                                whiteSpace: 'nowrap', padding: '10px 18px', borderRadius: 14, border: 'none',
                                background: selectedTemplate === t.key ? 'var(--primary)' : 'var(--surface)',
                                color: selectedTemplate === t.key ? 'white' : 'var(--text-secondary)',
                                fontSize: 13, fontWeight: 300, fontFamily: "'Oswald', sans-serif",
                                boxShadow: selectedTemplate === t.key ? '0 4px 12px rgba(0,82,255,0.2)' : 'none',
                                display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0
                            }}
                        >
                            {TEMPLATE_ICONS[t.key]}
                            {t.title}
                        </button>
                    ))}
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
                    <div style={{ display: 'flex', gap: 8 }}>
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
                            {selectedTemplate === 'yuss_buy_1' ? (
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

                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                                    Объект недвижимости {selectedTemplate === 'yuss_buy_1' ? '(опционально)' : ''}
                                </label>
                                <ClientSearch
                                    clients={propertyOptions}
                                    value={propertyId}
                                    onChange={setPropertyId}
                                    placeholder="Выберите объект"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Интерактивное заполнение и подсветка недостающих данных Принципала */}
                {activeClient && (
                    <div className="no-print" style={{
                        background: 'var(--surface)', borderRadius: 20, padding: 20,
                        border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Sparkles size={16} style={{ color: 'var(--primary)' }} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                                    Реквизиты Принципала (карточка CRM)
                                </span>
                            </div>
                            {(() => {
                                const missing = [
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
                            Паспортные и контактные данные Принципала подставляются в преамбулу и подписи договора, а кнопка ниже синхронизирует их с CRM.
                        </div>

                        {/* Сетка полей с подсветкой недостающих */}
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

                        {/* Кнопка сохранения в карточку клиента CRM */}
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
                                {isSavingToCrm ? 'Сохранение в CRM...' : (isSavedToCrm ? 'Данные сохранены в CRM' : 'Сохранить в карточку клиента')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Отдельный блок: Условия договора и вознаграждение агента */}
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

                {/* Модальное окно быстрого создания клиента */}
                <QuickClientModal
                    isOpen={quickModalConfig.isOpen}
                    onClose={() => setQuickModalConfig(prev => ({ ...prev, isOpen: false }))}
                    initialName={quickModalConfig.initialName}
                    role={quickModalConfig.role}
                    onCreated={(newClient) => {
                        if (selectedTemplate === 'yuss_buy_1') {
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
                        {selectedTemplate === 'yuss_buy_1' ? (
                            <>
                                <DataPreview label="Агент" value="ИП Муравьева Юлия Анатольевна (г. Киров)" />
                                {(buyer || seller) && (
                                    <>
                                        <DataPreview label="Принципал" value={(buyer || seller).full_name} />
                                        {(buyer || seller).phone && <DataPreview label="Телефон" value={formatPhone((buyer || seller).phone)} />}
                                        <DataPreview label="Паспорт" value={((buyer || seller).passport_details?.series && (buyer || seller).passport_details?.number) ? `Серия ${(buyer || seller).passport_details.series} № ${(buyer || seller).passport_details.number}` : null} />
                                        <DataPreview label="Прописка" value={(buyer || seller).passport_details?.registration_address || (buyer || seller).reg_address || (buyer || seller).address} />
                                    </>
                                )}
                                {(deal?.commission || property?.commission) && (
                                    <DataPreview label="Вознаграждение" value={`${Number(String(deal?.commission || property?.commission).replace(/\D/g, '')).toLocaleString('ru-RU')} ₽ (в т.ч. НДС 5%)`} />
                                )}
                                {property && <DataPreview label="Объект" value={property.address || property.city} />}
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
                <div className="no-print" style={{ display: 'flex', gap: 10 }}>
                    <button
                        className="card-clickable"
                        onClick={handleDownload}
                        disabled={isGenerating}
                        style={{
                            flex: 1, height: 52, borderRadius: 16, border: 'none',
                            background: 'var(--primary)', color: 'white', fontWeight: 600, fontSize: 14,
                            boxShadow: '0 8px 16px rgba(0,82,255,0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
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
                            height: 52, padding: '0 20px', borderRadius: 16,
                            border: '1px solid var(--border)', background: 'var(--surface)',
                            color: 'var(--text-secondary)', fontWeight: 500, fontSize: 14,
                            display: 'flex', alignItems: 'center', gap: 8,
                        }}
                    >
                        <Printer size={18} />
                        Печать
                    </button>
                </div>

                {/* Панель управления предпросмотром и подсветкой */}
                <div className="no-print" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 18,
                    flexWrap: 'wrap',
                    gap: 12
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                            Предпросмотр договора
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '3px 8px', borderRadius: 6,
                                background: 'rgba(0,102,255,0.08)', color: '#0052cc', fontWeight: 600,
                                borderBottom: '2px solid #0066ff'
                            }}>
                                🟦 Подставлено из CRM
                            </span>
                            <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '3px 8px', borderRadius: 6,
                                background: 'rgba(245,158,11,0.14)', color: '#b45309', fontWeight: 600,
                                border: '1px dashed #f59e0b'
                            }}>
                                🟧 Требуется заполнить
                            </span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button
                            type="button"
                            className="card-clickable"
                            onClick={() => setHighlightSlots(!highlightSlots)}
                            style={{
                                height: 36,
                                padding: '0 14px',
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
                            Подсветка полей: {highlightSlots ? 'ВКЛ' : 'ВЫКЛ'}
                        </button>
                    </div>
                </div>

                {/* Предпросмотр документа (для экрана и печати) */}
                <div
                    id="doc-print-area"
                    style={{
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        borderRadius: 24,
                        padding: '44px 40px',
                        border: '1px solid var(--border)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.03)',
                        fontFamily: selectedTemplate === 'yuss_buy_1' ? 'Arial, Helvetica, sans-serif' : 'Georgia, Cambria, "Times New Roman", serif',
                        fontSize: selectedTemplate === 'yuss_buy_1' ? 13 : 14,
                        lineHeight: selectedTemplate === 'yuss_buy_1' ? 1.6 : 1.8,
                        minHeight: 600,
                    }}
                >
                    <DocumentPreview template={selectedTemplate} data={generatorData} highlight={highlightSlots} />
                </div>
            </div>
        </div>
    );
}

/* ─── Интерактивный слот подстановки данных ──────────────────────────────── */

function Slot({ value, label, fallback, inputId, highlight = true }) {
    const hasVal = Boolean(value && String(value).trim());
    const displayVal = hasVal ? String(value) : (fallback || `[● Заполнить: ${label}]`);

    const handleClick = () => {
        if (inputId) {
            const el = document.getElementById(inputId);
            if (el) {
                el.focus();
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };

    if (!highlight) {
        return <span style={{ fontWeight: hasVal ? 'normal' : '600' }}>{displayVal}</span>;
    }

    if (hasVal) {
        return (
            <span
                className="doc-slot doc-slot-filled"
                title={`Поле из CRM: ${label}. Нажмите для редактирования.`}
                onClick={handleClick}
                style={{
                    backgroundColor: 'rgba(0, 102, 255, 0.08)',
                    color: '#0052cc',
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: 4,
                    borderBottom: '2px solid #0066ff',
                    margin: '0 2px',
                    cursor: inputId ? 'pointer' : 'default',
                    display: 'inline',
                    transition: 'all 0.15s ease-in-out',
                }}
            >
                {displayVal}
            </span>
        );
    }

    return (
        <span
            className="doc-slot doc-slot-empty"
            title={`Не заполнено: ${label}. Нажмите, чтобы ввести.`}
            onClick={handleClick}
            style={{
                backgroundColor: 'rgba(245, 158, 11, 0.14)',
                color: '#b45309',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: 4,
                border: '1.5px dashed #f59e0b',
                margin: '0 2px',
                cursor: inputId ? 'pointer' : 'default',
                display: 'inline',
            }}
        >
            {displayVal}
        </span>
    );
}

function toShortName(fullName) {
    if (!fullName) return '____________________';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]} ${parts[1][0]}.`;
    return `${parts[0]} ${parts[1][0]}.${parts[2][0]}.`;
}

function renderPassportDetails(person, highlight) {
    if (!person) return <Slot value="" label="Паспортные данные" fallback="________________________" highlight={highlight} />;
    const p = person.passport_details || {};
    const hasP = Boolean(p.series || p.number || p.issued_by || p.registration_address || person.reg_address);
    if (!hasP) return <Slot value="" label="Паспортные данные" fallback="________________________" highlight={highlight} />;
    
    return (
        <span>
            паспорт: серия <Slot value={p.series} label="Серия паспорта" inputId="doc-input-series" highlight={highlight} /> № <Slot value={p.number} label="Номер паспорта" inputId="doc-input-number" highlight={highlight} />
            {p.issued_by ? <>, выдан <Slot value={p.issued_by} label="Кем выдан" inputId="doc-input-issued-by" highlight={highlight} /></> : null}
            {p.unit_code ? <>, код подразделения <Slot value={p.unit_code} label="Код" inputId="doc-input-unit-code" highlight={highlight} /></> : null}
            {(p.registration_address || person.reg_address) ? <>, зарегистрирован: <Slot value={p.registration_address || person.reg_address} label="Адрес регистрации" inputId="doc-input-reg-address" highlight={highlight} /></> : null}
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

    const principal = buyer || seller;
    const pDetails = principal?.passport_details || {};
    const principalName = f(principal?.full_name);
    const principalBirth = principal?.birth_date ? fDate(principal.birth_date) : (pDetails.birth_date ? fDate(pDetails.birth_date) : '');
    const principalSeries = f(pDetails.series);
    const principalNumber = f(pDetails.number);
    const principalIssuedBy = f(pDetails.issued_by);
    const principalIssueDate = pDetails.issue_date ? fDate(pDetails.issue_date) : '';
    const principalUnitCode = f(pDetails.unit_code);
    const principalRegAddress = f(pDetails.registration_address || principal?.reg_address || principal?.address);
    const principalPhone = f(formatPhone(principal?.phone) || principal?.phone);
    const principalShort = toShortName(principalName);

    const rawCommission = deal?.commission || property?.commission;
    const cleanComm = rawCommission ? Number(String(rawCommission).replace(/\D/g, '')) : 0;
    const commFormatted = cleanComm > 0 ? cleanComm.toLocaleString('ru-RU') : '';
    const commWords = cleanComm > 0 ? `(${numberToWordsRu(cleanComm)})` : '';
    const rawEndDate = data.contractEndDate || deal?.contract_end_date;
    const contractEndDate = rawEndDate ? fDate(rawEndDate) : '';

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
                    <span>«<Slot value={today} label="Дата договора" highlight={highlight} />»</span>
                </div>

                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    Мы, <Slot value={principalName} label="ФИО Принципала" inputId="doc-input-full-name" highlight={highlight} />, 
                    дата рождения: <Slot value={principalBirth} label="Дата рождения" inputId="doc-input-birth-date" highlight={highlight} />, 
                    паспорт: серия <Slot value={principalSeries} label="Серия паспорта" inputId="doc-input-series" highlight={highlight} /> номер <Slot value={principalNumber} label="Номер паспорта" inputId="doc-input-number" highlight={highlight} />, 
                    выдан <Slot value={principalIssuedBy} label="Кем выдан паспорт" inputId="doc-input-issued-by" highlight={highlight} />, 
                    дата выдачи: <Slot value={principalIssueDate} label="Дата выдачи паспорта" inputId="doc-input-issue-date" highlight={highlight} />, 
                    код подразделения: <Slot value={principalUnitCode} label="Код подразделения" inputId="doc-input-unit-code" highlight={highlight} />, 
                    зарегистрированный(-ая) по адресу: <Slot value={principalRegAddress} label="Адрес регистрации" inputId="doc-input-reg-address" highlight={highlight} />, 
                    телефон: <Slot value={principalPhone} label="Телефон" inputId="doc-input-phone" highlight={highlight} />, 
                    именуемый(-ая) в дальнейшем «Принципал», с одной стороны,
                </p>

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
                    3.1. Размер вознаграждения Агента (Агентского вознаграждения) составляет: <Slot value={commFormatted} label="Вознаграждение (₽)" inputId="doc-input-commission" highlight={highlight} /> {commWords ? <Slot value={commWords} label="Сумма прописью" inputId="doc-input-commission" highlight={highlight} /> : ''} рублей, в том числе НДС 5 %.
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
                    5.1. Настоящий договор вступает в силу с момента его заключения Сторонами и действует до <Slot value={contractEndDate} label="Срок действия договора" inputId="doc-input-contract-end-date" fallback="«___» ________________ 202__ г." highlight={highlight} /> включительно, а в части расчетов между сторонами – до полного исполнения всех обязательств.
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
                    <div style={{ borderBottom: '1.5px solid #000', paddingBottom: 2, marginBottom: 16 }}>
                        <strong>Принципал:</strong>
                    </div>
                    <div style={{ borderBottom: '1.5px solid #000', height: 20, marginBottom: 16 }}></div>
                    <div style={{ borderBottom: '1.5px solid #000', height: 20, marginBottom: 28 }}></div>

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
                    <span>«<Slot value={dealDate || today} label="Дата сделки" highlight={highlight} />»</span>
                </div>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    Мы, нижеподписавшиеся:<br/>
                    Гр. <Slot value={sellerName} label="Продавец" highlight={highlight} />, {renderPassportDetails(seller, highlight)}, именуемый(ая) в дальнейшем «Продавец», с одной стороны, и<br/>
                    Гр. <Slot value={buyerName} label="Покупатель" highlight={highlight} />, {renderPassportDetails(buyer, highlight)}, именуемый(ая) в дальнейшем «Покупатель», с другой стороны,<br/>
                    при посредничестве Агентства недвижимости «<Slot value={agency} label="Агентство" highlight={highlight} />» в лице риелтора <Slot value={realtorName} label="Риелтор" highlight={highlight} />, заключили настоящий Договор о нижеследующем:
                </p>
                <div style={{ fontWeight: 'bold', marginTop: 16, marginBottom: 8 }}>1. ПРЕДМЕТ ДОГОВОРА</div>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    1.1. Продавец продает, а Покупатель покупает в собственность недвижимое имущество (далее – «Объект»):<br/>
                    Адрес: <Slot value={address} label="Адрес объекта" highlight={highlight} /><br/>
                    Общая площадь: <Slot value={area} label="Площадь" fallback="________ кв.м." highlight={highlight} />
                </p>
                <div style={{ fontWeight: 'bold', marginTop: 16, marginBottom: 8 }}>2. ЦЕНА И ПОРЯДОК РАСЧЕТОВ</div>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    2.1. Объект продается за цену в размере <Slot value={price} label="Стоимость" fallback="________________________" highlight={highlight} />.<br/>
                    2.2. Покупатель обязуется выплатить указанную сумму в течение ___ банковских дней с момента государственной регистрации перехода права собственности.
                </p>
                <div style={{ fontWeight: 'bold', marginTop: 16, marginBottom: 12 }}>3. ПОДПИСИ СТОРОН</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 12 }}>
                    <div>
                        <p style={{ fontWeight: 'bold', marginBottom: 4 }}>Продавец:</p>
                        <p style={{ marginBottom: 16 }}>____________________ / <Slot value={sellerName} label="Продавец" highlight={highlight} /> /</p>
                    </div>
                    <div>
                        <p style={{ fontWeight: 'bold', marginBottom: 4 }}>Покупатель:</p>
                        <p style={{ marginBottom: 16 }}>____________________ / <Slot value={buyerName} label="Покупатель" highlight={highlight} /> /</p>
                    </div>
                </div>
                <div style={{ marginTop: 12 }}>
                    <p style={{ fontWeight: 'bold', marginBottom: 4 }}>Риелтор:</p>
                    <p>____________________ / <Slot value={realtorName} label="Риелтор" highlight={highlight} /> /</p>
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
                    <span>«<Slot value={dealDate || today} label="Дата" highlight={highlight} />»</span>
                </div>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    Гр. <Slot value={sellerName} label="Наймодатель" highlight={highlight} />, {renderPassportDetails(seller, highlight)}, именуемый(ая) в дальнейшем «Наймодатель», с одной стороны, и<br/>
                    Гр. <Slot value={buyerName} label="Наниматель" highlight={highlight} />, {renderPassportDetails(buyer, highlight)}, именуемый(ая) в дальнейшем «Наниматель», с другой стороны,<br/>
                    при содействии риелтора <Slot value={realtorName} label="Риелтор" highlight={highlight} /> (Агентство недвижимости «<Slot value={agency} label="Агентство" highlight={highlight} />»), заключили настоящий Договор о нижеследующем:
                </p>
                <div style={{ fontWeight: 'bold', marginTop: 16, marginBottom: 8 }}>1. ПРЕДМЕТ ДОГОВОРА</div>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    1.1. Наймодатель предоставляет Нанимателю за плату во владение и пользование жилое помещение по адресу: <Slot value={address} label="Адрес объекта" highlight={highlight} />.
                </p>
                <div style={{ fontWeight: 'bold', marginTop: 16, marginBottom: 8 }}>2. АРЕНДНАЯ ПЛАТА</div>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    2.1. Ежемесячная плата за пользование помещением составляет <Slot value={price} label="Арендная плата" fallback="________________________" highlight={highlight} />.<br/>
                    2.2. Арендная плата вносится ежемесячно не позднее ___ числа каждого месяца.
                </p>
                <div style={{ fontWeight: 'bold', marginTop: 16, marginBottom: 12 }}>3. ПОДПИСИ СТОРОН</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 12 }}>
                    <div>
                        <p style={{ fontWeight: 'bold', marginBottom: 4 }}>Наймодатель:</p>
                        <p style={{ marginBottom: 16 }}>____________________ / <Slot value={sellerName} label="Наймодатель" highlight={highlight} /> /</p>
                    </div>
                    <div>
                        <p style={{ fontWeight: 'bold', marginBottom: 4 }}>Наниматель:</p>
                        <p style={{ marginBottom: 16 }}>____________________ / <Slot value={buyerName} label="Наниматель" highlight={highlight} /> /</p>
                    </div>
                </div>
                <div style={{ marginTop: 12 }}>
                    <p style={{ fontWeight: 'bold', marginBottom: 4 }}>Риелтор:</p>
                    <p>____________________ / <Slot value={realtorName} label="Риелтор" highlight={highlight} /> /</p>
                </div>
            </div>
        );
    }

    /* ── Шаблон: Акт приема-передачи ───────────────────────────────────────── */
    if (template === 'act') {
        return (
            <div>
                <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: 16, marginBottom: 16, textTransform: 'uppercase' }}>
                    АКТ ПРИЕМА-ПЕРЕДАЧИ ОБЪЕКТА НЕДВИЖИМОСТИ
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <span>г. Киров</span>
                    <span>«<Slot value={fDate(deal?.handover_date || deal?.deal_date) || today} label="Дата акта" highlight={highlight} />»</span>
                </div>
                <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                    Мы, нижеподписавшиеся, Гр. <Slot value={sellerName} label="Передал" highlight={highlight} />, с одной стороны,<br/>
                    и Гр. <Slot value={buyerName} label="Принял" highlight={highlight} />, с другой стороны, составили настоящий Акт о том, что в соответствии с Договором от «<Slot value={dealDate || today} label="Дата договора" highlight={highlight} />»:
                </p>
                <div style={{ fontWeight: 'bold', marginTop: 16, marginBottom: 8 }}>1. ПРЕДМЕТ АКТА</div>
                <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                    1.1. Продавец/Наймодатель передал, а Покупатель/Наниматель принял недвижимое имущество по адресу: <Slot value={address} label="Адрес объекта" highlight={highlight} />.<br/>
                    1.2. Состояние имущества соответствует условиям договора. Стороны претензий друг к другу не имеют.<br/>
                    1.3. Передачу осуществил в присутствии риелтора <Slot value={realtorName} label="Риелтор" highlight={highlight} /> (Агентство «<Slot value={agency} label="Агентство" highlight={highlight} />»).
                </p>
                <div style={{ fontWeight: 'bold', marginTop: 16, marginBottom: 12 }}>ПОДПИСИ СТОРОН</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 12 }}>
                    <div>
                        <p style={{ fontWeight: 'bold', marginBottom: 4 }}>Передал:</p>
                        <p style={{ marginBottom: 16 }}>____________________ / <Slot value={sellerName} label="Передал" highlight={highlight} /> /</p>
                    </div>
                    <div>
                        <p style={{ fontWeight: 'bold', marginBottom: 4 }}>Принял:</p>
                        <p style={{ marginBottom: 16 }}>____________________ / <Slot value={buyerName} label="Принял" highlight={highlight} /> /</p>
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
                <span>«<Slot value={today} label="Дата" highlight={highlight} />»</span>
            </div>
            <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                Гр. <Slot value={sellerName || principalName} label="Принципал" highlight={highlight} />, {renderPassportDetails(seller || principal, highlight)}, именуемый(ая) в дальнейшем «Принципал», с одной стороны, и<br/>
                Агентство недвижимости «<Slot value={agency} label="Агентство" highlight={highlight} />» в лице риелтора <Slot value={realtorName} label="Риелтор" highlight={highlight} />, именуемое в дальнейшем «Агент», с другой стороны, заключили настоящий Договор о нижеследующем:
            </p>
            <div style={{ fontWeight: 'bold', marginTop: 16, marginBottom: 8 }}>1. ПРЕДМЕТ ДОГОВОРА</div>
            <p style={{ textIndent: '2.5em', marginBottom: 8, textAlign: 'justify' }}>
                1.1. Принципал поручает, а Агент принимает на себя обязательство совершать от имени и за счёт Принципала юридические и фактические действия по поиску, подбору и оформлению объекта недвижимости.
            </p>
            <div style={{ fontWeight: 'bold', marginTop: 16, marginBottom: 8 }}>2. ВОЗНАГРАЖДЕНИЕ</div>
            <p style={{ textIndent: '2.5em', marginBottom: 14, textAlign: 'justify' }}>
                2.1. Размер агентского вознаграждения составляет: <Slot value={commFormatted ? `${commFormatted} ₽` : ''} label="Размер вознаграждения" fallback="________________________ рублей" highlight={highlight} />.
            </p>
            <div style={{ fontWeight: 'bold', marginTop: 16, marginBottom: 12 }}>3. ПОДПИСИ СТОРОН</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 12 }}>
                <div>
                    <p style={{ fontWeight: 'bold', marginBottom: 4 }}>Принципал:</p>
                    <p style={{ marginBottom: 16 }}>____________________ / <Slot value={sellerName || principalName} label="Принципал" highlight={highlight} /> /</p>
                </div>
                <div>
                    <p style={{ fontWeight: 'bold', marginBottom: 4 }}>Агент:</p>
                    <p style={{ marginBottom: 16 }}>____________________ / <Slot value={realtorName} label="Риелтор" highlight={highlight} /> /</p>
                </div>
            </div>
        </div>
    );
}

export default DocumentsPage;
