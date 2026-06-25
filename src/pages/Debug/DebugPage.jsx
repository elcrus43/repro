import React, { useState, useEffect, useRef } from 'react';
import { neonDb } from '../../lib/neon';
import { authService } from '../../lib/auth';

/**
 * /debug — диагностическая страница для выявления проблем с данными на базе Neon PostgreSQL.
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
        addLog('info', '=== ДИАГНОСТИКА NEON ЗАПУЩЕНА ===');

        // 0. Env переменные
        addLog('info', '0. Переменные окружения...');
        const backend = import.meta.env.VITE_BACKEND || 'neon';
        addLog('ok', `VITE_BACKEND: ${backend}`);
        addLog('ok', `User Agent: ${navigator.userAgent}`);
        addLog('ok', `Location: ${window.location.href}`);

        // 1. Сетевой ping к API
        addLog('info', '1. Сетевой тест (ping API-прокси)...');
        try {
            const t0 = Date.now();
            const res = await fetch('/api/neon-query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: 'SELECT 1' })
            });
            addLog('ok', `/api/neon-query достижим: HTTP ${res.status} (${Date.now()-t0}ms)`);
        } catch(e) {
            addLog('error', '/api/neon-query НЕ достижим!', e.message);
        }

        // 2. Сессия
        addLog('info', '2. Получаем сессию через authService...');
        let session = null;
        try {
            const { data, error: sessErr } = await authService.getSession();
            session = data?.session;
            if (sessErr) {
                addLog('error', 'Ошибка getSession()', sessErr.message);
            } else if (!session) {
                addLog('warn', 'Сессия: НЕ НАЙДЕНА → пользователь не авторизован или сессия очищена');
            } else {
                addLog('ok', `Сессия найдена`, `User ID: ${session.user.id}\nEmail: ${session.user.email}`);
            }
        } catch(e) {
            addLog('error', 'getSession() вылетел с исключением', e.message);
        }

        // 3. localStorage
        addLog('info', '3. localStorage...');
        try {
            const keys = Object.keys(localStorage).filter(k => k.includes('neon') || k.includes('repro_') || k.includes('sb-'));
            addLog('ok', `localStorage ключи (${keys.length}): ${keys.join(', ') || '(нет ключей)'}`);
            const neonKey = 'neon_session';
            const raw = localStorage.getItem(neonKey);
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    addLog('ok', `Neon session в localStorage`, `expires_at: ${parsed?.expires_at || '?'}\naccess_token: ${(parsed?.access_token || '?').slice(0,20)}...`);
                } catch(_) {
                    addLog('warn', 'Не удалось распарсить neon-session из localStorage');
                }
            } else {
                addLog('warn', 'neon_session НЕ найден в localStorage! Пользователь не вошёл.');
            }
        } catch(e) {
            addLog('error', 'localStorage недоступен', e.message);
        }

        if (session) {
            const userId = session.user.id;

            // 4. Профиль
            addLog('info', '4. Запрос профиля...');
            try {
                const { data: profiles, error: pErr } = await neonDb.select('profiles', { id: userId });
                if (pErr) addLog('error', 'Профиль: ошибка', `code: ${pErr.code}\n${pErr.message}`);
                else if (!profiles || profiles.length === 0) addLog('warn', 'Профиль: не найден в БД');
                else addLog('ok', `Профиль: ${profiles[0]?.full_name}`, `role: ${profiles[0]?.role}, status: ${profiles[0]?.status}`);
            } catch(e) {
                addLog('error', 'Запрос профиля вылетел', e.message);
            }

            // 5. Properties
            addLog('info', '5. Properties (мои)...');
            try {
                const { data: myProps, error: mp } = await neonDb.select('properties', { realtor_id: userId });
                if (mp) addLog('error', 'Properties (mine): ошибка', mp.message);
                else addLog(myProps?.length > 0 ? 'ok' : 'warn', `Properties (mine): ${myProps?.length ?? 0} строк`);
            } catch(e) {
                addLog('error', 'Properties (mine) вылетел', e.message);
            }

            // 6. Clients
            addLog('info', '6. Clients (мои)...');
            try {
                const { data: myClients, error: mc } = await neonDb.select('clients', { realtor_id: userId });
                if (mc) addLog('error', 'Clients: ошибка', mc.message);
                else addLog(myClients?.length > 0 ? 'ok' : 'warn', `Clients: ${myClients?.length ?? 0} строк`,
                    myClients?.slice(0,3).map(c => c.full_name).join(', ') || '—');
            } catch(e) {
                addLog('error', 'Clients вылетел', e.message);
            }
        }

        addLog('info', '=== ДИАГНОСТИКА NEON ЗАВЕРШЕНА ===');
        setRunning(false);
    }

    useEffect(() => { runDiagnostic(); }, []);

    const colors = { ok: '#10b981', error: '#ef4444', warn: '#f59e0b', info: '#6b7280' };

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'monospace', padding: 16 }}>
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#38bdf8', marginBottom: 8 }}>
                    🔍 Neon Debug
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>
                    Диагностика подключения к базе Neon и API-серверу
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
