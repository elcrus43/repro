/**
 * src/lib/socialShare.js
 *
 * Единый модуль для работы с подключёнными соцсетями в профиле
 * и отправки сгенерированного баннера в Сторис:
 *   - VK (API stories.getPhotoUploadServer -> stories.save ИЛИ нативный шэринг / скачивание)
 *   - OK (нативный Intent / Web Share / скачивание + переход)
 *   - Telegram (Telegram Bot API sendPhoto ИЛИ нативный шэринг / скачивание)
 *   - Instagram (Android ADD_TO_STORY Intent / Web Share / скачивание + переход)
 *   - WhatsApp (Android Intent -> Мой статус / Web Share / скачивание + переход)
 */

import { apiFetch } from './apiConfig';
import { getToken } from './neon';
import { formatNumber } from '../utils/format';

const SOCIAL_ENDPOINT = '/api/social-publish';

export const SOCIAL_NETWORKS = [
    {
        id: 'vk',
        name: 'ВКонтакте',
        shortName: 'VK',
        storyLabel: 'Сторис VK',
        color: '#0077FF',
        bgLight: 'rgba(0, 119, 255, 0.1)',
        placeholder: 'vk.com/username или @id',
        supportsApi: true,
        apiHint: 'Прямой автопостинг в Сторис VK по токену (права stories, photos)',
        defaultUrl: 'https://vk.com/',
    },
    {
        id: 'ok',
        name: 'Одноклассники',
        shortName: 'OK',
        storyLabel: 'Сторис OK',
        color: '#EE8208',
        bgLight: 'rgba(238, 130, 8, 0.1)',
        placeholder: 'ok.ru/profile/...',
        supportsApi: false,
        apiHint: 'Нативная отправка фото в приложение OK или скачивание для Сторис',
        defaultUrl: 'https://ok.ru/',
    },
    {
        id: 'tg',
        name: 'Telegram',
        shortName: 'ТГ',
        storyLabel: 'Сторис ТГ',
        color: '#229ED9',
        bgLight: 'rgba(34, 158, 217, 0.1)',
        placeholder: '@username или t.me/...',
        supportsApi: true,
        apiHint: 'Автоотправка через Telegram-бота в канал/чат или нативный шэринг в Сторис на телефоне',
        defaultUrl: 'https://t.me/',
    },
    {
        id: 'instagram',
        name: 'Instagram',
        shortName: 'Instagram',
        storyLabel: 'Сторис Instagram',
        color: '#E4405F',
        bgLight: 'rgba(228, 64, 95, 0.1)',
        placeholder: '@username или instagram.com/...',
        supportsApi: false,
        apiHint: 'Прямой переход в редактор Сторис Instagram на телефоне или скачивание PNG',
        defaultUrl: 'https://www.instagram.com/',
    },
    {
        id: 'whatsapp',
        name: 'WhatsApp',
        shortName: 'WhatsApp',
        storyLabel: 'Сторис WhatsApp',
        color: '#25D366',
        bgLight: 'rgba(37, 211, 102, 0.1)',
        placeholder: '+7 (999) 000-00-00',
        supportsApi: false,
        apiHint: 'Отправка фото в WhatsApp (Статус / чат) на телефоне или скачивание PNG',
        defaultUrl: 'https://web.whatsapp.com/',
    },
];

export function getDefaultSocialAccounts() {
    return {
        vk: { enabled: false, handle: '', publishMode: 'share' },
        ok: { enabled: false, handle: '', publishMode: 'share' },
        tg: { enabled: false, handle: '', publishMode: 'share' },
        instagram: { enabled: false, handle: '', publishMode: 'share' },
        whatsapp: { enabled: false, handle: '', publishMode: 'share' },
    };
}

export function normalizeSocialAccounts(userOrPassport) {
    const defaults = getDefaultSocialAccounts();
    const raw =
        userOrPassport?.passport_details?.social_accounts ||
        userOrPassport?.social_accounts ||
        (userOrPassport && !userOrPassport.passport_details && userOrPassport.vk ? userOrPassport : null) ||
        {};

    const result = {};
    for (const net of SOCIAL_NETWORKS) {
        const src = raw[net.id] || {};
        result[net.id] = {
            enabled: Boolean(src.enabled),
            handle: typeof src.handle === 'string' ? src.handle : '',
            publishMode: net.supportsApi && src.publishMode === 'api' ? 'api' : 'share',
        };
    }
    return { ...defaults, ...result };
}

