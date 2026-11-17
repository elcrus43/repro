import React from 'react';
import { Building2, MapPin, Calendar, PlusCircle, Check } from 'lucide-react';
import { formatNumber } from '../../utils/format';

export function DevelopmentCard({
  development,
  isSelected = false,
  requestMatch = null,
  onSelect = () => {},
  onOpenDetail = () => {},
  onAddToSelection = () => {},
  ksmSummary = null,
  liveSummary = null,
  liveProviderLabel = 'КСМ live',
}) {
  const dev = development;
  const activeLiveSummary = liveSummary || ksmSummary;
  const liveCount = activeLiveSummary
    ? (activeLiveSummary.syncedCount || activeLiveSummary.totalCount || 0)
    : 0;
  const displayPriceFrom = activeLiveSummary?.minPrice || dev.price_from;
  const displayPriceSqm = activeLiveSummary?.minPriceSqm || dev.price_sqm_from;
  const isRequestMatched = Boolean(requestMatch);

  return (
    <div
      className={`development-card ${isSelected ? 'selected' : ''} ${isRequestMatched ? 'request-matched' : ''}`}
      onClick={() => {
        onSelect(dev.id);
        onOpenDetail(dev);
      }}
    >
      {/* Photo Header */}
      <div className="dev-card-image-wrap">
        <img
          src={dev.images && dev.images[0] ? dev.images[0] : '/images/developments/zhk-bulychev.jpg'}
          alt={dev.name}
          className="dev-card-image"
          loading="lazy"
          onError={(e) => {
            if (dev.images && dev.images.length > 1 && !e.target.src.endsWith(dev.images[1])) {
              e.target.src = dev.images[1];
            } else if (!e.target.src.endsWith('/images/developments/zhk-bulychev.jpg')) {
              e.target.src = '/images/developments/zhk-bulychev.jpg';
            }
          }}
        />
        <div className="dev-card-badges">
          <span className="dev-badge-class">{dev.housing_class || 'Комфорт'}</span>
          {dev.is_completed ? (
            <span className="dev-badge-status completed">Сдан</span>
          ) : (
            <span className="dev-badge-status in-progress">{dev.completion_date || 'Строится'}</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="dev-card-content">
        <div className="dev-card-header">
          <div>
            <span className="dev-card-dev-name">{dev.developer || 'Застройщик'}</span>
            <h3 className="dev-card-title">{dev.name}</h3>
          </div>
          {isRequestMatched && (
            <span className={`dev-match-highlight-badge ${requestMatch.priceMatchType === 'near' ? 'near' : 'exact'}`}>
              {requestMatch.priceMatchType === 'near' ? 'Рядом с бюджетом' : 'Подходит по запросу'}
            </span>
          )}
        </div>

        {isRequestMatched && (
          <div className="dev-match-reasons-row">
            <span className={`dev-match-reason-pill ${requestMatch.priceMatchType === 'near' ? 'near' : 'price'}`}>
              {requestMatch.priceReason}
            </span>
            <span className="dev-match-reason-pill location">
              {requestMatch.locationReason}
            </span>
          </div>
        )}

        <div className="dev-card-location">
          <MapPin size={14} className="text-muted flex-shrink-0" />
          <span className="dev-card-address" title={dev.address}>
            {dev.microdistrict ? `${dev.microdistrict}, ` : ''}{dev.address}
          </span>
        </div>

        {/* Prices */}
        <div className="dev-card-price-section">
          <div className="dev-card-price-main">
            <span className="dev-price-label">Квартиры</span>
            <span className="dev-price-value">
              {displayPriceFrom ? `от ${formatNumber(displayPriceFrom)} ₽` : 'По запросу'}
            </span>
          </div>
          <div className="dev-card-price-right">
            {liveCount > 0 && (
              <span className="dev-ksm-live-badge" title={`Актуальные свободные лоты (${liveProviderLabel})`}>
                {liveProviderLabel}: {liveCount} кв.
              </span>
            )}
            {displayPriceSqm && (
              <div className="dev-card-price-sqm">
                от {formatNumber(displayPriceSqm)} ₽/м²
              </div>
            )}
          </div>
        </div>

        {/* Room Types Chips */}
        {dev.apartments && dev.apartments.length > 0 && (
          <div className="dev-card-rooms-list">
            {dev.apartments.map((apt, idx) => (
              <span key={idx} className="dev-room-chip">
                <strong>{apt.name.split(' ')[0]}:</strong> от {(apt.price_from / 1000000).toFixed(1).replace('.', ',')} млн
              </span>
            ))}
          </div>
        )}

        {/* Card Footer: Action */}
        <div className="dev-card-footer">
          <button
            type="button"
            className="dev-btn-selection"
            title="Добавить в подборку клиенту"
            onClick={(e) => {
              e.stopPropagation();
              onAddToSelection(dev);
            }}
          >
            <PlusCircle size={14} />
            <span>В подборку</span>
          </button>
        </div>
      </div>

      <style>{`
        .development-card {
          display: flex;
          flex-direction: column;
          background: var(--surface, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: var(--radius-lg, 16px);
          overflow: hidden;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: pointer;
          position: relative;
        }
        .development-card:hover {
          transform: translateY(-3px);
          border-color: var(--primary, #0052FF);
          box-shadow: 0 12px 28px rgba(0, 82, 255, 0.12);
        }
        .development-card.selected {
          border-color: var(--primary, #0052FF);
          box-shadow: 0 0 0 2px var(--primary, #0052FF), 0 12px 28px rgba(0, 82, 255, 0.15);
        }
        .development-card.request-matched {
          border: 2px solid #10b981;
          background: linear-gradient(180deg, rgba(16, 185, 129, 0.04) 0%, var(--surface, #ffffff) 48%);
          box-shadow: 0 10px 26px rgba(16, 185, 129, 0.14);
        }
        .development-card.request-matched.selected {
          border-color: var(--primary, #0052FF);
          box-shadow: 0 0 0 2px var(--primary, #0052FF), 0 12px 28px rgba(16, 185, 129, 0.22);
        }
        .dev-match-highlight-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 999px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .dev-match-highlight-badge.exact {
          background: rgba(16, 185, 129, 0.15);
          color: #047857;
          border: 1px solid rgba(16, 185, 129, 0.35);
        }
        .dev-match-highlight-badge.near {
          background: rgba(245, 158, 11, 0.15);
          color: #b45309;
          border: 1px solid rgba(245, 158, 11, 0.35);
        }
        .dev-match-reasons-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .dev-match-reason-pill {
          font-size: 10.5px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 8px;
        }
        .dev-match-reason-pill.price {
          background: rgba(16, 185, 129, 0.12);
          color: #047857;
        }
        .dev-match-reason-pill.near {
          background: rgba(245, 158, 11, 0.12);
          color: #b45309;
        }
        .dev-match-reason-pill.location {
          background: rgba(0, 82, 255, 0.1);
          color: var(--primary, #0052FF);
        }
        .dev-card-image-wrap {
          position: relative;
          height: 180px;
          width: 100%;
          background: #e2e8f0;
          overflow: hidden;
        }
        .dev-card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.4s ease;
        }
        .development-card:hover .dev-card-image {
          transform: scale(1.04);
        }
        .dev-card-badges {
          position: absolute;
          top: 10px;
          left: 10px;
          right: 10px;
          display: flex;
          justify-content: space-between;
          pointer-events: none;
        }
        .dev-badge-class {
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(6px);
          color: #ffffff;
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 20px;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }
        .dev-badge-status {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 20px;
          backdrop-filter: blur(6px);
        }
        .dev-badge-status.completed {
          background: rgba(16, 185, 129, 0.9);
          color: #ffffff;
        }
        .dev-badge-status.in-progress {
          background: rgba(0, 82, 255, 0.85);
          color: #ffffff;
        }
        .dev-card-content {
          padding: 16px;
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 10px;
        }
        .dev-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .dev-card-dev-name {
          font-size: 11px;
          font-weight: 600;
          color: var(--primary, #0052FF);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          display: block;
          margin-bottom: 2px;
        }
        .dev-card-title {
          margin: 0;
          font-size: 17px;
          font-weight: 700;
          color: var(--text, #0f172a);
          line-height: 1.25;
        }
        .dev-card-location {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-secondary, #475569);
        }
        .dev-card-address {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dev-card-price-section {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          background: var(--bg, #f8fafc);
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid var(--border-light, #f1f5f9);
        }
        .dark .dev-card-price-section {
          background: #0f172a;
          border-color: #334155;
        }
        .dev-card-price-main {
          display: flex;
          flex-direction: column;
        }
        .dev-price-label {
          font-size: 10px;
          color: var(--text-muted, #94a3b8);
          text-transform: uppercase;
          font-weight: 600;
        }
        .dev-price-value {
          font-size: 16px;
          font-weight: 700;
          color: var(--primary, #0052FF);
        }
        .dark .dev-price-value {
          color: #60a5fa;
        }
        .dev-card-price-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 3px;
        }
        .dev-ksm-live-badge {
          display: inline-flex;
          align-items: center;
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 7px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .dark .dev-ksm-live-badge {
          background: #064e3b;
          color: #a7f3d0;
          border-color: #059669;
        }
        .dev-card-price-sqm {
          font-size: 11px;
          color: var(--text-secondary, #475569);
          font-weight: 500;
        }
        .dev-card-rooms-list {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }
        .dev-room-chip {
          background: var(--border-light, #f1f5f9);
          color: var(--text-secondary, #475569);
          font-size: 11px;
          padding: 3px 8px;
          border-radius: 6px;
        }
        .dark .dev-room-chip {
          background: #334155;
          color: #cbd5e1;
        }
        .dev-card-footer {
          margin-top: auto;
          padding-top: 10px;
          border-top: 1px solid var(--border-light, #f1f5f9);
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 8px;
        }
        .dev-btn-selection {
          display: flex;
          align-items: center;
          gap: 5px;
          background: transparent;
          border: 1px solid var(--border, #e2e8f0);
          color: var(--text-secondary, #475569);
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .dev-btn-selection:hover {
          background: var(--primary-light, #eef4ff);
          color: var(--primary, #0052FF);
          border-color: var(--primary, #0052FF);
        }
      `}</style>
    </div>
  );
}
