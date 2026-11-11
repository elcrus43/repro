/**
 * src/lib/messaging.js — клиент для /api/messaging (Vercel Serverless).
 * Заменяет обращения к несуществующему внешнему API /api/v1/messaging.
 */

import { apiFetch } from './apiConfig';
import { getToken } from './neon';

const ENDPOINT = '/api/messaging';

async function request(options = {}, timeoutMs = 8000) {
    const token = getToken();
    const headers = {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await apiFetch(ENDPOINT, {
            ...options,
            headers,
            signal: controller.signal,
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
            const error = new Error(data?.error || `HTTP ${res.status}`);
            error.status = res.status;
            throw error;
        }
        return data;
    } finally {
        clearTimeout(timer);
    }
}

/** @returns {Promise<Array<object>>} */
export async function listMessageTemplates() {
    const data = await request({ method: 'GET' });
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.templates)) return data.templates;
    return [];
}

/** @returns {Promise<object>} */
export async function createMessageTemplate(template) {
    return request({
        method: 'POST',
        body: JSON.stringify({ action: 'create', ...template }),
    });
}

/** @returns {Promise<{ok: boolean, id: string}>} */
export async function deleteMessageTemplate(id) {
    return request({
        method: 'POST',
        body: JSON.stringify({ action: 'delete', id }),
    });
}

/** @returns {Promise<{text: string, whatsapp: string, telegram: string}>} */
export async function renderMessageTemplate(templateId, context) {
    return request({
        method: 'POST',
        body: JSON.stringify({ action: 'render', template_id: templateId, context }),
    });
}

/* ─── Клиентский fallback (локальные шаблоны / сервер недоступен) ───────── */

export function renderMessageLocally(body, context = {}) {
    return String(body || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key) => {
        const value = context[key];
        return value === undefined || value === null ? '' : String(value);
    });
}

export function buildMessageLinks(text, context = {}) {
    const digits = String(context.phone || context.client_phone || '').replace(/\D/g, '');
    const phone = digits.length === 11 && digits.startsWith('8')
        ? `7${digits.slice(1)}`
        : (digits.length === 10 ? `7${digits}` : digits);
    const encodedText = encodeURIComponent(text);

    return {
        text,
        whatsapp: phone
            ? `https://wa.me/${phone}?text=${encodedText}`
            : `https://wa.me/?text=${encodedText}`,
        telegram: `https://t.me/share/url?url=${encodeURIComponent(context.property_link || '')}&text=${encodedText}`,
    };
}
