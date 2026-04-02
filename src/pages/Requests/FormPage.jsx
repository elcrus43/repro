import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { PROPERTY_TYPES } from '../../data/constants';
import { CITIES, KIROV_DISTRICTS } from '../../data/location';

export function FormPage() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const { state, dispatch } = useApp();
    const navigate = useNavigate();

    const existing = id ? state.requests.find(r => r.id === id) : null;
    const initialForm = existing || {
        client_id: searchParams.get('client') || '',
        realtor_id: state.currentUser?.id,
        property_types: ['apartment'],
        city: 'Краснодар',
        districts: [],
        microdistricts: [],
        budget_min: 0,
        budget_max: 0,
        rooms: [1],
        area_min: 0,
        area_max: 0,
        floor_min: 0,
        floor_max: 0,
        mortgage: false,
        status: 'active',
        commission: 0,
        notes: ''
    };

    const [form, setForm] = useState(initialForm);
    const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const toggleItem = (key, val) => {
        const arr = form[key] || [];
        setF(key, arr.includes(val) ? arr.filter(i => i !== val) : [...arr, val]);
    };

    function handleSubmit(e) {
        e.preventDefault();
        if (!form.client_id) return alert('Выберите клиента');

        if (id) {
            dispatch({ type: 'UPDATE_REQUEST', request: { ...form, id } });
            navigate(`/requests/${id}`);
        } else {
            dispatch({ type: 'ADD_REQUEST', request: { ...form, realtor_id: state.currentUser?.id } });
            navigate('/requests');
        }
    }

    const cityDistricts = form.city === 'Киров'
        ? KIROV_DISTRICTS.map(d => d.name)
        : [];

    return (
        <div className="page fade-in">
            <div className="topbar">
                <button className="topbar-back" onClick={() => navigate(-1)}>←</button>
                <span className="topbar-title">{id ? 'Редактировать' : 'Новый запрос'}</span>
            </div>

            <form className="page-content" onSubmit={handleSubmit}>
                <div className="card flex flex-column gap-16">
                    {/* Client Selection */}
                    <div className="form-group">
                        <label className="form-label">Клиент <span className="required">*</span></label>
                        <select className="form-select" value={form.client_id} onChange={e => setF('client_id', e.target.value)} disabled={!!id} required>
                            <option value="">Выберите клиента</option>
                            {state.clients.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>)}
                        </select>
                        {!id && <button type="button" className="btn btn-link btn-sm" onClick={() => navigate('/clients/new?returnTo=' + encodeURIComponent(window.location.pathname + window.location.search))}>+ Создать клиента</button>}
                    </div>

                    {/* Property Types */}
                    <div className="form-group">
                        <label className="form-label">Тип недвижимости</label>
                        <div className="chip-group">
                            {Object.entries(PROPERTY_TYPES).map(([val, label]) => (
                                <button key={val} type="button" className={`chip ${form.property_types?.includes(val) ? 'active' : ''}`} onClick={() => toggleItem('property_types', val)}>{label}</button>
                            ))}
                        </div>
                    </div>

                    {/* Budget */}
                    <div className="form-group">
                        <label className="form-label">Бюджет макс. (₽)</label>
                        <input type="number" className="form-input" value={form.budget_max || ''} onChange={e => setF('budget_max', Number(e.target.value))} placeholder="0" />
                    </div>

                    {/* Location */}
                    <div className="form-group">
                        <label className="form-label">Город</label>
                        <select className="form-select" value={form.city} onChange={e => { setF('city', e.target.value); setF('districts', []); }}>
                            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Районы</label>
                        <div className="chip-group">
                            {cityDistricts.map(d => (
                                <button key={d} type="button" className={`chip ${form.districts?.includes(d) ? 'active' : ''}`} onClick={() => toggleItem('districts', d)}>{d}</button>
                            ))}
                        </div>
                    </div>

                    {/* Params */}
                    <div className="form-group">
                        <label className="form-label">Кол-во комнат</label>
                        <div className="chip-group">
                            {[0, 1, 2, 3, 4].map(r => (
                                <button key={r} type="button" className={`chip ${form.rooms?.includes(r) ? 'active' : ''}`} onClick={() => toggleItem('rooms', r)}>{r === 0 ? 'Студия' : r}</button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">S от (м²)</label>
                            <input type="number" className="form-input" value={form.area_min || ''} onChange={e => setF('area_min', Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Комиссия (₽)</label>
                            <input type="number" className="form-input" value={form.commission || ''} onChange={e => setF('commission', Number(e.target.value))} />
                        </div>
                    </div>

                    <div className="form-group flex justify-between items-center bg-muted p-8 rounded">
                        <label className="form-label mb-0" style={{ cursor: 'pointer' }}>Нужна ипотека</label>
                        <input type="checkbox" checked={form.mortgage} onChange={e => setF('mortgage', e.target.checked)} style={{ transform: 'scale(1.2)' }} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Комментарии</label>
                        <textarea className="form-textarea" value={form.notes || ''} onChange={e => setF('notes', e.target.value)} placeholder="Дополнительные пожелания клиента..." />
                    </div>
                </div>

                <button type="submit" className="btn btn-primary btn-full shadow-lg">{id ? 'Сохранить изменения' : 'Создать запрос'}</button>
            </form>
        </div>
    );
}
