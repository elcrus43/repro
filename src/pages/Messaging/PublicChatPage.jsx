/**
 * PublicChatPage.jsx
 *
 * Публичная страница чата сделки для клиентов и внешних участников (юрист, клиент).
 * Не требует авторизации в CRM.
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react';
import { neonDb } from '../../lib/neon';
import { DealChat } from '../../components/DealChat';
import { MessageSquare, User, Building2, ShieldCheck, Sparkles } from 'lucide-react';

export function PublicChatPage() {
  const { dealId, side } = useParams();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Гостевое имя и роль из localStorage
  const [guestName, setGuestName] = useState(() => localStorage.getItem('public_chat_guest_name') || '');
  const [guestRole, setGuestRole] = useState(() => localStorage.getItem('public_chat_guest_role') || 'client');
  const [inputName, setInputName] = useState('');

  useEffect(() => {
    async function loadDeal() {
      if (!dealId) return;
      try {
        const res = await neonDb.query(
          'SELECT id, title, status, lawyer FROM deals WHERE id = $1 LIMIT 1',
          [dealId]
        );
        if (res.error) {
          setError('Сделка не найдена');
        } else if (res.data && res.data.length > 0) {
          setDeal(res.data[0]);
        } else {
          setError('Сделка не найдена');
        }
      } catch (e) {
        setError(' Ошибка загрузки сделки');
      } finally {
        setLoading(false);
      }
    }
    loadDeal();
  }, [dealId]);

  function handleSaveGuestName(e) {
    e.preventDefault();
    if (!inputName.trim()) return;
    const name = inputName.trim();
    localStorage.setItem('public_chat_guest_name', name);
    localStorage.setItem('public_chat_guest_role', guestRole);
    setGuestName(name);
  }

  const sideTitle = side === 'seller' ? 'Чат продавца' : 'Чат покупателя';
  const accentColor = side === 'seller' ? '#8b5cf6' : '#0052ff';

  const guestUser = {
    id: `guest-${guestName.replace(/\s+/g, '_')}`,
    full_name: guestName,
    role: guestRole,
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg, #f8fafc)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '16px 12px 32px',
      fontFamily: "'Inter', sans-serif"
    }}>
      {/* Шапка страницы */}
      <header style={{
        width: '100%',
        maxWidth: 540,
        background: 'var(--surface, #ffffff)',
        borderRadius: 20,
        padding: '16px 20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
        border: '1px solid var(--border-light, #e2e8f0)',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 14,
            background: `${accentColor}15`, color: accentColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <MessageSquare size={22} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {sideTitle}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text, #0f172a)' }}>
              {deal?.title || 'Загрузка...'}
            </div>
          </div>
        </div>

        {guestName && (
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('public_chat_guest_name');
              setGuestName('');
            }}
            style={{
              fontSize: 11, color: 'var(--text-muted, #64748b)',
              background: 'transparent', border: 'none', cursor: 'pointer',
              textDecoration: 'underline'
            }}
          >
            Сменить имя
          </button>
        )}
      </header>

      {/* Контент */}
      <main style={{ width: '100%', maxWidth: 540, flex: 1, display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
            Загрузка чата...
          </div>
        ) : error ? (
          <div style={{
            background: '#fef2f2', color: '#ef4444', padding: 20, borderRadius: 16, textAlign: 'center'
          }}>
            {error}
          </div>
        ) : !guestName ? (
          /* Форма представления участника */
          <div style={{
            background: 'var(--surface, #ffffff)',
            borderRadius: 24,
            padding: 28,
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
            border: '1px solid var(--border-light, #e2e8f0)',
            textAlign: 'center'
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 28, background: 'rgba(0,82,255,0.1)',
              color: 'var(--primary, #0052ff)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <User size={28} />
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: 'var(--text, #0f172a)' }}>
              Добро пожаловать в онлайн-чат сделки
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary, #64748b)', marginBottom: 24, lineHeight: 1.5 }}>
              Введите ваше имя и выберите роль, чтобы присоединиться к обсуждению с риелтором.
            </p>

            <form onSubmit={handleSaveGuestName} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input
                type="text"
                required
                placeholder="Ваше имя (например, Алексей)"
                value={inputName}
                onChange={e => setInputName(e.target.value)}
                style={{
                  height: 48, borderRadius: 14, border: '1.5px solid var(--border, #cbd5e1)',
                  padding: '0 16px', fontSize: 15, outline: 'none', background: 'var(--bg, #f8fafc)'
                }}
              />

              <div style={{ textAlign: 'left' }}>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Ваша роль в сделке:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setGuestRole('client')}
                    style={{
                      padding: '10px 12px', borderRadius: 12, fontSize: 13, fontWeight: 500,
                      border: `1.5px solid ${guestRole === 'client' ? accentColor : 'var(--border-light)'}`,
                      background: guestRole === 'client' ? `${accentColor}10` : 'transparent',
                      color: guestRole === 'client' ? accentColor : 'var(--text)',
                      cursor: 'pointer'
                    }}
                  >
                    Клиент
                  </button>
                  <button
                    type="button"
                    onClick={() => setGuestRole('lawyer')}
                    style={{
                      padding: '10px 12px', borderRadius: 12, fontSize: 13, fontWeight: 500,
                      border: `1.5px solid ${guestRole === 'lawyer' ? '#f59e0b' : 'var(--border-light)'}`,
                      background: guestRole === 'lawyer' ? 'rgba(245,158,11,0.1)' : 'transparent',
                      color: guestRole === 'lawyer' ? '#f59e0b' : 'var(--text)',
                      cursor: 'pointer'
                    }}
                  >
                    Юрист
                  </button>
                </div>
              </div>

              <button
                type="submit"
                style={{
                  height: 48, borderRadius: 14, border: 'none', background: accentColor,
                  color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                  boxShadow: `0 6px 20px ${accentColor}33`, marginTop: 8
                }}
              >
                Войти в чат
              </button>
            </form>
          </div>
        ) : (
          /* Само окно чата */
          <div style={{ flex: 1, height: 'calc(100vh - 120px)', minHeight: 480 }}>
            <DealChat
              dealId={dealId}
              side={side}
              currentUser={guestUser}
              title={sideTitle}
              accentColor={accentColor}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default PublicChatPage;
