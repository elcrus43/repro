/**
 * useDealChat.js
 *
 * Хук для чата по сделке.
 * Загружает сообщения из БД и обновляет их каждые 12 секунд (polling).
 * Поддерживает оптимистичную отправку.
 *
 * @param {string} dealId - ID сделки
 * @param {string} side   - 'seller' | 'buyer'
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { neonDb } from '../lib/neon';

export function useDealChat(dealId, side) {
  const [messages, setMessages]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState(null);
  const isMountedRef              = useRef(true);

  const fetchMessages = useCallback(async () => {
    if (!dealId || !side) return;
    try {
      const res = await neonDb.query(
        `SELECT * FROM "deal_messages"
         WHERE "deal_id" = $1 AND "side" = $2
         ORDER BY "created_at" ASC`,
        [dealId, side]
      );
      if (!isMountedRef.current) return;
      if (res.error) {
        setError(res.error.message || 'Ошибка загрузки сообщений');
      } else {
        setMessages(res.data || []);
        setError(null);
      }
    } catch (e) {
      if (isMountedRef.current) setError('Сетевая ошибка');
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [dealId, side]);

  useEffect(() => {
    isMountedRef.current = true;
    setLoading(true);
    setMessages([]);
    fetchMessages();
    const iv = setInterval(fetchMessages, 12000);
    return () => {
      isMountedRef.current = false;
      clearInterval(iv);
    };
  }, [fetchMessages]);

  /**
   * Отправить сообщение с оптимистичным обновлением UI.
   * @param {{ text: string, senderId: string, senderName: string, senderRole: string }} opts
   */
  const sendMessage = useCallback(async ({ text, senderId, senderName, senderRole }) => {
    if (!text?.trim() || !dealId || !side) return;
    const tmpId = `tmp-${Date.now()}`;
    const optimistic = {
      id:          tmpId,
      deal_id:     dealId,
      side,
      sender_id:   senderId,
      sender_name: senderName,
      sender_role: senderRole,
      text:        text.trim(),
      created_at:  new Date().toISOString(),
      _pending:    true,
    };
    setMessages(prev => [...prev, optimistic]);
    setSending(true);

    try {
      const res = await neonDb.insert('deal_messages', {
        deal_id:     dealId,
        side,
        sender_id:   senderId,
        sender_name: senderName,
        sender_role: senderRole,
        text:        text.trim(),
      });

      if (!isMountedRef.current) return;

      if (res.error) {
        // Убираем оптимистичное сообщение при ошибке
        setMessages(prev => prev.filter(m => m.id !== tmpId));
        setError(res.error.message || 'Не удалось отправить');
      } else {
        const saved = res.data?.[0];
        if (saved) {
          setMessages(prev => prev.map(m => m.id === tmpId ? saved : m));
        } else {
          // Если ответ пустой — просто убираем _pending флаг
          setMessages(prev => prev.map(m =>
            m.id === tmpId ? { ...m, _pending: false } : m
          ));
        }
      }
    } catch (e) {
      if (isMountedRef.current) {
        setMessages(prev => prev.filter(m => m.id !== tmpId));
        setError('Сетевая ошибка при отправке');
      }
    } finally {
      if (isMountedRef.current) setSending(false);
    }
  }, [dealId, side]);

  return { messages, loading, sending, error, sendMessage, refetch: fetchMessages };
}
