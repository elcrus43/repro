import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Calendar, Clock, User, Home, Save } from 'lucide-react';

export function ShowFormPage() {
    const { state, dispatch } = useApp();
    const navigate = useNavigate();
    const params = new URLSearchParams(window.location.search);
    const prePropId = params.get('propertyId');
    const preClientId = params.get('clientId');

    const [form, setForm] = useState({
        property_id: prePropId || '',
        client_id: preClientId || '',
        showing_date: new Date().toISOString().slice(0, 16), // datetime-local format
        status: 'planned',
        client_feedback: '',
        feedback_comment: '',
        realtor_id: state.currentUser?.id
    });

    const myClients = state.clients.filter(c => c.realtor_id === state.currentUser?.id);
    const allProperties = state.properties; // Realtors see all properties

    function handleSubmit(e) {
        e.preventDefault();
        if (!form.property_id || !form.client_id || !form.showing_date) {
            alert('Пожалуйста, выберите объект, клиента и дату/время');
            return;
        }

        const showing = {
            ...form,
            showing_date: new Date(form.showing_date).toISOString()
        };

        dispatch({ type: 'ADD_SHOWING', showing });
        navigate('/showings');
    }

    return (
        <div className="page fade-in">
            <div className="topbar">
                <button className="topbar-back" onClick={() => navigate(-1)}>←</button>
                <span className="topbar-title">Новый показ</span>
            </div>
            <div className="page-content">
                <form onSubmit={handleSubmit} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="form-group">
                        <label className="form-label"><Home size={14} style={{ marginRight: 4 }} /> Объект <span className="required">*</span></label>
                        <select className="form-select" value={form.property_id} onChange={e => setForm({ ...form, property_id: e.target.value })} required>
                            <option value="">— Выбрать объект —</option>
                            {allProperties.map(p => (
                                <option key={p.id} value={p.id}>{p.address} ({p.price.toLocaleString()} ₽)</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label"><User size={14} style={{ marginRight: 4 }} /> Клиент <span className="required">*</span></label>
                        <select className="form-select" value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} required>
                            <option value="">— Выбрать клиента —</option>
                            {myClients.map(c => (
                                <option key={c.id} value={c.id}>{c.full_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label"><Calendar size={14} style={{ marginRight: 4 }} /> Дата и время <span className="required">*</span></label>
                        <input className="form-input" type="datetime-local" value={form.showing_date} onChange={e => setForm({ ...form, showing_date: e.target.value })} required />
                    </div>

                    <button type="submit" className="btn btn-primary btn-full" style={{ marginTop: 8 }}>
                        <Save size={18} /> Запланировать показ
                    </button>
                </form>
            </div>
        </div>
    );
}
