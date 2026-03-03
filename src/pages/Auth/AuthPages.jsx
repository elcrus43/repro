import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

export function LoginPage() {
    const { dispatch } = useApp();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        const { data, error: err } = await supabase.auth.signInWithPassword({
            email: form.email,
            password: form.password,
        });
        if (err) { setError(err.message === 'Invalid login credentials' ? 'Неверный email или пароль' : err.message); setLoading(false); return; }

        const { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
        if (profile) {
            dispatch({ type: 'SET_USER', user: { ...profile, email: data.user.email } });
            const [clients, properties, requests, matches, showings, tasks] = await Promise.all([
                supabase.from('clients').select('*').eq('realtor_id', data.user.id),
                supabase.from('properties').select('*').eq('realtor_id', data.user.id),
                supabase.from('requests').select('*').eq('realtor_id', data.user.id),
                supabase.from('matches').select('*').eq('realtor_id', data.user.id),
                supabase.from('showings').select('*').eq('realtor_id', data.user.id),
                supabase.from('tasks').select('*').eq('realtor_id', data.user.id),
            ]);
            dispatch({
                type: 'SET_ALL', data: {
                    clients: clients.data || [],
                    properties: properties.data || [],
                    requests: requests.data || [],
                    matches: matches.data || [],
                    showings: showings.data || [],
                    tasks: tasks.data || [],
                }
            });
        }
        navigate('/');
    }

    return (
        <div className="auth-page">
            <div className="auth-logo">
                <h1>re/pro</h1>
                <p>Умная недвижимость</p>
            </div>
            <form className="auth-card" onSubmit={handleSubmit}>
                <h2>Вход</h2>
                {error && <div style={{ color: 'var(--danger)', fontSize: 14, background: 'var(--danger-light)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>{error}</div>}
                <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={form.email} placeholder="anna@novydom.ru"
                        onChange={e => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="form-group">
                    <label className="form-label">Пароль</label>
                    <input className="form-input" type="password" value={form.password} placeholder="••••••••"
                        onChange={e => setForm({ ...form, password: e.target.value })} required />
                </div>
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                    {loading ? 'Входим...' : 'Войти'}
                </button>
            </form>
            <div className="auth-footer">
                Нет аккаунта? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700 }}>Регистрация</Link>
            </div>
        </div>
    );
}

export function RegisterPage() {
    const { dispatch } = useApp();
    const navigate = useNavigate();
    const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', agency_name: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');

        // 1. Create auth user
        const { data, error: signUpErr } = await supabase.auth.signUp({
            email: form.email,
            password: form.password,
        });
        if (signUpErr) { setError(signUpErr.message); setLoading(false); return; }

        const userId = data.user.id;

        // 2. Create profile
        const profile = {
            id: userId,
            full_name: form.full_name,
            phone: form.phone,
            agency_name: form.agency_name,
            role: 'realtor',
        };
        const { error: profileErr } = await supabase.from('profiles').insert(profile);
        if (profileErr) { setError('Ошибка создания профиля: ' + profileErr.message); setLoading(false); return; }

        dispatch({ type: 'SET_USER', user: { ...profile, email: form.email } });
        dispatch({ type: 'SET_ALL', data: { clients: [], properties: [], requests: [], matches: [], showings: [], tasks: [] } });
        navigate('/');
    }

    return (
        <div className="auth-page">
            <div className="auth-logo">
                <h1>re/pro</h1>
                <p>Умная недвижимость</p>
            </div>
            <form className="auth-card" onSubmit={handleSubmit}>
                <h2>Регистрация</h2>
                {error && <div style={{ color: 'var(--danger)', fontSize: 14, background: 'var(--danger-light)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>{error}</div>}
                {[
                    { label: 'ФИО', key: 'full_name', placeholder: 'Иванова Анна Петровна', required: true },
                    { label: 'Email', key: 'email', type: 'email', placeholder: 'anna@mail.ru', required: true },
                    { label: 'Телефон', key: 'phone', placeholder: '+7-999-000-0000', required: true },
                    { label: 'Пароль', key: 'password', type: 'password', placeholder: '••••••••', required: true },
                    { label: 'Название агентства', key: 'agency_name', placeholder: 'АН «Мой Дом»' },
                ].map(f => (
                    <div key={f.key} className="form-group">
                        <label className="form-label">{f.label}{f.required && <span className="required">*</span>}</label>
                        <input
                            className="form-input" type={f.type || 'text'} placeholder={f.placeholder}
                            value={form[f.key]} required={f.required}
                            onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                        />
                    </div>
                ))}
                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                    {loading ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
                </button>
            </form>
            <div className="auth-footer">
                Уже есть аккаунт? <Link to="/login" style={{ color: 'white', fontWeight: 600 }}>Войти</Link>
            </div>
        </div>
    );
}
