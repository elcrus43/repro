/**
 * FloatingChatWidget.jsx
 *
 * Всплывающий Web-виджет чата в правом нижнем углу экрана.
 */

import React, { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { DealChat } from './DealChat';

export function FloatingChatWidget({ dealId, side, currentUser, title = 'Чат сделки', accentColor = '#3390ec' }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!dealId) return null;

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 9999, fontFamily: 'system-ui, sans-serif' }}>
      {/* Окно виджета */}
      {isOpen && (
        <div style={{
          width: 360,
          height: 480,
          marginBottom: 12,
          borderRadius: 18,
          boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeSlideUp 0.25s ease-out'
        }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                position: 'absolute', top: 10, right: 10, zIndex: 10,
                width: 26, height: 26, borderRadius: '50%', border: 'none',
                background: 'rgba(0,0,0,0.3)', color: '#ffffff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Закрыть виджет"
            >
              <X size={14} />
            </button>
            <DealChat
              dealId={dealId}
              side={side}
              currentUser={currentUser}
              title={title}
              accentColor={accentColor}
            />
          </div>
        </div>
      )}

      {/* Круглая кнопка виджета */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: 54, height: 54, borderRadius: '50%', border: 'none',
            background: '#3390ec', color: '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 6px 20px rgba(51, 144, 236, 0.45)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          title="Открыть чат"
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <MessageSquare size={24} />
        </button>
      )}
    </div>
  );
}

export default FloatingChatWidget;
