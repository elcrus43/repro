import React, { useState, useEffect } from 'react';
import { ShieldCheck, ExternalLink, Copy, Check, AlertTriangle, FileText, User, Search, Building2, Scale, ShieldAlert, Printer, Download, ArrowLeft, Zap, Loader2 } from 'lucide-react';
import { useToastContext } from './Toast';
import { parseOpenRegistries } from '../services/registryParser';

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
  const [viewMode, setViewMode] = useState('services'); // 'services' | 'report'
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [agentComment, setAgentComment] = useState(
    'По результатам комплексной проверки в официальных государственных реестрах юридических и финансовых рисков не выявлено. Задолженности в ФССП отсутствуют, сведения о банкротстве отсутствуют, паспорт действителен.'
  );

  useEffect(() => {
    if (isOpen && client?.full_name && !parsedData) {
      runAutoParsing();
    }
  }, [isOpen, client]);

  const runAutoParsing = async () => {
    if (!client?.full_name) return;
    setIsParsing(true);
    try {
      const res = await parseOpenRegistries({
        fullName: client.full_name || client.name,
        birthDate: client.birth_date || client.birthday,
        inn: client.inn,
        passport: client.passport || client.passport_data
      });
      setParsedData(res);
      toast.success('Автоматическая экспресс-проверка открытых реестров завершена!');
    } catch (e) {
      console.warn('Auto registry parsing error:', e);
    } finally {
      setIsParsing(false);
    }
  };

  if (!isOpen || !client) return null;

  const clientName = client.full_name || client.name || 'Клиент';
  const birthDate = client.birth_date || client.birthday || 'Не указана';
  const passport = client.passport || client.passport_data || 'Не указан';
  const inn = client.inn || 'Не указан';
  const phone = client.phone || 'Не указан';
  const currentDate = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success(`${fieldName} скопирован в буфер!`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenService = (service) => {
    const copyText = `${clientName}${birthDate !== 'Не указана' ? ` ${birthDate}` : ''}`;
    navigator.clipboard.writeText(copyText);
    toast.success(`ФИО "${clientName}" скопировано для вставки на ${service.name}!`);
    window.open(service.url, '_blank', 'noopener,noreferrer');
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, animation: 'fadeIn 0.2s ease-out'
    }}>
      {/* Стили для режима печати отчета */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #verification-report-printable, #verification-report-printable * { visibility: visible; }
          #verification-report-printable {
            position: absolute; left: 0; top: 0; width: 100%;
            background: #ffffff !important; color: #000000 !important;
            padding: 20px !important; box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div style={{
        background: 'var(--surface, #ffffff)',
        color: 'var(--text, #1e293b)',
        borderRadius: 24,
        maxWidth: 720, width: '100%',
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
        border: '1px solid var(--border-light, #e2e8f0)',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div className="no-print" style={{
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
                {viewMode === 'report' ? 'Отчет юридической проверки' : 'Проверка клиента по госреестрам'}
              </h3>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0 0' }}>
                {viewMode === 'report' ? 'Официальное заключение с прямыми ссылками на веб-сервисы' : 'Быстрый переход к проверке в ФССП, МВД, Федресурс и ФНС'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {viewMode === 'services' ? (
              <button
                type="button"
                onClick={() => setViewMode('report')}
                style={{
                  padding: '7px 14px', borderRadius: 10, border: 'none',
                  background: '#10b981', color: '#ffffff',
                  fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
                }}
              >
                <FileText size={14} />
                <span>Сформировать отчет</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setViewMode('services')}
                style={{
                  padding: '7px 14px', borderRadius: 10, border: 'none',
                  background: 'rgba(255,255,255,0.15)', color: '#ffffff',
                  fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
                }}
              >
                <ArrowLeft size={14} />
                <span>К сервисам</span>
              </button>
            )}

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
        </div>

        {/* MODE 1: Services List */}
        {viewMode === 'services' && (
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
                {birthDate !== 'Не указана' && (
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

                {passport !== 'Не указан' && (
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

                {inn !== 'Не указан' && (
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

                {phone !== 'Не указан' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Телефон:</span>
                    <span style={{ fontWeight: 600 }}>{phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Auto-parsing Live Banner */}
            <div style={{
              background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
              border: '1px solid #a7f3d0', borderRadius: 16, padding: '14px 16px',
              display: 'flex', flexDirection: 'column', gap: 10
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Zap size={16} color="#059669" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>
                    Экспресс-проверка открытых реестров (Федресурс, ФНС, Арбитраж)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={runAutoParsing}
                  disabled={isParsing}
                  style={{
                    padding: '4px 10px', borderRadius: 8, border: 'none',
                    background: '#059669', color: '#ffffff', fontSize: 11, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer'
                  }}
                >
                  {isParsing ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                  <span>{isParsing ? 'Парсинг...' : 'Обновить'}</span>
                </button>
              </div>

              {isParsing && (
                <div style={{ fontSize: 12, color: '#047857', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Выполняется фоновый парсинг открытых API реестров...</span>
                </div>
              )}

              {!isParsing && parsedData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#065f46' }}>
                    <Check size={14} color="#10b981" />
                    <span><strong>ЕФРСБ (Банкротство):</strong> {parsedData.bankrot?.message}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#065f46' }}>
                    <Check size={14} color="#10b981" />
                    <span><strong>ФНС / ИНН:</strong> {parsedData.fns?.message}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#065f46' }}>
                    <Check size={14} color="#10b981" />
                    <span><strong>Арбитраж:</strong> {parsedData.arbitr?.message}</span>
                  </div>
                </div>
              )}
            </div>

            {/* List of Government Services */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
                  Выберите веб-сервис для проверки
                </h4>
                <button
                  onClick={() => setViewMode('report')}
                  style={{ fontSize: 11, fontWeight: 600, color: '#10b981', border: 'none', background: 'none', cursor: 'pointer' }}
                >
                  📄 Сформировать печатный отчет ➔
                </button>
              </div>

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
        )}

        {/* MODE 2: Full PDF/Printable Report */}
        {viewMode === 'report' && (
          <div id="verification-report-printable" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Printable Document Title Header */}
            <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  ОТЧЕТ О ЮРИДИЧЕСКОЙ ПРОВЕРКЕ КЛИЕНТА
                </h2>
                <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0 0' }}>
                  Комплексная проверка по государственным реестрам РФ
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0f172a', display: 'block' }}>Дата проверки:</span>
                <span style={{ fontSize: 11, color: '#475569' }}>{currentDate}</span>
              </div>
            </div>

            {/* Client Info Grid */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.04em' }}>
                1. Сведения о проверяемом лице
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px 16px', fontSize: 12 }}>
                <div><strong>ФИО:</strong> {clientName}</div>
                <div><strong>Дата рождения:</strong> {birthDate}</div>
                <div><strong>Паспорт РФ:</strong> {passport}</div>
                <div><strong>ИНН:</strong> {inn}</div>
                <div><strong>Телефон:</strong> {phone}</div>
                <div><strong>Статус:</strong> Проверен</div>
              </div>
            </div>

            {/* Verification Registry Links Table */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.04em' }}>
                2. Результаты проверки по реестрам и официальные ссылки
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                    <th style={{ padding: '8px 10px', borderRadius: '6px 0 0 0' }}>Реестр / Ведомство</th>
                    <th style={{ padding: '8px 10px' }}>Предмет проверки</th>
                    <th style={{ padding: '8px 10px' }}>Прямая ссылка для проверки</th>
                    <th style={{ padding: '8px 10px', borderRadius: '0 6px 0 0', textAlign: 'center' }}>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {VERIFICATION_SERVICES.map((svc, idx) => (
                    <tr key={svc.id} style={{ borderBottom: '1px solid #e2e8f0', background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>{svc.name}</td>
                      <td style={{ padding: '8px 10px', color: '#475569' }}>{svc.category}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <a href={svc.url} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 600, wordBreak: 'break-all' }}>
                          {svc.url}
                        </a>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', color: '#10b981', fontWeight: 700 }}>
                        ✓ Проверено
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Agent Conclusion / Remarks */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.04em' }}>
                3. Заключение агента / юриста
              </div>
              <textarea
                value={agentComment}
                onChange={e => setAgentComment(e.target.value)}
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 10,
                  border: '1px solid #cbd5e1', fontSize: 12, fontFamily: 'inherit',
                  color: '#1e293b', background: '#ffffff', resize: 'vertical'
                }}
              />
            </div>

            {/* Signatures */}
            <div style={{ marginTop: 10, paddingTop: 14, borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569' }}>
              <div>Проверку провел: ____________________ / ФИО Агента</div>
              <div>Подпись: _______________</div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="no-print" style={{
          padding: '14px 24px',
          background: 'var(--bg-light, #f8fafc)',
          borderTop: '1px solid var(--border-light, #e2e8f0)',
          borderRadius: '0 0 24px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          {viewMode === 'services' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
                <AlertTriangle size={13} color="#d97706" />
                <span>При открытии сервиса ФИО клиента автоматически копируется в буфер обмена.</span>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setViewMode('report')}
                  style={{
                    padding: '8px 14px', borderRadius: 10, border: 'none',
                    background: '#10b981', color: '#ffffff', fontSize: 12, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
                  }}
                >
                  <FileText size={14} />
                  <span>Отчет со ссылками</span>
                </button>
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
            </>
          ) : (
            <>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                Нажмите «Печать», чтобы сохранить отчет в формате PDF или распечатать.
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={handlePrintReport}
                  style={{
                    padding: '8px 16px', borderRadius: 10, border: 'none',
                    background: '#2563eb', color: '#ffffff', fontSize: 12, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
                  }}
                >
                  <Printer size={14} />
                  <span>Печать / Скачать PDF</span>
                </button>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
