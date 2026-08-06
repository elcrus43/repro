import { useState, useEffect, useCallback, useRef } from 'react';
import { neonDb } from '../lib/neon';
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://78.154.103.37:14070';

export function useDealChat(dealId, side) {
  const [messages, setMessages]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState(null);
  const isMountedRef              = useRef(true);
  const socketRef                 = useRef(null);

  const roomName = dealId && side ? `deal_${dealId}_${side}` : null;

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

    // Трансляция через Wispbyte сокет
    if (socketRef.current && socketRef.current.connected && roomName) {
      socketRef.current.emit('send_message', {
        room: roomName,
        text: text.trim(),
        sender_name: senderName,
        sender_role: senderRole
      });
    }

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
        setError('Сетевая ошибка при отправке');
      }
    } finally {
      if (isMountedRef.current) setSending(false);
    }
  }, [dealId, side, roomName]);

  return { messages, loading, sending, error, sendMessage, refetch: fetchMessages };
}
