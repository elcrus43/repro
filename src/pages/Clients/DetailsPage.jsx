import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { formatPhone, stripPhone, formatNumber, getEventStatusLabel, toLocalISOString, parseLocalDateTime, formatDate } from '../../utils/format';
import { Pencil, Phone, Mail, Calendar, TrendingUp, ChevronRight, Plus, ChevronLeft, Share2, Briefcase, Sparkles, Home, FileText, X, Users, Clock, Trash2, ShieldCheck, Copy, Check } from 'lucide-react';
import { PROPERTY_TYPES } from '../../data/constants';
import { nanoid } from '../../utils/nanoid';
import { ClientVerificationModal } from '../../components/ClientVerificationModal';

const EXCLUDED_PROP_STATUSES = ['sold', 'deal_closed'];
const EXCLUDED_MATCH_STATUSES = ['deal', 'rejected'];

export function DetailsPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const { id } = useParams();
    const { toast } = useToastContext();
    const client = state.clients.find(c => c.id === id);
    const [isEditingTypes, setIsEditingTypes] = useState(false);
    const [isVerificationOpen, setIsVerificationOpen] = useState(false);
    const [quickModalType, setQuickModalType] = useState(null); // null | 'meeting' | 'call'
    const [quickForm, setQuickForm] = useState({
        showing_date: '',
        property_id: '',
        status: 'planned',
        feedback_comment: '',
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
    const myProperties = state.properties.filter(p =>
        p.client_id === id || (p.client_ids || []).includes(id)
    );
    // Объекты в продаже — все кроме sold / deal_closed
    const activeProperties = myProperties.filter(p => !EXCLUDED_PROP_STATUSES.includes(p.status));

    const myRequests = state.requests.filter(r =>
        r.client_id === id || (r.client_ids || []).includes(id)
    );

    // Матчи — все кроме deal / rejected
    const propMatches = state.matches.filter(m =>
        !EXCLUDED_MATCH_STATUSES.includes(m.status) &&
        state.properties.find(p => p.id === m.property_id && (p.client_id === id || (p.client_ids || []).includes(id)))
    );
    const reqMatches = state.matches.filter(m =>
        !EXCLUDED_MATCH_STATUSES.includes(m.status) &&
        state.requests.find(r => r.id === m.request_id && (r.client_id === id || (r.client_ids || []).includes(id)))
    );
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
        selection: 'Подбор',
        active: 'В работе',
        refused: 'Отказ'
    };
    const typeLabels   = { buyer: 'Покупатель', seller: 'Продавец', developer: 'Застройщик', agent: 'Агент', landlord: 'Арендодатель', tenant: 'Арендатор', lawyer: 'Юрист' };

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
            property_id: '',
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

    function handleShareLink() {
        if (!client.public_token) { toast.error('У клиента нет публичного токена'); return; }
        const link = window.location.origin + '/c/' + client.public_token;
        navigator.clipboard.writeText(link)
            .then(() => toast.success('Ссылка скопирована'))
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

    function handleDeleteClient() {
        if (window.confirm(`Удалить клиента "${client.full_name}"? Это действие нельзя отменить.`)) {
            dispatch({ type: 'DELETE_CLIENT', id });
            toast.success('Клиент успешно удален');
            navigate('/clients');
        }
    }

    const initial  = client.full_name?.charAt(0).toUpperCase() || '?';
    const colors   = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    const avatarBg = colors[initial.charCodeAt(0) % colors.length];

    return (
        <div className="page fade-in" style={{ background: 'var(--surface)' }}>
            {/* ── Topbar ── */}
            <div className="topbar sticky" style={{
                background: 'var(--topbar-bg)', backdropFilter: 'blur(24px) saturate(180%)',
                padding: '20px', borderBottom: '1px solid var(--border-light)',
                zIndex: 1000, display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <button onClick={() => navigate('/clients')} className="card-clickable" style={{
                    width: 44, height: 44, borderRadius: 14, border: 'none',
                    background: 'var(--surface)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', color: 'var(--text)'
                }}>
                    <ChevronLeft size={20} />
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                    <span className="font-oswald" style={{ fontSize: 18, fontWeight: 300, letterSpacing: '0.01em', color: 'var(--text)' }}>
                        Профиль клиента
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 300, opacity: 0.6 }}>Управление</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button 
                        className="card-clickable" 
                        onClick={() => navigate(`/clients/${id}/edit`)} 
                        title="Редактировать"
                        style={{
                            width: 44, height: 44, borderRadius: 14, border: 'none',
                            background: 'var(--surface)', color: 'var(--text)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer'
                        }}
                    >
                        <Pencil size={18} />
                    </button>
                    <button 
                        className="card-clickable" 
                        onClick={handleDeleteClient} 
                        title="Удалить клиента"
                        style={{
                            width: 44, height: 44, borderRadius: 14, border: 'none',
                            background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', boxShadow: '0 2px 8px rgba(239,68,68,0.1)', cursor: 'pointer'
                        }}
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            <div className="page-content" style={{ padding: '20px 20px 120px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* ── Профиль ── */}
                <div className="card" style={{ padding: '28px 24px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: 'var(--surface)', textAlign: 'center' }}>
                    <div className="font-oswald" style={{ fontSize: 24, fontWeight: 300, color: 'var(--text)', marginBottom: 8 }}>{client.full_name}</div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
                        {!isEditingTypes ? (
                            <>
                                {client.client_types?.map(t => {
                                    const isAgent = t === 'agent';
                                    return (
                                        <button
                                            key={t}
                                            onClick={() => setIsEditingTypes(true)}
                                            className="card-clickable"
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: 10,
                                                fontSize: 11,
                                                fontWeight: isAgent ? 600 : 300,
                                                background: isAgent ? '#ecfdf5' : 'var(--primary-light)',
                                                color: isAgent ? '#059669' : 'var(--primary)',
                                                border: isAgent ? '1px solid #10b981' : 'none',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                            title="Нажмите, чтобы изменить типы"
                                        >
                                            {typeLabels[t] || t}
                                        </button>
                                    );
                                })}
                            </>
                        ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignItems: 'center', background: 'var(--bg-light)', padding: '12px', borderRadius: 16, width: '100%', marginTop: 8 }}>
                                <div style={{ width: '100%', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Выберите типы клиента:</div>
                                {Object.entries(typeLabels).map(([typeId, label]) => {
                                    const isActive = client.client_types?.includes(typeId);
                                    return (
                                        <button
                                            key={typeId}
                                            onClick={() => handleToggleType(typeId)}
                                            className="card-clickable"
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: 10,
                                                fontSize: 11,
                                                fontWeight: isActive ? 400 : 300,
                                                background: isActive ? 'var(--primary)' : 'var(--surface)',
                                                color: isActive ? '#fff' : 'var(--text)',
                                                border: isActive ? 'none' : '1px solid var(--border-light)',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => setIsEditingTypes(false)}
                                    className="card-clickable"
                                    style={{
                                        padding: '6px 16px',
                                        borderRadius: 10,
                                        fontSize: 11,
                                        fontWeight: 500,
                                        background: 'var(--success)',
                                        color: '#fff',
                                        border: 'none',
                                        marginTop: 8,
                                        width: '100%'
                                    }}
                                >
                                    Готово
                                </button>
                            </div>
                        )}
                    </div>



                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 14, fontSize: 13, color: 'var(--text-secondary)' }}>
                        <a href={`tel:+${stripPhone(client.phone)}`} onClick={handleCall} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 400 }}>
                            {formatPhone(client.phone)}
                        </a>
                        {client.email && (
                            <a href={`mailto:${client.email}`} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 11, fontWeight: 300 }}>
                                {client.email}
                            </a>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 12, justifyContent: 'center' }}>
                        <a href={`tel:+${stripPhone(client.phone)}`} className="card-clickable" onClick={handleCall} style={{
                            width: 48, height: 48, borderRadius: 16, background: 'var(--bg-light)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)'
                        }}><Phone size={20} /></a>
                        <a href={`https://wa.me/${stripPhone(client.phone)}`} target="_blank" rel="noopener noreferrer" className="card-clickable" style={{
                            width: 48, height: 48, borderRadius: 16, background: '#e7f9ee',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#25D366'
                        }}>
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                        </a>
                        <a href={`https://t.me/+${stripPhone(client.phone)}`} target="_blank" rel="noopener noreferrer" className="card-clickable" style={{
                            width: 48, height: 48, borderRadius: 16, background: '#e1f3ff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0088cc'
                        }}>
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z" /></svg>
                        </a>
                    </div>

                    {/* ── Блок проверки и реквизитов госреестров ── */}
                    <div style={{
                        marginTop: 18,
                        padding: '18px 20px',
                        borderRadius: 24,
                        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        textAlign: 'left'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ShieldCheck size={18} color="#10b981" />
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                    Реквизиты для госреестров
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsVerificationOpen(true)}
                                className="card-clickable"
                                style={{
                                    padding: '6px 14px', borderRadius: 10, border: 'none',
                                    background: '#10b981', color: '#ffffff', fontSize: 12, fontWeight: 600,
                                    display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(16,185,129,0.2)'
                                }}
                            >
                                <ShieldCheck size={14} />
                                <span>Проверить в ФССП, МВД</span>
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, fontSize: 12 }}>
                            {/* ИНН */}
                            <div style={{ padding: '8px 12px', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>ИНН клиента:</div>
                                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{client.inn || client.passport_details?.inn || 'Не указан'}</div>
                                </div>
                                {(client.inn || client.passport_details?.inn) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(client.inn || client.passport_details?.inn);
                                            toast.success('ИНН скопирован!');
                                        }}
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', padding: 2 }}
                                        title="Скопировать ИНН"
                                    >
                                        <Copy size={13} />
                                    </button>
                                )}
                            </div>

                            {/* Дата рождения */}
                            <div style={{ padding: '8px 12px', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>Дата рождения:</div>
                                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{formatDate(client.birth_date || client.passport_details?.birth_date) || 'Не указана'}</div>
                                </div>
                                {(client.birth_date || client.passport_details?.birth_date) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(client.birth_date || client.passport_details?.birth_date);
                                            toast.success('Дата рождения скопирована!');
                                        }}
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', padding: 2 }}
                                        title="Скопировать дату рождения"
                                    >
                                        <Copy size={13} />
                                    </button>
                                )}
                            </div>

                            {/* Паспорт */}
                            <div style={{ padding: '8px 12px', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>Паспорт РФ:</div>
                                    <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                        {client.passport || (client.passport_details?.series ? `${client.passport_details.series} ${client.passport_details.number}` : 'Не указан')}
                                    </div>
                                </div>
                                {(client.passport || client.passport_details?.series) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(client.passport || `${client.passport_details?.series} ${client.passport_details?.number}`);
                                            toast.success('Паспорт скопирован!');
                                        }}
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', padding: 2 }}
                                        title="Скопировать паспорт"
                                    >
                                        <Copy size={13} />
                                    </button>
                                )}
                            </div>

                            {/* Адрес регистрации */}
                            <div style={{ padding: '8px 12px', background: '#ffffff', borderRadius: 12, border: '1px solid #e2e8f0', gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>Адрес регистрации:</div>
                                    <div style={{ fontWeight: 600, color: '#0f172a' }}>
                                        {client.reg_address || client.passport_details?.registration_address || 'Не указан'}
                                    </div>
                                </div>
                                {(client.reg_address || client.passport_details?.registration_address) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(client.reg_address || client.passport_details?.registration_address);
                                            toast.success('Адрес регистрации скопирован!');
                                        }}
                                        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', padding: 2 }}
                                        title="Скопировать адрес регистрации"
                                    >
                                        <Copy size={13} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {client.client_types?.includes('buyer') && (
                        <div style={{ marginTop: 16 }}>
                            <button
                                onClick={() => navigate(`/requests/new?client=${id}`)}
                                className="card-clickable"
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 6,
                                    padding: '8px 16px',
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#d97706',
                                    fontSize: 13,
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    transition: 'opacity 0.2s'
                                }}
                            >
                                <Plus size={15} /> Создать запрос
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Компактная статистика ── */}
                {!client.client_types?.includes('lawyer') && (
                    <div className="card" style={{ padding: '14px 20px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 24, background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* Комиссия */}
                        <div className="card-clickable" onClick={() => navigate('/tasks')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: 16, padding: '8px 14px', flex: 1, minWidth: 0 }}>
                            <TrendingUp size={14} color="#fff" style={{ opacity: 0.9, flexShrink: 0 }} />
                            <div style={{ minWidth: 0 }}>
                                <div className="font-oswald" style={{ fontSize: 16, fontWeight: 300, color: '#fff', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {formatNumber(totalCommission)} ₽
                                </div>
                                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', fontWeight: 300, marginTop: 1 }}>Комиссия</div>
                            </div>
                        </div>
                        {/* Разделитель */}
                        <div style={{ width: 1, height: 32, background: 'var(--border-light)', flexShrink: 0 }} />
                        {/* Объектов */}
                        <div className="card-clickable" onClick={() => navigate(`/properties?client=${id}`)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto', minWidth: 48 }}>
                            <div className="font-oswald" style={{ fontSize: 18, fontWeight: 300, color: 'var(--primary)', lineHeight: 1 }}>{myProperties.length}</div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 300, marginTop: 2 }}>Объектов</div>
                        </div>
                        <div style={{ width: 1, height: 32, background: 'var(--border-light)', flexShrink: 0 }} />
                        {/* Запросов */}
                        <div className="card-clickable" onClick={() => navigate(`/requests?client=${id}`)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto', minWidth: 48 }}>
                            <div className="font-oswald" style={{ fontSize: 18, fontWeight: 300, color: '#f59e0b', lineHeight: 1 }}>{myRequests.length}</div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 300, marginTop: 2 }}>Запросов</div>
                        </div>
                        <div style={{ width: 1, height: 32, background: 'var(--border-light)', flexShrink: 0 }} />
                        {/* Сделок */}
                        <div className="card-clickable" onClick={() => navigate('/tasks')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto', minWidth: 48 }}>
                            <div className="font-oswald" style={{ fontSize: 18, fontWeight: 300, color: '#10b981', lineHeight: 1 }}>{myDeals.length}</div>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 300, marginTop: 2 }}>Сделок</div>
                        </div>
                    </div>
                )}



                {/* ── Последняя активность ──────────────────────────── */}
                {!client.client_types?.includes('lawyer') && (
                    <div className="card" style={{ padding: '28px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: 'var(--surface)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                            <div className="font-oswald" style={{ fontWeight: 300, fontSize: 18, letterSpacing: '0.02em', color: 'var(--text)' }}>Последняя активность</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <button
                                    className="card-clickable"
                                    onClick={() => openQuickModal('meeting')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 5,
                                        padding: '6px 12px', borderRadius: 12, border: 'none',
                                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                        color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                                        boxShadow: '0 2px 8px rgba(139, 92, 246, 0.25)'
                                    }}
                                    title="Быстро добавить встречу"
                                >
                                    <Calendar size={14} /> + Встреча
                                </button>
                                <button
                                    className="card-clickable"
                                    onClick={() => openQuickModal('call')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 5,
                                        padding: '6px 12px', borderRadius: 12, border: 'none',
                                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                        color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)'
                                    }}
                                    title="Быстро добавить звонок"
                                >
                                    <Phone size={14} /> + Звонок
                                </button>
                                <button className="icon-btn" onClick={() => navigate(`/history/new?client_id=${id}`)} title="Добавить другое событие" style={{ width: 32, height: 32, borderRadius: 10 }}>
                                    <Plus size={16} />
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
                                                <div style={{ fontSize: 10, fontWeight: 300, color: '#f59e0b' }}>Запрос на покупку</div>
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



                                <div>
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
                <div className="card" style={{ padding: '28px', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 32, background: 'var(--surface)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div className="font-oswald" style={{ fontWeight: 300, fontSize: 18, letterSpacing: '0.02em', color: 'var(--text)' }}>
                            Сделки {client.client_types?.includes('lawyer') && `(${myDeals.length})`}
                        </div>
                        {!client.client_types?.includes('lawyer') && (
                            <button className="card-clickable" onClick={handleCreateDeal} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '8px 14px', borderRadius: 12, border: 'none',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: '#fff', fontSize: 12, fontWeight: 300
                            }}>
                                <Briefcase size={14} /> Создать сделку
                            </button>
                        )}
                    </div>

                    {myDeals.length === 0 ? (
                        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, opacity: 0.6 }}>
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

                                return (
                                    <div key={d.id} className="card-clickable" onClick={() => navigate('/tasks')}
                                        style={{ padding: '14px 16px', background: 'var(--bg-light)', borderRadius: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
                                                <Briefcase size={16} />
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <div style={{ fontSize: 10, fontWeight: 300, color }}>
                                                        {dealStatusLabel[d.status] || 'Сделка'} · {roleLabel}
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: 14, fontWeight: 300 }}>{d.title}</div>
                                                {d.price > 0 && (
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 200 }}>{formatNumber(d.price)} ₽</div>
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

                {/* ── Кнопка удаления клиента ── */}
                <button
                    onClick={handleDeleteClient}
                    className="card-clickable"
                    style={{
                        width: '100%',
                        padding: '16px',
                        borderRadius: 20,
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        background: 'rgba(239, 68, 68, 0.05)',
                        color: '#ef4444',
                        fontWeight: 500,
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        cursor: 'pointer',
                        marginTop: 12
                    }}
                >
                    <Trash2 size={18} />
                    <span>Удалить клиента</span>
                </button>
            </div>

            {/* Модальное окно проверки клиента по госреестрам и отчета */}
            <ClientVerificationModal
                isOpen={isVerificationOpen}
                onClose={() => setIsVerificationOpen(false)}
                client={client}
            />
        </div>
    );
}
