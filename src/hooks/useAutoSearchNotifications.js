/**
 * src/hooks/useAutoSearchNotifications.js
 *
 * Фоновый хук автоподбора: проверяет появление подходящих объектов
 * на площадках Авито, ЦИАН, ДомКлик по активным запросам клиентов
 * и отправляет уведомления риелтору (Web Push Notification + In-App).
 */

import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { apiFetch } from '../lib/apiConfig';

const STORAGE_KEY = 'rea_notified_portal_listings_v1';
const AUTO_CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 минут

function getNotifiedSet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (e) {
    return new Set();
  }
}

function saveNotifiedSet(set) {
  try {
    const arr = Array.from(set).slice(-500); // Храним последние 500 ID
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch (e) {}
}

export function useAutoSearchNotifications() {
  const { state } = useApp();
  const user = state.currentUser;
  const isCheckingRef = useRef(false);
  const notifiedSetRef = useRef(getNotifiedSet());

  // Запрос разрешения на Web Push уведомления при монтировании
  useEffect(() => {
    if (!user) return;
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, [user]);

  // Периодическая проверка активных запросов
  useEffect(() => {
    if (!user) return;

    const activeRequests = (state.requests || []).filter(r => (r.status || 'active') === 'active');
    if (activeRequests.length === 0) return;

    const checkListings = async () => {
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;

      try {
        // Проверяем первые 3 наиболее актуальных запроса
        const sampleRequests = activeRequests.slice(0, 3);

        for (const req of sampleRequests) {
          const client = (state.clients || []).find(c => c.id === req.client_id);
          const clientName = client?.full_name || 'Клиент';

          const res = await apiFetch('/api/search-listings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              city: req.city || 'Киров',
              rooms: req.rooms,
              budget_max: req.budget_max,
              budget_min: req.budget_min,
              area_min: req.area_min,
              area_max: req.area_max,
              districts: req.districts,
              deal_type: req.deal_type || 'SALE',
              limit: 10,
            }),
          });

          if (!res.ok) continue;

          const data = await res.json();
          const results = data.results || [];

          // Ищем объекты, о которых ещё не уведомляли
          const newItems = results.filter(item => {
            const key = `${item.source}_${item.source_id || item.id}`;
            return !notifiedSetRef.current.has(key);
          });

          if (newItems.length > 0) {
            newItems.forEach(item => {
              const key = `${item.source}_${item.source_id || item.id}`;
              notifiedSetRef.current.add(key);

              // Отправка системного Web Push уведомления
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                const srcMap = { avito: 'Авито', cian: 'ЦИАН', domclick: 'ДомКлик' };
                const portalName = srcMap[item.source] || item.source.toUpperCase();
                const priceStr = item.price ? `${Number(item.price).toLocaleString('ru-RU')} ₽` : '';
                const titleStr = item.title || `${item.rooms ?? '?'}-к. · ${item.total_area ?? '?'} м²`;

                const n = new Notification(`REA CRM: Автоподбор (${portalName})`, {
                  body: `Для клиента ${clientName} найден объект: ${titleStr} за ${priceStr}. Нажмите, чтобы открыть.`,
                  icon: '/icons/icon-192.png',
                });

                n.onclick = () => {
                  window.focus();
                  if (item.source_url) {
                    window.open(item.source_url, '_blank', 'noopener,noreferrer');
                  }
                  n.close();
                };
              }
            });

            saveNotifiedSet(notifiedSetRef.current);
          }
        }
      } catch (err) {
        // Фоновая ошибка не должна ломать UI
        console.warn('[useAutoSearchNotifications] check error:', err.message);
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Первый запуск с задержкой 3 секунды после старта
    const timer = setTimeout(checkListings, 3000);
    const interval = setInterval(checkListings, AUTO_CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [state.requests, state.clients, user]);
}
