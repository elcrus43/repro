import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

const ADMIN_EMAIL = 'yelchugin@gmail.com';

export function LoginPage() {
    const { dispatch } = useApp();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [pendingMsg, setPendingMsg] = useState('');

    async function handleGoogleLogin() {
        setError('');
        try {
            const { error: err } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin }
            });
            if (err) setError(err.message);
        } catch (e) {
            setError('Ошибка инициализации Google Auth: ' + e.message);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        setPendingMsg('');
        const { data, error: err } = await supabase.auth.signInWithPassword({
            email: form.email,
            password: form.password,
        });
        if (err) { setError(err.message === 'Invalid login credentials' ? 'Неверный email или пароль' : err.message); setLoading(false); return; }

        const isAdmin = data.user.email === ADMIN_EMAIL;

        let { data: profile } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();

        if (!profile) {
            const newProfile = {
                id: data.user.id,
                full_name: data.user.user_metadata?.full_name || 'Пользователь',
                phone: data.user.user_metadata?.phone || '',
                agency_name: data.user.user_metadata?.agency_name || '',
                role: isAdmin ? 'admin' : 'realtor',
                status: isAdmin ? 'approved' : 'pending',
            };
            const { data: createdProfile, error: createErr } = await supabase.from('profiles').insert(newProfile).select().single();
            if (createErr) { setError('Ошибка при получении профиля: ' + createErr.message); setLoading(false); return; }
            profile = createdProfile;
        }

        // Ensure admin always has correct role/status
        if (isAdmin && (profile.role !== 'admin' || profile.status !== 'approved')) {
            await supabase.from('profiles').update({ role: 'admin', status: 'approved' }).eq('id', data.user.id);
            profile = { ...profile, role: 'admin', status: 'approved' };
        }

        // Block pending users
        if (profile.status === 'pending') {
            await supabase.auth.signOut();
            setPendingMsg('Ваш аккаунт ожидает подтверждения администратором. Мы сообщим вам, когда доступ будет открыт.');
            setLoading(false);
            return;
        }

        if (profile.status === 'rejected') {
            await supabase.auth.signOut();
            setError('В доступе к системе отказано. Обратитесь к администратору.');
            setLoading(false);
            return;
        }

        if (profile) {
            dispatch({ type: 'SET_USER', user: { ...profile, email: data.user.email } });
            const [clients, properties, requests, matches, showings, tasks] = await Promise.all([
                isAdmin
                    ? supabase.from('clients').select('*')
                    : supabase.from('clients').select('*').eq('realtor_id', data.user.id),
                supabase.from('properties').select('*'),  // All realtors see all properties
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
                <h1>REM</h1>
                <p>Умная недвижимость</p>
            </div>
            <div className="auth-card">
                <form onSubmit={handleSubmit}>
                    <h2>Вход</h2>
                    {error && <div style={{ color: 'var(--danger)', fontSize: 14, background: 'var(--danger-light)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginBottom: 12 }}>{error}</div>}
                    {pendingMsg && (
                        <div style={{ color: 'var(--warning, #b45309)', fontSize: 14, background: 'var(--warning-light, #fef3c7)', padding: '12px', borderRadius: 'var(--radius-sm)', marginBottom: 12, lineHeight: 1.5 }}>
                            ⏳ {pendingMsg}
                        </div>
                    )}
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

                <div className="auth-divider">
                    <span>или</span>
                </div>

                <button type="button" className="btn btn-outline btn-full" onClick={handleGoogleLogin} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                    <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" /><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" /><path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05" /><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962l3.007 2.332C4.672 5.164 6.656 3.58 9 3.58z" fill="#EA4335" /></svg>
                    Google
                </button>
            </div>
            <div className="auth-footer">
                Нет аккаунта? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 700 }}>Регистрация</Link>
            </div>
        </div>
    );
}

export function RegisterPage() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', agency_name: '' });
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleGoogleLogin() {
        setError('');
        try {
            const { error: err } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin }
            });
            if (err) setError(err.message);
        } catch (e) {
            setError('Ошибка инициализации Google Auth: ' + e.message);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMsg('');

        const { data, error: signUpErr } = await supabase.auth.signUp({
            email: form.email,
            password: form.password,
            options: {
                data: {
                    full_name: form.full_name,
                    phone: form.phone,
                    agency_name: form.agency_name
                }
            }
        });
        if (signUpErr) { setError(signUpErr.message); setLoading(false); return; }

        if (!data.session) {
            setSuccessMsg('Аккаунт создан! Пожалуйста, проверьте почту и подтвердите email. После этого администратор проверит и активирует ваш аккаунт.');
            setLoading(false);
            return;
        }

        const userId = data.user.id;
        const isAdmin = form.email === ADMIN_EMAIL;

        const profile = {
            id: userId,
            full_name: form.full_name,
            phone: form.phone,
            agency_name: form.agency_name,
            role: isAdmin ? 'admin' : 'realtor',
            status: isAdmin ? 'approved' : 'pending',
        };
        const { error: profileErr } = await supabase.from('profiles').insert(profile);
        if (profileErr) { setError('Ошибка создания профиля: ' + profileErr.message); setLoading(false); return; }

        if (!isAdmin) {
            // Sign out pending user — they need admin approval first
            await supabase.auth.signOut();
            setSuccessMsg('Аккаунт создан! Ваш запрос отправлен администратору. Вы сможете войти после подтверждения.');
            setLoading(false);
            return;
        }

        navigate('/');
    }

    return (
        <div className="auth-page">
            <div className="auth-logo">
                <h1>REM</h1>
                <p>Умная недвижимость</p>
            </div>
            <div className="auth-card">
                <h2>Регистрация</h2>
                {error && <div style={{ color: 'var(--danger)', fontSize: 14, background: 'var(--danger-light)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginBottom: 12 }}>{error}</div>}
                {successMsg && <div style={{ color: 'var(--primary)', fontSize: 14, background: 'var(--primary-light)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginBottom: 12 }}>{successMsg}</div>}

                {!successMsg ? (
                    <>
                        <form onSubmit={handleSubmit}>
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

                        <div className="auth-divider">
                            <span>или</span>
                        </div>

                        <button type="button" className="btn btn-outline btn-full" onClick={handleGoogleLogin} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                            <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4" /><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" /><path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05" /><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962l3.007 2.332C4.672 5.164 6.656 3.58 9 3.58z" fill="#EA4335" /></svg>
                            Google
                        </button>
                    </>
                ) : (
                    <Link to="/login" className="btn btn-primary btn-full" style={{ textAlign: 'center', display: 'block', textDecoration: 'none' }}>
                        Перейти ко входу
                    </Link>
                )}
            </div>
            <div className="auth-footer">
                Уже есть аккаунт? <Link to="/login" style={{ color: 'white', fontWeight: 600 }}>Войти</Link>
            </div>
        </div>
    );
}
