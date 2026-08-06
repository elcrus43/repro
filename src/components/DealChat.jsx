/**
 * DealChat.jsx
 *
 * Компонент чата в стиле Telegram (Telegram Web UI).
 * Поддерживает сокеты Wispbyte, файлы/документы, Telegram-пузыри, онлайн-статус и отправку вложений.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, RefreshCw, AlertCircle, Share2, Check, Paperclip, FileText, Download, Loader2, CheckCheck, Trash2, Users, UserX, ShieldAlert, KeyRound } from 'lucide-react';
import { useDealChat } from '../hooks/useDealChat';

const ROLE_CONFIG = {
  realtor:      { label: 'Риелтор',       color: '#2b5278', bg: '#eef2f5', initials: 'Р' },
  seller_agent: { label: 'Агент прод.',   color: '#a265e6', bg: '#f5eeff', initials: 'А' },
  buyer_agent:  { label: 'Агент покуп.',  color: '#007aff', bg: '#e5f2ff', initials: 'А' },
  agent:        { label: 'Агент',         color: '#3390ec', bg: '#eef6ff', initials: 'А' },
  lawyer:       { label: 'Юрист',         color: '#d97706', bg: '#fff7ed', initials: 'Ю' },
  client:       { label: 'Клиент',        color: '#10b981', bg: '#ecfdf5', initials: 'К' },
  seller:       { label: 'Продавец',      color: '#a265e6', bg: '#f5eeff', initials: 'П' },
  buyer:        { label: 'Покупатель',    color: '#007aff', bg: '#e5f2ff', initials: 'П' },
};

function formatMsgTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
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
    <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0' }}>
      <span style={{ 
        fontSize: 11, 
        fontWeight: 500, 
        color: '#ffffff', 
        background: 'rgba(0, 0, 0, 0.25)', 
        padding: '3px 12px', 
        borderRadius: 12,
        backdropFilter: 'blur(4px)' 
      }}>
        {label}
      </span>
    </div>
  );
}

function Avatar({ role, name }) {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.client;
  const letter = name && name !== cfg.label ? name[0].toUpperCase() : cfg.initials;
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: cfg.color, color: '#ffffff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 700, flexShrink: 0,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      {letter}
    </div>
  );
}

function ChatMessage({ msg, isOwn, canManage, onDelete }) {
  const [hovered, setHovered] = useState(false);
  const cfg = ROLE_CONFIG[msg.sender_role] || ROLE_CONFIG.client;
  const rawName = (msg.sender_name || '').trim();
  const isGeneric = !rawName || rawName.toLowerCase() === 'пользователь' || rawName.toLowerCase() === 'user' || rawName.toLowerCase() === 'guest';
  const displayName = isGeneric ? cfg.label : rawName;

  const isImage = msg.file_type?.startsWith('image/') || (msg.file_url && /\.(png|jpe?g|webp|gif)$/i.test(msg.file_url));
  const hasFile = Boolean(msg.file_url);

  return (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: isOwn ? 'row-reverse' : 'row',
        gap: 6, 
        alignItems: 'flex-end',
        margin: '3px 0',
        position: 'relative'
      }}
    >
      {!isOwn && <Avatar role={msg.sender_role} name={displayName} />}
      
      <div style={{ 
        maxWidth: '78%', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: isOwn ? 'flex-end' : 'flex-start',
        position: 'relative'
      }}>
        <div style={{
          background: isOwn ? '#eeffde' : '#ffffff',
          color: '#111827',
          padding: '7px 10px 6px 11px',
          borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          fontSize: 13, 
          lineHeight: 1.4,
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.12)',
          position: 'relative',
          wordBreak: 'break-word',
          minWidth: 90
        }}>
          {!isOwn && (
            <div style={{ 
              fontSize: 11, 
              fontWeight: 700, 
              color: cfg.color, 
              marginBottom: 3, 
              lineHeight: 1.2 
            }}>
              {displayName}
            </div>
          )}

          {hasFile && (
            isImage ? (
              <a href={msg.file_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', borderRadius: 8, overflow: 'hidden', marginBottom: 4 }}>
                <img src={msg.file_url} alt={msg.file_name || 'Фото'} style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8 }} />
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
                  background: isOwn ? 'rgba(79, 174, 78, 0.12)' : '#f3f4f6',
                  borderRadius: 10,
                  textDecoration: 'none',
                  color: '#1e293b',
                  marginBottom: 4
                }}
              >
                <FileText size={20} color="#3390ec" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {msg.file_name || 'Документ'}
                  </div>
                  <div style={{ fontSize: 9.5, color: '#64748b' }}>Нажмите для скачивания</div>
                </div>
                <Download size={14} color="#3390ec" />
              </a>
            )
          )}

          {msg.text && (msg.text !== msg.file_name) && (
            <div style={{ paddingRight: 45, whiteSpace: 'pre-wrap' }}>
              {msg.text}
            </div>
          )}

          <div style={{
            position: 'absolute',
            bottom: 3,
            right: 7,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            fontSize: 9.5,
            color: isOwn ? '#598958' : '#a2acb4',
            fontWeight: 400,
            userSelect: 'none'
          }}>
            <span>{msg._pending ? 'отправка...' : formatMsgTime(msg.created_at)}</span>
            {isOwn && (
              msg._pending ? null : <CheckCheck size={13} color="#4fae4e" />
            )}
          </div>
        </div>
      </div>

      {/* Кнопка удаления сообщения для Агента/Риелтора */}
      {(canManage || isOwn) && hovered && !msg._pending && (
        <button
          type="button"
          onClick={() => onDelete(msg.id)}
          style={{
            border: 'none', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444',
            width: 22, height: 22, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0
          }}
          title="Удалить сообщение"
        >
          <Trash2 size={11} />
        </button>
      )}
    </div>
  );
}

