import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertCircle, X } from 'lucide-react';
import { formatNumber } from '../../utils/format';
import {
  escapeMapHtml,
  formatRoomBreakdownText,
  isSelectedMapItem,
} from '../../lib/houseCoordinates';

const GOOGLE_LAYER_OPTIONS = [
  { id: 'm', label: 'Схема' },
  { id: 'y', label: 'Гибрид' },
  { id: 's', label: 'Спутник' }
];

const GOOGLE_TILE_URLS = {
  m: 'https://mt{s}.google.com/vt/lyrs=m&hl=ru&x={x}&y={y}&z={z}',
  y: 'https://mt{s}.google.com/vt/lyrs=y&hl=ru&x={x}&y={y}&z={z}',
  s: 'https://mt{s}.google.com/vt/lyrs=s&hl=ru&x={x}&y={y}&z={z}'
};

function getTileConfig(provider, googleLayer, isDark) {
  if (provider === 'google') {
    return {
      url: GOOGLE_TILE_URLS[googleLayer] || GOOGLE_TILE_URLS.m,
      subdomains: '0123',
      maxZoom: 20,
      attribution: '&copy; Google Карты'
    };
  }

  return {
    url: isDark
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: isDark ? 'abcd' : 'abc',
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>'
  };
}

function buildLeafletMarkerIcon(item, isSelected) {
  const shortLabel = item.markerTitle || String(item.name || '').replace(/^ЖК\s+/i, '');
  const priceText = item.price_from
    ? `от ${(item.price_from / 1000000).toFixed(1).replace('.', ',')} млн ₽`
    : 'Цена по запросу';
  const liveCount = Number(item.liveCount) || 0;
  const livePillHtml = liveCount > 0
    ? `<span class="dev-marker-live-pill">${liveCount} кв.</span>`
    : '';

  return L.divIcon({
    className: 'custom-dev-marker-wrapper',
    html: `
      <div class="dev-marker-bubble ${isSelected ? 'selected' : ''} ${liveCount > 0 ? 'has-live' : ''}">
        <div class="dev-marker-dot"></div>
        <div class="dev-marker-text">
          <span class="dev-marker-name">${escapeMapHtml(shortLabel)}</span>
          <span class="dev-marker-price">${escapeMapHtml(priceText)}</span>
        </div>
        ${livePillHtml}
        <div class="dev-marker-pin"></div>
      </div>
    `,
    iconSize: [140, 44],
    iconAnchor: [70, 44],
    popupAnchor: [0, -44]
  });
}

function buildLeafletPopupHtml(item) {
  const heroImg = (item.images && item.images[0]) || item.samplePlanImage || '';
  const badgeText = item.liveProviderLabel || item.housing_class || 'Комфорт';
  const liveCount = Number(item.liveCount) || 0;
  const breakdownText = formatRoomBreakdownText(item.byRoomType);
  const addressLabel = item.isHousePin
    ? item.address
    : (item.microdistrict || item.district || 'Киров');
  const showSamplePlanThumb = Boolean(
    item.samplePlanImage && item.images && item.images[0] && item.samplePlanImage !== item.images[0]
  );

  return `
    <div class="dev-map-popup">
      ${heroImg ? `
        <div class="dev-popup-img-wrap">
          <img src="${escapeMapHtml(heroImg)}" alt="${escapeMapHtml(item.name)}" class="dev-popup-img" />
          <span class="dev-popup-class-badge">${escapeMapHtml(badgeText)}</span>
        </div>
      ` : ''}
      <div class="dev-popup-body">
        <h4 class="dev-popup-title">${escapeMapHtml(item.name)}</h4>
        <div class="dev-popup-meta">
          <span>🏗️ ${escapeMapHtml(item.developer || 'Застройщик')}</span>
          <span>📍 ${escapeMapHtml(addressLabel)}</span>
          <span>⏱️ ${escapeMapHtml(item.completion_date || 'Срок уточняется')}</span>
        </div>
        ${liveCount > 0 ? `
          <div class="dev-popup-live-row">
            <div class="dev-popup-live-info">
              <span class="dev-popup-live-badge">${liveCount} своб. кв.</span>
              ${breakdownText ? `<span class="dev-popup-live-rooms">${escapeMapHtml(breakdownText)}</span>` : ''}
            </div>
            ${showSamplePlanThumb ? `
              <img src="${escapeMapHtml(item.samplePlanImage)}" alt="Планировка" class="dev-popup-plan-thumb" />
            ` : ''}
          </div>
        ` : ''}
        <div class="dev-popup-price-row">
          <span class="dev-popup-price-label">Цена:</span>
          <span class="dev-popup-price-val">${item.price_from ? `от ${formatNumber(item.price_from)} ₽` : 'по запросу'}</span>
        </div>
        <button type="button" data-leaflet-detail-btn="true" class="dev-popup-action-btn">
          Смотреть планировки ->
        </button>
      </div>
    </div>
  `;
}

