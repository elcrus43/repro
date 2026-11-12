/* global process, Buffer */
/**
 * api/social-publish.js - Vercel Serverless Function
 *
 * Управление токенами соцсетей пользователя и автопубликация баннеров через API:
 *   - VK Stories API (stories.getPhotoUploadServer -> upload -> stories.save)
 *   - Telegram Bot API (sendPhoto в подключённый канал/чат)
 *
 * Токены хранятся в таблице user_social_tokens (никогда не возвращаются в браузер).
 */

import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const VK_API_VERSION = '5.199';

function fail(res, status, message) {
    return res.status(status).json({ error: message });
}

export function parsePngDataUrl(dataUrl) {
    if (typeof dataUrl !== 'string') {
        throw new Error('Некорректный формат изображения');
    }
    const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
        throw new Error('Ожидается изображение в формате data URL (base64)');
    }
    const mimeType = match[1] === 'jpg' ? 'image/jpeg' : `image/${match[1]}`;
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
        throw new Error('Размер баннера превышает допустимый лимит (10 МБ)');
    }
    return { buffer, mimeType, ext: match[1] === 'jpeg' ? 'jpg' : match[1] };
}

export function normalizeVkLinkUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    try {
        const parsed = new URL(rawUrl.trim());
        if (parsed.protocol !== 'https:') return '';
        if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return '';
        return parsed.toString();
    } catch {
        return '';
    }
}

async function ensureTable(sql) {
    await sql.query(`
        CREATE TABLE IF NOT EXISTS user_social_tokens (
            user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
            vk_access_token TEXT,
            vk_user_label TEXT,
            telegram_bot_token TEXT,
            telegram_chat_id TEXT,
            telegram_label TEXT,
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    `);
}

async function authenticate(req) {
    const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;
    const NEON_JWT_SECRET = process.env.NEON_JWT_SECRET;

    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) return { status: 401, error: 'Требуется авторизация' };
    if (!NEON_JWT_SECRET) return { status: 500, error: 'Сервер авторизации не настроен' };

    let payload;
    try {
        payload = jwt.verify(token, NEON_JWT_SECRET);
    } catch (err) {
        return {
            status: 401,
            error: err.name === 'TokenExpiredError' ? 'Сессия истекла' : 'Недействительный токен авторизации',
        };
    }

    if (payload.status === 'pending' || payload.status === 'rejected') {
        return { status: 403, error: 'Аккаунт ожидает подтверждения или заблокирован' };
    }
    if (!payload.sub) return { status: 401, error: 'Недействительный токен авторизации' };
    if (!NEON_DATABASE_URL) return { status: 500, error: 'База данных не настроена' };

    const sql = neon(NEON_DATABASE_URL);

    try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const sessions = await sql.query(
            'SELECT id FROM user_sessions WHERE token_hash = $1 AND expires_at > NOW() LIMIT 1',
            [tokenHash]
        );
        if (!sessions || sessions.length === 0) {
            return { status: 401, error: 'Сессия была отозвана или истекла' };
        }
    } catch (err) {
        console.error('[social-publish] session check error:', err.message);
        return { status: 500, error: 'Сервис авторизации временно недоступен' };
    }

    return { sql, userId: payload.sub };
}

async function getStatus(sql, userId) {
    const rows = await sql.query(
        `SELECT vk_access_token IS NOT NULL AND vk_access_token <> '' AS vk_connected,
                vk_user_label,
                telegram_bot_token IS NOT NULL AND telegram_bot_token <> '' AS tg_connected,
                telegram_chat_id,
                telegram_label
           FROM user_social_tokens
          WHERE user_id = $1
          LIMIT 1`,
        [userId]
    );

    const row = rows?.[0];
    return {
        vk: {
            hasToken: Boolean(row?.vk_connected),
            label: row?.vk_user_label || '',
        },
        tg: {
            hasToken: Boolean(row?.tg_connected),
            chatId: row?.telegram_chat_id || '',
            label: row?.telegram_label || '',
        },
    };
}

