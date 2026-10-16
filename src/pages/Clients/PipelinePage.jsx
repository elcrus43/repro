import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatPhone, formatNumber } from '../../utils/format';
import { Phone, User, Home, Tag } from 'lucide-react';

const EXCLUDED_TYPES = ['developer', 'agent', 'lawyer'];
const DEAL_TYPES = ['buyer', 'seller', 'landlord', 'tenant', 'lessor', 'lessee'];

const CLIENT_TYPE_INFO = {
  buyer:    { label: 'Покупатель',   color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.10)', border: 'rgba(59, 130, 246, 0.25)' },
  seller:   { label: 'Продавец',     color: '#10b981', bg: 'rgba(16, 185, 129, 0.10)', border: 'rgba(16, 185, 129, 0.25)' },
  landlord: { label: 'Наймодатель',  color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.10)', border: 'rgba(139, 92, 246, 0.25)' },
  tenant:   { label: 'Наниматель',   color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.10)', border: 'rgba(245, 158, 11, 0.25)' },
  lessor:   { label: 'Арендодатель', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.10)', border: 'rgba(139, 92, 246, 0.25)' },
  lessee:   { label: 'Арендатор',    color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.10)', border: 'rgba(245, 158, 11, 0.25)' },
};

const SEGMENTS = [
  { id: 'all',    label: 'Все клиенты' },
  { id: 'buyer',  label: 'Покупатели' },
  { id: 'seller', label: 'Продавцы' },
  { id: 'rent',   label: 'Аренда / Найм' },
];

