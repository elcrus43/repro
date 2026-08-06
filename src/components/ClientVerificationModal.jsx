import React, { useState } from 'react';
import { ShieldCheck, ExternalLink, Copy, Check, AlertTriangle, FileText, User, Search, Building2, Scale, ShieldAlert } from 'lucide-react';
import { useToastContext } from './Toast';

const VERIFICATION_SERVICES = [
  {
    id: 'fssp',
    name: 'ФССП России (Судебные приставы)',
    category: 'Долги и аресты',
    url: 'https://fssp.gov.ru/iss/ip',
    icon: ShieldAlert,
    color: '#ef4444',
    bg: '#fef2f2',
    borderColor: '#fca5a5',
    desc: 'Проверка исполнительных производств, долгов, арестов имущества и ограничений на выезд.',
  },
  {
    id: 'bankrot',
    name: 'Федресурс / ЕФРСБ (Банкротство)',
    category: 'Банкротство',
    url: 'https://bankrot.fedresurs.ru/',
    icon: Scale,
    color: '#d97706',
    bg: '#fff7ed',
    borderColor: '#fde68a',
    desc: 'Проверка физического или юридического лица на процедуру банкротства и торги.',
  },
  {
    id: 'mvd',
    name: 'МВД России (Проверка паспорта)',
    category: 'Паспорт РФ',
    url: 'https://сервисы.гувм.мвд.рф/info-service.htm?sid=2000',
    icon: ShieldCheck,
    color: '#2563eb',
    bg: '#eff6ff',
    borderColor: '#bfdbfe',
    desc: 'Проверка действительности паспорта гражданина РФ среди недействительных/утраченных.',
  },
  {
    id: 'fns',
    name: 'ФНС России (Поиск ИНН и Налоги)',
    category: 'Налоги и ИНН',
    url: 'https://service.nalog.ru/inn.do',
    icon: Building2,
    color: '#059669',
    bg: '#ecfdf5',
    borderColor: '#a7f3d0',
    desc: 'Узнать ИНН физического лица и проверить наличие налоговых задолженностей.',
  },
  {
    id: 'notary',
    name: 'Нотариат РФ (Проверка доверенностей)',
    category: 'Документы',
    url: 'https://notariat.ru/ru-ru/help/stat/',
    icon: FileText,
    color: '#8b5cf6',
    bg: '#f5eeff',
    borderColor: '#ddd6fe',
    desc: 'Проверка подлинности нотариально удостоверенных доверенностей и согласий.',
  },
  {
    id: 'zalog',
    name: 'Реестр залогов (ФНП)',
    category: 'Залоги и авто',
    url: 'https://www.reestr-zalogov.ru/search/index',
    icon: Search,
    color: '#0284c7',
    bg: '#f0f9ff',
    borderColor: '#bae6fd',
    desc: 'Проверка залогов движимого имущества (автомобили, оборудование, имущество).',
  },
  {
    id: 'arbitr',
    name: 'Картотека арбитражных дел',
    category: 'Судебные дела',
    url: 'https://kad.arbitr.ru/',
    icon: Scale,
    color: '#475569',
    bg: '#f8fafc',
    borderColor: '#cbd5e1',
    desc: 'Поиск судебных исков, разбирательств и претензий с участием физлица или ИП.',
  }
];

