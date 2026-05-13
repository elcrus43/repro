import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Pencil, Trash, CheckCircle, XCircle, Plus, TrendingUp, Calendar, DollarSign, ChevronLeft, ChevronRight, Briefcase, User, MapPin, Wallet, Activity } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { SearchableSelect } from '../../components/SearchableSelect';
import { MultiClientSelector } from '../../components/MultiClientSelector';
import { nanoid } from '../../utils/nanoid';

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
    });

    const prevPropertyId = useRef(newDeal.property_id);
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

    const formatPriceInput = (val) => {
        const digits = val.replace(/\D/g, '');
        return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    };

    const parsePriceInput = (val) => val.replace(/\D/g, '');

    const propertyOptions = state.properties.map(p => ({ 
        id: p.id, 
        label: `${p.address || p.city} — ${p.price?.toLocaleString()} ₽` 
    }));

    useEffect(() => {
        if (location.state?.prefillDeal) {
            setShowForm(true);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, []);

    useEffect(() => {
        if (newDeal.property_id && newDeal.property_id !== prevPropertyId.current) {
            const prop = state.properties.find(p => p.id === newDeal.property_id);
            if (prop) {
                setNewDeal(prev => ({
                    ...prev,
                    price: formatPriceInput(String(prop.price || '')),
                    commission: formatPriceInput(String(prop.commission || '')),
                    seller_ids: prop.client_ids || (prop.client_id ? [prop.client_id] : [])
                }));
            }
        }
        prevPropertyId.current = newDeal.property_id;
    }, [newDeal.property_id, state.properties]);

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

    const addExpense = () => {
        const newExpense = { id: nanoid(), title: '', amount: '', payer: 'seller' };
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
            price: Number(parsePriceInput(String(newDeal.price))) || 0,
            deposit_amount: Number(parsePriceInput(String(newDeal.deposit_amount))) || 0,
            commission: Number(parsePriceInput(String(newDeal.commission))) || 0,
            deal_date: newDeal.deal_date || null,
            deposit_date: newDeal.deposit_date || null,
            status: newDeal.status || 'active',
            mortgage: newDeal.mortgage || false,
            mortgage_bank: newDeal.mortgage_bank || '',
            mortgage_amount: Number(parsePriceInput(String(newDeal.mortgage_amount))) || 0,
            mortgage_expiry: newDeal.mortgage_expiry || null,
            expenses: (newDeal.expenses || []).map(e => ({
                ...e,
                amount: Number(parsePriceInput(String(e.amount))) || 0
            })),
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
        setNewDeal({ id: '', title: '', seller_ids: [], buyer_ids: [], property_id: '', price: '', deal_date: '', deposit_date: '', deposit_amount: '', commission: '', notes: '', mortgage: false, mortgage_bank: '', mortgage_amount: '', mortgage_expiry: '', expenses: [] });
        prevPropertyId.current = '';
    }

    function updateStatus(deal, status) {
        dispatch({ type: 'UPDATE_DEAL', deal: { ...deal, status } });
        toast.success(`Статус обновлён: ${status === 'closed' ? 'Закрыта' : 'Активна'}`);
    }

    function editDeal(deal) {
        setNewDeal({ 
            ...deal, 
            seller_ids: deal.seller_ids || (deal.seller_id ? [deal.seller_id] : []),
            buyer_ids: deal.buyer_ids || (deal.buyer_id ? [deal.buyer_id] : []),
            price: deal.price ? deal.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '',
            deposit_amount: deal.deposit_amount ? deal.deposit_amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '',
            commission: deal.commission ? deal.commission.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '',
            deal_date: deal.deal_date ? deal.deal_date.slice(0, 16) : '',
            deposit_date: deal.deposit_date ? deal.deposit_date.slice(0, 16) : '',
            mortgage_amount: deal.mortgage_amount ? deal.mortgage_amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '',
        });
        prevPropertyId.current = deal.property_id;
        setShowForm(true);
    }

    function DealCard({ deal }) {
        const sellers = state.clients.filter(c => (deal.seller_ids || (deal.seller_id ? [deal.seller_id] : [])).includes(c.id));
        const buyers = state.clients.filter(c => (deal.buyer_ids || (deal.buyer_id ? [deal.buyer_id] : [])).includes(c.id));
        const property = state.properties.find(p => p.id === deal.property_id);

        const statusConfig = {
            active: { label: 'Активна', color: 'var(--primary)', bg: 'var(--primary-light)' },
            closed: { label: 'Закрыта', color: '#fff', bg: '#10b981' },
            cancelled: { label: 'Отменена', color: '#fff', bg: 'var(--danger)' },
        };
        const cfg = statusConfig[deal.status] || statusConfig.active;

        return (
            <div className="card" style={{ padding: 24, borderRadius: 32, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', background: 'white', marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                        <div className="font-oswald" style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>{deal.title}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>
                            <Calendar size={14} /> {deal.deal_date ? new Date(deal.deal_date).toLocaleDateString('ru-RU') : 'Дата не назначена'}
                        </div>
                    </div>
                    <span style={{ 
                        padding: '6px 12px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                        background: cfg.bg === 'var(--primary)' ? 'var(--primary-light)' : cfg.bg.startsWith('#') ? `${cfg.bg}15` : cfg.bg,
                        color: cfg.bg === 'var(--primary)' ? 'var(--primary)' : cfg.bg.startsWith('#') ? cfg.bg : '#fff'
                    }}>{cfg.label}</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                    <div style={{ background: 'var(--bg-light)', padding: '16px', borderRadius: 20 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: 4 }}>Цена</div>
                        <div className="font-oswald" style={{ fontSize: 20, fontWeight: 800 }}>{Number(deal.price).toLocaleString()} ₽</div>
                    </div>
                    <div style={{ background: 'var(--bg-light)', padding: '16px', borderRadius: 20 }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: 4 }}>Комиссия</div>
                        <div className="font-oswald" style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>{Number(deal.commission).toLocaleString()} ₽</div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    {property && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: 'rgba(0,82,255,0.03)', borderRadius: 14 }}>
                            <MapPin size={18} color="var(--primary)" />
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{property.address || property.city}</div>
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: 8 }}>
                        {sellers.length > 0 && (
                            <div style={{ flex: 1, padding: '10px 12px', background: 'var(--bg-light)', borderRadius: 14, fontSize: 12 }}>
                                <div style={{ color: 'var(--text-muted)', fontWeight: 800, fontSize: 9, marginBottom: 2 }}>Продавец</div>
                                <div style={{ fontWeight: 700 }}>{sellers.map(s => s.full_name).join(', ')}</div>
                            </div>
                        )}
                        {buyers.length > 0 && (
                            <div style={{ flex: 1, padding: '10px 12px', background: 'var(--bg-light)', borderRadius: 14, fontSize: 12 }}>
                                <div style={{ color: 'var(--text-muted)', fontWeight: 800, fontSize: 9, marginBottom: 2 }}>Покупатель</div>
                                <div style={{ fontWeight: 700 }}>{buyers.map(b => b.full_name).join(', ')}</div>
                            </div>
                        )}
                    </div>
                    {deal.expenses && deal.expenses.length > 0 && (
                        <div style={{ marginTop: 12, padding: '12px', background: '#fff9e6', borderRadius: 16, border: '1px dashed #ffd43b' }}>
                            <div style={{ fontSize: 9, fontWeight: 900, color: '#856404', marginBottom: 8, textTransform: 'uppercase' }}>Расходы сторон</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {deal.expenses.map(exp => (
                                    <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>{exp.title} ({exp.payer === 'seller' ? 'Прод.' : 'Покуп.'})</span>
                                        <span style={{ color: 'var(--text)' }}>{Number(exp.amount).toLocaleString()} ₽</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: 8, borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: 16 }}>
                    {deal.status === 'active' && (
                        <button className="card-clickable" style={{ flex: 1, height: 44, borderRadius: 12, background: 'var(--success-light)', color: '#10b981', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 800, fontSize: 12, textTransform: 'uppercase' }} onClick={() => updateStatus(deal, 'closed')}>
                            <CheckCircle size={18} /> Закрыть
                        </button>
                    )}
                    <button className="card-clickable" style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bg-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => editDeal(deal)}>
                        <Pencil size={18} />
                    </button>
                    <button className="card-clickable" style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--danger-light)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { if(window.confirm('Удалить?')) dispatch({type:'DELETE_DEAL', id: deal.id}); }}>
                        <Trash size={18} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page fade-in">
            {/* Sticky Header — Open Design */}
            <div className="topbar sticky" style={{ 
                background: 'rgba(255,255,255,0.7)', 
                backdropFilter: 'blur(24px) saturate(180%)',
                padding: '20px',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                height: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span className="topbar-title font-oswald" style={{ letterSpacing: '0.02em', fontSize: 22 }}>Управление сделками</span>
                    <button className="card-clickable" onClick={() => { resetForm(); setShowForm(!showForm); }} style={{ 
                        width: 44, height: 44, borderRadius: 14, background: 'var(--primary)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Plus size={24} />
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '8px 12px', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <button className="card-clickable" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={prevMonth}><ChevronLeft size={20} /></button>
                    <div className="font-oswald" style={{ fontSize: 16, fontWeight: 700 }}>{monthNames[selectedMonth]} {selectedYear}</div>
                    <button className="card-clickable" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={nextMonth}><ChevronRight size={20} /></button>
                </div>
            </div>

            <div className="page-content" style={{ padding: '20px 20px 120px', gap: 16 }}>
                
                {/* Statistics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="card" style={{ padding: 20, borderRadius: 28, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', background: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Activity size={16} /></div>
                            <span className="font-oswald" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>В работе</span>
                        </div>
                        <div className="font-oswald" style={{ fontSize: 24, fontWeight: 800 }}>{stats.activeCount} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>сд.</span></div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', marginTop: 4 }}>{stats.activeVolume.toLocaleString()} ₽</div>
                    </div>
                    <div className="card" style={{ padding: 20, borderRadius: 28, border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', background: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--success-light)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Wallet size={16} /></div>
                            <span className="font-oswald" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Выручка</span>
                        </div>
                        <div className="font-oswald" style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>{stats.totalCommission.toLocaleString()} <span style={{ fontSize: 14 }}>₽</span></div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginTop: 4 }}>За {monthNames[selectedMonth].toLowerCase()}</div>
                    </div>
                </div>

                {/* Form Overlay (Simulated by rendering before list) */}
                {showForm && (
                    <div className="card fade-in" style={{ padding: '28px', borderRadius: 32, border: 'none', boxShadow: '0 12px 48px rgba(0,82,255,0.1)', background: 'white', display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="font-oswald" style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }}>{newDeal.id ? 'Параметры сделки' : 'Запуск новой сделки'}</div>
                        
                        <input className="form-input" style={{ height: 50, borderRadius: 14, background: 'var(--bg-light)', border: 'none', fontWeight: 600 }} placeholder="Название сделки (напр. Продажа 1к. на Ленина)" value={newDeal.title} required onChange={e => handleFieldChange('title', e.target.value)} />

                        <div className="form-group">
                            <label className="font-oswald" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>Стороны сделки</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <MultiClientSelector selectedIds={newDeal.seller_ids || []} onChange={ids => handleFieldChange('seller_ids', ids)} clients={state.clients} placeholder="Выбрать продавцов..." />
                                <MultiClientSelector selectedIds={newDeal.buyer_ids || []} onChange={ids => handleFieldChange('buyer_ids', ids)} clients={state.clients} placeholder="Выбрать покупателей..." />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="font-oswald" style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>Объект</label>
                            <SearchableSelect value={newDeal.property_id || ''} onChange={v => handleFieldChange('property_id', v)} placeholder="Выберите объект..." options={propertyOptions} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div className="form-group">
                                <label className="font-oswald" style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Цена</label>
                                <input className="form-input" style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontWeight: 600 }} value={newDeal.price} onChange={e => handleFieldChange('price', formatPriceInput(e.target.value))} />
                            </div>
                            <div className="form-group">
                                <label className="font-oswald" style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Комиссия</label>
                                <input className="form-input" style={{ height: 44, borderRadius: 12, background: 'var(--bg-light)', border: 'none', fontWeight: 600 }} value={newDeal.commission} onChange={e => handleFieldChange('commission', formatPriceInput(e.target.value))} />
                            </div>
                        </div>

                        <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <label className="font-oswald" style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', display: 'block' }}>Расходы сторон</label>
                                <button type="button" onClick={addExpense} style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 800 }}>+ Добавить</button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {newDeal.expenses?.map(exp => (
                                    <div key={exp.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                        <input className="form-input" style={{ flex: 2, height: 36, fontSize: 12 }} placeholder="Статья (напр. Госпошлина)" value={exp.title} onChange={e => updateExpense(exp.id, 'title', e.target.value)} />
                                        <input className="form-input" style={{ flex: 1, height: 36, fontSize: 12 }} placeholder="Сумма" value={exp.amount} onChange={e => updateExpense(exp.id, 'amount', formatPriceInput(e.target.value))} />
                                        <select className="form-input" style={{ flex: 1, height: 36, fontSize: 11, padding: '0 4px' }} value={exp.payer} onChange={e => updateExpense(exp.id, 'payer', e.target.value)}>
                                            <option value="seller">Прод.</option>
                                            <option value="buyer">Покуп.</option>
                                        </select>
                                        <button onClick={() => removeExpense(exp.id)} style={{ width: 36, height: 36, borderRadius: 8, border: 'none', background: 'var(--danger-light)', color: 'var(--danger)' }}><XCircle size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn btn-primary" style={{ flex: 1, height: 50, borderRadius: 16, fontWeight: 700 }} onClick={saveDeal}>Сохранить</button>
                            <button className="btn btn-secondary" style={{ flex: 1, height: 50, borderRadius: 16, background: 'var(--bg-light)', border: 'none', color: 'var(--text-secondary)' }} onClick={() => { setShowForm(false); resetForm(); }}>Отмена</button>
                        </div>
                    </div>
                )}

                {/* Status Tabs */}
                <div className="tab-filters" style={{ padding: '4px 0', gap: 10 }}>
                    {[['active', 'Активные'], ['closed', 'Закрытые'], ['all', 'Все']].map(([v, l]) => (
                        <button key={v} className={`tab-filter ${filter === v ? 'active' : ''}`} style={{ 
                            padding: '8px 16px', borderRadius: 12, border: 'none', fontSize: 12, fontWeight: 700,
                            background: filter === v ? 'var(--primary)' : 'white',
                            color: filter === v ? 'white' : 'var(--text-secondary)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }} onClick={() => setFilter(v)}>{l}</button>
                    ))}
                </div>

                {/* List of Deals */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {filteredDeals.length === 0 ? (
                        <div className="empty-state" style={{ padding: '40px 0' }}>
                            <div className="font-oswald" style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-muted)' }}>Сделок не найдено</div>
                        </div>
                    ) : (
                        filteredDeals.map(d => <DealCard key={d.id} deal={d} />)
                    )}
                </div>
            </div>
        </div>
    );
}

export default DealsPage;
