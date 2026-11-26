import { useEffect, useRef, useState, useCallback } from 'react';
import {
  normalizePhoneForGoogle,
  searchGoogleContactByPhone,
  isGoogleContactsAvailable,
} from '../lib/googleContacts';

/**
 * Хук автоматической проверки номера телефона в Google Контактах с дебаунсом.
 */
export function useGoogleContactCheck(phone, { enabled = true, delayMs = 450 } = {}) {
  const [state, setState] = useState({
    status: 'idle',
    contact: null,
    error: null,
    checkedDigits: '',
  });
  const [triggerCount, setTriggerCount] = useState(0);
  const lastResultRef = useRef({ digits: '', result: null });

  const recheck = useCallback(() => {
    lastResultRef.current = { digits: '', result: null };
    setTriggerCount(c => c + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setState({ status: 'idle', contact: null, error: null, checkedDigits: '' });
      return;
    }

    const { digits } = normalizePhoneForGoogle(phone);
    if (!digits || digits.length < 10) {
      setState({ status: 'idle', contact: null, error: null, checkedDigits: '' });
      return;
    }

    if (!isGoogleContactsAvailable()) {
      setState({
        status: 'not_connected',
        contact: null,
        error: null,
        checkedDigits: digits,
      });
      return;
    }

    if (lastResultRef.current.digits === digits && lastResultRef.current.result) {
      setState(lastResultRef.current.result);
      return;
    }

    const controller = new AbortController();
    setState(prev => ({
      ...prev,
      status: 'checking',
      error: null,
      checkedDigits: digits,
    }));

    const timer = setTimeout(async () => {
      const res = await searchGoogleContactByPhone(phone, { signal: controller.signal });
      if (controller.signal.aborted || res.status === 'aborted') return;

      const nextState = {
        status: res.status,
        contact: res.contact || null,
        error: res.error || null,
        checkedDigits: digits,
      };
      if (res.status === 'found' || res.status === 'not_found') {
        lastResultRef.current = { digits, result: nextState };
      }
      setState(nextState);
    }, delayMs);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [phone, enabled, delayMs, triggerCount]);

  return {
    ...state,
    recheck,
  };
}