export function PipelinePage({ initialSegment = 'all', scope = 'mine' }) {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const isAdmin = state.currentUser?.role === 'admin';

  // Normalize initial segment
  const defaultSegment = ['buyer', 'seller'].includes(initialSegment)
    ? initialSegment
    : ['landlord', 'tenant', 'lessor', 'lessee'].includes(initialSegment)
      ? 'rent'
      : 'all';

  const [activeSegment, setActiveSegment] = useState(defaultSegment);

  // Helper status mapping
  const mapStatus = (status) => {
    switch (status) {
      case 'new': return 'new';
      case 'refused': return 'refused';
      case 'search':
      case 'request':
      case 'selection': return 'selection';
      default: return 'active';
    }
  };

  // Base client pool: ONLY clients of deal types, STRICTLY excluding developers, agents, lawyers
  const dealClients = useMemo(() => {
    return (state.clients || []).filter(c => {
      const types = Array.isArray(c.client_types) ? c.client_types : (c.client_type ? [c.client_type] : []);

      // Strict exclusion: developers, agents, lawyers must NEVER be in pipeline
      const hasExcluded = types.some(t => EXCLUDED_TYPES.includes(t));
      if (hasExcluded) return false;

      // Must be a deal-related client
      const hasDealType = types.some(t => DEAL_TYPES.includes(t));
      if (!hasDealType) return false;

      // Scope check: my clients or all
      if (scope === 'mine' && !isAdmin) {
        return c.realtor_id === state.currentUser?.id;
      }
      return true;
    });
  }, [state.clients, scope, isAdmin, state.currentUser?.id]);

  // Counts per segment
  const segmentCounts = useMemo(() => {
    const counts = { all: dealClients.length, buyer: 0, seller: 0, rent: 0 };
    dealClients.forEach(c => {
      const types = Array.isArray(c.client_types) ? c.client_types : (c.client_type ? [c.client_type] : []);
      if (types.includes('buyer')) counts.buyer++;
      if (types.includes('seller')) counts.seller++;
      if (types.some(t => ['landlord', 'tenant', 'lessor', 'lessee'].includes(t))) counts.rent++;
    });
    return counts;
  }, [dealClients]);

  // Filtered by active segment
  const filteredClients = useMemo(() => {
    if (activeSegment === 'all') return dealClients;
    if (activeSegment === 'buyer') {
      return dealClients.filter(c => {
        const types = Array.isArray(c.client_types) ? c.client_types : (c.client_type ? [c.client_type] : []);
        return types.includes('buyer');
      });
    }
    if (activeSegment === 'seller') {
      return dealClients.filter(c => {
        const types = Array.isArray(c.client_types) ? c.client_types : (c.client_type ? [c.client_type] : []);
        return types.includes('seller');
      });
    }
    if (activeSegment === 'rent') {
      return dealClients.filter(c => {
        const types = Array.isArray(c.client_types) ? c.client_types : (c.client_type ? [c.client_type] : []);
        return types.some(t => ['landlord', 'tenant', 'lessor', 'lessee'].includes(t));
      });
    }
    return dealClients;
  }, [dealClients, activeSegment]);

  // Pipeline columns tailored to segment
  const pipelineColumns = useMemo(() => [
    { id: 'new',       label: 'Новый контакт',     color: '#6b7280' },
    {
      id: 'selection',
      label: activeSegment === 'seller' ? 'Оценка / Маркетинг' : activeSegment === 'buyer' ? 'Подбор объектов' : 'Подбор / Оценка',
      color: '#3b82f6'
    },
    { id: 'active',    label: 'В работе',          color: '#10b981' },
    { id: 'refused',   label: 'Отказ / Архив',     color: '#ef4444' },
  ], [activeSegment]);

  const columnMap = useMemo(() => {
    const map = {};
    pipelineColumns.forEach(col => {
      map[col.id] = filteredClients.filter(c => mapStatus(c.status) === col.id);
    });
    return map;
  }, [filteredClients, pipelineColumns]);

  const handleDrop = (e, columnId) => {
    e.preventDefault();
    const clientId = e.dataTransfer.getData('clientId');
    const client = filteredClients.find(c => c.id === clientId);
    if (client && mapStatus(client.status) !== columnId) {
      dispatch({ type: 'UPDATE_CLIENT', client: { ...client, status: columnId } });
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // Helper to get client's budget or request info
  const getClientMeta = (client) => {
    const types = Array.isArray(client.client_types) ? client.client_types : (client.client_type ? [client.client_type] : []);
    
    // For buyers / tenants / lessees: look for request budget
    if (types.some(t => ['buyer', 'tenant', 'lessee'].includes(t))) {
      const req = (state.requests || []).find(r => r.client_id === client.id || r.client_ids?.includes(client.id));
      if (req?.budget_max) {
        return { type: 'budget', text: `до ${formatNumber(req.budget_max)} ₽` };
      }
      if (client.budget_max) {
        return { type: 'budget', text: `до ${formatNumber(client.budget_max)} ₽` };
      }
    }

    // For sellers / landlords / lessors: look for property count
    if (types.some(t => ['seller', 'landlord', 'lessor'].includes(t))) {
      const count = (state.properties || []).filter(p => p.owner_id === client.id || p.client_id === client.id).length;
      if (count > 0) {
        return { type: 'property', text: `Объектов: ${count}` };
      }
    }

    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── СЕГМЕНТЫ ВОРОНКИ ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        paddingBottom: 4
      }}>
        {SEGMENTS.map(seg => {
          const isActive = activeSegment === seg.id;
          const count = segmentCounts[seg.id] || 0;
          return (
            <button
              key={seg.id}
              onClick={() => setActiveSegment(seg.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 12,
                border: isActive ? '1px solid var(--primary)' : '1px solid var(--border)',
                background: isActive ? 'var(--primary)' : 'var(--surface)',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.18s ease',
                boxShadow: isActive ? '0 2px 8px rgba(0, 82, 255, 0.22)' : 'none'
              }}
            >
              <span>{seg.label}</span>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--bg-light)',
                color: isActive ? '#ffffff' : 'var(--text)',
                padding: '1px 6px',
                borderRadius: 8
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── КАНБАН ДОСКА ВОРОНКИ ── */}
      <div className="pipeline-scrollbar" style={{
        overflowX: 'auto',
        scrollbarWidth: 'none',
        display: 'flex',
        gap: 12,
        padding: '4px 0 24px',
        width: '100%',
        boxSizing: 'border-box',
        minHeight: 460,
      }}>
        <style>{`
          .pipeline-scrollbar::-webkit-scrollbar { display: none; }
        `}</style>

        {pipelineColumns.map(column => {
          const cards = columnMap[column.id] || [];
          return (
            <div
              key={column.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
              style={{
                minWidth: 260,
                maxWidth: 320,
                flex: '1 0 260px',
                background: 'var(--bg-light)',
                borderRadius: 20,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {/* Column Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 4px', marginBottom: 2 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: column.color, flexShrink: 0
                }} />
                <span className="font-oswald" style={{
                  fontSize: 13, fontWeight: 500, color: 'var(--text)',
                  textTransform: 'uppercase', letterSpacing: '0.04em', flex: 1
                }}>
                  {column.label}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: column.color,
                  background: `${column.color}18`, borderRadius: 8,
                  padding: '2px 8px'
                }}>
                  {cards.length}
                </span>
              </div>

              {/* Empty Column Placeholder */}
              {cards.length === 0 && (
                <div style={{
                  border: `2px dashed ${column.color}33`,
                  borderRadius: 14,
                  padding: '28px 12px',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: 12,
                  opacity: 0.65
                }}>
                  Нет клиентов на этом этапе
                </div>
              )}

              {/* Client Cards */}
              {cards.map(client => {
                const types = Array.isArray(client.client_types) ? client.client_types : (client.client_type ? [client.client_type] : []);
                const validDealTypes = types.filter(t => DEAL_TYPES.includes(t));
                const meta = getClientMeta(client);
                const assignedRealtor = (state.users || []).find(u => u.id === client.realtor_id);

                return (
                  <div
                    key={client.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('clientId', client.id)}
                    className="card-clickable"
                    onClick={() => navigate(`/clients/${client.id}`)}
                    style={{
                      background: 'var(--surface)',
                      borderRadius: 16,
                      padding: 14,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
                      cursor: 'grab',
                      border: '1px solid var(--border-light)',
                      userSelect: 'none',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.09)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.05)';
                    }}
                  >
                    {/* Top Row: Full Name + Badges */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 600, color: 'var(--text)',
                        lineHeight: 1.3,
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                      }}>
                        {client.full_name}
                      </div>

                      {/* Type Badges */}
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                        {Boolean(client.has_agency_contract || client.agency_contract_date) && (
                          <span
                            title={`Агентский договор заключен${client.agency_contract_date ? ` от ${new Date(client.agency_contract_date).toLocaleDateString('ru-RU')}` : ''}`}
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: '#059669',
                              background: '#ecfdf5',
                              border: '1px solid #10b981',
                              borderRadius: 6,
                              padding: '1px 6px'
                            }}
                          >
                            АД
                          </span>
                        )}
                        {validDealTypes.map(t => {
                          const conf = CLIENT_TYPE_INFO[t] || { label: t, color: 'var(--text-secondary)', bg: 'var(--bg-light)', border: 'transparent' };
                          return (
                            <span
                              key={t}
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                color: conf.color,
                                background: conf.bg,
                                border: `1px solid ${conf.border}`,
                                borderRadius: 6,
                                padding: '1px 6px'
                              }}
                            >
                              {conf.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Middle Row: Phone & Budget/Property */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, fontSize: 11 }}>
                      {client.phone && (
                        <a
                          href={`tel:+${client.phone.replace(/\D/g, '')}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            color: 'var(--primary)',
                            textDecoration: 'none',
                            fontWeight: 500
                          }}
                        >
                          <Phone size={11} />
                          <span>{formatPhone(client.phone)}</span>
                        </a>
                      )}

                      {meta && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: meta.type === 'budget' ? 'var(--primary)' : 'var(--text)',
                          background: 'var(--bg-light)',
                          padding: '2px 6px',
                          borderRadius: 6,
                          marginLeft: 'auto'
                        }}>
                          {meta.text}
                        </span>
                      )}
                    </div>

                    {/* Bottom Row: Source & Realtor (if relevant) */}
                    {(client.source || (scope === 'all' && assignedRealtor)) && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 6,
                        borderTop: '1px solid var(--border-light)',
                        paddingTop: 6,
                        fontSize: 10,
                        color: 'var(--text-secondary)'
                      }}>
                        {client.source ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <Tag size={10} />
                            <span>{client.source}</span>
                          </span>
                        ) : <span />}

                        {scope === 'all' && assignedRealtor && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontWeight: 500, color: 'var(--text-muted)' }}>
                            <User size={10} />
                            <span>{assignedRealtor.name || assignedRealtor.full_name}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PipelinePage;
