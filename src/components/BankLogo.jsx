import React from 'react';

export const RUSSIAN_BANKS = [
  { id: 'sber', name: 'Сбербанк', shortName: 'Сбер', color: '#1a9f29', bg: 'rgba(26,159,41,0.12)', border: 'rgba(26,159,41,0.3)' },
  { id: 'vtb', name: 'ВТБ', shortName: 'ВТБ', color: '#002882', bg: 'rgba(0,40,130,0.12)', border: 'rgba(0,40,130,0.3)' },
  { id: 'alfa', name: 'Альфа-Банк', shortName: 'Альфа', color: '#ef3124', bg: 'rgba(239,49,36,0.12)', border: 'rgba(239,49,36,0.3)' },
  { id: 'tbank', name: 'Т-Банк (Тинькофф)', shortName: 'Т-Банк', color: '#e6c400', textColor: '#111', bg: 'rgba(255,221,45,0.25)', border: 'rgba(230,196,0,0.5)' },
  { id: 'gpb', name: 'Газпромбанк', shortName: 'ГПБ', color: '#003d7c', bg: 'rgba(0,61,124,0.12)', border: 'rgba(0,61,124,0.3)' },
  { id: 'sovcom', name: 'Совкомбанк', shortName: 'Совком', color: '#ff4b4b', bg: 'rgba(255,75,75,0.12)', border: 'rgba(255,75,75,0.3)' },
  { id: 'domrf', name: 'Банк ДОМ.РФ', shortName: 'ДОМ.РФ', color: '#00a88f', bg: 'rgba(0,168,143,0.12)', border: 'rgba(0,168,143,0.3)' },
  { id: 'otkritie', name: 'Открытие', shortName: 'Открытие', color: '#00a2e8', bg: 'rgba(0,162,232,0.12)', border: 'rgba(0,162,232,0.3)' },
  { id: 'psb', name: 'ПСБ (Промсвязьбанк)', shortName: 'ПСБ', color: '#f37021', bg: 'rgba(243,112,33,0.12)', border: 'rgba(243,112,33,0.3)' },
  { id: 'rosbank', name: 'Росбанк', shortName: 'Росбанк', color: '#e20613', bg: 'rgba(226,6,19,0.12)', border: 'rgba(226,6,19,0.3)' },
  { id: 'uralsib', name: 'Уралсиб', shortName: 'Уралсиб', color: '#002b49', bg: 'rgba(0,43,73,0.12)', border: 'rgba(0,43,73,0.3)' },
  { id: 'raiffeisen', name: 'Райффайзенбанк', shortName: 'Райффайзен', color: '#d9a700', bg: 'rgba(255,237,0,0.2)', border: 'rgba(217,167,0,0.4)' },
  { id: 'other', name: 'Другой банк', shortName: 'Банк', color: '#6366f1', bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.3)' }
];

export function getBankInfo(bankName = '') {
  if (!bankName) return RUSSIAN_BANKS.find(b => b.id === 'other');
  const normalized = bankName.toLowerCase().trim();
  
  if (normalized.includes('сбер')) return RUSSIAN_BANKS.find(b => b.id === 'sber');
  if (normalized.includes('втб')) return RUSSIAN_BANKS.find(b => b.id === 'vtb');
  if (normalized.includes('альфа')) return RUSSIAN_BANKS.find(b => b.id === 'alfa');
  if (normalized.includes('тиньк') || normalized.includes('т-банк') || normalized.includes('t-bank') || normalized.includes('тбанк')) return RUSSIAN_BANKS.find(b => b.id === 'tbank');
  if (normalized.includes('газпром') || normalized.includes('гпб')) return RUSSIAN_BANKS.find(b => b.id === 'gpb');
  if (normalized.includes('совком')) return RUSSIAN_BANKS.find(b => b.id === 'sovcom');
  if (normalized.includes('дом.рф') || normalized.includes('домрф') || normalized.includes('дом рф')) return RUSSIAN_BANKS.find(b => b.id === 'domrf');
  if (normalized.includes('открыт')) return RUSSIAN_BANKS.find(b => b.id === 'otkritie');
  if (normalized.includes('псб') || normalized.includes('промсвязь')) return RUSSIAN_BANKS.find(b => b.id === 'psb');
  if (normalized.includes('росбанк')) return RUSSIAN_BANKS.find(b => b.id === 'rosbank');
  if (normalized.includes('уралсиб')) return RUSSIAN_BANKS.find(b => b.id === 'uralsib');
  if (normalized.includes('райффайзен')) return RUSSIAN_BANKS.find(b => b.id === 'raiffeisen');

  return {
    id: 'custom',
    name: bankName,
    shortName: bankName,
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.12)',
    border: 'rgba(99,102,241,0.3)'
  };
}

