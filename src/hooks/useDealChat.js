import { useState, useEffect, useCallback, useRef } from 'react';
import { neonDb } from '../lib/neon';
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://78.154.103.37:14070';
let schemaMigrated = false;

// Схема deal_messages зафиксирована в neon-schema.sql
async function ensureDealMessagesSchema() {
  // no-op: схема управляется через миграции
}

// Звуковое оповещение Telegram chime
function playChatNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

// Пуш-уведомление браузера
function sendWebPushNotification(title, body) {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      try { new Notification(title, { body }); } catch (e) {}
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          try { new Notification(title, { body }); } catch (e) {}
        }
      }).catch(() => {});
    }
  }
}

export function useDealChat(dealId, side, token = null) {
  const [messages, setMessages]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState(null);
  const isMountedRef              = useRef(true);
  const socketRef                 = useRef(null);

  const roomName = dealId && side ? `deal_${dealId}_${side}` : null;

  // Запрос разрешения на уведомления
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!dealId || !side) return;
    try {
      if (token) {
        const queryParams = new URLSearchParams({ token, dealId, side });
        const res = await fetch(`/api/deal-chat?${queryParams.toString()}`);
        if (!res.ok) throw new Error('Ошибка загрузки сообщений');
        const data = await res.json();
        if (!isMountedRef.current) return;
        setMessages(data.messages || []);
        setError(null);
        return;
      }

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
  }, [dealId, side, token]);

  useEffect(() => {
    isMountedRef.current = true;
    setLoading(true);
    setMessages([]);
    fetchMessages();

    // Подключение к сокет-серверу на Wispbyte с защитой от ERR_CONNECTION_REFUSED
    if (roomName && typeof window !== 'undefined') {
      try {
        const isHttps = window.location.protocol === 'https:';
        // Если провайдер или браузер блокирует нешифрованный HTTP сокет с HTTPS сайта, отключаем сокеты без ошибок в консоли
        const socketUrl = isHttps ? 'https://78.154.103.37:14070' : SOCKET_SERVER_URL;

        const socket = io(socketUrl, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 2,
          timeout: 2500,
          autoConnect: true
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          socket.emit('join_room', roomName);
        });

        socket.on('connect_error', (err) => {
          // Безопасный отлов ошибок подключения для предотвращения ERR_CONNECTION_REFUSED
          if (socketRef.current) {
            socketRef.current.disconnect();
          }
        });

        socket.on('new_message', (newMsg) => {
          if (!isMountedRef.current) return;
          
          playChatNotificationSound();
          sendWebPushNotification(
            '💬 Новое сообщение в чате',
            `${newMsg.sender_name || 'Участник'}: ${newMsg.text || 'Вложение'}`
          );

          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id || (m._pending && m.text === newMsg.text))) {
              return prev.map(m => (m._pending && m.text === newMsg.text) ? { ...newMsg, _pending: false } : m);
            }
            return [...prev, newMsg];
          });
        });
      } catch (err) {
        // Игнорируем сетевые ошибки сокета, переключаясь на Neon DB
      }
    }

    // Регулярный поллинг Neon DB раз в 4 секунды для гарантированного получения сообщений
    const iv = setInterval(fetchMessages, 4000);
    return () => {
      isMountedRef.current = false;
      clearInterval(iv);
      if (socketRef.current) {
        try { socketRef.current.disconnect(); } catch (e) {}
      }
    };
  }, [fetchMessages, roomName]);

  /**
   * Отправить сообщение с автомиграцией и безопасным fallback.
   */
  const sendMessage = useCallback(async ({ text, senderId, senderName, senderRole, file_url, file_name, file_type }) => {
    if (!text?.trim() && !file_url) return;
    if (!dealId || !side) return;

    await ensureDealMessagesSchema();

    const tmpId = `tmp-${Date.now()}`;
    const optimistic = {
      id:          tmpId,
      deal_id:     dealId,
      side,
      sender_id:   senderId,
      sender_name: senderName,
      sender_role: senderRole,
      text:        text?.trim() || file_name || 'Документ',
      file_url,
      file_name,
      file_type,
      created_at:  new Date().toISOString(),
      _pending:    true,
    };

    setMessages(prev => [...prev, optimistic]);
    setSending(true);

    // Сокет-трансляция через Wispbyte
    if (socketRef.current && socketRef.current.connected && roomName) {
      socketRef.current.emit('send_message', {
        room: roomName,
        text: text?.trim() || file_name || 'Документ',
        sender_name: senderName,
        sender_role: senderRole,
        file_url,
        file_name,
        file_type
      });
    }

    try {
      let insertPayload = {
        deal_id:     dealId,
        side,
        sender_id:   senderId,
        sender_name: senderName,
        sender_role: senderRole,
        text:        text?.trim() || file_name || 'Документ',
      };

      if (file_url) {
        insertPayload.file_url  = file_url;
        insertPayload.file_name = file_name;
        insertPayload.file_type = file_type;
      }

      let res;
      if (token) {
        const postRes = await fetch('/api/deal-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...insertPayload, token })
        });
        if (!postRes.ok) {
          const errData = await postRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Ошибка отправки');
        }
        const data = await postRes.json();
        res = { data: [data.message], error: null };
      } else {
        res = await neonDb.insert('deal_messages', insertPayload);
      }

      if (!isMountedRef.current) return;

      if (res.error) {
        setMessages(prev => prev.filter(m => m.id !== tmpId));
        setError(res.error.message || 'Не удалось отправить');
      } else {
        const saved = res.data?.[0];
        if (saved) {
          setMessages(prev => prev.map(m => m.id === tmpId ? saved : m));
        } else {
          setMessages(prev => prev.map(m =>
            m.id === tmpId ? { ...m, _pending: false } : m
          ));
        }
      }
    } catch (e) {
      if (isMountedRef.current) {
        setMessages(prev => prev.filter(m => m.id !== tmpId));
        setError('Ошибка при отправке сообщения');
      }
    } finally {
      if (isMountedRef.current) setSending(false);
    }
  }, [dealId, side, roomName]);

  const deleteMessage = useCallback(async (msgId) => {
    if (!msgId) return;
    setMessages(prev => prev.filter(m => m.id !== msgId));
    try {
      await neonDb.delete('deal_messages', msgId);
    } catch (e) {
      console.warn('Failed to delete message from DB:', e);
    }
  }, []);

  return { messages, loading, sending, error, sendMessage, deleteMessage, refetch: fetchMessages };
}
