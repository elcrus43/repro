import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

/**
 * /debug — диагностическая страница для выявления проблем с данными.
 * Показывает: сессию, userId, результаты прямых запросов.
 */
export default function DebugPage() {
    const [log, setLog] = useState([]);
    const [running, setRunning] = useState(false);

    function addLog(type, msg, detail = '') {
        setLog(prev => [...prev, { type, msg, detail, ts: new Date().toLocaleTimeString() }]);
    }

    async function runDiagnostic() {
        setLog([]);
        setRunning(true);
        addLog('info', '=== ДИАГНОСТИКА ЗАПУЩЕНА ===');

        // 1. Сессия
        addLog('info', '1. Получаем сессию...');
        const { data: { session }, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) {
            addLog('error', 'Ошибка getSession()', sessErr.message);
        } else if (!session) {
            addLog('warn', 'Сессия: НЕ НАЙДЕНА. Вы не авторизованы.');
        } else {
            addLog('ok', `Сессия найдена`, `User ID: ${session.user.id}\nEmail: ${session.user.email}`);
            const userId = session.user.id;

            // 2. Профиль
            addLog('info', '2. Запрос профиля...');
            const { data: profile, error: pErr } = await supabase
                .from('profiles').select('*').eq('id', userId).single();
            if (pErr) addLog('error', 'Профиль: ошибка', pErr.message);
            else addLog('ok', `Профиль: ${profile?.full_name}`, `role: ${profile?.role}, status: ${profile?.status}`);

            // 3. Properties без фильтра
            addLog('info', '3. Properties (без фильтра realtor_id)...');
            const { data: allProps, error: ap } = await supabase.from('properties').select('id, realtor_id, address').limit(5);
            if (ap) addLog('error', 'Properties (all): ошибка', ap.message);
            else addLog('ok', `Properties (all): ${allProps?.length ?? 0} строк`, allProps?.map(p => `${p.id.slice(0,8)}... → realtor_id: ${p.realtor_id?.slice(0,8)}...`).join('\n') || '—');

            // 4. Properties с фильтром
            addLog('info', '4. Properties с фильтром realtor_id...');
            const { data: myProps, error: mp } = await supabase.from('properties').select('id, address').eq('realtor_id', userId);
            if (mp) addLog('error', 'Properties (mine): ошибка', mp.message);
            else addLog('ok', `Properties (mine): ${myProps?.length ?? 0} строк`);

            // 5. Clients с фильтром
            addLog('info', '5. Clients с фильтром realtor_id...');
            const { data: myClients, error: mc } = await supabase.from('clients').select('id, full_name').eq('realtor_id', userId);
            if (mc) addLog('error', 'Clients (mine): ошибка', mc.message);
            else addLog('ok', `Clients (mine): ${myClients?.length ?? 0} строк`, myClients?.map(c => c.full_name).join(', ') || '—');

            // 6. Comparison
            addLog('info', '--- ВЫВОД ---');
            if ((allProps?.length ?? 0) > 0 && (myProps?.length ?? 0) === 0) {
                const sampleId = allProps[0]?.realtor_id;
                if (sampleId !== userId) {
                    addLog('warn', 'ПРОБЛЕМА: realtor_id в БД не совпадает с текущим userId!',
                        `В БД: ${sampleId}\nТекущий userId: ${userId}`);
                } else {
                    addLog('ok', 'realtor_id совпадает, но данных нет. Возможно RLS блокирует.');
                }
            } else if ((myProps?.length ?? 0) > 0) {
                addLog('ok', 'Данные загружаются корректно! Проблема может быть в кэше приложения.');
            } else {
                addLog('warn', 'В базе данных нет объектов. Создайте первый объект на ПК.');
            }
        }

        addLog('info', '=== ДИАГНОСТИКА ЗАВЕРШЕНА ===');
        setRunning(false);
    }

    useEffect(() => { runDiagnostic(); }, []);

    const colors = { ok: '#10b981', error: '#ef4444', warn: '#f59e0b', info: '#6b7280' };

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'monospace', padding: 16 }}>
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#38bdf8', marginBottom: 16 }}>
                    🔍 Mobile Debug
                </div>
                <button
                    onClick={runDiagnostic}
                    disabled={running}
                    style={{
                        background: '#0052ff', color: 'white', border: 'none',
                        borderRadius: 8, padding: '10px 20px', fontSize: 14,
                        cursor: running ? 'wait' : 'pointer', marginBottom: 16, width: '100%'
                    }}
                >
                    {running ? '⏳ Выполняется...' : '▶ Запустить снова'}
                </button>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {log.map((entry, i) => (
                        <div key={i} style={{
                            background: '#1e293b', borderRadius: 8, padding: '8px 12px',
                            borderLeft: `3px solid ${colors[entry.type] || '#475569'}`
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <span style={{ color: colors[entry.type], fontSize: 13, fontWeight: 600 }}>
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

                <div style={{ marginTop: 24, padding: 12, background: '#1e293b', borderRadius: 8, fontSize: 12, color: '#64748b' }}>
                    Страница доступна по адресу /debug. Не забудьте удалить после диагностики.
                </div>
            </div>
        </div>
    );
}
