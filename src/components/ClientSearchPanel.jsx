/**
 * src/components/ClientSearchPanel.jsx
 *
 * Панель автоподбора объектов для клиентского запроса:
 *  1. 🌐 Автоподбор: Авито · ЦИАН · ДомКлик с прямыми ссылками и фильтрами
 *  2. 🔔 Оповещения в Telegram и Web Push о новых подходящих объектах
 *  3. 🏠 Мои объекты из локальной базы риелтора
 */

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ExternalLink, PlusCircle, Check, AlertCircle,
  Home, ChevronDown, ChevronUp, Loader2, Globe, RefreshCw,
  Bell, Send, CheckCircle2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToastContext } from './Toast';
import { useClientSearch, getSourceLabel, getSourceColor } from '../hooks/useClientSearch';
import { buildPortalSearchLinks } from '../utils/portalUrls';
import { formatNumber } from '../utils/format';
import { hasPassedDealStage, isDealTypeCompatible } from '../utils/matching';
import { nanoid } from '../utils/nanoid';

// ── helpers ──────────────────────────────────────────────────────────────────

const ROOM_FALLBACK_PHOTOS = {
  0: 'https://storage.yandexcloud.net/zhelezno-media/media/p/ps/i/8adcc3a123fba1b59edd563bf8b7cd156b757d4e.jpg',
  1: 'https://storage.yandexcloud.net/zhelezno-media/media/p/ps/i/74d49dd475c6b09c3d66e56c268f58d661be02ac.jpg',
  2: 'https://storage.yandexcloud.net/zhelezno-media/media/p/ps/i/ffc5c71c6abc1e2c9bbc17112bff4d31ac2da238.jpg',
  3: 'https://storage.yandexcloud.net/zhelezno-media/media/p/ps/i/a671f9897579c8f3a2faa251adb65f70f755bd26.jpg',
  4: 'https://storage.yandexcloud.net/zhelezno-media/media/p/ps/i/be0b0b51c6ec9ebb35bc169f5c9a27a35c9bf3fb.jpg',
  default: '/images/developments/zhk-bulychev.jpg',
};

function getListingPhoto(item) {
  if (item.image_url && typeof item.image_url === 'string' && (item.image_url.startsWith('http') || item.image_url.startsWith('/'))) {
    return item.image_url;
  }
  const rooms = item.rooms ?? 1;
  return ROOM_FALLBACK_PHOTOS[rooms] || ROOM_FALLBACK_PHOTOS.default;
}

function sourceIcon(source) {
  const icons = { avito: '🔵', cian: '🔴', domclick: '🟢', yandex: '🟡', m2: '🟠' };
  return icons[source] || '🌐';
}

function matchMyProperties(properties, request, deals, currentUser) {
  if (!Array.isArray(properties) || properties.length === 0 || !request) return [];

  const reqRooms = new Set((request.rooms || []).map(Number));
  const hasRoomFilter = reqRooms.size > 0;
  const reqCity = (request.city || 'Киров').trim().toLowerCase();

  return properties.filter(prop => {
    if (!prop || typeof prop !== 'object') return false;

    // Исключаем демо-объекты из seed
    if (typeof prop.id === 'string' && /^p\d+$/i.test(prop.id)) {
      return false;
    }

    // Проверяем принадлежность риелтору (если не админ)
    if (currentUser?.id && prop.realtor_id && currentUser.role !== 'admin') {
      if (prop.realtor_id !== currentUser.id) return false;
    }

    // Исключаем объекты не из города запроса
    if (prop.city) {
      const propCity = prop.city.trim().toLowerCase();
      if (!propCity.includes(reqCity) && !reqCity.includes(propCity)) {
        return false;
      }
    }

    // Пропускаем объекты, которые уже проданы или находятся в закрытой сделке
    if (hasPassedDealStage(prop, deals)) return false;

    // Совместимость типа сделки (продажа / аренда)
    if (!isDealTypeCompatible(prop, request)) return false;

    // Тип недвижимости (квартира, дом и т.д.)
    if (Array.isArray(request.property_types) && request.property_types.length > 0) {
      const pt = prop.property_type || 'apartment';
      if (!request.property_types.includes(pt)) return false;
    }

    // Комнатность
    if (hasRoomFilter) {
      if (prop.rooms === undefined || prop.rooms === null) return false;
      if (!reqRooms.has(Number(prop.rooms))) return false;
    }

    // Бюджет
    const price = Number(prop.price || 0);
    if (price <= 0) return false;
    if (request.budget_max && Number(request.budget_max) > 0 && price > Number(request.budget_max)) {
      return false;
    }
    if (request.budget_min && Number(request.budget_min) > 0 && price < Number(request.budget_min)) {
      return false;
    }

    // Площадь
    const area = Number(prop.area_total || prop.total_area || 0);
    if (request.area_min && Number(request.area_min) > 0 && area > 0 && area < Number(request.area_min)) {
      return false;
    }
    if (request.area_max && Number(request.area_max) > 0 && area > 0 && area > Number(request.area_max)) {
      return false;
    }

    // Район
    if (Array.isArray(request.districts) && request.districts.length > 0) {
      const propDistrict = `${prop.district || ''} ${prop.address || ''}`.toLowerCase();
      const matchesDistrict = request.districts.some(d => d && propDistrict.includes(d.toLowerCase()));
      if (!matchesDistrict) return false;
    }

    return true;
  });
}

