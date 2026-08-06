import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Pencil, Trash, CheckCircle, XCircle, Plus, TrendingUp, Calendar, DollarSign, ChevronLeft, ChevronRight, Briefcase, User, MapPin, Wallet, Activity, MessageSquare, Scale, CreditCard, Home, Share2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { SearchableSelect } from '../../components/SearchableSelect';
import { MultiClientSelector } from '../../components/MultiClientSelector';
import { DealChat } from '../../components/DealChat';
import { BankBadge, BankIcon, RUSSIAN_BANKS } from '../../components/BankLogo';
import { neonDb } from '../../lib/neon';
import { nanoid } from '../../utils/nanoid';
import { toLocalISOString, parseLocalDateTime } from '../../utils/format';

function parsePgArray(arr) {
    if (!arr) return [];
    if (Array.isArray(arr)) return arr;
    if (typeof arr === 'string') {
        return arr.replace(/{|}/g, '').split(',').filter(Boolean);
    }
    return [];
}

function parseExpenses(exp) {
    if (!exp) return [];
    if (Array.isArray(exp)) return exp;
    if (typeof exp === 'string') {
        try {
            const parsed = JSON.parse(exp);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

function formatPriceInput(val) {
    if (!val) return '';
    const digits = val.replace(/\D/g, '');
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function parsePriceInput(val) {
    if (!val) return '';
    return val.replace(/\D/g, '');
}

export function DealsPage() {
    const { state, dispatch } = useApp();
    const { toast } = useToastContext();
    const user = state.currentUser;
    const navigate = useNavigate();
    const location = useLocation();

    const prefillData = location.state?.prefillDeal || {};
    const [view, setView] = useState('list');
    const [filter, setFilter] = useState('active');
    const [showForm, setShowForm] = useState(false);
    const [showQuickBuyerForm, setShowQuickBuyerForm] = useState(false);
    const [quickBuyer, setQuickBuyer] = useState({ full_name: '', phone: '' });
    
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());

    const [newDeal, setNewDeal] = useState({
        id: '',
        title: prefillData.title || '',
        seller_ids: prefillData.seller_ids || (prefillData.seller_id ? [prefillData.seller_id] : []),
        buyer_ids: prefillData.buyer_ids || (prefillData.buyer_id ? [prefillData.buyer_id] : []),
        property_id: prefillData.property_id || '',
        price: prefillData.price || '',
        deal_date: prefillData.deal_date || '',
        deposit_date: prefillData.deposit_date || '',
        deposit_amount: prefillData.deposit_amount || '',
        commission: prefillData.commission || '',
        notes: prefillData.notes || '',
        mortgage: prefillData.mortgage || false,
        mortgage_bank: prefillData.mortgage_bank || '',
        mortgage_amount: prefillData.mortgage_amount || '',
        mortgage_expiry: prefillData.mortgage_expiry || '',
        expenses: prefillData.expenses || [],
        lawyer: prefillData.lawyer || '',
        lawyer_id: prefillData.lawyer_id || '',
        seller_agent_id: prefillData.seller_agent_id || '',
        buyer_agent_id: prefillData.buyer_agent_id || '',
        handover_date: prefillData.handover_date || '',
        handover_amount: prefillData.handover_amount || '',
    });

    const prevPropertyId = useRef(newDeal.property_id);
    const creatingMeAgentRef = useRef(false);
    const deals = state.deals.filter(d => user?.role === 'admin' || d.realtor_id === user?.id);
    
    const filteredByPeriod = useMemo(() => {
        return deals.filter(d => {
            const dealDate = d.deal_date ? new Date(d.deal_date) : null;
            if (!dealDate) {
                const createdAt = d.created_at ? new Date(d.created_at) : now;
                return createdAt.getMonth() === selectedMonth && createdAt.getFullYear() === selectedYear;
            }
            return dealDate.getMonth() === selectedMonth && dealDate.getFullYear() === selectedYear;
        });
    }, [deals, selectedMonth, selectedYear]);

    const filteredDeals = useMemo(() => {
        return filteredByPeriod.filter(d => filter === 'all' || d.status === filter);
    }, [filteredByPeriod, filter]);

    const [lastMessages, setLastMessages] = useState({});

    useEffect(() => {
        if (!user) return;
        let isMounted = true;
        const fetchLastMessages = async () => {
            try {
                const res = await neonDb.query(
                    `SELECT DISTINCT ON (deal_id, side) deal_id, side, sender_id, created_at
                     FROM deal_messages
                     ORDER BY deal_id, side, created_at DESC`
                );
                if (isMounted && res && res.data) {
                    const lookup = {};
                    res.data.forEach(item => {
                        if (!lookup[item.deal_id]) lookup[item.deal_id] = {};
                        lookup[item.deal_id][item.side] = {
                            sender_id: item.sender_id,
                            created_at: item.created_at
                        };
                    });
                    setLastMessages(lookup);
                }
            } catch (e) {
                console.error('Error fetching chat summaries:', e);
            }
        };
        fetchLastMessages();
        const iv = setInterval(fetchLastMessages, 12000);
        return () => {
            isMounted = false;
            clearInterval(iv);
        };
    }, [user]);

        const propertyOptions = state.properties.map(p => ({ 
        id: p.id, 
        label: `${p.address || p.city} — ${p.price?.toLocaleString()} ₽` 
    }));

    const ExpenseFormItem = ({ exp }) => (
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginBottom: 8 }}>
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <select 
                    className="form-input" 
                    style={{ height: 36, fontSize: 12, padding: '0 4px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border-light)' }} 
                    value={state.pricelist.some(p => p.name === exp.title) ? exp.title : (exp.title ? 'custom' : '')} 
                    onChange={e => {
                        const val = e.target.value;
                        if (val === '') {
                            updateExpense(exp.id, 'title', '');
                            updateExpense(exp.id, 'amount', '');
                        } else if (val === 'custom') {
                            updateExpense(exp.id, 'title', 'Другое');
                        } else {
                            const selectedItem = state.pricelist.find(p => p.name === val);
                            if (selectedItem) {
                                updateExpense(exp.id, 'title', selectedItem.name);
                                let amt = selectedItem.price;
                                if (selectedItem.name === 'Сделка/СЭР') {
                                    const dealPrice = Number(parsePriceInput(String(newDeal.price))) || 0;
                                    amt = Math.min(20000, Math.round(dealPrice * 0.003));
                                }
                                updateExpense(exp.id, 'amount', formatPriceInput(String(amt)));
                            }
                        }
                    }}
                >
                    <option value="">-- Выбрать расход --</option>
                    {state.pricelist.map(p => (
                        <option key={p.id} value={p.name}>{p.name} ({p.price?.toLocaleString()} ₽)</option>
                    ))}
                    <option value="custom">Другое (свой вариант)</option>
                </select>
                {(exp.title === 'Другое' || !state.pricelist.some(p => p.name === exp.title)) && exp.title !== '' && (
                    <input 
                        className="form-input" 
                        style={{ height: 36, fontSize: 12, borderRadius: 8 }} 
                        placeholder="Название расхода" 
                        value={exp.title === 'Другое' ? '' : exp.title} 
                        onChange={e => updateExpense(exp.id, 'title', e.target.value)} 
                    />
                )}
            </div>
            <input className="form-input" style={{ flex: 1.2, height: 36, fontSize: 12, borderRadius: 8 }} placeholder="Сумма" value={exp.amount} onChange={e => updateExpense(exp.id, 'amount', formatPriceInput(e.target.value))} />
            <button type="button" onClick={() => removeExpense(exp.id)} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'var(--danger-light)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><XCircle size={16} /></button>
        </div>
    );

    useEffect(() => {
        if (location.state?.prefillDeal) {
            setShowForm(true);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, []);

    // Автоматическое создание агента "Я" для текущего риелтора
    useEffect(() => {
        if (!user || creatingMeAgentRef.current) return;
        const hasMe = state.clients.some(c => 
            c.client_types?.includes('agent') && 
            (c.full_name?.toLowerCase() === 'я' || c.full_name === user.full_name)
        );
        if (!hasMe && state.clients.length > 0) {
            creatingMeAgentRef.current = true;
            const newClientId = nanoid();
            const client = {
                id: newClientId,
                realtor_id: user.id,
                full_name: 'Я',
                phone: user.phone || '',
                client_types: ['agent'],
                status: 'active',
                created_at: new Date().toISOString()
            };
            dispatch({ type: 'ADD_CLIENT', client });
            console.log('Automatically created client agent "Я"');
        }
    }, [user, state.clients, dispatch]);

    // Авто-выбор агента покупателя для новых сделок
    useEffect(() => {
        if (!newDeal.id && !newDeal.buyer_agent_id) {
            const meAgent = state.clients.find(c => 
                c.client_types?.includes('agent') && 
                (c.full_name?.toLowerCase() === 'я' || c.full_name === user?.full_name)
            );
            if (meAgent) {
                setNewDeal(prev => ({ ...prev, buyer_agent_id: meAgent.id }));
            }
        }
    }, [state.clients, user, newDeal.id, newDeal.buyer_agent_id]);

    useEffect(() => {
        if (newDeal.property_id && newDeal.property_id !== prevPropertyId.current) {
            const prop = state.properties.find(p => p.id === newDeal.property_id);
            if (prop) {
                const meAgent = state.clients.find(c => 
                    c.client_types?.includes('agent') && 
                    (c.full_name?.toLowerCase() === 'я' || c.full_name === user?.full_name)
                );
                const isMyProperty = prop.realtor_id === user?.id;
                setNewDeal(prev => ({
                    ...prev,
                    price: formatPriceInput(String(prop.price || '')),
                    commission: formatPriceInput(String(prop.commission || '')),
                    seller_ids: prop.client_ids || (prop.client_id ? [prop.client_id] : []),
                    seller_agent_id: prop.agent_id || (isMyProperty && meAgent ? meAgent.id : '')
                }));
            }
        }
        prevPropertyId.current = newDeal.property_id;
    }, [newDeal.property_id, state.properties, state.clients, user]);

    const stats = useMemo(() => {
        const activeDeals = filteredByPeriod.filter(d => d.status === 'active');
        const closedDeals = filteredByPeriod.filter(d => d.status === 'closed');
        const cancelledDeals = filteredByPeriod.filter(d => d.status === 'cancelled');
        const totalCommission = closedDeals.reduce((sum, d) => sum + (Number(d.commission) || 0), 0);
        const activeVolume = activeDeals.reduce((sum, d) => sum + (Number(d.price) || 0), 0);
        const closedVolume = closedDeals.reduce((sum, d) => sum + (Number(d.price) || 0), 0);
        return { 
            activeCount: activeDeals.length, 
            closedCount: closedDeals.length,
            cancelledCount: cancelledDeals.length,
            totalCommission, 
            activeVolume,
            closedVolume,
        };
    }, [filteredByPeriod]);

    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    
    const prevMonth = () => {
        if (selectedMonth === 0) {
            setSelectedMonth(11);
            setSelectedYear(y => y - 1);
        } else {
            setSelectedMonth(m => m - 1);
        }
    };

    const nextMonth = () => {
        if (selectedMonth === 11) {
            setSelectedMonth(0);
            setSelectedYear(y => y + 1);
        } else {
            setSelectedMonth(m => m + 1);
        }
    };

    function handleFieldChange(field, value) {
        setNewDeal(prev => ({ ...prev, [field]: value }));
    }

    function handleCreateQuickBuyer(e) {
        e.preventDefault();
        if (!quickBuyer.full_name) return;
        
        const newClientId = nanoid();
        const client = {
            ...quickBuyer,
            id: newClientId,
            realtor_id: user?.id,
            created_at: new Date().toISOString()
        };
        
        dispatch({ type: 'ADD_CLIENT', client });
        
        // Auto-select the new client as a buyer
        handleFieldChange('buyer_ids', [...(newDeal.buyer_ids || []), newClientId]);
        setQuickBuyer({ full_name: '', phone: '' });
        setShowQuickBuyerForm(false);
        toast.success('Покупатель создан и выбран');
    }

    const addExpense = (payer = 'seller') => {
        const newExpense = { id: nanoid(), title: '', amount: '', payer };
        setNewDeal(prev => ({ ...prev, expenses: [...(prev.expenses || []), newExpense] }));
    };

    const removeExpense = (id) => {
        setNewDeal(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }));
    };

    const updateExpense = (id, field, value) => {
        setNewDeal(prev => ({
            ...prev,
            expenses: prev.expenses.map(e => e.id === id ? { ...e, [field]: value } : e)
        }));
    };

    async function saveDeal(e) {
        e.preventDefault();
        if (!newDeal.title?.trim()) {
            toast.error('Укажите название сделки');
            return;
        }

        const dealId = newDeal.id || nanoid();
        const dealToSave = {
            ...newDeal,
            id: dealId,
            realtor_id: user.id,
            lawyer: newDeal.lawyer || null,
            price: Number(parsePriceInput(String(newDeal.price))) || 0,
            deposit_amount: Number(parsePriceInput(String(newDeal.deposit_amount))) || 0,
            commission: (newDeal.expenses || []).reduce((sum, e) => {
                if (e.title === 'Комиссия') {
                    return sum + (Number(parsePriceInput(String(e.amount))) || 0);
                }
                return sum;
            }, 0),
            deal_date: newDeal.deal_date ? parseLocalDateTime(newDeal.deal_date)?.toISOString() : null,
            deposit_date: newDeal.deposit_date ? parseLocalDateTime(newDeal.deposit_date)?.toISOString() : null,
            handover_date: newDeal.handover_date ? parseLocalDateTime(newDeal.handover_date)?.toISOString() : null,
            handover_amount: Number(parsePriceInput(String(newDeal.handover_amount))) || 0,
            status: newDeal.status || 'active',
            mortgage: newDeal.mortgage || false,
            mortgage_bank: newDeal.mortgage_bank || '',
            mortgage_amount: Number(parsePriceInput(String(newDeal.mortgage_amount))) || 0,
            mortgage_expiry: newDeal.mortgage_expiry || null,
            expenses: (newDeal.expenses || []).map(e => ({
                ...e,
                amount: Number(parsePriceInput(String(e.amount))) || 0
            })),
            seller_agent_id: newDeal.seller_agent_id || null,
            buyer_agent_id: newDeal.buyer_agent_id || null,
        };

        try {
            if (newDeal.id) {
                dispatch({ type: 'UPDATE_DEAL', deal: dealToSave });
                toast.success('Сделка обновлена');
            } else {
                dispatch({ type: 'ADD_DEAL', deal: dealToSave });
                toast.success('Сделка создана');
            }
            resetForm();
            setShowForm(false);
        } catch (err) {
            toast.error('Ошибка при сохранении');
        }
    }

    function resetForm() {
        const meAgent = state.clients.find(c => 
            c.client_types?.includes('agent') && 
            (c.full_name?.toLowerCase() === 'я' || c.full_name === user?.full_name)
        );
        setNewDeal({ 
            id: '', 
            title: '', 
            seller_ids: [], 
            buyer_ids: [], 
            property_id: '', 
            price: '', 
            deal_date: '', 
            deposit_date: '', 
            deposit_amount: '', 
            commission: '', 
            notes: '', 
            mortgage: false, 
            mortgage_bank: '', 
            mortgage_amount: '', 
            mortgage_expiry: '', 
            expenses: [], 
            lawyer: '', 
            lawyer_id: '', 
            seller_agent_id: '', 
            buyer_agent_id: meAgent ? meAgent.id : '',
            handover_date: '',
            handover_amount: '' 
        });
        prevPropertyId.current = '';
    }

    function updateStatus(deal, status) {
        dispatch({ type: 'UPDATE_DEAL', deal: { ...deal, status } });
        toast.success(`Статус обновлён: ${status === 'closed' ? 'Закрыта' : 'Активна'}`);
    }

    function editDeal(deal) {
        const sellerIds = parsePgArray(deal.seller_ids);
        const buyerIds = parsePgArray(deal.buyer_ids);
        let parsedExpenses = parseExpenses(deal.expenses);
        
        // If the deal has a commission but no 'Комиссия' expense, migrate it dynamically for editing
        if (deal.commission > 0 && !parsedExpenses.some(e => e.title === 'Комиссия')) {
            parsedExpenses.push({
                id: nanoid(),
                title: 'Комиссия',
                amount: deal.commission.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '),
                payer: 'seller' // default to seller side
            });
        }

        setNewDeal({ 
            ...deal, 
            seller_ids: sellerIds.length > 0 ? sellerIds : (deal.seller_id ? [deal.seller_id] : []),
            buyer_ids: buyerIds.length > 0 ? buyerIds : (deal.buyer_id ? [deal.buyer_id] : []),
            expenses: parsedExpenses,
            price: deal.price ? deal.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '',
            deposit_amount: deal.deposit_amount ? deal.deposit_amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '',
            deal_date: deal.deal_date ? toLocalISOString(deal.deal_date) : '',
            deposit_date: deal.deposit_date ? toLocalISOString(deal.deposit_date) : '',
            mortgage_amount: deal.mortgage_amount ? deal.mortgage_amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '',
            lawyer: deal.lawyer || '',
            lawyer_id: deal.lawyer_id || '',
            seller_agent_id: deal.seller_agent_id || '',
            buyer_agent_id: deal.buyer_agent_id || '',
            handover_date: deal.handover_date ? toLocalISOString(deal.handover_date) : '',
            handover_amount: deal.handover_amount ? deal.handover_amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '',
        });
        prevPropertyId.current = deal.property_id;
        setShowForm(true);
    }



    return (
        <div className="page fade-in">
            {/* Compact Sticky Topbar */}
            <div className="topbar sticky" style={{ 
                background: 'var(--topbar-bg)', 
                backdropFilter: 'blur(24px) saturate(180%)',
                padding: '14px 18px',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                height: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Сделки</span>
                        {/* Compact Inline Month Selector */}
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 4, 
                            background: 'var(--bg-light)', 
                            padding: '3px 8px', 
                            borderRadius: 10, 
                            border: '1px solid var(--border-light)' 
                        }}>
                            <button 
                                type="button" 
                                className="card-clickable" 
                                style={{ background: 'transparent', border: 'none', padding: 2, display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }} 
                                onClick={prevMonth}
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                                {monthNames[selectedMonth]} {selectedYear}
                            </span>
                            <button 
                                type="button" 
                                className="card-clickable" 
                                style={{ background: 'transparent', border: 'none', padding: 2, display: 'flex', alignItems: 'center', color: 'var(--text-secondary)' }} 
                                onClick={nextMonth}
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>

                    <button 
                        className="card-clickable" 
                        onClick={() => { resetForm(); setShowForm(!showForm); }} 
                        style={{ 
                            height: 36, 
                            padding: '0 14px', 
                            borderRadius: 10, 
                            background: 'var(--primary)', 
                            color: 'white', 
                            border: 'none', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 6, 
                            fontSize: 13, 
                            fontWeight: 600 
                        }}
                    >
                        <Plus size={16} />
                        <span>Новая</span>
                    </button>
                </div>
            </div>

            <div className="page-content" style={{ padding: '14px 18px 120px', gap: 12 }}>
                
                {/* Compact Statistics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div className="card" style={{ 
                        padding: '12px 14px', 
                        borderRadius: 16, 
                        border: '1px solid var(--border-light)', 
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)', 
                        background: 'var(--surface)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Activity size={14} />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>В работе</span>
                            </div>
                            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>
                                {stats.activeCount} <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>сд.</span>
                            </span>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>
                            {stats.activeVolume.toLocaleString()} ₽
                        </div>
                    </div>

                    <div className="card" style={{ 
                        padding: '12px 14px', 
                        borderRadius: 16, 
                        border: '1px solid var(--border-light)', 
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)', 
                        background: 'var(--surface)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <div style={{ width: 26, height: 26, borderRadius: 7, background: 'var(--success-light)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Wallet size={14} />
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Выручка</span>
                            </div>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>
                                {monthNames[selectedMonth].toLowerCase()}
                            </span>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>
                            {stats.totalCommission.toLocaleString()} ₽
                        </div>
                    </div>
                </div>

                {/* Form Overlay (Simulated by rendering before list) */}
                {showForm && (
                    <div className="card fade-in" style={{ padding: '28px', borderRadius: 32, border: 'none', boxShadow: '0 12px 48px rgba(0,82,255,0.1)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="font-oswald" style={{ fontSize: 18, fontWeight: 300, color: 'var(--primary)' }}>{newDeal.id ? 'Параметры сделки' : 'Запуск новой сделки'}</div>
                        
                        <input className="form-input" style={{ height: 50, borderRadius: 14, background: 'var(--bg-light)', border: 'none', fontWeight: 300 }} placeholder="Название сделки (напр. Продажа 1к. на Ленина)" value={newDeal.title} required onChange={e => handleFieldChange('title', e.target.value)} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Карточка продавца */}
                            <div style={{
                                padding: '16px 20px',
                                background: 'rgba(139,92,246,0.03)',
                                borderRadius: 20,
                                border: '1px solid rgba(139,92,246,0.12)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 12
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6' }} />
                                    <span style={{ fontSize: 11, fontWeight: 600, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'Oswald', sans-serif" }}>Продавец</span>
                                </div>

                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 300, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Продавцы</label>
                                    <MultiClientSelector selectedIds={newDeal.seller_ids || []} onChange={ids => handleFieldChange('seller_ids', ids)} clients={state.clients} placeholder="Выбрать продавцов..." />
                                </div>

                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 300, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Агент продавца</label>
                                    <select 
                                        className="form-input" 
                                        style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontWeight: 300, padding: '0 8px', width: '100%', fontSize: 13 }} 
                                        value={newDeal.seller_agent_id || ''} 
                                        onChange={e => handleFieldChange('seller_agent_id', e.target.value || null)}
                                    >
                                        <option value="">Без агента</option>
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
                                            return uniqueAgents.map(a => {
                                                const isMe = a.full_name === user?.full_name || a.full_name?.toLowerCase() === 'я';
                                                return (
                                                    <option key={a.id} value={a.id}>
                                                        {isMe ? `Я (${a.full_name})` : a.full_name}
                                                    </option>
                                                );
                                            });
                                        })()}
                                    </select>
                                </div>

                                <div style={{ borderTop: '1px dashed rgba(139,92,246,0.2)', paddingTop: 10, marginTop: 4 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <label style={{ fontSize: 11, fontWeight: 500, color: '#8b5cf6' }}>Расходы продавца</label>
                                        <button type="button" onClick={() => addExpense('seller')} style={{ background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 500 }}>+ Добавить</button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {parseExpenses(newDeal.expenses).filter(e => e.payer === 'seller').map(exp => (
                                            <ExpenseFormItem key={exp.id} exp={exp} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Карточка покупателя */}
                            <div style={{
                                padding: '16px 20px',
                                background: 'rgba(0,82,255,0.03)',
                                borderRadius: 20,
                                border: '1px solid rgba(0,82,255,0.1)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 12
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)' }} />
                                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'Oswald', sans-serif" }}>Покупатель</span>
                                </div>

                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 300, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Покупатели</label>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <div style={{ flex: 1 }}>
                                            <MultiClientSelector selectedIds={newDeal.buyer_ids || []} onChange={ids => handleFieldChange('buyer_ids', ids)} clients={state.clients} placeholder="Выбрать покупателей..." />
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => setShowQuickBuyerForm(true)} 
                                            className="card-clickable"
                                            style={{ 
                                                height: 44, borderRadius: 12, border: '1.5px solid #000000',
                                                background: 'var(--surface)', color: 'var(--text)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                padding: '0 12px', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
                                                fontFamily: "'Oswald', sans-serif"
                                            }}
                                        >
                                            <Plus size={14} style={{ marginRight: 4 }} /> Покупатель
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label style={{ fontSize: 11, fontWeight: 300, color: 'var(--text-secondary)', marginBottom: 4, display: 'block' }}>Агент покупателя</label>
                                    <select 
                                        className="form-input" 
                                        style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontWeight: 300, padding: '0 8px', width: '100%', fontSize: 13 }} 
                                        value={newDeal.buyer_agent_id || ''} 
                                        onChange={e => handleFieldChange('buyer_agent_id', e.target.value || null)}
                                    >
                                        <option value="">Без агента</option>
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
                                            return uniqueAgents.map(a => {
                                                const isMe = a.full_name === user?.full_name || a.full_name?.toLowerCase() === 'я';
                                                return (
                                                    <option key={a.id} value={a.id}>
                                                        {isMe ? `Я (${a.full_name})` : a.full_name}
                                                    </option>
                                                );
                                            });
                                        })()}
                                    </select>
                                </div>

                                <div style={{ borderTop: '1px dashed rgba(0,82,255,0.2)', paddingTop: 10, marginTop: 4 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--primary)' }}>Расходы покупателя</label>
                                        <button type="button" onClick={() => addExpense('buyer')} style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 500 }}>+ Добавить</button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {parseExpenses(newDeal.expenses).filter(e => e.payer === 'buyer').map(exp => (
                                            <ExpenseFormItem key={exp.id} exp={exp} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="font-oswald" style={{ fontSize: 11, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>Объект</label>
                            <SearchableSelect value={newDeal.property_id || ''} onChange={v => handleFieldChange('property_id', v)} placeholder="Выберите объект..." options={propertyOptions} />
                        </div>

                        <div className="form-group">
                            <label className="font-oswald" style={{ fontSize: 10, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Цена объекта</label>
                            <input className="form-input" style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontWeight: 300 }} value={newDeal.price} onChange={e => handleFieldChange('price', formatPriceInput(e.target.value))} />
                        </div>

                        {/* ── Ипотека Section ── */}
                        <div style={{
                            padding: '14px 16px',
                            background: 'rgba(99,102,241,0.04)',
                            borderRadius: 18,
                            border: '1px solid rgba(99,102,241,0.15)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                            marginBottom: 16
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <CreditCard size={15} color="#6366f1" />
                                    <span style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'Oswald', sans-serif" }}>Ипотека</span>
                                </div>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(newDeal.mortgage)}
                                        onChange={e => {
                                            const checked = e.target.checked;
                                            handleFieldChange('mortgage', checked);
                                        }}
                                        style={{ transform: 'scale(1.2)', accentColor: '#6366f1' }}
                                    />
                                    <span style={{ fontSize: 12, fontWeight: 500 }}>Сделка в ипотеку</span>
                                </label>
                            </div>

                            {newDeal.mortgage && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, paddingTop: 4 }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="font-oswald" style={{ fontSize: 10, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Банк</label>
                                        <select
                                            className="form-input"
                                            style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontWeight: 300, padding: '0 8px', width: '100%', fontSize: 13 }}
                                            value={newDeal.mortgage_bank || ''}
                                            onChange={e => {
                                                const val = e.target.value;
                                                handleFieldChange('mortgage_bank', val);
                                                if (val) handleFieldChange('mortgage', true);
                                            }}
                                        >
                                            <option value="">— Выбрать банк —</option>
                                            {RUSSIAN_BANKS.map(b => (
                                                <option key={b.id} value={b.name}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="font-oswald" style={{ fontSize: 10, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Сумма кредита</label>
                                        <input
                                            className="form-input"
                                            style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontWeight: 300 }}
                                            placeholder="0 ₽"
                                            value={newDeal.mortgage_amount}
                                            onChange={e => {
                                                const formatted = formatPriceInput(e.target.value);
                                                handleFieldChange('mortgage_amount', formatted);
                                                if (formatted) handleFieldChange('mortgage', true);
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group">
                                <label className="font-oswald" style={{ fontSize: 10, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Дата задатка</label>
                                <input type="datetime-local" className="form-input" style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontWeight: 300, padding: '0 8px' }} value={newDeal.deposit_date} onChange={e => handleFieldChange('deposit_date', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="font-oswald" style={{ fontSize: 10, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Сумма задатка</label>
                                <input className="form-input" style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontWeight: 300 }} value={newDeal.deposit_amount} onChange={e => handleFieldChange('deposit_amount', formatPriceInput(e.target.value))} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="font-oswald" style={{ fontSize: 10, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Дата сделки</label>
                            <input type="datetime-local" className="form-input" style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontWeight: 300, padding: '0 8px' }} value={newDeal.deal_date} onChange={e => handleFieldChange('deal_date', e.target.value)} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group">
                                <label className="font-oswald" style={{ fontSize: 10, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Дата передачи объекта</label>
                                <input type="datetime-local" className="form-input" style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontWeight: 300, padding: '0 8px' }} value={newDeal.handover_date} onChange={e => handleFieldChange('handover_date', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="font-oswald" style={{ fontSize: 10, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Стоимость передачи</label>
                                <input className="form-input" style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontWeight: 300 }} value={newDeal.handover_amount} onChange={e => handleFieldChange('handover_amount', formatPriceInput(e.target.value))} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="font-oswald" style={{ fontSize: 11, fontWeight: 300, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>Юрист по сделке</label>
                            <select
                                className="form-input"
                                style={{ height: 50, borderRadius: 14, background: 'var(--bg-light)', border: 'none', fontWeight: 300, padding: '0 12px', width: '100%', fontSize: 13 }}
                                value={newDeal.lawyer_id || ''}
                                onChange={e => handleFieldChange('lawyer_id', e.target.value || null)}
                            >
                                <option value="">Без юриста</option>
                                {(() => {
                                    const lawyers = (state.clients || []).filter(c => c.client_types?.includes('lawyer') && !c.client_types?.includes('agent'));
                                    const seenNames = new Set();
                                    const uniqueLawyers = [];
                                    for (const c of lawyers) {
                                        const nameKey = (c.full_name || '').trim().toLowerCase();
                                        if (nameKey && seenNames.has(nameKey)) continue;
                                        if (nameKey) seenNames.add(nameKey);
                                        uniqueLawyers.push(c);
                                    }
                                    return uniqueLawyers.map(c => (
                                        <option key={c.id} value={c.id}>{c.full_name}</option>
                                    ));
                                })()}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn btn-primary" style={{ flex: 1, height: 50, borderRadius: 16, fontWeight: 300 }} onClick={saveDeal}>Сохранить</button>
                            <button className="btn btn-secondary" style={{ flex: 1, height: 50, borderRadius: 16, background: 'var(--bg-light)', border: 'none', color: 'var(--text-secondary)' }} onClick={() => { setShowForm(false); resetForm(); }}>Отмена</button>
                        </div>
                    </div>
                )}

                {/* Status Tabs — Compact Segmented Control */}
                <div className="tab-filters" style={{ padding: '2px 0', gap: 6, display: 'flex' }}>
                    {[['active', 'Активные'], ['closed', 'Закрытые'], ['all', 'Все']].map(([v, l]) => (
                        <button 
                            key={v} 
                            className={`tab-filter ${filter === v ? 'active' : ''}`} 
                            style={{ 
                                padding: '6px 14px', 
                                borderRadius: 10, 
                                border: '1px solid ' + (filter === v ? 'var(--primary)' : 'var(--border-light)'), 
                                fontSize: 12, 
                                fontWeight: filter === v ? 600 : 500,
                                background: filter === v ? 'var(--primary-light)' : 'var(--surface)',
                                color: filter === v ? 'var(--primary)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }} 
                            onClick={() => setFilter(v)}
                        >
                            {l}
                        </button>
                    ))}
                </div>

                {/* List of Deals */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {filteredDeals.length === 0 ? (
                        <div className="empty-state" style={{ padding: '40px 0' }}>
                            <div className="font-oswald" style={{ fontSize: 16, fontWeight: 300, color: 'var(--text-muted)' }}>Сделок не найдено</div>
                        </div>
                    ) : (
                        filteredDeals.map(d => (
                            <DealCard 
                                key={d.id} 
                                deal={d} 
                                lastMessages={lastMessages} 
                                setLastMessages={setLastMessages} 
                                editDeal={editDeal}
                                updateStatus={updateStatus}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* Quick Buyer Modal — Premium Open Design */}
            {showQuickBuyerForm && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1000,
                    background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(10px) saturate(180%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 24
                }}>
                    <div className="card fade-in" style={{ width: '100%', maxWidth: 420, padding: 32, borderRadius: 32, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.2)', background: 'var(--surface)' }}>
                        <div className="font-oswald" style={{ fontWeight: 300, fontSize: 20, marginBottom: 24, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text)' }}>Новый покупатель</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ФИО</label>
                                <input 
                                    className="form-input" 
                                    autoFocus
                                    value={quickBuyer.full_name} 
                                    onChange={e => setQuickBuyer({ ...quickBuyer, full_name: e.target.value })} 
                                    placeholder="Иванов Иван Иванович"
                                    style={{ height: 52, borderRadius: 14 }}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ fontSize: 12, fontWeight: 300, color: 'var(--text-secondary)', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Телефон</label>
                                <input 
                                    className="form-input" 
                                    value={quickBuyer.phone} 
                                    onChange={e => setQuickBuyer({ ...quickBuyer, phone: e.target.value })} 
                                    placeholder="+7 (___) ___-__-__"
                                    style={{ height: 52, borderRadius: 14 }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                                <button type="button" className="btn btn-secondary card-clickable" style={{ flex: 1, height: 52, borderRadius: 14, fontWeight: 300 }} onClick={() => setShowQuickBuyerForm(false)}>Отмена</button>
                                <button type="button" className="btn btn-primary card-clickable" style={{ flex: 1, height: 52, borderRadius: 14, fontWeight: 300, background: 'var(--primary)', boxShadow: '0 8px 16px rgba(0,82,255,0.15)' }} onClick={handleCreateQuickBuyer}>Создать</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function DealCard({ deal, lastMessages = {}, setLastMessages, editDeal, updateStatus }) {
    const { state, dispatch } = useApp();
    const { toast } = useToastContext();
    const user = state.currentUser;
    const navigate = useNavigate();

    const sellerIds = parsePgArray(deal.seller_ids);
    const buyerIds = parsePgArray(deal.buyer_ids);
    const sellers = state.clients.filter(c => (sellerIds.length > 0 ? sellerIds : (deal.seller_id ? [deal.seller_id] : [])).includes(c.id));
    const buyers = state.clients.filter(c => (buyerIds.length > 0 ? buyerIds : (deal.buyer_id ? [deal.buyer_id] : [])).includes(c.id));
    const sellerAgent = deal.seller_agent_id ? state.clients.find(c => c.id === deal.seller_agent_id) : null;
    const buyerAgent = deal.buyer_agent_id ? state.clients.find(c => c.id === deal.buyer_agent_id) : null;
    const lawyer = deal.lawyer_id ? state.clients.find(c => c.id === deal.lawyer_id) : null;
    const lawyerName = lawyer?.full_name || deal.lawyer || null;
    const expenses = parseExpenses(deal.expenses);
    const sellerExpenses = expenses.filter(e => e.payer === 'seller');
    const buyerExpenses = expenses.filter(e => e.payer === 'buyer');
    const property = state.properties.find(p => p.id === deal.property_id);
    const propertyAddress = property?.address || property?.city || null;
    const isAddressInTitle = Boolean(
        propertyAddress && (
            deal.title?.toLowerCase().includes(propertyAddress.toLowerCase()) ||
            (property?.address && deal.title?.toLowerCase().includes(property.address.toLowerCase())) ||
            (property?.address && property.address.split(',').some(part => part.trim().length > 4 && deal.title?.toLowerCase().includes(part.trim().toLowerCase())))
        )
    );

    const hasSellerUnread = useMemo(() => {
        const info = lastMessages[deal.id]?.seller;
        if (!info) return false;
        if (info.sender_id === user?.id) return false;
        const lastRead = localStorage.getItem(`last_viewed_chat_${deal.id}_seller`);
        if (!lastRead) return true;
        return new Date(info.created_at) > new Date(lastRead);
    }, [lastMessages, deal.id, user?.id]);

    const hasBuyerUnread = useMemo(() => {
        const info = lastMessages[deal.id]?.buyer;
        if (!info) return false;
        if (info.sender_id === user?.id) return false;
        const lastRead = localStorage.getItem(`last_viewed_chat_${deal.id}_buyer`);
        if (!lastRead) return true;
        return new Date(info.created_at) > new Date(lastRead);
    }, [lastMessages, deal.id, user?.id]);

    // Chat state — null | 'seller' | 'buyer'
    const [openChat, setOpenChat] = useState(null);

    // Quick Expense states
    const [showQuickExpense, setShowQuickExpense] = useState(false);
    const [quickExpense, setQuickExpense] = useState({
        title: '',
        customTitle: '',
        amount: '',
        payer: 'seller'
    });

    const handleSaveQuickExpense = () => {
        const finalTitle = quickExpense.title === 'Другое' ? quickExpense.customTitle : quickExpense.title;
        if (!finalTitle?.trim()) {
            toast.error('Укажите название расхода');
            return;
        }
        const cleanAmount = Number(quickExpense.amount.replace(/\D/g, '')) || 0;
        if (cleanAmount <= 0) {
            toast.error('Укажите корректную сумму');
            return;
        }

        const currentExpenses = parseExpenses(deal.expenses);
        const newExp = {
            id: nanoid(),
            title: finalTitle,
            amount: cleanAmount,
            payer: quickExpense.payer
        };

        const updatedDeal = {
            ...deal,
            expenses: [...currentExpenses, newExp]
        };

        try {
            dispatch({ type: 'UPDATE_DEAL', deal: updatedDeal });
            toast.success('Расход добавлен');
            setShowQuickExpense(false);
            setQuickExpense({ title: '', customTitle: '', amount: '', payer: 'seller' });
        } catch (err) {
            toast.error('Не удалось сохранить расход');
        }
    };

    const statusConfig = {
        active:    { label: 'В работе', color: 'var(--primary)',    bg: 'var(--primary-light)' },
        closed:    { label: 'Закрыта',  color: '#10b981',           bg: 'rgba(16,185,129,0.12)' },
        cancelled: { label: 'Отменена', color: 'var(--danger)',     bg: 'var(--danger-light)' },
    };
    const cfg = statusConfig[deal.status] || statusConfig.active;

    function SideCard({ side, clients, agent, expenses: sideExpenses, accentColor, label, accentBg }) {
        if (!clients.length && !agent) return null;
        return (
            <div style={{
                flex: 1, 
                padding: '14px 16px',
                background: accentBg,
                borderRadius: 16,
                border: `1px solid ${accentColor}25`,
                display: 'flex', 
                flexDirection: 'column', 
                gap: 10, 
                minWidth: 0,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: accentColor, flexShrink: 0 }} />
                    <span style={{ 
                        fontSize: 11, 
                        fontWeight: 600, 
                        color: accentColor, 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.03em' 
                    }}>
                        {label}
                    </span>
                </div>

                {clients.map(c => (
                    <div key={c.id}
                        onClick={() => navigate(`/clients/${c.id}`)}
                        style={{ 
                            fontSize: 14, 
                            fontWeight: 600, 
                            color: 'var(--text)', 
                            cursor: 'pointer', 
                            lineHeight: 1.3,
                            transition: 'color 0.2s' 
                        }}
                    >
                        {c.full_name}
                    </div>
                ))}

                {agent && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <User size={12} color={accentColor} />
                        <span
                            onClick={() => navigate(`/clients/${agent.id}`)}
                            style={{ fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 400 }}
                        >
                            {agent.full_name}
                        </span>
                    </div>
                )}

                <div style={{ borderTop: `1px dashed ${accentColor}35`, paddingTop: 10, marginTop: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ 
                            fontSize: 10, 
                            color: accentColor, 
                            fontWeight: 600, 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.04em' 
                        }}>
                            Расходы
                        </div>
                        <button 
                            type="button"
                            onClick={() => {
                                setQuickExpense(prev => ({ ...prev, payer: side }));
                                setShowQuickExpense(showQuickExpense && quickExpense.payer === side ? false : true);
                            }}
                            style={{ 
                                background: `${accentColor}12`, 
                                border: 'none', 
                                color: accentColor, 
                                fontSize: 11, 
                                cursor: 'pointer', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 3, 
                                padding: '2px 8px', 
                                borderRadius: 6,
                                fontWeight: 600,
                                transition: 'all 0.2s'
                            }}
                        >
                            + Добавить
                        </button>
                    </div>

                    {sideExpenses.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {[...sideExpenses]
                                .sort((a, b) => {
                                    if (a.title === 'Комиссия') return -1;
                                    if (b.title === 'Комиссия') return 1;
                                    return 0;
                                })
                                .map(exp => {
                                    const isCommission = exp.title === 'Комиссия';
                                    return (
                                        <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                                            <span style={{ 
                                                color: isCommission ? '#10b981' : 'var(--text-secondary)', 
                                                fontWeight: isCommission ? 600 : 400, 
                                                flex: 1, 
                                                marginRight: 6 
                                            }}>{exp.title}</span>
                                            <span style={{ 
                                                color: isCommission ? '#10b981' : 'var(--text)', 
                                                fontWeight: isCommission ? 700 : 600, 
                                                whiteSpace: 'nowrap' 
                                            }}>{Number(exp.amount).toLocaleString()} ₽</span>
                                        </div>
                                    );
                                })
                            }
                        </div>
                    ) : (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, fontStyle: 'italic' }}>Нет расходов</div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="card" style={{ 
            padding: '20px 22px', 
            borderRadius: 20, 
            border: '1px solid #374151', 
            boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)', 
            background: 'var(--surface)', 
            marginBottom: 14, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 16 
        }}>

            {/* ── Header: Title + Status + Edit button ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                        fontWeight: 600, 
                        fontSize: 18, 
                        lineHeight: 1.3, 
                        color: 'var(--text)',
                        letterSpacing: '-0.01em'
                    }}>
                        {deal.title}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{
                        padding: '5px 12px', 
                        borderRadius: 12, 
                        fontSize: 11, 
                        fontWeight: 600,
                        background: cfg.bg, 
                        color: cfg.color,
                        letterSpacing: '0.02em'
                    }}>
                        {cfg.label}
                    </span>
                    <button
                        type="button"
                        className="icon-btn-edit"
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: 10,
                            border: 'none',
                            background: 'var(--bg-light, rgba(0,0,0,0.03))',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justify: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onClick={() => editDeal(deal)}
                        title="Редактировать сделку"
                    >
                        <Pencil size={16} />
                    </button>
                </div>
            </div>

            {/* ── Financial & Meta Highlight Bar ── */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                background: 'var(--bg-light, rgba(0,0,0,0.02))',
                borderRadius: 16,
                border: '1px solid var(--border-light, rgba(0,0,0,0.04))'
            }}>
                {Number(deal.price) > 0 && (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 400 }}>Цена:</span>
                        <span className="font-oswald" style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>
                            {Number(deal.price).toLocaleString()} ₽
                        </span>
                    </div>
                )}

                {Boolean(deal.mortgage || deal.mortgage_bank || Number(deal.mortgage_amount) > 0) && (
                    <BankBadge bankName={deal.mortgage_bank} amount={deal.mortgage_amount} />
                )}

                {lawyerName && (
                    <div style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: 6,
                        padding: '4px 10px',
                        background: 'rgba(245, 158, 11, 0.08)',
                        borderRadius: 10,
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        fontSize: 11
                    }}>
                        <Scale size={13} color="#d97706" />
                        <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Юрист:</span>
                        <span
                            style={{ fontWeight: 600, color: 'var(--text)', cursor: lawyer ? 'pointer' : 'default', textDecoration: lawyer ? 'underline' : 'none' }}
                            onClick={() => lawyer && navigate(`/clients/${lawyer.id}`)}
                        >
                            {lawyerName}
                        </span>
                    </div>
                )}

                {propertyAddress && !isAddressInTitle && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-secondary)' }}>
                        <Home size={12} color="var(--primary)" />
                        <span>{propertyAddress}</span>
                    </div>
                )}
            </div>

            {/* ── Seller + Buyer mini-cards ── */}
            {(sellers.length > 0 || buyers.length > 0) && (
                <div style={{ display: 'flex', gap: 10 }}>
                    <SideCard
                        side="seller"
                        clients={sellers}
                        agent={sellerAgent}
                        expenses={sellerExpenses}
                        accentColor="#8b5cf6"
                        accentBg="rgba(139,92,246,0.05)"
                        label="Продавец"
                    />
                    <SideCard
                        side="buyer"
                        clients={buyers}
                        agent={buyerAgent}
                        expenses={buyerExpenses}
                        accentColor="#0052ff"
                        accentBg="rgba(0,82,255,0.04)"
                        label="Покупатель"
                    />
                </div>
            )}

            {/* ── Dates & Events card ── */}
            {(deal.deposit_amount > 0 || deal.deposit_date || deal.deal_date || deal.handover_date || deal.mortgage) && (
                <div style={{ 
                    padding: '14px 16px', 
                    background: 'rgba(245, 158, 11, 0.05)', 
                    borderRadius: 16, 
                    border: '1px solid rgba(245, 158, 11, 0.2)', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: 10 
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <Calendar size={14} color="#d97706" />
                        <span style={{ 
                            fontSize: 11, 
                            fontWeight: 600, 
                            color: '#b45309', 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.04em' 
                        }}>
                            Даты и события
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {deal.deposit_amount > 0 && (
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                gap: 10,
                                flexWrap: 'wrap'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <DollarSign size={14} color="#d97706" />
                                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Задаток</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                                        {Number(deal.deposit_amount).toLocaleString()} ₽
                                    </span>
                                    {deal.deposit_date && (
                                        <span style={{ 
                                            fontSize: 11, 
                                            fontWeight: 500,
                                            color: 'var(--text-secondary)', 
                                            background: 'var(--surface, #ffffff)', 
                                            padding: '3px 9px', 
                                            borderRadius: 8, 
                                            border: '1px solid rgba(245,158,11,0.25)',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                        }}>
                                            {new Date(deal.deposit_date).toLocaleDateString('ru-RU')} в {new Date(deal.deposit_date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {deal.deal_date && (
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                gap: 10,
                                flexWrap: 'wrap',
                                borderTop: deal.deposit_amount > 0 ? '1px dashed rgba(245, 158, 11, 0.2)' : 'none',
                                paddingTop: deal.deposit_amount > 0 ? 8 : 0
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <CheckCircle size={14} color="#10b981" />
                                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Регистрация</span>
                                </div>
                                <span style={{ 
                                    fontSize: 11, 
                                    fontWeight: 500,
                                    color: 'var(--text-secondary)', 
                                    background: 'var(--surface, #ffffff)', 
                                    padding: '3px 9px', 
                                    borderRadius: 8, 
                                    border: '1px solid rgba(16, 185, 129, 0.25)',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                }}>
                                    {new Date(deal.deal_date).toLocaleDateString('ru-RU')} в {new Date(deal.deal_date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        )}

                        {deal.handover_date && (
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                gap: 10,
                                flexWrap: 'wrap',
                                borderTop: (deal.deposit_amount > 0 || deal.deal_date) ? '1px dashed rgba(245, 158, 11, 0.2)' : 'none',
                                paddingTop: (deal.deposit_amount > 0 || deal.deal_date) ? 8 : 0
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Home size={14} color="var(--primary)" />
                                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Передача объекта</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    {deal.handover_amount > 0 && (
                                        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                                            {Number(deal.handover_amount).toLocaleString()} ₽
                                        </span>
                                    )}
                                    <span style={{ 
                                        fontSize: 11, 
                                        fontWeight: 500,
                                        color: 'var(--text-secondary)', 
                                        background: 'var(--surface, #ffffff)', 
                                        padding: '3px 9px', 
                                        borderRadius: 8, 
                                        border: '1px solid rgba(0, 82, 255, 0.2)',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                    }}>
                                        {new Date(deal.handover_date).toLocaleDateString('ru-RU')} в {new Date(deal.handover_date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Chat toggle buttons ── */}
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                    onClick={() => {
                        const next = openChat === 'seller' ? null : 'seller';
                        setOpenChat(next);
                        if (next) {
                            localStorage.setItem(`last_viewed_chat_${deal.id}_seller`, new Date().toISOString());
                            setLastMessages(prev => {
                                const copy = { ...prev };
                                if (copy[deal.id]?.seller) {
                                    copy[deal.id].seller = { ...copy[deal.id].seller, created_at: new Date(0).toISOString() };
                                }
                                return copy;
                            });
                        }
                    }}
                    style={{
                        flex: 1, height: 38, borderRadius: 12, border: `1.5px solid ${openChat === 'seller' ? '#8b5cf6' : 'rgba(139,92,246,0.25)'}`,
                        background: openChat === 'seller' ? 'rgba(139,92,246,0.1)' : 'transparent',
                        color: '#8b5cf6', fontSize: 12, fontWeight: 500, fontFamily: "'Oswald', sans-serif",
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
                        transition: 'all 0.2s', position: 'relative'
                    }}
                >
                    <MessageSquare size={14} />
                    Чат продавца
                    {hasSellerUnread && (
                        <span style={{
                            position: 'absolute', top: 4, right: 6,
                            width: 8, height: 8, borderRadius: '50%',
                            background: '#ef4444',
                            boxShadow: '0 0 0 2px var(--surface)'
                        }} />
                    )}
                </button>
                <button
                    type="button"
                    title="Скопировать защищенную ссылку на чат продавца"
                    onClick={(e) => {
                        e.stopPropagation();
                        const hash = Math.abs(deal.id.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)).toString(36);
                        const secretToken = `t_sec_seller_${deal.id.substring(0, 8)}_${hash}`;
                        const baseOrigin = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                            ? 'https://realtor-match.vercel.app'
                            : window.location.origin;
                        const link = `${baseOrigin}/#/chat/${secretToken}`;
                        navigator.clipboard.writeText(link)
                            .then(() => toast.success('Защищенная ссылка на чат продавца скопирована!'))
                            .catch(() => toast.error('Не удалось скопировать'));
                    }}
                    style={{
                        width: 38, height: 38, borderRadius: 12, border: '1.5px solid rgba(139,92,246,0.25)',
                        background: 'transparent', color: '#8b5cf6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', flexShrink: 0
                    }}
                >
                    <Share2 size={14} />
                </button>

                <button
                    onClick={() => {
                        const next = openChat === 'buyer' ? null : 'buyer';
                        setOpenChat(next);
                        if (next) {
                            localStorage.setItem(`last_viewed_chat_${deal.id}_buyer`, new Date().toISOString());
                            setLastMessages(prev => {
                                const copy = { ...prev };
                                if (copy[deal.id]?.buyer) {
                                    copy[deal.id].buyer = { ...copy[deal.id].buyer, created_at: new Date(0).toISOString() };
                                }
                                return copy;
                            });
                        }
                    }}
                    style={{
                        flex: 1, height: 38, borderRadius: 12, border: `1.5px solid ${openChat === 'buyer' ? 'var(--primary)' : 'rgba(0,82,255,0.2)'}`,
                        background: openChat === 'buyer' ? 'var(--primary-light)' : 'transparent',
                        color: 'var(--primary)', fontSize: 12, fontWeight: 500, fontFamily: "'Oswald', sans-serif",
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
                        transition: 'all 0.2s', position: 'relative'
                    }}
                >
                    <MessageSquare size={14} />
                    Чат покупателя
                    {hasBuyerUnread && (
                        <span style={{
                            position: 'absolute', top: 4, right: 6,
                            width: 8, height: 8, borderRadius: '50%',
                            background: '#ef4444',
                            boxShadow: '0 0 0 2px var(--surface)'
                        }} />
                    )}
                </button>
                <button
                    type="button"
                    title="Скопировать защищенную ссылку на чат покупателя"
                    onClick={(e) => {
                        e.stopPropagation();
                        const hash = Math.abs(deal.id.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)).toString(36);
                        const secretToken = `t_sec_buyer_${deal.id.substring(0, 8)}_${hash}`;
                        const baseOrigin = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
                            ? 'https://realtor-match.vercel.app'
                            : window.location.origin;
                        const link = `${baseOrigin}/#/chat/${secretToken}`;
                        navigator.clipboard.writeText(link)
                            .then(() => toast.success('Защищенная ссылка на чат покупателя скопирована!'))
                            .catch(() => toast.error('Не удалось скопировать'));
                    }}
                    style={{
                        width: 38, height: 38, borderRadius: 12, border: '1.5px solid rgba(0,82,255,0.2)',
                        background: 'transparent', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', flexShrink: 0
                    }}
                >
                    <Share2 size={14} />
                </button>
            </div>

            {/* ── Inline Chat Panel ── */}
            {openChat === 'seller' && (
                <DealChat
                    dealId={deal.id}
                    side="seller"
                    currentUser={user}
                    title="Чат продавца"
                    accentColor="#8b5cf6"
                />
            )}
            {openChat === 'buyer' && (
                <DealChat
                    dealId={deal.id}
                    side="buyer"
                    currentUser={user}
                    title="Чат покупателя"
                    accentColor="#0052ff"
                />
            )}
        </div>
    );
}

export default DealsPage;