async function validateVkToken(accessToken) {
    const params = new URLSearchParams({
        access_token: accessToken,
        v: VK_API_VERSION,
    });
    const res = await fetch(`https://api.vk.com/method/users.get?${params.toString()}`);
    const json = await res.json().catch(() => null);
    if (!res.ok || json?.error) {
        const msg = json?.error?.error_msg || `HTTP ${res.status}`;
        throw new Error(`Ошибка проверки токена VK: ${msg}`);
    }
    const user = json?.response?.[0];
    const label = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'VK аккаунт';
    return label || 'VK аккаунт';
}

async function validateTelegramBot(botToken) {
    const res = await fetch(`https://api.telegram.org/bot${encodeURIComponent(botToken)}/getMe`);
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
        const msg = json?.description || `HTTP ${res.status}`;
        throw new Error(`Ошибка проверки Telegram-бота: ${msg}`);
    }
    const username = json?.result?.username ? `@${json.result.username}` : (json?.result?.first_name || 'Telegram бот');
    return username;
}

async function publishVkStory(sql, userId, { imageBase64, linkUrl }) {
    const rows = await sql.query(
        'SELECT vk_access_token FROM user_social_tokens WHERE user_id = $1 LIMIT 1',
        [userId]
    );
    const accessToken = rows?.[0]?.vk_access_token;
    if (!accessToken) {
        return { status: 400, error: 'Токен VK не подключён. Подключите VK в профиле.' };
    }

    const { buffer, mimeType, ext } = parsePngDataUrl(imageBase64);
    const safeLink = normalizeVkLinkUrl(linkUrl);

    const serverParams = new URLSearchParams({
        access_token: accessToken,
        add_to_news: '1',
        v: VK_API_VERSION,
    });
    if (safeLink) {
        serverParams.set('link_text', 'learn_more');
        serverParams.set('link_url', safeLink);
    }

    const uploadServerRes = await fetch('https://api.vk.com/method/stories.getPhotoUploadServer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: serverParams.toString(),
    });
    const uploadServerJson = await uploadServerRes.json().catch(() => null);
    if (!uploadServerRes.ok || uploadServerJson?.error || !uploadServerJson?.response?.upload_url) {
        const msg = uploadServerJson?.error?.error_msg || 'Не удалось получить сервер загрузки VK Stories';
        return { status: 400, error: `VK API: ${msg}` };
    }

    const form = new FormData();
    form.append('file', new Blob([buffer], { type: mimeType }), `banner.${ext}`);

    const uploadRes = await fetch(uploadServerJson.response.upload_url, {
        method: 'POST',
        body: form,
    });
    const uploadJson = await uploadRes.json().catch(() => null);
    const uploadResult = uploadJson?.response?.upload_result || uploadJson?.upload_result;
    if (!uploadRes.ok || !uploadResult) {
        const msg = uploadJson?.error?.error_msg || 'Не удалось загрузить фото баннера на сервер VK';
        return { status: 400, error: `VK Upload: ${msg}` };
    }

    const saveParams = new URLSearchParams({
        access_token: accessToken,
        upload_results: uploadResult,
        v: VK_API_VERSION,
    });
    const saveRes = await fetch('https://api.vk.com/method/stories.save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: saveParams.toString(),
    });
    const saveJson = await saveRes.json().catch(() => null);
    if (!saveRes.ok || saveJson?.error) {
        const msg = saveJson?.error?.error_msg || 'Не удалось сохранить историю VK';
        return { status: 400, error: `VK Save: ${msg}` };
    }

    return {
        status: 200,
        data: {
            ok: true,
            storyId: saveJson?.response?.items?.[0]?.id || null,
            message: 'Баннер опубликован в Сторис VK',
        },
    };
}

