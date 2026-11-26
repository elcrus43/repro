import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatNumber, formatPhone, stripPhone } from '../../utils/format';
import { 
  Pencil, 
  Trash2, 
  Sparkles, 
  User, 
  MapPin, 
  Building2, 
  ChevronRight, 
  ChevronLeft, 
  Phone, 
  FileText,
  BadgePercent,
  Layers,
  Maximize2,
  MessageCircle,
  Home,
  ExternalLink,
  Plus,
  BookmarkCheck
} from 'lucide-react';
import { PROPERTY_TYPES } from '../../data/constants';
import { hasPassedDealStage, isDealTypeCompatible } from '../../utils/matching';
import { useDevelopmentsCatalog } from '../../hooks/useDevelopmentsCatalog';
import { RequestDevelopmentsSection } from '../../components/RequestDevelopmentsSection';
import { ClientSearchPanel } from '../../components/ClientSearchPanel';

export function DetailsPage() {
  const { id } = useParams();
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const { developments, ksmLots, ksskLots, ksmProjects, ksskProjects } = useDevelopmentsCatalog({ includeLiveLots: true });
  const req = state.requests.find(r => r.id === id);
  const reqClientIds = Array.isArray(req?.client_ids) && req.client_ids.length > 0
    ? req.client_ids
    : (req?.client_id ? [req.client_id] : []);
  const clients = state.clients.filter(c => reqClientIds.includes(c.id));
  const clientSelectionItems = (state.selectionItems || []).filter(item => {
    if (reqClientIds.length === 0) return false;
    const itemClientIds = Array.isArray(item.client_ids) && item.client_ids.length > 0
      ? item.client_ids
      : (item.client_id ? [item.client_id] : []);
    return reqClientIds.some(cid => itemClientIds.includes(cid));
  });
  
  const status = req?.status || 'active';
  const isActive = status === 'active';
  
  const matches = isActive ? state.matches.filter(m => {
    if (m.request_id !== id) return false;
    const prop = state.properties.find(p => p.id === m.property_id);
    return prop && !hasPassedDealStage(prop, state.deals) && isDealTypeCompatible(prop, req);
  }) : [];

  if (!req) return (
    <div className="page fade-in">
      <div className="topbar sticky" style={{ background: 'var(--topbar-bg)', backdropFilter: 'blur(20px) saturate(180%)' }}>
        <button 
          type="button"
          className="card-clickable" 
          onClick={() => navigate('/requests')} 
          style={{ 
            width: 40, height: 40, borderRadius: 12, border: 'none', background: 'var(--surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text)'
          }}
          title="Назад к запросам"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="topbar-title font-oswald" style={{ fontWeight: 300, fontSize: 20 }}>Запрос не найден</span>
      </div>
    </div>
  );

  function handleUpdateStatus(newStatus) {
    if ((req.status || 'active') === newStatus) return;
    dispatch({
      type: 'UPDATE_REQUEST',
      request: {
        ...req,
        status: newStatus
      }
    });
  }

  function handleDelete() {
    if (window.confirm('Удалить этот запрос на подбор?')) {
      dispatch({ type: 'DELETE_REQUEST', id });
      navigate('/requests');
    }
  }

  async function handleDeleteSelectionItem(selectionId) {
    if (window.confirm('Удалить объект из подборки клиента?')) {
      await dispatch({ type: 'DELETE_SELECTION_ITEM', id: selectionId });
    }
  }

  // Format budget range
  const budgetText = req.budget_min > 0 && req.budget_max > 0
    ? `${formatNumber(req.budget_min)} - ${formatNumber(req.budget_max)} ₽`
    : req.budget_max > 0
      ? `до ${formatNumber(req.budget_max)} ₽`
      : req.budget_min > 0
        ? `от ${formatNumber(req.budget_min)} ₽`
        : 'Бюджет не указан';

  // Format rooms
  const roomsText = req.rooms && req.rooms.length > 0
    ? req.rooms.map(r => (r === 0 ? 'Студия' : `${r}-комн.`)).join(', ')
    : 'Любая комнатность';

  // Format area
  const areaText = req.area_min > 0 && req.area_max > 0
    ? `${req.area_min} - ${req.area_max} м²`
    : req.area_min > 0
      ? `от ${req.area_min} м²`
      : req.area_max > 0
        ? `до ${req.area_max} м²`
        : null;

  // Format floor
  const floorText = req.floor_min > 0 || req.floor_max > 0
    ? `${req.floor_min || 1} - ${req.floor_max || 'макс'} эт.`
    : null;

  return (
    <div className="page fade-in" style={{ background: 'var(--bg)' }}>
      {/* STICKY TOPBAR */}
      <div className="topbar sticky" style={{ 
        background: 'var(--topbar-bg)', 
        backdropFilter: 'blur(20px) saturate(180%)',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-light)',
        zIndex: 100,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <button 
            type="button"
            onClick={() => navigate('/requests')} 
            className="card-clickable" 
            style={{ 
              width: 38, height: 38, borderRadius: 12, border: 'none', 
              background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)', color: 'var(--text)', flexShrink: 0
            }}
            title="Назад к списку"
          >
            <ChevronLeft size={20} />
          </button>
          <div style={{ minWidth: 0 }}>
            <div className="font-oswald" style={{ letterSpacing: '0.01em', fontSize: 18, fontWeight: 400, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Детали запроса
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {clients[0]?.full_name ? `Покупатель: ${clients[0].full_name}` : 'Подбор недвижимости'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button 
            type="button"
            className="card-clickable" 
            onClick={() => navigate(`/requests/${id}/edit`)} 
            title="Редактировать запрос"
            style={{ 
              width: 38, height: 38, borderRadius: 12, border: 'none', 
              background: 'var(--surface)', color: 'var(--text)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)' 
            }}
          >
            <Pencil size={16} />
          </button>
          <button 
            type="button"
            className="card-clickable" 
            onClick={handleDelete} 
            title="Удалить запрос"
            style={{ 
              width: 38, height: 38, borderRadius: 12, border: 'none', 
              background: 'var(--surface)', color: 'var(--danger)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)' 
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="page-content" style={{ padding: '14px 16px 120px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        
        {/* COMPACT MASTER HERO CARD */}
        <div className="card" style={{ 
          padding: '16px', 
          border: '1px solid var(--border-light)', 
          borderRadius: 20, 
          background: 'var(--surface)',
          boxShadow: '0 6px 24px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>

          {/* Row 1: Client & Status Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            {/* Client info */}
            {clients.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                <div 
                  onClick={() => navigate(`/clients/${clients[0].id}`)}
                  className="card-clickable"
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, var(--primary) 0%, #2563eb 100%)',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'Medeo Sans', ui-sans-serif, sans-serif",
                    fontSize: 15,
                    fontWeight: 600,
                    flexShrink: 0
                  }}
                  title="Открыть карточку клиента"
                >
                  {(clients[0].full_name || '?').charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div 
                    onClick={() => navigate(`/clients/${clients[0].id}`)}
                    style={{ 
                      fontSize: 14, 
                      fontWeight: 600, 
                      color: 'var(--text)', 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis',
                      cursor: 'pointer'
                    }}
                  >
                    {clients[0].full_name}
                    {clients.length > 1 && (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>
                        +{clients.length - 1}
                      </span>
                    )}
                  </div>
                  {clients[0].phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <a 
                        href={`tel:${clients[0].phone}`} 
                        style={{ 
                          fontSize: 12, 
                          color: 'var(--primary)', 
                          fontWeight: 400, 
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <Phone size={11} />
                        {formatPhone(clients[0].phone)}
                      </a>
                      {clients[0].phone && (
                        <a 
                          href={`https://wa.me/${stripPhone(clients[0].phone)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Написать в WhatsApp"
                          style={{
                            fontSize: 10,
                            padding: '1px 6px',
                            borderRadius: 6,
                            background: 'rgba(16, 185, 129, 0.1)',
                            color: '#10b981',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 3,
                            fontWeight: 500
                          }}
                        >
                          <MessageCircle size={10} /> WA
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                <User size={16} />
                <span>Клиент не привязан</span>
              </div>
            )}

            {/* Status Switcher Pill */}
            <div style={{ 
              display: 'inline-flex', 
              background: 'var(--bg-light)', 
              padding: 3, 
              borderRadius: 12, 
              gap: 3,
              border: '1px solid var(--border-light)',
              flexShrink: 0
            }}>
              <button
                type="button"
                onClick={() => handleUpdateStatus('active')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 9,
                  border: 'none',
                  fontSize: 11.5,
                  fontFamily: "'Medeo Sans', ui-sans-serif, sans-serif",
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? '#10b981' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 2px 6px rgba(16, 185, 129, 0.25)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#fff' : '#10b981' }} />
                Актуально
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus('completed')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 9,
                  border: 'none',
                  fontSize: 11.5,
                  fontFamily: "'Medeo Sans', ui-sans-serif, sans-serif",
                  fontWeight: !isActive ? 600 : 400,
                  background: !isActive ? '#64748b' : 'transparent',
                  color: !isActive ? '#ffffff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: !isActive ? '0 2px 6px rgba(100, 116, 139, 0.25)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: !isActive ? '#fff' : '#64748b' }} />
                Завершен
              </button>
            </div>
          </div>

          {/* Row 2: Financials & Budget Highlight */}
          <div style={{ 
            background: 'var(--bg-light)', 
            padding: '10px 14px', 
            borderRadius: 14, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10
          }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Бюджет на покупку
              </div>
              <div className="font-oswald" style={{ fontSize: 20, fontWeight: 400, color: 'var(--primary)', letterSpacing: '0.01em', marginTop: 1 }}>
                {budgetText}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {req.commission > 0 && (
                <div style={{ 
                  padding: '4px 9px', 
                  borderRadius: 8, 
                  background: 'rgba(16, 185, 129, 0.12)', 
                  color: '#059669', 
                  fontSize: 11, 
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <BadgePercent size={12} />
                  <span>Комиссия: {formatNumber(req.commission)} ₽</span>
                </div>
              )}
              <div style={{ 
                padding: '4px 9px', 
                borderRadius: 8, 
                background: req.mortgage ? 'rgba(0, 82, 255, 0.1)' : 'rgba(100, 116, 139, 0.1)', 
                color: req.mortgage ? 'var(--primary)' : 'var(--text-secondary)', 
                fontSize: 11, 
                fontWeight: 500
              }}>
                {req.mortgage ? 'Ипотека: Да' : 'Без ипотеки'}
              </div>
            </div>
          </div>

          {/* Row 3: Compact Criteria Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {/* Property type */}
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 5, 
              padding: '5px 10px', 
              borderRadius: 10, 
              background: 'var(--bg-light)', 
              fontSize: 12, 
              color: 'var(--text)', 
              fontWeight: 500 
            }}>
              <Building2 size={13} color="var(--primary)" />
              <span>{req.property_types?.map(t => PROPERTY_TYPES[t] || t).join(', ') || 'Любой объект'}</span>
            </div>

            {/* Rooms */}
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 5, 
              padding: '5px 10px', 
              borderRadius: 10, 
              background: 'var(--bg-light)', 
              fontSize: 12, 
              color: 'var(--text)', 
              fontWeight: 500 
            }}>
              <Home size={13} color="var(--primary)" />
              <span>{roomsText}</span>
            </div>

            {/* Area */}
            {areaText && (
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 5, 
                padding: '5px 10px', 
                borderRadius: 10, 
                background: 'var(--bg-light)', 
                fontSize: 12, 
                color: 'var(--text)', 
                fontWeight: 500 
              }}>
                <Maximize2 size={13} color="var(--primary)" />
                <span>{areaText}</span>
              </div>
            )}

            {/* Floor */}
            {floorText && (
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 5, 
                padding: '5px 10px', 
                borderRadius: 10, 
                background: 'var(--bg-light)', 
                fontSize: 12, 
                color: 'var(--text)', 
                fontWeight: 500 
              }}>
                <Layers size={13} color="var(--primary)" />
                <span>{floorText}</span>
              </div>
            )}

            {/* Location / Districts */}
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 5, 
              padding: '5px 10px', 
              borderRadius: 10, 
              background: 'var(--bg-light)', 
              fontSize: 12, 
              color: 'var(--text)', 
              fontWeight: 500 
            }}>
              <MapPin size={13} color="#f59e0b" />
              <span>
                {req.city || 'Киров'}: {req.districts && req.districts.length > 0 ? req.districts.join(', ') : 'все районы'}
              </span>
            </div>
          </div>

          {/* Row 4: Notes (if any) */}
          {req.notes && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: 8, 
              padding: '9px 12px', 
              borderRadius: 12, 
              background: 'var(--bg-light)', 
              fontSize: 12, 
              lineHeight: 1.45, 
              color: 'var(--text-secondary)' 
            }}>
              <FileText size={14} style={{ flexShrink: 0, marginTop: 2, opacity: 0.6 }} />
              <div style={{ whiteSpace: 'pre-wrap', minWidth: 0, flex: 1 }}>{req.notes}</div>
            </div>
          )}

          {/* Row 5: Matches Banner / CTA */}
          {isActive ? (
            <button 
              type="button"
              className="card-clickable" 
              onClick={() => navigate(`/matches?request=${id}`)}
              style={{ 
                alignSelf: 'flex-start',
                height: 30, 
                borderRadius: 8, 
                border: 'none', 
                background: 'linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%)', 
                color: '#ffffff',
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: 8,
                padding: '0 10px',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 82, 255, 0.2)',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500 }}>
                <Sparkles size={13} />
                <span>Подходящие объекты в базе CRM:</span>
                <span style={{ 
                  background: 'rgba(255, 255, 255, 0.25)', 
                  padding: '1px 6px', 
                  borderRadius: 6, 
                  fontWeight: 700, 
                  fontSize: 11 
                }}>
                  {matches.length}
                </span>
              </div>
              <ChevronRight size={14} />
            </button>
          ) : (
            <div style={{ 
              padding: '10px 14px', 
              borderRadius: 12, 
              fontSize: 12, 
              fontWeight: 400, 
              background: 'var(--bg-light)', 
              color: 'var(--text-muted)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: 8,
              border: '1px dashed var(--border-light)'
            }}>
              <Sparkles size={14} style={{ opacity: 0.4 }} />
              <span>Запрос завершен - не участвует в анализе совпадений</span>
            </div>
          )}

        </div>

        {/* Client Selection Items (including Avito / portals / manual) */}
        <div style={{
          padding: '16px',
          borderRadius: 20,
          background: 'var(--surface)',
          border: '1px solid var(--border-light)',
          boxShadow: '0 4px 18px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <BookmarkCheck size={16} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="font-oswald" style={{ fontSize: 16, fontWeight: 400, color: 'var(--text)' }}>
                    Объекты в подборе
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 999,
                    background: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed'
                  }}>
                    {clientSelectionItems.length}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 300 }}>
                  Добавленные варианты с Авито, ЦИАН, ДомКлик и вручную
                </div>
              </div>
            </div>

            {reqClientIds[0] && (
              <button
                type="button"
                onClick={() => navigate(`/selection/new?client=${reqClientIds[0]}&returnTo=/requests/${id}`)}
                className="card-clickable"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '5px 10px', borderRadius: 8,
                  background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed',
                  border: '1px solid rgba(124, 58, 237, 0.25)',
                  fontSize: 11.5, fontWeight: 600, cursor: 'pointer'
                }}
              >
                <Plus size={13} /> Добавить
              </button>
            )}
          </div>

          {clientSelectionItems.length === 0 ? (
            <div style={{
              padding: '12px 14px',
              borderRadius: 12,
              background: 'var(--bg-light)',
              border: '1px dashed var(--border-light)',
              fontSize: 12,
              color: 'var(--text-muted)',
              textAlign: 'center'
            }}>
              В подборке клиента пока нет добавленных объектов
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {clientSelectionItems.map(item => {
                const parts = [];
                if (item.rooms !== undefined && item.rooms !== null) {
                  parts.push(item.rooms === 0 ? 'Студия' : `${item.rooms}к`);
                }
                if (item.area_total) parts.push(`${item.area_total} м²`);
                if (item.floor || item.floors_total) {
                  if (item.floor && item.floors_total) parts.push(`${item.floor}/${item.floors_total} эт.`);
                  else if (item.floor) parts.push(`${item.floor} эт.`);
                  else parts.push(`${item.floors_total} эт.`);
                }
                if (item.property_type) {
                  parts.push(PROPERTY_TYPES[item.property_type] || item.property_type);
                }

                const firstImage = Array.isArray(item.images) && item.images.length > 0 ? item.images[0] : null;
                const linkStr = String(item.link || '').toLowerCase();
                const sourceLabel = linkStr.includes('avito.ru')
                  ? 'Авито'
                  : linkStr.includes('cian.ru')
                    ? 'ЦИАН'
                    : linkStr.includes('domclick.ru')
                      ? 'ДомКлик'
                      : null;

                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 14,
                      background: 'var(--bg-light)',
                      border: '1px solid var(--border-light)',
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start'
                    }}
                  >
                    {firstImage ? (
                      <img
                        src={firstImage}
                        alt={item.address || 'Объект'}
                        style={{
                          width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0,
                          background: 'var(--surface)', border: '1px solid var(--border-light)'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 56, height: 56, borderRadius: 10,
                        background: 'rgba(124, 58, 237, 0.08)', color: '#7c3aed',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                      }}>
                        <Building2 size={22} />
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span className="font-oswald" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                          {item.price ? `${formatNumber(item.price)} ₽` : 'Цена не указана'}
                        </span>
                        {sourceLabel && (
                          <span style={{
                            fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 6,
                            background: 'rgba(0, 82, 255, 0.1)', color: 'var(--primary)'
                          }}>
                            {sourceLabel}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ wordBreak: 'break-word' }}>
                          {item.city ? (item.address ? `${item.city}, ${item.address}` : item.city) : (item.address || 'Адрес не указан')}
                        </span>
                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              fontSize: 10, color: 'var(--primary)',
                              background: 'rgba(0, 82, 255, 0.08)', padding: '2px 6px',
                              borderRadius: 6, textDecoration: 'none', fontWeight: 600
                            }}
                          >
                            <ExternalLink size={10} /> Открыть
                          </a>
                        )}
                      </div>

                      {parts.length > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                          {parts.join(' · ')}
                        </div>
                      )}

                      {item.notes && (
                        <div style={{ fontSize: 10.5, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                          {item.notes}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={() => navigate(`/selection/${item.id}/edit`)}
                        title="Редактировать объект"
                        style={{
                          border: 'none', background: 'rgba(0, 82, 255, 0.08)',
                          color: 'var(--primary)', padding: 5, borderRadius: 6,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSelectionItem(item.id)}
                        title="Удалить из подбора"
                        style={{
                          border: 'none', background: 'rgba(239, 68, 68, 0.08)',
                          color: '#ef4444', padding: 5, borderRadius: 6,
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* New Buildings Suggestions */}
        <RequestDevelopmentsSection
          request={req}
          developments={developments}
          ksmLots={ksmLots}
          ksskLots={ksskLots}
          ksmProjects={ksmProjects}
          ksskProjects={ksskProjects}
        />

        {/* Live market search + my properties */}
        {isActive && <ClientSearchPanel request={req} />}

      </div>
    </div>
  );
}
