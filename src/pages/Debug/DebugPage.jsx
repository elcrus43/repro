import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * /debug — диагностическая страница для выявления проблем с данными.
 * Доступна без авторизации. Открыть: https://your-app.vercel.app/#/debug
 */
export default function DebugPage() {
    const [log, setLog] = useState([]);
    const [running, setRunning] = useState(false);
    const logRef = useRef([]);

    function addLog(type, msg, detail = '') {
        const entry = { type, msg, detail, ts: new Date().toLocaleTimeString() };
        logRef.current = [...logRef.current, entry];
        setLog([...logRef.current]);
    }

    async function runDiagnostic() {
        logRef.current = [];
        setLog([]);
        setRunning(true);
        addLog('info', '=== ДИАГНОСТИКА ЗАПУЩЕНА ===');

        // 0. Env переменные
        addLog('info', '0. Переменные окружения...');
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '(не задан — используется хардкод)';
        const hasAnonKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY;
        const backend = import.meta.env.VITE_BACKEND || '(не задан)';
        addLog('ok', `VITE_BACKEND: ${backend}`);
        addLog('ok', `VITE_SUPABASE_URL: ${supabaseUrl}`);
        addLog(hasAnonKey ? 'ok' : 'warn', `VITE_SUPABASE_ANON_KEY: ${hasAnonKey ? 'задан ✓' : 'НЕ ЗАДАН ✗'}`);
        addLog('ok', `User Agent: ${navigator.userAgent}`);
        addLog('ok', `Location: ${window.location.href}`);

        // 0b. Проверяем что Supabase клиент инициализирован
        try {
            const supabaseClientUrl = supabase.supabaseUrl;
            addLog('ok', `Supabase клиент URL: ${supabaseClientUrl}`);
        } catch(e) {
            addLog('warn', 'Не удалось получить supabase.supabaseUrl', e.message);
        }

        // 1. Сетевой ping
        addLog('info', '1. Сетевой тест (ping Supabase)...');
        try {
            const t0 = Date.now();
            const res = await fetch('https://hxivaohzugahjyuaahxc.supabase.co/rest/v1/', {
                method: 'GET',
                headers: { 'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4aXZhb2h6dWdhaGp5dWFhaHhjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MTcyODEsImV4cCI6MjA4ODA5MzI4MX0.lCMlJwssUfSMzg3JRrzPSlf0P7SqL6URqAo8nGfbEOY' }
            });
            addLog('ok', `Supabase REST достижим: HTTP ${res.status} (${Date.now()-t0}ms)`);
        } catch(e) {
            addLog('error', 'Supabase REST НЕ достижим!', e.message);
        }

        // 2. Сессия
        addLog('info', '2. Получаем сессию Supabase Auth...');
        let session = null;
        try {
            const { data, error: sessErr } = await supabase.auth.getSession();
            session = data?.session;
            if (sessErr) {
                addLog('error', 'Ошибка getSession()', sessErr.message);
            } else if (!session) {
                addLog('warn', 'Сессия: НЕ НАЙДЕНА → пользователь не авторизован или куки/localStorage очищены');
            } else {
                const exp = new Date(session.expires_at * 1000).toLocaleString();
                addLog('ok', `Сессия найдена`, `User ID: ${session.user.id}\nEmail: ${session.user.email}\nИстекает: ${exp}`);
            }
        } catch(e) {
            addLog('error', 'getSession() вылетел с исключением', e.message);
        }

        if (!session) {
            // Попытка refreshSession
            addLog('info', '2b. Пробуем refreshSession...');
            try {
                const { data, error } = await supabase.auth.refreshSession();
                if (error) addLog('error', 'refreshSession: ошибка', error.message);
                else if (data?.session) {
                    session = data.session;
                    addLog('ok', 'refreshSession: успешно!', `User: ${session.user?.email}`);
                } else {
                    addLog('warn', 'refreshSession: сессия не получена');
                }
            } catch(e) {
                addLog('error', 'refreshSession() вылетел', e.message);
            }
        }

        // 3. localStorage
        addLog('info', '3. localStorage...');
        try {
            const keys = Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('rm_') || k.includes('sb-'));
            addLog('ok', `localStorage ключи (${keys.length}): ${keys.join(', ') || '(нет supabase-ключей)'}`);
            // Проверяем наличие сессионных данных
            const sbKey = keys.find(k => k.includes('auth-token') || k.startsWith('sb-'));
            if (sbKey) {
                const raw = localStorage.getItem(sbKey);
                try {
                    const parsed = JSON.parse(raw);
                    addLog('ok', `Supabase session в localStorage`, `expires_at: ${parsed?.expires_at || parsed?.currentSession?.expires_at || '?'}\naccess_token: ${(parsed?.access_token || parsed?.currentSession?.access_token || '?').slice(0,20)}...`);
                } catch(_) {
                    addLog('warn', 'Не удалось распарсить суpabase-токен из localStorage');
                }
            } else {
                addLog('warn', 'Supabase session token НЕ найден в localStorage! Это причина проблемы.');
            }
        } catch(e) {
            addLog('error', 'localStorage недоступен', e.message);
        }

        if (session) {
            const userId = session.user.id;

            // 4. Профиль
            addLog('info', '4. Запрос профиля...');
            try {
                const { data: profile, error: pErr } = await supabase
                    .from('profiles').select('*').eq('id', userId).single();
                if (pErr) addLog('error', 'Профиль: ошибка', `code: ${pErr.code}\n${pErr.message}`);
                else addLog('ok', `Профиль: ${profile?.full_name}`, `role: ${profile?.role}, status: ${profile?.status}`);
            } catch(e) {
                addLog('error', 'Запрос профиля вылетел', e.message);
            }

            // 5. Properties
            addLog('info', '5. Properties (без фильтра)...');
            try {
                const { data: allProps, error: ap } = await supabase
                    .from('properties').select('id, realtor_id').limit(3);
                if (ap) addLog('error', 'Properties: ошибка', `code: ${ap.code}\n${ap.message}`);
                else addLog('ok', `Properties (all): ${allProps?.length ?? 0} строк`, allProps?.map(p => `realtor_id: ${p.realtor_id?.slice(0,8)}...`).join('\n') || '—');
            } catch(e) {
                addLog('error', 'Properties запрос вылетел', e.message);
            }

            // 6. Properties с фильтром
            addLog('info', '6. Properties (мои)...');
            try {
                const { data: myProps, error: mp } = await supabase
                    .from('properties').select('id').eq('realtor_id', userId);
                if (mp) addLog('error', 'Properties (mine): ошибка', mp.message);
                else addLog(myProps?.length > 0 ? 'ok' : 'warn', `Properties (mine): ${myProps?.length ?? 0} строк`);
            } catch(e) {
                addLog('error', 'Properties (mine) вылетел', e.message);
            }

            // 7. Clients
            addLog('info', '7. Clients (мои)...');
            try {
                const { data: myClients, error: mc } = await supabase
                    .from('clients').select('id, full_name').eq('realtor_id', userId);
                if (mc) addLog('error', 'Clients: ошибка', mc.message);
                else addLog(myClients?.length > 0 ? 'ok' : 'warn', `Clients: ${myClients?.length ?? 0} строк`,
                    myClients?.slice(0,3).map(c => c.full_name).join(', ') || '—');
            } catch(e) {
                addLog('error', 'Clients вылетел', e.message);
            }
        }

        addLog('info', '=== ДИАГНОСТИКА ЗАВЕРШЕНА ===');
        setRunning(false);
    }

    useEffect(() => { runDiagnostic(); }, []);

    const colors = { ok: '#10b981', error: '#ef4444', warn: '#f59e0b', info: '#6b7280' };

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'monospace', padding: 16 }}>
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#38bdf8', marginBottom: 8 }}>
                    🔍 Mobile Debug v2
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>
                    Откройте эту страницу на мобиле: <strong style={{color:'#94a3b8'}}>/#/debug</strong>
                </div>
                <button
                    onClick={runDiagnostic}
                    disabled={running}
                    style={{
                        background: '#0052ff', color: 'white', border: 'none',
                        borderRadius: 8, padding: '12px 20px', fontSize: 14,
                        cursor: running ? 'wait' : 'pointer', marginBottom: 16, width: '100%',
                        fontWeight: 600
                    }}
                >
                    {running ? '⏳ Проверяем...' : '▶ Запустить диагностику'}
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {log.map((entry, i) => (
                        <div key={i} style={{
                            background: '#1e293b', borderRadius: 8, padding: '8px 12px',
                            borderLeft: `3px solid ${colors[entry.type] || '#475569'}`
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span style={{ color: colors[entry.type], fontSize: 13, fontWeight: 600, wordBreak: 'break-word' }}>
                                    {entry.type === 'ok' ? '✓' : entry.type === 'error' ? '✗' : entry.type === 'warn' ? '⚠' : '·'} {entry.msg}
                                </span>
                                <span style={{ color: '#475569', fontSize: 11, marginLeft: 8, flexShrink: 0 }}>{entry.ts}</span>
                            </div>
                            {entry.detail && (
                                <pre style={{ margin: '4px 0 0', fontSize: 11, color: '#94a3b8', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                    {entry.detail}
                                </pre>
                            )}
                        </div>
                    ))}
                </div>

                {log.length > 0 && !running && (
                    <button
                        onClick={() => {
                            const text = log.map(e => `[${e.ts}] ${e.type.toUpperCase()}: ${e.msg}${e.detail ? '\n  ' + e.detail : ''}`).join('\n');
                            navigator.clipboard?.writeText(text).then(() => alert('Скопировано!')).catch(() => {});
                        }}
                        style={{
                            marginTop: 12, width: '100%', padding: '10px', borderRadius: 8,
                            background: '#1e293b', border: '1px solid #334155', color: '#94a3b8',
                            fontSize: 13, cursor: 'pointer'
                        }}
                    >
                        📋 Скопировать лог
                    </button>
                )}
            </div>
        </div>
    );
}