async function publishTelegramPhoto(sql, userId, { imageBase64, caption }) {
    const rows = await sql.query(
        'SELECT telegram_bot_token, telegram_chat_id FROM user_social_tokens WHERE user_id = $1 LIMIT 1',
        [userId]
    );
    const botToken = rows?.[0]?.telegram_bot_token;
    const chatId = rows?.[0]?.telegram_chat_id;
    if (!botToken || !chatId) {
        return { status: 400, error: 'Telegram-бот или Chat ID не подключены в профиле.' };
    }

    const { buffer, mimeType, ext } = parsePngDataUrl(imageBase64);
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('photo', new Blob([buffer], { type: mimeType }), `banner.${ext}`);
    if (caption) {
        form.append('caption', String(caption).slice(0, 1024));
    }

    const tgRes = await fetch(`https://api.telegram.org/bot${encodeURIComponent(botToken)}/sendPhoto`, {
        method: 'POST',
        body: form,
    });
    const tgJson = await tgRes.json().catch(() => null);
    if (!tgRes.ok || !tgJson?.ok) {
        const msg = tgJson?.description || `HTTP ${tgRes.status}`;
        return { status: 400, error: `Telegram API: ${msg}` };
    }

    return {
        status: 200,
        data: {
            ok: true,
            messageId: tgJson?.result?.message_id || null,
            message: `Баннер отправлен в Telegram (${chatId})`,
        },
    };
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET' && req.method !== 'POST') {
        return fail(res, 405, 'Method Not Allowed');
    }

    const auth = await authenticate(req);
    if (auth.error) return fail(res, auth.status, auth.error);
    const { sql, userId } = auth;

    try {
        await ensureTable(sql);

        if (req.method === 'GET') {
            const status = await getStatus(sql, userId);
            return res.status(200).json(status);
        }

        const body = req.body || {};
        const action = body.action;

        if (action === 'save_vk') {
            const vkToken = String(body.token || '').trim();
            if (!vkToken) return fail(res, 400, 'Укажите access_token VK');

            const label = await validateVkToken(vkToken);
            await sql.query(
                `INSERT INTO user_social_tokens (user_id, vk_access_token, vk_user_label, updated_at)
                 VALUES ($1, $2, $3, NOW())
                 ON CONFLICT (user_id) DO UPDATE
                 SET vk_access_token = EXCLUDED.vk_access_token,
                     vk_user_label = EXCLUDED.vk_user_label,
                     updated_at = NOW()`,
                [userId, vkToken, label]
            );
            return res.status(200).json({ ok: true, label });
        }

        if (action === 'disconnect_vk') {
            await sql.query(
                `UPDATE user_social_tokens
                    SET vk_access_token = NULL, vk_user_label = NULL, updated_at = NOW()
                  WHERE user_id = $1`,
                [userId]
            );
            return res.status(200).json({ ok: true });
        }

        if (action === 'save_tg') {
            const botToken = String(body.botToken || '').trim();
            const chatId = String(body.chatId || '').trim();
            if (!botToken) return fail(res, 400, 'Укажите токен Telegram-бота');
            if (!chatId) return fail(res, 400, 'Укажите Chat ID или @username канала');

            const label = await validateTelegramBot(botToken);
            await sql.query(
                `INSERT INTO user_social_tokens (user_id, telegram_bot_token, telegram_chat_id, telegram_label, updated_at)
                 VALUES ($1, $2, $3, $4, NOW())
                 ON CONFLICT (user_id) DO UPDATE
                 SET telegram_bot_token = EXCLUDED.telegram_bot_token,
                     telegram_chat_id = EXCLUDED.telegram_chat_id,
                     telegram_label = EXCLUDED.telegram_label,
                     updated_at = NOW()`,
                [userId, botToken, chatId, label]
            );
            return res.status(200).json({ ok: true, label, chatId });
        }

        if (action === 'disconnect_tg') {
            await sql.query(
                `UPDATE user_social_tokens
                    SET telegram_bot_token = NULL, telegram_chat_id = NULL, telegram_label = NULL, updated_at = NOW()
                  WHERE user_id = $1`,
                [userId]
            );
            return res.status(200).json({ ok: true });
        }

        if (action === 'publish_vk_story') {
            const result = await publishVkStory(sql, userId, body);
            if (result.error) return fail(res, result.status, result.error);
            return res.status(200).json(result.data);
        }

        if (action === 'publish_tg') {
            const result = await publishTelegramPhoto(sql, userId, body);
            if (result.error) return fail(res, result.status, result.error);
            return res.status(200).json(result.data);
        }

        return fail(res, 400, 'Неизвестное действие');
    } catch (err) {
        console.error('[social-publish] error:', err);
        return fail(res, 400, err.message || 'Ошибка публикации в соцсеть');
    }
}