export function ClientVerificationModal({ isOpen, onClose, client }) {
  const { toast } = useToastContext();
  const [copiedField, setCopiedField] = useState(null);

  if (!isOpen || !client) return null;

  const clientName = client.full_name || client.name || 'Клиент';
  const birthDate = client.birth_date || client.birthday || '';
  const passport = client.passport || client.passport_data || '';
  const inn = client.inn || '';
  const phone = client.phone || '';

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} скопирован в буфер!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenService = (service) => {
    // Автокопирование ФИО клиента перед переходом
    const copyText = `${clientName}${birthDate ? ` ${birthDate}` : ''}`;
    navigator.clipboard.writeText(copyText);
    toast.success(`ФИО "${clientName}" скопировано для вставки на ${service.name}!`);
    window.open(service.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: 'var(--surface, #ffffff)',
        color: 'var(--text, #1e293b)',
        borderRadius: 24,
        maxWidth: 680, width: '100%',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
        border: '1px solid var(--border-light, #e2e8f0)',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          borderRadius: '24px 24px 0 0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'rgba(255, 255, 255, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.15)'
            }}>
              <ShieldCheck size={24} color="#10b981" />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#ffffff' }}>
                Проверка клиента по госреестрам
              </h3>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0 0' }}>
                Быстрый переход к проверке в ФССП, МВД, Федресурс и ФНС
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              border: 'none', background: 'rgba(255,255,255,0.1)', color: '#ffffff',
              width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Card with Client Details & Instant Copy */}
          <div style={{
            background: 'var(--bg-light, #f8fafc)',
            border: '1px solid var(--border, #e2e8f0)',
            borderRadius: 16, padding: '16px 18px',
            display: 'flex', flexDirection: 'column', gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <User size={16} color="var(--primary, #3b82f6)" />
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                  {clientName}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(clientName, 'ФИО')}
                style={{
                  padding: '4px 10px', borderRadius: 8, border: '1px solid #cbd5e1',
                  background: '#ffffff', color: '#334155', fontSize: 11, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer'
                }}
              >
                {copiedField === 'ФИО' ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                <span>Скопировать ФИО</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12 }}>
              {birthDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Дата рождения:</span>
                  <span style={{ fontWeight: 600 }}>{birthDate}</span>
                  <button
                    onClick={() => copyToClipboard(birthDate, 'Дата рождения')}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: '#64748b' }}
                    title="Скопировать дату рождения"
                  >
                    <Copy size={11} />
                  </button>
                </div>
              )}

              {passport && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Паспорт:</span>
                  <span style={{ fontWeight: 600 }}>{passport}</span>
                  <button
                    onClick={() => copyToClipboard(passport, 'Паспорт')}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: '#64748b' }}
                    title="Скопировать паспорт"
                  >
                    <Copy size={11} />
                  </button>
                </div>
              )}

              {inn && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>ИНН:</span>
                  <span style={{ fontWeight: 600 }}>{inn}</span>
                  <button
                    onClick={() => copyToClipboard(inn, 'ИНН')}
                    style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, color: '#64748b' }}
                    title="Скопировать ИНН"
                  >
                    <Copy size={11} />
                  </button>
                </div>
              )}

              {phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Телефон:</span>
                  <span style={{ fontWeight: 600 }}>{phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* List of Government Services */}
          <div>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 12 }}>
              Выберите веб-сервис для проверки
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {VERIFICATION_SERVICES.map(svc => {
                const IconComponent = svc.icon;
                return (
                  <div
                    key={svc.id}
                    onClick={() => handleOpenService(svc)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: svc.bg,
                      border: `1px solid ${svc.borderColor}`,
                      borderRadius: 16,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 12,
                        background: '#ffffff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                        flexShrink: 0
                      }}>
                        <IconComponent size={20} color={svc.color} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                            {svc.name}
                          </span>
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 6,
                            background: '#ffffff', color: svc.color, border: `1px solid ${svc.borderColor}`
                          }}>
                            {svc.category}
                          </span>
                        </div>
                        <p style={{ fontSize: 11, color: '#475569', margin: '3px 0 0 0', lineHeight: 1.3 }}>
                          {svc.desc}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      style={{
                        padding: '6px 12px', borderRadius: 10, border: 'none',
                        background: svc.color, color: '#ffffff',
                        fontSize: 12, fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 4,
                        cursor: 'pointer', flexShrink: 0, marginLeft: 10
                      }}
                    >
                      <span>Открыть</span>
                      <ExternalLink size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          background: 'var(--bg-light, #f8fafc)',
          borderTop: '1px solid var(--border-light, #e2e8f0)',
          borderRadius: '0 0 24px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
            <AlertTriangle size={13} color="#d97706" />
            <span>При открытии сервиса ФИО клиента автоматически копируется в буфер обмена.</span>
          </div>

          <button
            onClick={onClose}
            style={{
              padding: '8px 16px', borderRadius: 10, border: '1px solid #cbd5e1',
              background: '#ffffff', color: '#334155', fontSize: 12, fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