export function getConnectedSocialNetworks(user) {
    const accounts = normalizeSocialAccounts(user);
    return SOCIAL_NETWORKS.filter(net => accounts[net.id]?.enabled).map(net => ({
        ...net,
        account: accounts[net.id],
    }));
}

export function resolveSocialUrl(networkId, handle) {
    const net = SOCIAL_NETWORKS.find(n => n.id === networkId);
    const fallback = net?.defaultUrl || 'https://vk.com/';
    const raw = String(handle || '').trim();
    if (!raw) return fallback;

    if (/^https?:\/\//i.test(raw)) {
        try {
            const parsed = new URL(raw);
            if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
                return parsed.toString();
            }
        } catch {
            return fallback;
        }
        return fallback;
    }

    const clean = raw.replace(/^@/, '').trim();
    if (!clean) return fallback;

    if (networkId === 'vk') {
        return raw.includes('vk.com') ? `https://${raw.replace(/^\/+/, '')}` : `https://vk.com/${encodeURIComponent(clean)}`;
    }
    if (networkId === 'ok') {
        return raw.includes('ok.ru') ? `https://${raw.replace(/^\/+/, '')}` : `https://ok.ru/${encodeURIComponent(clean)}`;
    }
    if (networkId === 'tg') {
        return raw.includes('t.me') ? `https://${raw.replace(/^\/+/, '')}` : `https://t.me/${encodeURIComponent(clean)}`;
    }
    if (networkId === 'instagram') {
        return raw.includes('instagram.com') ? `https://${raw.replace(/^\/+/, '')}` : `https://www.instagram.com/${encodeURIComponent(clean)}/`;
    }
    if (networkId === 'whatsapp') {
        const digits = raw.replace(/\D/g, '');
        if (!digits) return fallback;
        const normalized = digits.length === 11 && digits.startsWith('8')
            ? `7${digits.slice(1)}`
            : (digits.length === 10 ? `7${digits}` : digits);
        return `https://wa.me/${normalized}`;
    }
    return fallback;
}

export function buildBannerCaption(property = {}, phone = '', locationText = '') {
    const parts = [];
    const roomsLabel = property.rooms ? `${property.rooms}-комн. ` : '';
    const title = property.title || `${roomsLabel}объект недвижимости`;
    parts.push(title.trim());

    if (property.price) {
        parts.push(`Цена: ${formatNumber(property.price)} ₽`);
    }

    const area = property.area_total || property.area;
    const specs = [];
    if (area) specs.push(`${area} м²`);
    if (property.floor) {
        specs.push(property.floors_total ? `${property.floor}/${property.floors_total} эт.` : `${property.floor} эт.`);
    }
    if (specs.length > 0) parts.push(specs.join(', '));

    const addr = [locationText, property.address].filter(Boolean).join(' - ');
    if (addr) parts.push(addr);
    if (phone) parts.push(`Тел.: ${phone}`);

    return parts.join('\n');
}

