/**
 * DealChat.jsx
 *
 * Компонент чата для одной стороны сделки (продавец или покупатель).
 * Участники: агент стороны + юрист + риелтор.
 * Сообщения хранятся в таблице deal_messages (Neon).
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, RefreshCw, AlertCircle, Share2, Check } from 'lucide-react';
import { useDealChat } from '../hooks/useDealChat';

const ROLE_CONFIG = {
  realtor:      { label: 'Риелтор',    color: '#0052ff', bg: 'rgba(0,82,255,0.12)',   initials: 'Р' },
  seller_agent: { label: 'Агент прод.', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', initials: 'А' },
  buyer_agent:  { label: 'Агент покуп.', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',  initials: 'А' },
  lawyer:       { label: 'Юрист',      color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  initials: 'Ю' },
  client:       { label: 'Клиент',     color: '#10b981', bg: 'rgba(16,185,129,0.12)',  initials: 'К' },
};

function formatMsgTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return time;
  return `${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} ${time}`;
}

function isSameDay(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return da.toDateString() === db.toDateString();
}

function DayDivider({ date }) {
  const d = new Date(date);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  let label;
  if (d.toDateString() === now.toDateString()) label = 'Сегодня';
  else if (d.toDateString() === yesterday.toDateString()) label = 'Вчера';
  else label = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0',
    }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
    </div>
  );
}

function Avatar({ role, name }) {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.client;
  const letter = name ? name[0].toUpperCase() : cfg.initials;
  return (
    <div style={{
      width: 30, height: 30, borderRadius: '50%',
      background: cfg.bg, color: cfg.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 600, flexShrink: 0,
      border: `1.5px solid ${cfg.color}33`,
    }}>
      {letter}
    </div>
  );
}

function ChatMessage({ msg, isOwn }) {
  const cfg = ROLE_CONFIG[msg.sender_role] || ROLE_CONFIG.client;
  return (
    <div style={{
      display: 'flex',
      flexDirection: isOwn ? 'row-reverse' : 'row',
      gap: 8, alignItems: 'flex-end',
    }}>
      {!isOwn && <Avatar role={msg.sender_role} name={msg.sender_name} />}
      <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: 2, alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
        {!isOwn && (
          <span style={{ fontSize: 10, color: cfg.color, fontWeight: 500, paddingLeft: 4 }}>
            {msg.sender_name} · {cfg.label}
          </span>
        )}
        <div style={{
          background: isOwn ? 'var(--primary)' : 'var(--bg-light)',
          color: isOwn ? '#fff' : 'var(--text)',
          padding: '8px 12px',
          borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          fontSize: 13, fontWeight: 400, lineHeight: 1.45,
          opacity: msg._pending ? 0.65 : 1,
          boxShadow: isOwn ? '0 2px 8px rgba(0,82,255,0.2)' : '0 1px 4px rgba(0,0,0,0.06)',
          wordBreak: 'break-word',
        }}>
          {msg.text}
        </div>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', padding: '0 4px' }}>
          {msg._pending ? 'Отправка...' : formatMsgTime(msg.created_at)}
        </span>
      </div>
    </div>
  );
}

export function DealChat({ dealId, side, currentUser, title, accentColor }) {
  const { messages, loading, sending, error, sendMessage, refetch } = useDealChat(dealId, side);
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Автоскролл вниз при новых сообщениях
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Фокус на поле ввода при открытии
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setText('');
    await sendMessage({
      text: trimmed,
      senderId:   currentUser?.id || 'guest',
      senderName: currentUser?.full_name || currentUser?.name || 'Пользователь',
      senderRole: currentUser?.role || 'realtor',
    });
  }

  function handleCopyShareLink() {
    const shareUrl = `${window.location.origin}/#/chat/${dealId}/${side}`;
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => {});
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      borderRadius: 18, overflow: 'hidden',
      border: `1.5px solid ${accentColor}33`,
      background: 'var(--surface)',
      boxShadow: `0 4px 24px ${accentColor}15`,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        background: `linear-gradient(135deg, ${accentColor}18, ${accentColor}08)`,
        borderBottom: `1px solid ${accentColor}22`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquare size={14} color={accentColor} />
          <span style={{ fontSize: 12, fontWeight: 500, color: accentColor, fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            {title}
          </span>
          {messages.length > 0 && (
            <span style={{ fontSize: 10, background: `${accentColor}22`, color: accentColor, padding: '1px 6px', borderRadius: 8, fontWeight: 500 }}>
              {messages.length}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={handleCopyShareLink}
            style={{
              height: 26, padding: '0 8px', borderRadius: 8, border: 'none',
              background: copied ? 'var(--success-light, rgba(16,185,129,0.15))' : `${accentColor}15`,
              color: copied ? '#10b981' : accentColor,
              display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
              fontSize: 10, fontWeight: 600, transition: 'all 0.2s'
            }}
            title="Скопировать публичную ссылку для клиента"
          >
            {copied ? <Check size={12} /> : <Share2 size={12} />}
            <span>{copied ? 'Скопировано!' : 'Ссылка'}</span>
          </button>
          <button
            onClick={refetch}
            style={{ width: 26, height: 26, borderRadius: 8, border: 'none', background: `${accentColor}15`, color: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            title="Обновить"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, minHeight: 180, maxHeight: 320, overflowY: 'auto',
        padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10,
        scrollbarWidth: 'thin',
      }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 12 }}>
            Загрузка...
          </div>
        )}
        {!loading && error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: 'var(--danger-light)', borderRadius: 10, color: 'var(--danger)', fontSize: 12 }}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}
        {!loading && !error && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 12 }}>
            Сообщений пока нет
          </div>
        )}
        {messages.map((msg, i) => {
          const showDivider = i === 0 || !isSameDay(messages[i - 1].created_at, msg.created_at);
          const isOwn = msg.sender_id === currentUser.id;
          return (
            <React.Fragment key={msg.id}>
              {showDivider && <DayDivider date={msg.created_at} />}
              <ChatMessage msg={msg} isOwn={isOwn} />
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', gap: 8, padding: '10px 12px',
        borderTop: `1px solid ${accentColor}22`,
        background: 'var(--bg-light)',
      }}>
        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Написать сообщение... (Enter — отправить)"
          rows={1}
          style={{
            flex: 1, border: 'none', background: 'var(--surface)',
            borderRadius: 12, padding: '8px 12px', fontSize: 13,
            fontFamily: 'inherit', resize: 'none', outline: 'none',
            color: 'var(--text)', lineHeight: 1.4,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            minHeight: 36, maxHeight: 100,
          }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          style={{
            width: 36, height: 36, borderRadius: 12, border: 'none',
            background: text.trim() && !sending ? accentColor : 'var(--bg-light)',
            color: text.trim() && !sending ? '#fff' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: text.trim() && !sending ? 'pointer' : 'default',
            flexShrink: 0, alignSelf: 'flex-end',
            transition: 'background 0.2s, color 0.2s',
            boxShadow: text.trim() && !sending ? `0 4px 12px ${accentColor}40` : 'none',
          }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

export default DealChat;