/**
 * DevelopmentsMap
 * Интерактивная карта новостроек г. Кирова на Leaflet (Google Карты / OpenStreetMap)
 */
export function DevelopmentsMap({
  developments = [],
  selectedId = null,
  focusTarget = null,
  onSelect = () => {},
  onSelectHouse = null,
  onOpenDetail = () => {},
  className = '',
  height = '100%',
  provider = 'osm'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef(new Map());
  const markerEntriesRef = useRef([]);
  const tileErrorCountRef = useRef(0);
  const selectedIdRef = useRef(selectedId);
  const focusTargetRef = useRef(focusTarget);
  const onSelectRef = useRef(onSelect);
  const onSelectHouseRef = useRef(onSelectHouse);
  const onOpenDetailRef = useRef(onOpenDetail);

  const [googleLayer, setGoogleLayer] = useState('m');
  const [tileErrorKey, setTileErrorKey] = useState(null);
  const [isDark, setIsDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );

  const currentLayerKey = `${provider}:${googleLayer}:${isDark}`;
  const hasTileError = tileErrorKey === currentLayerKey;

  useEffect(() => {
    selectedIdRef.current = selectedId;
    focusTargetRef.current = focusTarget;
    onSelectRef.current = onSelect;
    onSelectHouseRef.current = onSelectHouse;
    onOpenDetailRef.current = onOpenDetail;
  }, [selectedId, focusTarget, onSelect, onSelectHouse, onOpenDetail]);

  // Отслеживание смены светлой/темной темы на html
  useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(root.classList.contains('dark'));
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Инициализация карты
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    // Очищаем старый leaflet id на случай повторного маунта React
    if (container._leaflet_id && !mapInstanceRef.current) {
      delete container._leaflet_id;
    }

    if (!mapInstanceRef.current) {
      // Координаты центра Кирова
      const kirovCenter = [58.6035, 49.6679];
      const map = L.map(container, {
        center: kirovCenter,
        zoom: 12,
        zoomControl: false,
        attributionControl: false
      });

      // Зум-контрол в правом верхнем углу
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Копирайт провайдера (обновляется автоматически из attribution активного tileLayer)
      L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);

      mapInstanceRef.current = { map, tileLayer: null };

      // Принудительный расчет размеров после монтирования в DOM
      setTimeout(() => {
        try { map.invalidateSize(); } catch { /* ignore */ }
      }, 100);
      setTimeout(() => {
        try { map.invalidateSize(); } catch { /* ignore */ }
      }, 400);
    }

    const { map } = mapInstanceRef.current;

    // Ресайз карты при изменении контейнера
    const resizeObserver = new ResizeObserver(() => {
      try { map.invalidateSize(); } catch { /* ignore */ }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.map.remove();
        } catch (e) {
          console.warn('[Map unmount cleanup error]', e);
        }
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Обновление слоя тайлов при смене провайдера, подложки Google или темы
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const { map, tileLayer } = mapInstanceRef.current;

    if (tileLayer) {
      try {
        map.removeLayer(tileLayer);
      } catch { /* ignore */ }
      mapInstanceRef.current.tileLayer = null;
    }

    const config = getTileConfig(provider, googleLayer, isDark);
    const newLayer = L.tileLayer(config.url, {
      maxZoom: config.maxZoom,
      subdomains: config.subdomains,
      attribution: config.attribution
    });

    tileErrorCountRef.current = 0;

    const handleTileError = () => {
      tileErrorCountRef.current += 1;
      if (tileErrorCountRef.current >= 3) {
        setTileErrorKey(currentLayerKey);
      }
    };

    const handleTileLoad = () => {
      tileErrorCountRef.current = 0;
      setTileErrorKey(prev => (prev === currentLayerKey ? null : prev));
    };

    newLayer.on('tileerror', handleTileError);
    newLayer.on('tileload', handleTileLoad);

    try {
      newLayer.addTo(map);
      mapInstanceRef.current.tileLayer = newLayer;
    } catch (e) {
      console.warn('[Map layer switch error]', e);
    }

    return () => {
      newLayer.off('tileerror', handleTileError);
      newLayer.off('tileload', handleTileLoad);
      if (mapInstanceRef.current) {
        try {
          map.removeLayer(newLayer);
        } catch { /* ignore */ }
        if (mapInstanceRef.current.tileLayer === newLayer) {
          mapInstanceRef.current.tileLayer = null;
        }
      }
    };
  }, [provider, googleLayer, isDark, currentLayerKey]);

  // Отрисовка маркеров новостроек и домов
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const { map } = mapInstanceRef.current;

    markersRef.current.forEach(marker => {
      try { marker.remove(); } catch { /* ignore */ }
    });
    markersRef.current.clear();
    markerEntriesRef.current = [];

    if (!developments || developments.length === 0) return;

    const bounds = [];
    const activeSelectedId = selectedIdRef.current;

    developments.forEach(item => {
      if (!item || !item.lat || !item.lng) return;

      const isSelected = isSelectedMapItem(item, activeSelectedId);
      const marker = L.marker([item.lat, item.lng], {
        icon: buildLeafletMarkerIcon(item, isSelected)
      });

      marker.bindPopup(buildLeafletPopupHtml(item), {
        maxWidth: 280,
        className: 'custom-dev-popup'
      });

      marker.on('popupopen', () => {
        onSelectRef.current?.(item.devId || item.id);
        onSelectHouseRef.current?.(item);
        const popupEl = marker.getPopup()?.getElement();
        const btn = popupEl?.querySelector('[data-leaflet-detail-btn]');
        if (btn) {
          btn.onclick = () => {
            onOpenDetailRef.current?.(item.sourceDev || item, item.isHousePin ? item.address : null);
          };
        }
      });

      marker.on('click', () => {
        onSelectRef.current?.(item.devId || item.id);
        onSelectHouseRef.current?.(item);
      });

      marker.addTo(map);
      markersRef.current.set(String(item.id), marker);
      markerEntriesRef.current.push({ item, marker, isSelected });
      bounds.push([item.lat, item.lng]);
    });

    const activeFocus = focusTargetRef.current;
    const hasFocusCoords = Boolean(
      activeFocus && Number.isFinite(Number(activeFocus.lat)) && Number.isFinite(Number(activeFocus.lng))
    );

    if (!hasFocusCoords && !activeSelectedId && bounds.length > 0) {
      try { map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 }); } catch { /* ignore */ }
    }
  }, [developments]);

  // Подсветка и фокусировка при изменении selectedId
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const { map } = mapInstanceRef.current;
    const entries = markerEntriesRef.current;

    entries.forEach((entry) => {
      const nextSelected = isSelectedMapItem(entry.item, selectedId);
      if (entry.isSelected !== nextSelected) {
        entry.isSelected = nextSelected;
        try {
          entry.marker.setIcon(buildLeafletMarkerIcon(entry.item, nextSelected));
        } catch { /* ignore */ }
      }
    });

    if (!selectedId) return;

    const exactMarker = markersRef.current.get(String(selectedId));
    if (exactMarker) {
      const latlng = exactMarker.getLatLng();
      try {
        map.flyTo(latlng, Math.max(map.getZoom(), 14), { duration: 0.6 });
        if (!exactMarker.isPopupOpen()) {
          exactMarker.openPopup();
        }
      } catch { /* ignore */ }
      return;
    }

    const matchingByDev = entries.filter(
      (entry) => entry.item.devId && String(entry.item.devId) === String(selectedId)
    );
    if (matchingByDev.length === 1) {
      const singleMarker = matchingByDev[0].marker;
      try {
        map.flyTo(singleMarker.getLatLng(), Math.max(map.getZoom(), 14), { duration: 0.6 });
        if (!singleMarker.isPopupOpen()) {
          singleMarker.openPopup();
        }
      } catch { /* ignore */ }
    } else if (matchingByDev.length > 1) {
      const hasOpenPopup = matchingByDev.some((entry) => entry.marker.isPopupOpen());
      if (!hasOpenPopup) {
        try {
          const groupBounds = matchingByDev.map((entry) => entry.marker.getLatLng());
          map.fitBounds(groupBounds, { padding: [50, 50], maxZoom: 15 });
        } catch { /* ignore */ }
      }
    }
  }, [selectedId, developments]);

  // Плавный переход к конкретному дому (например, из списка лотов)
  useEffect(() => {
    if (!mapInstanceRef.current || !focusTarget) return;
    const lat = Number(focusTarget.lat);
    const lng = Number(focusTarget.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const { map } = mapInstanceRef.current;
    const targetZoom = Number(focusTarget.zoom) || 16;
    try {
      map.flyTo([lat, lng], targetZoom, { duration: 0.65 });
    } catch { /* ignore */ }
  }, [focusTarget]);

  return (
    <div
      className={`developments-map-wrapper ${className}`}
      style={{
        width: '100%',
        height: height || '100%',
        minHeight: '380px',
        position: 'relative'
      }}
    >
      {provider === 'google' && (
        <div className="dev-map-layer-switcher" role="group" aria-label="Слой Google Карт">
          {GOOGLE_LAYER_OPTIONS.map(layer => (
            <button
              key={layer.id}
              type="button"
              className={`dev-layer-btn ${googleLayer === layer.id ? 'active' : ''}`}
              onClick={() => setGoogleLayer(layer.id)}
            >
              {layer.label}
            </button>
          ))}
        </div>
      )}

      {hasTileError && (
        <div className="dev-map-tile-warning" role="status">
          <AlertCircle size={15} className="dev-map-tile-warning-icon" />
          <span>Не удалось загрузить тайлы карты. Проверьте сеть или выберите другой движок.</span>
          <button
            type="button"
            className="dev-map-tile-warning-close"
            onClick={() => setTileErrorKey(null)}
            aria-label="Скрыть предупреждение"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '380px',
          borderRadius: 'inherit'
        }}
      />

      <style>{`
        .developments-map-wrapper {
          min-height: 380px;
          height: 100%;
          width: 100%;
          position: relative;
        }
        .developments-map-wrapper .leaflet-container {
          width: 100% !important;
          height: 100% !important;
          min-height: 380px !important;
          border-radius: inherit;
          font-family: inherit;
          z-index: auto;
        }
        .dev-map-layer-switcher {
          position: absolute;
          top: 12px;
          left: 12px;
          z-index: 650;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(226, 232, 240, 0.95);
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.14);
        }
        .dark .dev-map-layer-switcher {
          background: rgba(15, 23, 42, 0.9);
          border-color: rgba(51, 65, 85, 0.9);
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
        }
        .dev-layer-btn {
          border: none;
          background: transparent;
          color: #475569;
          font-size: 12px;
          font-weight: 600;
          padding: 5px 10px;
          border-radius: 7px;
          cursor: pointer;
          transition: all 0.18s ease;
          white-space: nowrap;
        }
        .dark .dev-layer-btn {
          color: #cbd5e1;
        }
        .dev-layer-btn:hover {
          background: rgba(0, 82, 255, 0.08);
          color: var(--primary, #0052FF);
        }
        .dark .dev-layer-btn:hover {
          background: rgba(59, 130, 246, 0.16);
          color: #93c5fd;
        }
        .dev-layer-btn.active {
          background: var(--primary, #0052FF);
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(0, 82, 255, 0.28);
        }
        .dark .dev-layer-btn.active {
          background: #2563eb;
          color: #ffffff;
        }
        .dev-map-tile-warning {
          position: absolute;
          bottom: 14px;
          left: 12px;
          z-index: 800;
          display: flex;
          align-items: center;
          gap: 8px;
          max-width: min(360px, calc(100% - 24px));
          padding: 8px 10px;
          border-radius: 10px;
          background: rgba(254, 242, 242, 0.96);
          border: 1px solid #fca5a5;
          color: #991b1b;
          font-size: 12px;
          font-weight: 500;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.14);
        }
        .dark .dev-map-tile-warning {
          background: rgba(69, 10, 10, 0.92);
          border-color: #b91c1c;
          color: #fecaca;
        }
        .dev-map-tile-warning-icon {
          flex-shrink: 0;
        }
        .dev-map-tile-warning-close {
          margin-left: auto;
          background: transparent;
          border: none;
          color: inherit;
          cursor: pointer;
          padding: 2px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          opacity: 0.75;
        }
        .dev-map-tile-warning-close:hover {
          opacity: 1;
        }
        .custom-dev-marker-wrapper {
          background: transparent;
          border: none;
        }
        .dev-marker-bubble {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #ffffff;
          padding: 5px 10px;
          border-radius: 20px;
          box-shadow: 0 4px 16px rgba(0, 82, 255, 0.2), 0 1px 3px rgba(0,0,0,0.1);
          border: 1.5px solid var(--primary, #0052FF);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
          position: relative;
          white-space: nowrap;
          pointer-events: auto;
        }
        .dark .dev-marker-bubble {
          background: #1e293b;
          border-color: #3b82f6;
          color: #ffffff;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
        }
        .dev-marker-bubble:hover {
          transform: translateY(-3px) scale(1.05);
          z-index: 1000;
          box-shadow: 0 8px 24px rgba(0, 82, 255, 0.35);
        }
        .dev-marker-bubble.selected {
          background: var(--primary, #0052FF) !important;
          color: #ffffff !important;
          border-color: #ffffff;
          transform: translateY(-4px) scale(1.1);
          z-index: 1001;
          box-shadow: 0 8px 24px rgba(0, 82, 255, 0.45);
        }
        .dev-marker-bubble.selected .dev-marker-name,
        .dev-marker-bubble.selected .dev-marker-price {
          color: #ffffff !important;
        }
        .dev-marker-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #10b981;
          flex-shrink: 0;
        }
        .dev-marker-text {
          display: flex;
          flex-direction: column;
          line-height: 1.15;
        }
        .dev-marker-name {
          font-size: 11px;
          font-weight: 700;
          color: var(--text, #0f172a);
          max-width: 115px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dark .dev-marker-name {
          color: #f1f5f9;
        }
        .dev-marker-price {
          font-size: 10px;
          font-weight: 600;
          color: var(--primary, #0052FF);
        }
        .dark .dev-marker-price {
          color: #60a5fa;
        }
        .dev-marker-live-pill {
          background: #10b981;
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 999px;
          line-height: 1.2;
          flex-shrink: 0;
        }
        .dev-marker-bubble.selected .dev-marker-live-pill {
          background: rgba(255, 255, 255, 0.22);
          color: #ffffff;
        }
        .dev-marker-pin {
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid var(--primary, #0052FF);
        }
        .custom-dev-popup .leaflet-popup-content-wrapper {
          padding: 0;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 12px 32px rgba(0,0,0,0.18);
          background: var(--surface, #ffffff);
          color: var(--text, #0f172a);
        }
        .dark .custom-dev-popup .leaflet-popup-content-wrapper {
          background: #1e293b;
          color: #f1f5f9;
        }
        .custom-dev-popup .leaflet-popup-content {
          margin: 0;
          line-height: 1.4;
        }
        .dev-map-popup {
          font-family: inherit;
        }
        .dev-popup-img-wrap {
          position: relative;
          height: 120px;
          overflow: hidden;
        }
        .dev-popup-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .dev-popup-class-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(4px);
          color: #ffffff;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 12px;
          text-transform: uppercase;
        }
        .dev-popup-body {
          padding: 12px 14px;
        }
        .dev-popup-title {
          margin: 0 0 6px 0;
          font-size: 14px;
          font-weight: 700;
        }
        .dev-popup-meta {
          display: flex;
          flex-direction: column;
          gap: 3px;
          font-size: 11px;
          color: var(--text-secondary, #475569);
          margin-bottom: 8px;
        }
        .dark .dev-popup-meta {
          color: #94a3b8;
        }
        .dev-popup-live-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.25);
          border-radius: 8px;
          padding: 6px 8px;
          margin-bottom: 8px;
        }
        .dev-popup-live-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .dev-popup-live-badge {
          font-size: 11px;
          font-weight: 700;
          color: #059669;
        }
        .dark .dev-popup-live-badge {
          color: #34d399;
        }
        .dev-popup-live-rooms {
          font-size: 10px;
          color: var(--text-secondary, #475569);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dark .dev-popup-live-rooms {
          color: #cbd5e1;
        }
        .dev-popup-plan-thumb {
          width: 36px;
          height: 36px;
          border-radius: 6px;
          object-fit: contain;
          background: #ffffff;
          border: 1px solid rgba(148, 163, 184, 0.35);
          flex-shrink: 0;
        }
        .dev-popup-price-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--bg, #f8fafc);
          padding: 6px 8px;
          border-radius: 8px;
          margin-bottom: 10px;
        }
        .dark .dev-popup-price-row {
          background: #0f172a;
        }
        .dev-popup-price-label {
          font-size: 11px;
          color: var(--text-muted, #94a3b8);
        }
        .dev-popup-price-val {
          font-size: 13px;
          font-weight: 700;
          color: var(--primary, #0052FF);
        }
        .dark .dev-popup-price-val {
          color: #60a5fa;
        }
        .dev-popup-action-btn {
          width: 100%;
          padding: 8px 12px;
          border: none;
          border-radius: 10px;
          background: var(--primary, #0052FF);
          color: #ffffff;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .dev-popup-action-btn:hover {
          background: var(--primary-hover, #0043D9);
        }
      `}</style>
    </div>
  );
}
