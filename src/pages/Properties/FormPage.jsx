import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { PROPERTY_TYPES } from '../../data/constants';
import { CITIES, KIROV_DISTRICTS } from '../../data/location';

export function FormPage() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const { toast } = useToastContext();

    const existing = id ? state.properties.find(p => p.id === id) : null;
    const initialForm = existing || {
        client_id: searchParams.get('client') || '',
        realtor_id: state.currentUser?.id,
        property_type: 'apartment',
        deal_type: 'sale',
        city: 'Киров',
        address: '',
        district: '',
        microdistrict: '',
        price: 0,
        price_min: 0,
        area_total: 0,
        area_living: 0,
        area_kitchen: 0,
        rooms: 1,
        floor: 1,
        floors_total: 9,
        build_year: new Date().getFullYear(),
        status: 'active',
        commission: 0,
        notes: ''
    };

    const [form, setForm] = useState(initialForm);

    const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));

    function handleSubmit(e) {
        e.preventDefault();
        if (!form.client_id) {
            toast.error('Выберите клиента');
            return;
        }

        if (id) {
            dispatch({ type: 'UPDATE_PROPERTY', property: { ...form, id } });
            navigate(`/properties/${id}`);
        } else {
            dispatch({ type: 'ADD_PROPERTY', property: { ...form, realtor_id: state.currentUser?.id } });
            navigate('/properties');
        }
    }

    return (
        <div className="page fade-in">
            <div className="topbar">
                <button className="topbar-back" onClick={() => navigate(-1)}>←</button>
                <span className="topbar-title">{id ? 'Редактировать' : 'Новый объект'}</span>
            </div>

            <form className="page-content" onSubmit={handleSubmit}>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Клиент */}
                    <div className="form-group">
                        <label className="form-label">Собственник <span className="required">*</span></label>
                        <select className="form-select" value={form.client_id} onChange={e => setF('client_id', e.target.value)} disabled={!!id} required>
                            <option value="">Выберите клиента</option>
                            {state.clients.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>)}
                        </select>
                    </div>

                    {/* Тип сделки */}
                    <div className="form-group">
                        <label className="form-label">Тип сделки</label>
                        <div className="chip-group" style={{ marginTop: 8 }}>
                            <button type="button" className={`chip ${form.deal_type === 'sale' ? 'active' : ''}`} onClick={() => setF('deal_type', 'sale')}>Продажа</button>
                            <button type="button" className={`chip ${form.deal_type === 'rent' ? 'active' : ''}`} onClick={() => setF('deal_type', 'rent')}>Аренда</button>
                        </div>
                    </div>

                    {/* Тип недвижимости */}
                    <div className="form-group">
                        <label className="form-label">Тип недвижимости</label>
                        <select className="form-select" value={form.property_type} onChange={e => setF('property_type', e.target.value)} style={{ marginTop: 8 }}>
                            {Object.entries(PROPERTY_TYPES).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                        </select>
                    </div>

                    {/* Цена */}
                    <div className="form-group">
                        <label className="form-label">Цена (₽)</label>
                        <input type="number" className="form-input" style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)' }} value={form.price || ''} onChange={e => setF('price', Number(e.target.value))} placeholder="0" />
                    </div>

                    {/* Город */}
                    <div className="form-group">
                        <label className="form-label">Город</label>
                        <select className="form-select" value={form.city} onChange={e => setF('city', e.target.value)}>
                            {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    {/* Район - только для Кирова */}
                    {form.city === 'Киров' && (
                        <div className="form-group">
                            <label className="form-label">Район</label>
                            <select className="form-select" value={form.district || ''} onChange={e => setF('district', e.target.value)}>
                                <option value="">— Выбрать район —</option>
                                {KIROV_DISTRICTS.map(d => (
                                    <option key={d.name} value={d.name}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Микрорайон - только для Кирова */}
                    {form.city === 'Киров' && form.district && (
                        <div className="form-group">
                            <label className="form-label">Микрорайон</label>
                            <select className="form-select" value={form.microdistrict || ''} onChange={e => setF('microdistrict', e.target.value)}>
                                <option value="">— Выбрать микрорайон —</option>
                                {KIROV_DISTRICTS
                                    .find(d => d.name === form.district)
                                    ?.microdistricts.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                            </select>
                        </div>
                    )}

                    {/* Адрес */}
                    <div className="form-group">
                        <label className="form-label">Адрес</label>
                        <textarea className="form-textarea" rows={2} value={form.address} onChange={e => setF('address', e.target.value)} placeholder="ул. Ленина, д. 1, кв. 10" />
                    </div>

                    {/* Площади */}
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

                    {/* Комнаты */}
                    <div className="form-group">
                        <label className="form-label">Комнат</label>
                        <div className="chip-group">
                            {[0, 1, 2, 3, 4, 5].map(r => (
                                <button key={r} type="button" className={`chip ${form.rooms === r ? 'active' : ''}`} onClick={() => setF('rooms', r)}>{r === 0 ? 'Студия' : r}</button>
                            ))}
                        </div>
                    </div>

                    {/* Этаж */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="form-group">
                            <label className="form-label">Этаж</label>
                            <input type="number" className="form-input" value={form.floor || ''} onChange={e => setF('floor', Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Всего этажей</label>
                            <input type="number" className="form-input" value={form.floors_total || ''} onChange={e => setF('floors_total', Number(e.target.value))} />
                        </div>
                    </div>

                    {/* Год постройки */}
                    <div className="form-group">
                        <label className="form-label">Год постройки</label>
                        <input type="number" className="form-input" value={form.build_year || ''} onChange={e => setF('build_year', Number(e.target.value))} placeholder={new Date().getFullYear().toString()} />
                    </div>

                    {/* Комиссия */}
                    <div className="form-group">
                        <label className="form-label">Ваша комиссия (₽)</label>
                        <input type="number" className="form-input" value={form.commission ?? ''} onChange={e => setF('commission', e.target.value === '' ? 0 : Number(e.target.value))} />
                    </div>

                    {/* Статус */}
                    <div className="form-group">
                        <label className="form-label">Статус объекта</label>
                        <select className="form-select" value={form.status} onChange={e => setF('status', e.target.value)}>
                            <option value="active">В продаже</option>
                            <option value="paused">Пауза / Думает</option>
                            <option value="deal_closed">Продано</option>
                            <option value="refused">Снято с продажи / Отказ</option>
                        </select>
                    </div>

                    {/* Заметки */}
                    <div className="form-group">
                        <label className="form-label">Описание</label>
                        <textarea className="form-textarea" rows={4} value={form.notes} onChange={e => setF('notes', e.target.value)} placeholder="Особенности объекта, ремонт, условия сделки..." />
                    </div>
                </div>

                <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 12 }}>
                    {id ? 'Сохранить изменения' : 'Разместить объект'}
                </button>
            </form>
        </div>
    );
}
