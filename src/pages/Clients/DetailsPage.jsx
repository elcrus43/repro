import React, { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { formatPhone, stripPhone, formatNumber, getEventStatusLabel, toLocalISOString, parseLocalDateTime, formatDate, formatPriceInput, parsePriceInput, parsePgArray } from '../../utils/format';
import { PROPERTY_TYPES, AGENCY_CONTRACT_TYPES, CLIENT_TYPES, CLIENT_TYPE_LABELS } from '../../data/constants';
import { nanoid } from '../../utils/nanoid';
import { ClientVerificationModal } from '../../components/ClientVerificationModal';
import { CrossServiceModal } from '../../components/CrossServiceModal';
import { getCrossServiceTemplate, getCrossServiceStatusMeta, formatCrossServiceShareText } from '../../data/crossServices';
import { hasPassedDealStage } from '../../utils/matching';
import {
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Archive,
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
    CheckCircle2,
    Users,
    BookUser,
    Search,
    Cake,
    Sparkles,
    Target,
    Download
} from 'lucide-react';
import { SelectionPresentationModal } from '../../components/SelectionPresentationModal';
import { saveClientToDevice } from '../../lib/contactsSync';
import { BirthdayGreetingModal } from '../../components/BirthdayGreetingModal';
import { getBirthdayInfo } from '../../utils/birthdayGreetingGenerator';
import {
    DEFAULT_CONTRACT_DURATION_MONTHS,
    CONTRACT_DURATION_OPTIONS,
    calculateContractEndDate,
    formatContractDate,
    getContractStatusInfo,
    getClientContractAlerts,
    getContractTypeConfig
} from '../../utils/contractTerms';
import {
    CLIENT_PIPELINE_STAGES,
    getClientPipelineStage
} from '../../utils/clientPipeline';
import { useDevelopmentsCatalog } from '../../hooks/useDevelopmentsCatalog';
import { matchDevelopmentsToRequest } from '../../lib/developmentMatching';

const EXCLUDED_PROP_STATUSES = ['sold', 'deal_closed', 'deal'];
const EXCLUDED_MATCH_STATUSES = ['deal', 'rejected'];

export function DetailsPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast } = useToastContext();
    const { developments } = useDevelopmentsCatalog();
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
    const [isBirthdayModalOpen, setIsBirthdayModalOpen] = useState(false);
    const [isContractModalOpen, setIsContractModalOpen] = useState(false);
    const [editingContractId, setEditingContractId] = useState(null);
    const [renewingContractId, setRenewingContractId] = useState(null);
    const [showArchivedContracts, setShowArchivedContracts] = useState(false);
    const [isSyncingContact, setIsSyncingContact] = useState(false);
    const [isLinkPropertyModalOpen, setIsLinkPropertyModalOpen] = useState(false);
    const [propertySearch, setPropertySearch] = useState('');
    const [isPresentationOpen, setIsPresentationOpen] = useState(false);
    const [contractForm, setContractForm] = useState({
        contract_number: '',
        type: 'АД Продажа',
        date: '',
        valid_until: '',
        duration_months: DEFAULT_CONTRACT_DURATION_MONTHS,
        is_extended: false,
        property_id: '',
        price: '',
        commission: '',
        status: 'active',
        comment: '',
        co_client_ids: []
    });

    const clientBirthdayInfo = useMemo(() => {
        return getBirthdayInfo(client?.birth_date || client?.passport_details?.birth_date);
    }, [client?.birth_date, client?.passport_details?.birth_date]);

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

    const activeContracts = useMemo(() => clientContracts.filter(c => c && c.status !== 'terminated' && c.status !== 'cancelled' && c.status !== 'closed' && !c.archived && c.status !== 'fulfilled' && c.status !== 'executed'), [clientContracts]);
    const fulfilledContracts = useMemo(() => clientContracts.filter(c => c && (c.status === 'fulfilled' || c.status === 'executed')), [clientContracts]);
    const archivedContracts = useMemo(() => clientContracts.filter(c => c && (c.status === 'terminated' || c.status === 'cancelled' || c.status === 'closed' || Boolean(c.archived))), [clientContracts]);
    const mainContracts = useMemo(() => clientContracts.filter(c => c && c.status !== 'terminated' && c.status !== 'cancelled' && c.status !== 'closed' && !c.archived), [clientContracts]);

    const clientAlerts = useMemo(() => {
        return getClientContractAlerts(client, new Date(), { deals: state.deals });
    }, [client, state.deals]);

    // Состояние для юридического лица и уполномоченного лица
    const isLegalEntity = client?.client_types?.includes('legal_entity');
    const [crossServiceModal, setCrossServiceModal] = useState({ open: false, item: null });
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
    // Объекты в продаже - все кроме sold / deal_closed
    const activeProperties = myProperties.filter(p => !EXCLUDED_PROP_STATUSES.includes(p.status));

    const isSellerOrLandlord = useMemo(() => {
        return (client?.client_types || []).some(t =>
            ['seller', 'landlord', 'lessor', 'owner'].includes(t)
        );
    }, [client?.client_types]);

    const isLandlord = useMemo(() => {
        return (client?.client_types || []).some(t =>
            ['landlord', 'lessor'].includes(t)
        );
    }, [client?.client_types]);

    const isBuyerOrTenant = useMemo(() => {
        return (client?.client_types || []).some(t =>
            ['buyer', 'tenant'].includes(t)
        );
    }, [client?.client_types]);

    const unlinkedProperties = useMemo(() => {
        const myPropIds = new Set(myProperties.map(p => p.id));
        let list = (state.properties || []).filter(p => !myPropIds.has(p.id));
        if (propertySearch.trim()) {
            const q = propertySearch.toLowerCase().trim();
            list = list.filter(p =>
                (p.address || '').toLowerCase().includes(q) ||
                (p.city || '').toLowerCase().includes(q) ||
                (p.title || '').toLowerCase().includes(q) ||
                String(p.price || '').includes(q)
            );
        }
        return list.slice(0, 60);
    }, [state.properties, myProperties, propertySearch]);

    const myRequests = state.requests.filter(r =>
        r.client_id === id || (r.client_ids || []).includes(id)
    );

    const mySelectionItems = useMemo(() => {
        const items = state.selectionItems || [];
        return items.filter(item => {
            const itemClientIds = item.client_ids && item.client_ids.length > 0
                ? item.client_ids
                : (item.client_id ? [item.client_id] : []);
            return itemClientIds.includes(id);
        });
    }, [state.selectionItems, id]);

    // Матчи - все кроме deal / rejected, и объект не должен пройти этап сделки
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
            case 'completed':
            case 'deal_closed':
                return 'completed';
            case 'search':
            case 'request':
            case 'selection':
                return 'selection';
            case 'active':
            case 'deposit':
            case 'deal':
            case 'agreement':
            case 'paused':
            default:
                return 'active';
        }
    };

    const statusLabels = {
        new: 'Не отработан',
        control: 'На контроле',
        selection: 'Подбор',
        active: 'В работе',
        completed: 'Сделка закрыта',
        deal_closed: 'Сделка закрыта',
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
        const updatedClient = { ...client, status: newStatus, updated_at: new Date().toISOString() };
        dispatch({ type: 'UPDATE_CLIENT', client: updatedClient });
        toast.success(`Статус изменен на "${statusLabels[newStatus] || newStatus}"`);
    }

    function handlePipelineStageChange(stageId) {
        const targetStage = CLIENT_PIPELINE_STAGES.find(s => s.id === stageId);
        if (!targetStage) return;
        const currentStageId = getClientPipelineStage(client, {
            deals: state.deals,
            properties: state.properties,
            showings: state.showings
        });
        if (currentStageId === stageId && client.status === targetStage.statusValue) return;

        const updatedClient = {
            ...client,
            status: targetStage.statusValue,
            pipeline_stage: targetStage.id,
            updated_at: new Date().toISOString()
        };
        dispatch({ type: 'UPDATE_CLIENT', client: updatedClient });
        toast.success(`Воронка: этап изменён на «${targetStage.label}»`);
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

    function openAddContractModal() {
        setEditingContractId(null);
        setRenewingContractId(null);
        let defaultType = 'АД Продажа';
        const types = client?.client_types || [];
        if (types.some(t => ['landlord', 'lessor'].includes(t))) {
            defaultType = 'АД Аренда с наймодателем';
        } else if (types.some(t => ['tenant', 'lessee'].includes(t))) {
            defaultType = 'АД Аренда с нанимателем';
        } else if (types.includes('buyer')) {
            defaultType = 'АД Покупка';
        }
        const todayStr = new Date().toISOString().split('T')[0];
        const initialEnd = calculateContractEndDate(todayStr, DEFAULT_CONTRACT_DURATION_MONTHS, false);
        const endStr = initialEnd ? initialEnd.toISOString().split('T')[0] : '';
        const firstProp = myProperties[0] || null;

        const firstOwners = firstProp ? parsePgArray(firstProp.client_ids) : [];
        const initCoIds = firstOwners.length > 1 ? Array.from(new Set([id, ...firstOwners])) : [id];
        setContractForm({
            id: null,
            contract_number: '',
            type: defaultType,
            date: todayStr,
            valid_until: endStr,
            duration_months: DEFAULT_CONTRACT_DURATION_MONTHS,
            is_extended: false,
            property_id: firstProp?.id || '',
            price: firstProp?.price ? formatPriceInput(firstProp.price) : '',
            commission: '',
            status: 'active',
            comment: '',
            co_client_ids: initCoIds
        });
        setIsContractModalOpen(true);
    }

    function openEditContractModal(c) {
        setEditingContractId(c.id);
        setRenewingContractId(null);
        let startDateStr = '';
        if (c.contract_date) {
            try {
                startDateStr = c.contract_date.split('T')[0];
            } catch {
                startDateStr = '';
            }
        }
        let endDateStr = '';
        if (c.valid_until) {
            try {
                endDateStr = c.valid_until.split('T')[0];
            } catch {
                endDateStr = '';
            }
        } else if (startDateStr) {
            const dMonths = Number(c.duration_months) || DEFAULT_CONTRACT_DURATION_MONTHS;
            const isExt = Boolean(c.is_extended || c.extension_count > 0);
            const autoEnd = calculateContractEndDate(startDateStr, dMonths, isExt);
            if (autoEnd) endDateStr = autoEnd.toISOString().split('T')[0];
        }

        let commStr = c.commission || '';
        if (commStr && !commStr.includes('%') && !commStr.includes('₽')) {
            const d = parsePriceInput(commStr);
            if (d) commStr = `${formatPriceInput(d)} ₽`;
        }

        const initCoIds = Array.isArray(c.co_client_ids) && c.co_client_ids.length > 0
            ? Array.from(new Set(c.co_client_ids.map(String)))
            : [id];

        setContractForm({
            id: c.id,
            contract_number: c.contract_number || '',
            type: c.type || 'АД Продажа',
            date: startDateStr || new Date().toISOString().split('T')[0],
            valid_until: endDateStr,
            duration_months: Number(c.duration_months) || DEFAULT_CONTRACT_DURATION_MONTHS,
            is_extended: Boolean(c.is_extended || c.extension_count > 0),
            property_id: c.property_id || '',
            price: c.price ? formatPriceInput(c.price) : '',
            commission: commStr,
            status: c.status || 'active',
            comment: c.comment || '',
            co_client_ids: initCoIds
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

        const extendItem = (c) => ({
            ...c,
            duration_months: duration,
            is_extended: true,
            extension_count: 1,
            extended_at: nowIso,
            valid_until: newValidUntil ? newValidUntil.toISOString() : null,
            updated_at: nowIso
        });

        const updatedContracts = clientContracts.map(c => c.id === contractId ? extendItem(c) : c);

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

        if (target.group_id) {
            state.clients.forEach(sib => {
                if (sib.id === client.id) return;
                const sibList = Array.isArray(sib.agency_contracts) ? sib.agency_contracts : [];
                if (!sibList.some(sc => sc.group_id === target.group_id)) return;
                const sibUpdated = sibList.map(sc => sc.group_id === target.group_id ? extendItem(sc) : sc);
                const sibActive = sibUpdated.filter(c => c && c.status !== 'terminated' && c.status !== 'closed' && c.status !== 'fulfilled');
                const sibPrimary = sibActive[0] || sibUpdated[0] || null;
                dispatch({
                    type: 'UPDATE_CLIENT',
                    client: {
                        ...sib,
                        agency_contracts: sibUpdated,
                        agency_contract_date: sibPrimary ? sibPrimary.contract_date : null,
                        agency_contract_property_id: sibPrimary ? sibPrimary.property_id : null,
                        has_agency_contract: sibActive.length > 0,
                        updated_at: nowIso
                    }
                });
            });
        }
        toast.success(`Договор продлен на ${duration} мес. (до ${formatContractDate(newValidUntil)}). Обратите внимание: повторное продление невозможно, далее потребуется перезаключение.`);
    }

    const buildUpdatedClientObj = (targetClient, listForClient) => {
        const nowIso = new Date().toISOString();
        const activeList = listForClient.filter(c => c && !['terminated', 'cancelled', 'closed', 'fulfilled', 'executed'].includes(c.status) && !c.archived);
        const primary = activeList[0] || listForClient[0] || null;
        let nextStatus = targetClient.status;
        let nextStage = targetClient.pipeline_stage;
        if (activeList.length > 0 && targetClient.status !== 'refused') {
            nextStatus = 'active';
            nextStage = 'active';
        }
        return {
            ...targetClient,
            status: nextStatus,
            ...(nextStage ? { pipeline_stage: nextStage } : {}),
            agency_contracts: listForClient,
            agency_contract_date: primary ? primary.contract_date : null,
            agency_contract_property_id: primary ? primary.property_id : null,
            has_agency_contract: activeList.length > 0,
            updated_at: nowIso
        };
    };

    function handleRenewContract(contract) {
        setEditingContractId(null);
        setRenewingContractId(contract?.id || null);
        const duration = Number(contract?.duration_months) || DEFAULT_CONTRACT_DURATION_MONTHS;
        const todayStr = new Date().toISOString().split('T')[0];
        const initialEnd = calculateContractEndDate(todayStr, duration, false);
        const endStr = initialEnd ? initialEnd.toISOString().split('T')[0] : '';
        setContractForm({
            id: null,
            renewing_contract_id: contract?.id || null,
            contract_number: '',
            type: contract?.type || 'АД Продажа',
            date: todayStr,
            valid_until: endStr,
            duration_months: duration,
            is_extended: false,
            property_id: contract?.property_id || '',
            price: contract?.price ? formatPriceInput(contract.price) : '',
            commission: contract?.commission || '',
            status: 'active',
            comment: contract?.comment ? `Перезаключение (ранее: ${contract.comment})` : 'Перезаключение договора',
            co_client_ids: Array.isArray(contract?.co_client_ids) && contract.co_client_ids.length > 0 ? contract.co_client_ids : [id]
        });
        setIsContractModalOpen(true);
        toast.info('Оформление нового договора взамен истекшего (перезаключение)');
    }

    function handleCloseContractToArchive(contract) {
        if (!contract) return;
        const nowIso = new Date().toISOString();
        const updatedContracts = clientContracts.map(c => {
            if (c.id === contract.id || (contract.group_id && c.group_id === contract.group_id)) {
                return {
                    ...c,
                    status: 'closed',
                    closed_at: nowIso,
                    closed_reason: 'manual_archive',
                    updated_at: nowIso,
                    comment: c.comment
                        ? (c.comment.includes('Архив') ? c.comment : `${c.comment} (Архив)`)
                        : 'Закрыт в архив'
                };
            }
            return c;
        });

        dispatch({ type: 'UPDATE_CLIENT', client: buildUpdatedClientObj(client, updatedContracts) });

        if (contract.group_id) {
            state.clients.forEach(sib => {
                if (sib.id === client.id) return;
                const sibList = Array.isArray(sib.agency_contracts) ? sib.agency_contracts : [];
                const hasMatch = sibList.some(sc => sc.group_id === contract.group_id && sc.status !== 'closed');
                if (hasMatch) {
                    const nextSibList = sibList.map(sc => {
                        if (sc.group_id === contract.group_id) {
                            return {
                                ...sc,
                                status: 'closed',
                                closed_at: nowIso,
                                closed_reason: 'manual_archive',
                                updated_at: nowIso,
                                comment: sc.comment
                                    ? (sc.comment.includes('Архив') ? sc.comment : `${sc.comment} (Архив)`)
                                    : 'Закрыт в архив'
                            };
                        }
                        return sc;
                    });
                    dispatch({ type: 'UPDATE_CLIENT', client: buildUpdatedClientObj(sib, nextSibList) });
                }
            });
        }
        toast.success('Договор закрыт и перемещен в архив. Напоминания отключены.');
    }

    async function handleSyncContact() {
        if (!client) return;
        setIsSyncingContact(true);
        try {
            const res = await saveClientToDevice(client);
            if (res.success) {
                if (res.mode === 'native') {
                    if (res.alreadyExists) {
                        toast.info('Контакт уже записан в телефонной книге');
                    } else {
                        toast.success(res.googleAccount 
                            ? `Контакт сохранен в Google (${res.googleAccount})` 
                            : 'Контакт сохранен в телефонную книгу');
                    }
                } else {
                    toast.success('Карточка контакта (.vcf) скачана для импорта в Google');
                }
            } else {
                toast.error(res.error || 'Не удалось сохранить контакт');
            }
        } catch (err) {
            console.error('handleSyncContact error:', err);
            toast.error('Ошибка при сохранении контакта');
        } finally {
            setIsSyncingContact(false);
        }
    }

    function handleLinkProperty(propertyToLink) {
        if (!propertyToLink || !client) return;
        const existingIds = Array.isArray(propertyToLink.client_ids)
            ? propertyToLink.client_ids
            : (propertyToLink.client_id ? [propertyToLink.client_id] : []);
        const newClientIds = Array.from(new Set([...existingIds, id]));
        const updatedProperty = {
            ...propertyToLink,
            client_ids: newClientIds,
            client_id: propertyToLink.client_id || id
        };
        dispatch({ type: 'UPDATE_PROPERTY', property: updatedProperty });

        // Если у клиента не было типа продавца / наймодателя, добавляем для консистентности
        if (!isSellerOrLandlord) {
            const updatedTypes = Array.from(new Set([...(client.client_types || []), 'seller']));
            dispatch({
                type: 'UPDATE_CLIENT',
                client: { ...client, client_types: updatedTypes }
            });
        }

        toast.success(`Объект "${propertyToLink.address || propertyToLink.city || 'Без адреса'}" привязан к клиенту`);
        setIsLinkPropertyModalOpen(false);
        setPropertySearch('');
    }

    function handleUnlinkProperty(propertyToUnlink, e) {
        if (e) e.stopPropagation();
        if (!propertyToUnlink || !client) return;
        if (!window.confirm(`Отвязать объект "${propertyToUnlink.address || 'Без адреса'}" от клиента?`)) return;

        const existingIds = Array.isArray(propertyToUnlink.client_ids)
            ? propertyToUnlink.client_ids
            : (propertyToUnlink.client_id ? [propertyToUnlink.client_id] : []);
        const newClientIds = existingIds.filter(cId => cId !== id);
        const updatedProperty = {
            ...propertyToUnlink,
            client_ids: newClientIds,
            client_id: propertyToUnlink.client_id === id ? (newClientIds[0] || null) : propertyToUnlink.client_id
        };
        dispatch({ type: 'UPDATE_PROPERTY', property: updatedProperty });
        toast.success('Объект отвязан от клиента');
    }

    async function handleImportSelectionToProperties(item) {
        if (!window.confirm('Импортировать этот объект подбора в активные объекты?')) return;
        try {
            const currentUserId = state.currentUser?.id;
            const notes = [item.notes, item.link ? `Ссылка: ${item.link}` : null]
                .filter(Boolean).join('\n');

            const newProperty = {
                realtor_id: currentUserId,
                client_id: item.client_id || id || null,
                client_ids: item.client_ids && item.client_ids.length > 0 ? item.client_ids : (item.client_id ? [item.client_id] : (id ? [id] : [])),
                status: 'meeting',
                address: item.address || '',
                price: item.price || 0,
                rooms: item.rooms !== undefined && item.rooms !== null ? Number(item.rooms) : null,
                area_total: item.area_total !== undefined && item.area_total !== null ? Number(item.area_total) : null,
                floor: item.floor !== undefined && item.floor !== null ? Number(item.floor) : null,
                floors_total: item.floors_total !== undefined && item.floors_total !== null ? Number(item.floors_total) : null,
                property_type: item.property_type || null,
                city: item.city || '',
                images: item.images || [],
                notes: notes,
                description: `Импортировано из подбора. ${item.notes || ''}`,
                contact_name: item.contact_name || null,
                contact_phone: item.contact_phone || null,
            };

            const ok = await dispatch({ type: 'ADD_PROPERTY', property: newProperty });
            if (ok !== false) {
                await dispatch({ type: 'DELETE_SELECTION_ITEM', id: item.id });
                toast.success('Объект успешно импортирован в активные!');
            }
        } catch (err) {
            console.error('[Import Error]', err);
            toast.error('Не удалось импортировать объект: ' + err.message);
        }
    }

    async function handleDeleteSelectionItem(selectionId) {
        if (!window.confirm('Удалить этот объект из подбора?')) return;
        try {
            await dispatch({ type: 'DELETE_SELECTION_ITEM', id: selectionId });
            toast.success('Объект удален из подбора');
        } catch (err) {
            toast.error('Ошибка удаления: ' + err.message);
        }
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
        
        let validUntilIso = null;
        if (contractForm.valid_until) {
            validUntilIso = contractForm.valid_until.includes('T') ? contractForm.valid_until : `${contractForm.valid_until}T00:00:00.000Z`;
        } else {
            const calculatedEnd = calculateContractEndDate(dateIso, durationMonths, isExtended);
            validUntilIso = calculatedEnd ? calculatedEnd.toISOString() : null;
        }

        const coIds = Array.from(new Set([id, ...(contractForm.co_client_ids || []).map(String)]));
        const isMulti = coIds.length > 1;
        const existingTarget = editingContractId ? clientContracts.find(c => c.id === editingContractId) : null;
        const groupId = existingTarget?.group_id || (isMulti ? `group_${nanoid()}` : null);
        const nowIso = new Date().toISOString();

        const buildContractEntry = (base) => {
            const next = {
                ...(base || {}),
                id: base?.id || nanoid(),
                contract_number: contractForm.contract_number ? contractForm.contract_number.trim() : '',
                type: contractForm.type,
                contract_date: dateIso,
                valid_until: validUntilIso,
                duration_months: durationMonths,
                is_extended: isExtended,
                extension_count: isExtended ? 1 : 0,
                extended_at: isExtended ? (base?.extended_at || nowIso) : null,
                property_id: contractForm.property_id || null,
                price: contractForm.price ? (Number(parsePriceInput(String(contractForm.price))) || null) : null,
                commission: contractForm.commission ? contractForm.commission.trim() : '',
                status: contractForm.status || 'active',
                comment: contractForm.comment ? contractForm.comment.trim() : '',
                updated_at: nowIso,
                ...(base ? {} : { created_at: nowIso }),
            };
            if (groupId) next.group_id = groupId;
            if (isMulti) next.co_client_ids = coIds;
            else delete next.co_client_ids;
            return next;
        };

        let updatedContracts;
        const renewingId = contractForm.renewing_contract_id || renewingContractId;

        if (editingContractId) {
            updatedContracts = clientContracts.map(c => (c.id === editingContractId ? buildContractEntry(c) : c));
        } else if (renewingId) {
            const newEntry = buildContractEntry(null);
            newEntry.renewed_from_id = renewingId;
            const targetRenewed = clientContracts.find(c => c.id === renewingId);
            const renewedGroupId = targetRenewed?.group_id;

            updatedContracts = [
                newEntry,
                ...clientContracts.map(c => {
                    if (c.id === renewingId || (renewedGroupId && c.group_id === renewedGroupId)) {
                        return {
                            ...c,
                            status: 'closed',
                            closed_at: nowIso,
                            closed_reason: 'renewed',
                            updated_at: nowIso,
                            comment: c.comment
                                ? (c.comment.includes('Перезаключен') ? c.comment : `${c.comment} (Перезаключен)`)
                                : 'Перезаключен (закрыт в архив)'
                        };
                    }
                    return c;
                })
            ];
        } else {
            updatedContracts = [buildContractEntry(null), ...clientContracts];
        }

        dispatch({ type: 'UPDATE_CLIENT', client: buildUpdatedClientObj(client, updatedContracts) });

        // Если перезаключался групповой договор сособственников, закрываем прежний договор и у них
        if (renewingId) {
            const targetRenewed = clientContracts.find(c => c.id === renewingId);
            const renewedGroupId = targetRenewed?.group_id;
            if (renewedGroupId) {
                state.clients.forEach(sib => {
                    if (sib.id === client.id) return;
                    const sibList = Array.isArray(sib.agency_contracts) ? sib.agency_contracts : [];
                    const hasOldGroup = sibList.some(sc => sc.group_id === renewedGroupId && sc.status !== 'closed');
                    if (hasOldGroup) {
                        const nextSibList = sibList.map(sc => {
                            if (sc.group_id === renewedGroupId) {
                                return {
                                    ...sc,
                                    status: 'closed',
                                    closed_at: nowIso,
                                    closed_reason: 'renewed',
                                    updated_at: nowIso,
                                    comment: sc.comment
                                        ? (sc.comment.includes('Перезаключен') ? sc.comment : `${sc.comment} (Перезаключен)`)
                                        : 'Перезаключен (закрыт в архив)'
                                };
                            }
                            return sc;
                        });
                        dispatch({ type: 'UPDATE_CLIENT', client: buildUpdatedClientObj(sib, nextSibList) });
                    }
                });
            }
        }

        // Синхронизируем с сособственниками (и удаляем у отвязанных при наличии group_id)
        if (groupId) {
            state.clients.forEach(sib => {
                if (sib.id === client.id) return;
                const sibList = Array.isArray(sib.agency_contracts) ? sib.agency_contracts : [];
                const isSelectedCoOwner = coIds.includes(String(sib.id));
                const existingSibIdx = sibList.findIndex(sc => sc.group_id === groupId);

                if (isSelectedCoOwner) {
                    const nextSibList = existingSibIdx >= 0
                        ? sibList.map((sc, i) => (i === existingSibIdx ? buildContractEntry(sc) : sc))
                        : [buildContractEntry(null), ...sibList];
                    dispatch({ type: 'UPDATE_CLIENT', client: buildUpdatedClientObj(sib, nextSibList) });
                } else if (existingSibIdx >= 0) {
                    const nextSibList = sibList.filter((_, i) => i !== existingSibIdx);
                    dispatch({ type: 'UPDATE_CLIENT', client: buildUpdatedClientObj(sib, nextSibList) });
                }
            });
        }

        setRenewingContractId(null);
        toast.success(editingContractId ? 'Договор обновлен' : (renewingId ? 'Новый агентский договор заключен, прежний закрыт в архив' : (isMulti ? `Агентский договор добавлен для ${coIds.length} лиц` : 'Агентский договор добавлен')));
        setIsContractModalOpen(false);
    }

    function handleDeleteContract(contractId) {
        if (window.confirm('Удалить этот агентский договор?')) {
            const target = clientContracts.find(c => c.id === contractId);
            const updatedContracts = clientContracts.filter(c => c.id !== contractId);
            const activeList = updatedContracts.filter(c => c && !['terminated', 'cancelled', 'closed', 'fulfilled', 'executed'].includes(c.status) && !c.archived);
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

            if (target?.group_id) {
                state.clients.forEach(sib => {
                    if (sib.id === client.id) return;
                    const sibList = Array.isArray(sib.agency_contracts) ? sib.agency_contracts : [];
                    if (!sibList.some(sc => sc.group_id === target.group_id)) return;
                    const nextSibList = sibList.filter(sc => sc.group_id !== target.group_id);
                    const sibActive = nextSibList.filter(c => c && c.status !== 'terminated' && c.status !== 'closed' && c.status !== 'fulfilled');
                    const sibPrimary = sibActive[0] || nextSibList[0] || null;
                    dispatch({
                        type: 'UPDATE_CLIENT',
                        client: {
                            ...sib,
                            agency_contracts: nextSibList,
                            agency_contract_date: sibPrimary ? sibPrimary.contract_date : null,
                            agency_contract_property_id: sibPrimary ? sibPrimary.property_id : null,
                            has_agency_contract: sibActive.length > 0,
                            updated_at: new Date().toISOString()
                        }
                    });
                });
            }
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

        const coIds = Array.isArray(contract.co_client_ids) && contract.co_client_ids.length > 0
            ? contract.co_client_ids.map(String)
            : [id];

        navigate('/documents', {
            state: {
                docPrefill: {
                    sellerId,
                    buyerId,
                    coPrincipalIds: coIds,
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
            const propOwners = clientProp ? parsePgArray(clientProp.client_ids).map(String) : [];
            const coIds = (isSeller && propOwners.length > 1) ? Array.from(new Set([id, ...propOwners])) : [id];
            navigate('/documents', {
                state: {
                    docPrefill: {
                        sellerId: isSeller ? id : '',
                        buyerId: isSeller ? '' : id,
                        coPrincipalIds: coIds,
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
                        onClick={handleStartVerification}
                        title="Проверить в ФССП, МВД, Федресурс, ФНС"
                        style={{
                            width: 38, height: 38, borderRadius: 12, border: '1px solid rgba(16, 185, 129, 0.28)',
                            background: 'rgba(16, 185, 129, 0.08)', color: '#10b981', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', cursor: 'pointer'
                        }}
                    >
                        <ShieldCheck size={18} />
                    </button>
                    <button 
                        className="card-clickable" 
                        onClick={handleSyncContact}
                        disabled={isSyncingContact}
                        title="Синхронизировать с контактами телефона / Google"
                        style={{
                            width: 38, height: 38, borderRadius: 12, border: '1px solid var(--border-light)',
                            background: 'var(--surface)', color: 'var(--primary)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.03)', cursor: isSyncingContact ? 'wait' : 'pointer'
                        }}
                    >
                        <BookUser size={17} />
                    </button>
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

            <div className="page-content" style={{ padding: '14px 16px 120px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                <style>{`
                    .client-profile-grid {
                        display: grid;
                        grid-template-columns: 1fr;
                        gap: 12px;
                        align-items: start;
                    }
                    @media (min-width: 860px) {
                        .client-profile-grid {
                            grid-template-columns: minmax(0, 1.12fr) minmax(0, 0.88fr);
                            gap: 14px;
                        }
                    }
                    @media (min-width: 1440px) {
                        .client-profile-grid {
                            grid-template-columns: minmax(0, 1.08fr) minmax(0, 0.92fr);
                            gap: 16px;
                        }
                    }
                `}</style>

                {/* ── Компактный профиль и воронка ── */}
                <div className="card" style={{
                    padding: '16px 18px',
                    border: '1px solid var(--border-light)',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                    borderRadius: 18,
                    background: 'var(--surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                }}>
                    {/* Верхняя строка: Аватар + ФИО + Контакты + Метрики */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 14
                    }}>
                        {/* Слева: Аватар + Имя + Типы + Контакты */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 260, flex: '1 1 auto' }}>
                            <div style={{
                                width: 44,
                                height: 44,
                                borderRadius: 14,
                                background: 'rgba(0, 82, 255, 0.08)',
                                color: 'var(--primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 16,
                                fontWeight: 700,
                                border: '1px solid rgba(0, 82, 255, 0.15)',
                                flexShrink: 0
                            }}>
                                {(client.full_name || 'К').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                                        {client.full_name}
                                    </span>

                                    {/* Типы клиента */}
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                                        {client.client_types?.map(t => {
                                            const isAgent = t === 'agent';
                                            const isLegal = t === 'legal_entity';
                                            return (
                                                <button
                                                    key={t}
                                                    onClick={() => setIsEditingTypes(true)}
                                                    className="card-clickable"
                                                    style={{
                                                        padding: '2px 8px',
                                                        borderRadius: 6,
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        background: isAgent ? 'rgba(16, 185, 129, 0.1)' : (isLegal ? 'rgba(2, 132, 199, 0.1)' : 'var(--bg-light)'),
                                                        color: isAgent ? '#059669' : (isLegal ? '#0284c7' : 'var(--text-secondary)'),
                                                        border: isAgent ? '1px solid rgba(16, 185, 129, 0.25)' : (isLegal ? '1px solid rgba(2, 132, 199, 0.25)' : '1px solid var(--border-light)'),
                                                        cursor: 'pointer'
                                                    }}
                                                    title="Нажмите, чтобы изменить типы"
                                                >
                                                    {typeLabels[t] || t}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Телефон, Мессенджеры, Email, Источник */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 12 }}>
                                    <a
                                        href={`tel:+${stripPhone(client.phone)}`}
                                        onClick={handleCall}
                                        style={{
                                            color: 'var(--primary)',
                                            textDecoration: 'none',
                                            fontWeight: 600,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4
                                        }}
                                    >
                                        <Phone size={12} />
                                        <span>{formatPhone(client.phone)}</span>
                                    </a>

                                    {/* Быстрые мессенджеры */}
                                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                                        <a
                                            href={`https://wa.me/${stripPhone(client.phone)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="card-clickable"
                                            title="WhatsApp"
                                            style={{
                                                width: 24, height: 24, borderRadius: 7,
                                                background: 'rgba(34, 197, 94, 0.10)',
                                                border: '1px solid rgba(34, 197, 94, 0.25)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#16a34a'
                                            }}
                                        >
                                            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                                        </a>
                                        <a
                                            href={`https://t.me/+${stripPhone(client.phone)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="card-clickable"
                                            title="Telegram"
                                            style={{
                                                width: 24, height: 24, borderRadius: 7,
                                                background: 'rgba(2, 132, 199, 0.10)',
                                                border: '1px solid rgba(2, 132, 199, 0.25)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#0284c7'
                                            }}
                                        >
                                            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" /></svg>
                                        </a>
                                        <button
                                            type="button"
                                            onClick={handleSyncContact}
                                            disabled={isSyncingContact}
                                            className="card-clickable"
                                            title="Синхронизировать с Google Контактами / скачать .vcf"
                                            style={{
                                                height: 24, padding: '0 8px', borderRadius: 7,
                                                background: 'rgba(0, 82, 255, 0.08)',
                                                border: '1px solid rgba(0, 82, 255, 0.22)',
                                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                                color: 'var(--primary)', fontSize: 11, fontWeight: 600,
                                                cursor: isSyncingContact ? 'wait' : 'pointer'
                                            }}
                                        >
                                            <BookUser size={12} />
                                            <span>В контакты</span>
                                        </button>
                                    </div>

                                    {client.email && (
                                        <a href={`mailto:${client.email}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 11.5 }}>
                                            {client.email}
                                        </a>
                                    )}
                                    {client.source && (
                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            Источник: <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{client.source}</span>
                                        </span>
                                    )}

                                    {/* День рождения и генерация поздравления от Самолет Плюс Киров и агента */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <div
                                            className="card-clickable"
                                            onClick={() => setIsBirthdayModalOpen(true)}
                                            title={clientBirthdayInfo ? `День рождения: ${clientBirthdayInfo.formattedDate}` : 'Указать день рождения'}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 5,
                                                padding: '2px 8px',
                                                borderRadius: 7,
                                                background: clientBirthdayInfo?.isToday
                                                    ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                                                    : (clientBirthdayInfo?.isSoon ? '#fef3c7' : 'var(--bg-light)'),
                                                border: clientBirthdayInfo?.isToday
                                                    ? '1.5px solid #f59e0b'
                                                    : (clientBirthdayInfo?.isSoon ? '1px solid #fde68a' : '1px solid var(--border-light)'),
                                                fontSize: 11,
                                                color: clientBirthdayInfo?.isToday ? '#92400e' : (clientBirthdayInfo?.isSoon ? '#d97706' : 'var(--text-secondary)'),
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <Cake size={12} color={clientBirthdayInfo?.isToday ? '#d97706' : (clientBirthdayInfo?.isSoon ? '#d97706' : 'var(--text-muted)')} />
                                            {clientBirthdayInfo ? (
                                                <span>
                                                    {clientBirthdayInfo.dayMonth}
                                                    {clientBirthdayInfo.ageFormatted ? ` (${clientBirthdayInfo.ageFormatted})` : ''}
                                                    {clientBirthdayInfo.isToday ? ' • 🎉 Сегодня!' : (clientBirthdayInfo.isSoon ? ` • через ${clientBirthdayInfo.daysLeft} дн.` : '')}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>ДР: не указан</span>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => setIsBirthdayModalOpen(true)}
                                            className="card-clickable"
                                            title="Сгенерировать поздравление от Самолет Плюс Киров и агента"
                                            style={{
                                                height: 22,
                                                padding: '0 8px',
                                                borderRadius: 7,
                                                background: clientBirthdayInfo?.isToday
                                                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                                                    : 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(217, 119, 6, 0.12) 100%)',
                                                border: clientBirthdayInfo?.isToday ? 'none' : '1px solid rgba(245, 158, 11, 0.3)',
                                                color: clientBirthdayInfo?.isToday ? '#fff' : '#b45309',
                                                fontSize: 10.5,
                                                fontWeight: 700,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4,
                                                cursor: 'pointer',
                                                boxShadow: clientBirthdayInfo?.isToday ? '0 2px 6px rgba(245, 158, 11, 0.3)' : 'none'
                                            }}
                                        >
                                            <Sparkles size={11} />
                                            <span>Поздравить</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Справа: Компактные метрики / статистика */}
                        {!client.client_types?.includes('lawyer') && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                background: 'var(--bg-light)',
                                padding: '5px 10px',
                                borderRadius: 12,
                                border: '1px solid var(--border-light)',
                                flexWrap: 'wrap'
                            }}>
                                <div
                                    className="card-clickable"
                                    onClick={() => navigate('/tasks')}
                                    style={{ textAlign: 'center', padding: '0 6px', cursor: 'pointer' }}
                                    title={`Комиссия: ${formatNumber(totalCommission)} ₽`}
                                >
                                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#059669', lineHeight: 1.2 }}>
                                        {formatNumber(totalCommission)} ₽
                                    </div>
                                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>Комиссия</div>
                                </div>

                                <div style={{ width: 1, height: 18, background: 'var(--border-light)' }} />

                                <div
                                    className="card-clickable"
                                    onClick={() => navigate(`/properties?client=${id}`)}
                                    style={{ textAlign: 'center', padding: '0 6px', cursor: 'pointer' }}
                                >
                                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
                                        {myProperties.length}
                                    </div>
                                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>Объектов</div>
                                </div>

                                <div style={{ width: 1, height: 18, background: 'var(--border-light)' }} />

                                <div
                                    className="card-clickable"
                                    onClick={() => navigate(`/requests?client=${id}`)}
                                    style={{ textAlign: 'center', padding: '0 6px', cursor: 'pointer' }}
                                >
                                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
                                        {myRequests.length}
                                    </div>
                                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>Запросов</div>
                                </div>

                                {mySelectionItems.length > 0 && (
                                    <>
                                        <div style={{ width: 1, height: 18, background: 'var(--border-light)' }} />
                                        <div
                                            className="card-clickable"
                                            onClick={() => {
                                                const el = document.getElementById('client-selection-section');
                                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                                            }}
                                            style={{ textAlign: 'center', padding: '0 6px', cursor: 'pointer' }}
                                            title={`В подборе: ${mySelectionItems.length} объектов`}
                                        >
                                            <div style={{ fontSize: 13.5, fontWeight: 700, color: '#7c3aed', lineHeight: 1.2 }}>
                                                {mySelectionItems.length}
                                            </div>
                                            <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>Подбор</div>
                                        </div>
                                    </>
                                )}

                                <div style={{ width: 1, height: 18, background: 'var(--border-light)' }} />

                                <div
                                    className="card-clickable"
                                    onClick={() => navigate('/tasks')}
                                    style={{ textAlign: 'center', padding: '0 6px', cursor: 'pointer' }}
                                >
                                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
                                        {myDeals.length}
                                    </div>
                                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>Сделок</div>
                                </div>

                                <div style={{ width: 1, height: 18, background: 'var(--border-light)' }} />

                                <div
                                    style={{ textAlign: 'center', padding: '0 6px' }}
                                    title={`${activeContracts.length} в работе, ${fulfilledContracts.length} исполнен`}
                                >
                                    <div style={{ fontSize: 13.5, fontWeight: 700, color: activeContracts.length > 0 ? '#10b981' : (fulfilledContracts.length > 0 ? '#0f766e' : 'var(--text-muted)'), lineHeight: 1.2 }}>
                                        {activeContracts.length > 0 ? activeContracts.length : (fulfilledContracts.length > 0 ? `✓${fulfilledContracts.length}` : 0)}
                                    </div>
                                    <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>АД</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Режим изменения типов (при нажатии) */}
                    {isEditingTypes && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', alignItems: 'center', background: 'var(--bg-light)', padding: '12px', borderRadius: 14, width: '100%', border: '1px solid var(--border-light)' }}>
                            <div style={{ width: '100%', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2, fontWeight: 600 }}>Выберите типы клиента:</div>
                            {CLIENT_TYPES.map(({ id: typeId, label }) => {
                                const isActive = client.client_types?.includes(typeId);
                                return (
                                    <button
                                        key={typeId}
                                        onClick={() => handleToggleType(typeId)}
                                        className="card-clickable"
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: 8,
                                            fontSize: 11,
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
                            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 6 }}>
                                <button
                                    type="button"
                                    onClick={() => setIsEditingTypes(false)}
                                    className="card-clickable"
                                    style={{
                                        padding: '5px 16px',
                                        borderRadius: 8,
                                        fontSize: 11,
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
                                    <Check size={12} /> Готово
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Нижняя строка: Воронка клиента + Быстрые действия */}
                    {(() => {
                        const isCounterparty = (client?.client_types || []).some(t => ['developer', 'agent', 'lawyer'].includes(t));
                        if (isCounterparty) return null;

                        const currentStageId = getClientPipelineStage(client, {
                            deals: state.deals,
                            properties: state.properties,
                            showings: state.showings
                        });

                        return (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: 8,
                                paddingTop: 8,
                                borderTop: '1px solid var(--border-light)'
                            }}>
                                {/* 5 этапов воронки */}
                                <div style={{
                                    display: 'flex',
                                    gap: 4,
                                    alignItems: 'center',
                                    flexWrap: 'wrap'
                                }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em', marginRight: 4 }}>
                                        Воронка:
                                    </span>
                                    {CLIENT_PIPELINE_STAGES.map(stage => {
                                        const isActiveStage = stage.id === currentStageId;
                                        return (
                                            <button
                                                key={stage.id}
                                                type="button"
                                                className="card-clickable"
                                                onClick={() => handlePipelineStageChange(stage.id)}
                                                title={stage.subLabel}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 4,
                                                    padding: '3px 8px',
                                                    borderRadius: 8,
                                                    fontSize: 11,
                                                    fontWeight: isActiveStage ? 700 : 500,
                                                    background: isActiveStage ? stage.badgeBg : 'var(--bg-light)',
                                                    color: isActiveStage ? stage.textColor : 'var(--text-secondary)',
                                                    border: isActiveStage ? `1.5px solid ${stage.color}` : '1px solid var(--border-light)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                <span style={{
                                                    width: 6,
                                                    height: 6,
                                                    borderRadius: '50%',
                                                    background: isActiveStage ? stage.color : 'var(--text-muted)',
                                                    opacity: isActiveStage ? 1 : 0.45,
                                                    flexShrink: 0
                                                }} />
                                                <span>{stage.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Быстрые действия */}
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <button
                                        type="button"
                                        className="card-clickable"
                                        onClick={() => openQuickModal('meeting')}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                            padding: '4px 10px', borderRadius: 8,
                                            background: 'rgba(124, 58, 237, 0.08)',
                                            color: '#7c3aed',
                                            border: '1px solid rgba(124, 58, 237, 0.25)',
                                            fontSize: 11, fontWeight: 600, cursor: 'pointer'
                                        }}
                                    >
                                        <Calendar size={12} /> + Встреча
                                    </button>
                                    <button
                                        type="button"
                                        className="card-clickable"
                                        onClick={() => openQuickModal('call')}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 4,
                                            padding: '4px 10px', borderRadius: 8,
                                            background: 'rgba(0, 82, 255, 0.08)',
                                            color: 'var(--primary)',
                                            border: '1px solid rgba(0, 82, 255, 0.25)',
                                            fontSize: 11, fontWeight: 600, cursor: 'pointer'
                                        }}
                                    >
                                        <Phone size={12} /> + Звонок
                                    </button>
                                    <button
                                        type="button"
                                        className="card-clickable"
                                        onClick={handleStartVerification}
                                        title="Проверка благонадежности: ФССП (долги), МВД (паспорт), Федресурс (банкротство), ФНС и нотариат"
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 5,
                                            padding: '4px 10px', borderRadius: 8,
                                            background: 'rgba(16, 185, 129, 0.08)',
                                            color: '#059669',
                                            border: '1px solid rgba(16, 185, 129, 0.28)',
                                            fontSize: 11, fontWeight: 600, cursor: 'pointer'
                                        }}
                                    >
                                        <ShieldCheck size={12} /> Проверить в ФССП, МВД
                                    </button>
                                    {isSellerOrLandlord && (
                                        <button
                                            type="button"
                                            className="card-clickable"
                                            onClick={() => setIsLinkPropertyModalOpen(true)}
                                            title="Привязать объект недвижимости из базы"
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                                padding: '4px 10px', borderRadius: 8,
                                                background: 'rgba(0, 82, 255, 0.08)',
                                                color: 'var(--primary)',
                                                border: '1px solid rgba(0, 82, 255, 0.25)',
                                                fontSize: 11, fontWeight: 600, cursor: 'pointer'
                                            }}
                                        >
                                            <Link2 size={12} /> + Привязать объект
                                        </button>
                                    )}
                                    {client.client_types?.includes('buyer') && (
                                        <button
                                            type="button"
                                            className="card-clickable"
                                            onClick={() => navigate(`/requests/new?client=${id}`)}
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                                padding: '4px 10px', borderRadius: 8,
                                                border: '1px solid rgba(217, 119, 6, 0.25)',
                                                background: 'rgba(217, 119, 6, 0.08)',
                                                color: '#b45309',
                                                fontSize: 11, fontWeight: 600, cursor: 'pointer'
                                            }}
                                        >
                                            <Plus size={12} /> + Запрос
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* ── ДИНАМИЧЕСКИЕ КОЛОНКИ ПРОФИЛЯ ── */}
                <div className="client-profile-grid">
                    {/* Левая колонка: Агентские договоры, Сделки, Проверка, Реквизиты */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {/* ── Кросс-услуги клиента ── */}
                {(() => {
                    const clientCrossServices = (state.crossServices || []).filter(cs => cs.client_id === client.id);
                    return (
                        <div className="card" style={{
                            padding: '14px 16px',
                            border: '1px solid var(--border-light)',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                            borderRadius: 18,
                            background: 'var(--surface)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 10,
                                        background: clientCrossServices.length > 0 ? 'rgba(2, 132, 199, 0.1)' : 'var(--bg-light)',
                                        color: clientCrossServices.length > 0 ? '#0284c7' : 'var(--text-secondary)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Briefcase size={16} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                                            Кросс-услуги {clientCrossServices.length > 0 ? `(${clientCrossServices.length})` : ''}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                            Страхование, клининг, ремонт и доп. сервисы
                                        </div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setCrossServiceModal({ open: true, item: null })}
                                    className="btn btn-primary"
                                    style={{ borderRadius: 10, padding: '6px 12px', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                    <Plus size={14} /> Заявка
                                </button>
                            </div>

                            {clientCrossServices.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {clientCrossServices.map(cs => {
                                        const tpl = getCrossServiceTemplate(cs.service_type);
                                        const st = getCrossServiceStatusMeta(cs.status);
                                        return (
                                            <div key={cs.id} style={{
                                                padding: '10px 12px',
                                                borderRadius: 12,
                                                background: 'var(--bg-light)',
                                                borderLeft: `3px solid ${tpl.color}`,
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                gap: 8,
                                            }}>
                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {tpl.shortTitle}
                                                    </div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                                        <span style={{ padding: '1px 6px', borderRadius: 6, background: st.bg, color: st.color, fontWeight: 700 }}>
                                                            {st.label}
                                                        </span>
                                                        <span>{cs.created_at ? new Date(cs.created_at).toLocaleDateString('ru-RU') : ''}</span>
                                                        {cs.commission ? <strong style={{ color: '#10b981' }}>+{formatNumber(cs.commission)} ₽</strong> : null}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                                    <button
                                                        type="button"
                                                        title="Копировать заявку"
                                                        onClick={async () => {
                                                            try {
                                                                await navigator.clipboard.writeText(formatCrossServiceShareText(cs));
                                                                toast.success('Заявка скопирована');
                                                            } catch { toast.error('Не удалось скопировать'); }
                                                        }}
                                                        style={{ padding: 6, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer' }}
                                                    >
                                                        <FileText size={13} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        title="Редактировать"
                                                        onClick={() => setCrossServiceModal({ open: true, item: cs })}
                                                        style={{ padding: 6, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer' }}
                                                    >
                                                        <Pencil size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })()}
                                        {/* ── Агентские договоры ── */}
                <div className="card" style={{
                    padding: '14px 16px',
                    border: '1px solid var(--border-light)',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                    borderRadius: 18,
                    background: 'var(--surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: 10,
                                background: activeContracts.length > 0 ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-light)',
                                color: activeContracts.length > 0 ? '#10b981' : 'var(--text-muted)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <FileText size={16} />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)' }}>
                                    Агентские договоры
                                </span>
                                {activeContracts.length > 0 && (
                                    <span style={{
                                        fontSize: 10.5,
                                        fontWeight: 600,
                                        padding: '1px 6px',
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
                                        fontSize: 10.5,
                                        fontWeight: 600,
                                        padding: '1px 6px',
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
                                        fontSize: 10.5,
                                        fontWeight: 500,
                                        padding: '1px 6px',
                                        borderRadius: 6,
                                        background: 'var(--bg-light)',
                                        color: 'var(--text-muted)',
                                        border: '1px solid var(--border-light)'
                                    }}>
                                        Архив
                                    </span>
                                )}
                            </div>
                        </div>

                        <button
                            type="button"
                            className="card-clickable"
                            onClick={openAddContractModal}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '4px 10px', borderRadius: 8, border: 'none',
                                background: 'var(--primary)',
                                color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                boxShadow: '0 1px 4px rgba(0,82,255,0.15)'
                            }}
                        >
                            <Plus size={12} /> {clientContracts.length > 0 ? 'Добавить' : 'Заключить договор'}
                        </button>
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

                    {mainContracts.length === 0 ? (
                        <div style={{
                            fontSize: 12,
                            color: 'var(--text-muted)',
                            padding: '8px 12px',
                            background: 'var(--bg-light)',
                            borderRadius: 10,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8
                        }}>
                            <span>{archivedContracts.length > 0 ? 'Нет действующих договоров' : 'Договоры еще не заключены'}</span>
                            <span
                                role="button"
                                onClick={openAddContractModal}
                                style={{ fontSize: 11.5, color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
                            >
                                + {archivedContracts.length > 0 ? 'Оформить новый' : 'Оформить'}
                            </span>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {mainContracts.map(c => {
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
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                                            {/* Левая сторона: Бейдж типа с соответствующим цветом + номер + статус */}
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                <span style={{
                                                    fontSize: 12,
                                                    fontWeight: 700,
                                                    padding: '3px 10px',
                                                    borderRadius: 8,
                                                    background: typeCfg.bg,
                                                    color: typeCfg.color,
                                                    border: `1.5px solid ${typeCfg.border}`,
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 5
                                                }}>
                                                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: typeCfg.color, flexShrink: 0 }} />
                                                    {c.type || 'АД Продажа'}
                                                </span>
                                                {c.contract_number && (
                                                    <span style={{
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        padding: '3px 8px',
                                                        borderRadius: 7,
                                                        background: 'var(--surface)',
                                                        color: 'var(--text)',
                                                        border: '1px solid var(--border-light)'
                                                    }}>
                                                        № {c.contract_number}
                                                    </span>
                                                )}
                                                {/* Expiry / Fulfilled Badge */}
                                                {info?.badge && (
                                                    <span style={{
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        padding: '3px 8px',
                                                        borderRadius: 7,
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
                                                {Array.isArray(c.co_client_ids) && c.co_client_ids.length > 1 && (
                                                    <span style={{
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        padding: '3px 8px',
                                                        borderRadius: 7,
                                                        background: 'rgba(0, 82, 255, 0.08)',
                                                        color: 'var(--primary)',
                                                        border: '1px solid rgba(0, 82, 255, 0.25)',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 4
                                                    }}>
                                                        <Users size={11} /> Совместный ({c.co_client_ids.length})
                                                    </span>
                                                )}
                                            </div>

                                            {/* Правый верхний угол: Кнопки "Редактировать" и "Удалить", а под ними - кнопка "Документ" */}
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <button
                                                        type="button"
                                                        className="card-clickable"
                                                        onClick={() => openEditContractModal(c)}
                                                        style={{
                                                            width: 30, height: 30, borderRadius: 8,
                                                            border: '1px solid var(--border-light)', background: 'var(--surface)',
                                                            color: 'var(--text)', cursor: 'pointer',
                                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                                                        }}
                                                        title="Редактировать условия договора"
                                                    >
                                                        <Pencil size={13} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="card-clickable"
                                                        onClick={() => handleDeleteContract(c.id)}
                                                        style={{
                                                            width: 30, height: 30, borderRadius: 8,
                                                            border: '1px solid rgba(239, 68, 68, 0.25)', background: 'rgba(239, 68, 68, 0.06)',
                                                            color: '#ef4444', cursor: 'pointer',
                                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                                                        }}
                                                        title="Удалить договор"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>

                                                <button
                                                    type="button"
                                                    className="card-clickable"
                                                    onClick={() => handleCreateDocumentForContract(c)}
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: 5,
                                                        padding: '5px 11px', borderRadius: 8, border: 'none',
                                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                        color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                                        boxShadow: '0 2px 5px rgba(16,185,129,0.2)'
                                                    }}
                                                    title="Сформировать печатный документ"
                                                >
                                                    <FileText size={12} /> Документ
                                                </button>

                                                {!info?.isFulfilled && (info?.needsRenewal || info?.isOverdue || info?.isUrgentReSign) && (
                                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                        <button
                                                            type="button"
                                                            className="card-clickable"
                                                            onClick={() => handleRenewContract(c)}
                                                            style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                                                padding: '4px 9px', borderRadius: 8, border: 'none',
                                                                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                                                color: '#fff', fontSize: 10.5, fontWeight: 600, cursor: 'pointer',
                                                                boxShadow: '0 2px 5px rgba(245,158,11,0.25)'
                                                            }}
                                                            title="Переподписать новый агентский договор с клиентом"
                                                        >
                                                            <Plus size={11} /> {info?.isUrgentReSign ? 'Переподписать АД' : 'Перезаключить'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="card-clickable"
                                                            onClick={() => handleCloseContractToArchive(c)}
                                                            style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                                                padding: '4px 8px', borderRadius: 8,
                                                                border: '1px solid var(--border-light)',
                                                                background: 'var(--surface)',
                                                                color: 'var(--text-muted)', fontSize: 10.5, fontWeight: 500, cursor: 'pointer'
                                                            }}
                                                            title="Перенести истекший договор в архив со статусом Закрыт"
                                                        >
                                                            <Archive size={11} /> В архив
                                                        </button>
                                                    </div>
                                                )}
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
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                                                    <span>Действует до: <strong style={{ color: info?.isOverdue ? '#dc2626' : (info?.isExpiring ? '#d97706' : 'var(--text)') }}>{formatContractDate(info?.endDate)}</strong></span>
                                                    {info?.durationMonths && (
                                                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                            ({info.durationMonths} мес.)
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {c.price > 0 && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <span style={{ color: 'var(--text-muted)' }}>Сумма:</span>
                                                    <strong style={{ color: 'var(--text)' }}>{formatNumber(c.price)} ₽</strong>
                                                </div>
                                            )}
                                            {c.commission && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <span style={{ color: 'var(--text-muted)' }}>Комиссия:</span>
                                                    <strong style={{ color: '#059669' }}>{c.commission}</strong>
                                                </div>
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

                                        {Array.isArray(c.co_client_ids) && c.co_client_ids.length > 1 && (() => {
                                            const coClients = c.co_client_ids
                                                .filter(cid => String(cid) !== String(client.id))
                                                .map(cid => state.clients.find(sc => String(sc.id) === String(cid)))
                                                .filter(Boolean);
                                            if (coClients.length === 0) return null;
                                            return (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 12 }}>
                                                    <Users size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                                    <span style={{ color: 'var(--text-muted)' }}>Сособственники:</span>
                                                    {coClients.map(co => (
                                                        <span
                                                            key={co.id}
                                                            onClick={() => navigate(`/clients/${co.id}`)}
                                                            style={{
                                                                fontSize: 11.5,
                                                                fontWeight: 600,
                                                                padding: '2px 8px',
                                                                borderRadius: 7,
                                                                background: 'rgba(0, 82, 255, 0.06)',
                                                                color: 'var(--primary)',
                                                                border: '1px solid rgba(0, 82, 255, 0.2)',
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 3
                                                            }}
                                                        >
                                                            {co.full_name}
                                                            <ChevronRight size={11} />
                                                        </span>
                                                    ))}
                                                </div>
                                            );
                                        })()}

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

                    {archivedContracts.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                            <button
                                type="button"
                                className="card-clickable"
                                onClick={() => setShowArchivedContracts(prev => !prev)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '9px 12px',
                                    borderRadius: 12,
                                    border: '1px solid var(--border-light)',
                                    background: 'var(--surface)',
                                    color: 'var(--text-secondary)',
                                    fontSize: 12,
                                    cursor: 'pointer'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <Archive size={14} style={{ color: 'var(--text-muted)' }} />
                                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>Архив договоров</span>
                                    <span style={{
                                        fontSize: 10.5,
                                        fontWeight: 600,
                                        padding: '1px 6px',
                                        borderRadius: 6,
                                        background: 'var(--bg-light)',
                                        color: 'var(--text-muted)',
                                        border: '1px solid var(--border-light)'
                                    }}>
                                        {archivedContracts.length}
                                    </span>
                                </div>
                                {showArchivedContracts ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                            </button>

                            {showArchivedContracts && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                                    {archivedContracts.map(c => {
                                        const typeCfg = getContractTypeConfig(c.type);
                                        const info = getContractStatusInfo(c, new Date(), { deals: state.deals, client });
                                        const contractProp = state.properties.find(p => p.id === c.property_id);
                                        return (
                                            <div
                                                key={c.id}
                                                style={{
                                                    background: 'var(--bg-light)',
                                                    borderRadius: 16,
                                                    padding: '12px 14px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 8,
                                                    border: '1px dashed var(--border-light)',
                                                    opacity: 0.85
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                        <span style={{
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            padding: '2px 8px',
                                                            borderRadius: 6,
                                                            background: typeCfg.bg,
                                                            color: typeCfg.color,
                                                            border: `1px solid ${typeCfg.border}`,
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: 4
                                                        }}>
                                                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: typeCfg.color, flexShrink: 0 }} />
                                                            {c.type || 'АД Продажа'}
                                                        </span>
                                                        {c.contract_number && (
                                                            <span style={{
                                                                fontSize: 10.5,
                                                                fontWeight: 600,
                                                                padding: '2px 6px',
                                                                borderRadius: 6,
                                                                background: 'var(--surface)',
                                                                color: 'var(--text)',
                                                                border: '1px solid var(--border-light)'
                                                            }}>
                                                                № {c.contract_number}
                                                            </span>
                                                        )}
                                                        {info?.badge && (
                                                            <span style={{
                                                                fontSize: 10.5,
                                                                fontWeight: 600,
                                                                padding: '2px 7px',
                                                                borderRadius: 6,
                                                                background: info.badge.bg,
                                                                color: info.badge.color,
                                                                border: `1px solid ${info.badge.border}`,
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 4
                                                            }}>
                                                                {info.badge.label}
                                                            </span>
                                                        )}
                                                        {Array.isArray(c.co_client_ids) && c.co_client_ids.length > 1 && (
                                                            <span style={{
                                                                fontSize: 10.5,
                                                                fontWeight: 600,
                                                                padding: '2px 6px',
                                                                borderRadius: 6,
                                                                background: 'rgba(0, 82, 255, 0.08)',
                                                                color: 'var(--primary)',
                                                                border: '1px solid rgba(0, 82, 255, 0.25)',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: 3
                                                            }}>
                                                                <Users size={10} /> {c.co_client_ids.length} лиц
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                                                        <button
                                                            type="button"
                                                            className="card-clickable"
                                                            onClick={() => handleCreateDocumentForContract(c)}
                                                            style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                                                padding: '4px 8px', borderRadius: 7,
                                                                background: 'var(--surface)',
                                                                color: 'var(--text)', fontSize: 10.5, fontWeight: 500, cursor: 'pointer',
                                                                border: '1px solid var(--border-light)'
                                                            }}
                                                            title="Сформировать печатный документ"
                                                        >
                                                            <FileText size={11} /> Документ
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="card-clickable"
                                                            onClick={() => openEditContractModal(c)}
                                                            style={{
                                                                width: 26, height: 26, borderRadius: 7,
                                                                border: '1px solid var(--border-light)', background: 'var(--surface)',
                                                                color: 'var(--text)', cursor: 'pointer',
                                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                                                            }}
                                                            title="Редактировать архивный договор"
                                                        >
                                                            <Pencil size={11} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="card-clickable"
                                                            onClick={() => handleDeleteContract(c.id)}
                                                            style={{
                                                                width: 26, height: 26, borderRadius: 7,
                                                                border: '1px solid rgba(239, 68, 68, 0.25)', background: 'rgba(239, 68, 68, 0.06)',
                                                                color: '#ef4444', cursor: 'pointer',
                                                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center'
                                                            }}
                                                            title="Удалить из архива"
                                                        >
                                                            <Trash2 size={11} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--text-secondary)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <Calendar size={12} style={{ color: 'var(--text-muted)' }} />
                                                        <span>Заключен: <strong style={{ color: 'var(--text)' }}>{formatContractDate(info?.startDate)}</strong></span>
                                                    </div>
                                                    {c.closed_at && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <Archive size={12} style={{ color: 'var(--text-muted)' }} />
                                                            <span>Закрыт в архив: <strong style={{ color: 'var(--text)' }}>{formatContractDate(c.closed_at)}</strong></span>
                                                        </div>
                                                    )}
                                                    {c.price > 0 && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <span style={{ color: 'var(--text-muted)' }}>Сумма:</span>
                                                            <strong style={{ color: 'var(--text)' }}>{formatNumber(c.price)} ₽</strong>
                                                        </div>
                                                    )}
                                                    {c.commission && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                            <span style={{ color: 'var(--text-muted)' }}>Комиссия:</span>
                                                            <strong style={{ color: '#059669' }}>{c.commission}</strong>
                                                        </div>
                                                    )}
                                                </div>

                                                {contractProp && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
                                                        <Home size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                                                        <span style={{ color: 'var(--text-muted)' }}>Объект:</span>
                                                        <span
                                                            onClick={() => navigate(`/properties/${contractProp.id}`)}
                                                            style={{ fontWeight: 600, color: 'var(--primary)', cursor: 'pointer' }}
                                                        >
                                                            {contractProp.address || contractProp.city}
                                                        </span>
                                                    </div>
                                                )}

                                                {c.comment && (
                                                    <div style={{
                                                        fontSize: 11,
                                                        color: 'var(--text-muted)',
                                                        fontStyle: 'italic',
                                                        padding: '4px 8px',
                                                        borderRadius: 6,
                                                        background: 'var(--surface)',
                                                        border: '1px solid var(--border-light)'
                                                    }}>
                                                        {c.comment}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
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
                                    roleLabel = sellerIds.length > 1 ? 'Сособственник (Продавец)' : 'Продавец';
                                } else if (buyerIds.includes(id)) {
                                    roleLabel = buyerIds.length > 1 ? 'Сопокупатель' : 'Покупатель';
                                } else if (client?.client_types?.includes('lawyer')) {
                                    roleLabel = 'Юрист';
                                } else if (client?.client_types?.includes('agent')) {
                                    roleLabel = 'Агент';
                                }

                                const matchingContract = clientContracts.find(ct => {
                                    if (!ct || ct.status === 'terminated' || ct.status === 'cancelled') return false;
                                    if (ct.fulfilled_deal_id && ct.fulfilled_deal_id === d.id) return true;
                                    if (ct.property_id && d.property_id && ct.property_id === d.property_id) return true;
                                    if (!ct.property_id) {
                                        const isSeller = sellerIds.includes(id);
                                        const isBuyer = buyerIds.includes(id);
                                        const ctType = ct.type || '';
                                        if (isSeller && (ctType.includes('Продажа') || ctType.toLowerCase().includes('наймодател') || ctType.toLowerCase().includes('арендодател'))) return true;
                                        if (isBuyer && (ctType.includes('Покупка') || ctType.toLowerCase().includes('нанимател') || ctType.toLowerCase().includes('арендатор'))) return true;
                                        return true;
                                    }
                                    return false;
                                });

                                const dealHasContract = Boolean(
                                    matchingContract || 
                                    d.has_agency_contract || 
                                    d.agency_contract_date || 
                                    (hasAgencyContract && (client.agency_contract_property_id === d.property_id || !client.agency_contract_property_id))
                                );
                                const dealContractDate = matchingContract?.contract_date || d.agency_contract_date || (dealHasContract ? client.agency_contract_date : null);
                                const isContractFulfilled = matchingContract?.status === 'fulfilled' || d.status === 'closed';

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
                                                        <span style={{ 
                                                            fontSize: 10, fontWeight: 600, color: '#059669', background: '#ecfdf5', 
                                                            padding: '1px 6px', borderRadius: 6, border: '1px solid rgba(16,185,129,0.3)',
                                                            display: 'inline-flex', alignItems: 'center', gap: 3
                                                        }}>
                                                            <CheckCircle2 size={11} />
                                                            {isContractFulfilled ? (
                                                                <span>АД исполнен{dealContractDate ? ` (${formatDate(dealContractDate)})` : ''}</span>
                                                            ) : (
                                                                <span>АД {dealContractDate ? `от ${formatDate(dealContractDate)}` : 'заключен'}</span>
                                                            )}
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
                                        {client.company_details?.inn || client.inn || '-'}
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
                                        {client.company_details?.kpp || '-'}
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
                                        {client.company_details?.ogrn || '-'}
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
                                    {client.company_details?.director_name || '-'}
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
                    </div>

                    {/* Правая колонка: Активность, Объекты, Запросы, Заметки */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* ── Последняя активность (Встречи / звонки) ── */}
                        {!client.client_types?.includes('lawyer') && (
                            <div className="card" style={{
                                padding: '16px 18px',
                                border: '1px solid var(--border-light)',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                                borderRadius: 18,
                                background: 'var(--surface)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Calendar size={16} color="#8b5cf6" />
                                        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                                            Последняя активность {myShowings.length > 0 && `(${myShowings.length})`}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <button
                                            className="card-clickable"
                                            onClick={() => openQuickModal('meeting')}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 4,
                                                padding: '4px 10px', borderRadius: 8,
                                                background: 'rgba(124, 58, 237, 0.08)',
                                                color: '#7c3aed',
                                                border: '1px solid rgba(124, 58, 237, 0.25)',
                                                fontSize: 11, fontWeight: 500, cursor: 'pointer'
                                            }}
                                            title="Быстро добавить встречу"
                                        >
                                            <Calendar size={12} /> + Встреча
                                        </button>
                                        <button
                                            className="card-clickable"
                                            onClick={() => openQuickModal('call')}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 4,
                                                padding: '4px 10px', borderRadius: 8,
                                                background: 'rgba(0, 82, 255, 0.08)',
                                                color: 'var(--primary)',
                                                border: '1px solid rgba(0, 82, 255, 0.25)',
                                                fontSize: 11, fontWeight: 500, cursor: 'pointer'
                                            }}
                                            title="Быстро добавить звонок"
                                        >
                                            <Phone size={12} /> + Звонок
                                        </button>
                                        <button className="icon-btn" onClick={() => navigate(`/history/new?client_id=${id}`)} title="Добавить другое событие" style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border-light)' }}>
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>

                                {myShowings.length === 0 ? (
                                    <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5, opacity: 0.7 }}>
                                        Активности пока нет
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Объекты клиента (в собственности / продаже / найме) ── */}
                        {(myProperties.length > 0 || isSellerOrLandlord) && (
                            <div className="card" style={{
                                padding: '16px 18px',
                                border: '1px solid var(--border-light)',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                                borderRadius: 18,
                                background: 'var(--surface)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Home size={16} color="var(--primary)" />
                                        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                                            {isLandlord ? 'Объекты в найме / аренде' : 'Объекты в собственности'} ({myProperties.length})
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <button
                                            type="button"
                                            onClick={() => setIsLinkPropertyModalOpen(true)}
                                            className="card-clickable"
                                            title="Привязать существующий объект из базы"
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                                padding: '4px 10px', borderRadius: 8,
                                                background: 'rgba(16, 185, 129, 0.08)',
                                                color: '#059669',
                                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                                fontSize: 11, fontWeight: 600, cursor: 'pointer'
                                            }}
                                        >
                                            <Link2 size={12} /> Привязать
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/properties/new?client=${id}&client_id=${id}`, {
                                                state: { prefillProperty: { client_id: id, client_ids: [id], client_shares: { [id]: '1/1' } } }
                                            })}
                                            className="card-clickable"
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                                padding: '4px 10px', borderRadius: 8,
                                                background: 'rgba(0, 82, 255, 0.08)',
                                                color: 'var(--primary)',
                                                border: '1px solid rgba(0, 82, 255, 0.25)',
                                                fontSize: 11, fontWeight: 600, cursor: 'pointer'
                                            }}
                                        >
                                            <Plus size={12} /> + Объект
                                        </button>
                                    </div>
                                </div>

                                {myProperties.length === 0 ? (
                                    <div style={{
                                        fontSize: 12, color: 'var(--text-muted)',
                                        background: 'var(--bg-light)', padding: '12px 14px', borderRadius: 12,
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8
                                    }}>
                                        <span>У собственника пока нет привязанных объектов</span>
                                        <span
                                            role="button"
                                            onClick={() => setIsLinkPropertyModalOpen(true)}
                                            style={{ color: 'var(--primary)', fontWeight: 600, fontSize: 11.5, cursor: 'pointer' }}
                                        >
                                            + Привязать из базы
                                        </span>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {myProperties.map(p => {
                                            const propStatusLabel = { active: 'В продаже', reserved: 'Резерв', new: 'Новый', sold: 'Продан', deal_closed: 'Сделка закрыта', agreement: 'АД', no_agreement: 'Без АД', meeting: 'Встреча', advertising: 'В рекламе' };
                                            const propStatusColor = { active: 'var(--primary)', reserved: '#f59e0b', new: '#10b981', sold: '#64748b', deal_closed: '#0f766e', agreement: '#f59e0b', no_agreement: '#64748b', meeting: '#3b82f6', advertising: '#8b5cf6' };
                                            return (
                                                <div key={p.id} className="card-clickable" onClick={() => navigate(`/properties/${p.id}`)}
                                                    style={{ padding: '12px 14px', background: 'var(--bg-light)', borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                                                        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', flexShrink: 0 }}>
                                                            <Home size={16} />
                                                        </div>
                                                        <div style={{ minWidth: 0, flex: 1 }}>
                                                            <div style={{ fontSize: 10, fontWeight: 500, color: propStatusColor[p.status] || 'var(--primary)' }}>
                                                                {propStatusLabel[p.status] || 'Объект недвижимости'}
                                                            </div>
                                                            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {p.address || p.city || 'Адрес не указан'}
                                                            </div>
                                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                                {p.price ? formatNumber(p.price) + ' ₽' : ''}
                                                                {p.rooms ? ` • ${p.rooms}-к кв.` : ''}
                                                                {p.area ? ` • ${p.area} м²` : ''}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                                        <button
                                                            type="button"
                                                            className="card-clickable"
                                                            onClick={(e) => handleUnlinkProperty(p, e)}
                                                            title="Отвязать объект от собственника"
                                                            style={{
                                                                border: 'none', background: 'transparent',
                                                                color: 'var(--text-muted)', cursor: 'pointer', padding: 6,
                                                                borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                            }}
                                                        >
                                                            <Unlink2 size={15} />
                                                        </button>
                                                        <ChevronRight size={16} color="var(--text-muted)" />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Подбор: Запросы и подобранные объекты ── */}
                        {(myRequests.length > 0 || mySelectionItems.length > 0 || isBuyerOrTenant) && (
                            <div id="client-selection-section" className="card" style={{
                                padding: '16px 18px',
                                border: '1px solid var(--border-light)',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                                borderRadius: 18,
                                background: 'var(--surface)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 14
                            }}>
                                {/* Главная шапка раздела Подбор */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{
                                            width: 32, height: 32, borderRadius: 10,
                                            background: 'rgba(124, 58, 237, 0.1)',
                                            color: '#7c3aed',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <Target size={17} />
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                                                    Подбор
                                                </span>
                                                {mySelectionItems.length > 0 && (
                                                    <span style={{
                                                        fontSize: 10, fontWeight: 700,
                                                        padding: '1px 7px', borderRadius: 6,
                                                        background: 'rgba(124, 58, 237, 0.12)',
                                                        color: '#7c3aed'
                                                    }}>
                                                        {mySelectionItems.length} {mySelectionItems.length === 1 ? 'объект' : (mySelectionItems.length < 5 ? 'объекта' : 'объектов')}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                                                {myRequests.length > 0 ? `${myRequests.length} запр.` : 'Запросы'} · {mySelectionItems.length} в подборе
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        {mySelectionItems.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setIsPresentationOpen(true)}
                                                className="card-clickable"
                                                style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                                    padding: '5px 11px', borderRadius: 8,
                                                    background: 'var(--primary, #0052FF)',
                                                    color: '#ffffff',
                                                    border: 'none',
                                                    fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                                                    boxShadow: '0 2px 8px rgba(0, 82, 255, 0.25)'
                                                }}
                                                title="Сформировать презентацию и PDF подборки для клиента"
                                            >
                                                <Sparkles size={12} />
                                                <span>Презентация</span>
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/selection/new?client=${id}&returnTo=/clients/${id}`)}
                                            className="card-clickable"
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                                padding: '4px 10px', borderRadius: 8,
                                                border: '1px solid rgba(124, 58, 237, 0.25)',
                                                background: 'rgba(124, 58, 237, 0.08)',
                                                color: '#7c3aed',
                                                fontSize: 11, fontWeight: 600, cursor: 'pointer'
                                            }}
                                            title="Добавить объект в подбор клиенту"
                                        >
                                            <Plus size={12} /> + Объект
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => navigate(`/requests/new?client=${id}`)}
                                            className="card-clickable"
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                                padding: '4px 10px', borderRadius: 8,
                                                border: '1px solid rgba(217, 119, 6, 0.25)',
                                                background: 'rgba(217, 119, 6, 0.08)',
                                                color: '#b45309',
                                                fontSize: 11, fontWeight: 500, cursor: 'pointer'
                                            }}
                                            title="Создать запрос на покупку"
                                        >
                                            <Plus size={12} /> + Запрос
                                        </button>
                                    </div>
                                </div>

                                {/* Запросы на покупку (если есть) */}
                                {myRequests.length > 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            Запросы на покупку ({myRequests.length})
                                        </div>
                                        {myRequests.map(r => {
                                            const devMatchesCount = (r.status || 'active') === 'active'
                                                ? matchDevelopmentsToRequest(developments, r).length
                                                : 0;
                                            return (
                                                <div key={r.id} className="card-clickable" onClick={() => navigate(`/requests/${r.id}`)}
                                                    style={{ padding: '12px 14px', background: 'var(--bg-light)', borderRadius: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                                                        <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', flexShrink: 0 }}>
                                                            <FileText size={16} />
                                                        </div>
                                                        <div style={{ minWidth: 0, flex: 1 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                                <span style={{ fontSize: 10, fontWeight: 500, color: '#f59e0b' }}>Запрос на покупку</span>
                                                                <span style={{ 
                                                                    fontSize: 9, 
                                                                    padding: '1px 6px', 
                                                                    borderRadius: 6, 
                                                                    background: (r.status || 'active') === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                                                                    color: (r.status || 'active') === 'active' ? '#10b981' : '#64748b'
                                                                }}>
                                                                    {(r.status || 'active') === 'active' ? 'Актуально' : 'Завершен'}
                                                                </span>
                                                                {devMatchesCount > 0 && (
                                                                    <span style={{
                                                                        fontSize: 9,
                                                                        fontWeight: 600,
                                                                        padding: '1px 6px',
                                                                        borderRadius: 6,
                                                                        background: 'rgba(0, 82, 255, 0.12)',
                                                                        color: 'var(--primary)'
                                                                    }}>
                                                                        Новостройки: {devMatchesCount}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {r.property_types?.map(t => PROPERTY_TYPES[t] || t).join(', ') || 'Любой тип'}
                                                            </div>
                                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                                до {r.budget_max ? formatNumber(r.budget_max) + ' ₽' : '-'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={16} color="var(--text-muted)" />
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Объекты в подборе */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            Объекты в подборе ({mySelectionItems.length})
                                        </div>
                                    </div>

                                    {mySelectionItems.length === 0 ? (
                                        <div style={{
                                            fontSize: 12, color: 'var(--text-muted)',
                                            background: 'var(--bg-light)', padding: '14px 16px', borderRadius: 14,
                                            display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start'
                                        }}>
                                            <div style={{ fontWeight: 500, color: 'var(--text)' }}>В подборе пока нет объектов</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                                Добавляйте подходящие квартиры из раздела «Новостройки», из поиска по порталам или по кнопке «+ Объект»
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/selection/new?client=${id}&returnTo=/clients/${id}`)}
                                                className="card-clickable"
                                                style={{
                                                    marginTop: 4,
                                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                                    padding: '5px 12px', borderRadius: 8,
                                                    background: 'rgba(124, 58, 237, 0.1)',
                                                    color: '#7c3aed',
                                                    border: '1px solid rgba(124, 58, 237, 0.25)',
                                                    fontSize: 11.5, fontWeight: 600, cursor: 'pointer'
                                                }}
                                            >
                                                <Plus size={13} /> Добавить объект в подбор
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {mySelectionItems.map(item => {
                                                const parts = [];
                                                if (item.rooms !== undefined && item.rooms !== null) {
                                                    parts.push(item.rooms === 0 ? 'Студия' : `${item.rooms}к`);
                                                }
                                                if (item.area_total) {
                                                    parts.push(`${item.area_total} м²`);
                                                }
                                                if (item.property_type === 'house') {
                                                    if (item.land_area) parts.push(`${item.land_area} сот.`);
                                                    if (item.floors_total || item.house_floors) parts.push(`${item.floors_total || item.house_floors} эт.`);
                                                } else if (item.floor || item.floors_total) {
                                                    if (item.floor && item.floors_total) parts.push(`${item.floor}/${item.floors_total} эт.`);
                                                    else if (item.floor) parts.push(`${item.floor} эт.`);
                                                    else parts.push(`${item.floors_total} эт.`);
                                                }
                                                if (item.property_type) {
                                                    parts.push(PROPERTY_TYPES[item.property_type] || item.property_type);
                                                }

                                                const firstImage = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null;

                                                return (
                                                    <div
                                                        key={item.id}
                                                        className="card"
                                                        style={{
                                                            padding: '12px 14px',
                                                            borderRadius: 14,
                                                            background: 'var(--bg-light)',
                                                            border: '1px solid var(--border-light)',
                                                            display: 'flex',
                                                            gap: 12,
                                                            alignItems: 'flex-start',
                                                            position: 'relative'
                                                        }}
                                                    >
                                                        {/* Превью фото/планировки */}
                                                        {firstImage ? (
                                                            <img
                                                                src={firstImage}
                                                                alt={item.address || 'Объект'}
                                                                style={{
                                                                    width: 60,
                                                                    height: 60,
                                                                    borderRadius: 10,
                                                                    objectFit: 'cover',
                                                                    flexShrink: 0,
                                                                    background: 'var(--surface)',
                                                                    border: '1px solid var(--border-light)'
                                                                }}
                                                            />
                                                        ) : (
                                                            <div style={{
                                                                width: 60,
                                                                height: 60,
                                                                borderRadius: 10,
                                                                background: 'rgba(124, 58, 237, 0.08)',
                                                                color: '#7c3aed',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                flexShrink: 0
                                                            }}>
                                                                <Building2 size={24} />
                                                            </div>
                                                        )}

                                                        {/* Описание объекта */}
                                                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                                                            {/* Цена и цена за м2 */}
                                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                                                                <span className="font-oswald" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', lineHeight: 1.1 }}>
                                                                    {item.price ? formatNumber(item.price) + ' ₽' : 'Цена не указана'}
                                                                </span>
                                                                {item.price && item.area_total ? (
                                                                    <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
                                                                        {formatNumber(Math.round(item.price / item.area_total))} ₽/м²
                                                                    </span>
                                                                ) : null}
                                                            </div>

                                                            {/* Адрес и ссылка */}
                                                            <div style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {item.city ? (item.address ? `${item.city}, ${item.address}` : item.city) : (item.address || 'Адрес не указан')}
                                                                </span>
                                                                {item.link && (
                                                                    <a
                                                                        href={item.link}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        onClick={e => e.stopPropagation()}
                                                                        style={{
                                                                            display: 'inline-flex', alignItems: 'center', gap: 3,
                                                                            fontSize: 10, color: 'var(--primary)',
                                                                            background: 'rgba(0, 82, 255, 0.08)', padding: '2px 6px',
                                                                            borderRadius: 6, textDecoration: 'none', fontWeight: 600
                                                                        }}
                                                                        title="Открыть объявление"
                                                                    >
                                                                        <ExternalLink size={10} /> Ссылка
                                                                    </a>
                                                                )}
                                                            </div>

                                                            {/* Характеристики */}
                                                            {parts.length > 0 && (
                                                                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                                                    {parts.join(' · ')}
                                                                </div>
                                                            )}

                                                            {/* Контакты продавца/агента */}
                                                            {(item.contact_name || item.contact_phone) && (
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap', marginTop: 2 }}>
                                                                    {item.contact_name && (
                                                                        <span>Контакт: <strong style={{ color: 'var(--text)' }}>{item.contact_name}</strong></span>
                                                                    )}
                                                                    {item.contact_phone && (
                                                                        <a
                                                                            href={`tel:+${stripPhone(item.contact_phone)}`}
                                                                            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}
                                                                        >
                                                                            <Phone size={10} /> {formatPhone(item.contact_phone)}
                                                                        </a>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Заметки */}
                                                            {item.notes && (
                                                                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>
                                                                    {item.notes}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Блок действий с объектом */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, alignItems: 'flex-end' }}>
                                                            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                                                <button
                                                                    type="button"
                                                                    className="card-clickable"
                                                                    onClick={() => handleImportSelectionToProperties(item)}
                                                                    title="Импортировать в мои объекты"
                                                                    style={{
                                                                        border: 'none', background: 'rgba(16, 185, 129, 0.1)',
                                                                        color: '#059669', padding: '5px', borderRadius: 6,
                                                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                    }}
                                                                >
                                                                    <Download size={13} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="card-clickable"
                                                                    onClick={() => navigate(`/history/new?event_type=viewing&property_id=${item.id}&client_ids=${id}`)}
                                                                    title="Назначить показ / просмотр"
                                                                    style={{
                                                                        border: 'none', background: 'rgba(124, 58, 237, 0.08)',
                                                                        color: '#7c3aed', padding: '5px', borderRadius: 6,
                                                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                    }}
                                                                >
                                                                    <Calendar size={13} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="card-clickable"
                                                                    onClick={() => navigate(`/selection/${item.id}/edit`)}
                                                                    title="Редактировать объект"
                                                                    style={{
                                                                        border: 'none', background: 'rgba(0, 82, 255, 0.08)',
                                                                        color: 'var(--primary)', padding: '5px', borderRadius: 6,
                                                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                    }}
                                                                >
                                                                    <Pencil size={13} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="card-clickable"
                                                                    onClick={() => handleDeleteSelectionItem(item.id)}
                                                                    title="Удалить из подбора"
                                                                    style={{
                                                                        border: 'none', background: 'rgba(239, 68, 68, 0.08)',
                                                                        color: '#ef4444', padding: '5px', borderRadius: 6,
                                                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                    }}
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ── Заметки клиента ── */}
                        {client.notes && (
                            <div className="card" style={{
                                padding: '14px 16px',
                                border: '1px solid var(--border-light)',
                                boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                                borderRadius: 18,
                                background: 'var(--surface)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                                        Заметки по клиенту
                                    </span>
                                    <button
                                        onClick={() => navigate(`/clients/${id}/edit`)}
                                        className="card-clickable"
                                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                                        title="Редактировать заметки"
                                    >
                                        <Pencil size={12} />
                                    </button>
                                </div>
                                <div style={{
                                    fontSize: 12,
                                    color: 'var(--text-secondary)',
                                    background: 'var(--bg-light)',
                                    padding: '8px 12px',
                                    borderRadius: 10,
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: 1.45
                                }}>
                                    {client.notes}
                                </div>
                            </div>
                        )}
                    </div>
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
                                            <option value="">- Без объекта -</option>
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
                                        {editingContractId ? 'Редактировать агентский договор' : (renewingContractId ? 'Перезаключить агентский договор' : 'Добавить агентский договор')}
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

                        {renewingContractId && (
                            <div style={{
                                padding: '10px 14px',
                                borderRadius: 12,
                                background: 'rgba(59, 130, 246, 0.08)',
                                border: '1px solid rgba(59, 130, 246, 0.25)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                fontSize: 12,
                                color: 'var(--text)',
                                marginBottom: 14
                            }}>
                                <Archive size={16} color="#3b82f6" style={{ flexShrink: 0 }} />
                                <div>
                                    <strong>Перезаключение договора:</strong> Истекшая версия будет перенесена в архив со статусом «Закрыт», напоминания по ней будут отключены.
                                </div>
                            </div>
                        )}

                        {(() => {
                            const modalTypeCfg = getContractTypeConfig(contractForm.type);
                            return (
                                <form onSubmit={handleSaveContract} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {/* Тип договора с цветным бейджем */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                                Тип договора *
                                            </label>
                                            <span style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                padding: '2px 8px',
                                                borderRadius: 6,
                                                background: modalTypeCfg.bg,
                                                color: modalTypeCfg.color,
                                                border: `1.5px solid ${modalTypeCfg.border}`,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 4
                                            }}>
                                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: modalTypeCfg.color }} />
                                                {contractForm.type}
                                            </span>
                                        </div>
                                        <select
                                            className="form-select"
                                            required
                                            value={contractForm.type}
                                            onChange={e => setContractForm({ ...contractForm, type: e.target.value })}
                                            style={{ width: '100%', height: 46, borderRadius: 14, border: '1px solid var(--border-light)', padding: '0 14px', background: 'var(--bg-light)', color: 'var(--text)', fontWeight: 600 }}
                                        >
                                            {AGENCY_CONTRACT_TYPES.map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Номер договора и Статус договора */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div>
                                            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                                                Номер договора
                                            </label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="например: № 14/26"
                                                value={contractForm.contract_number || ''}
                                                onChange={e => setContractForm({ ...contractForm, contract_number: e.target.value })}
                                                style={{ width: '100%', height: 46, borderRadius: 14, border: '1px solid var(--border-light)', padding: '0 14px', background: 'var(--bg-light)', color: 'var(--text)' }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                                                Статус договора *
                                            </label>
                                            <select
                                                className="form-select"
                                                value={contractForm.status}
                                                onChange={e => setContractForm({ ...contractForm, status: e.target.value })}
                                                style={{ width: '100%', height: 46, borderRadius: 14, border: '1px solid var(--border-light)', padding: '0 14px', background: 'var(--bg-light)', color: 'var(--text)' }}
                                            >
                                                <option value="active">Действующий</option>
                                                <option value="fulfilled">Исполнен (сделка закрыта)</option>
                                                <option value="closed">Закрыт</option>
                                                <option value="terminated">Расторгнут (архив)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Даты: Заключение и Окончание (вручную) */}
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
                                                onChange={e => {
                                                    const newDate = e.target.value;
                                                    let newEnd = contractForm.valid_until;
                                                    if (newDate) {
                                                        const auto = calculateContractEndDate(newDate, contractForm.duration_months || DEFAULT_CONTRACT_DURATION_MONTHS, contractForm.is_extended);
                                                        if (auto) newEnd = auto.toISOString().split('T')[0];
                                                    }
                                                    setContractForm({ ...contractForm, date: newDate, valid_until: newEnd });
                                                }}
                                                style={{ width: '100%', height: 46, borderRadius: 14, border: '1px solid var(--border-light)', padding: '0 14px', background: 'var(--bg-light)', color: 'var(--text)' }}
                                            />
                                        </div>

                                        <div>
                                            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                                                Действует до (вручную) *
                                            </label>
                                            <input
                                                type="date"
                                                className="form-input"
                                                value={contractForm.valid_until || ''}
                                                onChange={e => setContractForm({ ...contractForm, valid_until: e.target.value })}
                                                style={{ width: '100%', height: 46, borderRadius: 14, border: '1.5px solid #10b981', padding: '0 14px', background: '#ecfdf5', color: '#059669', fontWeight: 600 }}
                                            />
                                        </div>
                                    </div>

                                    {/* Быстрый выбор срока действия */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                                                Срок договора (месяцев: {contractForm.duration_months})
                                            </label>
                                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>быстрый расчет окончания:</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            {[1, 2, 3, 6, 12].map(m => {
                                                const isSel = Number(contractForm.duration_months) === m;
                                                return (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        className="card-clickable"
                                                        onClick={() => {
                                                            const baseDate = contractForm.date || new Date().toISOString().split('T')[0];
                                                            const auto = calculateContractEndDate(baseDate, m, contractForm.is_extended);
                                                            setContractForm({
                                                                ...contractForm,
                                                                duration_months: m,
                                                                valid_until: auto ? auto.toISOString().split('T')[0] : contractForm.valid_until
                                                            });
                                                        }}
                                                        style={{
                                                            padding: '5px 12px',
                                                            borderRadius: 8,
                                                            border: isSel ? '1.5px solid var(--primary)' : '1px solid var(--border-light)',
                                                            background: isSel ? 'rgba(0, 82, 255, 0.08)' : 'var(--surface)',
                                                            color: isSel ? 'var(--primary)' : 'var(--text)',
                                                            fontSize: 11.5,
                                                            fontWeight: isSel ? 700 : 500,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {m} {m === 1 ? 'месяц' : (m < 5 ? 'месяца' : (m === 12 ? '1 год' : 'месяцев'))}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Привязка к объекту */}
                                    <div>
                                        <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                                            По какому объекту
                                        </label>
                                        <select
                                            className="form-select"
                                            value={contractForm.property_id || ''}
                                            onChange={e => {
                                                const pId = e.target.value;
                                                const selProp = state.properties.find(p => p.id === pId);
                                                const pOwners = selProp ? parsePgArray(selProp.client_ids).map(String) : [];
                                                const nextCoIds = pOwners.length > 1 ? Array.from(new Set([id, ...pOwners])) : [id];
                                                setContractForm({
                                                    ...contractForm,
                                                    property_id: pId,
                                                    price: (!contractForm.price && selProp?.price) ? formatPriceInput(selProp.price) : contractForm.price,
                                                    co_client_ids: nextCoIds
                                                });
                                            }}
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

                                    {/* Сособственники по договору (если у объекта несколько владельцев) */}
                                    {(() => {
                                        const selProp = state.properties.find(p => p.id === contractForm.property_id);
                                        const propOwners = selProp ? parsePgArray(selProp.client_ids).map(String) : [];
                                        const otherCandidateIds = Array.from(new Set([
                                            ...propOwners,
                                            ...(contractForm.co_client_ids || []).map(String)
                                        ])).filter(cid => cid !== String(id));
                                        if (otherCandidateIds.length === 0) return null;
                                        return (
                                            <div style={{
                                                padding: '10px 12px',
                                                borderRadius: 12,
                                                background: 'var(--bg-light)',
                                                border: '1px solid var(--border-light)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 6
                                            }}>
                                                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    <Users size={12} style={{ color: 'var(--primary)' }} />
                                                    Сособственники в договоре
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                    {otherCandidateIds.map(cid => {
                                                        const co = state.clients.find(c => String(c.id) === String(cid));
                                                        if (!co) return null;
                                                        const isChecked = (contractForm.co_client_ids || []).map(String).includes(String(cid));
                                                        const share = selProp?.client_shares?.[co.id];
                                                        return (
                                                            <label key={co.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text)', cursor: 'pointer' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={e => {
                                                                        const curr = (contractForm.co_client_ids || [id]).map(String);
                                                                        const next = e.target.checked
                                                                            ? Array.from(new Set([...curr, String(co.id)]))
                                                                            : curr.filter(x => x !== String(co.id));
                                                                        setContractForm({ ...contractForm, co_client_ids: next });
                                                                    }}
                                                                />
                                                                <span style={{ flex: 1, fontWeight: 500 }}>{co.full_name}</span>
                                                                {share && (
                                                                    <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>Доля: {share}</span>
                                                                )}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Финансовые условия: Сумма и Комиссия */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div>
                                            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                                                Сумма объекта (₽)
                                            </label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="text"
                                                    inputMode="numeric"
                                                    className="form-input"
                                                    placeholder="например: 4 800 000"
                                                    value={contractForm.price || ''}
                                                    onChange={e => {
                                                        const digits = parsePriceInput(e.target.value);
                                                        setContractForm({ ...contractForm, price: formatPriceInput(digits) });
                                                    }}
                                                    style={{ width: '100%', height: 46, borderRadius: 14, border: '1px solid var(--border-light)', padding: '0 32px 0 14px', background: 'var(--bg-light)', color: 'var(--text)', fontWeight: 600 }}
                                                />
                                                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, pointerEvents: 'none' }}>
                                                    ₽
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                                                Комиссия / вознаграждение
                                            </label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="например: 100 000 ₽ или 3%"
                                                value={contractForm.commission || ''}
                                                onChange={e => {
                                                    const rawVal = e.target.value;
                                                    if (!rawVal) {
                                                        setContractForm({ ...contractForm, commission: '' });
                                                        return;
                                                    }
                                                    if (rawVal.includes('%')) {
                                                        const clean = rawVal.replace(/[^\d.,%]/g, '');
                                                        setContractForm({ ...contractForm, commission: clean });
                                                    } else {
                                                        const digits = parsePriceInput(rawVal);
                                                        setContractForm({ ...contractForm, commission: digits ? `${formatPriceInput(digits)} ₽` : '' });
                                                    }
                                                }}
                                                style={{ width: '100%', height: 46, borderRadius: 14, border: '1px solid var(--border-light)', padding: '0 14px', background: 'var(--bg-light)', color: 'var(--text)', fontWeight: 600 }}
                                            />
                                        </div>
                                    </div>

                                    {/* Быстрый выбор комиссии */}
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: -4 }}>
                                        <span style={{ fontSize: 10.5, color: 'var(--text-muted)', alignSelf: 'center', marginRight: 2 }}>
                                            быстрый выбор:
                                        </span>
                                        {['2%', '3%', '4%', '50 000 ₽', '100 000 ₽', '150 000 ₽'].map(opt => (
                                            <button
                                                key={opt}
                                                type="button"
                                                className="card-clickable"
                                                onClick={() => setContractForm({ ...contractForm, commission: opt })}
                                                style={{
                                                    padding: '3px 8px',
                                                    borderRadius: 6,
                                                    border: contractForm.commission === opt ? '1px solid #10b981' : '1px solid var(--border-light)',
                                                    background: contractForm.commission === opt ? '#ecfdf5' : 'var(--surface)',
                                                    color: contractForm.commission === opt ? '#059669' : 'var(--text)',
                                                    fontSize: 10.5,
                                                    fontWeight: contractForm.commission === opt ? 700 : 500,
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Блок продления договора */}
                                    <div style={{
                                        padding: '10px 14px',
                                        borderRadius: 14,
                                        background: contractForm.is_extended ? 'rgba(124, 58, 237, 0.06)' : 'var(--bg-light)',
                                        border: contractForm.is_extended ? '1px solid rgba(124, 58, 237, 0.25)' : '1px solid var(--border-light)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 4
                                    }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                                            <input
                                                type="checkbox"
                                                checked={contractForm.is_extended}
                                                onChange={e => {
                                                    const isExt = e.target.checked;
                                                    let newEnd = contractForm.valid_until;
                                                    if (contractForm.date) {
                                                        const auto = calculateContractEndDate(contractForm.date, contractForm.duration_months || DEFAULT_CONTRACT_DURATION_MONTHS, isExt);
                                                        if (auto) newEnd = auto.toISOString().split('T')[0];
                                                    }
                                                    setContractForm({ ...contractForm, is_extended: isExt, valid_until: newEnd });
                                                }}
                                                style={{ width: 18, height: 18, accentColor: '#7c3aed', cursor: 'pointer' }}
                                            />
                                            <span>Продлен 1 раз на тот же срок (+{contractForm.duration_months} мес.)</span>
                                        </label>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 28, lineHeight: 1.4 }}>
                                            Регламент: продление возможно <strong>строго 1 раз</strong> на тот же срок.
                                        </div>
                                    </div>

                                    {/* Особые условия / Примечание */}
                                    <div>
                                        <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                                            Особые условия / примечание
                                        </label>
                                        <textarea
                                            rows={2}
                                            className="form-textarea"
                                            placeholder="Особые условия комиссии, порядок расчетов, комментарии..."
                                            value={contractForm.comment || ''}
                                            onChange={e => setContractForm({ ...contractForm, comment: e.target.value })}
                                            style={{ width: '100%', borderRadius: 14, border: '1px solid var(--border-light)', padding: '10px 14px', background: 'var(--bg-light)', color: 'var(--text)', resize: 'vertical' }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                                        {editingContractId && (
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteContract(editingContractId)}
                                                style={{
                                                    height: 46, padding: '0 14px', borderRadius: 14,
                                                    border: '1px solid rgba(239, 68, 68, 0.25)',
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
                            );
                        })()}
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

            {/* Модальное окно привязки объекта недвижимости к собственнику */}
            {isLinkPropertyModalOpen && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1200,
                    background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 16
                }} onClick={() => setIsLinkPropertyModalOpen(false)}>
                    <div
                        className="card"
                        style={{
                            maxWidth: 520, width: '100%', maxHeight: '85vh',
                            background: 'var(--surface)', borderRadius: 20,
                            padding: '22px 24px', boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
                            border: '1px solid var(--border-light)',
                            display: 'flex', flexDirection: 'column', gap: 14,
                            overflow: 'hidden'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: 12,
                                    background: 'rgba(0, 82, 255, 0.1)', color: 'var(--primary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <Home size={20} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                                        Привязать объект собственности
                                    </h3>
                                    <div style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                                        Собственник / наймодатель: {client.full_name}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsLinkPropertyModalOpen(false)}
                                style={{
                                    border: 'none', background: 'transparent',
                                    cursor: 'pointer', color: 'var(--text-muted)', padding: 4
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Поиск объекта */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            background: 'var(--bg-light)', borderRadius: 12,
                            padding: '0 12px', height: 40, border: '1px solid var(--border-light)'
                        }}>
                            <Search size={16} color="var(--text-muted)" />
                            <input
                                type="text"
                                placeholder="Поиск по адресу, комнатам или цене..."
                                value={propertySearch}
                                onChange={e => setPropertySearch(e.target.value)}
                                style={{
                                    border: 'none', background: 'transparent',
                                    width: '100%', outline: 'none', fontSize: 13,
                                    color: 'var(--text)'
                                }}
                                autoFocus
                            />
                            {propertySearch && (
                                <button
                                    type="button"
                                    onClick={() => setPropertySearch('')}
                                    style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>

                        {/* Список объектов для привязки */}
                        <div style={{
                            display: 'flex', flexDirection: 'column', gap: 8,
                            overflowY: 'auto', maxHeight: '50vh', paddingRight: 4
                        }}>
                            {unlinkedProperties.length === 0 ? (
                                <div style={{
                                    padding: '24px 16px', textAlign: 'center',
                                    background: 'var(--bg-light)', borderRadius: 14,
                                    color: 'var(--text-muted)', fontSize: 12.5,
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10
                                }}>
                                    <span>
                                        {propertySearch ? 'Объекты по запросу не найдены' : 'Все объекты в базе уже привязаны к этому клиенту'}
                                    </span>
                                    <button
                                        type="button"
                                        className="card-clickable"
                                        onClick={() => {
                                            setIsLinkPropertyModalOpen(false);
                                            navigate(`/properties/new?client=${id}&client_id=${id}`, {
                                                state: { prefillProperty: { client_id: id, client_ids: [id], client_shares: { [id]: '1/1' } } }
                                            });
                                        }}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 6,
                                            padding: '7px 14px', borderRadius: 10, border: 'none',
                                            background: 'var(--primary)', color: '#fff', fontSize: 12,
                                            fontWeight: 600, cursor: 'pointer'
                                        }}
                                    >
                                        <Plus size={14} /> Создать новый объект
                                    </button>
                                </div>
                            ) : (
                                unlinkedProperties.map(p => {
                                    const otherOwners = (p.client_ids || (p.client_id ? [p.client_id] : []))
                                        .map(cid => state.clients.find(c => c.id === cid)?.full_name)
                                        .filter(Boolean);

                                    return (
                                        <div
                                            key={p.id}
                                            style={{
                                                padding: '12px 14px', borderRadius: 14,
                                                background: 'var(--bg-light)',
                                                border: '1px solid var(--border-light)',
                                                display: 'flex', alignItems: 'center',
                                                justifyContent: 'space-between', gap: 12
                                            }}
                                        >
                                            <div style={{ minWidth: 0, flex: 1 }}>
                                                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {p.address || p.city || 'Адрес не указан'}
                                                </div>
                                                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>
                                                    {p.price ? formatNumber(p.price) + ' ₽' : 'Цена не указана'}
                                                    {p.rooms ? ` • ${p.rooms}-к кв.` : ''}
                                                    {p.area ? ` • ${p.area} м²` : ''}
                                                </div>
                                                {otherOwners.length > 0 && (
                                                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2 }}>
                                                        Собственники: {otherOwners.join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                className="card-clickable"
                                                onClick={() => handleLinkProperty(p)}
                                                style={{
                                                    padding: '6px 14px', borderRadius: 8, border: 'none',
                                                    background: '#10b981', color: '#fff',
                                                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                                    flexShrink: 0
                                                }}
                                            >
                                                Привязать
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: '1px solid var(--border-light)' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsLinkPropertyModalOpen(false);
                                    navigate(`/properties/new?client=${id}&client_id=${id}`, {
                                        state: { prefillProperty: { client_id: id, client_ids: [id], client_shares: { [id]: '1/1' } } }
                                    });
                                }}
                                style={{
                                    border: 'none', background: 'transparent',
                                    color: 'var(--primary)', fontSize: 12, fontWeight: 600,
                                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4
                                }}
                            >
                                <Plus size={14} /> Создать объект с нуля
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsLinkPropertyModalOpen(false)}
                                style={{
                                    padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border-light)',
                                    background: 'transparent', color: 'var(--text-secondary)', fontSize: 12,
                                    cursor: 'pointer'
                                }}
                            >
                                Закрыть
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модальное окно проверки клиента по госреестрам и отчета */}
            <ClientVerificationModal
                isOpen={isVerificationOpen}
                onClose={() => setIsVerificationOpen(false)}
                client={client}
            />

            {/* Модальное окно поздравления с днем рождения (Самолет Плюс Киров + агент) */}
            <BirthdayGreetingModal
                isOpen={isBirthdayModalOpen}
                onClose={() => setIsBirthdayModalOpen(false)}
                client={client}
                currentUser={state.currentUser}
                onUpdateClient={(updated) => dispatch({ type: 'UPDATE_CLIENT', client: updated })}
            />

            {/* Презентация подборки объектов для клиента (PDF, печать, шеринг) */}
            <SelectionPresentationModal
                isOpen={isPresentationOpen}
                onClose={() => setIsPresentationOpen(false)}
                client={client}
                items={mySelectionItems}
                currentUser={state.currentUser}
            />

            {crossServiceModal.open && (
                <CrossServiceModal
                    isOpen={crossServiceModal.open}
                    initialItem={crossServiceModal.item}
                    initialClientId={client.id}
                    onClose={() => setCrossServiceModal({ open: false, item: null })}
                />
            )}
        </div>
    );
}
