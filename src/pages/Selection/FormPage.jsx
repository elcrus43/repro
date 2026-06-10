import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useToastContext } from '../../components/Toast';
import { AddressAutocomplete } from '../../components/AddressAutocomplete';
import { ChevronLeft, MapPin, DollarSign, User, Phone, FileText, Check } from 'lucide-react';

export function FormPage() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const { toast } = useToastContext();

    const existing = id ? state.selectionItems?.find(i => i.id === id) : null;
    const initialForm = existing ? {
        ...existing
    } : {
        client_id: searchParams.get('client') || '',
        address: '',
        price: 0,
        contact_name: '',
        contact_phone: '',
        notes: ''
    };

    const [form, setForm] = useState(initialForm);

    useEffect(() => {
        if (existing && !form.id) {
            setForm({ ...existing });
        }
    }, [existing, form.id]);

    useEffect(() => {
        const importData = searchParams.get('import');
        if (importData) {
            try {
                // Decode base64 securely supporting unicode
                const decodedJson = atob(importData);
                const data = JSON.parse(decodeURIComponent(escape(decodedJson)));
                
                setForm(f => ({
                    ...f,
                    address: data.address || data.title || '',
                    price: data.price ? Number(data.price) : 0,
                    notes: data.description || '',
                }));
                toast.success('Данные успешно импортированы! Проверьте и сохраните.');
            } catch (err) {
                console.error('Failed to parse import data:', err);
                toast.error('Не удалось разобрать данные импорта');
            }
        }
    }, [searchParams, toast]);

    const setF = (key, val) => setForm(f => ({ ...f, [key]: val }));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.client_id) {
            toast.error('Выберите клиента');
            return;
        }
        if (!form.address) {
            toast.error('Укажите адрес объекта');
            return;
        }

        if (id) {
            dispatch({ type: 'UPDATE_SELECTION_ITEM', item: form });
            toast.success('Подбор обновлен');
        } else {
            dispatch({ type: 'ADD_SELECTION_ITEM', item: form });
            toast.success('Объект добавлен в подбор');
        }
        navigate(-1);
    };

    return (
        <div className="page" style={{ 
            background: 'var(--bg-light)', 
            fontFamily: "'Oswald', sans-serif" 
        }}>
            <div style={{
                position: 'sticky', top: 0, zIndex: 100,
                background: 'var(--topbar-bg)', backdropFilter: 'blur(20px) saturate(180%)',
                padding: '20px 24px', borderBottom: '1px solid var(--topbar-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: '0 4px 12px rgba(0,0,0,0.02)'
            }}>
                <button onClick={() => navigate(-1)} className="card-clickable" style={{
                    width: 44, height: 44, borderRadius: 14, border: 'none',
                    background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    color: 'var(--text)'
                }}>
                    <ChevronLeft size={22} />
                </button>
                <div className="font-oswald" style={{ fontWeight: 300, fontSize: 17, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    {id ? 'Редактирование подбора' : 'Новый подбор'}
                </div>
                <div style={{ width: 44 }}></div>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: '20px', maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Выбор клиента */}
                <div className="card fade-in" style={{ 
                    padding: '24px', borderRadius: 24, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.8)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.03)'
                }}>
                    <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <User size={20} color="var(--primary)" />
                        <div className="font-oswald" style={{ fontSize: 14, fontWeight: 300, textTransform: 'uppercase' }}>Клиент</div>
                    </div>
                    <select
                        className="form-select"
                        value={form.client_id}
                        onChange={e => setF('client_id', e.target.value)}
                        style={{ borderRadius: 14 }}
                        required
                    >
                        <option value="">— Выберите клиента —</option>
                        {state.clients.map(c => (
                            <option key={c.id} value={c.id}>{c.full_name}</option>
                        ))}
                    </select>
                </div>

                {/* Основные данные объекта */}
                <div className="card fade-in" style={{ 
                    padding: '24px', borderRadius: 24, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.8)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: 16
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <MapPin size={20} color="var(--primary)" />
                        <div className="font-oswald" style={{ fontSize: 14, fontWeight: 300, textTransform: 'uppercase' }}>Объект</div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 300, fontSize: 13 }}>Адрес</label>
                        <AddressAutocomplete
                            value={form.address}
                            onChange={val => setF('address', val)}
                            placeholder="Введите адрес объекта..."
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 300, fontSize: 13 }}>Цена (₽)</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                className="form-input"
                                style={{ paddingLeft: 36, fontSize: 16, fontWeight: 500, borderRadius: 14 }}
                                value={form.price ? form.price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''}
                                onChange={e => setF('price', Number(e.target.value.replace(/\D/g, '')))}
                                placeholder="0"
                            />
                            <DollarSign size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: 15 }} />
                        </div>
                    </div>
                </div>

                {/* Контактное лицо */}
                <div className="card fade-in" style={{ 
                    padding: '24px', borderRadius: 24, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.8)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: 16
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Phone size={20} color="var(--primary)" />
                        <div className="font-oswald" style={{ fontSize: 14, fontWeight: 300, textTransform: 'uppercase' }}>Контакты</div>
                    </div>

                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 300, fontSize: 13 }}>Контактное лицо</label>
                        <input
                            type="text"
                            className="form-input"
                            style={{ borderRadius: 14 }}
                            value={form.contact_name}
                            onChange={e => setF('contact_name', e.target.value)}
                            placeholder="ФИО собственника или агента"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" style={{ fontWeight: 300, fontSize: 13 }}>Телефон</label>
                        <input
                            type="text"
                            className="form-input"
                            style={{ borderRadius: 14 }}
                            value={form.contact_phone}
                            onChange={e => setF('contact_phone', e.target.value)}
                            placeholder="Номер телефона"
                        />
                    </div>
                </div>

                {/* Заметки */}
                <div className="card fade-in" style={{ 
                    padding: '24px', borderRadius: 24, background: 'var(--surface)', border: '1px solid rgba(255,255,255,0.8)',
                    boxShadow: '0 8px 30px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column', gap: 16
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <FileText size={20} color="var(--primary)" />
                        <div className="font-oswald" style={{ fontSize: 14, fontWeight: 300, textTransform: 'uppercase' }}>Описание / Заметки</div>
                    </div>

                    <textarea
                        className="form-input"
                        style={{ height: 120, resize: 'none', borderRadius: 14, padding: '12px' }}
                        value={form.notes}
                        onChange={e => setF('notes', e.target.value)}
                        placeholder="Опишите подробности объекта..."
                    />
                </div>

                {/* Кнопка отправки */}
                <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ 
                        height: 52, borderRadius: 16, fontSize: 15, fontWeight: 300, letterSpacing: '0.05em',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: '0 8px 24px rgba(0, 82, 255, 0.25)', marginTop: 8
                    }}
                >
                    <Check size={18} strokeWidth={3} /> {id ? 'Сохранить изменения' : 'Добавить в подбор'}
                </button>
            </form>
        </div>
    );
}
