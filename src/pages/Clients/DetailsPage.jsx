import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { formatPhone, stripPhone, formatNumber, getEventStatusLabel, toLocalISOString, parseLocalDateTime, formatDate } from '../../utils/format';
import { PROPERTY_TYPES, AGENCY_CONTRACT_TYPES, CLIENT_TYPES, CLIENT_TYPE_LABELS } from '../../data/constants';
import { nanoid } from '../../utils/nanoid';
import { ClientVerificationModal } from '../../components/ClientVerificationModal';
import { hasPassedDealStage } from '../../utils/matching';
import {
    ChevronLeft,
    ChevronRight,
    Phone,
    Calendar,
    Home,
    Briefcase,
    FileText,
    ExternalLink,
    Plus,
    X,
    Check,
    Pencil,
    Trash2,
    ShieldCheck,
    AlertTriangle,
    Building2,
    Copy,
    UserCheck,
    Link2,
    Unlink2,
    MapPin,
    Landmark,
    Clock,
    RotateCw,
    CheckCircle2
} from 'lucide-react';
import {
    DEFAULT_CONTRACT_DURATION_MONTHS,
    CONTRACT_DURATION_OPTIONS,
    calculateContractEndDate,
    formatContractDate,
    getContractStatusInfo,
    getClientContractAlerts
} from '../../utils/contractTerms';

const EXCLUDED_PROP_STATUSES = ['sold', 'deal_closed', 'deal'];
const EXCLUDED_MATCH_STATUSES = ['deal', 'rejected'];

