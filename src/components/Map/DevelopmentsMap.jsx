import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatNumber } from '../../utils/format';

/**
 * DevelopmentsMap
 * Интерактивная карта новостроек г. Кирова на Leaflet + OpenStreetMap
 */
export function DevelopmentsMap({
  developments = [],
  selectedId = null,
  onSelect = () => {},
  onOpenDetail = () => {},
  className = '',
  height = '100%'
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef(new Map());

  // Проверка темы для подбора подложки карты
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

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

      // Копирайт OSM
      L.control.attribution({ position: 'bottomright', prefix: false })
        .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>')
        .addTo(map);

      // Слой карты: в темной теме CartoDB Dark, в светлой надежный OSM / CartoDB
      const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}{r}.png'
        : 'https://tile.openstreetmap.org/{z}/{x}.png';

      const tileLayer = L.tileLayer(tileUrl, {
        maxZoom: 19,
        subdomains: isDark ? 'abcd' : 'abc'
      }).addTo(map);

      mapInstanceRef.current = { map, tileLayer };

      // Принудительный расчет размеров после монтирования в DOM
      setTimeout(() => {
        try { map.invalidateSize(); } catch (e) {}
      }, 100);
      setTimeout(() => {
        try { map.invalidateSize(); } catch (e) {}
      }, 400);
    }

    const { map } = mapInstanceRef.current;

    // Ресайз карты при изменении контейнера
    const resizeObserver = new ResizeObserver(() => {
      try { map.invalidateSize(); } catch (e) {}
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

  // Переключение слоя при смене темы
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const { map, tileLayer } = mapInstanceRef.current;
    
    try {
      map.removeLayer(tileLayer);
      const tileUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}{r}.png'
        : 'https://tile.openstreetmap.org/{z}/{x}.png';

      const newLayer = L.tileLayer(tileUrl, {
        maxZoom: 19,
        subdomains: isDark ? 'abcd' : 'abc'
      }).addTo(map);

      mapInstanceRef.current.tileLayer = newLayer;
    } catch (e) {
      console.warn('[Map layer switch error]', e);
    }
  }, [isDark]);

  // Отрисовка маркеров новостроек
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const { map } = mapInstanceRef.current;

    // Удаляем старые маркеры
    markersRef.current.forEach(marker => {
      try { marker.remove(); } catch (e) {}
    });
    markersRef.current.clear();

    if (!developments || developments.length === 0) return;

    const bounds = [];

    developments.forEach(dev => {
      if (!dev.lat || !dev.lng) return;

      const isSelected = dev.id === selectedId;
      const priceText = dev.price_from 
        ? `от ${(dev.price_from / 1000000).toFixed(1).replace('.', ',')} млн ₽`
        : 'Цена по запросу';

      // Кастомный HTML-маркер (плашка с ценой)
      const customIcon = L.divIcon({
        className: 'custom-dev-marker-wrapper',
        html: `
          <div class="dev-marker-bubble ${isSelected ? 'selected' : ''}">
            <div class="dev-marker-dot"></div>
            <div class="dev-marker-text">
              <span class="dev-marker-name">${dev.name.replace('ЖК ', '')}</span>
              <span class="dev-marker-price">${priceText}</span>
            </div>
            <div class="dev-marker-pin"></div>
          </div>
        `,
        iconSize: [120, 44],
        iconAnchor: [60, 44],
        popupAnchor: [0, -44]
      });

      const marker = L.marker([dev.lat, dev.lng], { icon: customIcon });

      // Попап с краткой инфой о ЖК
      const popupHtml = `
        <div class="dev-map-popup">
          ${dev.images && dev.images[0] ? `
            <div class="dev-popup-img-wrap">
              <img src="${dev.images[0]}" alt="${dev.name}" class="dev-popup-img" />
              <span class="dev-popup-class-badge">${dev.housing_class || 'Комфорт'}</span>
            </div>
          ` : ''}
          <div class="dev-popup-body">
            <h4 class="dev-popup-title">${dev.name}</h4>
            <div class="dev-popup-meta">
              <span>🏗️ ${dev.developer || 'Застройщик'}</span>
              <span>📍 ${dev.microdistrict || dev.district || 'Киров'}</span>
              <span>⏱️ ${dev.completion_date || 'Срок уточняется'}</span>
            </div>
            <div class="dev-popup-price-row">
              <span class="dev-popup-price-label">Цена:</span>
              <span class="dev-popup-price-val">${dev.price_from ? `от ${formatNumber(dev.price_from)} ₽` : 'по запросу'}</span>
            </div>
            <button id="btn-popup-open-${dev.id}" class="dev-popup-action-btn">
              Смотреть ЖК и планировки →
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        maxWidth: 280,
        className: 'custom-dev-popup'
      });

      marker.on('popupopen', () => {
        onSelect(dev.id);
        const btn = document.getElementById(`btn-popup-open-${dev.id}`);
        if (btn) {
          btn.onclick = () => onOpenDetail(dev);
        }
      });

      marker.on('click', () => {
        onSelect(dev.id);
      });

      marker.addTo(map);
      markersRef.current.set(dev.id, marker);
      bounds.push([dev.lat, dev.lng]);
    });

    // Центрирование при первом заполнении или выборе
    if (selectedId && markersRef.current.has(selectedId)) {
      const selectedMarker = markersRef.current.get(selectedId);
      const latlng = selectedMarker.getLatLng();
      try { map.flyTo(latlng, Math.max(map.getZoom(), 14), { duration: 0.8 }); } catch (e) {}
    } else if (bounds.length > 0 && !selectedId) {
      try { map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 }); } catch (e) {}
    }
  }, [developments, selectedId]);

  // Фокусировка на выбранном ЖК
  useEffect(() => {
    if (!selectedId || !mapInstanceRef.current) return;
    const { map } = mapInstanceRef.current;
    const marker = markersRef.current.get(selectedId);
    if (marker) {
      const latlng = marker.getLatLng();
      try {
        map.flyTo(latlng, Math.max(map.getZoom(), 14), { duration: 0.6 });
        if (!marker.isPopupOpen()) {
          marker.openPopup();
        }
      } catch (e) {}
    }
  }, [selectedId]);

  return (
    <div 
      className={`developments-map-wrapper ${className}`} 
      style={{ 
        width: '100%', 
        height: height || '100%', 
        minHeight: '480px',
        position: 'relative' 
      }}
    >
      <div 
        ref={mapContainerRef} 
        style={{ 
          width: '100%', 
          height: '100%', 
          minHeight: '480px',
          borderRadius: 'inherit' 
        }} 
      />

      <style>{`
        .developments-map-wrapper {
          min-height: 480px;
          height: 100%;
          width: 100%;
          position: relative;
        }
        .developments-map-wrapper .leaflet-container {
          width: 100% !important;
          height: 100% !important;
          min-height: 480px !important;
          border-radius: inherit;
          font-family: inherit;
          z-index: 1;
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
          max-width: 90px;
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
