/* global process */
/**
 * api/messaging.js — Vercel Serverless Function
 *
 * Замена несуществующего внешнего API /api/v1/messaging.
 * Все запросы авторизованы JWT и ограничены данными текущего риелтора.
 *
 *   GET  /api/messaging                    → список шаблонов (создаёт дефолтные при первом обращении)
 *   POST /api/messaging { action: 'create', name, category, body, channels }
 *   POST /api/messaging { action: 'delete', id }
 *   POST /api/messaging { action: 'render', template_id, context }
 *
 * Используются только параметризованные SQL-запросы.
 */

import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const NEON_DATABASE_URL = process.env.NEON_DATABASE_URL;
const NEON_JWT_SECRET = process.env.NEON_JWT_SECRET;

const MAX_TEMPLATES_PER_USER = 200;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_CHANNELS = ['whatsapp', 'telegram'];

const DEFAULT_TEMPLATES = [
    {
        name: 'Первое касание',
        category: 'Common',
        body: 'Здравствуйте, {{client_name}}! Меня зовут {{agent_name}}, я риелтор. Подобрал для вас варианты по вашему запросу — могу отправить подборку в удобном мессенджере.',
        channels: ['whatsapp', 'telegram'],
    },
    {
        name: 'Приглашение на показ',
        category: 'Viewing',
        body: '{{client_name}}, добрый день! Приглашаю на просмотр: {{property_address}} — {{property_price}}. Подробнее: {{property_link}}. Подскажите удобное время, подстроюсь под вас. {{agent_name}}, {{phone}}',
        channels: ['whatsapp', 'telegram'],
    },
    {
        name: 'Предложение по объекту',
        category: 'Offer',
        body: '{{client_name}}, посмотрите вариант: {{property_address}} за {{property_price}}. Ссылка: {{property_link}}. Если заинтересует — организую показ в ближайшие дни. {{agent_name}}',
        channels: ['whatsapp', 'telegram'],
    },
    {
        name: 'Напоминание о сделке',
        category: 'Deal',
        body: '{{client_name}}, напоминаю о сделке по объекту {{property_address}}. Если есть вопросы по документам — на связи. {{agent_name}}, {{phone}}',
        channels: ['whatsapp', 'telegram'],
    },
];

function fail(res, status, message) {
    return res.status(status).json({ error: message });
}

function normalizeChannels(raw) {
    const list = Array.isArray(raw) ? raw : ['whatsapp'];
    const result = list.filter(ch => ALLOWED_CHANNELS.includes(ch));
    return result.length > 0 ? Array.from(new Set(result)) : ['whatsapp'];
}

function renderTemplateBody(body, context = {}) {
    return String(body || '').replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key) => {
        const value = context[key];
        return value === undefined || value === null ? '' : String(value);
    });
}

