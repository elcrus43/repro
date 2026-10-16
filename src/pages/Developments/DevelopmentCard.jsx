import React from 'react';
import { Building2, MapPin, Calendar, ExternalLink, PlusCircle, Check, ArrowRight } from 'lucide-react';
import { formatNumber } from '../../utils/format';

export function DevelopmentCard({
  development,
  isSelected = false,
  onSelect = () => {},
  onOpenDetail = () => {},
  onAddToSelection = () => {}
}) {
  const dev = development;

  return (
    <div
      className={`development-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(dev.id)}
    >
      {/* Photo Header */}
      <div className="dev-card-image-wrap">
        <img
          src={dev.images && dev.images[0] ? dev.images[0] : 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'}
          alt={dev.name}
          className="dev-card-image"
          loading="lazy"
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
        </div>

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
              {dev.price_from ? `от ${formatNumber(dev.price_from)} ₽` : 'По запросу'}
            </span>
          </div>
          {dev.price_sqm_from && (
            <div className="dev-card-price-sqm">
              от {formatNumber(dev.price_sqm_from)} ₽/м²
            </div>
          )}
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

        {/* External Badges & Actions */}
        <div className="dev-card-footer">
          <div className="dev-card-links">
            {dev.domrf_url && (
              <a
                href={dev.domrf_url}
                target="_blank"
                rel="noreferrer"
                className="dev-external-link domrf"
                title="ЕИСЖС (наш.дом.рф)"
                onClick={(e) => e.stopPropagation()}
              >
                наш.дом.рф ↗
              </a>
            )}
            {dev.avito_url && (
              <a
                href={dev.avito_url}
                target="_blank"
                rel="noreferrer"
                className="dev-external-link avito"
                title="Объявления на Avito"
                onClick={(e) => e.stopPropagation()}
              >
                Авито ↗
              </a>
            )}
          </div>

          <div className="dev-card-actions">
            <button
              type="button"
              className="dev-btn-selection"
              title="Добавить в подборку клиенту"
              onClick={(e) => {
                e.stopPropagation();
                onAddToSelection(dev);
              }}
            >
              <PlusCircle size={15} />
              <span>В подборку</span>
            </button>
            <button
              type="button"
              className="dev-btn-detail"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail(dev);
              }}
            >
              <span>Подробнее</span>
              <ArrowRight size={14} />
            </button>
          </div>
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
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }
        .dev-card-links {
          display: flex;
          gap: 6px;
        }
        .dev-external-link {
          font-size: 10px;
          font-weight: 600;
          padding: 3px 7px;
          border-radius: 6px;
          text-decoration: none;
          transition: opacity 0.2s;
        }
        .dev-external-link:hover {
          opacity: 0.8;
        }
        .dev-external-link.domrf {
          background: #eff6ff;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
        }
        .dark .dev-external-link.domrf {
          background: #1e3a8a;
          color: #bfdbfe;
          border-color: #2563eb;
        }
        .dev-external-link.avito {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #a7f3d0;
        }
        .dark .dev-external-link.avito {
          background: #064e3b;
          color: #a7f3d0;
          border-color: #059669;
        }
        .dev-card-actions {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .dev-btn-selection {
          display: flex;
          align-items: center;
          gap: 4px;
          background: transparent;
          border: 1px solid var(--border, #e2e8f0);
          color: var(--text-secondary, #475569);
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .dev-btn-selection:hover {
          background: var(--primary-light, #eef4ff);
          color: var(--primary, #0052FF);
          border-color: var(--primary, #0052FF);
        }
        .dev-btn-detail {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--primary, #0052FF);
          border: none;
          color: #ffffff;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .dev-btn-detail:hover {
          background: var(--primary-hover, #0043D9);
        }
      `}</style>
    </div>
  );
}