// ── sub-components ───────────────────────────────────────────────────────────

function LiveResultCard({ item, onAddToSelection, isInSelection }) {
  const color = getSourceColor(item.source);
  const label = getSourceLabel(item.source);
  const initialPhoto = getListingPhoto(item);
  const [photoSrc, setPhotoSrc] = useState(initialPhoto);

  return (
    <div style={{
      padding: '14px',
      borderRadius: 20,
      background: 'var(--surface)',
      border: '1.5px solid var(--border-light)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ position: 'relative', width: 70, height: 70, flexShrink: 0 }}>
          <img
            src={photoSrc}
            alt={item.title || ''}
            loading="lazy"
            onError={() => {
              const fallback = ROOM_FALLBACK_PHOTOS[item.rooms ?? 1] || ROOM_FALLBACK_PHOTOS.default;
              if (photoSrc !== fallback) {
                setPhotoSrc(fallback);
              }
            }}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: 14,
              objectFit: 'cover',
              border: '1px solid var(--border-light)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          />
          <span style={{
            position: 'absolute',
            bottom: -3,
            right: -3,
            fontSize: 13,
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
          }}>
            {sourceIcon(item.source)}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Source badge */}
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
            background: `${color}22`, color, border: `1px solid ${color}44`,
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            {label}
          </span>
          {/* Title */}
          <div style={{
            fontSize: 13, fontWeight: 500, color: 'var(--text)', marginTop: 5,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {item.title || `${item.rooms ?? '?'}-комн. · ${item.total_area ?? '?'} м²`}
          </div>
          {/* Address */}
          {item.address && (
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 300, marginTop: 2 }}>
              {item.address}
            </div>
          )}
        </div>
      </div>

      {/* Stats pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--primary)', fontFamily: "'Medeo Sans', ui-sans-serif" }}>
          {formatNumber(item.price)} ₽
        </span>
        {item.rooms !== null && item.rooms !== undefined && (
          <span style={pillStyle}>{item.rooms === 0 ? 'Студия' : `${item.rooms} комн.`}</span>
        )}
        {item.total_area && (
          <span style={pillStyle}>{item.total_area} м²</span>
        )}
        {item.floor && item.total_floors && (
          <span style={pillStyle}>{item.floor}/{item.total_floors} эт.</span>
        )}
        {item.building_type && (
          <span style={pillStyle}>{item.building_type}</span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: 8 }}>
        <a
          href={item.source_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--surface)',
            color: 'var(--text)', fontSize: 12, fontWeight: 500,
            textDecoration: 'none', cursor: 'pointer',
          }}
        >
          <ExternalLink size={13} />
          <span>Открыть на {label}</span>
        </a>
        <button
          type="button"
          onClick={() => onAddToSelection(item)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 500,
            cursor: 'pointer', border: 'none',
            background: isInSelection ? 'rgba(16,185,129,0.14)' : 'var(--primary)',
            color: isInSelection ? '#047857' : '#fff',
          }}
        >
          {isInSelection ? <Check size={13} /> : <PlusCircle size={13} />}
          <span>{isInSelection ? 'В подборке' : 'В подборку'}</span>
        </button>
      </div>
    </div>
  );
}

function MyPropertyCard({ prop, onAddToSelection, isInSelection }) {
  const navigate = useNavigate();
  const defaultPhoto = ROOM_FALLBACK_PHOTOS[prop.rooms ?? 1] || ROOM_FALLBACK_PHOTOS.default;
  const initialImg = prop.images?.[0] || prop.image_url || defaultPhoto;
  const [photoSrc, setPhotoSrc] = useState(initialImg);

  return (
    <div
      className="card-clickable"
      onClick={() => navigate(`/properties/${prop.id}`)}
      style={{
        padding: '14px', borderRadius: 20,
        background: 'var(--surface)',
        border: '1.5px solid rgba(16,185,129,0.25)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        display: 'flex', flexDirection: 'column', gap: 10,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <img
          src={photoSrc}
          alt={prop.address || ''}
          loading="lazy"
          onError={() => {
            if (photoSrc !== defaultPhoto) {
              setPhotoSrc(defaultPhoto);
            }
          }}
          style={{
            width: 70, height: 70, borderRadius: 14, objectFit: 'cover', flexShrink: 0,
            border: '1px solid rgba(16,185,129,0.2)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
            background: 'rgba(16,185,129,0.14)', color: '#047857',
            border: '1px solid rgba(16,185,129,0.3)', textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            Мой объект
          </span>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginTop: 5 }}>
            {prop.address || 'Адрес не указан'}
          </div>
          {prop.district && (
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 300, marginTop: 2 }}>
              {prop.district}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#047857', fontFamily: "'Medeo Sans', ui-sans-serif" }}>
          {formatNumber(prop.price)} ₽
        </span>
        {prop.rooms !== null && prop.rooms !== undefined && (
          <span style={pillStyle}>{prop.rooms === 0 ? 'Студия' : `${prop.rooms} комн.`}</span>
        )}
        {prop.area_total && <span style={pillStyle}>{prop.area_total} м²</span>}
        {prop.floor && prop.floors_total && <span style={pillStyle}>{prop.floor}/{prop.floors_total} эт.</span>}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid var(--border-light)', paddingTop: 8 }}>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onAddToSelection(prop); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 500,
            cursor: 'pointer', border: 'none',
            background: isInSelection ? 'rgba(16,185,129,0.14)' : '#10b981',
            color: isInSelection ? '#047857' : '#fff',
          }}
        >
          {isInSelection ? <Check size={13} /> : <PlusCircle size={13} />}
          <span>{isInSelection ? 'В подборке' : 'В подборку'}</span>
        </button>
      </div>
    </div>
  );
}

const pillStyle = {
  fontSize: 11, padding: '3px 8px', borderRadius: 8,
  background: 'var(--bg-light)', border: '1px solid var(--border-light)', color: 'var(--text)',
};

// ── main component ────────────────────────────────────────────────────────────

const SECTION_LIMIT = 5;

/**
 * @param {{ request: object }} props
 */
export function ClientSearchPanel({ request }) {
  const { state, dispatch } = useApp();
  const { toast } = useToastContext();
  const {
    results, loading, telegramLoading, error, sources,
    lastSearched, search, sendTelegramAlert
  } = useClientSearch(request);

  const [showAllLive, setShowAllLive] = useState(false);
  const [showAllMine, setShowAllMine] = useState(false);
  const [selectedPortal, setSelectedPortal] = useState('all');
  const [alertsEnabled, setAlertsEnabled] = useState(() => {
    return localStorage.getItem(`rea_auto_alert_${request?.id}`) !== 'false';
  });

  // Прямые ссылки на Авито, ЦИАН, ДомКлик
  const portalLinks = useMemo(() => buildPortalSearchLinks(request), [request]);

  // Мои объекты, подходящие локально
  const myMatches = useMemo(
    () => matchMyProperties(state.properties, request, state.deals, state.currentUser),
    [state.properties, state.deals, request, state.currentUser]
  );

  const requestClientIds = useMemo(() => {
    if (!request) return [];
    if (Array.isArray(request.client_ids) && request.client_ids.length > 0) return request.client_ids;
    return request.client_id ? [request.client_id] : [];
  }, [request]);

  const clientName = useMemo(() => {
    if (!request) return 'Покупатель';
    const c = (state.clients || []).find(cl => cl.id === (requestClientIds[0] || request.client_id));
    return c?.full_name || 'Покупатель';
  }, [request, requestClientIds, state.clients]);

  // Проверка наличия объекта в подборке
  const isLiveInSelection = (item) => {
    return (state.selectionItems || []).some(sel => {
      if (sel.link !== item.source_url) return false;
      if (requestClientIds.length === 0) return true;
      const selClients = Array.isArray(sel.client_ids) && sel.client_ids.length > 0
        ? sel.client_ids : (sel.client_id ? [sel.client_id] : []);
      return requestClientIds.some(cid => selClients.includes(cid));
    });
  };

  const isMyPropInSelection = (prop) => {
    return (state.selectionItems || []).some(sel => {
      if (sel.property_id !== prop.id && sel.address !== prop.address) return false;
      if (requestClientIds.length === 0) return true;
      const selClients = Array.isArray(sel.client_ids) && sel.client_ids.length > 0
        ? sel.client_ids : (sel.client_id ? [sel.client_id] : []);
      return requestClientIds.some(cid => selClients.includes(cid));
    });
  };

  const addLiveToSelection = async (item) => {
    const newItem = {
      id: nanoid(),
      realtor_id: state.currentUser?.id,
      client_ids: requestClientIds,
      client_id: requestClientIds[0] || '',
      address: item.title || item.address || '',
      price: item.price,
      rooms: item.rooms,
      area_total: item.total_area,
      floor: item.floor,
      floors_total: item.total_floors,
      property_type: 'apartment',
      link: item.source_url,
      notes: `Источник: ${getSourceLabel(item.source)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await dispatch({ type: 'ADD_SELECTION_ITEM', item: newItem });
    toast.success(`Добавлено в подборку из ${getSourceLabel(item.source)}`);
  };

  const addMyPropToSelection = async (prop) => {
    const newItem = {
      id: nanoid(),
      realtor_id: state.currentUser?.id,
      client_ids: requestClientIds,
      client_id: requestClientIds[0] || '',
      property_id: prop.id,
      address: prop.address || '',
      price: prop.price || 0,
      rooms: prop.rooms,
      area_total: prop.area_total,
      floor: prop.floor,
      floors_total: prop.floors_total,
      property_type: prop.property_type || 'apartment',
      images: prop.images || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await dispatch({ type: 'ADD_SELECTION_ITEM', item: newItem });
    toast.success('Мой объект добавлен в подборку клиента');
  };

  const handleSearch = async () => {
    await search();
  };

  const handleTelegramAlert = async () => {
    try {
      const summary = `${request.rooms?.join(', ') || 'Любая'}-к., до ${formatNumber(request.budget_max)} ₽`;
      const sent = await sendTelegramAlert({ clientName, querySummary: summary });
      if (sent) {
        toast.success('Подборка с Авито, ЦИАН и ДомКлик отправлена вам в Telegram!');
      } else {
        toast.info('Найдено вариантов, но отправка в Telegram отключена в настройках бота.');
      }
    } catch (e) {
      toast.error(e.message || 'Ошибка отправки в Telegram');
    }
  };

  const toggleAlerts = () => {
    setAlertsEnabled(prev => {
      const next = !prev;
      localStorage.setItem(`rea_auto_alert_${request?.id}`, String(next));
      toast.info(next ? 'Автооповещения включены' : 'Автооповещения выключены');
      return next;
    });
  };

  // Фильтрация результатов по выбранному порталу
  const filteredLiveResults = useMemo(() => {
    if (selectedPortal === 'all') return results;
    return results.filter(r => r.source === selectedPortal);
  }, [results, selectedPortal]);

  const visibleLive = showAllLive ? filteredLiveResults : filteredLiveResults.slice(0, SECTION_LIMIT);
  const visibleMine = showAllMine ? myMatches : myMatches.slice(0, SECTION_LIMIT);
  const hasSearched = lastSearched !== null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Секция: Автоподбор на Авито / ЦИАН / ДомКлик ────────────────── */}
      <div style={sectionStyle('var(--primary)')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
          <SectionHeader
            icon={<Globe size={19} />}
            color="var(--primary)"
            title="Автоподбор: Авито · ЦИАН · ДомКлик"
            count={hasSearched ? results.length : null}
            subtitle="Поиск и мониторинг объявлений по параметрам клиента"
          />

          {/* Статус автоподбора и переключатель оповещений */}
          <button
            type="button"
            onClick={toggleAlerts}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 12,
              background: alertsEnabled ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-light)',
              border: `1px solid ${alertsEnabled ? 'rgba(16, 185, 129, 0.3)' : 'var(--border)'}`,
              color: alertsEnabled ? '#047857' : 'var(--text-muted)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: alertsEnabled ? '#10b981' : '#94a3b8',
              boxShadow: alertsEnabled ? '0 0 8px #10b981' : 'none',
            }} />
            <Bell size={13} />
            <span>{alertsEnabled ? 'Оповещения ВКЛ' : 'Оповещения ВЫКЛ'}</span>
          </button>
        </div>

        {/* ── Прямой переход с фильтрами на 3 портала ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
            Прямой поиск на площадках с фильтрами клиента:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
            {portalLinks.map(portal => (
              <a
                key={portal.portal}
                href={portal.url}
                target="_blank"
                rel="noopener noreferrer"
                title={portal.description}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 12px', borderRadius: 14,
                  background: portal.bg, border: `1.5px solid ${portal.border}`,
                  color: portal.color, textDecoration: 'none',
                  fontSize: 13, fontWeight: 600,
                  transition: 'transform 0.15s ease, opacity 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{portal.portal === 'avito' ? '🔵' : portal.portal === 'cian' ? '🔴' : '🟢'}</span>
                  <span>{portal.name}</span>
                </div>
                <ExternalLink size={13} style={{ opacity: 0.7 }} />
              </a>
            ))}
          </div>
        </div>

        {/* ── Кнопки действий: Найти объекты + Оповестить в Telegram ── */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleSearch}
            disabled={loading}
            style={{
              flex: 1, minWidth: 150, height: 44, borderRadius: 14,
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? 'var(--bg-light)' : 'var(--primary)',
              color: loading ? 'var(--text-muted)' : '#fff',
              fontSize: 13.5, fontWeight: 500,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            {loading ? (
              <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Идёт автоподбор…</>
            ) : hasSearched ? (
              <><RefreshCw size={15} /> Обновить поиск</>
            ) : (
              <><Search size={15} /> Найти подходящие объекты</>
            )}
          </button>

          {hasSearched && results.length > 0 && (
            <button
              type="button"
              onClick={handleTelegramAlert}
              disabled={telegramLoading}
              style={{
                height: 44, padding: '0 16px', borderRadius: 14,
                border: '1.5px solid rgba(0, 136, 204, 0.3)',
                background: 'rgba(0, 136, 204, 0.1)', color: '#0088cc',
                fontSize: 13, fontWeight: 500, cursor: telegramLoading ? 'not-allowed' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 7,
              }}
            >
              {telegramLoading ? (
                <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Отправка…</>
              ) : (
                <><Send size={15} /> В Telegram</>
              )}
            </button>
          )}
        </div>

        {/* Ошибка поиска */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
            borderRadius: 12, background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.25)', color: '#dc2626', fontSize: 13,
          }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Фильтр по источникам (Все / Авито / ЦИАН / ДомКлик) */}
        {hasSearched && !loading && results.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setSelectedPortal('all')}
              style={{
                padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                border: selectedPortal === 'all' ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                background: selectedPortal === 'all' ? 'var(--primary)' : 'var(--surface)',
                color: selectedPortal === 'all' ? '#fff' : 'var(--text)',
                cursor: 'pointer',
              }}
            >
              Все площадки ({results.length})
            </button>
            {Object.entries(sources).map(([src, count]) => {
              const isSel = selectedPortal === src;
              const color = getSourceColor(src);
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => setSelectedPortal(src)}
                  style={{
                    padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 600,
                    border: isSel ? `1.5px solid ${color}` : `1px solid ${color}40`,
                    background: isSel ? color : `${color}14`,
                    color: isSel ? '#fff' : color,
                    cursor: 'pointer',
                  }}
                >
                  {getSourceLabel(src)} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Результат 0 */}
        {hasSearched && !loading && results.length === 0 && !error && (
          <div style={{
            padding: '16px', borderRadius: 14, background: 'var(--surface)',
            border: '1px dashed var(--border-light)', fontSize: 13,
            color: 'var(--text-muted)', textAlign: 'center',
          }}>
            По заданным параметрам на площадках совпадений не найдено. Вы можете открыть прямой поиск на Авито, ЦИАН и ДомКлик кнопками выше.
          </div>
        )}

        {/* Список карточек найденных объектов */}
        {filteredLiveResults.length > 0 && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {visibleLive.map(item => (
                <LiveResultCard
                  key={`${item.source}_${item.source_id || item.id}`}
                  item={item}
                  onAddToSelection={addLiveToSelection}
                  isInSelection={isLiveInSelection(item)}
                />
              ))}
            </div>
            {filteredLiveResults.length > SECTION_LIMIT && (
              <ShowMoreBtn
                showAll={showAllLive}
                total={filteredLiveResults.length}
                onClick={() => setShowAllLive(v => !v)}
              />
            )}
          </>
        )}
      </div>

      {/* ── Секция: Мои объекты ─────────────────────────────────────────── */}
      <div style={sectionStyle('#10b981')}>
        <SectionHeader
          icon={<Home size={19} />}
          color="#10b981"
          title="Мои объекты"
          count={myMatches.length}
          subtitle="Объекты из вашей базы, подходящие по параметрам запроса"
        />
        {myMatches.length > 0 ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {visibleMine.map(prop => (
                <MyPropertyCard
                  key={prop.id}
                  prop={prop}
                  onAddToSelection={addMyPropToSelection}
                  isInSelection={isMyPropInSelection(prop)}
                />
              ))}
            </div>
            {myMatches.length > SECTION_LIMIT && (
              <ShowMoreBtn
                showAll={showAllMine}
                total={myMatches.length}
                onClick={() => setShowAllMine(v => !v)}
              />
            )}
          </>
        ) : (
          <div style={{
            padding: '14px 16px',
            borderRadius: 14,
            background: 'var(--surface)',
            border: '1px dashed var(--border-light)',
            fontSize: 12.5,
            color: 'var(--text-muted)',
            textAlign: 'center',
          }}>
            В вашей базе пока нет подходящих объектов под параметры этого запроса
          </div>
        )}
      </div>

    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function sectionStyle(accentColor) {
  return {
    padding: '20px',
    border: `1.5px solid ${accentColor}26`,
    boxShadow: `0 8px 28px ${accentColor}0d`,
    borderRadius: 28,
    background: `linear-gradient(135deg, ${accentColor}09 0%, transparent 100%)`,
    display: 'flex', flexDirection: 'column', gap: 14,
  };
}

function SectionHeader({ icon, color, title, count, subtitle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 12,
        background: `${color}20`, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="font-oswald" style={{ fontSize: 17, fontWeight: 400, color: 'var(--text)' }}>
            {title}
          </span>
          {count !== null && count !== undefined && (
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
              background: `${color}18`, color,
              textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>
              {count} вариантов
            </span>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 300 }}>
          {subtitle}
        </div>
      </div>
    </div>
  );
}

function ShowMoreBtn({ showAll, total, onClick }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '10px', borderRadius: 14,
      border: '1px solid rgba(0,82,255,0.2)',
      background: 'var(--surface)', color: 'var(--primary)',
      fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    }}>
      {showAll
        ? <><ChevronUp size={14} /> Свернуть</>
        : <><ChevronDown size={14} /> Показать все ({total})</>
      }
    </button>
  );
}
