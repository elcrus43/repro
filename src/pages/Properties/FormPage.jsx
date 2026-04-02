import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { PROPERTY_TYPES } from '../../data/constants';
import { CITIES as CITY_LIST } from '../../data/location';

function PropertyStepDots({ steps, current, onJump }) {
    return (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 20 }}>
            {steps.map((_, i) => (
                <div
                    key={i}
                    onClick={() => onJump(i)}
                    style={{
                        width: i === current ? 24 : 8,
                        height: 8,
                        borderRadius: 10,
                        background: i === current ? 'var(--primary)' : 'var(--border)',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer'
                    }}
                />
            ))}
        </div>
    );
}

export function FormPage() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const { state, dispatch } = useApp();
    const navigate = useNavigate();

    const existing = id ? state.properties.find(p => p.id === id) : null;
    const initialForm = existing || {
        client_id: searchParams.get('client') || '',
        realtor_id: state.currentUser?.id,
        property_type: 'apartment',
        deal_type: 'sale',
        city: 'Краснодар',
        address: '',
        price: 0,
        area_total: 0,
        area_living: 0,
        area_kitchen: 0,
        rooms: 1,
        floor: 1,
        floor_total: 9,
        build_year: new Date().getFullYear(),
        status: 'active',
        commission: 0,
        notes: ''
    };

    const [form, setForm] = useState(initialForm);
    const [step, setStep] = useState(0);

    const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));

    function handleSubmit(e) {
        e.preventDefault();
        if (!form.client_id) return (alert('Выберите клиента'), setStep(0));

        if (id) {
            dispatch({ type: 'UPDATE_PROPERTY', property: { ...form, id } });
            navigate(`/properties/${id}`);
        } else {
            dispatch({ type: 'ADD_PROPERTY', property: { ...form, realtor_id: state.currentUser?.id } });
            navigate('/properties');
        }
    }

    const steps = [
        { title: 'Основные', labels: ['Клиент', 'Тип', 'Цена'] },
        { title: 'Локация', labels: ['Город', 'Адрес'] },
        { title: 'Параметры', labels: ['Площадь', 'Комнаты', 'Этаж'] },
        { title: 'Дополнительно', labels: ['Комиссия', 'Заметки'] }
    ];

    return (
        <div className="page fade-in">
            <div className="topbar">
                <button className="topbar-back" onClick={() => navigate(-1)}>←</button>
                <span className="topbar-title">{id ? 'Редактировать' : 'Новый объект'}</span>
            </div>

            <form className="page-content" onSubmit={handleSubmit}>
                <PropertyStepDots steps={steps} current={step} onJump={setStep} />

                <div className="card" style={{ display: 'block' }}>
                    {step === 0 && (
                        <>
                            <div className="form-group" style={{ marginBottom: 16, display: 'block' }}>
                                <label className="form-label">Собственник <span className="required">*</span></label>
                                <select className="form-select" value={form.client_id} onChange={e => setF('client_id', e.target.value)} disabled={!!id} required>
                                    <option value="">Выберите клиента</option>
                                    {state.clients.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>)}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 16, display: 'block' }}>
                                <label className="form-label">Тип сделки</label>
                                <div className="chip-group" style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                    <button type="button" className={`chip ${form.deal_type === 'sale' ? 'active' : ''}`} onClick={() => setF('deal_type', 'sale')}>Продажа</button>
                                    <button type="button" className={`chip ${form.deal_type === 'rent' ? 'active' : ''}`} onClick={() => setF('deal_type', 'rent')}>Аренда</button>
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: 16, display: 'block' }}>
                                <label className="form-label">Тип недвижимости</label>
                                <select className="form-select" value={form.property_type} onChange={e => setF('property_type', e.target.value)} style={{ marginTop: 8 }}>
                                    {Object.entries(PROPERTY_TYPES).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                                </select>
                            </div>
                            <div className="form-group" style={{ marginBottom: 0, display: 'block' }}>
                                <label className="form-label">Цена (₽)</label>
                                <input type="number" className="form-input" style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)', marginTop: 8 }} value={form.price || ''} onChange={e => setF('price', Number(e.target.value))} placeholder="0" />
                            </div>
                        </>
                    )}

                    {step === 1 && (
                        <>
                            <div className="form-group">
                                <label className="form-label">Город</label>
                                <select className="form-select" value={form.city} onChange={e => setF('city', e.target.value)}>
                                    {CITY_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Адрес</label>
                                <textarea className="form-textarea" rows={2} value={form.address} onChange={e => setF('address', e.target.value)} placeholder="ул. Ленина, д. 1, кв. 10" />
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Общая m²</label>
                                    <input type="number" className="form-input" value={form.area_total || ''} onChange={e => setF('area_total', Number(e.target.value))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Жилая</label>
                                    <input type="number" className="form-input" value={form.area_living || ''} onChange={e => setF('area_living', Number(e.target.value))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Кухня</label>
                                    <input type="number" className="form-input" value={form.area_kitchen || ''} onChange={e => setF('area_kitchen', Number(e.target.value))} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Комнат</label>
                                <div className="chip-group">
                                    {[0, 1, 2, 3, 4, 5].map(r => (
                                        <button key={r} type="button" className={`chip ${form.rooms === r ? 'active' : ''}`} onClick={() => setF('rooms', r)}>{r === 0 ? 'Студия' : r}</button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="form-group">
                                    <label className="form-label">Этаж</label>
                                    <input type="number" className="form-input" value={form.floor || ''} onChange={e => setF('floor', Number(e.target.value))} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Всего этажей</label>
                                    <input type="number" className="form-input" value={form.floor_total || ''} onChange={e => setF('floor_total', Number(e.target.value))} />
                                </div>
                            </div>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <div className="form-group">
                                <label className="form-label">Ваша комиссия (₽)</label>
                                <input type="number" className="form-input" value={form.commission || ''} onChange={e => setF('commission', Number(e.target.value))} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Статус объекта</label>
                                <select className="form-select" value={form.status} onChange={e => setF('status', e.target.value)}>
                                    <option value="active">В продаже</option>
                                    <option value="paused">Пауза / Думает</option>
                                    <option value="deal_closed">Продано</option>
                                    <option value="refused">Снято с продажи / Отказ</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Описание</label>
                                <textarea className="form-textarea" rows={4} value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Особенности объекта, ремонт, условия сделки..." />
                            </div>
                        </>
                    )}
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                    {step > 0 && <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setStep(step - 1)}>Назад</button>}
                    {step < steps.length - 1 ? (
                        <button type="button" className="btn btn-primary" style={{ flex: 2 }} onClick={() => setStep(step + 1)}>Далее</button>
                    ) : (
                        <button type="submit" className="btn btn-primary shadow-lg" style={{ flex: 2 }}>{id ? 'Сохранить изменения' : 'Разместить объект'}</button>
                    )
                    }
                </div>
            </form>
        </div>
    );
}