export function DealChat({ dealId, side, currentUser, title, accentColor }) {
  const { messages, loading, sending, error, sendMessage, deleteMessage, refetch } = useDealChat(dealId, side);
  const [text, setText] = useState('');
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showParticipantsMenu, setShowParticipantsMenu] = useState(false);

  // Список заблокированных участников
  const [blockedUsers, setBlockedUsers] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`blocked_users_${dealId}_${side}`) || '[]'); }
    catch { return []; }
  });
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
      alert('Ошибка при загрузке файла');
    };
    reader.readAsDataURL(file);
  }

  function handleCopyShareLink() {
    const hash = Math.abs(dealId.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)).toString(36);
    const secretToken = `t_sec_${side}_${dealId.substring(0, 8)}_${hash}`;
    const baseOrigin = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'https://realtor-match.vercel.app'
      : window.location.origin;
    const shareUrl = `${baseOrigin}/#/chat/${secretToken}`;
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
      border: '1px solid #7ea5c9',
      background: '#8ab0d4', // Классические обои Telegram
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
    }}>
      {/* Telegram Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px',
        background: '#517da2', // Telegram classic blue header
        color: '#ffffff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <MessageSquare size={16} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', lineHeight: 1.2 }}>
              {title}
            </div>
            <div style={{ fontSize: 10, color: '#c7dbe8', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4fae4e' }} />
              <span>онлайн · {messages.length} сообщ.</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button"
            onClick={() => setShowParticipantsMenu(prev => !prev)}
            style={{
              height: 28, padding: '0 8px', borderRadius: 14, border: 'none',
              background: showParticipantsMenu ? '#ffffff' : 'rgba(255,255,255,0.2)',
              color: showParticipantsMenu ? '#517da2' : '#ffffff',
              display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
              fontSize: 11, fontWeight: 600, transition: 'all 0.2s'
            }}
            title="Участники и управление доступом"
          >
            <Users size={12} />
            <span>Доступ</span>
          </button>

          <button
            type="button"
            onClick={handleCopyShareLink}
            style={{
              height: 28, padding: '0 10px', borderRadius: 14, border: 'none',
              background: copied ? '#4fae4e' : 'rgba(255,255,255,0.2)',
              color: '#ffffff',
              display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
              fontSize: 11, fontWeight: 600, transition: 'all 0.2s'
            }}
            title="Скопировать секретную ссылку"
          >
            {copied ? <Check size={12} /> : <Share2 size={12} />}
            <span>{copied ? 'Скопировано' : 'Ссылка'}</span>
          </button>

          <button
            type="button"
            onClick={refetch}
            style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.15)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            title="Обновить"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* Выпадающая панель участников и управления доступом */}
      {showParticipantsMenu && (
        <div style={{
          padding: '10px 14px',
          background: '#ffffff',
          borderBottom: '1px solid #cbd5e1',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          animation: 'fadeSlideDown 0.2s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Участники чата ({Array.from(new Set(messages.map(m => m.sender_name || 'Участник'))).length})
            </span>
            <button
              onClick={() => setShowParticipantsMenu(false)}
              style={{ border: 'none', background: 'none', fontSize: 11, color: '#64748b', cursor: 'pointer', fontWeight: 600 }}
            >
              Закрыть ✕
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
            {Array.from(new Set(messages.map(m => (m.sender_name || '').trim()))).filter(Boolean).map(userName => {
              const isBlocked = blockedUsers.includes(userName);
              return (
                <div key={userName} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 8px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Avatar role="client" name={userName} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: isBlocked ? '#94a3b8' : '#1e293b', textDecoration: isBlocked ? 'line-through' : 'none' }}>
                      {userName}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      let nextBlocked;
                      if (isBlocked) {
                        nextBlocked = blockedUsers.filter(u => u !== userName);
                      } else {
                        nextBlocked = [...blockedUsers, userName];
                      }
                      setBlockedUsers(nextBlocked);
                      localStorage.setItem(`blocked_users_${dealId}_${side}`, JSON.stringify(nextBlocked));
                    }}
                    style={{
                      height: 24, padding: '0 8px', borderRadius: 6, border: 'none',
                      background: isBlocked ? '#10b981' : '#ef4444',
                      color: '#ffffff', fontSize: 10, fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer'
                    }}
                  >
                    {isBlocked ? <Check size={11} /> : <UserX size={11} />}
                    <span>{isBlocked ? 'Разблокировать' : 'Удалить из чата'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Messages List (Telegram Wallpaper Body) */}
      <div style={{
        flex: 1, minHeight: 200, maxHeight: 340, overflowY: 'auto',
        padding: '12px 14px', display: 'flex', flexDirection: 'column',
        scrollbarWidth: 'thin',
        backgroundImage: 'radial-gradient(rgba(255,255,255,0.12) 1px, transparent 0)',
        backgroundSize: '16px 16px'
      }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '20px 0', color: '#ffffff', fontSize: 12 }}>
            Загрузка сообщений Telegram...
          </div>
        )}
        {!loading && error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#ef4444', borderRadius: 10, color: '#ffffff', fontSize: 11 }}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}
        {!loading && !error && messages.filter(m => !blockedUsers.includes((m.sender_name || '').trim())).length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 500 }}>
            Сообщений нет или участники заблокированы
          </div>
        )}
        {messages.filter(m => !blockedUsers.includes((m.sender_name || '').trim())).map((msg, i, arr) => {
          const showDivider = i === 0 || !isSameDay(arr[i - 1]?.created_at, msg.created_at);
          const isOwn = currentUser?.id ? msg.sender_id === currentUser.id : false;
          const canManage = currentUser?.role && currentUser.role !== 'client';
          return (
            <React.Fragment key={msg.id || i}>
              {showDivider && <DayDivider date={msg.created_at} />}
              <ChatMessage 
                msg={msg} 
                isOwn={isOwn} 
                canManage={canManage}
                onDelete={deleteMessage}
              />
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Telegram Input Bar */}
      <div style={{
        display: 'flex', gap: 8, padding: '8px 10px',
        background: '#ffffff',
        alignItems: 'center',
        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
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
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: '#f1f5f9', color: '#64748b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0
          }}
          title="Прикрепить файл или фото"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" color="#3390ec" /> : <Paperclip size={16} color="#64748b" />}
        </button>

        <textarea
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Написать сообщение..."
          rows={1}
          style={{
            flex: 1, border: 'none', background: '#f1f5f9',
            borderRadius: 18, padding: '8px 14px', fontSize: 13,
            fontFamily: 'inherit', resize: 'none', outline: 'none',
            color: '#0f172a', lineHeight: 1.4,
            minHeight: 36, maxHeight: 90,
          }}
        />
        
        <button
          type="button"
          onClick={() => handleSend()}
          disabled={!text.trim() && !uploading}
          style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: text.trim() ? '#3390ec' : '#e2e8f0', // Telegram classic blue send button
            color: text.trim() ? '#ffffff' : '#94a3b8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: text.trim() ? 'pointer' : 'default',
            flexShrink: 0, transition: 'all 0.2s',
            boxShadow: text.trim() ? '0 2px 8px rgba(51, 144, 236, 0.35)' : 'none'
          }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

export default DealChat;