export function dataUrlToFile(dataUrl, fileName = 'banner.png') {
    const parts = String(dataUrl || '').split(',');
    const header = parts[0] || '';
    const base64 = parts[1] || '';
    const mimeMatch = header.match(/data:([^;]+);base64/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new File([bytes], fileName, { type: mime });
}

export function triggerDownload(dataUrl, fileName = 'banner.png') {
    const a = document.createElement('a');
    a.download = fileName;
    a.href = dataUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

/* ─── API-клиент для /api/social-publish ──────────────────────────────────── */

async function socialApiRequest(options = {}, timeoutMs = 20000) {
    const token = getToken();
    const headers = {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await apiFetch(SOCIAL_ENDPOINT, {
            ...options,
            headers,
            signal: controller.signal,
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            throw new Error(data?.error || `Ошибка сервера (${res.status})`);
        }
        return data;
    } finally {
        clearTimeout(timer);
    }
}

export function getSocialTokenStatus() {
    return socialApiRequest({ method: 'GET' }, 8000);
}

export function saveVkToken(token) {
    return socialApiRequest({
        method: 'POST',
        body: JSON.stringify({ action: 'save_vk', token }),
    });
}

export function disconnectVkToken() {
    return socialApiRequest({
        method: 'POST',
        body: JSON.stringify({ action: 'disconnect_vk' }),
    });
}

export function saveTelegramBot(botToken, chatId) {
    return socialApiRequest({
        method: 'POST',
        body: JSON.stringify({ action: 'save_tg', botToken, chatId }),
    });
}

export function disconnectTelegramBot() {
    return socialApiRequest({
        method: 'POST',
        body: JSON.stringify({ action: 'disconnect_tg' }),
    });
}

export function publishVkStory({ imageBase64, caption = '', linkUrl = '' }) {
    return socialApiRequest({
        method: 'POST',
        body: JSON.stringify({ action: 'publish_vk_story', imageBase64, caption, linkUrl }),
    }, 30000);
}

export function publishTelegramPhoto({ imageBase64, caption = '' }) {
    return socialApiRequest({
        method: 'POST',
        body: JSON.stringify({ action: 'publish_tg', imageBase64, caption }),
    }, 30000);
}

/* ─── Единая точка отправки баннера в соцсеть ─────────────────────────────── */

function getAndroidSharePlugin() {
    if (typeof window === 'undefined') return null;
    const isAndroid =
        Boolean(window.Capacitor) &&
        (window.Capacitor.getPlatform?.() === 'android' || window.Capacitor.platform === 'android');
    if (!isAndroid) return null;
    return window.Capacitor?.Plugins?.SocialSharePlugin ?? null;
}

export async function shareBannerToSocial({
    networkId,
    dataUrl,
    fileName = 'banner.png',
    caption = '',
    linkUrl = '',
    account = {},
    tokenStatus = null,
}) {
    const net = SOCIAL_NETWORKS.find(n => n.id === networkId);
    if (!net) {
        throw new Error('Неизвестная соцсеть');
    }
    if (!dataUrl) {
        throw new Error('Изображение баннера ещё не готово');
    }

    // 1. Прямой автопостинг через серверное API (VK Stories / Telegram Bot)
    if (networkId === 'vk' && account?.publishMode === 'api') {
        if (!tokenStatus?.vk?.hasToken) {
            throw new Error('Для автопостинга в VK укажите токен доступа VK в профиле');
        }
        const res = await publishVkStory({ imageBase64: dataUrl, caption, linkUrl });
        return { ok: true, method: 'api', message: res?.message || 'Баннер опубликован в Сторис VK' };
    }

    if (networkId === 'tg' && account?.publishMode === 'api') {
        if (!tokenStatus?.tg?.hasToken) {
            throw new Error('Для отправки через бота укажите токен и Chat ID в профиле');
        }
        const res = await publishTelegramPhoto({ imageBase64: dataUrl, caption });
        return { ok: true, method: 'api', message: res?.message || 'Баннер отправлен в Telegram' };
    }

    // 2. Нативный Android Capacitor-плагин (передача PNG прямо в приложение соцсети / редактор Сторис)
    const androidPlugin = getAndroidSharePlugin();
    if (androidPlugin?.shareToStory) {
        const res = await androidPlugin.shareToStory({
            network: networkId,
            imageBase64: dataUrl,
            fileName,
            caption,
        });
        return {
            ok: true,
            method: 'android',
            message: res?.message || `Открыто приложение ${net.name} для публикации баннера`,
        };
    }

    // 3. Системное меню «Поделиться» в мобильных браузерах (Web Share API Level 2)
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
            const file = dataUrlToFile(dataUrl, fileName);
            const canShareFiles =
                typeof navigator.canShare === 'function' ? navigator.canShare({ files: [file] }) : false;

            if (canShareFiles) {
                await navigator.share({
                    files: [file],
                    title: 'Баннер объекта',
                    text: caption,
                });
                return {
                    ok: true,
                    method: 'web-share',
                    message: `Баннер передан для публикации (${net.storyLabel})`,
                };
            }
        } catch (err) {
            if (err?.name === 'AbortError') {
                return { ok: false, cancelled: true, message: 'Отправка отменена' };
            }
            // Если системный share не сработал, переходим к скачиванию
        }
    }

    // 4. Десктопный фолбэк: скачиваем PNG + копируем описание + открываем соцсеть
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText && caption) {
        try {
            await navigator.clipboard.writeText(caption);
        } catch {
            // Игнорируем отказ буфера обмена
        }
    }

    triggerDownload(dataUrl, fileName);

    const targetUrl = resolveSocialUrl(networkId, account?.handle);
    if (typeof window !== 'undefined' && typeof window.open === 'function') {
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }

    return {
        ok: true,
        method: 'download',
        message: `Фото баннера скачано - загрузите его в ${net.storyLabel} (текст скопирован)`,
    };
}
