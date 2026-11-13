import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, PlusCircle, Check, ArrowRight, Sparkles, Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useToastContext } from './Toast';
import { formatNumber } from '../utils/format';
import {
  isPurchaseRequestForDevelopments,
  matchDevelopmentsToRequest,
  buildSelectionItemFromDevelopment,
} from '../lib/developmentMatching';
import { getKsmSlugForDevelopment, buildKsmSummaryByProject } from '../lib/ksmLots';
import { getKsskSlugForDevelopment, buildKsskSummaryByProject } from '../lib/ksskLots';
import { DevelopmentDetailModal } from '../pages/Developments/DevelopmentDetailModal';

/**
 * Highlighted section displaying new building options matched to a purchase request
 * by price and location, with one-click selection adding and detail inspection.
 */
export function RequestDevelopmentsSection({
  request,
  developments = [],
  ksmLots = [],
  ksskLots = [],
  ksmProjects = [],
  ksskProjects = [],
  initialExpandedCount = 5,
}) {
  const { state, dispatch } = useApp();
  const { toast } = useToastContext();
  const navigate = useNavigate();

  const [showAll, setShowAll] = useState(false);
  const [detailDev, setDetailDev] = useState(null);

  const isEligible = isPurchaseRequestForDevelopments(request);

  const allLiveLots = useMemo(
    () => [...(Array.isArray(ksmLots) ? ksmLots : []), ...(Array.isArray(ksskLots) ? ksskLots : [])],
    [ksmLots, ksskLots]
  );

  const liveSummaries = useMemo(
    () => ({
      ksm: buildKsmSummaryByProject(ksmLots, ksmProjects),
      kssk: buildKsskSummaryByProject(ksskLots, ksskProjects),
    }),
    [ksmLots, ksmProjects, ksskLots, ksskProjects]
  );

  const matchedDevs = useMemo(() => {
    if (!isEligible) return [];
    return matchDevelopmentsToRequest(developments, request, { liveLots: allLiveLots });
  }, [isEligible, developments, request, allLiveLots]);

  const requestClientIds = useMemo(() => {
    if (!request) return [];
    if (Array.isArray(request.client_ids) && request.client_ids.length > 0) {
      return request.client_ids.filter(Boolean);
    }
    return request.client_id ? [request.client_id] : [];
  }, [request]);

  const isDevInSelection = (dev) => {
    if (!dev?.name) return false;
    const prefix = dev.name.toLowerCase();
    return (state.selectionItems || []).some((item) => {
      const addrMatch = String(item.address || '').toLowerCase().includes(prefix);
      if (!addrMatch) return false;
      if (requestClientIds.length === 0) return true;
      const itemClients = Array.isArray(item.client_ids) && item.client_ids.length > 0
        ? item.client_ids
        : (item.client_id ? [item.client_id] : []);
      return requestClientIds.some((cid) => itemClients.includes(cid));
    });
  };

  if (!isEligible) return null;

  const visibleMatches = showAll ? matchedDevs : matchedDevs.slice(0, initialExpandedCount);

  const handleAddDevToSelection = async (matchEntry) => {
    const { dev, matchedApartments } = matchEntry;
    const bestApt = matchedApartments.find((a) => a.inBudget) || matchedApartments[0] || null;
    try {
      const item = buildSelectionItemFromDevelopment({
        dev,
        request,
        apartment: bestApt,
        realtorId: state.currentUser?.id || request?.realtor_id || null,
      });
      await dispatch({ type: 'ADD_SELECTION_ITEM', item });
      toast.success(`ЖК "${dev.name}" добавлен в подборку клиента`);
    } catch (err) {
      console.error('[RequestDevelopmentsSection] Add selection error:', err);
      toast.error('Не удалось добавить новостройку в подборку');
    }
  };

  return (
    <>
      <div
        className="card"
        style={{
          padding: '20px',
          border: '1.5px solid rgba(0, 82, 255, 0.24)',
          boxShadow: '0 8px 28px rgba(0, 82, 255, 0.06)',
          borderRadius: 28,
          background: 'linear-gradient(135deg, rgba(0, 82, 255, 0.035) 0%, rgba(16, 185, 129, 0.035) 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'rgba(0, 82, 255, 0.12)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Building2 size={19} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span className="font-oswald" style={{ fontSize: 17, fontWeight: 400, color: 'var(--text)' }}>
                  Варианты новостроек
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: 'rgba(0, 82, 255, 0.12)',
                    color: 'var(--primary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {matchedDevs.length} по цене и локации
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', fontWeight: 300 }}>
                Автоподбор ЖК из каталога новостроек под бюджет и район запроса
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/developments?request=${request.id}`)}
            style={{
              padding: '7px 12px',
              borderRadius: 10,
              border: '1px solid rgba(0, 82, 255, 0.25)',
              background: 'var(--surface)',
              color: 'var(--primary)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span>Все на карте</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {/* Content */}
        {matchedDevs.length === 0 ? (
          <div
            style={{
              padding: '16px',
              borderRadius: 18,
              background: 'var(--surface)',
              border: '1px dashed var(--border-light)',
              fontSize: 13,
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}
          >
            По указанным бюджету и локации подходящих новостроек не найдено.{' '}
            <button
              type="button"
              onClick={() => navigate('/developments')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                cursor: 'pointer',
                fontWeight: 500,
                padding: 0,
                textDecoration: 'underline',
              }}
            >
              Открыть весь каталог
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visibleMatches.map((entry) => {
              const {
                dev,
                priceMatchType,
                locationMatchType,
                matchedApartments,
                liveLotsCount,
                liveMinPrice,
                priceReason,
                locationReason,
              } = entry;

              const inSelection = isDevInSelection(dev);
              const isExactPrice = priceMatchType === 'exact';
              const isNearPrice = priceMatchType === 'near';

              return (
                <div
                  key={dev.id}
                  onClick={() => setDetailDev(dev)}
                  className="card-clickable"
                  style={{
                    padding: '14px',
                    borderRadius: 20,
                    background: 'var(--surface)',
                    border: isExactPrice
                      ? '1.5px solid rgba(16, 185, 129, 0.38)'
                      : isNearPrice
                        ? '1.5px solid rgba(245, 158, 11, 0.38)'
                        : '1.5px solid rgba(0, 82, 255, 0.2)',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    cursor: 'pointer',
                  }}
                >
                  {/* Top Row: Thumbnail + Title + Completion */}
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {dev.images?.[0] ? (
                      <img
                        src={dev.images[0]}
                        alt={dev.name}
                        loading="lazy"
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: 14,
                          objectFit: 'cover',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 54,
                          height: 54,
                          borderRadius: 14,
                          background: 'var(--bg-light)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--primary)',
                          flexShrink: 0,
                        }}
                      >
                        <Building2 size={22} />
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: 'var(--primary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}
                        >
                          {dev.developer || 'Застройщик'}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 500,
                            padding: '2px 7px',
                            borderRadius: 999,
                            background: dev.is_completed ? 'rgba(16, 185, 129, 0.14)' : 'rgba(0, 82, 255, 0.1)',
                            color: dev.is_completed ? '#047857' : 'var(--primary)',
                            flexShrink: 0,
                          }}
                        >
                          {dev.is_completed ? 'Сдан' : (dev.completion_date || 'Строится')}
                        </span>
                      </div>
                      <div
                        className="font-oswald"
                        style={{
                          fontSize: 16,
                          fontWeight: 400,
                          color: 'var(--text)',
                          marginTop: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {dev.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11.5,
                          color: 'var(--text-secondary)',
                          fontWeight: 300,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {dev.address}
                      </div>
                    </div>
                  </div>

                  {/* Highlighted Price & Location Pills */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '4px 9px',
                        borderRadius: 10,
                        background: isNearPrice ? 'rgba(245, 158, 11, 0.14)' : 'rgba(16, 185, 129, 0.14)',
                        color: isNearPrice ? '#b45309' : '#047857',
                        border: isNearPrice ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      <Wallet size={12} />
                      <span>{priceReason}</span>
                    </span>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '4px 9px',
                        borderRadius: 10,
                        background: locationMatchType === 'microdistrict' ? 'rgba(0, 82, 255, 0.14)' : 'rgba(0, 82, 255, 0.08)',
                        color: 'var(--primary)',
                        border: '1px solid rgba(0, 82, 255, 0.25)',
                      }}
                    >
                      <MapPin size={12} />
                      <span>{locationReason}</span>
                    </span>

                    {liveLotsCount > 0 && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '4px 9px',
                          borderRadius: 10,
                          background: 'rgba(16, 185, 129, 0.12)',
                          color: '#047857',
                          border: '1px solid rgba(16, 185, 129, 0.28)',
                        }}
                      >
                        <Sparkles size={11} />
                        <span>Live: {liveLotsCount} кв. от {formatNumber(liveMinPrice)} ₽</span>
                      </span>
                    )}
                  </div>

                  {/* Matched Layouts */}
                  {matchedApartments.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {matchedApartments.map((apt, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: 11,
                            padding: '3px 8px',
                            borderRadius: 8,
                            background: apt.inBudget ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-light)',
                            border: apt.inBudget ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--border-light)',
                            color: 'var(--text)',
                          }}
                        >
                          <strong>{apt.name?.split(' ')[0] || apt.type}:</strong>{' '}
                          {apt.price_from ? `от ${(apt.price_from / 1_000_000).toFixed(1).replace('.', ',')} млн` : 'по запросу'}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4, borderTop: '1px solid var(--border-light)' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddDevToSelection(entry);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '6px 12px',
                        borderRadius: 10,
                        border: inSelection ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border)',
                        background: inSelection ? 'rgba(16, 185, 129, 0.12)' : 'var(--surface)',
                        color: inSelection ? '#047857' : 'var(--text)',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      {inSelection ? <Check size={14} /> : <PlusCircle size={14} />}
                      <span>{inSelection ? 'В подборке' : 'В подборку'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailDev(dev);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '6px 12px',
                        borderRadius: 10,
                        border: 'none',
                        background: 'var(--primary)',
                        color: '#ffffff',
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      <span>Подробнее</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}

            {matchedDevs.length > initialExpandedCount && (
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                style={{
                  padding: '10px',
                  borderRadius: 14,
                  border: '1px solid rgba(0, 82, 255, 0.2)',
                  background: 'var(--surface)',
                  color: 'var(--primary)',
                  fontSize: 12.5,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {showAll ? 'Свернуть список' : `Показать все варианты (${matchedDevs.length})`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Development Detail Modal */}
      {detailDev && (() => {
        const ksmSlug = getKsmSlugForDevelopment(detailDev);
        const ksskSlug = getKsskSlugForDevelopment(detailDev);
        const providerId = ksmSlug ? 'ksm' : ksskSlug ? 'kssk' : null;
        const activeSlug = ksmSlug || ksskSlug;
        const detailLots = providerId === 'ksm'
          ? (ksmLots || []).filter((l) => l.project_slug === activeSlug)
          : providerId === 'kssk'
            ? (ksskLots || []).filter((l) => l.project_slug === activeSlug)
            : [];
        const detailMeta = providerId && activeSlug
          ? liveSummaries[providerId]?.[activeSlug] || null
          : null;

        return (
          <DevelopmentDetailModal
            development={detailDev}
            initialClientId={requestClientIds[0] || ''}
            liveLots={detailLots}
            liveMeta={detailMeta}
            liveProvider={providerId ? {
              id: providerId,
              label: providerId === 'kssk' ? 'КССК' : 'КСМ',
              slug: activeSlug,
              subtitle: providerId === 'kssk'
                ? 'Актуальные свободные квартиры с сайта kvartiry.kssk.ru'
                : 'Прямые данные по свободным квартирам из кабинета застройщика КСМ',
            } : null}
            onClose={() => setDetailDev(null)}
            onSelectOnMap={() => {
              setDetailDev(null);
              navigate(`/developments?request=${request.id}`);
            }}
          />
        );
      })()}
    </>
  );
}
