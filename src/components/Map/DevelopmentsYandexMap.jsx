import React, { useEffect, useRef, useState } from 'react';
import { formatNumber } from '../../utils/format';
import { Loader2, AlertCircle } from 'lucide-react';

const YANDEX_API_KEY = import.meta.env.VITE_YANDEX_MAPS_KEY || 'a92f83f2-b433-44b4-ae5f-ff2bd016214a';

/**
 * DevelopmentsYandexMap
 * Интерактивная карта новостроек г. Кирова на официальном Яндекс.Карты JS API v2.1
 */
export function DevelopmentsYandexMap({
  developments = [],
  selectedId = null,
  onSelect = () => {},
  onOpenDetail = () => {},
  className = '',
  height = '100%'
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const placemarksMapRef = useRef(new Map());
  const clustererRef = useRef(null);
  const developmentsRef = useRef(developments);
  const selectedIdRef = useRef(selectedId);
  const onOpenDetailRef = useRef(onOpenDetail);
  const onSelectRef = useRef(onSelect);
  const [loading, setLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    developmentsRef.current = developments;
    selectedIdRef.current = selectedId;
    onOpenDetailRef.current = onOpenDetail;
    onSelectRef.current = onSelect;
  }, [developments, selectedId, onOpenDetail, onSelect]);

  // 1. Загрузка скрипта Яндекс.Карт API
  useEffect(() => {
    let isCancelled = false;

    // Клик по кнопке "Подробнее" внутри открытого балуна (использует актуальные refs)
    const handleGlobalBalloonClick = (e) => {
      const btn = e.target.closest('[data-ymap-detail-id]');
      if (btn) {
        const devId = btn.getAttribute('data-ymap-detail-id');
        const targetDev = (developmentsRef.current || []).find(d => String(d.id) === String(devId));
        if (targetDev) {
          onOpenDetailRef.current?.(targetDev);
        }
      }
    };

    function initYandexMaps() {
      if (window.ymaps && window.ymaps.Map) {
        window.ymaps.ready(() => {
          if (!isCancelled) {
            setLoading(false);
            createMap();
          }
        });
        return;
      }

      // Проверяем, есть ли уже script тег
      let script = document.getElementById('yandex-maps-api-script');
      if (!script) {
        script = document.createElement('script');
        script.id = 'yandex-maps-api-script';
        script.type = 'text/javascript';
        script.src = `https://api-maps.yandex.ru/2.1/?apikey=${YANDEX_API_KEY}&lang=ru_RU`;
        script.async = true;
        document.head.appendChild(script);
      }

      script.addEventListener('load', () => {
        if (window.ymaps) {
          window.ymaps.ready(() => {
            if (!isCancelled) {
              setLoading(false);
              createMap();
            }
          });
        }
      });

      script.addEventListener('error', (err) => {
        if (!isCancelled) {
          console.error('[YandexMaps Load Error]', err);
          setError('Не удалось загрузить скрипт Яндекс.Карт. Проверьте интернет-соединение.');
          setLoading(false);
        }
      });
    }

    function createMap() {
      if (!containerRef.current || mapRef.current || !window.ymaps) return;

      try {
        // Координаты центра Кирова
        const kirovCenter = [58.6035, 49.6679];

        const map = new window.ymaps.Map(containerRef.current, {
          center: kirovCenter,
          zoom: 12,
          controls: ['zoomControl', 'fullscreenControl', 'typeSelector', 'geolocationControl']
        }, {
          searchControlProvider: 'yandex#search',
          suppressMapOpenBlock: true
        });

        // Кластеризатор меток с красивой анимацией
        const clusterer = new window.ymaps.Clusterer({
          preset: 'islands#invertedBlueClusterIcons',
          groupByCoordinates: false,
          clusterDisableClickZoom: false,
          clusterHideIconOnBalloonOpen: false,
          geoObjectHideIconOnBalloonOpen: false
        });

        map.geoObjects.add(clusterer);

        mapRef.current = map;
        clustererRef.current = clusterer;
        setLoading(false);
        setMapReady(true);

        // Слушаем клик внутри балуна для кнопки "Подробнее"
        document.addEventListener('click', handleGlobalBalloonClick);

        // Принудительный расчет контейнера
        setTimeout(() => {
          try { map.container.fitToViewport(); } catch { /* ignore */ }
        }, 150);
        setTimeout(() => {
          try { map.container.fitToViewport(); } catch { /* ignore */ }
        }, 500);

      } catch (err) {
        console.error('[YandexMaps Init Error]', err);
        setError('Ошибка инициализации карты: ' + err.message);
      }
    }

    initYandexMaps();

    return () => {
      isCancelled = true;
      document.removeEventListener('click', handleGlobalBalloonClick);
      if (mapRef.current) {
        try {
          mapRef.current.destroy();
        } catch (e) {
          console.warn('[YandexMaps Destroy Warning]', e);
        }
        mapRef.current = null;
        clustererRef.current = null;
        setMapReady(false);
      }
    };
  }, []);

  // 2. Отрисовка меток ЖК при обновлении списка или готовности карты
  useEffect(() => {
    const map = mapRef.current;
    const clusterer = clustererRef.current;
    if (!mapReady || !map || !clusterer || !window.ymaps) return;

    clusterer.removeAll();
    placemarksMapRef.current.clear();

    if (!developments || developments.length === 0) return;

    const placemarks = [];

    developments.forEach(dev => {
      if (!dev.lat || !dev.lng) return;

      const isSelected = String(dev.id) === String(selectedIdRef.current);
      const priceText = dev.price_from 
        ? `от ${(dev.price_from / 1000000).toFixed(1).replace('.', ',')} млн`
        : 'цена по запросу';

      const shortName = dev.name.replace('ЖК ', '').replace('Дом ', '');

      const balloonHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Inter', Roboto, sans-serif; max-width: 280px; padding: 2px;">
          ${dev.images && dev.images[0] ? `
            <div style="position: relative; width: 100%; height: 130px; border-radius: 10px; overflow: hidden; margin-bottom: 8px;">
              <img src="${dev.images[0]}" alt="${dev.name}" style="width: 100%; height: 100%; object-fit: cover;" />
              <span style="position: absolute; top: 6px; right: 6px; background: rgba(15,23,42,0.8); color: #fff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; text-transform: uppercase;">
                ${dev.housing_class || 'Комфорт'}
              </span>
            </div>
          ` : ''}
          <h4 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 700; color: #0f172a; line-height: 1.25;">
            ${dev.name}
          </h4>
          <div style="font-size: 12px; color: #475569; margin-bottom: 3px;">
            🏗️ <b>${dev.developer || 'Застройщик'}</b>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 3px;">
            📍 ${dev.microdistrict ? `${dev.microdistrict}, ` : ''}${dev.address}
          </div>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
            ⏱️ Срок сдачи: <b>${dev.completion_date || 'Строится'}</b>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 10px; margin-bottom: 10px;">
            <span style="font-size: 11px; color: #64748b;">Квартиры:</span>
            <span style="font-size: 14px; font-weight: 700; color: #0052FF;">
              ${dev.price_from ? `от ${formatNumber(dev.price_from)} ₽` : 'По запросу'}
            </span>
          </div>
          <button 
            type="button" 
            data-ymap-detail-id="${dev.id}" 
            style="width: 100%; background: #0052FF; color: #ffffff; border: none; border-radius: 8px; padding: 8px 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: background 0.2s;"
          >
            Смотреть ЖК и планировки ->
          </button>
        </div>
      `;

      const placemark = new window.ymaps.Placemark(
        [dev.lat, dev.lng],
        {
          balloonContent: balloonHtml,
          hintContent: `<b>${dev.name}</b><br/>${priceText} ₽`,
          iconCaption: `${shortName} (${priceText})`,
          clusterCaption: dev.name
        },
        {
          preset: isSelected ? 'islands#redDotIconWithCaption' : 'islands#blueDotIconWithCaption',
          iconColor: isSelected ? '#EF4444' : '#0052FF',
          balloonMaxWidth: 300,
          hideIconOnBalloonOpen: false
        }
      );

      placemark.events.add('click', () => {
        onSelectRef.current?.(dev.id);
      });

      placemarks.push(placemark);
      placemarksMapRef.current.set(String(dev.id), placemark);
    });

    clusterer.add(placemarks);

    // Центрирование при смене фильтров
    const activeSelectedId = selectedIdRef.current;
    if (activeSelectedId && placemarksMapRef.current.has(String(activeSelectedId))) {
      const pm = placemarksMapRef.current.get(String(activeSelectedId));
      const coords = pm.geometry.getCoordinates();
      map.panTo(coords, { flying: true, duration: 600 });
    } else if (placemarks.length > 0 && !activeSelectedId) {
      try {
        const bounds = clusterer.getBounds();
        if (bounds) {
          map.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 });
        }
      } catch { /* ignore */ }
    }
  }, [developments, mapReady]);

  // 3. Выбор конкретного ЖК из списка и подсветка метки
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) return;

    placemarksMapRef.current.forEach((pm, id) => {
      const isSelected = selectedId && String(id) === String(selectedId);
      try {
        pm.options.set({
          preset: isSelected ? 'islands#redDotIconWithCaption' : 'islands#blueDotIconWithCaption',
          iconColor: isSelected ? '#EF4444' : '#0052FF'
        });
      } catch { /* ignore */ }
    });

    if (!selectedId) return;
    const pm = placemarksMapRef.current.get(String(selectedId));
    if (pm) {
      const coords = pm.geometry.getCoordinates();
      const targetZoom = Math.max(map.getZoom(), 15);
      map.setCenter(coords, targetZoom, { duration: 450 }).then(() => {
        try {
          if (!pm.balloon.isOpen()) {
            pm.balloon.open();
          }
        } catch { /* ignore */ }
      });
    }
  }, [selectedId, mapReady]);

  return (
    <div 
      className={`developments-yandex-map-container ${className}`} 
      style={{ 
        position: 'relative', 
        width: '100%', 
        height: height || '100%', 
        minHeight: '440px',
        borderRadius: 'inherit',
        overflow: 'hidden',
        background: '#f1f5f9'
      }}
    >
      {/* Контейнер самой карты */}
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: '100%', 
          minHeight: '440px',
          borderRadius: 'inherit'
        }} 
      />

      {/* Лоадер инициализации */}
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(4px)',
          zIndex: 10,
          gap: 12
        }}>
          <Loader2 className="animate-spin text-primary" size={32} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary, #475569)' }}>
            Загрузка карты Кирова (Яндекс.Карты)...
          </span>
        </div>
      )}

      {/* Сообщение об ошибке */}
      {error && (
        <div style={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          padding: '12px 16px',
          background: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          color: '#991b1b',
          fontSize: 13,
          zIndex: 10
        }}>
          <AlertCircle size={18} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Бейдж Яндекс.Карты */}
      <div style={{
        position: 'absolute',
        bottom: 8,
        left: 8,
        background: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(6px)',
        padding: '3px 8px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 600,
        color: '#1e293b',
        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        gap: 5
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} />
        <span>Яндекс.Карты • г. Киров</span>
      </div>
    </div>
  );
}