function normalizePhone(raw) {
    const digits = String(raw || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`;
    if (digits.length === 10) return `7${digits}`;
    return digits;
}

function buildLinks(text, context = {}) {
    const phone = normalizePhone(context.phone || context.client_phone || context.whatsapp);
    const encodedText = encodeURIComponent(text);
    const whatsapp = phone
        ? `https://wa.me/${phone}?text=${encodedText}`
        : `https://wa.me/?text=${encodedText}`;

    const shareUrl = context.property_link || '';
    const telegram = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodedText}`;

    return { text, whatsapp, telegram };
}

async function authenticate(req) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) return { status: 401, error: 'Authorization token required' };
    if (!NEON_JWT_SECRET) return { status: 500, error: 'Server authentication misconfigured' };

    let payload;
    try {
        payload = jwt.verify(token, NEON_JWT_SECRET);
    } catch (err) {
        return {
            status: 401,
            error: err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid authorization token',
        };
    }

    if (payload.status === 'pending' || payload.status === 'rejected') {
        return { status: 403, error: 'Account pending approval or disabled' };
    }
    if (!payload.sub) return { status: 401, error: 'Invalid authorization token' };
    if (!NEON_DATABASE_URL) return { status: 500, error: 'Database is not configured' };

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
        console.error('[messaging] session verification error:', err.message);
        return { status: 500, error: 'Сервис авторизации временно недоступен' };
    }

    return { sql, userId: payload.sub };
}

function mapTemplate(row) {
    return {
        id: row.id,
        name: row.name,
        category: row.category || 'Common',
        body: row.body,
        channels: Array.isArray(row.channels) ? row.channels : ['whatsapp'],
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

async function listTemplates(sql, userId) {
    const rows = await sql.query(
        `SELECT id, name, category, body, channels, created_at, updated_at
           FROM message_templates
          WHERE realtor_id = $1
          ORDER BY created_at ASC`,
        [userId]
    );

    if (rows && rows.length > 0) return rows.map(mapTemplate);

    // Первый вход: создаём стартовый набор шаблонов для пользователя.
    for (const tpl of DEFAULT_TEMPLATES) {
        await sql.query(
            `INSERT INTO message_templates (realtor_id, name, category, body, channels)
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, tpl.name, tpl.category, tpl.body, normalizeChannels(tpl.channels)]
        );
    }

    const seeded = await sql.query(
        `SELECT id, name, category, body, channels, created_at, updated_at
           FROM message_templates
          WHERE realtor_id = $1
          ORDER BY created_at ASC`,
        [userId]
    );
    return (seeded || []).map(mapTemplate);
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const auth = await authenticate(req);
    if (auth.error) return fail(res, auth.status, auth.error);

    const { sql, userId } = auth;

    try {
        if (req.method === 'GET') {
            const templates = await listTemplates(sql, userId);
            return res.status(200).json(templates);
        }

        const body = req.body || {};
        const action = body.action;

        if (action === 'create') {
            const name = String(body.name || '').trim();
            const text = String(body.body || '').trim();
            const category = String(body.category || 'Common').trim().slice(0, 40) || 'Common';

            if (!name) return fail(res, 400, 'Укажите название шаблона');
            if (!text) return fail(res, 400, 'Укажите текст шаблона');
            if (name.length > 120) return fail(res, 400, 'Название слишком длинное');
            if (text.length > 4000) return fail(res, 400, 'Текст слишком длинный');

            const countRows = await sql.query(
                'SELECT COUNT(*)::int AS count FROM message_templates WHERE realtor_id = $1',
                [userId]
            );
            if ((countRows?.[0]?.count || 0) >= MAX_TEMPLATES_PER_USER) {
                return fail(res, 400, 'Достигнут лимит шаблонов');
            }

            const inserted = await sql.query(
                `INSERT INTO message_templates (realtor_id, name, category, body, channels)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id, name, category, body, channels, created_at, updated_at`,
                [userId, name, category, text, normalizeChannels(body.channels)]
            );
            return res.status(201).json(mapTemplate(inserted[0]));
        }

        if (action === 'delete') {
            const id = String(body.id || '');
            if (!UUID_RE.test(id)) return fail(res, 400, 'Некорректный id шаблона');

            const deleted = await sql.query(
                'DELETE FROM message_templates WHERE id = $1 AND realtor_id = $2 RETURNING id',
                [id, userId]
            );
            if (!deleted || deleted.length === 0) return fail(res, 404, 'Шаблон не найден');
            return res.status(200).json({ ok: true, id });
        }

        if (action === 'render') {
            const templateId = String(body.template_id || body.id || '');
            if (!UUID_RE.test(templateId)) return fail(res, 400, 'Некорректный id шаблона');

            const rows = await sql.query(
                'SELECT id, name, body FROM message_templates WHERE id = $1 AND realtor_id = $2 LIMIT 1',
                [templateId, userId]
            );
            if (!rows || rows.length === 0) return fail(res, 404, 'Шаблон не найден');

            const text = renderTemplateBody(rows[0].body, body.context || {});
            return res.status(200).json(buildLinks(text, body.context || {}));
        }

        return fail(res, 400, 'Неизвестное действие');
    } catch (err) {
        console.error('[messaging] error:', err);
        if (err.code === '42P01') {
            return fail(res, 503, 'Таблица message_templates не создана. Выполните миграцию neon-schema.sql.');
        }
        return fail(res, 500, 'Внутренняя ошибка сервера');
    }
}