export function DetailsPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast } = useToastContext();
    const client = state.clients.find(c => c.id === id);
    const [isEditingTypes, setIsEditingTypes] = useState(false);
    const [isVerificationOpen, setIsVerificationOpen] = useState(false);
    const [showMissingModal, setShowMissingModal] = useState(false);
    const [missingRequisites, setMissingRequisites] = useState([]);
    const [quickModalType, setQuickModalType] = useState(null); // null | 'meeting' | 'call'
    const [quickForm, setQuickForm] = useState({
        showing_date: '',
        property_id: '',
        status: 'planned',
        feedback_comment: '',
    });
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [editingContractId, setEditingContractId] = useState(null);
    const [contractForm, setContractForm] = useState({
        type: 'АД Продажа',
        date: '',
        duration_months: DEFAULT_CONTRACT_DURATION_MONTHS,
        is_extended: false,
        property_id: '',
        status: 'active',
        comment: ''
    });

    const clientContracts = useMemo(() => {
        if (!client) return [];
        const rawContracts = Array.isArray(client.agency_contracts) ? client.agency_contracts : [];
        if (rawContracts.length > 0) return rawContracts;
        if (client.has_agency_contract || client.agency_contract_date) {
            return [{
                id: 'legacy-' + client.id,
                type: 'АД Продажа',
                contract_date: client.agency_contract_date,
                property_id: client.agency_contract_property_id || null,
                status: 'active'
            }];
        }
        return [];
    }, [client?.agency_contracts, client?.has_agency_contract, client?.agency_contract_date, client?.id, client?.agency_contract_property_id]);

    const activeContracts = useMemo(() => clientContracts.filter(c => c && c.status !== 'terminated' && c.status !== 'closed' && c.status !== 'fulfilled'), [clientContracts]);
    const fulfilledContracts = useMemo(() => clientContracts.filter(c => c && c.status === 'fulfilled'), [clientContracts]);

    const clientAlerts = useMemo(() => {
        return getClientContractAlerts(client, new Date(), { deals: state.deals });
    }, [client, state.deals]);

    // Состояние для юридического лица и уполномоченного лица
    const isLegalEntity = client?.client_types?.includes('legal_entity');
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalMode, setAuthModalMode] = useState('select'); // 'select' | 'manual'
    const [authModalSearch, setAuthModalSearch] = useState('');
    const [authModalForm, setAuthModalForm] = useState({
        client_id: null,
        name: '',
        phone: '',
        email: '',
        position: 'Генеральный директор',
        basis_document: 'Устав'
    });

    if (!client) return (
        <div className="page">
            <div className="topbar" style={{ background: 'var(--topbar-bg)', backdropFilter: 'blur(20px) saturate(180%)' }}>
                <button className="topbar-back" onClick={() => navigate('/clients')}>←</button>
                <span className="topbar-title font-oswald">Клиент не найден</span>
            </div>
        </div>
    );

    /* ─── Данные клиента ─────────────────────────────── */
    const authPersonClient = useMemo(() => {
        if (!client) return null;
        const targetId = client.authorized_person_id || client.authorized_person?.client_id;
        if (targetId) {
            return state.clients.find(c => c.id === targetId) || null;
        }
        return null;
    }, [client?.authorized_person_id, client?.authorized_person?.client_id, state.clients]);

    const representedCompanies = useMemo(() => {
        if (!client) return [];
        return state.clients.filter(c => {
            if (!c.client_types?.includes('legal_entity')) return false;
            if (c.id === client.id) return false;
            if (c.authorized_person_id && c.authorized_person_id === client.id) return true;
            if (c.authorized_person?.client_id && c.authorized_person.client_id === client.id) return true;
            if (client.phone && c.authorized_person?.phone && stripPhone(client.phone) === stripPhone(c.authorized_person.phone)) return true;
            return false;
        });
    }, [client?.id, client?.phone, state.clients]);

    const availablePhysicalClients = useMemo(() => {
        return state.clients.filter(c => c.id !== client?.id && !c.client_types?.includes('legal_entity'));
    }, [state.clients, client?.id]);

    const myProperties = state.properties.filter(p =>
        p.client_id === id || (p.client_ids || []).includes(id)
    );
    // Объекты в продаже — все кроме sold / deal_closed
    const activeProperties = myProperties.filter(p => !EXCLUDED_PROP_STATUSES.includes(p.status));

    const myRequests = state.requests.filter(r =>
        r.client_id === id || (r.client_ids || []).includes(id)
    );

    // Матчи — все кроме deal / rejected, и объект не должен пройти этап сделки
    const propMatches = state.matches.filter(m => {
        if (EXCLUDED_MATCH_STATUSES.includes(m.status)) return false;
        const prop = state.properties.find(p => p.id === m.property_id && (p.client_id === id || (p.client_ids || []).includes(id)));
        return prop && !hasPassedDealStage(prop, state.deals);
    });
    const reqMatches = state.matches.filter(m => {
        if (EXCLUDED_MATCH_STATUSES.includes(m.status)) return false;
        const prop = state.properties.find(p => p.id === m.property_id);
        if (!prop || hasPassedDealStage(prop, state.deals)) return false;
        return state.requests.find(r => r.id === m.request_id && (r.client_id === id || (r.client_ids || []).includes(id)));
    });
    const allMatches = [...new Map([...propMatches, ...reqMatches].map(m => [m.id, m])).values()];

    // Сделки клиента (продавец, покупатель, агент или юрист)
    const myDeals = state.deals.filter(d => {
        if (d.lawyer_id === id) return true;
        if (d.seller_agent_id === id || d.buyer_agent_id === id) return true;
        const sellerIds = d.seller_ids || (d.seller_id ? [d.seller_id] : []);
        const buyerIds  = d.buyer_ids  || (d.buyer_id  ? [d.buyer_id]  : []);
        return sellerIds.includes(id) || buyerIds.includes(id);
    });

    // Показы / звонки клиента
    const myShowings = state.showings.filter(s =>
        (s.client_id && String(s.client_id) === String(id)) ||
        (Array.isArray(s.client_ids) && s.client_ids.some(cid => String(cid) === String(id)))
    ).sort((a, b) => new Date(b.showing_date) - new Date(a.showing_date));

    const totalCommission = myDeals.reduce((sum, d) => {
        const sellerIds = d.seller_ids || (d.seller_id ? [d.seller_id] : []);
        const buyerIds  = d.buyer_ids  || (d.buyer_id  ? [d.buyer_id]  : []);
        const isSeller = sellerIds.includes(id);
        const isBuyer = buyerIds.includes(id);

        let parsedExpenses = [];
        if (d.expenses) {
            if (Array.isArray(d.expenses)) parsedExpenses = d.expenses;
            else if (typeof d.expenses === 'string') {
                try { parsedExpenses = JSON.parse(d.expenses); } catch {}
            }
        }

        // If expenses exist in deal
        if (parsedExpenses.length > 0) {
            const sideExpenses = parsedExpenses.filter(e => {
                if (isSeller && e.payer === 'seller') return true;
                if (isBuyer && e.payer === 'buyer') return true;
                return false;
            });
            // Check for explicit 'Комиссия' expense for this side
            const commExp = sideExpenses.find(e => e.title === 'Комиссия');
            if (commExp) {
                return sum + (Number(commExp.amount) || 0);
            }
            // If side has other expenses but no 'Комиссия' listed under their side,
            // check if there's any commission expense at all
            const hasAnyCommissionExp = parsedExpenses.some(e => e.title === 'Комиссия');
            if (hasAnyCommissionExp) {
                // If other side pays commission, client paid 0 commission
                return sum;
            }
        }

        // Fallback if no detailed expenses specified: split 50/50 if both sides present in client list or fallback to deal commission
        if (isSeller && isBuyer) {
            return sum + (Number(d.commission) || 0);
        } else if (isSeller || isBuyer) {
            // If deal.commission exists and no expenses split, default to d.commission
            return sum + (Number(d.commission) || 0);
        }
        return sum + (Number(d.commission) || 0);
    }, 0);

    const mapStatus = (status) => {
        switch (status) {
            case 'new':
                return 'new';
            case 'control':
                return 'control';
            case 'refused':
                return 'refused';
            case 'search':
            case 'request':
            case 'selection':
                return 'selection';
            case 'active':
            case 'deposit':
            case 'deal':
            case 'agreement':
            case 'paused':
            case 'completed':
            case 'deal_closed':
            default:
                return 'active';
        }
    };

    const statusLabels = {
        new: 'Не отработан',
        control: 'На контроле',
        selection: 'Подбор',
        active: 'В работе',
        refused: 'Отказ'
    };
    const typeLabels   = CLIENT_TYPE_LABELS;

    const matchStatusLabel = { new: 'Новый', viewed: 'Просмотрен', showing_planned: 'Показ', showing_done: 'Показ проведён' };
    const matchStatusColor = { new: '#3b82f6', viewed: '#64748b', showing_planned: '#f59e0b', showing_done: '#10b981' };
    const dealStatusLabel  = { active: 'Активная', closed: 'Закрытая' };
    const dealStatusColor  = { active: 'var(--primary)', closed: '#10b981' };

    const eventTypeLabels = {
        showing: 'Показ',
        meeting: 'Встреча',
        viewing: 'Подбор',
        deposit: 'Задаток',
        deal: 'Сделка',
        call: 'Звонок'
    };

    /* ─── Обработчики ───────────────────────────────── */
    function openQuickModal(type) {
        const nextHour = new Date(Date.now() + 60 * 60 * 1000);
        setQuickForm({
            showing_date: toLocalISOString(nextHour),
            property_id: myProperties.length === 1 ? myProperties[0].id : '',
            status: 'planned',
            feedback_comment: '',
        });
        setQuickModalType(type);
    }

    function handleQuickSubmit(e) {
        e.preventDefault();
        if (!quickForm.showing_date) {
            toast.error('Укажите дату и время');
            return;
        }
        let dateIso = null;
        const parsedDate = parseLocalDateTime(quickForm.showing_date);
        if (parsedDate && !isNaN(parsedDate.getTime())) {
            dateIso = parsedDate.toISOString();
        } else {
            const fallbackDate = new Date(quickForm.showing_date);
            if (!isNaN(fallbackDate.getTime())) {
                dateIso = fallbackDate.toISOString();
            }
        }

        if (!dateIso) {
            toast.error('Некорректная дата');
            return;
        }

        const eventTitle = quickModalType === 'meeting' ? 'Встреча' : 'Звонок';
        const newShowing = {
            id: nanoid(),
            realtor_id: state.currentUser?.id || client?.realtor_id || null,
            client_id: id,
            client_ids: [id],
            property_id: quickForm.property_id || null,
            showing_date: dateIso,
            status: quickForm.status || 'planned',
            event_type: quickModalType,
            feedback_comment: quickForm.feedback_comment ? quickForm.feedback_comment.trim() : (quickModalType === 'call' ? `Звонок клиенту ${client.full_name}` : `Встреча с клиентом ${client.full_name}`),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        dispatch({ type: 'ADD_SHOWING', showing: newShowing });
        toast.success(`${eventTitle} добавлена в календарь!`);
        setQuickModalType(null);
    }
    function handleStatusChange(newStatus) {
        if (newStatus === client.status) return;
        const updatedClient = { ...client, status: newStatus };
        dispatch({ type: 'UPDATE_CLIENT', client: updatedClient });
        toast.success(`Статус изменен на "${statusLabels[newStatus] || newStatus}"`);
    }

    function handleToggleType(typeId) {
        const currentTypes = client.client_types || [];
        let newTypes;
        if (currentTypes.includes(typeId)) {
            if (currentTypes.length <= 1) {
                toast.error('Должен быть выбран как минимум один тип клиента');
                return;
            }
            newTypes = currentTypes.filter(t => t !== typeId);
        } else {
            newTypes = [...currentTypes, typeId];
        }

        const updatedClient = { ...client, client_types: newTypes };

        const buyerStatuses = ['request', 'agreement', 'search', 'deposit', 'deal'];
        if (!newTypes.includes('buyer') && buyerStatuses.includes(client.status)) {
            updatedClient.status = 'active';
            toast.warning('Статус изменен на "В работе", так как клиент больше не является Покупателем');
        }

        dispatch({ type: 'UPDATE_CLIENT', client: updatedClient });
        toast.success('Типы клиента обновлены');
    }

    function handleCall() {
        const callNote = {
            id: crypto.randomUUID(),
            realtor_id: state.currentUser?.id,
            client_id: id,
            property_id: null,
            showing_date: new Date().toISOString(),
            status: 'completed',
            client_feedback: 'interested',
            feedback_comment: `Звонок клиенту ${client.full_name}`,
            event_type: 'call',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        dispatch({ type: 'ADD_SHOWING', showing: callNote });
        toast.success('Звонок зарегистрирован');
    }

    async function handleShareLink() {
        let pubToken = client.public_token;
        if (!pubToken) {
            pubToken = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `pt-${Date.now()}`;
            dispatch({ type: 'UPDATE_CLIENT', client: { ...client, public_token: pubToken } });
        }
        const link = `${window.location.origin}/#/c/${pubToken}`;
        navigator.clipboard.writeText(link)
            .then(() => toast.success('Публичная ссылка скопирована!'))
            .catch(() => toast.error('Не удалось скопировать ссылку'));
    }

    function handleCreateDeal() {
        const sellerIds = myProperties.length > 0 ? [id] : [];
        const buyerIds  = myRequests.length  > 0 ? [id] : [];
        navigate('/tasks', {
            state: {
                prefillDeal: {
                    title: `Сделка: ${client.full_name}`,
                    seller_ids: sellerIds,
                    buyer_ids: buyerIds,
                    property_id: myProperties[0]?.id || '',
                    price: myProperties[0]?.price ? String(myProperties[0].price) : '',
                    commission: myProperties[0]?.commission ? String(myProperties[0].commission) : '',
                    deal_date: '',
                }
            }
        });
    }

    function handleStartVerification() {
        const missing = [];
        const birthDate = client.birth_date || client.passport_details?.birth_date;
        const passportNum = client.passport || (client.passport_details?.series && client.passport_details?.number);
        const innNum = client.inn || client.passport_details?.inn;

        if (!birthDate) missing.push('Дата рождения (для проверки в ФССП)');
        if (!passportNum) missing.push('Паспорт РФ (для сервиса МВД)');
        if (!innNum) missing.push('ИНН (для ФНС и проверки банкротства)');

        if (missing.length > 0) {
            setMissingRequisites(missing);
            setShowMissingModal(true);
        } else {
            setIsVerificationOpen(true);
        }
    }

    function handleDeleteClient() {
        if (window.confirm(`Удалить клиента "${client.full_name}"? Это действие нельзя отменить.`)) {
            dispatch({ type: 'DELETE_CLIENT', id });
            toast.success('Клиент успешно удален');
            navigate('/clients');
        }
    }

    const hasAgencyContract = activeContracts.length > 0;
    const agencyContractProperty = state.properties.find(p => p.id === (activeContracts[0]?.property_id || client.agency_contract_property_id));

    function getContractTypeConfig(type) {
        switch (type) {
            case 'АД Покупка':
                return { color: '#0052ff', bg: 'rgba(0, 82, 255, 0.08)', border: 'rgba(0, 82, 255, 0.25)' };
            case 'АД Продажа':
                return { color: '#059669', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.25)' };
            case 'АД ЮСС Покупка':
                return { color: '#4f46e5', bg: 'rgba(79, 70, 229, 0.08)', border: 'rgba(79, 70, 229, 0.25)' };
            case 'АД ЮСС Продажа':
                return { color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.08)', border: 'rgba(124, 58, 237, 0.25)' };
            case 'АД Найм с наймодателем':
            case 'АД Аренда с наймодателем':
                return { color: '#d97706', bg: 'rgba(217, 119, 6, 0.08)', border: 'rgba(217, 119, 6, 0.25)' };
            case 'АД Найм с нанимателем':
            case 'АД Аренда с нанимателем':
                return { color: '#ea580c', bg: 'rgba(234, 88, 12, 0.08)', border: 'rgba(234, 88, 12, 0.25)' };
            case 'АД Аренда с арендодателем':
                return { color: '#0284c7', bg: 'rgba(2, 132, 199, 0.08)', border: 'rgba(2, 132, 199, 0.25)' };
            case 'АД Аренда с арендатором':
                return { color: '#0891b2', bg: 'rgba(8, 145, 178, 0.08)', border: 'rgba(8, 145, 178, 0.25)' };
            default:
                return { color: '#059669', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.25)' };
        }
    }

    function openAddContractModal() {
        setEditingContractId(null);
        let defaultType = 'АД Продажа';
        const types = client?.client_types || [];
        if (types.some(t => ['landlord', 'lessor'].includes(t))) {
            defaultType = 'АД Аренда с наймодателем';
        } else if (types.some(t => ['tenant', 'lessee'].includes(t))) {
            defaultType = 'АД Аренда с нанимателем';
        } else if (types.includes('buyer')) {
            defaultType = 'АД Покупка';
        }
        setContractForm({
            type: defaultType,
            date: new Date().toISOString().split('T')[0],
            duration_months: DEFAULT_CONTRACT_DURATION_MONTHS,
            is_extended: false,
            property_id: myProperties[0]?.id || '',
            status: 'active',
            comment: ''
        });
        setIsContractModalOpen(true);
    }

    function openEditContractModal(c) {
        setEditingContractId(c.id);
        setContractForm({
            type: c.type || 'АД Продажа',
            date: c.contract_date ? c.contract_date.split('T')[0] : new Date().toISOString().split('T')[0],
            duration_months: Number(c.duration_months) || DEFAULT_CONTRACT_DURATION_MONTHS,
            is_extended: Boolean(c.is_extended || c.extension_count > 0),
            property_id: c.property_id || '',
            status: c.status || 'active',
            comment: c.comment || ''
        });
        setIsContractModalOpen(true);
    }

    function handleExtendContract(contractId) {
        const target = clientContracts.find(c => c.id === contractId);
        if (!target) return;
        if (target.is_extended || target.extension_count > 0) {
            toast.error('Этот договор уже был продлен. Продление допускается строго 1 раз на тот же срок! Для продолжения работы оформите перезаключение.');
            return;
        }
        const duration = Number(target.duration_months) || DEFAULT_CONTRACT_DURATION_MONTHS;
        const nowIso = new Date().toISOString();
        const startIso = target.contract_date || nowIso;
        const newValidUntil = calculateContractEndDate(startIso, duration, true);

        const updatedContracts = clientContracts.map(c => {
            if (c.id === contractId) {
                return {
                    ...c,
                    duration_months: duration,
                    is_extended: true,
                    extension_count: 1,
                    extended_at: nowIso,
                    valid_until: newValidUntil ? newValidUntil.toISOString() : null,
                    updated_at: nowIso
                };
            }
            return c;
        });

        const activeList = updatedContracts.filter(c => c && c.status !== 'terminated' && c.status !== 'closed' && c.status !== 'fulfilled');
        const primary = activeList[0] || updatedContracts[0] || null;

        const updatedClient = {
            ...client,
            agency_contracts: updatedContracts,
            agency_contract_date: primary ? primary.contract_date : null,
            agency_contract_property_id: primary ? primary.property_id : null,
            has_agency_contract: activeList.length > 0,
            updated_at: nowIso
        };

        dispatch({ type: 'UPDATE_CLIENT', client: updatedClient });
        toast.success(`Договор продлен на ${duration} мес. (до ${formatContractDate(newValidUntil)}). Обратите внимание: повторное продление невозможно, далее потребуется перезаключение.`);
    }

    function handleRenewContract(contract) {
        setEditingContractId(null);
        const duration = Number(contract?.duration_months) || DEFAULT_CONTRACT_DURATION_MONTHS;
        setContractForm({
            type: contract?.type || 'АД Продажа',
            date: new Date().toISOString().split('T')[0],
            duration_months: duration,
            is_extended: false,
            property_id: contract?.property_id || '',
            status: 'active',
            comment: contract?.comment ? `Перезаключение (ранее: ${contract.comment})` : 'Перезаключение договора'
        });
        setIsContractModalOpen(true);
        toast.info('Оформление нового договора взамен истекшего (перезаключение)');
    }

    function handleSaveContract(e) {
        if (e) e.preventDefault();
        if (!contractForm.date) {
            toast.error('Укажите дату заключения договора');
            return;
        }
        const dateIso = contractForm.date.includes('T') ? contractForm.date : `${contractForm.date}T00:00:00.000Z`;
        const durationMonths = Number(contractForm.duration_months) || DEFAULT_CONTRACT_DURATION_MONTHS;
        const isExtended = Boolean(contractForm.is_extended);
        const calculatedEnd = calculateContractEndDate(dateIso, durationMonths, isExtended);
        const validUntilIso = calculatedEnd ? calculatedEnd.toISOString() : null;

        let updatedContracts;
        if (editingContractId) {
            const existing = clientContracts.find(c => c.id === editingContractId);
            updatedContracts = clientContracts.map(c => {
                if (c.id === editingContractId) {
                    return {
                        ...c,
                        type: contractForm.type,
                        contract_date: dateIso,
                        duration_months: durationMonths,
                        is_extended: isExtended,
                        extension_count: isExtended ? 1 : 0,
                        extended_at: isExtended ? (existing?.extended_at || new Date().toISOString()) : null,
                        valid_until: validUntilIso,
                        property_id: contractForm.property_id || null,
                        status: contractForm.status || 'active',
                        comment: contractForm.comment ? contractForm.comment.trim() : '',
                        updated_at: new Date().toISOString()
                    };
                }
                return c;
            });
        } else {
            const newContract = {
                id: nanoid(),
                type: contractForm.type,
                contract_date: dateIso,
                duration_months: durationMonths,
                is_extended: isExtended,
                extension_count: isExtended ? 1 : 0,
                extended_at: isExtended ? new Date().toISOString() : null,
                valid_until: validUntilIso,
                property_id: contractForm.property_id || null,
                status: contractForm.status || 'active',
                comment: contractForm.comment ? contractForm.comment.trim() : '',
                created_at: new Date().toISOString()
            };
            updatedContracts = [newContract, ...clientContracts];
        }

        const activeList = updatedContracts.filter(c => c && c.status !== 'terminated' && c.status !== 'closed' && c.status !== 'fulfilled');
        const primary = activeList[0] || updatedContracts[0] || null;

        const updatedClient = {
            ...client,
            agency_contracts: updatedContracts,
            agency_contract_date: primary ? primary.contract_date : null,
            agency_contract_property_id: primary ? primary.property_id : null,
            has_agency_contract: activeList.length > 0,
            updated_at: new Date().toISOString()
        };

        dispatch({ type: 'UPDATE_CLIENT', client: updatedClient });
        toast.success(editingContractId ? 'Договор обновлен' : 'Агентский договор добавлен');
        setIsContractModalOpen(false);
    }

    function handleDeleteContract(contractId) {
        if (window.confirm('Удалить этот агентский договор?')) {
            const updatedContracts = clientContracts.filter(c => c.id !== contractId);
            const activeList = updatedContracts.filter(c => c && c.status !== 'terminated' && c.status !== 'closed' && c.status !== 'fulfilled');
            const primary = activeList[0] || updatedContracts[0] || null;

            const updatedClient = {
                ...client,
                agency_contracts: updatedContracts,
                agency_contract_date: primary ? primary.contract_date : null,
                agency_contract_property_id: primary ? primary.property_id : null,
                has_agency_contract: activeList.length > 0,
                updated_at: new Date().toISOString()
            };
            dispatch({ type: 'UPDATE_CLIENT', client: updatedClient });
            toast.success('Агентский договор удален');
            if (editingContractId === contractId) {
                setIsContractModalOpen(false);
            }
        }
    }

    function handleCreateDocumentForContract(contract) {
        const prop = state.properties.find(p => p.id === contract.property_id) || myProperties[0];
        let template = 'agency_sale_1';
        let sellerId = id;
        let buyerId = '';

        if (contract.type === 'АД Покупка' || contract.type === 'АД ЮСС Покупка') {
            template = 'yuss_buy_1';
            sellerId = '';
            buyerId = id;
        } else if (contract.type === 'АД Продажа' || contract.type === 'АД ЮСС Продажа') {
            template = 'agency_sale_1';
            sellerId = id;
            buyerId = '';
        } else if (contract.type === 'АД Найм с наймодателем' || contract.type === 'АД Аренда с наймодателем' || contract.type === 'АД Аренда с арендодателем') {
            template = 'agency_rent_landlord_1';
            sellerId = id;
            buyerId = '';
        } else if (contract.type === 'АД Найм с нанимателем' || contract.type === 'АД Аренда с нанимателем' || contract.type === 'АД Аренда с арендатором') {
            template = 'rent';
            sellerId = '';
            buyerId = id;
        } else if (contract.type?.includes('3-сторонний') || contract.type?.includes('3 сторонний') || contract.type === 'ДОУ Аренда / найм (3-сторонний)') {
            template = 'services_rent_3party';
            sellerId = '';
            buyerId = id;
        }

        navigate('/documents', {
            state: {
                docPrefill: {
                    sellerId,
                    buyerId,
                    propertyId: prop?.id || '',
                    template,
                    contractId: contract.id,
                    contractType: contract.type,
                    contractDate: contract.contract_date,
                    hideOtherTemplates: true,
                }
            }
        });
    }

    function handleCreateDocument() {
        const firstActive = activeContracts[0] || clientContracts[0];
        if (firstActive) {
            handleCreateDocumentForContract(firstActive);
        } else {
            const isSeller = client.client_types?.some(t => ['seller', 'landlord', 'lessor'].includes(t));
            const isRent = client.client_types?.some(t => ['landlord', 'tenant', 'lessor', 'lessee'].includes(t));
            const clientProp = myProperties[0];
            navigate('/documents', {
                state: {
                    docPrefill: {
                        sellerId: isSeller ? id : '',
                        buyerId: isSeller ? '' : id,
                        propertyId: clientProp?.id || '',
                        template: isRent ? 'rent' : (isSeller ? 'agency_sale_1' : 'yuss_buy_1'),
                        hideOtherTemplates: true,
                    }
                }
            });
        }
    }

    function copyToClipboard(text, label = 'Скопировано в буфер') {
        if (!text) return;
        navigator.clipboard.writeText(String(text))
            .then(() => toast.success(label))
            .catch(() => toast.error('Не удалось скопировать'));
    }

    function openEditAuthModal() {
        const ap = client.authorized_person || {};
        const existingClientId = client.authorized_person_id || ap.client_id || (authPersonClient?.id) || null;
        setAuthModalMode(existingClientId ? 'select' : (ap.name ? 'manual' : 'select'));
        setAuthModalSearch('');
        setAuthModalForm({
            client_id: existingClientId,
            name: ap.name || authPersonClient?.full_name || '',
            phone: ap.phone || (authPersonClient?.phone ? formatPhone(authPersonClient.phone, true) : ''),
            email: ap.email || authPersonClient?.email || '',
            position: ap.position || 'Генеральный директор',
            basis_document: ap.basis_document || 'Устав'
        });
        setIsAuthModalOpen(true);
    }

    function handleSaveAuthPerson(e) {
        e.preventDefault();
        let newAuthPersonId = null;
        let newAuthPerson = {
            position: authModalForm.position || 'Генеральный директор',
            basis_document: authModalForm.basis_document || 'Устав'
        };

        if (authModalMode === 'select' && authModalForm.client_id) {
            const selected = state.clients.find(c => c.id === authModalForm.client_id);
            if (!selected) {
                toast.error('Выбранный клиент не найден');
                return;
            }
            newAuthPersonId = selected.id;
            newAuthPerson = {
                ...newAuthPerson,
                client_id: selected.id,
                name: selected.full_name,
                phone: selected.phone,
                email: selected.email || ''
            };
        } else {
            if (!authModalForm.name.trim()) {
                toast.error('Укажите ФИО уполномоченного лица');
                return;
            }
            newAuthPersonId = null;
            newAuthPerson = {
                ...newAuthPerson,
                client_id: null,
                name: authModalForm.name.trim(),
                phone: stripPhone(authModalForm.phone),
                email: authModalForm.email.trim()
            };
        }

        const updatedClient = {
            ...client,
            authorized_person_id: newAuthPersonId,
            authorized_person: newAuthPerson
        };

        dispatch({ type: 'UPDATE_CLIENT', client: updatedClient });
        toast.success('Уполномоченное лицо сохранено');
        setIsAuthModalOpen(false);
    }

    function handleUnlinkAuthPerson() {
        if (window.confirm('Отвязать уполномоченное лицо от этой организации?')) {
            const updatedClient = {
                ...client,
                authorized_person_id: null,
                authorized_person: {
                    client_id: null,
                    name: '',
                    phone: '',
                    email: '',
                    position: '',
                    basis_document: ''
                }
            };
            dispatch({ type: 'UPDATE_CLIENT', client: updatedClient });
            toast.success('Уполномоченное лицо отвязано');
        }
    }

    const initial  = client.full_name?.charAt(0).toUpperCase() || '?';
    const colors   = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    const avatarBg = colors[initial.charCodeAt(0) % colors.length];

    return (
        <div className="page fade-in" style={{ background: 'var(--bg)' }}>
            {/* ── Topbar ── */}
            <div className="topbar sticky" style={{
                background: 'var(--topbar-bg)', backdropFilter: 'blur(20px) saturate(160%)',
                padding: '12px 18px', borderBottom: '1px solid var(--border-light)',
                zIndex: 1000, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <button onClick={() => navigate('/clients')} className="card-clickable" style={{
                    width: 38, height: 38, borderRadius: 12, border: '1px solid var(--border-light)',
                    background: 'var(--surface)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', color: 'var(--text)'
                }}>
                    <ChevronLeft size={18} />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text)' }}>
                        Профиль клиента
                    </span>
                    <span style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>Карточка CRM</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button 
                        className="card-clickable" 
                        onClick={handleCreateDocument}
                        title="Создать документ"
                        style={{
                            width: 38, height: 38, borderRadius: 12, border: '1px solid var(--border-light)',
                            background: 'var(--surface)', color: 'var(--primary)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', cursor: 'pointer'
                        }}
                    >
                        <FileText size={17} />
                    </button>
                    <button 
                        className="card-clickable" 
                        onClick={() => navigate(`/clients/${id}/edit`)} 
                        title="Редактировать"
                        style={{
                            width: 38, height: 38, borderRadius: 12, border: '1px solid var(--border-light)',
                            background: 'var(--surface)', color: 'var(--text)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', cursor: 'pointer'
                        }}
                    >
                        <Pencil size={17} />
                    </button>
                    <button 
                        className="card-clickable" 
                        onClick={handleDeleteClient} 
                        title="Удалить клиента"
                        style={{
                            width: 38, height: 38, borderRadius: 12, border: '1px solid rgba(239, 68, 68, 0.2)',
                            background: 'rgba(239, 68, 68, 0.06)', color: '#ef4444', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', cursor: 'pointer'
                        }}
                    >
                        <Trash2 size={17} />
                    </button>
                </div>
            </div>

            <div className="page-content" style={{ padding: '16px 18px 120px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* ── Профиль ── */}
                <div className="card" style={{
                    padding: '22px 24px',
                    border: '1px solid var(--border-light)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
                    borderRadius: 20,
                    background: 'var(--surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: 52,
                        height: 52,
                        borderRadius: 18,
                        background: 'rgba(0, 82, 255, 0.08)',
                        color: 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 18,
                        fontWeight: 700,
                        marginBottom: 10,
                        border: '1px solid rgba(0, 82, 255, 0.15)'
                    }}>
                        {(client.full_name || 'К').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div style={{ fontSize: 21, fontWeight: 600, color: 'var(--text)', marginBottom: 6, letterSpacing: '-0.01em' }}>
                        {client.full_name}
                    </div>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
                        {!isEditingTypes ? (
                            <>
                                {client.client_types?.map(t => {
                                    const isAgent = t === 'agent';
                                    const isLegal = t === 'legal_entity';
                                    return (
                                        <button
                                            key={t}
                                            onClick={() => setIsEditingTypes(true)}
                                            className="card-clickable"
                                            style={{
                                                padding: '4px 10px',
                                                borderRadius: 8,
                                                fontSize: 11,
                                                fontWeight: 500,
                                                background: isAgent ? 'rgba(16, 185, 129, 0.1)' : (isLegal ? 'rgba(2, 132, 199, 0.1)' : 'var(--bg-light)'),
                                                color: isAgent ? '#059669' : (isLegal ? '#0284c7' : 'var(--text-secondary)'),
                                                border: isAgent ? '1px solid rgba(16, 185, 129, 0.25)' : (isLegal ? '1px solid rgba(2, 132, 199, 0.25)' : '1px solid var(--border-light)'),
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                            title="Нажмите, чтобы изменить типы"
                                        >
                                            {typeLabels[t] || t}
                                        </button>
                                    );
                                })}
                            </>
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', alignItems: 'center', background: 'var(--bg-light)', padding: '14px', borderRadius: 16, width: '100%', marginTop: 6, border: '1px solid var(--border-light)' }}>
                                <div style={{ width: '100%', fontSize: 11.5, color: 'var(--text-secondary)', marginBottom: 2, fontWeight: 500 }}>Выберите типы клиента:</div>
                                {CLIENT_TYPES.map(({ id: typeId, label }) => {
                                    const isActive = client.client_types?.includes(typeId);
                                    return (
                                        <button
                                            key={typeId}
                                            onClick={() => handleToggleType(typeId)}
                                            className="card-clickable"
                                            style={{
                                                padding: '5px 12px',
                                                borderRadius: 8,
                                                fontSize: 11.5,
                                                fontWeight: isActive ? 600 : 400,
                                                background: isActive ? 'var(--primary)' : 'var(--surface)',
                                                color: isActive ? '#fff' : 'var(--text)',
                                                border: isActive ? 'none' : '1px solid var(--border-light)',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                                <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 8 }}>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingTypes(false)}
                                        className="card-clickable"
                                        style={{
                                            padding: '6px 20px',
                                            borderRadius: 10,
                                            fontSize: 11.5,
                                            fontWeight: 600,
                                            background: '#10b981',
                                            color: '#fff',
                                            border: 'none',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 5
                                        }}
                                    >
                                        <Check size={13} /> Готово
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                        <a href={`tel:+${stripPhone(client.phone)}`} onClick={handleCall} style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 500 }}>
                            {formatPhone(client.phone)}
                        </a>
                        {client.email && (
                            <a href={`mailto:${client.email}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 11.5 }}>
                                {client.email}
                            </a>
                        )}
                        {client.source && (
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                Источник: <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{client.source}</span>
                            </div>
                        )}
                    </div>

                    {/* Спокойные кнопки связи */}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                        <a
                            href={`tel:+${stripPhone(client.phone)}`}
                            className="card-clickable"
                            onClick={handleCall}
                            title="Позвонить"
                            style={{
                                width: 40, height: 40, borderRadius: 12,
                                background: 'var(--bg-light)',
                                border: '1px solid var(--border-light)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'var(--text)'
                            }}
                        >
                            <Phone size={17} />
                        </a>
                        <a
                            href={`https://wa.me/${stripPhone(client.phone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="card-clickable"
                            title="WhatsApp"
                            style={{
                                width: 40, height: 40, borderRadius: 12,
                                background: 'rgba(34, 197, 94, 0.08)',
                                border: '1px solid rgba(34, 197, 94, 0.25)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#16a34a'
                            }}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                        </a>
                        <a
                            href={`https://t.me/+${stripPhone(client.phone)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="card-clickable"
                            title="Telegram"
                            style={{
                                width: 40, height: 40, borderRadius: 12,
                                background: 'rgba(2, 132, 199, 0.08)',
                                border: '1px solid rgba(2, 132, 199, 0.25)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#0284c7'
                            }}
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" /></svg>
                        </a>
                    </div>

                    {client.client_types?.includes('buyer') && (
                        <div style={{ marginTop: 12 }}>
                            <button
                                onClick={() => navigate(`/requests/new?client=${id}`)}
                                className="card-clickable"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 5,
                                    padding: '5px 12px',
                                    borderRadius: 8,
                                    border: '1px solid rgba(217, 119, 6, 0.25)',
                                    background: 'rgba(217, 119, 6, 0.06)',
                                    color: '#b45309',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    transition: 'opacity 0.2s'
                                }}
                            >
                                <Plus size={13} /> Создать запрос
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Компактная статистика ── */}
                {!client.client_types?.includes('lawyer') && (
                    <div className="card" style={{ 
                        padding: '14px 16px', 
                        border: '1px solid var(--border-light)', 
                        boxShadow: '0 2px 12px rgba(0,0,0,0.02)', 
                        borderRadius: 18, 
                        background: 'var(--surface)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-around' 
                    }}>
                        {/* Комиссия */}
                        <div 
                            className="card-clickable" 
                            onClick={() => navigate('/tasks')} 
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minWidth: 0, textAlign: 'center' }}
                            title={`${formatNumber(totalCommission)} ₽`}
                        >
                            <div style={{ fontSize: 16, fontWeight: 600, color: '#059669', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                                {formatNumber(totalCommission)} ₽
                            </div>
                            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>Комиссия</div>
                        </div>

                        {/* Разделитель */}
                        <div style={{ width: 1, height: 26, background: 'var(--border-light)', flexShrink: 0 }} />

                        {/* Объектов */}
                        <div 
                            className="card-clickable" 
                            onClick={() => navigate(`/properties?client=${id}`)} 
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minWidth: 0, textAlign: 'center' }}
                        >
                            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>{myProperties.length}</div>
                            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>Объектов</div>
                        </div>

                        {/* Разделитель */}
                        <div style={{ width: 1, height: 26, background: 'var(--border-light)', flexShrink: 0 }} />

                        {/* Запросов */}
                        <div 
                            className="card-clickable" 
                            onClick={() => navigate(`/requests?client=${id}`)} 
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minWidth: 0, textAlign: 'center' }}
                        >
                            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>{myRequests.length}</div>
                            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>Запросов</div>
                        </div>

                        {/* Разделитель */}
                        <div style={{ width: 1, height: 26, background: 'var(--border-light)', flexShrink: 0 }} />

                        {/* Сделок */}
                        <div 
                            className="card-clickable" 
                            onClick={() => navigate('/tasks')} 
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minWidth: 0, textAlign: 'center' }}
                        >
                            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>{myDeals.length}</div>
                            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>Сделок</div>
                        </div>
                    </div>
                )}

                {/* ── Реквизиты организации (для юридических лиц) ── */}
                {isLegalEntity && (
                    <div className="card" style={{
                        padding: '20px 22px',
                        border: '1px solid var(--border-light)',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
                        borderRadius: 20,
                        background: 'var(--surface)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: 11,
                                    background: 'rgba(2, 132, 199, 0.1)',
                                    color: '#0284c7',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <Building2 size={19} />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                                            Реквизиты организации
                                        </span>
                                        <span style={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            padding: '2px 7px',
                                            borderRadius: 6,
                                            background: 'rgba(2, 132, 199, 0.08)',
                                            color: '#0284c7',
                                            border: '1px solid rgba(2, 132, 199, 0.2)'
                                        }}>
                                            Юрлицо
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                        {client.company_details?.short_name || client.full_name}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate(`/clients/${id}/edit`)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    padding: '6px 12px',
                                    borderRadius: 10,
                                    border: '1px solid var(--border-light)',
                                    background: 'var(--bg-light)',
                                    color: 'var(--text)',
                                    fontSize: 11.5,
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                            >
                                <Pencil size={12} /> Редактировать
                            </button>
                        </div>

                        {/* Сетка реквизитов */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: 12,
                            padding: 14,
                            background: 'var(--bg-light)',
                            borderRadius: 14
                        }}>
                            <div>
                                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                                    ИНН
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                                        {client.company_details?.inn || client.inn || '—'}
                                    </span>
                                    {(client.company_details?.inn || client.inn) && (
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(client.company_details?.inn || client.inn, 'ИНН скопирован')}
                                            title="Скопировать ИНН"
                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, display: 'inline-flex' }}
                                        >
                                            <Copy size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                                    КПП
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                                        {client.company_details?.kpp || '—'}
                                    </span>
                                    {client.company_details?.kpp && (
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(client.company_details?.kpp, 'КПП скопирован')}
                                            title="Скопировать КПП"
                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, display: 'inline-flex' }}
                                        >
                                            <Copy size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                                    ОГРН / ОГРНИП
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                                        {client.company_details?.ogrn || '—'}
                                    </span>
                                    {client.company_details?.ogrn && (
                                        <button
                                            type="button"
                                            onClick={() => copyToClipboard(client.company_details?.ogrn, 'ОГРН скопирован')}
                                            title="Скопировать ОГРН"
                                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2, display: 'inline-flex' }}
                                        >
                                            <Copy size={13} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                                    Руководитель
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginTop: 4 }}>
                                    {client.company_details?.director_name || '—'}
                                </div>
                                {client.company_details?.director_position && (
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                        {client.company_details.director_position}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Адреса */}
                        {((client.company_details?.legal_address || client.reg_address) || client.company_details?.actual_address) && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                                {(client.company_details?.legal_address || client.reg_address) && (
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'var(--text)' }}>
                                        <MapPin size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                                        <div>
                                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Юр. адрес: </span>
                                            <span>{client.company_details?.legal_address || client.reg_address}</span>
                                        </div>
                                    </div>
                                )}
                                {client.company_details?.actual_address && client.company_details.actual_address !== (client.company_details?.legal_address || client.reg_address) && (
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'var(--text)' }}>
                                        <MapPin size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 2 }} />
                                        <div>
                                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Факт. адрес: </span>
                                            <span>{client.company_details.actual_address}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Банковские реквизиты */}
                        {(client.bank_details?.bank_name || client.bank_details?.bik || client.bank_details?.account) && (
                            <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                                    <Landmark size={14} color="var(--primary)" /> Банковские реквизиты
                                </div>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: 10,
                                    fontSize: 12,
                                    background: 'var(--bg-light)',
                                    padding: 12,
                                    borderRadius: 14
                                }}>
                                    {client.bank_details.bank_name && (
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Банк: </span>
                                            <span style={{ fontWeight: 500, color: 'var(--text)' }}>{client.bank_details.bank_name}</span>
                                        </div>
                                    )}
                                    {client.bank_details.bik && (
                                        <div>
                                            <span style={{ color: 'var(--text-muted)' }}>БИК: </span>
                                            <span style={{ fontWeight: 500, color: 'var(--text)' }}>{client.bank_details.bik}</span>
                                            <button
                                                type="button"
                                                onClick={() => copyToClipboard(client.bank_details.bik, 'БИК скопирован')}
                                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 6 }}
                                            >
                                                <Copy size={11} />
                                            </button>
                                        </div>
                                    )}
                                    {client.bank_details.account && (
                                        <div>
                                            <span style={{ color: 'var(--text-muted)' }}>Р/с: </span>
                                            <span style={{ fontWeight: 500, color: 'var(--text)' }}>{client.bank_details.account}</span>
                                            <button
                                                type="button"
                                                onClick={() => copyToClipboard(client.bank_details.account, 'Расчетный счет скопирован')}
                                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: 6 }}
                                            >
                                                <Copy size={11} />
                                            </button>
                                        </div>
                                    )}
                                    {client.bank_details.corr_account && (
                                        <div>
                                            <span style={{ color: 'var(--text-muted)' }}>К/с: </span>
                                            <span style={{ fontWeight: 500, color: 'var(--text)' }}>{client.bank_details.corr_account}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Уполномоченное лицо / Представитель (для юрлиц) ── */}
                {isLegalEntity && (
                    <div className="card" style={{
                        padding: '20px 22px',
                        border: '1px solid var(--border-light)',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
                        borderRadius: 20,
                        background: 'var(--surface)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: 11,
                                    background: (authPersonClient || client.authorized_person?.name) ? 'rgba(2, 132, 199, 0.12)' : 'var(--bg-light)',
                                    color: (authPersonClient || client.authorized_person?.name) ? '#0284c7' : 'var(--text-muted)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <UserCheck size={19} />
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                                            Уполномоченное лицо
                                        </span>
                                        {(authPersonClient || client.authorized_person?.name) && (
                                            <span style={{
                                                fontSize: 11,
                                                fontWeight: 600,
                                                padding: '2px 7px',
                                                borderRadius: 6,
                                                background: 'rgba(2, 132, 199, 0.08)',
                                                color: '#0284c7',
                                                border: '1px solid rgba(2, 132, 199, 0.2)'
                                            }}>
                                                {authPersonClient ? 'Привязано физлицо' : 'Указано вручную'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {(authPersonClient || client.authorized_person?.name) && (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        type="button"
                                        onClick={openEditAuthModal}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '8px 14px',
                                            borderRadius: 12,
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                            color: '#fff',
                                            fontSize: 12,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)'
                                        }}
                                    >
                                        <Pencil size={13} /> Изменить
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleUnlinkAuthPerson}
                                        title="Отвязать представителя"
                                        style={{
                                            width: 36,
                                            height: 36,
                                            borderRadius: 12,
                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                            background: 'rgba(239, 68, 68, 0.08)',
                                            color: '#ef4444',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Unlink2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {(authPersonClient || client.authorized_person?.name) ? (
                            <div style={{
                                background: 'var(--bg-light)',
                                borderRadius: 18,
                                padding: 16,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 12
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{
                                            width: 42,
                                            height: 42,
                                            borderRadius: 14,
                                            background: '#0284c7',
                                            color: '#fff',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 600,
                                            fontSize: 15
                                        }}>
                                            {(authPersonClient?.full_name || client.authorized_person?.name || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                                                    {authPersonClient?.full_name || client.authorized_person?.name}
                                                </span>
                                                {authPersonClient && (
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/clients/${authPersonClient.id}`)}
                                                        title="Открыть карточку физлица"
                                                        style={{
                                                            border: 'none',
                                                            background: 'transparent',
                                                            color: '#0284c7',
                                                            cursor: 'pointer',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4,
                                                            fontSize: 12,
                                                            fontWeight: 500,
                                                            padding: 0
                                                        }}
                                                    >
                                                        Профиль <ExternalLink size={12} />
                                                    </button>
                                                )}
                                            </div>
                                            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                                {client.authorized_person?.position || 'Генеральный директор'}
                                                {client.authorized_person?.basis_document && (
                                                    <span style={{ color: 'var(--text-muted)' }}> • на основании: {client.authorized_person.basis_document}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {(authPersonClient?.phone || client.authorized_person?.phone) && (
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                            <a
                                                href={`tel:+${stripPhone(authPersonClient?.phone || client.authorized_person?.phone)}`}
                                                className="card-clickable"
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                    padding: '8px 14px',
                                                    borderRadius: 12,
                                                    background: 'var(--surface)',
                                                    color: 'var(--text)',
                                                    textDecoration: 'none',
                                                    fontSize: 12,
                                                    fontWeight: 500,
                                                    border: '1px solid var(--border-light)'
                                                }}
                                            >
                                                <Phone size={14} color="var(--primary)" />
                                                {formatPhone(authPersonClient?.phone || client.authorized_person?.phone)}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                background: 'var(--bg-light)',
                                borderRadius: 20,
                                padding: '24px 20px',
                                textAlign: 'center',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 12
                            }}>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                    Представитель еще не назначен
                                </div>
                                <button
                                    type="button"
                                    className="card-clickable"
                                    onClick={openEditAuthModal}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '8px 18px',
                                        borderRadius: 12,
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                        color: '#fff',
                                        fontSize: 13,
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)'
                                    }}
                                >
                                    <Plus size={15} /> Назначить представителя
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Представитель в организациях (для физлиц, уполномоченных за юрлица) ── */}
                {representedCompanies.length > 0 && (
                    <div className="card" style={{
                        padding: '22px 24px',
                        border: 'none',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.03)',
                        borderRadius: 28,
                        background: 'var(--surface)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: 14,
                                background: 'rgba(2, 132, 199, 0.12)',
                                color: '#0284c7',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <Building2 size={22} />
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <span className="font-oswald" style={{ fontSize: 18, fontWeight: 500, color: 'var(--text)' }}>
                                        Представитель организаций
                                    </span>
                                    <span style={{
                                        fontSize: 11,
                                        fontWeight: 600,
                                        padding: '3px 8px',
                                        borderRadius: 8,
                                        background: 'rgba(2, 132, 199, 0.1)',
                                        color: '#0284c7',
                                        border: '1px solid rgba(2, 132, 199, 0.25)'
                                    }}>
                                        {representedCompanies.length} {representedCompanies.length === 1 ? 'компания' : 'компаний'}
                                    </span>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                    Данный клиент является уполномоченным лицом в следующих организациях:
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {representedCompanies.map(comp => (
                                <div
                                    key={comp.id}
                                    className="card-clickable"
                                    onClick={() => navigate(`/clients/${comp.id}`)}
                                    style={{
                                        padding: '14px 16px',
                                        borderRadius: 16,
                                        background: 'var(--bg-light)',
                                        border: '1px solid var(--border-light)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: 12,
                                        cursor: 'pointer'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                                        <div style={{
                                            width: 38,
                                            height: 38,
                                            borderRadius: 12,
                                            background: 'rgba(2, 132, 199, 0.15)',
                                            color: '#0284c7',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            <Building2 size={20} />
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {comp.company_details?.short_name || comp.full_name}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                                {(comp.company_details?.inn || comp.inn) && `ИНН: ${comp.company_details?.inn || comp.inn}`}
                                                {comp.authorized_person?.position && ` • ${comp.authorized_person.position}`}
                                                {comp.authorized_person?.basis_document && ` (${comp.authorized_person.basis_document})`}
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Агентские договоры ── */}
                <div className="card" style={{
                    padding: '20px 22px',
                    border: '1px solid var(--border-light)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
                    borderRadius: 20,
                    background: 'var(--surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                                width: 38, height: 38, borderRadius: 11,
                                background: activeContracts.length > 0 ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-light)',
                                color: activeContracts.length > 0 ? '#10b981' : 'var(--text-muted)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <FileText size={19} />
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                                        Агентские договоры
                                    </span>
                                    {activeContracts.length > 0 && (
                                        <span style={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            padding: '2px 7px',
                                            borderRadius: 6,
                                            background: '#ecfdf5',
                                            color: '#059669',
                                            border: '1px solid #10b98140'
                                        }}>
                                            {activeContracts.length} в работе
                                        </span>
                                    )}
                                    {fulfilledContracts.length > 0 && (
                                        <span style={{
                                            fontSize: 11,
                                            fontWeight: 600,
                                            padding: '2px 7px',
                                            borderRadius: 6,
                                            background: 'rgba(16, 185, 129, 0.1)',
                                            color: '#059669',
                                            border: '1px solid rgba(16, 185, 129, 0.3)'
                                        }}>
                                            {fulfilledContracts.length} исполнен
                                        </span>
                                    )}
                                    {activeContracts.length === 0 && fulfilledContracts.length === 0 && clientContracts.length > 0 && (
                                        <span style={{
                                            fontSize: 11,
                                            fontWeight: 500,
                                            padding: '2px 7px',
                                            borderRadius: 6,
                                            background: 'var(--bg-light)',
                                            color: 'var(--text-muted)',
                                            border: '1px solid var(--border-light)'
                                        }}>
                                            Архив
                                        </span>
                                    )}
                                </div>
                                {clientContracts.length > 0 && (
                                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                                        Договоры по объектам клиента
                                    </div>
                                )}
                            </div>
                        </div>

                        {clientContracts.length > 0 && (
                            <button
                                type="button"
                                className="card-clickable"
                                onClick={openAddContractModal}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    padding: '6px 12px', borderRadius: 10, border: 'none',
                                    background: 'var(--primary)',
                                    color: '#fff', fontSize: 11.5, fontWeight: 500, cursor: 'pointer',
                                    boxShadow: '0 1px 4px rgba(0,82,255,0.15)'
                                }}
                            >
                                <Plus size={13} /> Добавить
                            </button>
                        )}
                    </div>

                    {/* Предупреждение о соблюдении сроков договоров и напоминание за 7 дней */}
                    {clientAlerts.needsAttention && (
                        <div style={{
                            padding: '12px 16px',
                            borderRadius: 16,
                            background: clientAlerts.hasExpired 
                                ? 'rgba(239, 68, 68, 0.08)' 
                                : (clientAlerts.hasUrgentExpiring ? 'rgba(245, 158, 11, 0.14)' : 'rgba(245, 158, 11, 0.08)'),
                            border: clientAlerts.hasExpired 
                                ? '1px solid rgba(239, 68, 68, 0.35)' 
                                : (clientAlerts.hasUrgentExpiring ? '1.5px solid rgba(245, 158, 11, 0.45)' : '1px solid rgba(245, 158, 11, 0.3)'),
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12
                        }}>
                            <AlertTriangle 
                                size={20} 
                                color={clientAlerts.hasExpired ? '#ef4444' : '#d97706'} 
                                style={{ flexShrink: 0, marginTop: 1 }} 
                            />
                            <div style={{ flex: 1, fontSize: 12, lineHeight: 1.5 }}>
                                <div style={{ 
                                    fontWeight: 700, 
                                    color: clientAlerts.hasExpired ? '#dc2626' : (clientAlerts.hasUrgentExpiring ? '#b45309' : '#d97706'), 
                                    marginBottom: 2 
                                }}>
                                    {clientAlerts.hasExpired 
                                        ? 'Внимание: есть истёкшие агентские договоры!' 
                                        : (clientAlerts.hasUrgentExpiring 
                                            ? '🔔 Срочное напоминание: осталось менее 7 дней до окончания АД!' 
                                            : 'Внимание: приближается окончание срока действия договора!')}
                                </div>
                                <div style={{ color: 'var(--text-secondary)' }}>
                                    {clientAlerts.hasExpired
                                        ? 'Согласно регламенту, продление договора допускается строго 1 раз на тот же срок. Если продление уже использовано, необходимо оформить перезаключение.'
                                        : (clientAlerts.hasUrgentExpiring 
                                            ? 'Срок действия договора истекает в течение 7 дней! Необходимо срочно переподписать новый договор или продлить действующий (если продление еще не использовано).'
                                            : 'Срок договора истекает в течение 14 дней. Подготовьте продление или переподписание договора.')}
                                </div>
                            </div>
                        </div>
                    )}

                    {clientContracts.length === 0 ? (
                        <div style={{
                            background: 'var(--bg-light)',
                            padding: '24px 20px',
                            borderRadius: 20,
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 12
                        }}>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                Договоры еще не заключены
                            </div>
                            <button
                                type="button"
                                className="card-clickable"
                                onClick={openAddContractModal}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '9px 18px', borderRadius: 12, border: 'none',
                                    background: 'linear-gradient(135deg, #0052ff 0%, #0041cc 100%)',
                                    color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(0,82,255,0.25)'
                                }}
                            >
                                <Plus size={15} /> Заключить договор
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {clientContracts.map(c => {
                                const typeCfg = getContractTypeConfig(c.type);
                                const info = getContractStatusInfo(c, new Date(), { deals: state.deals, client });
                                const isTerminated = c.status === 'terminated' || c.status === 'closed';
                                const contractProp = state.properties.find(p => p.id === c.property_id);
                                return (
                                    <div
                                        key={c.id}
                                        style={{
                                            background: 'var(--bg-light)',
                                            borderRadius: 18,
                                            padding: '14px 16px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 10,
                                            border: info?.isFulfilled
                                                ? '1.5px solid rgba(16, 185, 129, 0.35)'
                                                : (info?.isOverdue
                                                    ? '1.5px solid rgba(239, 68, 68, 0.4)'
                                                    : info?.isUrgentReSign
                                                        ? '1.5px solid rgba(245, 158, 11, 0.45)'
                                                        : (isTerminated ? '1px dashed var(--border-light)' : '1px solid var(--border-light)')),
                                            opacity: isTerminated ? 0.75 : 1
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                <span style={{
                                                    fontSize: 12,
                                                    fontWeight: 600,
                                                    padding: '3px 10px',
                                                    borderRadius: 8,
                                                    background: typeCfg.bg,
                                                    color: typeCfg.color,
                                                    border: `1px solid ${typeCfg.border}`
                                                }}>
                                                    {c.type || 'АД Продажа'}
                                                </span>
                                                {/* Expiry / Fulfilled Badge */}
                                                {info?.badge && (
                                                    <span style={{
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        padding: '2px 8px',
                                                        borderRadius: 6,
                                                        background: info.badge.bg,
                                                        color: info.badge.color,
                                                        border: `1px solid ${info.badge.border}`,
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4
                                                    }}>
                                                        {info.isFulfilled && <CheckCircle2 size={12} />}
                                                        {info.isUrgentReSign && <Clock size={12} />}
                                                        {info.badge.label}
                                                    </span>
                                                )}
                                                {/* Prolongation Badge (only if NOT fulfilled and NOT terminated) */}
                                                {!isTerminated && !info?.isFulfilled && (
                                                    <span style={{
                                                        fontSize: 10,
                                                        fontWeight: 600,
                                                        padding: '2px 7px',
                                                        borderRadius: 6,
                                                        background: info?.isExtended ? 'rgba(124, 58, 237, 0.1)' : 'var(--surface)',
                                                        color: info?.isExtended ? '#7c3aed' : 'var(--text-muted)',
                                                        border: info?.isExtended ? '1px solid rgba(124, 58, 237, 0.25)' : '1px solid var(--border-light)'
                                                    }}>
                                                        {info?.isExtended ? 'Продлен 1 раз (макс.)' : 'Доступно 1 продление'}
                                                    </span>
                                                )}
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                {/* Button: Продлить (+X мес) if not extended yet & NOT fulfilled */}
                                                {info?.canExtend && !info?.isFulfilled && (
                                                    <button
                                                        type="button"
                                                        className="card-clickable"
                                                        onClick={() => handleExtendContract(c.id)}
                                                        style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: 5,
                                                            padding: '6px 11px', borderRadius: 10,
                                                            border: '1px solid #10b981', background: '#ecfdf5',
                                                            color: '#059669', fontSize: 11, fontWeight: 600, cursor: 'pointer'
                                                        }}
                                                        title={`Продлить договор на тот же срок (+${info.durationMonths} мес.). Допускается строго 1 раз.`}
                                                    >
                                                        <RotateCw size={12} /> Продлить (+{info.durationMonths} мес.)
                                                    </button>
                                                )}

                                                {/* Button: Перезаключить / Переподписать if expired or 7-day reminder */}
                                                {!info?.isFulfilled && (info?.needsRenewal || info?.isOverdue || info?.isUrgentReSign || (info?.isExpiring && info?.isExtended)) && (
                                                    <button
                                                        type="button"
                                                        className="card-clickable"
                                                        onClick={() => handleRenewContract(c)}
                                                        style={{
                                                            display: 'inline-flex', alignItems: 'center', gap: 5,
                                                            padding: '6px 12px', borderRadius: 10, border: 'none',
                                                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                            color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                                            boxShadow: '0 2px 6px rgba(245,158,11,0.25)'
                                                        }}
                                                        title="Переподписать новый агентский договор с клиентом"
                                                    >
                                                        <Plus size={13} /> {info?.isUrgentReSign ? 'Переподписать АД' : 'Перезаключить'}
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    className="card-clickable"
                                                    onClick={() => handleCreateDocumentForContract(c)}
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 5,
                                                        padding: '6px 11px', borderRadius: 10, border: 'none',
                                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                        color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                                        boxShadow: '0 2px 6px rgba(16,185,129,0.2)'
                                                    }}
                                                    title="Сформировать печатный документ"
                                                >
                                                    <FileText size={13} /> Документ
                                                </button>
                                                <button
                                                    type="button"
                                                    className="card-clickable"
                                                    onClick={() => openEditContractModal(c)}
                                                    style={{
                                                        padding: '6px 10px', borderRadius: 10,
                                                        border: '1px solid var(--border-light)', background: 'var(--surface)',
                                                        color: 'var(--text)', fontSize: 11, fontWeight: 500, cursor: 'pointer',
                                                        display: 'inline-flex', alignItems: 'center', gap: 4
                                                    }}
                                                    title="Редактировать договор"
                                                >
                                                    <Pencil size={13} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="card-clickable"
                                                    onClick={() => handleDeleteContract(c.id)}
                                                    style={{
                                                        padding: '6px 8px', borderRadius: 10,
                                                        border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.06)',
                                                        color: '#ef4444', cursor: 'pointer',
                                                        display: 'inline-flex', alignItems: 'center'
                                                    }}
                                                    title="Удалить договор"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Contract Dates Row */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-secondary)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                                                <span>Заключен: <strong style={{ color: 'var(--text)' }}>{formatContractDate(info?.startDate)}</strong></span>
                                            </div>
                                            {info?.isFulfilled ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#059669', fontWeight: 600 }}>
                                                    <CheckCircle2 size={13} />
                                                    <span>Исполнен по закрытой сделке (пролонгация не требуется)</span>
                                                </div>
                                            ) : (
                                                <>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                        <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                                                        <span>Действует до: <strong style={{ color: info?.isOverdue ? '#dc2626' : (info?.isExpiring ? '#d97706' : 'var(--text)') }}>{formatContractDate(info?.endDate)}</strong></span>
                                                    </div>
                                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                        (срок: {info?.durationMonths} мес.{info?.isExtended ? ` + ${info.durationMonths} мес. продл.` : ''})
                                                    </span>
                                                </>
                                            )}
                                        </div>

                                        {/* Warning strip if expired or expiring (with 7-day reminder) */}
                                        {info?.warning && !info?.isFulfilled && (
                                            <div style={{
                                                padding: '8px 12px',
                                                borderRadius: 10,
                                                background: info.isOverdue 
                                                    ? 'rgba(239, 68, 68, 0.08)' 
                                                    : (info.isUrgentReSign ? 'rgba(245, 158, 11, 0.14)' : 'rgba(245, 158, 11, 0.08)'),
                                                border: info.isOverdue 
                                                    ? '1px solid rgba(239, 68, 68, 0.25)' 
                                                    : (info.isUrgentReSign ? '1.5px solid rgba(245, 158, 11, 0.45)' : '1px solid rgba(245, 158, 11, 0.25)'),
                                                color: info.isOverdue ? '#dc2626' : '#b45309',
                                                fontSize: 11,
                                                lineHeight: 1.45,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 8
                                            }}>
                                                <Clock size={14} style={{ flexShrink: 0, color: info.isOverdue ? '#dc2626' : '#d97706' }} />
                                                <span style={{ flex: 1 }}>{info.warning}</span>
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                                            <Home size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                            <span style={{ color: 'var(--text-muted)' }}>Объект:</span>
                                            {contractProp ? (
                                                <span
                                                    onClick={() => navigate(`/properties/${contractProp.id}`)}
                                                    style={{
                                                        fontWeight: 600,
                                                        color: 'var(--primary)',
                                                        cursor: 'pointer',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4
                                                    }}
                                                >
                                                    {contractProp.address || contractProp.city}
                                                    {contractProp.price ? ` · ${formatNumber(contractProp.price)} ₽` : ''}
                                                    <ChevronRight size={13} />
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                                    {c.property_id ? `ID: ${c.property_id}` : 'Без привязки к конкретному объекту'}
                                                </span>
                                            )}
                                        </div>

                                        {c.comment && (
                                            <div style={{
                                                fontSize: 11,
                                                color: 'var(--text-secondary)',
                                                background: 'var(--surface)',
                                                padding: '6px 10px',
                                                borderRadius: 8,
                                                border: '1px solid var(--border-light)'
                                            }}>
                                                <span style={{ fontWeight: 600, color: 'var(--text)' }}>Примечание: </span>
                                                {c.comment}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                {!client.client_types?.includes('lawyer') && (
                    <div className="card" style={{
                        padding: '20px 22px',
                        border: '1px solid var(--border-light)',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
                        borderRadius: 20,
                        background: 'var(--surface)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Последняя активность</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button
                                    className="card-clickable"
                                    onClick={() => openQuickModal('meeting')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 5,
                                        padding: '5px 12px', borderRadius: 10,
                                        background: 'rgba(124, 58, 237, 0.08)',
                                        color: '#7c3aed',
                                        border: '1px solid rgba(124, 58, 237, 0.25)',
                                        fontSize: 11.5, fontWeight: 500, cursor: 'pointer'
                                    }}
                                    title="Быстро добавить встречу"
                                >
                                    <Calendar size={13} /> + Встреча
                                </button>
                                <button
                                    className="card-clickable"
                                    onClick={() => openQuickModal('call')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 5,
                                        padding: '5px 12px', borderRadius: 10,
                                        background: 'rgba(0, 82, 255, 0.08)',
                                        color: 'var(--primary)',
                                        border: '1px solid rgba(0, 82, 255, 0.25)',
                                        fontSize: 11.5, fontWeight: 500, cursor: 'pointer'
                                    }}
                                    title="Быстро добавить звонок"
                                >
                                    <Phone size={13} /> + Звонок
                                </button>
                                <button className="icon-btn" onClick={() => navigate(`/history/new?client_id=${id}`)} title="Добавить другое событие" style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid var(--border-light)' }}>
                                    <Plus size={15} />
                                </button>
                            </div>
                        </div>

                        {activeProperties.length === 0 && myRequests.length === 0 && myShowings.length === 0 ? (
                            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, opacity: 0.6 }}>Активности пока нет</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                                {/* События / Встречи / Звонки / Показы */}
                                {myShowings.map(s => {
                                    const prop = state.properties.find(p => p.id === s.property_id);
                                    const isCall = s.event_type === 'call';
                                    const isMeeting = s.event_type === 'meeting';
                                    const iconBg = isCall ? '#eff6ff' : isMeeting ? '#f5f3ff' : '#ecfdf5';
                                    const iconColor = isCall ? '#3b82f6' : isMeeting ? '#8b5cf6' : '#10b981';
                                    const IconComp = isCall ? Phone : (isMeeting ? Calendar : Home);
                                    const dateStr = s.showing_date ? new Date(s.showing_date).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
                                    const typeTitle = eventTypeLabels[s.event_type] || 'Событие';
                                    const statusText = getEventStatusLabel(s.event_type, s.status);

                                    return (
                                        <div key={s.id} className="card-clickable" onClick={() => navigate(`/history`)}
                                            style={{ padding: '14px 16px', background: 'var(--bg-light)', borderRadius: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: iconColor }}>
                                                    <IconComp size={16} />
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <div style={{ fontSize: 10, fontWeight: 300, color: iconColor }}>
                                                            {typeTitle} · {statusText}
                                                        </div>
                                                    </div>
                                                    <div style={{ fontSize: 14, fontWeight: 300 }}>
                                                        {dateStr ? dateStr : 'Дата не указана'} {prop ? `(${prop.address || prop.city})` : ''}
                                                    </div>
                                                    {s.feedback_comment && (
                                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 200 }}>
                                                            {s.feedback_comment}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronRight size={16} color="var(--text-muted)" />
                                        </div>
                                    );
                                })}

                                {/* Объекты в продаже (все статусы кроме sold/deal_closed) */}
                                {activeProperties.map(p => {
                                    const propStatusLabel = { active: 'В продаже', reserved: 'Резерв', new: 'Новый' };
                                    const propStatusColor = { active: 'var(--primary)', reserved: '#f59e0b', new: '#10b981' };
                                    return (
                                        <div key={p.id} className="card-clickable" onClick={() => navigate(`/properties/${p.id}`)}
                                            style={{ padding: '14px 16px', background: 'var(--bg-light)', borderRadius: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                                                    <Home size={16} />
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: 10, fontWeight: 300, color: propStatusColor[p.status] || 'var(--primary)' }}>
                                                        {propStatusLabel[p.status] || 'Объект в продаже'}
                                                    </div>
                                                    <div style={{ fontSize: 14, fontWeight: 300 }}>{p.address || p.city}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 200 }}>{p.price ? formatNumber(p.price) + ' ₽' : ''}</div>
                                                </div>
                                            </div>
                                            <ChevronRight size={16} color="var(--text-muted)" />
                                        </div>
                                    );
                                })}

                                {/* Запросы на покупку */}
                                {myRequests.map(r => (
                                    <div key={r.id} className="card-clickable" onClick={() => navigate(`/requests/${r.id}`)}
                                        style={{ padding: '14px 16px', background: 'var(--bg-light)', borderRadius: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                                                <FileText size={16} />
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{ fontSize: 10, fontWeight: 300, color: '#f59e0b' }}>Запрос на покупку</span>
                                                    <span style={{ 
                                                        fontSize: 9, 
                                                        padding: '1px 6px', 
                                                        borderRadius: 6, 
                                                        background: (r.status || 'active') === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                                                        color: (r.status || 'active') === 'active' ? '#10b981' : '#64748b'
                                                    }}>
                                                        {(r.status || 'active') === 'active' ? 'Актуально' : 'Завершен'}
                                                    </span>
                                                </div>
                                                <div style={{ fontSize: 14, fontWeight: 300 }}>{r.property_types?.map(t => PROPERTY_TYPES[t] || t).join(', ') || 'Любой тип'}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 200 }}>до {r.budget_max ? formatNumber(r.budget_max) + ' ₽' : '—'}</div>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} color="var(--text-muted)" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Модальное окно быстрого создания встречи/звонка ── */}
                {quickModalType && (
                    <div
                        className="modal-overlay fade-in"
                        onClick={() => setQuickModalType(null)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'var(--modal-bg, rgba(0,0,0,0.5))',
                            backdropFilter: 'blur(8px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 2000,
                            padding: 16
                        }}
                    >
                        <div
                            className="modal-content fade-up"
                            onClick={e => e.stopPropagation()}
                            style={{
                                background: 'var(--surface)',
                                borderRadius: 24,
                                padding: 24,
                                width: '100%',
                                maxWidth: 440,
                                boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                                border: '1px solid var(--border-light)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 12,
                                        background: quickModalType === 'meeting' ? '#f5f3ff' : '#eff6ff',
                                        color: quickModalType === 'meeting' ? '#8b5cf6' : '#3b82f6',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {quickModalType === 'meeting' ? <Calendar size={20} /> : <Phone size={20} />}
                                    </div>
                                    <div>
                                        <div className="font-oswald" style={{ fontSize: 18, fontWeight: 500, color: 'var(--text)' }}>
                                            {quickModalType === 'meeting' ? 'Запланировать встречу' : 'Запланировать звонок'}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Клиент: {client.full_name}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setQuickModalType(null)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleQuickSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                                        Дата и время *
                                    </label>
                                    <input
                                        type="datetime-local"
                                        className="form-input"
                                        required
                                        value={quickForm.showing_date}
                                        onChange={e => setQuickForm({ ...quickForm, showing_date: e.target.value })}
                                        style={{ width: '100%', height: 46, borderRadius: 14, border: '1px solid var(--border-light)', padding: '0 14px', background: 'var(--bg-light)', color: 'var(--text)' }}
                                    />
                                </div>

                                {myProperties.length > 0 && (
                                    <div>
                                        <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                                            Объект недвижимости {myProperties.length > 1 ? `(${myProperties.length})` : ''}
                                        </label>
                                        <select
                                            className="form-select"
                                            value={quickForm.property_id || ''}
                                            onChange={e => setQuickForm({ ...quickForm, property_id: e.target.value })}
                                            style={{ width: '100%', height: 46, borderRadius: 14, border: '1px solid var(--border-light)', padding: '0 14px', background: 'var(--bg-light)', color: 'var(--text)' }}
                                        >
                                            <option value="">— Без объекта —</option>
                                            {myProperties.map(p => (
                                                <option key={p.id} value={p.id}>{p.address} ({(p.price || 0).toLocaleString()} ₽)</option>
                                            ))}
                                        </select>
                                    </div>
                                )}                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                                        Статус
                                    </label>
                                    <select
                                        className="form-select"
                                        value={quickForm.status}
                                        onChange={e => setQuickForm({ ...quickForm, status: e.target.value })}
                                        style={{ width: '100%', height: 46, borderRadius: 14, border: '1px solid var(--border-light)', padding: '0 14px', background: 'var(--bg-light)', color: 'var(--text)' }}
                                    >
                                        <option value="planned">Запланировано</option>
                                        <option value="completed">{quickModalType === 'meeting' ? 'Состоялась' : 'Совершен'}</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                                        Комментарий / Заметка
                                    </label>
                                    <textarea
                                        className="form-textarea"
                                        rows={3}
                                        placeholder={quickModalType === 'meeting' ? 'Тема или детали встречи...' : 'Заметка к звонку...'}
                                        value={quickForm.feedback_comment}
                                        onChange={e => setQuickForm({ ...quickForm, feedback_comment: e.target.value })}
                                        style={{ width: '100%', borderRadius: 14, border: '1px solid var(--border-light)', padding: '10px 14px', background: 'var(--bg-light)', color: 'var(--text)', resize: 'none' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                    <button
                                        type="button"
                                        onClick={() => setQuickModalType(null)}
                                        style={{ flex: 1, height: 46, borderRadius: 14, border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text)', fontWeight: 500, cursor: 'pointer' }}
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        type="submit"
                                        style={{
                                            flex: 1.5, height: 46, borderRadius: 14, border: 'none',
                                            background: quickModalType === 'meeting' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                            color: '#fff', fontWeight: 600, cursor: 'pointer',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                        }}
                                    >
                                        Добавить в календарь
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* ── Сделки клиента ───────────────────────────────── */}
                <div className="card" style={{
                    padding: '20px 22px',
                    border: '1px solid var(--border-light)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
                    borderRadius: 20,
                    background: 'var(--surface)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                            Сделки {client.client_types?.includes('lawyer') && `(${myDeals.length})`}
                        </div>
                        {!client.client_types?.includes('lawyer') && (
                            <button className="card-clickable" onClick={handleCreateDeal} style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '6px 12px', borderRadius: 10,
                                background: 'rgba(16, 185, 129, 0.08)',
                                color: '#059669',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                fontSize: 11.5, fontWeight: 500, cursor: 'pointer'
                            }}>
                                <Briefcase size={13} /> Создать сделку
                            </button>
                        )}
                    </div>

                    {myDeals.length === 0 ? (
                        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, opacity: 0.7 }}>
                            Сделок пока нет
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {myDeals.map(d => {
                                const prop = state.properties.find(p => p.id === d.property_id);
                                const color = dealStatusColor[d.status] || 'var(--primary)';
                                const sellerIds = d.seller_ids || (d.seller_id ? [d.seller_id] : []);
                                const buyerIds  = d.buyer_ids  || (d.buyer_id  ? [d.buyer_id]  : []);
                                
                                let roleLabel = 'Участник';
                                if (d.lawyer_id === id) {
                                    roleLabel = 'Юрист';
                                } else if (d.seller_agent_id === id || d.buyer_agent_id === id) {
                                    roleLabel = 'Агент';
                                } else if (sellerIds.includes(id)) {
                                    roleLabel = 'Продавец';
                                } else if (buyerIds.includes(id)) {
                                    roleLabel = 'Покупатель';
                                } else if (client?.client_types?.includes('lawyer')) {
                                    roleLabel = 'Юрист';
                                } else if (client?.client_types?.includes('agent')) {
                                    roleLabel = 'Агент';
                                }

                                const dealHasContract = Boolean(
                                    d.has_agency_contract || 
                                    d.agency_contract_date || 
                                    (hasAgencyContract && (client.agency_contract_property_id === d.property_id || !client.agency_contract_property_id))
                                );
                                const dealContractDate = d.agency_contract_date || (dealHasContract ? client.agency_contract_date : null);

                                return (
                                    <div key={d.id} className="card-clickable" onClick={() => navigate('/tasks')}
                                        style={{ padding: '12px 14px', background: 'var(--bg-light)', borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                                                <Briefcase size={15} />
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    <div style={{ fontSize: 10, fontWeight: 500, color }}>
                                                        {dealStatusLabel[d.status] || 'Сделка'} · {roleLabel}
                                                    </div>
                                                    {dealHasContract ? (
                                                        <span style={{ fontSize: 10, fontWeight: 600, color: '#10b981', background: '#ecfdf5', padding: '1px 6px', borderRadius: 6, border: '1px solid rgba(16,185,129,0.25)' }}>
                                                            АД {dealContractDate ? `от ${formatDate(dealContractDate)}` : 'заключен'}
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontSize: 10, fontWeight: 500, color: '#ef4444', background: 'rgba(239,68,68,0.06)', padding: '1px 6px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.2)' }}>
                                                            Без АД
                                                        </span>
                                                    )}
                                                </div>
                                                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)' }}>{d.title}</div>
                                                {d.price > 0 && (
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatNumber(d.price)} ₽</div>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight size={15} color="var(--text-muted)" />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ── Блок проверки по госреестрам (ФССП, МВД, Федресурс, ФНС) ── */}
                <div className="card" style={{
                    padding: '18px 22px',
                    border: '1px solid var(--border-light)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.02)',
                    borderRadius: 20,
                    background: 'var(--surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 14
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 38, height: 38, borderRadius: 11,
                            background: 'rgba(16, 185, 129, 0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#10b981', flexShrink: 0
                        }}>
                            <ShieldCheck size={20} />
                        </div>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
                                Проверка благонадёжности
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                                ФССП (долги), МВД (паспорт), Федресурс (банкротство), ФНС и нотариат
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleStartVerification}
                        className="card-clickable"
                        style={{
                            padding: '8px 16px',
                            borderRadius: 10,
                            border: 'none',
                            background: '#10b981',
                            color: '#ffffff',
                            fontSize: 12.5,
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            cursor: 'pointer',
                            boxShadow: '0 1px 4px rgba(16,185,129,0.2)',
                            width: 'auto'
                        }}
                    >
                        <ShieldCheck size={15} />
                        <span>Проверить в ФССП, МВД</span>
                    </button>
                </div>

                {/* ── Кнопка удаления клиента ── */}
                <button
                    onClick={handleDeleteClient}
                    className="card-clickable client-delete-btn"
                    style={{
                        padding: '8px 18px',
                        borderRadius: 10,
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        background: 'transparent',
                        color: '#ef4444',
                        fontWeight: 500,
                        fontSize: 12,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        marginTop: 6,
                        maxWidth: 200,
                        alignSelf: 'center',
                        width: 'auto'
                    }}
                >
                    <Trash2 size={14} />
                    <span>Удалить клиента</span>
                </button>
            </div>

            {/* Диалог предупреждения о недостающих реквизитах */}
            {showMissingModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 10000,
                    background: 'rgba(15, 23, 42, 0.65)',
                    backdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 16, animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        borderRadius: 24,
                        maxWidth: 480, width: '100%',
                        padding: '24px',
                        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
                        border: '1px solid var(--border-light)',
                        display: 'flex', flexDirection: 'column', gap: 16
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: 14,
                                background: 'rgba(245, 158, 11, 0.12)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#d97706', flexShrink: 0
                            }}>
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="font-oswald" style={{ fontSize: 18, fontWeight: 500, margin: 0, color: 'var(--text)' }}>
                                    Не хватает реквизитов
                                </h3>
                                <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                                    Для полной проверки по базам ФССП и МВД рекомендуются:
                                </p>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--bg-light)', padding: '14px 16px', borderRadius: 16 }}>
                            {missingRequisites.map((item, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)' }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                                    <span>{item}</span>
                                </div>
                            ))}
                        </div>

                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                            Вы можете заполнить реквизиты в профиле клиента или продолжить проверку по имеющемуся ФИО.
                        </p>

                        <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowMissingModal(false);
                                    navigate(`/clients/${id}/edit`);
                                }}
                                style={{
                                    flex: 1, minWidth: 160, padding: '10px 16px', borderRadius: 12, border: 'none',
                                    background: 'var(--primary)', color: '#ffffff',
                                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    boxShadow: '0 2px 8px rgba(0, 82, 255, 0.25)'
                                }}
                            >
                                <Pencil size={14} />
                                <span>Заполнить реквизиты</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowMissingModal(false);
                                    setIsVerificationOpen(true);
                                }}
                                style={{
                                    flex: 1, minWidth: 140, padding: '10px 16px', borderRadius: 12,
                                    border: '1px solid var(--border-light)',
                                    background: 'var(--bg-light)', color: 'var(--text)',
                                    fontSize: 13, fontWeight: 500, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                }}
                            >
                                <ExternalLink size={14} />
                                <span>Всё равно проверить</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно добавления/редактирования агентского договора */}
            {isContractModalOpen && (
                <div
                    className="modal-overlay fade-in"
                    onClick={() => setIsContractModalOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'var(--modal-bg, rgba(0,0,0,0.5))',
                        backdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000,
                        padding: 16
                    }}
                >
                    <div
                        className="modal-content fade-up"
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'var(--surface)',
                            borderRadius: 24,
                            padding: 24,
                            width: '100%',
                            maxWidth: 520,
                            maxHeight: '90vh',
                            overflowY: 'auto',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                            border: '1px solid var(--border-light)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 40, height: 40, borderRadius: 12,
                                    background: '#ecfdf5',
                                    color: '#10b981',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <div className="font-oswald" style={{ fontSize: 18, fontWeight: 500, color: 'var(--text)' }}>
                                        {editingContractId ? 'Редактировать агентский договор' : 'Добавить агентский договор'}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Клиент: {client.full_name}</div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsContractModalOpen(false)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveContract} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                                    Тип договора *
                                </label>
                                <select
                                    className="form-select"
                                    required
                                    value={contractForm.type}
                                    onChange={e => setContractForm({ ...contractForm, type: e.target.value })}
                                    style={{ width: '100%', height: 46, borderRadius: 14, border: '1px solid var(--border-light)', padding: '0 14px', background: 'var(--bg-light)', color: 'var(--text)', fontWeight: 500 }}
                                >
                                    {AGENCY_CONTRACT_TYPES.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                                        Дата заключения *
                                    </label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        required
                                        value={contractForm.date}
                                        onChange={e => setContractForm({ ...contractForm, date: e.target.value })}
                                        style={{ width: '100%', height: 46, borderRadius: 14, border: '1px solid var(--border-light)', padding: '0 14px', background: 'var(--bg-light)', color: 'var(--text)' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                                        Срок действия *
                                    </label>
                                    <select
                                        className="form-select"
                                        value={contractForm.duration_months}
                                        onChange={e => setContractForm({ ...contractForm, duration_months: Number(e.target.value) })}
                                        style={{ width: '100%', height: 46, borderRadius: 14, border: '1px solid var(--border-light)', padding: '0 14px', background: 'var(--bg-light)', color: 'var(--text)' }}
                                    >
                                        {CONTRACT_DURATION_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Блок продления договора (правило: 1 раз на тот же срок) */}
                            <div style={{
                                padding: '12px 14px',
                                borderRadius: 14,
                                background: contractForm.is_extended ? 'rgba(124, 58, 237, 0.06)' : 'var(--bg-light)',
                                border: contractForm.is_extended ? '1px solid rgba(124, 58, 237, 0.25)' : '1px solid var(--border-light)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6
                            }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                                    <input
                                        type="checkbox"
                                        checked={contractForm.is_extended}
                                        onChange={e => setContractForm({ ...contractForm, is_extended: e.target.checked })}
                                        style={{ width: 18, height: 18, accentColor: '#7c3aed', cursor: 'pointer' }}
                                    />
                                    <span>Продлен на тот же срок (+{contractForm.duration_months} мес.)</span>
                                </label>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 28, lineHeight: 1.4 }}>
                                    Регламент: продление возможно <strong>строго 1 раз</strong> на тот же срок. Если продление уже использовано, требуется перезаключение.
                                </div>
                                {contractForm.date && (
                                    <div style={{ fontSize: 11, fontWeight: 600, color: contractForm.is_extended ? '#7c3aed' : '#059669', paddingLeft: 28, marginTop: 2 }}>
                                        Окончание договора: {formatContractDate(calculateContractEndDate(contractForm.date, contractForm.duration_months, contractForm.is_extended))}
                                        {contractForm.is_extended ? ' (с учётом продления)' : ''}
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                                        Статус договора
                                    </label>
                                    <select
                                        className="form-select"
                                        value={contractForm.status}
                                        onChange={e => setContractForm({ ...contractForm, status: e.target.value })}
                                        style={{ width: '100%', height: 46, borderRadius: 14, border: '1px solid var(--border-light)', padding: '0 14px', background: 'var(--bg-light)', color: 'var(--text)' }}
                                    >
                                        <option value="active">Действующий</option>
                                        <option value="fulfilled">Исполнен</option>
                                        <option value="closed">Закрыт</option>
                                        {contractForm.status === 'terminated' && <option value="terminated">Закрыт (архив)</option>}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                                    По какому объекту
                                </label>
                                <select
                                    className="form-select"
                                    value={contractForm.property_id}
                                    onChange={e => setContractForm({ ...contractForm, property_id: e.target.value })}
                                    style={{ width: '100%', height: 46, borderRadius: 14, border: '1px solid var(--border-light)', padding: '0 14px', background: 'var(--bg-light)', color: 'var(--text)' }}
                                >
                                    <option value="">-- Без привязки к конкретному объекту --</option>
                                    {myProperties.length > 0 && (
                                        <optgroup label="Объекты клиента">
                                            {myProperties.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.address || p.city} {p.price ? `(${formatNumber(p.price)} ₽)` : ''}
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                    <optgroup label="Все объекты в базе">
                                        {state.properties
                                            .filter(p => !myProperties.some(mp => mp.id === p.id))
                                            .map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.address || p.city} {p.price ? `(${formatNumber(p.price)} ₽)` : ''}
                                                </option>
                                            ))}
                                    </optgroup>
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                                    Примечание / Номер договора
                                </label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Например: №14/24 или особые условия комиссии"
                                    value={contractForm.comment}
                                    onChange={e => setContractForm({ ...contractForm, comment: e.target.value })}
                                    style={{ width: '100%', height: 46, borderRadius: 14, border: '1px solid var(--border-light)', padding: '0 14px', background: 'var(--bg-light)', color: 'var(--text)' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                                {editingContractId && (
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteContract(editingContractId)}
                                        style={{
                                            height: 46, padding: '0 14px', borderRadius: 14,
                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                            background: 'rgba(239, 68, 68, 0.08)',
                                            color: '#ef4444', fontWeight: 500, cursor: 'pointer'
                                        }}
                                        title="Удалить этот договор"
                                    >
                                        Удалить
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setIsContractModalOpen(false)}
                                    style={{ flex: 1, height: 46, borderRadius: 14, border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text)', fontWeight: 500, cursor: 'pointer' }}
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        flex: 1.5, height: 46, borderRadius: 14, border: 'none',
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        color: '#fff', fontWeight: 600, cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(16,185,129,0.2)'
                                    }}
                                >
                                    Сохранить
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Модальное окно назначения/редактирования уполномоченного лица */}
            {isAuthModalOpen && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
                }}>
                    <div style={{
                        background: 'var(--surface)', borderRadius: 24, width: '100%', maxWidth: 520,
                        maxHeight: '90vh', overflowY: 'auto',
                        padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                        border: '1px solid var(--border-light)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <UserCheck size={20} />
                                </div>
                                <div>
                                    <h3 className="font-oswald" style={{ margin: 0, fontSize: 18, fontWeight: 500, color: 'var(--text)' }}>
                                        Уполномоченное лицо
                                    </h3>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                        {client.company_details?.short_name || client.full_name}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsAuthModalOpen(false)}
                                style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Переключатель способа привязки */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, background: 'var(--bg-light)', padding: 4, borderRadius: 12 }}>
                            <button
                                type="button"
                                onClick={() => setAuthModalMode('select')}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: 10,
                                    border: 'none',
                                    background: authModalMode === 'select' ? 'var(--surface)' : 'transparent',
                                    color: authModalMode === 'select' ? '#0284c7' : 'var(--text-secondary)',
                                    fontWeight: authModalMode === 'select' ? 600 : 400,
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    boxShadow: authModalMode === 'select' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6
                                }}
                            >
                                <Link2 size={14} /> Из базы клиентов
                            </button>
                            <button
                                type="button"
                                onClick={() => setAuthModalMode('manual')}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: 10,
                                    border: 'none',
                                    background: authModalMode === 'manual' ? 'var(--surface)' : 'transparent',
                                    color: authModalMode === 'manual' ? '#0284c7' : 'var(--text-secondary)',
                                    fontWeight: authModalMode === 'manual' ? 600 : 400,
                                    fontSize: 12,
                                    cursor: 'pointer',
                                    boxShadow: authModalMode === 'manual' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6
                                }}
                            >
                                Ввести вручную
                            </button>
                        </div>

                        <form onSubmit={handleSaveAuthPerson} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {authModalMode === 'select' ? (
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                                        Физическое лицо из базы *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Поиск по ФИО или телефону..."
                                        value={authModalSearch}
                                        onChange={e => setAuthModalSearch(e.target.value)}
                                        style={{ width: '100%', height: 42, borderRadius: 12, border: '1px solid var(--border-light)', padding: '0 12px', background: 'var(--bg-light)', color: 'var(--text)', fontSize: 13, marginBottom: 8 }}
                                    />
                                    <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid var(--border-light)', borderRadius: 12, padding: 8, background: 'var(--bg-light)' }}>
                                        {availablePhysicalClients
                                            .filter(c => {
                                                if (!authModalSearch) return true;
                                                const q = authModalSearch.toLowerCase();
                                                return (c.full_name || '').toLowerCase().includes(q) || (c.phone || '').includes(q);
                                            })
                                            .slice(0, 30)
                                            .map(c => {
                                                const isSelected = authModalForm.client_id === c.id;
                                                return (
                                                    <div
                                                        key={c.id}
                                                        onClick={() => setAuthModalForm(prev => ({
                                                            ...prev,
                                                            client_id: c.id,
                                                            name: c.full_name,
                                                            phone: c.phone || '',
                                                            email: c.email || ''
                                                        }))}
                                                        style={{
                                                            padding: '8px 12px',
                                                            borderRadius: 10,
                                                            background: isSelected ? 'rgba(2, 132, 199, 0.15)' : 'var(--surface)',
                                                            border: isSelected ? '1px solid #0284c7' : '1px solid var(--border-light)',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between'
                                                        }}
                                                    >
                                                        <div>
                                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                                                                {c.full_name}
                                                            </div>
                                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                                {c.phone ? formatPhone(c.phone) : 'Без телефона'}
                                                            </div>
                                                        </div>
                                                        {isSelected && <Check size={16} color="#0284c7" />}
                                                    </div>
                                                );
                                            })}
                                        {availablePhysicalClients.length === 0 && (
                                            <div style={{ padding: 12, textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                                                Нет доступных физических лиц
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                                            ФИО представителя *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Иванов Иван Иванович"
                                            value={authModalForm.name}
                                            onChange={e => setAuthModalForm({ ...authModalForm, name: e.target.value })}
                                            style={{ width: '100%', height: 42, borderRadius: 12, border: '1px solid var(--border-light)', padding: '0 12px', background: 'var(--bg-light)', color: 'var(--text)', fontSize: 13 }}
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                        <div>
                                            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                                                Телефон
                                            </label>
                                            <input
                                                type="tel"
                                                placeholder="+7 (999) 000-00-00"
                                                value={authModalForm.phone}
                                                onChange={e => setAuthModalForm({ ...authModalForm, phone: formatPhone(e.target.value, true) })}
                                                style={{ width: '100%', height: 42, borderRadius: 12, border: '1px solid var(--border-light)', padding: '0 12px', background: 'var(--bg-light)', color: 'var(--text)', fontSize: 13 }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                placeholder="director@company.ru"
                                                value={authModalForm.email}
                                                onChange={e => setAuthModalForm({ ...authModalForm, email: e.target.value })}
                                                style={{ width: '100%', height: 42, borderRadius: 12, border: '1px solid var(--border-light)', padding: '0 12px', background: 'var(--bg-light)', color: 'var(--text)', fontSize: 13 }}
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                                        Должность
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Генеральный директор"
                                        value={authModalForm.position}
                                        onChange={e => setAuthModalForm({ ...authModalForm, position: e.target.value })}
                                        style={{ width: '100%', height: 42, borderRadius: 12, border: '1px solid var(--border-light)', padding: '0 12px', background: 'var(--bg-light)', color: 'var(--text)', fontSize: 13 }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                                        Основание полномочий
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Устав / Доверенность"
                                        value={authModalForm.basis_document}
                                        onChange={e => setAuthModalForm({ ...authModalForm, basis_document: e.target.value })}
                                        style={{ width: '100%', height: 42, borderRadius: 12, border: '1px solid var(--border-light)', padding: '0 12px', background: 'var(--bg-light)', color: 'var(--text)', fontSize: 13 }}
                                    />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                                <button
                                    type="button"
                                    onClick={() => setIsAuthModalOpen(false)}
                                    style={{ flex: 1, height: 44, borderRadius: 14, border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text)', fontWeight: 500, cursor: 'pointer' }}
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    disabled={authModalMode === 'select' && !authModalForm.client_id}
                                    style={{
                                        flex: 1.5, height: 44, borderRadius: 14, border: 'none',
                                        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                        color: '#fff', fontWeight: 600, cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                                        opacity: (authModalMode === 'select' && !authModalForm.client_id) ? 0.5 : 1
                                    }}
                                >
                                    Сохранить
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Модальное окно проверки клиента по госреестрам и отчета */}
            <ClientVerificationModal
                isOpen={isVerificationOpen}
                onClose={() => setIsVerificationOpen(false)}
                client={client}
            />
        </div>
    );
}
