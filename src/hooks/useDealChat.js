import { useState, useEffect, useCallback, useRef } from 'react';
import { neonDb } from '../lib/neon';
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://78.154.103.37:14070';

// Звуковое оповещение Telegram chime
function playChatNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
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

export function useDealChat(dealId, side) {
  const [messages, setMessages]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState(null);
  const isMountedRef              = useRef(true);
  const socketRef                 = useRef(null);

  const roomName = dealId && side ? `deal_${dealId}_${side}` : null;

  // Запрос разрешения на уведомления при первом подключении
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

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

    // Подключение к сокет-серверу на Wispbyte
    if (roomName) {
      try {
        const socket = io(SOCKET_SERVER_URL, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: 5,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          socket.emit('join_room', roomName);
        });

        socket.on('new_message', (newMsg) => {
          if (!isMountedRef.current) return;
          
          // Звук и push если новое входящее сообщение
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
        console.warn('Wispbyte socket connection offline:', err);
      }
    }

    const iv = setInterval(fetchMessages, 12000);
    return () => {
      isMountedRef.current = false;
      clearInterval(iv);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [fetchMessages, roomName]);

  /**
   * Отправить сообщение с оптимистичным обновлением UI и сокет-трансляцией.
   */
  const sendMessage = useCallback(async ({ text, senderId, senderName, senderRole, file_url, file_name, file_type }) => {
    if (!text?.trim() && !file_url) return;
    if (!dealId || !side) return;

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

    // Трансляция через Wispbyte сокет
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
      const res = await neonDb.insert('deal_messages', {
        deal_id:     dealId,
        side,
        sender_id:   senderId,
        sender_name: senderName,
        sender_role: senderRole,
        text:        text?.trim() || file_name || 'Документ',
        file_url,
        file_name,
        file_type
      });

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

  return { messages, loading, sending, error, sendMessage, refetch: fetchMessages };
}