export function BankIcon({ bankName, size = 18, style = {} }) {
  const bank = getBankInfo(bankName);
  
  // Custom SVG icon by bank ID
  const renderSvg = () => {
    switch (bank.id) {
      case 'sber':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#1a9f29" />
            <path d="M7 12.5L10.5 16L17 8.5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 4.5A7.5 7.5 0 0 1 19.5 12" stroke="#6ee7b7" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'vtb':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="5" fill="#002882" />
            <path d="M4 7H20M5 12H19M6 17H18" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );
      case 'alfa':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="5" fill="#ef3124" />
            <path d="M12 5L6 17H9.2L10.5 14H13.5L14.8 17H18L12 5ZM11.2 11.8L12 9.5L12.8 11.8H11.2Z" fill="white" />
            <path d="M6 19H18" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case 'tbank':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="5" fill="#ffdd2d" />
            <path d="M6 7H18M12 7V18" stroke="#111111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case 'gpb':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="5" fill="#003d7c" />
            <path d="M12 5C12 5 7 10 7 14A5 5 0 0 0 17 14C17 10 12 5 12 5Z" fill="#3b82f6" />
            <circle cx="12" cy="14" r="2" fill="white" />
          </svg>
        );
      case 'domrf':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="5" fill="#00a88f" />
            <path d="M5 12L12 6L19 12V18H15V14H9V18H5V12Z" fill="white" />
          </svg>
        );
      case 'sovcom':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#ff4b4b" />
            <path d="M12 6L14 10L18 11L15 14L16 18L12 16L8 18L9 14L6 11L10 10L12 6Z" fill="white" />
          </svg>
        );
      case 'otkritie':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" fill="#00a2e8" />
            <circle cx="12" cy="12" r="5" stroke="white" strokeWidth="2.5" />
          </svg>
        );
      case 'psb':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="5" fill="#f37021" />
            <path d="M7 7H14C16.2 7 18 8.8 18 11C18 13.2 16.2 15 14 15H7V7Z" fill="white" />
            <path d="M7 15V18" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );
      case 'rosbank':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="5" fill="#e20613" />
            <rect x="5" y="5" width="14" height="6" fill="black" />
            <rect x="5" y="13" width="14" height="6" fill="white" />
          </svg>
        );
      case 'raiffeisen':
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="5" fill="#ffed00" />
            <path d="M6 6L18 18M18 6L6 18" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );
      default:
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="24" height="24" rx="5" fill={bank.color} />
            <path d="M4 10L12 5L20 10V18H4V10Z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
            <path d="M9 14V18M15 14V18" stroke="white" strokeWidth="2" />
          </svg>
        );
    }
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justify: 'center',
        flexShrink: 0,
        verticalAlign: 'middle',
        ...style
      }}
    >
      {renderSvg()}
    </span>
  );
}

export function BankBadge({ bankName, amount, style = {} }) {
  if (!bankName && !amount) return null;
  const bank = getBankInfo(bankName);

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 8px',
        borderRadius: 8,
        background: bank.bg,
        border: `1px solid ${bank.border}`,
        fontSize: 11,
        fontWeight: 500,
        color: bank.textColor || bank.color,
        fontFamily: "'Oswald', sans-serif",
        letterSpacing: '0.01em',
        ...style
      }}
    >
      <BankIcon bankName={bankName} size={15} />
      <span>{bank.shortName || bankName || 'Ипотека'}</span>
      {amount > 0 && (
        <span style={{ fontWeight: 600, opacity: 0.95 }}>
          · {Number(amount).toLocaleString()} ₽
        </span>
      )}
    </div>
  );
}
