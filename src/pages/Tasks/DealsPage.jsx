import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { nanoid } from '../../utils/nanoid';

export function DealsPage() {
    const { state, dispatch } = useApp();
    const { toast } = useToastContext();
    const user = state.currentUser;
    const navigate = useNavigate();
    const location = useLocation();

    // Prefill data from Matches page
    const prefillData = location.state?.prefillDeal || {};

    const [filter, setFilter] = useState('active');
    const [newDeal, setNewDeal] = useState({
        title: prefillData.title || '',
        seller_id: prefillData.seller_id || '',
        buyer_id: prefillData.buyer_id || '',
        property_id: prefillData.property_id || '',
        price: prefillData.price || '',
        deal_date: prefillData.deal_date || new Date().toISOString().slice(0, 16),
        commission: prefillData.commission || '',
    });

    const deals = state.deals.filter(d => user?.role === 'admin' || d.realtor_id === user?.id);
    const filteredDeals = deals.filter(d => filter === 'all' || d.status === filter);

    // Clear prefill after mount
    useEffect(() => {
        if (location.state?.prefillDeal) {
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    function handleFieldChange(field, value) {
        setNewDeal(prev => ({ ...prev, [field]: value }));
    }

    async function addDeal(e) {
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
            price: Number(newDeal.price) || 0,
            commission: Number(newDeal.commission) || 0,
            deal_date: newDeal.deal_date || null,
            status: 'active',
        };

        try {
            if (newDeal.id) {
                dispatch({ type: 'UPDATE_DEAL', deal: dealToSave });
                toast.success('Сделка обновлена');
            } else {
                dispatch({ type: 'ADD_DEAL', deal: dealToSave });
                toast.success('Сделка создана');
            }
            setNewDeal({ title: '', seller_id: '', buyer_id: '', property_id: '', price: '', deal_date: new Date().toISOString().slice(0, 16), commission: '' });
        } catch (err) {
            console.error('[Deal save error]', err);
            toast.error('Ошибка при сохранении сделки');
        }
    }

    async function deleteDeal(deal) {
        if (window.confirm('Удалить сделку?')) {
            dispatch({ type: 'DELETE_DEAL', id: deal.id });
            toast.success('Сделка удалена');
        }
    }

    function updateStatus(deal, status) {
        dispatch({ type: 'UPDATE_DEAL', deal: { ...deal, status } });
        toast.success(`Статус сделки обновлён: ${status === 'closed' ? 'Закрыта' : 'Отменена'}`);
    }

    function editDeal(deal) {
        setNewDeal({ ...deal, deal_date: deal.deal_date ? deal.deal_date.slice(0, 16) : '' });
    }

    const activeDeals = filteredDeals.filter(d => d.status === 'active');
    const closedDeals = filteredDeals.filter(d => d.status === 'closed');
    const cancelledDeals = filteredDeals.filter(d => d.status === 'cancelled');

    return (
        <div className="page fade-in">
            <div className="topbar">
                <span className="topbar-title">Сделки</span>
            </div>
            <div className="page-content" style={{ paddingTop: 8 }}>
                {/* Inline Deal Form */}
                <form className="card" onSubmit={addDeal} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{newDeal.id ? 'Редактировать сделку' : 'Новая сделка'}</div>

                    <input className="form-input" placeholder="Название сделки" value={newDeal.title} required onChange={e => handleFieldChange('title', e.target.value)} />

                    <select className="form-select" value={newDeal.seller_id || ''} onChange={e => handleFieldChange('seller_id', e.target.value)}>
                        <option value="">Продавец...</option>
                        {state.clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>

                    <select className="form-select" value={newDeal.buyer_id || ''} onChange={e => handleFieldChange('buyer_id', e.target.value)}>
                        <option value="">Покупатель...</option>
                        {state.clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                    </select>

                    <select className="form-select" value={newDeal.property_id || ''} onChange={e => handleFieldChange('property_id', e.target.value)}>
                        <option value="">Объект...</option>
                        {state.properties.map(p => <option key={p.id} value={p.id}>{p.address} ({p.price?.toLocaleString()} ₽)</option>)}
                    </select>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <input className="form-input" type="number" placeholder="Цена" value={newDeal.price} onChange={e => handleFieldChange('price', e.target.value)} />
                        <input className="form-input" type="number" placeholder="Комиссия" value={newDeal.commission} onChange={e => handleFieldChange('commission', e.target.value)} />
                    </div>

                    <input className="form-input" type="datetime-local" value={newDeal.deal_date || ''} onChange={e => handleFieldChange('deal_date', e.target.value)} />

                    <div style={{ display: 'flex', gap: 8 }}>
                        {newDeal.id && (
                            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setNewDeal({ title: '', seller_id: '', buyer_id: '', property_id: '', price: '', deal_date: new Date().toISOString().slice(0, 16), commission: '' })}>Очистить</button>
                        )}
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{newDeal.id ? 'Сохранить' : 'Создать'}</button>
                    </div>
                </form>

                {/* Filters */}
                <div className="tab-filters" style={{ marginBottom: 12 }}>
                    {[['active', 'Активные'], ['closed', 'Закрытые'], ['cancelled', 'Отменённые'], ['all', 'Все']].map(([v, l]) => (
                        <button key={v} className={`tab-filter ${filter === v ? 'active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
                    ))}
                </div>

                {/* Deal List */}
                {activeDeals.map(d => (
                    <div key={d.id} className="card" style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div style={{ fontWeight: 700 }}>{d.title}</div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                <button className="icon-btn" onClick={() => updateStatus(d, 'closed')} title="Закрыть"><CheckCircle size={18} color="var(--success)" /></button>
                                <button className="icon-btn" onClick={() => updateStatus(d, 'cancelled')} title="Отменить"><XCircle size={18} color="var(--danger)" /></button>
                                <button className="icon-btn" onClick={() => editDeal(d)}><Edit2 size={16} /></button>
                                <button className="icon-btn" onClick={() => deleteDeal(d)}><Trash2 size={16} /></button>
                            </div>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div>Продавец: {state.clients.find(c => c.id === d.seller_id)?.full_name || '—'}</div>
                            <div>Покупатель: {state.clients.find(c => c.id === d.buyer_id)?.full_name || '—'}</div>
                            <div>Объект: {state.properties.find(p => p.id === d.property_id)?.address || '—'}</div>
                            <div>Цена: {Number(d.price).toLocaleString()} ₽ · Комиссия: {Number(d.commission).toLocaleString()} ₽</div>
                            <div>Дата: {d.deal_date ? new Date(d.deal_date).toLocaleDateString('ru-RU') : '—'}</div>
                        </div>
                    </div>
                ))}

                {filter !== 'active' && closedDeals.map(d => (
                    <div key={d.id} className="card" style={{ marginBottom: 8, opacity: 0.7 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div style={{ fontWeight: 700, textDecoration: 'line-through' }}>{d.title}</div>
                            <span className="badge" style={{ background: 'var(--success)', color: '#fff' }}>Закрыта</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            Цена: {Number(d.price).toLocaleString()} ₽ · Комиссия: {Number(d.commission).toLocaleString()} ₽
                        </div>
                    </div>
                ))}

                {filter !== 'active' && cancelledDeals.map(d => (
                    <div key={d.id} className="card" style={{ marginBottom: 8, opacity: 0.7 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div style={{ fontWeight: 700, textDecoration: 'line-through' }}>{d.title}</div>
                            <span className="badge" style={{ background: 'var(--danger)', color: '#fff' }}>Отменена</span>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            Цена: {Number(d.price).toLocaleString()} ₽ · Комиссия: {Number(d.commission).toLocaleString()} ₽
                        </div>
                    </div>
                ))}

                {filteredDeals.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-title">Нет сделок</div>
                        <div className="empty-desc">Заполните форму выше или создайте из совпадения</div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DealsPage;
