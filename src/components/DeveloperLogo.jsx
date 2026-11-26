import React, { useState } from 'react';
import { getDeveloperKnowledge } from '../data/developersKnowledgeBase';

/**
 * DeveloperLogo
 * Логотип застройщика г. Кирова: использует реальный логотип из public/images/developers
 * с резервной векторной монограммой на базе фирменной палитры.
 */
export function DeveloperLogo({ developer, size = 40, className = '' }) {
  const [imgError, setImgError] = useState(false);
  const kb = typeof developer === 'string'
    ? getDeveloperKnowledge(developer)
    : developer;

  const id = kb?.id || 'default';
  const monogram = kb?.monogram || String(developer || 'ЖК').slice(0, 2).toUpperCase();
  const bg = kb?.brandBg || '#E2E8F0';
  const color = kb?.brandColor || '#1E293B';
  const accent = kb?.brandAccent || '#3B82F6';
  const logoUrl = kb?.logoUrl || null;

  if (logoUrl && !imgError) {
    return (
      <span
        className={`developer-logo-wrap has-photo ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          flexShrink: 0,
          borderRadius: Math.round(size * 0.24),
          overflow: 'hidden',
          background: '#ffffff',
          border: '1px solid rgba(148, 163, 184, 0.28)',
          padding: Math.max(2, Math.round(size * 0.08)),
          boxShadow: '0 2px 6px rgba(15, 23, 42, 0.08)',
        }}
        title={kb?.name || String(developer || '')}
      >
        <img
          src={logoUrl}
          alt={kb?.name || String(developer || 'Застройщик')}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
          }}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      </span>
    );
  }

  const renderMark = () => {
    switch (id) {
      case 'zhelezno':
        return (
          <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
            <rect width="40" height="40" rx="11" fill={color} />
            <path d="M12 27V13h3.2v5.8L20 13l4.8 5.8V13H28v14h-3.2v-5.6L20 27l-4.8-5.6V27H12z" fill="#FFFFFF" />
            <circle cx="20" cy="9" r="2.2" fill={accent} />
          </svg>
        );
      case 'ksm':
        return (
          <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
            <rect width="40" height="40" rx="11" fill={color} />
            <text x="20" y="24" textAnchor="middle" fill="#FFFFFF" fontSize="11.5" fontWeight="800" fontFamily="system-ui, sans-serif">
              КСМ
            </text>
          </svg>
        );
      case 'kssk':
        return (
          <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
            <rect width="40" height="40" rx="11" fill="#1E293B" />
            <text x="20" y="24" textAnchor="middle" fill="#FFFFFF" fontSize="10.5" fontWeight="800" fontFamily="system-ui, sans-serif">
              КССК
            </text>
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
