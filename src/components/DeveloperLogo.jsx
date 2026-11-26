import React from 'react';
import { getDeveloperKnowledge } from '../data/developersKnowledgeBase';

/**
 * DeveloperLogo
 * Компактный векторный логотип застройщика г. Кирова на базе фирменной палитры и монограммы.
 */
export function DeveloperLogo({ developer, size = 40, className = '' }) {
  const kb = typeof developer === 'string'
    ? getDeveloperKnowledge(developer)
    : developer;

  const id = kb?.id || 'default';
  const monogram = kb?.monogram || String(developer || 'ЖК').slice(0, 2).toUpperCase();
  const bg = kb?.brandBg || '#E2E8F0';
  const color = kb?.brandColor || '#1E293B';
  const accent = kb?.brandAccent || '#3B82F6';

  const renderMark = () => {
    switch (id) {
      case 'zhelezno':
        return (
          <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
            <rect width="40" height="40" rx="11" fill={color} />
            <path d="M9 28V12h5v6.5L20 12l6 6.5V12h5v16h-5v-6.5L20 28l-6-6.5V28H9z" fill="#CCFBF1" opacity="0.22" />
            <path d="M12 27V13h3.2v5.8L20 13l4.8 5.8V13H28v14h-3.2v-5.6L20 27l-4.8-5.6V27H12z" fill="#FFFFFF" />
            <circle cx="20" cy="9" r="2.2" fill={accent} />
          </svg>
        );
      case 'ksm':
        return (
          <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
            <rect width="40" height="40" rx="11" fill={color} />
            <path d="M8 29L15 11h5l-7 18H8zm9 0l7-18h5l-7 18h-5z" fill="#FFFFFF" opacity="0.2" />
            <rect x="7" y="13" width="26" height="14" rx="4" fill="#FFFFFF" opacity="0.14" />
            <text x="20" y="24" textAnchor="middle" fill="#FFFFFF" fontSize="11.5" fontWeight="800" fontFamily="system-ui, sans-serif">
              КСМ
            </text>
          </svg>
        );
      case 'kssk':
        return (
          <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
            <rect width="40" height="40" rx="11" fill="#1E293B" />
            <path d="M6 27L20 9l14 18H6z" fill={color} opacity="0.9" />
            <rect x="6" y="23" width="28" height="10" rx="4" fill="#0F172A" opacity="0.88" />
            <text x="20" y="30.5" textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="800" fontFamily="system-ui, sans-serif">
              КССК
            </text>
          </svg>
        );
      case 'profstroy':
        return (
          <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
            <rect width="40" height="40" rx="11" fill={color} />
            <path d="M11 29V13l9-4 9 4v16h-4V16l-5-2.2L15 16v13h-4z" fill="#FFFFFF" />
            <rect x="17" y="20" width="6" height="9" rx="1.5" fill={accent} />
          </svg>
        );
      case 'stroysoyuz':
        return (
          <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
            <rect width="40" height="40" rx="11" fill={color} />
            <circle cx="20" cy="20" r="13" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.3" />
            <path d="M12 24c2 3 5 4.5 8 4.5 4.5 0 7.5-2.4 7.5-5.6 0-3-2.5-4.6-6.8-5.5l-2.1-.5c-2.3-.5-3.4-1.3-3.4-2.5 0-1.5 1.5-2.6 4.1-2.6 2.2 0 4.1.7 5.7 2l1.8-2.4C24.8 9.8 22.4 9 19.4 9c-4.7 0-7.7 2.4-7.7 5.7 0 2.9 2.3 4.6 6.4 5.5l2.1.5c2.5.6 3.7 1.3 3.7 2.6 0 1.6-1.6 2.6-4.1 2.6-2.5 0-4.6-.9-6.2-2.4L12 24z" fill="#FFFFFF" opacity="0.22" />
            <text x="20" y="24" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="800" fontFamily="system-ui, sans-serif">
              СС
            </text>
          </svg>
        );
      case 'kino':
        return (
          <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
            <rect width="40" height="40" rx="11" fill="#0F172A" />
            <rect x="7" y="10" width="26" height="20" rx="4" fill="none" stroke={accent} strokeWidth="2" />
            <text x="20" y="23.5" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="800" fontFamily="system-ui, sans-serif">
              КИНО
            </text>
          </svg>
        );
      case 'avitek':
        return (
          <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
            <rect width="40" height="40" rx="11" fill={color} />
            <path d="M8 25L29 12l-6 15-4.5-4.5L8 25z" fill="#FFFFFF" opacity="0.92" />
            <path d="M18.5 22.5L29 12l-13 9" fill={accent} />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
            <rect width="40" height="40" rx="11" fill={bg} />
            <rect x="1.5" y="1.5" width="37" height="37" rx="9.5" fill="none" stroke={color} strokeWidth="1.5" opacity="0.35" />
            <text
              x="20"
              y="24"
              textAnchor="middle"
              fill={color}
              fontSize={monogram.length > 3 ? '9.5' : monogram.length > 2 ? '11' : '13'}
              fontWeight="800"
              fontFamily="system-ui, sans-serif"
            >
              {monogram}
            </text>
          </svg>
        );
    }
  };

  return (
    <span
      className={`developer-logo-wrap ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: Math.round(size * 0.27),
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.12)',
      }}
      title={kb?.name || String(developer || '')}
    >
      {renderMark()}
    </span>
  );
}
