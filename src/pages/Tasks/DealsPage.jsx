import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Pencil, Trash, CheckCircle, XCircle, Plus, TrendingUp, Calendar, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
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
    
    // Фильтр по периоду
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
    
    // Фильтрация по выбранному месяцу/году
    const filteredByPeriod = useMemo(() => {
        return deals.filter(d => {
            const dealDate = d.deal_date ? new Date(d.deal_date) : null;
            if (!dealDate) {
                // Если дата сделки не установлена, показываем её в месяце создания
                const createdAt = d.created_at ? new Date(d.created_at) : now;
                return createdAt.getMonth() === selectedMonth && createdAt.getFullYear() === selectedYear;
            }
            return dealDate.getMonth() === selectedMonth && dealDate.getFullYear() === selectedYear;
        });
    }, [deals, selectedMonth, selectedYear]);

    const filteredDeals = useMemo(() => {
        return filteredByPeriod.filter(d => filter === 'all' || d.status === filter);
    }, [filteredByPeriod, filter]);

    // Маска цены
    const formatPriceInput = (val) => {
        const digits = val.replace(/\D/g, '');
        const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        return formatted;
    };

    const parsePriceInput = (val) => val.replace(/\D/g, '');

    // Options для селектов
    const clientOptions = state.clients.map(c => ({ id: c.id, label: c.full_name }));
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

    // Автоподстановка при выборе объекта
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

    // Статистика за выбранный период
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

    // Навигация по месяцам
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
            expenses: newDeal.expenses || [],
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
            console.error('[Deal save error]', err);
            toast.error('Ошибка при сохранении сделки');
        }
    }

    function resetForm() {
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
        });
        prevPropertyId.current = '';
    }

    async function deleteDeal(deal) {
        if (window.confirm('Удалить сделку?')) {
            dispatch({ type: 'DELETE_DEAL', id: deal.id });
            toast.success('Сделка удалена');
        }
    }

    function updateStatus(deal, status) {
        dispatch({ type: 'UPDATE_DEAL', deal: { ...deal, status } });
        toast.success(`Статус сделки обновлён: ${status === 'closed' ? 'Закрыта' : status === 'cancelled' ? 'Отменена' : 'Активна'}`);
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
        const sellers = state.clients.filter(c => (deal.seller_ids || [deal.seller_id]).includes(c.id));
        const buyers = state.clients.filter(c => (deal.buyer_ids || [deal.buyer_id]).includes(c.id));
        const property = state.properties.find(p => p.id === deal.property_id);

        const statusConfig = {
            active: { label: 'Активна', color: 'var(--primary)', bg: 'var(--primary-light)' },
            closed: { label: 'Закрыта', color: '#fff', bg: 'var(--success)' },
            cancelled: { label: 'Отменена', color: '#fff', bg: 'var(--danger)' },
        };
        const cfg = statusConfig[deal.status] || statusConfig.active;

        return (
            <div className="card" style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{deal.title}</div>
                        {deal.mortgage && (
                            <span 
                                className="badge" 
                                style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontSize: 10, cursor: 'help' }}
                                title={`${deal.mortgage_bank || 'Банк не указан'}${deal.mortgage_amount ? ` · ${deal.mortgage_amount.toLocaleString()} ₽` : ''}${deal.mortgage_expiry ? ` · до ${new Date(deal.mortgage_expiry).toLocaleDateString()}` : ''}`}
                            >
                                🏠 Ипотека
                            </span>
                        )}
                    </div>
                    <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                </div>
                
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                    {sellers.length > 0 && (
                        <div>📤 Продавец: <strong>{sellers.map(s => s.full_name).join(', ')}</strong></div>
                    )}
                    {buyers.length > 0 && (
                        <div>📥 Покупатель: <strong>{buyers.map(b => b.full_name).join(', ')}</strong></div>
                    )}
                    {property && <div>🏠 Объект: <strong>{property.address || property.city}</strong>{property.price ? ` · ${property.price.toLocaleString()} ₽` : ''}</div>}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10, fontSize: 13 }}>
                    <div style={{ background: 'var(--bg)', padding: '6px 8px', borderRadius: 6 }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Цена</div>
                        <div style={{ fontWeight: 600 }}>{Number(deal.price).toLocaleString()} ₽</div>
                    </div>
                    <div style={{ background: 'var(--bg)', padding: '6px 8px', borderRadius: 6 }}>
                        <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Комиссия</div>
                        <div style={{ fontWeight: 600, color: 'var(--success)' }}>{Number(deal.commission).toLocaleString()} ₽</div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10, fontSize: 12 }}>
                    {deal.deal_date && (
                        <div style={{ color: 'var(--text-secondary)' }}>
                            <Calendar size={14} style={{ display: 'inline', marginRight: 4 }} />
                            Сделка: {new Date(deal.deal_date).toLocaleDateString('ru-RU')}
                        </div>
                    )}
                    {(deal.deposit_date || deal.deposit_amount) && (
                        <div style={{ color: 'var(--text-secondary)' }}>
                            💰 Задаток: {deal.deposit_date ? new Date(deal.deposit_date).toLocaleDateString('ru-RU') : '—'}
                            {deal.deposit_amount ? ` · ${Number(deal.deposit_amount).toLocaleString()} ₽` : ''}
                        </div>
                    )}
                </div>

                {deal.mortgage && (deal.mortgage_bank || deal.mortgage_amount || deal.mortgage_expiry) && (
                    <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '8px 12px' }}>
                        {deal.mortgage_bank && <span>🏦 <strong>{deal.mortgage_bank}</strong></span>}
                        {deal.mortgage_amount > 0 && <span>💵 Одобрено: <strong>{deal.mortgage_amount.toLocaleString()} ₽</strong></span>}
                        {deal.mortgage_expiry && <span>📅 До: <strong>{new Date(deal.mortgage_expiry).toLocaleDateString()}</strong></span>}
                    </div>
                )}

                {deal.expenses && deal.expenses.length > 0 && (
                    <div style={{ marginBottom: 10, fontSize: 12, background: 'var(--bg)', padding: '10px', borderRadius: 10 }}>
                        <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', textAlign: 'center', letterSpacing: '0.05em' }}>Расходы сторон</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            {/* Продавец */}
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>ПРОДАВЕЦ</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    {deal.expenses.filter(e => e.party === 'seller').map((exp, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.85 }}>
                                            <span style={{ fontSize: 11 }}>{exp.name}</span>
                                            <span style={{ fontWeight: 600 }}>{Number(exp.amount).toLocaleString()} ₽</span>
                                        </div>
                                    ))}
                                    <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4, display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--primary)' }}>
                                        <span>Итого:</span>
                                        <span>{deal.expenses.filter(e => e.party === 'seller').reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString()} ₽</span>
                                    </div>
                                </div>
                            </div>
                            {/* Покупатель */}
                            <div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>ПОКУПАТЕЛЬ</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    {deal.expenses.filter(e => e.party === 'buyer').map((exp, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', opacity: 0.85 }}>
                                            <span style={{ fontSize: 11 }}>{exp.name}</span>
                                            <span style={{ fontWeight: 600 }}>{Number(exp.amount).toLocaleString()} ₽</span>
                                        </div>
                                    ))}
                                    <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4, display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--success)' }}>
                                        <span>Итого:</span>
                                        <span>{deal.expenses.filter(e => e.party === 'buyer').reduce((sum, e) => sum + Number(e.amount), 0).toLocaleString()} ₽</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {deal.notes && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg)', padding: '6px 8px', borderRadius: 6, marginBottom: 10 }}>
                        📝 {deal.notes}
                    </div>
                )}

                <div style={{ display: 'flex', gap: 4, borderTop: '1px solid var(--border-light)', paddingTop: 10 }}>
                    {deal.status === 'active' && (
                        <>
                            <button className="icon-btn" onClick={() => updateStatus(deal, 'closed')} title="Закрыть">
                                <CheckCircle size={16} color="var(--success)" />
                            </button>
                            <button className="icon-btn" onClick={() => updateStatus(deal, 'cancelled')} title="Отменить">
                                <XCircle size={16} color="var(--danger)" />
                            </button>
                        </>
                    )}
                    <button className="icon-btn" onClick={() => editDeal(deal)} title="Редактировать">
                        <Pencil size={16} />
                    </button>
                    <button className="icon-btn" onClick={() => deleteDeal(deal)} title="Удалить">
                        <Trash size={16} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="page fade-in">
            <div className="topbar">
                <span className="topbar-title">Сделки</span>
                <button className="icon-btn" onClick={() => { resetForm(); setShowForm(!showForm); }} style={{ color: 'var(--primary)', fontSize: 24, fontWeight: 'bold' }}>+</button>
            </div>
            
            <div className="page-content" style={{ paddingTop: 8 }}>
                {/* Фильтр по периоду */}
                <div className="card" style={{ marginBottom: 12, padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <button className="icon-btn" onClick={prevMonth}>
                            <ChevronLeft size={20} />
                        </button>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 16, fontWeight: 700 }}>{monthNames[selectedMonth]} {selectedYear}</div>
                        </div>
                        <button className="icon-btn" onClick={nextMonth}>
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                {/* Статистика */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
                    <div className="card" style={{ background: 'var(--primary-light)', padding: '12px 10px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Активные</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>{stats.activeCount}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{stats.activeVolume.toLocaleString()} ₽</div>
                    </div>
                    <div className="card" style={{ background: 'var(--success-light)', padding: '12px 10px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Закрыто</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--success)' }}>{stats.closedCount}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{stats.totalCommission.toLocaleString()} ₽</div>
                    </div>
                    <div className="card" style={{ background: 'var(--danger-light)', padding: '12px 10px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Отменено</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--danger)' }}>{stats.cancelledCount}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{stats.closedVolume.toLocaleString()} ₽</div>
                    </div>
                </div>

                {/* Форма сделки */}
                {showForm && (
                    <form className="card" onSubmit={saveDeal} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>{newDeal.id ? 'Редактировать сделку' : 'Новая сделка'}</div>

                        <input className="form-input" placeholder="Название сделки" value={newDeal.title} required onChange={e => handleFieldChange('title', e.target.value)} />

                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: 'block' }}>Продавцы</label>
                            <MultiClientSelector
                                selectedIds={newDeal.seller_ids || []}
                                onChange={ids => handleFieldChange('seller_ids', ids)}
                                clients={state.clients}
                                placeholder="Выбрать продавцов..."
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: 'block' }}>Покупатели</label>
                            <MultiClientSelector
                                selectedIds={newDeal.buyer_ids || []}
                                onChange={ids => handleFieldChange('buyer_ids', ids)}
                                clients={state.clients}
                                placeholder="Выбрать покупателей..."
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: 'block' }}>Объект</label>
                            <SearchableSelect
                                value={newDeal.property_id || ''}
                                onChange={v => handleFieldChange('property_id', v)}
                                placeholder="Выберите объект..."
                                searchPlaceholder="Поиск объекта..."
                                options={propertyOptions}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <input className="form-input" placeholder="Цена" value={newDeal.price} onChange={e => handleFieldChange('price', formatPriceInput(e.target.value))} />
                            <input className="form-input" placeholder="Комиссия" value={newDeal.commission} onChange={e => handleFieldChange('commission', formatPriceInput(e.target.value))} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Дата сделки</label>
                                <input className="form-input" type="datetime-local" value={newDeal.deal_date || ''} onChange={e => handleFieldChange('deal_date', e.target.value)} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Дата задатка</label>
                                <input className="form-input" type="datetime-local" value={newDeal.deposit_date || ''} onChange={e => handleFieldChange('deposit_date', e.target.value)} />
                            </div>
                        </div>

                        <input className="form-input" placeholder="Сумма задатка" value={newDeal.deposit_amount} onChange={e => handleFieldChange('deposit_amount', formatPriceInput(e.target.value))} />

                        <textarea className="form-textarea" rows={2} placeholder="Заметки..." value={newDeal.notes} onChange={e => handleFieldChange('notes', e.target.value)} />

                        <div className="form-group flex justify-between items-center" style={{ background: 'var(--bg)', padding: '10px 12px', borderRadius: 10 }}>
                            <label className="form-label mb-0" style={{ cursor: 'pointer', margin: 0 }}>Ипотечная сделка</label>
                            <input type="checkbox" checked={newDeal.mortgage} onChange={e => handleFieldChange('mortgage', e.target.checked)} style={{ width: 20, height: 20 }} />
                        </div>

                        {newDeal.mortgage && (
                            <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'var(--primary-light)', padding: 12, borderRadius: 12 }}>
                                <input 
                                    className="form-input" 
                                    placeholder="Банк" 
                                    value={newDeal.mortgage_bank} 
                                    onChange={e => handleFieldChange('mortgage_bank', e.target.value)} 
                                />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    <input 
                                        className="form-input" 
                                        placeholder="Сумма одобрена" 
                                        value={newDeal.mortgage_amount} 
                                        onChange={e => handleFieldChange('mortgage_amount', formatPriceInput(e.target.value))} 
                                    />
                                    <div>
                                        <label style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600, display: 'block', marginBottom: 2 }}>До какого числа</label>
                                        <input 
                                            className="form-input" 
                                            type="date" 
                                            value={newDeal.mortgage_expiry} 
                                            onChange={e => handleFieldChange('mortgage_expiry', e.target.value)} 
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, display: 'block' }}>Расходы по сделке</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                {newDeal.expenses?.map((exp, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center', background: 'var(--bg)', padding: 6, borderRadius: 8 }}>
                                        <div style={{ flex: 1, fontSize: 13 }}>{exp.name}</div>
                                        <div style={{ width: 80, fontSize: 13, fontWeight: 600 }}>{Number(exp.amount).toLocaleString()} ₽</div>
                                        <select 
                                            value={exp.party} 
                                            onChange={e => {
                                                const next = [...newDeal.expenses];
                                                next[idx] = { ...next[idx], party: e.target.value };
                                                handleFieldChange('expenses', next);
                                            }}
                                            style={{ padding: '2px 4px', fontSize: 11, borderRadius: 4, border: '1px solid var(--border)' }}
                                        >
                                            <option value="seller">Прод.</option>
                                            <option value="buyer">Пок.</option>
                                        </select>
                                        <button type="button" className="icon-btn" onClick={() => {
                                            const next = newDeal.expenses.filter((_, i) => i !== idx);
                                            handleFieldChange('expenses', next);
                                        }}>
                                            <XCircle size={14} color="var(--danger)" />
                                        </button>
                                    </div>
                                ))}
                                
                                <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                    <select 
                                        className="form-input" 
                                        style={{ flex: 1, fontSize: 13 }}
                                        onChange={e => {
                                            if (!e.target.value) return;
                                            const item = state.pricelist.find(i => i.id === e.target.value);
                                            if (item) {
                                                const next = [...(newDeal.expenses || []), { 
                                                    id: nanoid(), 
                                                    name: item.name, 
                                                    amount: item.price, 
                                                    party: 'buyer' 
                                                }];
                                                handleFieldChange('expenses', next);
                                            }
                                            e.target.value = '';
                                        }}
                                    >
                                        <option value="">+ Из прейскуранта</option>
                                        {state.pricelist.map(item => (
                                            <option key={item.id} value={item.id}>{item.name} ({item.price.toLocaleString()} ₽)</option>
                                        ))}
                                    </select>
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary" 
                                        style={{ padding: '0 12px', fontSize: 12 }}
                                        onClick={() => {
                                            const name = prompt('Название расхода:');
                                            const amount = prompt('Сумма:');
                                            if (name && amount) {
                                                const next = [...(newDeal.expenses || []), { 
                                                    id: nanoid(), 
                                                    name, 
                                                    amount: Number(amount.replace(/\D/g, '')), 
                                                    party: 'buyer' 
                                                }];
                                                handleFieldChange('expenses', next);
                                            }
                                        }}
                                    >
                                        + Вручную
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setShowForm(false); resetForm(); }}>Отмена</button>
                            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{newDeal.id ? 'Сохранить' : 'Создать'}</button>
                        </div>
                    </form>
                )}

                {/* Фильтры по статусу */}
                <div className="tab-filters" style={{ marginBottom: 12 }}>
                    {[['active', 'Активные'], ['closed', 'Закрытые'], ['cancelled', 'Отменённые'], ['all', 'Все']].map(([v, l]) => (
                        <button key={v} className={`tab-filter ${filter === v ? 'active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
                    ))}
                </div>

                {/* Список сделок */}
                {filteredDeals.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-title">Нет сделок</div>
                        <div className="empty-desc">{filteredByPeriod.length === 0 ? `Нет сделок за ${monthNames[selectedMonth]} ${selectedYear}` : 'Нет сделок с выбранным статусом'}</div>
                    </div>
                ) : (
                    filteredDeals.map(d => <DealCard key={d.id} deal={d} />)
                )}
            </div>
        </div>
    );
}

export default DealsPage;
