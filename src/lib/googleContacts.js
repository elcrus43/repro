/**
 * googleContacts.js
 * Прямая интеграция с Google Contacts (Google People API v1).
 *
 * Использует общую OAuth-сессию из googleCalendar.js (refresh_token в Neon DB)
 * со scope: https://www.googleapis.com/auth/contacts
 *
 * Возможности:
 * - Поиск контакта в Google Контактах по номеру телефона (people:searchContacts)
 * - Автоматическое создание контакта в Google Контактах (people:createContact)
 */

import { stripPhone, formatPhone } from '../utils/format';
import { formatClientForContact } from './contactsSync';
import {
  isCalendarConfigured,
  isCalendarConnected,
  getGoogleAccessToken,
} from './googleCalendar';

const PEOPLE_API_BASE = 'https://people.googleapis.com/v1';
const SEARCH_READ_MASK = 'names,phoneNumbers,emailAddresses,organizations,biographies';

/**
 * Нормализует номер телефона для поиска и сравнения с Google Контактами.
 */
export function normalizePhoneForGoogle(phone) {
  const raw = String(phone || '');
  const rawDigits = raw.replace(/\D/g, '');
  if (!rawDigits) {
    return { digits: '', last10: '', e164: '' };
  }
  const isLocalKirovSixDigit =
    rawDigits.length === 6 &&
    !/[+(]/.test(raw) &&
    !rawDigits.startsWith('7') &&
    !rawDigits.startsWith('8');

  if (rawDigits.length < 10 && !isLocalKirovSixDigit) {
    return { digits: rawDigits, last10: rawDigits, e164: '' };
  }

  const digits = stripPhone(phone);
  if (!digits) {
    return { digits: '', last10: '', e164: '' };
  }
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  const e164 = digits.startsWith('7') && digits.length === 11
    ? `+${digits}`
    : `+${digits}`;
  return { digits, last10, e164 };
}

/**
 * Сравнивает два номера телефона по нормализованным цифрам (последние 10 цифр).
 */
export function phonesMatch(phoneA, phoneB) {
  const a = normalizePhoneForGoogle(phoneA);
  const b = normalizePhoneForGoogle(phoneB);
  if (!a.digits || !b.digits) return false;
  if (a.digits.length >= 10 && b.digits.length >= 10) {
    return a.last10 === b.last10;
  }
  return a.digits === b.digits;
}

/**
 * Проверяет, подключён ли Google-аккаунт в CRM.
 */
export function isGoogleContactsAvailable() {
  return isCalendarConfigured() && isCalendarConnected();
}

/**
 * Извлекает компактное описание контакта из ответа Google People API.
 */
export function extractGoogleContactSummary(person) {
  if (!person) return null;
  const nameObj = person.names?.[0];
  const displayName = nameObj?.displayName
    || [nameObj?.familyName, nameObj?.givenName].filter(Boolean).join(' ')
    || '';
  const phone = person.phoneNumbers?.[0]?.value || '';
  const email = person.emailAddresses?.[0]?.value || '';
  const org = person.organizations?.[0]?.name || '';
  const note = person.biographies?.[0]?.value || '';

  return {
    resourceName: person.resourceName || '',
    name: displayName,
    phone,
    email,
    organization: org,
    note,
  };
}

/**
 * Определяет, связана ли ошибка Google API с нехваткой прав (scope contacts).
 */
function isInsufficientScopeError(status, errBody) {
  if (status !== 403) return false;
  const msg = String(errBody?.error?.message || '').toLowerCase();
  const reason = String(errBody?.error?.details?.[0]?.reason || '').toLowerCase();
  const statusStr = String(errBody?.error?.status || '').toLowerCase();
  return (
    msg.includes('insufficient') ||
    msg.includes('permission') ||
    msg.includes('scope') ||
    reason.includes('insufficient') ||
    statusStr === 'permission_denied'
  );
}

/**
 * Ищет контакт в Google Контактах по номеру телефона.
 *
 * Возвращает объект со статусом:
 * - { status: 'too_short', found: false, contact: null }
 * - { status: 'not_connected', found: false, contact: null }
 * - { status: 'found', found: true, contact }
 * - { status: 'not_found', found: false, contact: null }
 * - { status: 'insufficient_scope', found: false, contact: null, error }
 * - { status: 'error', found: false, contact: null, error }
 */
export async function searchGoogleContactByPhone(phone, { signal } = {}) {
  const { digits, last10 } = normalizePhoneForGoogle(phone);
  if (!digits || digits.length < 10) {
    return { status: 'too_short', found: false, contact: null };
  }

  if (!isGoogleContactsAvailable()) {
    return { status: 'not_connected', found: false, contact: null };
  }

  let token;
  try {
    token = await getGoogleAccessToken();
  } catch (err) {
    return {
      status: 'not_connected',
      found: false,
      contact: null,
      error: err.message,
    };
  }

  const query = last10 || digits;
  const url = `${PEOPLE_API_BASE}/people:searchContacts?query=${encodeURIComponent(query)}&readMask=${SEARCH_READ_MASK}&pageSize=10`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      if (isInsufficientScopeError(res.status, errBody)) {
        return {
          status: 'insufficient_scope',
          found: false,
          contact: null,
          error: 'Нет доступа к Google Контактам - переподключите Google в Профиле',
        };
      }
      if (res.status === 401) {
        return {
          status: 'not_connected',
          found: false,
          contact: null,
          error: 'Токен Google истёк - переподключите аккаунт в Профиле',
        };
      }
      return {
        status: 'error',
        found: false,
        contact: null,
        error: errBody?.error?.message || `HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];

    for (const item of results) {
      const person = item?.person;
      const personPhones = Array.isArray(person?.phoneNumbers) ? person.phoneNumbers : [];
      if (personPhones.some(p => phonesMatch(p.value, digits))) {
        return {
          status: 'found',
          found: true,
          contact: extractGoogleContactSummary(person),
        };
      }
    }

    return { status: 'not_found', found: false, contact: null };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { status: 'aborted', found: false, contact: null };
    }
    return {
      status: 'error',
      found: false,
      contact: null,
      error: err.message || 'Ошибка запроса к Google Контактам',
    };
  }
}

/**
 * Формирует тело запроса для Google People API people:createContact.
 */
export function buildGoogleContactPayload(client) {
  const data = formatClientForContact(client);
  if (!data) return null;

  const nameParts = data.name.split(/\s+/).filter(Boolean);
  const familyName = nameParts.length > 1 ? nameParts[0] : '';
  const givenName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : (nameParts[0] || 'Клиент REA CRM');

  const rawPhones = Array.isArray(client?.phones) && client.phones.length > 0
    ? client.phones
    : [client?.phone || data.phone].filter(Boolean);

  const uniquePhones = [];
  const seenDigits = new Set();
  for (const p of rawPhones) {
    const norm = normalizePhoneForGoogle(p);
    if (!norm.digits || seenDigits.has(norm.digits)) continue;
    seenDigits.add(norm.digits);
    uniquePhones.push({
      value: norm.digits.length === 11 && norm.digits.startsWith('7')
        ? formatPhone(norm.digits, true)
        : (norm.e164 || String(p).trim()),
      type: uniquePhones.length === 0 ? 'mobile' : 'other',
    });
  }

  const payload = {
    names: [
      familyName
        ? { familyName, givenName }
        : { givenName },
    ],
    phoneNumbers: uniquePhones,
    organizations: [
      {
        name: data.organization || 'REA CRM',
        title: data.jobTitle || 'Клиент',
      },
    ],
  };

  if (data.email) {
    payload.emailAddresses = [{ value: data.email, type: 'work' }];
  }

  if (data.note) {
    payload.biographies = [{ value: data.note, contentType: 'TEXT_PLAIN' }];
  }

  return payload;
}

/**
 * Создаёт контакт в Google Контактах, предварительно проверяя дубликат по телефону.
 */
export async function createGoogleContact(client, { checkDuplicate = true } = {}) {
  const primaryPhone = (Array.isArray(client?.phones) && client.phones[0]) || client?.phone || '';
  const { digits } = normalizePhoneForGoogle(primaryPhone);
  if (!digits || digits.length < 10) {
    return { created: false, skipped: true, reason: 'invalid_phone' };
  }

  if (!isGoogleContactsAvailable()) {
    return { created: false, skipped: true, reason: 'not_connected' };
  }

  if (checkDuplicate) {
    const existing = await searchGoogleContactByPhone(primaryPhone);
    if (existing.found) {
      return {
        created: false,
        alreadyExists: true,
        contact: existing.contact,
      };
    }
    if (existing.status === 'insufficient_scope') {
      const err = new Error(existing.error);
      err.code = 'INSUFFICIENT_SCOPE';
      throw err;
    }
  }

  const token = await getGoogleAccessToken();
  const payload = buildGoogleContactPayload(client);
  if (!payload || payload.phoneNumbers.length === 0) {
    return { created: false, skipped: true, reason: 'empty_payload' };
  }

  const res = await fetch(`${PEOPLE_API_BASE}/people:createContact?personFields=${SEARCH_READ_MASK}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    if (isInsufficientScopeError(res.status, errBody)) {
      const err = new Error('Нет доступа к Google Контактам - переподключите Google в Профиле');
      err.code = 'INSUFFICIENT_SCOPE';
      throw err;
    }
    throw new Error(errBody?.error?.message || `Google Contacts HTTP ${res.status}`);
  }

  const createdPerson = await res.json();
  return {
    created: true,
    alreadyExists: false,
    contact: extractGoogleContactSummary(createdPerson),
  };
}
