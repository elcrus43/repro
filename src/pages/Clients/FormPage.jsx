import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { formatPhone, stripPhone, formatPassportDisplay, parsePassportInput } from '../../utils/format';
import { findDuplicateClients } from '../../utils/clientDuplicate';
import { FormCard } from '../../components/FormCard';
import { PassportScanModal } from '../../components/PassportScanModal';
import { CLIENT_SOURCES, CLIENT_TYPES } from '../../data/constants';
import { User, Phone, Mail, FileText, Share2, Activity, ShieldCheck, ChevronDown, ChevronUp, X, Plus, AlertTriangle, Camera, Landmark, Loader2, CheckCircle2, Cake, Calendar, Building2, Search, UserCheck, Link2, Unlink2 } from 'lucide-react';

const DADATA_TOKEN = import.meta.env.VITE_DADATA_TOKEN;

const defaultCompanyDetails = {
    name: '',
    short_name: '',
    inn: '',
    kpp: '',
    ogrn: '',
    legal_address: '',
    actual_address: '',
    director_name: '',
    director_position: 'Генеральный директор'
};

const defaultAuthorizedPerson = {
    client_id: null,
    name: '',
    phone: '',
    email: '',
    position: 'Генеральный директор',
    basis_document: 'Устав'
};

const defaultClient = {
    full_name: '', phone: '', email: '', inn: '', birth_date: '', reg_address: '',
    client_types: ['buyer'], additional_contacts: [], source: '', status: 'new', notes: '',
    agency_contract_date: '', agency_contract_property_id: '', has_agency_contract: false,
    passport_details: { series: '', number: '', issued_by: '', unit_code: '', issue_date: '', registration_address: '', inn: '', birth_date: '', snils: '' },
    bank_details: { bank_name: '', bik: '', account: '', corr_account: '', inn: '', kpp: '', beneficiary: '' },
    company_details: defaultCompanyDetails,
    authorized_person: defaultAuthorizedPerson,
    authorized_person_id: null
};

