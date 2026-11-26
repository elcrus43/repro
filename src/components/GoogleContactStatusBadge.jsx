import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Loader2, UserPlus, AlertCircle, Link2 } from 'lucide-react';

/**
 * Компактный статус-баннер проверки номера в Google Контактах.
 */
export function GoogleContactStatusBadge({
  status,
  contact,
  error,
  saveToGoogle = true,
  onToggleSaveToGoogle,
  onApplyContact,
  canApplyContact = false,
  compact = false,
}) {
  const navigate = useNavigate();

  if (!status || status === 'idle') return null;

  const baseStyle = {
    marginTop: compact ? 6 : 10,
    padding: compact ? '8px 10px' : '10px 14px',
    borderRadius: compact ? 10 : 14,
    fontSize: compact ? 11.5 : 12.5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  };

  if (status === 'checking') {
    return (
      <div style={{
        ...baseStyle,
        background: 'var(--bg-light)',
        border: '1px solid var(--border)',
        color: 'var(--text-secondary)',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Loader2 size={14} className="spin" />
          Проверяем Google Контакты...
        </span>
      </div>
    );
  }

  if (status === 'found' && contact) {
    return (
      <div style={{
        ...baseStyle,
        background: '#ECFDF5',
        border: '1px solid #10B981',
        color: '#065F46',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
          <CheckCircle2 size={15} style={{ flexShrink: 0, color: '#059669' }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Есть в Google Контактах: <strong>{contact.name || contact.phone || 'Контакт'}</strong>
          </span>
        </div>
        {canApplyContact && onApplyContact && contact.name && (
          <button
            type="button"
            onClick={() => onApplyContact(contact)}
            style={{
              padding: '4px 10px',
              borderRadius: 8,
              border: 'none',
              background: '#059669',
              color: '#fff',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Подставить имя
          </button>
        )}
      </div>
    );
  }

  if (status === 'not_found') {
    return (
      <label style={{
        ...baseStyle,
        background: 'rgba(0, 82, 255, 0.06)',
        border: '1px solid rgba(0, 82, 255, 0.22)',
        color: 'var(--text)',
        cursor: onToggleSaveToGoogle ? 'pointer' : 'default',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flex: 1 }}>
          {onToggleSaveToGoogle ? (
            <input
              type="checkbox"
              checked={saveToGoogle}
              onChange={e => onToggleSaveToGoogle(e.target.checked)}
              style={{ width: 15, height: 15, accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
          ) : (
            <UserPlus size={14} color="var(--primary)" style={{ flexShrink: 0 }} />
          )}
          <span>
            В Google Контактах не найден - {saveToGoogle ? 'запишем в CRM и Google Контакты' : 'запишем только в CRM'}
          </span>
        </span>
      </label>
    );
  }

  if (status === 'not_connected' || status === 'insufficient_scope') {
    return (
      <div style={{
        ...baseStyle,
        background: 'var(--bg-light)',
        border: '1px solid var(--border)',
        color: 'var(--text-secondary)',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Link2 size={14} style={{ flexShrink: 0 }} />
          <span>
            {status === 'insufficient_scope'
              ? 'Нет прав на Google Контакты - переподключите Google'
              : 'Google Контакты не подключены'}
          </span>
        </span>
        <button
          type="button"
          onClick={() => navigate('/profile')}
          style={{
            padding: '4px 10px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--primary)',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Открыть Профиль
        </button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div style={{
        ...baseStyle,
        background: '#FEF2F2',
        border: '1px solid #FCA5A5',
        color: '#991B1B',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={14} style={{ flexShrink: 0 }} />
          <span>Google Контакты: {error || 'ошибка проверки'}</span>
        </span>
      </div>
    );
  }

  return null;
}
