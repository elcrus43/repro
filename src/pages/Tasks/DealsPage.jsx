import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Edit2, Trash2, CheckCircle, XCircle, Plus, TrendingUp, Calendar, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { SearchableSelect } from '../../components/SearchableSelect';
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
        seller_id: prefillData.seller_id || '',
        buyer_id: prefillData.buyer_id || '',
        property_id: prefillData.property_id || '',
        price: prefillData.price || '',
        deal_date: prefillData.deal_date || new Date().toISOString().slice(0, 16),
        deposit_date: prefillData.deposit_date || '',
        deposit_amount: prefillData.deposit_amount || '',
        commission: prefillData.commission || '',
        notes: prefillData.notes || '',
    });

    const deals = state.deals.filter(d => user?.role === 'admin' || d.realtor_id === user?.id);
    
    // Фильтрация по выбранному месяцу/году
    const filteredByPeriod = useMemo(() => {
        return deals.filter(d => {
            const dealDate = d.deal_date ? new Date(d.deal_date) : null;
            if (!dealDate) return false;
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
            seller_id: '', 
            buyer_id: '', 
            property_id: '', 
            price: '', 
            deal_date: new Date().toISOString().slice(0, 16), 
            deposit_date: '',
            deposit_amount: '',
            commission: '',
            notes: '',
        });
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
            price: deal.price ? deal.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '',
            deposit_amount: deal.deposit_amount ? deal.deposit_amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '',
            commission: deal.commission ? deal.commission.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '',
            deal_date: deal.deal_date ? deal.deal_date.slice(0, 16) : '',
            deposit_date: deal.deposit_date ? deal.deposit_date.slice(0, 16) : '',
        });
        setShowForm(true);
    }

    function DealCard({ deal }) {
        const seller = state.clients.find(c => c.id === deal.seller_id);
        const buyer = state.clients.find(c => c.id === deal.buyer_id);
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
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{deal.title}</div>
                    <span className="badge" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                </div>
                
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10 }}>
                    {seller && <div>📤 Продавец: <strong>{seller.full_name}</strong></div>}
                    {buyer && <div>📥 Покупатель: <strong>{buyer.full_name}</strong></div>}
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
                    {deal.deposit_date && (
                        <div style={{ color: 'var(--text-secondary)' }}>
                            💰 Задаток: {new Date(deal.deposit_date).toLocaleDateString('ru-RU')}
                            {deal.deposit_amount ? ` · ${Number(deal.deposit_amount).toLocaleString()} ₽` : ''}
                        </div>
                    )}
                </div>

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
                        <Edit2 size={16} />
                    </button>
                    <button className="icon-btn" onClick={() => deleteDeal(deal)} title="Удалить">
                        <Trash2 size={16} />
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

                        <SearchableSelect
                            value={newDeal.seller_id || ''}
                            onChange={v => handleFieldChange('seller_id', v)}
                            placeholder="Продавец..."
                            searchPlaceholder="Поиск продавца..."
                            options={clientOptions}
                        />

                        <SearchableSelect
                            value={newDeal.buyer_id || ''}
                            onChange={v => handleFieldChange('buyer_id', v)}
                            placeholder="Покупатель..."
                            searchPlaceholder="Поиск покупателя..."
                            options={clientOptions}
                        />

                        <SearchableSelect
                            value={newDeal.property_id || ''}
                            onChange={v => handleFieldChange('property_id', v)}
                            placeholder="Объект..."
                            searchPlaceholder="Поиск объекта..."
                            options={propertyOptions}
                        />

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