export function FormPage() {
    const { state, dispatch } = useApp();
    const { toast } = useToastContext();
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const prefill = location?.state?.prefill || null;
    const existing = id ? state.clients.find(c => c.id === id) : null;
    
    const formatPhones = (phones) => (phones || []).map(p => formatPhone(p, true));
    const initialPhones = existing?.phones 
        ? formatPhones(existing.phones) 
        : (existing?.phone ? [formatPhone(existing.phone, true)] : ['']);

    const initialForm = existing ? {
        ...existing,
        inn: existing.inn || existing.company_details?.inn || existing.passport_details?.inn || '',
        birth_date: existing.birth_date || existing.passport_details?.birth_date || '',
        reg_address: existing.reg_address || existing.company_details?.legal_address || existing.passport_details?.registration_address || '',
        agency_contract_date: existing.agency_contract_date ? existing.agency_contract_date.split('T')[0] : '',
        agency_contract_property_id: existing.agency_contract_property_id || '',
        has_agency_contract: existing.has_agency_contract || Boolean(existing.agency_contract_date),
        phones: initialPhones,
        passport_details: existing.passport_details || defaultClient.passport_details,
        bank_details: existing.bank_details || existing.passport_details?.bank_details || defaultClient.bank_details,
        company_details: existing.company_details || defaultClient.company_details,
        authorized_person: existing.authorized_person || defaultClient.authorized_person,
        authorized_person_id: existing.authorized_person_id || existing.authorized_person?.client_id || null
    } : {
        ...defaultClient,
        realtor_id: state.currentUser?.id,
        // Apply EGRN prefill if navigated from EgrnScanModal
        ...(prefill ? {
            full_name: prefill.full_name || '',
            inn: prefill.inn || '',
            client_types: prefill.client_types || ['buyer'],
            passport_details: { ...defaultClient.passport_details, ...(prefill.passport_details || {}) },
            notes: prefill.source_note || '',
        } : {}),
    };

    const [form, setForm] = useState(initialForm);
    const [showPassport, setShowPassport] = useState(!!(form.passport_details?.series || form.inn || form.birth_date || prefill?.passport_details?.series));
    const [showPassportScan, setShowPassportScan] = useState(false);
    const [showBank, setShowBank] = useState(!!(form.bank_details?.bik || form.bank_details?.account || existing?.passport_details?.bank_details?.bik));
    const [bankLoading, setBankLoading] = useState(false);
    const [bankFound, setBankFound] = useState(false);
    const [duplicateModalMatch, setDuplicateModalMatch] = useState(null);
    const bikTimerRef = useRef(null);

    // Состояние для юридического лица
    const isLegalEntity = form.client_types?.includes('legal_entity');
    const [companySearchQuery, setCompanySearchQuery] = useState('');
    const [companyLoading, setCompanyLoading] = useState(false);
    const [companyFound, setCompanyFound] = useState(false);
    const [authPersonMode, setAuthPersonMode] = useState(form.authorized_person_id ? 'select' : 'manual');
    const [authPersonSearch, setAuthPersonSearch] = useState('');
    const [createAuthPersonAsClient, setCreateAuthPersonAsClient] = useState(true);

    // Если данные клиента подгрузились асинхронно после маунта формы
    useEffect(() => {
        if (existing && (!form.id || form.id !== existing.id)) {
            setForm({
                ...existing,
                inn: existing.inn || existing.company_details?.inn || existing.passport_details?.inn || '',
                birth_date: existing.birth_date || existing.passport_details?.birth_date || '',
                reg_address: existing.reg_address || existing.company_details?.legal_address || existing.passport_details?.registration_address || '',
                agency_contract_date: existing.agency_contract_date ? existing.agency_contract_date.split('T')[0] : '',
                agency_contract_property_id: existing.agency_contract_property_id || '',
                has_agency_contract: existing.has_agency_contract || Boolean(existing.agency_contract_date),
                phones: existing.phones ? formatPhones(existing.phones) : (existing.phone ? [formatPhone(existing.phone, true)] : ['']),
                passport_details: existing.passport_details || defaultClient.passport_details,
                bank_details: existing.bank_details || existing.passport_details?.bank_details || defaultClient.bank_details,
                company_details: existing.company_details || defaultClient.company_details,
                authorized_person: existing.authorized_person || defaultClient.authorized_person,
                authorized_person_id: existing.authorized_person_id || existing.authorized_person?.client_id || null
            });
            setShowPassport(!!(existing.passport_details?.series || existing.inn || existing.birth_date));
            setShowBank(!!(existing.bank_details?.bik || existing.bank_details?.account || existing.passport_details?.bank_details?.bik));
            if (existing.authorized_person_id || existing.authorized_person?.client_id) {
                setAuthPersonMode('select');
            }
        }
    }, [existing]);

    function setF(key, val) { setForm(f => ({ ...f, [key]: val })); }

    // Автозаполнение формы данными из OCR сканирования паспорта
    function handlePassportExtracted(data) {
        if (data.full_name) setF('full_name', data.full_name);
        if (data.birth_date) {
            setF('birth_date', data.birth_date);
            setPassport('birth_date', data.birth_date);
        }
        if (data.series) setPassport('series', data.series);
        if (data.number) setPassport('number', data.number);
        if (data.unit_code) setPassport('unit_code', data.unit_code);
        setShowPassport(true);
    }

    function setPassport(key, val) {
        setForm(f => ({
            ...f,
            passport_details: { ...(f.passport_details || defaultClient.passport_details), [key]: val }
        }));
    }

    // Маска СНИЛС: XXX-XXX-XXX XX
    function handleSnilsChange(raw) {
        const digits = raw.replace(/\D/g, '').slice(0, 11);
        let masked = '';
        if (digits.length <= 3) masked = digits;
        else if (digits.length <= 6) masked = digits.slice(0, 3) + '-' + digits.slice(3);
        else if (digits.length <= 9) masked = digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6);
        else masked = digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6, 9) + ' ' + digits.slice(9);
        setPassport('snils', masked);
    }

    // Маска кода подразделения: XXX-XXX
    function handleUnitCodeChange(raw) {
        const digits = raw.replace(/\D/g, '').slice(0, 6);
        const masked = digits.length <= 3 ? digits : digits.slice(0, 3) + '-' + digits.slice(3);
        setPassport('unit_code', masked);
    }

    // ── Банковские реквизиты ──────────────────────────────────────────────
    function setBank(key, val) {
        setForm(f => ({
            ...f,
            bank_details: { ...(f.bank_details || {}), [key]: val }
        }));
    }

    // БИК: 9 цифр + автоподгрузка реквизитов через DaData
    const fetchBankByBik = useCallback(async (bik) => {
        if (!DADATA_TOKEN || bik.length !== 9) return;
        setBankLoading(true);
        setBankFound(false);
        try {
            const res = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/bank', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Token ${DADATA_TOKEN}`,
                },
                body: JSON.stringify({ query: bik }),
            });
            if (!res.ok) throw new Error(`DaData: ${res.status}`);
            const json = await res.json();
            const s = json.suggestions?.[0];
            if (!s) return;
            const d = s.data || {};

            // Форматируем к/с группами по 5
            const formatAcc = (acc) => {
                if (!acc) return '';
                const digits = acc.replace(/\D/g, '').slice(0, 20);
                const parts = [];
                for (let i = 0; i < digits.length; i += 5) parts.push(digits.slice(i, i + 5));
                return parts.join(' ');
            };

            setForm(f => ({
                ...f,
                bank_details: {
                    ...(f.bank_details || {}),
                    bank_name:    s.value || f.bank_details?.bank_name || '',
                    inn:          d.inn   || f.bank_details?.inn || '',
                    kpp:          d.kpp   || f.bank_details?.kpp || '',
                    corr_account: formatAcc(d.correspondent_account) || f.bank_details?.corr_account || '',
                }
            }));
            setBankFound(true);
            toast.success(`Банк найден: ${s.value}`);
        } catch (err) {
            console.warn('[BIK lookup]', err.message);
            toast.error('Не удалось найти банк по БИК');
        } finally {
            setBankLoading(false);
        }
    }, [toast]);

    function handleBikChange(raw) {
        const digits = raw.replace(/\D/g, '').slice(0, 9);
        setBank('bik', digits);
        setBankFound(false);
        // Запускаем автоподгрузку как только введено 9 цифр
        if (digits.length === 9) {
            clearTimeout(bikTimerRef.current);
            bikTimerRef.current = setTimeout(() => fetchBankByBik(digits), 300);
        }
    }

    // Счёт: 20 цифр, группы по 5 через пробел → XXXXX XXXXX XXXXX XXXXX
    function handleAccountChange(key, raw) {
        const digits = raw.replace(/\D/g, '').slice(0, 20);
        const parts = [];
        for (let i = 0; i < digits.length; i += 5) parts.push(digits.slice(i, i + 5));
        setBank(key, parts.join(' '));
    }

    // ИНН банка: 10 цифр
    function handleBankInnChange(raw) {
        setBank('inn', raw.replace(/\D/g, '').slice(0, 10));
    }

    // КПП: 9 цифр
    function handleKppChange(raw) {
        setBank('kpp', raw.replace(/\D/g, '').slice(0, 9));
    }

    // ── Юридическое лицо & Уполномоченное лицо ──────────────────────────
    function setCompany(key, val) {
        setForm(f => ({
            ...f,
            company_details: { ...(f.company_details || defaultCompanyDetails), [key]: val }
        }));
    }

    function setAuthPerson(key, val) {
        setForm(f => ({
            ...f,
            authorized_person: { ...(f.authorized_person || defaultAuthorizedPerson), [key]: val }
        }));
    }

    const fetchCompanyByInn = useCallback(async (query) => {
        const clean = (query || '').trim();
        if (!DADATA_TOKEN || clean.length < 5) {
            toast.error('Введите минимум 5 цифр ИНН или ОГРН');
            return;
        }
        setCompanyLoading(true);
        setCompanyFound(false);
        try {
            const res = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    Authorization: `Token ${DADATA_TOKEN}`,
                },
                body: JSON.stringify({ query: clean }),
            });
            if (!res.ok) throw new Error(`DaData: ${res.status}`);
            const json = await res.json();
            const s = json.suggestions?.[0];
            if (!s) {
                toast.error('Организация не найдена по ИНН/ОГРН');
                return;
            }
            const d = s.data || {};
            const shortName = d.name?.short_with_opf || s.value || '';
            const fullName = d.name?.full_with_opf || s.unrestricted_value || s.value || '';
            const legalAddress = d.address?.value || '';
            const inn = d.inn || '';
            const kpp = d.kpp || '';
            const ogrn = d.ogrn || '';
            const directorName = d.management?.name || '';
            const directorPost = d.management?.post || 'Генеральный директор';

            setForm(f => {
                const updatedComp = {
                    ...(f.company_details || defaultCompanyDetails),
                    name: fullName,
                    short_name: shortName,
                    inn,
                    kpp,
                    ogrn,
                    legal_address: legalAddress,
                    actual_address: f.company_details?.actual_address || legalAddress,
                    director_name: directorName,
                    director_position: directorPost
                };
                const updatedAuth = {
                    ...(f.authorized_person || defaultAuthorizedPerson),
                    name: (f.authorized_person?.name && f.authorized_person.name !== defaultAuthorizedPerson.name) ? f.authorized_person.name : directorName,
                    position: (f.authorized_person?.position && f.authorized_person.position !== defaultAuthorizedPerson.position) ? f.authorized_person.position : directorPost,
                    basis_document: f.authorized_person?.basis_document || 'Устав'
                };
                return {
                    ...f,
                    full_name: (!f.full_name || f.full_name === defaultClient.full_name) ? shortName : f.full_name,
                    inn: inn || f.inn,
                    reg_address: legalAddress || f.reg_address,
                    company_details: updatedComp,
                    authorized_person: updatedAuth
                };
            });
            setCompanyFound(true);
            toast.success(`Найдено: ${shortName}`);
        } catch (err) {
            console.warn('[Company lookup]', err.message);
            toast.error('Не удалось найти организацию');
        } finally {
            setCompanyLoading(false);
        }
    }, [toast]);

    function handleSelectAuthPerson(client) {
        if (!client) return;
        setForm(f => ({
            ...f,
            authorized_person_id: client.id,
            authorized_person: {
                ...(f.authorized_person || defaultAuthorizedPerson),
                client_id: client.id,
                name: client.full_name,
                phone: client.phone || '',
                email: client.email || '',
                position: f.authorized_person?.position || 'Генеральный директор',
                basis_document: f.authorized_person?.basis_document || 'Устав'
            }
        }));
        setAuthPersonMode('select');
        toast.success(`Выбрано уполномоченное лицо: ${client.full_name}`);
    }

    function handleClearAuthPerson() {
        setForm(f => ({
            ...f,
            authorized_person_id: null,
            authorized_person: {
                ...defaultAuthorizedPerson,
                name: '',
                phone: '',
                email: ''
            }
        }));
        setAuthPersonMode('manual');
    }

    const physicalClients = useMemo(() => {
        return (state.clients || []).filter(c => {
            if (c.id === id) return false;
            const types = Array.isArray(c.client_types) ? c.client_types : (c.client_type ? [c.client_type] : []);
            return !types.every(t => t === 'legal_entity');
        });
    }, [state.clients, id]);

    const filteredAuthClients = useMemo(() => {
        if (!authPersonSearch.trim()) return physicalClients.slice(0, 10);
        const q = authPersonSearch.toLowerCase();
        return physicalClients.filter(c => 
            c.full_name?.toLowerCase().includes(q) || 
            c.phone?.includes(q) || 
            c.email?.toLowerCase().includes(q)
        ).slice(0, 10);
    }, [physicalClients, authPersonSearch]);

    const selectedAuthClient = useMemo(() => {
        const cid = form.authorized_person_id || form.authorized_person?.client_id;
        if (!cid) return null;
        return state.clients?.find(c => c.id === cid) || null;
    }, [state.clients, form.authorized_person_id, form.authorized_person?.client_id]);

    function buildClientPayload(targetId = id, customAuthPersonId = null) {
        const phones = (form.phones || [form.phone || '']).map(p => stripPhone(p)).filter(Boolean);
        
        // Синхронизация верхнеуровневых полей с паспортом / компанией
        const pDetails = form.passport_details || {};
        const passportStr = (pDetails.series && pDetails.number) 
            ? `${pDetails.series} ${pDetails.number}` 
            : (form.passport || '');
        const birthDateStr = form.birth_date || pDetails.birth_date || '';
        const innStr = form.inn || form.company_details?.inn || pDetails.inn || '';
        const regAddressStr = form.reg_address || form.company_details?.legal_address || pDetails.registration_address || '';
        const contractDateStr = form.agency_contract_date && form.agency_contract_date.trim()
            ? (form.agency_contract_date.includes('T') ? form.agency_contract_date : `${form.agency_contract_date}T00:00:00.000Z`) 
            : null;

        const effectiveAuthId = customAuthPersonId !== null ? customAuthPersonId : (form.authorized_person_id || form.authorized_person?.client_id || null);
        const effectiveAuthPerson = {
            ...(form.authorized_person || defaultAuthorizedPerson),
            client_id: effectiveAuthId
        };

        return {
            ...form,
            id: targetId || undefined,
            phone: phones[0] || '',
            phones: phones.length > 1 ? phones : undefined,
            inn: innStr,
            birth_date: birthDateStr,
            passport: passportStr,
            reg_address: regAddressStr,
            agency_contract_date: contractDateStr,
            agency_contract_property_id: (form.agency_contract_property_id && String(form.agency_contract_property_id).trim()) ? form.agency_contract_property_id : null,
            has_agency_contract: Boolean(contractDateStr || form.has_agency_contract),
            company_details: form.company_details || defaultCompanyDetails,
            authorized_person: effectiveAuthPerson,
            authorized_person_id: effectiveAuthId,
            passport_details: {
                ...pDetails,
                inn: innStr,
                birth_date: birthDateStr,
                registration_address: regAddressStr,
                bank_details: form.bank_details || pDetails.bank_details || undefined
            },
            additional_contacts: (form.additional_contacts || []).map(c => ({
                ...c,
                phone: stripPhone(c.phone)
            }))
        };
    }

    async function ensureRepresentativeCreated() {
        let authId = form.authorized_person_id || form.authorized_person?.client_id || null;
        if (isLegalEntity && createAuthPersonAsClient && !authId && form.authorized_person?.name?.trim()) {
            try {
                const repPhone = stripPhone(form.authorized_person.phone || '');
                const repName = form.authorized_person.name.trim();
                const newPerson = {
                    full_name: repName,
                    phone: repPhone || (form.phone ? stripPhone(form.phone) : ''),
                    email: form.authorized_person.email?.trim() || null,
                    client_types: ['buyer'],
                    source: form.source || 'Уполномоченное лицо юрлица',
                    status: 'active',
                    notes: `Уполномоченное лицо организации «${form.company_details?.short_name || form.full_name}» (${form.authorized_person.position || 'Представитель'}). Основание: ${form.authorized_person.basis_document || 'Устав'}`
                };
                const createdPerson = await dispatch({ type: 'ADD_CLIENT', client: newPerson });
                if (createdPerson && createdPerson.id) {
                    authId = createdPerson.id;
                    toast.success(`Создана карточка физлица для представителя: ${repName}`);
                }
            } catch (err) {
                console.warn('[Auto-create auth person error]', err);
            }
        }
        return authId;
    }

    async function handleReplaceExisting(targetClient) {
        try {
            const authId = await ensureRepresentativeCreated();
            const clientPayload = buildClientPayload(targetClient.id, authId);
            const merged = {
                ...targetClient,
                ...clientPayload,
                id: targetClient.id,
                updated_at: new Date().toISOString()
            };
            const ok = await dispatch({ type: 'UPDATE_CLIENT', client: merged });
            if (ok !== false) {
                toast.success(`Данные контакта «${targetClient.full_name || 'Без имени'}» заменены на новые`);
                navigate(`/clients/${targetClient.id}`);
            }
        } catch (err) {
            console.error('[Client handleReplaceExisting error]', err);
            toast.error(`Ошибка при замене данных: ${err.message || 'Проверьте данные'}`);
        }
    }

    async function saveNewClient() {
        try {
            const authId = await ensureRepresentativeCreated();
            const client = buildClientPayload(undefined, authId);
            const ok = await dispatch({ type: 'ADD_CLIENT', client: { ...client, realtor_id: state.currentUser?.id } });
            if (ok !== false) {
                toast.success('Клиент создан');
                const returnTo = searchParams.get('returnTo');
                if (returnTo) navigate(returnTo);
                else navigate('/clients');
            }
        } catch (err) {
            console.error('[Client saveNewClient error]', err);
            toast.error(`Ошибка создания клиента: ${err.message || 'Проверьте данные'}`);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            if (id) {
                const authId = await ensureRepresentativeCreated();
                const client = buildClientPayload(id, authId);
                const ok = await dispatch({ type: 'UPDATE_CLIENT', client: { ...client, id } });
                if (ok !== false) {
                    toast.success('Клиент сохранён');
                    navigate(`/clients/${id}`);
                }
            } else {
                // Check for phone duplicate before creating
                const dups = findDuplicateClients(
                    (state.clients || []).filter(c => c.id !== id),
                    { full_name: form.full_name, phone: form.phone, phones: form.phones }
                );
                if (dups.phoneMatches.length > 0) {
                    setDuplicateModalMatch(dups.phoneMatches[0]);
                    return;
                }
                await saveNewClient();
            }
        } catch (err) {
            console.error('[Client handleSubmit error]', err);
            toast.error(`Ошибка сохранения: ${err.message || 'Проверьте данные'}`);
        }
    }

    const sources = CLIENT_SOURCES;
    const clientTypes = CLIENT_TYPES;

    const toggleType = (typeId) => {
        const types = form.client_types || [];
        if (types.includes(typeId)) setF('client_types', types.filter(t => t !== typeId));
        else setF('client_types', [...types, typeId]);
    };

    const addContact = () => setF('additional_contacts', [...(form.additional_contacts || []), { name: '', phone: '', email: '' }]);
    const updateContact = (idx, field, val) => {
        const contacts = [...(form.additional_contacts || [])];
        contacts[idx] = { ...contacts[idx], [field]: val };
        setF('additional_contacts', contacts);
    };
    const removeContact = (idx) => setF('additional_contacts', form.additional_contacts.filter((_, i) => i !== idx));

    return (
        <div className="page fade-in" style={{ paddingBottom: 120 }}>
            <div className="topbar" style={{ background: 'var(--topbar-bg)', backdropFilter: 'blur(20px) saturate(180%)' }}>
                <button className="topbar-back" onClick={() => navigate(id ? `/clients/${id}` : '/clients')} style={{ borderRadius: 14 }}>←</button>
                <span className="topbar-title font-oswald" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>{id ? 'Редактировать клиента' : 'Новый контакт'}</span>
            </div>

            <form className="page-content" style={{ padding: '0 0 120px', display: 'flex', flexDirection: 'column', gap: 16 }} onSubmit={handleSubmit}>
                <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <FormCard 
                        title="Основная информация"
                        action={
                            <button
                                type="button"
                                onClick={() => setShowPassportScan(true)}
                                className="card-clickable"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '6px 12px',
                                    borderRadius: 12,
                                    border: '1px solid rgba(0, 82, 255, 0.2)',
                                    background: 'rgba(0, 82, 255, 0.06)',
                                    color: 'var(--primary, #0052ff)',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                }}
                                title="Автозаполнение по фото паспорта"
                            >
                                <Camera size={14} />
                                <span>Сканировать паспорт</span>
                            </button>
                        }
                    >

                        <div className="form-group">
                            <label className="form-label">{isLegalEntity ? 'Наименование организации' : 'ФИО клиента'}</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                                    {isLegalEntity ? <Building2 size={18} /> : <User size={18} />}
                                </span>
                                <input 
                                    className="form-input" 
                                    style={{ paddingLeft: 46, height: 54, borderRadius: 16, background: 'var(--bg-light)', border: 'none', fontWeight: 300 }} 
                                    value={form.full_name} 
                                    onChange={e => setF('full_name', e.target.value)} 
                                    required 
                                    placeholder={isLegalEntity ? 'ООО «Альфа» или ИП Иванов И.И.' : 'Иванов Иван Иванович'} 
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Телефоны</label>
                            {(form.phones || [form.phone || '']).map((p, idx) => (
                                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', zIndex: 1 }}><Phone size={18} /></span>
                                    <input 
                                        type="tel"
                                        inputMode="tel"
                                        className="form-input" 
                                        style={{ paddingLeft: 46, height: 54, borderRadius: 16, background: 'var(--bg-light)', border: 'none', fontWeight: 300 }} 
                                        value={p || ''} 
                                        onChange={e => {
                                            const raw = e.target.value;
                                            const formatted = formatPhone(raw, true);
                                            const phones = [...(form.phones || [form.phone || ''])];
                                            phones[idx] = formatted;
                                            setF('phones', phones);
                                        }} 
                                        placeholder="+7 (___) ___-__-__" 
                                    />
                                    {idx > 0 && (
                                        <button type="button" className="card-clickable" style={{ width: 54, height: 54, borderRadius: 16, background: 'var(--danger-light)', color: 'var(--danger)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => {
                                            const phones = (form.phones || [form.phone || '']).filter((_, i) => i !== idx);
                                            setF('phones', phones.length > 0 ? phones : ['']);
                                        }}><X size={20} /></button>
                                    )}
                                </div>
                            ))}
                            <button type="button" className="form-add-btn btn btn-secondary card-clickable" style={{ height: 44, borderRadius: 14, fontSize: 13, borderStyle: 'dashed' }} onClick={() => {
                                const phones = form.phones || [form.phone || ''];
                                setF('phones', [...phones, '']);
                            }}><Plus size={16} /> Добавить телефон</button>
                        </div>

                        {(() => {
                            const dups = !id ? findDuplicateClients(
                                (state.clients || []).filter(c => c.id !== id),
                                { full_name: form.full_name, phone: form.phone, phones: form.phones }
                            ) : { phoneMatches: [], nameMatches: [] };
                            const matches = [...dups.phoneMatches, ...dups.nameMatches];

                            if (matches.length === 0) return null;
                            return (
                                <div style={{ padding: 14, borderRadius: 16, background: '#FFFBEB', border: '1px solid #F59E0B', marginTop: 12 }}>
                                    <div style={{ fontWeight: 600, color: '#B45309', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                                        <AlertTriangle size={18} /> Найдено совпадение в базе ({matches.length}):
                                    </div>
                                    {matches.slice(0, 3).map(m => (
                                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 8, padding: '10px 12px', background: 'white', borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)' }}>
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.full_name || 'Без имени'}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.phone || 'Без телефона'}</div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                                <button
                                                    type="button"
                                                    className="btn btn-primary card-clickable"
                                                    style={{ fontSize: 12, padding: '6px 12px', height: 36, borderRadius: 10, background: 'var(--primary)', color: 'white', whiteSpace: 'nowrap' }}
                                                    onClick={() => handleReplaceExisting(m)}
                                                    title="Заменить данные этого контакта на введенные в форме"
                                                >
                                                    Заменить на новый
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-secondary card-clickable"
                                                    style={{ fontSize: 12, padding: '6px 12px', height: 36, borderRadius: 10, whiteSpace: 'nowrap' }}
                                                    onClick={() => navigate(`/clients/${m.id}`)}
                                                >
                                                    Открыть
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}

                        <div className="form-group">
                            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Cake size={14} color="var(--text-muted)" />
                                Дата рождения
                                {(() => {
                                    const bd = form.birth_date || form.passport_details?.birth_date;
                                    if (!bd) return null;
                                    const today = new Date();
                                    const bDate = new Date(bd);
                                    const age = today.getFullYear() - bDate.getFullYear() - (
                                        today.getMonth() < bDate.getMonth() ||
                                        (today.getMonth() === bDate.getMonth() && today.getDate() < bDate.getDate()) ? 1 : 0
                                    );
                                    const thisYear = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
                                    const diff = Math.round((thisYear - today) / (1000 * 60 * 60 * 24));
                                    const isToday = diff === 0;
                                    const isSoon = diff > 0 && diff <= 7;
                                    return (
                                        <span style={{
                                            marginLeft: 4, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
                                            background: isToday ? '#fef3c7' : isSoon ? '#eff6ff' : 'var(--bg-light)',
                                            color: isToday ? '#d97706' : isSoon ? '#2563eb' : 'var(--text-muted)'
                                        }}>
                                            {isToday ? '🎂 Сегодня!' : isSoon ? `через ${diff} дн.` : `${age} лет`}
                                        </span>
                                    );
                                })()}
                            </label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}><Cake size={18} /></span>
                                <input
                                    type="date"
                                    className="form-input"
                                    style={{ paddingLeft: 46, height: 54, borderRadius: 16, background: 'var(--bg-light)', border: 'none', fontWeight: 300 }}
                                    value={form.birth_date || form.passport_details?.birth_date || ''}
                                    onChange={e => { setF('birth_date', e.target.value); setPassport('birth_date', e.target.value); }}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Типы клиента</label>
                            <div className="chip-group" style={{ gap: 8 }}>
                                {clientTypes.map(t => (
                                    <button key={t.id} type="button"
                                        className={`chip ${form.client_types?.includes(t.id) ? 'active' : ''}`}
                                        onClick={() => toggleType(t.id)}
                                    >
                                        {t.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </FormCard>

                    {/* ── Секция для Юридического Лица ── */}
                    {isLegalEntity && (
                        <>
                            <FormCard 
                                title="Реквизиты юридического лица"
                                action={
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#0284c7', background: 'rgba(2, 132, 199, 0.08)', padding: '4px 10px', borderRadius: 8, fontWeight: 600 }}>
                                        <Building2 size={14} /> Юр. лицо
                                    </div>
                                }
                            >
                                {/* Быстрый поиск в DaData по ИНН / ОГРН */}
                                <div style={{ background: 'var(--bg-light)', padding: 16, borderRadius: 20, marginBottom: 16 }}>
                                    <label className="form-label" style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Search size={14} color="#0284c7" />
                                        Автозаполнение по ИНН или ОГРН (DaData)
                                    </label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input 
                                            type="text"
                                            className="form-input"
                                            style={{ height: 46, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 13 }}
                                            placeholder="Введите ИНН (10 или 12 цифр) или ОГРН"
                                            value={companySearchQuery || form.company_details?.inn || ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                setCompanySearchQuery(val);
                                                setCompany('inn', val);
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fetchCompanyByInn(companySearchQuery || form.company_details?.inn)}
                                            disabled={companyLoading}
                                            className="card-clickable"
                                            style={{
                                                height: 46,
                                                padding: '0 18px',
                                                borderRadius: 12,
                                                border: 'none',
                                                background: '#0284c7',
                                                color: '#fff',
                                                fontSize: 12,
                                                fontWeight: 600,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                cursor: 'pointer',
                                                whiteSpace: 'nowrap',
                                                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)'
                                            }}
                                        >
                                            {companyLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                                            <span>Найти</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Наименования */}
                                <div className="form-group">
                                    <label className="form-label">Краткое наименование организации</label>
                                    <input 
                                        className="form-input" 
                                        style={{ height: 48, borderRadius: 14, background: 'var(--bg-light)', border: 'none', fontSize: 14 }}
                                        value={form.company_details?.short_name || ''} 
                                        onChange={e => {
                                            const val = e.target.value;
                                            setCompany('short_name', val);
                                            if (!form.full_name || form.full_name === defaultClient.full_name) {
                                                setF('full_name', val);
                                            }
                                        }} 
                                        placeholder="ООО «Альфа-Строй»" 
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Полное наименование организации</label>
                                    <textarea 
                                        className="form-textarea" 
                                        style={{ minHeight: 60, borderRadius: 14, background: 'var(--bg-light)', border: 'none', fontSize: 13, padding: 12 }}
                                        value={form.company_details?.name || ''} 
                                        onChange={e => setCompany('name', e.target.value)} 
                                        placeholder="Общество с ограниченной ответственностью «Альфа-Строй»" 
                                        rows={2}
                                    />
                                </div>

                                {/* ИНН · КПП · ОГРН */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>ИНН</label>
                                        <input 
                                            className="form-input" 
                                            style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 13 }}
                                            value={form.company_details?.inn || form.inn || ''} 
                                            onChange={e => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 12);
                                                setCompany('inn', val);
                                                setF('inn', val);
                                            }} 
                                            placeholder="10 или 12 цифр" 
                                            maxLength={12} 
                                            inputMode="numeric" 
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>КПП</label>
                                        <input 
                                            className="form-input" 
                                            style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 13 }}
                                            value={form.company_details?.kpp || ''} 
                                            onChange={e => setCompany('kpp', e.target.value.replace(/\D/g, '').slice(0, 9))} 
                                            placeholder="9 цифр" 
                                            maxLength={9} 
                                            inputMode="numeric" 
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>ОГРН / ОГРНИП</label>
                                        <input 
                                            className="form-input" 
                                            style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 13 }}
                                            value={form.company_details?.ogrn || ''} 
                                            onChange={e => setCompany('ogrn', e.target.value.replace(/\D/g, '').slice(0, 15))} 
                                            placeholder="13 или 15 цифр" 
                                            maxLength={15} 
                                            inputMode="numeric" 
                                        />
                                    </div>
                                </div>

                                {/* Юридический адрес */}
                                <div className="form-group" style={{ marginTop: 12 }}>
                                    <label className="form-label">Юридический адрес</label>
                                    <textarea 
                                        className="form-textarea" 
                                        style={{ minHeight: 56, borderRadius: 14, background: 'var(--bg-light)', border: 'none', fontSize: 13, padding: 12 }}
                                        value={form.company_details?.legal_address || ''} 
                                        onChange={e => {
                                            const val = e.target.value;
                                            setCompany('legal_address', val);
                                            setF('reg_address', val);
                                        }} 
                                        placeholder="г. Москва, ул. Арбат, д. 1" 
                                        rows={2}
                                    />
                                </div>

                                {/* Фактический адрес */}
                                <div className="form-group">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                        <label className="form-label" style={{ marginBottom: 0 }}>Фактический адрес</label>
                                        {form.company_details?.legal_address && form.company_details.legal_address !== form.company_details?.actual_address && (
                                            <button 
                                                type="button" 
                                                onClick={() => setCompany('actual_address', form.company_details.legal_address)}
                                                style={{ background: 'none', border: 'none', color: '#0284c7', fontSize: 11, cursor: 'pointer', padding: 0 }}
                                            >
                                                Скопировать из юридического
                                            </button>
                                        )}
                                    </div>
                                    <textarea 
                                        className="form-textarea" 
                                        style={{ minHeight: 56, borderRadius: 14, background: 'var(--bg-light)', border: 'none', fontSize: 13, padding: 12 }}
                                        value={form.company_details?.actual_address || ''} 
                                        onChange={e => setCompany('actual_address', e.target.value)} 
                                        placeholder="г. Москва, ул. Ленина, д. 10..." 
                                        rows={2}
                                    />
                                </div>

                                {/* Руководитель */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>ФИО руководителя</label>
                                        <input 
                                            className="form-input" 
                                            style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 13 }}
                                            value={form.company_details?.director_name || ''} 
                                            onChange={e => setCompany('director_name', e.target.value)} 
                                            placeholder="Иванов Петр Сергеевич" 
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Должность руководителя</label>
                                        <input 
                                            className="form-input" 
                                            style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 13 }}
                                            value={form.company_details?.director_position || ''} 
                                            onChange={e => setCompany('director_position', e.target.value)} 
                                            placeholder="Генеральный директор" 
                                        />
                                    </div>
                                </div>
                            </FormCard>

                            {/* Карточка уполномоченного лица (физлица) */}
                            <FormCard 
                                title="Уполномоченное лицо (представитель)"
                                action={
                                    selectedAuthClient ? (
                                        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 8, background: '#ecfdf5', color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                            <Link2 size={12} /> Привязано физлицо
                                        </span>
                                    ) : null
                                }
                            >
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.4 }}>
                                    Физическое лицо, уполномоченное действовать от имени организации при сделках и заключении договоров.
                                </div>

                                {/* Переключатель режима: Выбрать из базы / Ввести вручную */}
                                <div style={{ display: 'flex', background: 'var(--bg-light)', padding: 4, borderRadius: 14, gap: 4, marginBottom: 14 }}>
                                    <button
                                        type="button"
                                        onClick={() => setAuthPersonMode('select')}
                                        style={{
                                            flex: 1, padding: '8px 12px', borderRadius: 10, border: 'none', fontSize: 12, fontWeight: 500,
                                            background: authPersonMode === 'select' ? 'var(--surface)' : 'transparent',
                                            boxShadow: authPersonMode === 'select' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                                            color: authPersonMode === 'select' ? 'var(--text)' : 'var(--text-secondary)',
                                            cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                    >
                                        Выбрать из базы (физлицо)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setAuthPersonMode('manual')}
                                        style={{
                                            flex: 1, padding: '8px 12px', borderRadius: 10, border: 'none', fontSize: 12, fontWeight: 500,
                                            background: authPersonMode === 'manual' ? 'var(--surface)' : 'transparent',
                                            boxShadow: authPersonMode === 'manual' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                                            color: authPersonMode === 'manual' ? 'var(--text)' : 'var(--text-secondary)',
                                            cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                    >
                                        Ввести вручную
                                    </button>
                                </div>

                                {authPersonMode === 'select' ? (
                                    <div>
                                        {selectedAuthClient ? (
                                            <div style={{ padding: 14, borderRadius: 16, background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.25)', marginBottom: 14 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(16, 185, 129, 0.15)', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
                                                            <UserCheck size={20} />
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                                                                {selectedAuthClient.full_name}
                                                            </div>
                                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                                                {selectedAuthClient.phone ? formatPhone(selectedAuthClient.phone) : 'Телефон не указан'}
                                                                {selectedAuthClient.email ? ` · ${selectedAuthClient.email}` : ''}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={handleClearAuthPerson}
                                                        style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                                            padding: '6px 10px', borderRadius: 10, border: '1px solid rgba(239, 68, 68, 0.2)',
                                                            background: 'rgba(239, 68, 68, 0.05)', color: '#ef4444', fontSize: 11, fontWeight: 500, cursor: 'pointer'
                                                        }}
                                                        title="Отвязать представителя"
                                                    >
                                                        <Unlink2 size={13} /> Отвязать
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div style={{ marginBottom: 14 }}>
                                                <div style={{ position: 'relative', marginBottom: 8 }}>
                                                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}><Search size={16} /></span>
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        style={{ paddingLeft: 42, height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 13 }}
                                                        placeholder="Поиск по имени или телефону среди физлиц..."
                                                        value={authPersonSearch}
                                                        onChange={e => setAuthPersonSearch(e.target.value)}
                                                    />
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 14, padding: 6 }}>
                                                    {filteredAuthClients.length === 0 ? (
                                                        <div style={{ padding: '16px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                                                            Физлица не найдены. Переключитесь на «Ввести вручную».
                                                        </div>
                                                    ) : (
                                                        filteredAuthClients.map(c => (
                                                            <div
                                                                key={c.id}
                                                                style={{
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                                    padding: '8px 12px', borderRadius: 10, background: 'var(--surface)',
                                                                    border: '1px solid var(--border-light)'
                                                                }}
                                                            >
                                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                        {c.full_name}
                                                                    </div>
                                                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                                                        {c.phone ? formatPhone(c.phone) : 'Без тел.'}
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSelectAuthPerson(c)}
                                                                    className="card-clickable"
                                                                    style={{
                                                                        padding: '5px 12px', borderRadius: 8, border: 'none',
                                                                        background: 'var(--primary-light)', color: 'var(--primary)',
                                                                        fontSize: 11, fontWeight: 600, cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    Выбрать
                                                                </button>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Полномочия (Должность и Основание) */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Должность представителя</label>
                                                <input
                                                    className="form-input"
                                                    style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 13 }}
                                                    value={form.authorized_person?.position || ''}
                                                    onChange={e => setAuthPerson('position', e.target.value)}
                                                    placeholder="Генеральный директор / Представитель"
                                                />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Документ-основание</label>
                                                <input
                                                    className="form-input"
                                                    style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 13 }}
                                                    value={form.authorized_person?.basis_document || ''}
                                                    onChange={e => setAuthPerson('basis_document', e.target.value)}
                                                    placeholder="Устав / Доверенность №12 от ..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        <div className="form-group" style={{ marginBottom: 0 }}>
                                            <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>ФИО представителя</label>
                                            <input
                                                className="form-input"
                                                style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 13 }}
                                                value={form.authorized_person?.name || ''}
                                                onChange={e => setAuthPerson('name', e.target.value)}
                                                placeholder="Иванов Петр Сергеевич"
                                            />
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Телефон представителя</label>
                                                <input
                                                    type="tel"
                                                    className="form-input"
                                                    style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 13 }}
                                                    value={form.authorized_person?.phone || ''}
                                                    onChange={e => setAuthPerson('phone', formatPhone(e.target.value, true))}
                                                    placeholder="+7 (___) ___-__-__"
                                                />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Email представителя</label>
                                                <input
                                                    type="email"
                                                    className="form-input"
                                                    style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 13 }}
                                                    value={form.authorized_person?.email || ''}
                                                    onChange={e => setAuthPerson('email', e.target.value)}
                                                    placeholder="representative@mail.ru"
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Должность</label>
                                                <input
                                                    className="form-input"
                                                    style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 13 }}
                                                    value={form.authorized_person?.position || ''}
                                                    onChange={e => setAuthPerson('position', e.target.value)}
                                                    placeholder="Генеральный директор"
                                                />
                                            </div>
                                            <div className="form-group" style={{ marginBottom: 0 }}>
                                                <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Основание полномочий</label>
                                                <input
                                                    className="form-input"
                                                    style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 13 }}
                                                    value={form.authorized_person?.basis_document || ''}
                                                    onChange={e => setAuthPerson('basis_document', e.target.value)}
                                                    placeholder="Устав / Доверенность №..."
                                                />
                                            </div>
                                        </div>

                                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', marginTop: 4 }}>
                                            <input
                                                type="checkbox"
                                                checked={createAuthPersonAsClient}
                                                onChange={e => setCreateAuthPersonAsClient(e.target.checked)}
                                                style={{ width: 16, height: 16, accentColor: 'var(--primary)' }}
                                            />
                                            Создать карточку клиента в базе для этого представителя (физлицо)
                                        </label>
                                    </div>
                                )}
                            </FormCard>
                        </>
                    )}

                    <FormCard title="Дополнительно">
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}><Mail size={18} /></span>
                                <input className="form-input" style={{ paddingLeft: 46, height: 54, borderRadius: 16, background: 'var(--bg-light)', border: 'none', fontWeight: 300 }} type="email" value={form.email || ''} onChange={e => setF('email', e.target.value)} placeholder="email@mail.ru" />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Источник</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}><Share2 size={18} /></span>
                                <select className="form-select" style={{ paddingLeft: 46, height: 54, borderRadius: 16, background: 'var(--bg-light)', border: 'none', fontWeight: 300 }} value={form.source || ''} onChange={e => setF('source', e.target.value)}>
                                    <option value="">Не указан</option>
                                    {form.source && !sources.includes(form.source) && (
                                        <option value={form.source}>{form.source}</option>
                                    )}
                                    {sources.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>

                    </FormCard>

                    <FormCard 
                        title="Агентский договор"
                        action={
                            (form.agency_contract_date || form.has_agency_contract) ? (
                                <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 8, background: '#ecfdf5', color: '#059669', fontWeight: 600 }}>
                                    Заключен
                                </span>
                            ) : null
                        }
                    >
                        <div className="form-group">
                            <label className="form-label">Дата заключения</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}><Calendar size={18} /></span>
                                <input 
                                    className="form-input" 
                                    style={{ paddingLeft: 46, height: 54, borderRadius: 16, background: 'var(--bg-light)', border: 'none', fontWeight: 300 }} 
                                    type="date" 
                                    value={form.agency_contract_date ? form.agency_contract_date.split('T')[0] : ''} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        setForm(f => ({ ...f, agency_contract_date: val, has_agency_contract: Boolean(val || f.has_agency_contract) }));
                                    }} 
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">По какому объекту</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}><Landmark size={18} /></span>
                                <select 
                                    className="form-select" 
                                    style={{ paddingLeft: 46, height: 54, borderRadius: 16, background: 'var(--bg-light)', border: 'none', fontWeight: 300 }} 
                                    value={form.agency_contract_property_id || ''} 
                                    onChange={e => setF('agency_contract_property_id', e.target.value)}
                                >
                                    <option value="">-- Выберите объект недвижимости --</option>
                                    {id && state.properties.filter(p => p.client_id === id || (p.client_ids || []).includes(id)).length > 0 && (
                                        <optgroup label="Объекты клиента">
                                            {state.properties.filter(p => p.client_id === id || (p.client_ids || []).includes(id)).map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.address || p.city} {p.price ? `(${p.price.toLocaleString()} ₽)` : ''}
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                    <optgroup label="Все объекты в базе">
                                        {state.properties
                                            .filter(p => !id || !(p.client_id === id || (p.client_ids || []).includes(id)))
                                            .map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.address || p.city} {p.price ? `(${p.price.toLocaleString()} ₽)` : ''}
                                                </option>
                                            ))}
                                    </optgroup>
                                </select>
                            </div>
                        </div>
                    </FormCard>

                    <FormCard title="Заметки">
                        <textarea className="form-textarea" style={{ minHeight: 120, borderRadius: 20, background: 'var(--bg-light)', border: 'none', padding: 16, fontWeight: 300 }} value={form.notes || ''} onChange={e => setF('notes', e.target.value)} placeholder="Важная информация о клиенте, предпочтения, история общения..." />
                    </FormCard>

                    {/* Passport Details Toggle Section */}
                    <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: showPassport ? 'white' : 'var(--bg-light)', transition: 'all 0.3s' }}>
                        <button type="button" 
                            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', padding: 0 }}
                            onClick={() => setShowPassport(!showPassport)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                    <span className="font-oswald" style={{ fontWeight: 600 }}><ShieldCheck size={20} /></span>
                                </div>
                                <span className="font-oswald" style={{ fontWeight: 600, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Паспортные данные</span>
                            </div>
                            {showPassport ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
                        </button>

                        {showPassport && (
                            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>

                                {/* Строка 1: Серия и Номер · Дата выдачи */}
                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Серия и номер паспорта</label>
                                        <input
                                            className="form-input"
                                            style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 14 }}
                                            value={formatPassportDisplay(form.passport_details?.series, form.passport_details?.number)}
                                            onChange={e => {
                                                const { series, number } = parsePassportInput(e.target.value);
                                                setPassport('series', series);
                                                setPassport('number', number);
                                            }}
                                            placeholder="__ ______"
                                            maxLength={13}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Дата выдачи</label>
                                        <input type="date" className="form-input" style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 13 }} value={form.passport_details?.issue_date || ''} onChange={e => setPassport('issue_date', e.target.value)} />
                                    </div>
                                </div>

                                {/* Строка 2: Код подразд. · Дата рождения */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Код подразделения</label>
                                        <input
                                            className="form-input"
                                            style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 14, letterSpacing: '0.05em' }}
                                            value={form.passport_details?.unit_code || ''}
                                            onChange={e => handleUnitCodeChange(e.target.value)}
                                            placeholder="___-___"
                                            inputMode="numeric"
                                            maxLength={7}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Дата рождения</label>
                                        <input type="date" className="form-input" style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 13 }} value={form.birth_date || form.passport_details?.birth_date || ''} onChange={e => { setF('birth_date', e.target.value); setPassport('birth_date', e.target.value); }} />
                                    </div>
                                </div>

                                {/* Строка 3: ИНН · СНИЛС */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>ИНН</label>
                                        <input className="form-input" style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 14 }} value={form.inn || form.passport_details?.inn || ''} onChange={e => { setF('inn', e.target.value); setPassport('inn', e.target.value); }} placeholder="771234567890" maxLength={12} inputMode="numeric" />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>СНИЛС</label>
                                        <input
                                            className="form-input"
                                            style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 14, letterSpacing: '0.05em' }}
                                            value={form.passport_details?.snils || ''}
                                            onChange={e => handleSnilsChange(e.target.value)}
                                            placeholder="000-000-000 00"
                                            inputMode="numeric"
                                            maxLength={14}
                                        />
                                    </div>
                                </div>

                                {/* Кем выдан — полная строка */}
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Кем выдан</label>
                                    <textarea
                                        className="form-textarea"
                                        style={{ minHeight: 64, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 13, padding: '10px 14px', resize: 'none' }}
                                        value={form.passport_details?.issued_by || ''}
                                        onChange={e => setPassport('issued_by', e.target.value)}
                                        placeholder="ГУ МВД России по г. Москве..."
                                        rows={2}
                                    />
                                </div>

                                {/* Адрес регистрации — полная строка */}
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Адрес регистрации</label>
                                    <textarea
                                        className="form-textarea"
                                        style={{ minHeight: 64, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 13, padding: '10px 14px', resize: 'none' }}
                                        value={form.passport_details?.registration_address || ''}
                                        onChange={e => setPassport('registration_address', e.target.value)}
                                        placeholder="г. Москва, ул..."
                                        rows={2}
                                    />
                                </div>

                            </div>
                        )}
                    </div>

                    {/* ── Банковские реквизиты ── */}
                    <div className="card" style={{ padding: '24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: showBank ? 'white' : 'var(--bg-light)', transition: 'all 0.3s' }}>
                        <button type="button"
                            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', padding: 0 }}
                            onClick={() => {
                                if (!showBank && !form.bank_details?.beneficiary && form.full_name) {
                                    setBank('beneficiary', form.full_name);
                                }
                                setShowBank(!showBank);
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                    <Landmark size={20} />
                                </div>
                                <span className="font-oswald" style={{ fontWeight: 600, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Банковские реквизиты</span>
                            </div>
                            {showBank ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
                        </button>

                        {showBank && (
                            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>

                                {/* Получатель — полная строка */}
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>ФИО / Название получателя</label>
                                    <input
                                        className="form-input"
                                        style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 14 }}
                                        value={form.bank_details?.beneficiary || form.full_name || ''}
                                        onChange={e => setBank('beneficiary', e.target.value)}
                                        placeholder="Иванов Иван Иванович"
                                    />
                                </div>

                                {/* Банк — полная строка */}
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Банк</label>
                                    <input
                                        className="form-input"
                                        style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 14 }}
                                        value={form.bank_details?.bank_name || ''}
                                        onChange={e => setBank('bank_name', e.target.value)}
                                        placeholder="ПАО Сбербанк"
                                    />
                                </div>

                                {/* БИК · ИНН · КПП */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                                     <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>
                                            БИК
                                            {bankLoading && <Loader2 size={11} style={{ marginLeft: 5, verticalAlign: 'middle', animation: 'spin 1s linear infinite' }} />}
                                            {bankFound && !bankLoading && <CheckCircle2 size={11} color="#10b981" style={{ marginLeft: 5, verticalAlign: 'middle' }} />}
                                        </label>
                                        <input
                                            className="form-input"
                                            style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: `1.5px solid ${bankFound ? '#10b981' : 'transparent'}`, fontSize: 14, letterSpacing: '0.05em', transition: 'border-color 0.2s' }}
                                            value={form.bank_details?.bik || ''}
                                            onChange={e => handleBikChange(e.target.value)}
                                            placeholder="044525225"
                                            inputMode="numeric"
                                            maxLength={9}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>ИНН банка</label>
                                        <input
                                            className="form-input"
                                            style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 14, letterSpacing: '0.05em' }}
                                            value={form.bank_details?.inn || ''}
                                            onChange={e => handleBankInnChange(e.target.value)}
                                            placeholder="7707083893"
                                            inputMode="numeric"
                                            maxLength={10}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>КПП</label>
                                        <input
                                            className="form-input"
                                            style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 14, letterSpacing: '0.05em' }}
                                            value={form.bank_details?.kpp || ''}
                                            onChange={e => handleKppChange(e.target.value)}
                                            placeholder="770801001"
                                            inputMode="numeric"
                                            maxLength={9}
                                        />
                                    </div>
                                </div>

                                {/* Расчётный счёт */}
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Расчётный счёт (р/с)</label>
                                    <input
                                        className="form-input"
                                        style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 14, letterSpacing: '0.08em', fontVariantNumeric: 'tabular-nums' }}
                                        value={form.bank_details?.account || ''}
                                        onChange={e => handleAccountChange('account', e.target.value)}
                                        placeholder="40817 81038 00000 00000"
                                        inputMode="numeric"
                                        maxLength={23}
                                    />
                                </div>

                                {/* Корр. счёт */}
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label" style={{ fontSize: 11, marginBottom: 4 }}>Корреспондентский счёт (к/с)</label>
                                    <input
                                        className="form-input"
                                        style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontSize: 14, letterSpacing: '0.08em', fontVariantNumeric: 'tabular-nums' }}
                                        value={form.bank_details?.corr_account || ''}
                                        onChange={e => handleAccountChange('corr_account', e.target.value)}
                                        placeholder="30101 81040 00000 00000"
                                        inputMode="numeric"
                                        maxLength={23}
                                    />
                                </div>

                            </div>
                        )}
                    </div>

                    {/* Кнопка отправки формы в конце */}
                    <div className="form-submit-container" style={{ marginTop: 8, marginBottom: 16 }}>
                        <button type="submit" className="form-submit-btn btn btn-primary card-clickable" style={{ 
                            height: 56, borderRadius: 18, fontSize: 16, 
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                            boxShadow: '0 8px 24px rgba(0, 82, 255, 0.15)'
                        }}>
                            {id ? 'Сохранить изменения' : 'Создать клиента'}
                        </button>
                    </div>

                </div>
            </form>

            {/* Модальное окно сканирования паспорта */}
            <PassportScanModal
                isOpen={showPassportScan}
                onClose={() => setShowPassportScan(false)}
                onExtracted={handlePassportExtracted}
            />

            {/* Модальное окно при совпадении контакта */}
            {duplicateModalMatch && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1100,
                    background: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(10px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 20
                }}>
                    <div className="card fade-in" style={{
                        maxWidth: 440, width: '100%', padding: 28, borderRadius: 28,
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                            <div style={{ width: 44, height: 44, borderRadius: 14, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D97706', flexShrink: 0 }}>
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--text)' }}>
                                    Контакт уже существует
                                </h3>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                    Обнаружено совпадение по номеру
                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '12px 14px', background: 'var(--bg-light)', borderRadius: 14, marginBottom: 18 }}>
                            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>
                                {duplicateModalMatch.full_name || 'Без имени'}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                                {duplicateModalMatch.phone || 'Без телефона'}
                            </div>
                        </div>

                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 20px' }}>
                            В базе уже зарегистрирован контакт с таким номером. Хотите заменить данные существующего контакта на новые или всё равно создать отдельную запись?
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <button
                                type="button"
                                className="btn btn-primary card-clickable"
                                style={{ height: 48, borderRadius: 14, fontWeight: 600, fontSize: 14, background: 'var(--primary)', color: 'white' }}
                                onClick={() => {
                                    const m = duplicateModalMatch;
                                    setDuplicateModalMatch(null);
                                    handleReplaceExisting(m);
                                }}
                            >
                                Заменить на новый
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary card-clickable"
                                style={{ height: 44, borderRadius: 14, fontSize: 13 }}
                                onClick={() => {
                                    setDuplicateModalMatch(null);
                                    saveNewClient();
                                }}
                            >
                                Всё равно создать дубликат
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary card-clickable"
                                style={{ height: 40, borderRadius: 14, fontSize: 13, opacity: 0.7 }}
                                onClick={() => setDuplicateModalMatch(null)}
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
