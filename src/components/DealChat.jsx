/**
 * DealChat.jsx
 *
 * Компонент чата по сделке.
 * Поддерживает сокеты Wispbyte, файлы/документы, адаптивный компактный дизайн и ролевые имена.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, RefreshCw, AlertCircle, Share2, Check, Paperclip, FileText, Download, ExternalLink, Loader2 } from 'lucide-react';
import { useDealChat } from '../hooks/useDealChat';

const ROLE_CONFIG = {
  realtor:      { label: 'Риелтор',       color: '#0052ff', bg: 'rgba(0,82,255,0.12)',   initials: 'Р' },
  seller_agent: { label: 'Агент прод.',   color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', initials: 'А' },
  buyer_agent:  { label: 'Агент покуп.',  color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',  initials: 'А' },
  agent:        { label: 'Агент',         color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', initials: 'А' },
  lawyer:       { label: 'Юрист',         color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  initials: 'Ю' },
  client:       { label: 'Клиент',        color: '#10b981', bg: 'rgba(16,185,129,0.12)',  initials: 'К' },
  seller:       { label: 'Продавец',      color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', initials: 'П' },
  buyer:        { label: 'Покупатель',    color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',  initials: 'П' },
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
  if (!a || !b) return false;
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
  else label = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
    </div>
  );
}

function Avatar({ role, name }) {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.client;
  const letter = name && name !== cfg.label ? name[0].toUpperCase() : cfg.initials;
  return (
    <div style={{
      width: 24, height: 24, borderRadius: '50%',
      background: cfg.bg, color: cfg.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 700, flexShrink: 0,
      border: `1px solid ${cfg.color}40`,
    }}>
      {letter}
    </div>
  );
}

function ChatMessage({ msg, isOwn }) {
  const cfg = ROLE_CONFIG[msg.sender_role] || ROLE_CONFIG.client;
  const rawName = (msg.sender_name || '').trim();
  const isGeneric = !rawName || rawName.toLowerCase() === 'пользователь' || rawName.toLowerCase() === 'user' || rawName.toLowerCase() === 'guest';
  const displayName = isGeneric ? cfg.label : rawName;

  // Определение вложений (файлы / изображения)
  const isImage = msg.file_type?.startsWith('image/') || (msg.file_url && /\.(png|jpe?g|webp|gif)$/i.test(msg.file_url));
  const hasFile = Boolean(msg.file_url);

  return (
    <div style={{
      display: 'flex',
      flexDirection: isOwn ? 'row-reverse' : 'row',
      gap: 6, alignItems: 'flex-end',
    }}>
      {!isOwn && <Avatar role={msg.sender_role} name={displayName} />}
      <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', gap: 2, alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
        {!isOwn && (
          <span style={{ fontSize: 10, color: cfg.color, fontWeight: 600, paddingLeft: 2 }}>
            {displayName} {displayName !== cfg.label ? `· ${cfg.label}` : ''}
          </span>
        )}
        
        <div style={{
          background: isOwn ? 'var(--primary)' : 'var(--bg-light)',
          color: isOwn ? '#fff' : 'var(--text)',
          padding: '7px 11px',
          borderRadius: isOwn ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
          fontSize: 12.5, fontWeight: 400, lineHeight: 1.4,
          opacity: msg._pending ? 0.65 : 1,
          boxShadow: isOwn ? '0 2px 6px rgba(0,82,255,0.18)' : '0 1px 3px rgba(0,0,0,0.05)',
          wordBreak: 'break-word',
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}>
          {hasFile && (
            isImage ? (
              <a href={msg.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', borderRadius: 8, overflow: 'hidden' }}>
                <img src={msg.file_url} alt={msg.file_name || 'Изображение'} style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 }} />
              </a>
            ) : (
              <a 
                href={msg.file_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                download={msg.file_name || 'Документ'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  background: isOwn ? 'rgba(255,255,255,0.15)' : 'var(--surface)',
                  borderRadius: 8,
                  textDecoration: 'none',
                  color: isOwn ? '#fff' : 'var(--text)',
                  border: isOwn ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border-light)'
                }}
              >
                <FileText size={18} color={isOwn ? '#fff' : 'var(--primary)'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {msg.file_name || 'Документ'}
                  </div>
                  <div style={{ fontSize: 9, opacity: 0.8 }}>Скачать файл</div>
                </div>
                <Download size={14} />
              </a>
            )
          )}

          {msg.text && (msg.text !== msg.file_name) && (
            <span>{msg.text}</span>
          )}
        </div>

        <span style={{ fontSize: 9, color: 'var(--text-muted)', padding: '0 2px' }}>
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
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  async function handleSend(additionalData = {}) {
    const trimmed = text.trim();
    if (!trimmed && !additionalData.file_url) return;
    if (sending || uploading) return;

    setText('');
    const senderRole = currentUser?.role || (side === 'seller' ? 'seller_agent' : 'buyer_agent');
    const roleCfg = ROLE_CONFIG[senderRole] || ROLE_CONFIG.client;
    const rawName = (currentUser?.full_name || currentUser?.name || '').trim();
    const senderName = (!rawName || rawName.toLowerCase() === 'пользователь') ? roleCfg.label : rawName;

    await sendMessage({
      text: trimmed || additionalData.file_name || 'Документ',
      senderId:   currentUser?.id || 'guest',
      senderName,
      senderRole,
      ...additionalData
    });
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const fileUrl = event.target.result;
      setUploading(false);
      await handleSend({
        file_url: fileUrl,
        file_name: file.name,
        file_type: file.type
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.onerror = () => {
      setUploading(false);
      alert('Ошибка чтения файла');
    };
    reader.readAsDataURL(file);
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
      borderRadius: 16, overflow: 'hidden',
      border: `1px solid ${accentColor}30`,
      background: 'var(--surface)',
      boxShadow: `0 2px 16px ${accentColor}10`,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 12px',
        background: `linear-gradient(135deg, ${accentColor}12, ${accentColor}05)`,
        borderBottom: `1px solid ${accentColor}20`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MessageSquare size={13} color={accentColor} />
          <span style={{ fontSize: 11, fontWeight: 600, color: accentColor, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            {title}
          </span>
          {messages.length > 0 && (
            <span style={{ fontSize: 10, background: `${accentColor}18`, color: accentColor, padding: '1px 6px', borderRadius: 6, fontWeight: 600 }}>
              {messages.length}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={handleCopyShareLink}
            style={{
              height: 24, padding: '0 8px', borderRadius: 6, border: 'none',
              background: copied ? 'rgba(16,185,129,0.15)' : `${accentColor}15`,
              color: copied ? '#10b981' : accentColor,
              display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
              fontSize: 10, fontWeight: 600, transition: 'all 0.2s'
            }}
            title="Скопировать публичную ссылку на чат"
          >
            {copied ? <Check size={11} /> : <Share2 size={11} />}
            <span>{copied ? 'Скопировано' : 'Ссылка'}</span>
          </button>
          <button
            type="button"
            onClick={refetch}
            style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: `${accentColor}15`, color: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            title="Обновить"
          >
            <RefreshCw size={11} />
          </button>
        </div>
      </div>

      {/* Messages List */}
      <div style={{
        flex: 1, minHeight: 160, maxHeight: 300, overflowY: 'auto',
        padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6,
        scrollbarWidth: 'thin',
      }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 11 }}>
            Загрузка сообщений...
          </div>
        )}
        {!loading && error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', background: 'var(--danger-light)', borderRadius: 8, color: 'var(--danger)', fontSize: 11 }}>
            <AlertCircle size={13} />
            {error}
          </div>
        )}
        {!loading && !error && messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: 11 }}>
            Сообщений пока нет
          </div>
        )}
        {messages.map((msg, i) => {
          const showDivider = i === 0 || !isSameDay(messages[i - 1]?.created_at, msg.created_at);
          const isOwn = currentUser?.id ? msg.sender_id === currentUser.id : false;
          return (
            <React.Fragment key={msg.id || i}>
              {showDivider && <DayDivider date={msg.created_at} />}
              <ChatMessage msg={msg} isOwn={isOwn} />
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input & Attachments */}
      <div style={{
        display: 'flex', gap: 6, padding: '8px 10px',
        borderTop: `1px solid ${accentColor}20`,
        background: 'var(--bg-light)',
        alignItems: 'center'
      }}>
        {/* Файловый ввод */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          style={{ display: 'none' }} 
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: 'var(--surface)', color: 'var(--text-secondary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0
          }}
          title="Прикрепить файл или документ"
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
        </button>

        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Сообщение..."
          rows={1}
          style={{
            flex: 1, border: 'none', background: 'var(--surface)',
            borderRadius: 8, padding: '6px 10px', fontSize: 12.5,
            fontFamily: 'inherit', resize: 'none', outline: 'none',
            color: 'var(--text)', lineHeight: 1.35,
            minHeight: 32, maxHeight: 80,
          }}
        />
        
        <button
          type="button"
          onClick={() => handleSend()}
          disabled={!text.trim() || sending}
          style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: text.trim() && !sending ? accentColor : 'var(--bg-light)',
            color: text.trim() && !sending ? '#fff' : 'var(--text-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: text.trim() && !sending ? 'pointer' : 'default',
            flexShrink: 0, transition: 'all 0.2s'
          }}
        >
          <Send size={13} />
        </button>
      </div>
    </div>
  );
}

export default DealChat;
