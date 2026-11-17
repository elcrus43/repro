/**
 * contactsSync.js
 * Модуль синхронизации клиентов с адресной книгой телефона и Google Контактами.
 *
 * Поддерживает:
 * 1. Нативную синхронизацию в Android-приложении через ContactsSyncPlugin
 *    (связывает контакты с Google-аккаунтом устройства, благодаря чему Android
 *    автоматически выгружает их в облако Google Contacts).
 * 2. Веб-фоллбэк: скачивание индивидуальной карточки vCard (.vcf) в 1 клик
 *    (при открытии на телефоне сразу добавляется в контакты Google/телефон).
 * 3. Пакетный экспорт в мульти-контактный vCard (.vcf) и Google Contacts CSV.
 */

import { CLIENT_TYPE_LABELS } from '../data/constants';

/**
 * Проверка доступности нативного Capacitor-плагина ContactsSyncPlugin
 */
export function isNativeContactsSupported() {
    return Boolean(
        typeof window !== 'undefined' &&
        window?.Capacitor?.isPluginAvailable?.('ContactsSyncPlugin') ||
        window?.Capacitor?.Plugins?.ContactsSyncPlugin
    );
}

/**
 * Преобразует данные клиента в нормализованную структуру для контакта
 */
export function formatClientForContact(client) {
    if (!client) return null;

    const name = (client.full_name || client.name || '').trim() || 'Клиент REA CRM';
    const phone = (client.phone || '').trim();
    const email = (client.email || '').trim();

    // Роли / типы клиента
    const types = Array.isArray(client.client_types) ? client.client_types : [];
    const roleLabels = types.map(t => CLIENT_TYPE_LABELS[t] || t).filter(Boolean);
    const jobTitle = roleLabels.join(', ') || 'Клиент';

    // Формирование информативной заметки для карточки контакта
    const noteParts = [
        'Клиент REA CRM',
        jobTitle ? `Категория: ${jobTitle}` : null,
        client.source ? `Источник: ${client.source}` : null,
        client.budget ? `Бюджет: ${Number(client.budget).toLocaleString('ru-RU')} ₽` : null,
        client.notes ? `Заметка: ${client.notes}` : null
    ].filter(Boolean);

    const note = noteParts.join('\n');

    return {
        name,
        phone,
        email,
        organization: 'REA CRM',
        jobTitle,
        note
    };
}

/**
 * Генерация строки vCard 3.0 для одного клиента
 */
export function generateVCard(client) {
    const data = formatClientForContact(client);
    if (!data) return '';

    // Разделение ФИО на Фамилию и Имя для vCard поля N
    const nameParts = data.name.split(/\s+/);
    const lastName = nameParts[0] || '';
    const firstName = nameParts.slice(1).join(' ') || '';

    // Экранирование спецсимволов для vCard
    const escapeVCard = (str) => {
        if (!str) return '';
        return String(str)
            .replace(/\\/g, '\\\\')
            .replace(/;/g, '\\;')
            .replace(/,/g, '\\,')
            .replace(/\r\n|\n|\r/g, '\\n');
    };

    const lines = [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `FN;CHARSET=UTF-8:${escapeVCard(data.name)}`,
        `N;CHARSET=UTF-8:${escapeVCard(lastName)};${escapeVCard(firstName)};;;`,
    ];

    if (data.phone) {
        lines.push(`TEL;TYPE=CELL,VOICE:${data.phone}`);
    }

    if (data.email) {
        lines.push(`EMAIL;TYPE=INTERNET,WORK:${data.email}`);
    }

    if (data.organization) {
        lines.push(`ORG;CHARSET=UTF-8:${escapeVCard(data.organization)}`);
    }

    if (data.jobTitle) {
        lines.push(`TITLE;CHARSET=UTF-8:${escapeVCard(data.jobTitle)}`);
    }

    if (data.note) {
        lines.push(`NOTE;CHARSET=UTF-8:${escapeVCard(data.note)}`);
    }

    lines.push('END:VCARD');
    return lines.join('\r\n');
}

/**
 * Генерация мульти-vCard файла для группы клиентов
 */
export function generateBatchVCard(clients = []) {
    return clients
        .map(c => generateVCard(c))
        .filter(Boolean)
        .join('\r\n');
}

/**
 * Генерация CSV файла, совместимого со стандартным импортом Google Контактов
 */
export function generateGoogleContactsCsv(clients = []) {
    const headers = [
        'Name',
        'Given Name',
        'Family Name',
        'Group Membership',
        'E-mail 1 - Type',
        'E-mail 1 - Value',
        'Phone 1 - Type',
        'Phone 1 - Value',
        'Organization 1 - Name',
        'Organization 1 - Title',
        'Notes'
    ];

    const escapeCsv = (str) => {
        if (str === null || str === undefined) return '""';
        const s = String(str).replace(/"/g, '""');
        return `"${s}"`;
    };

    const rows = clients.map(c => {
        const d = formatClientForContact(c);
        if (!d) return null;

        const nameParts = d.name.split(/\s+/);
        const lastName = nameParts[0] || '';
        const firstName = nameParts.slice(1).join(' ') || '';

        return [
            escapeCsv(d.name),
            escapeCsv(firstName),
            escapeCsv(lastName),
            escapeCsv('REA CRM ::: * myContacts'),
            escapeCsv('Work'),
            escapeCsv(d.email),
            escapeCsv('Mobile'),
            escapeCsv(d.phone),
            escapeCsv(d.organization),
            escapeCsv(d.jobTitle),
            escapeCsv(d.note)
        ].join(',');
    }).filter(Boolean);

    // Добавляем UTF-8 BOM для корректного открытия в Excel и Google
    return '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
}

/**
 * Вспомогательная функция скачивания файла в браузере
 */
export function downloadFile(content, fileName, mimeType) {
    if (typeof window === 'undefined') return;
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Скачать контакт как vCard (.vcf)
 */
export function downloadClientVCard(client) {
    const vcard = generateVCard(client);
    if (!vcard) return false;
    const safeName = (client?.full_name || 'contact').replace(/[\s/\\?%*:|"<>]+/g, '_');
    downloadFile(vcard, `${safeName}.vcf`, 'text/vcard;charset=utf-8;');
    return true;
}

/**
 * Скачать группу клиентов как мульти-vCard (.vcf)
 */
export function downloadBatchVCard(clients, filename = 'rea_crm_contacts') {
    const batchVcard = generateBatchVCard(clients);
    if (!batchVcard) return false;
    downloadFile(batchVcard, `${filename}.vcf`, 'text/vcard;charset=utf-8;');
    return true;
}

/**
 * Скачать контакты в CSV для прямого импорта в contacts.google.com
 */
export function downloadGoogleContactsCsv(clients, filename = 'google_contacts_rea') {
    const csv = generateGoogleContactsCsv(clients);
    downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
    return true;
}

/**
 * Единый метод сохранения одного клиента:
 * Если нативное приложение -> через нативный ContactsSyncPlugin
 * Если веб-браузер -> скачивает файл vCard (.vcf)
 */
export async function saveClientToDevice(client) {
    if (!client) {
        return { success: false, error: 'Клиент не указан' };
    }

    if (isNativeContactsSupported()) {
        try {
            const plugin = window?.Capacitor?.Plugins?.ContactsSyncPlugin;
            if (!plugin) throw new Error('Плагин недоступен');

            // Проверяем / запрашиваем разрешение
            const perm = await plugin.requestPermission();
            if (!perm?.granted) {
                return {
                    success: false,
                    error: 'Не предоставлено разрешение на запись контактов в Android'
                };
            }

            const data = formatClientForContact(client);
            const res = await plugin.saveContact({
                name: data.name,
                phone: data.phone,
                email: data.email,
                organization: data.organization,
                jobTitle: data.jobTitle,
                note: data.note,
                checkDuplicate: true
            });

            return {
                success: true,
                mode: 'native',
                alreadyExists: Boolean(res?.alreadyExists),
                googleAccount: res?.googleAccount || null
            };
        } catch (err) {
            console.warn('[contactsSync] Нативное сохранение не удалось, переключаемся на vCard:', err);
            // Фолбэк на vCard при ошибке плагина
            downloadClientVCard(client);
            return {
                success: true,
                mode: 'vcard_fallback',
                error: err.message
            };
        }
    }

    // Веб-режим: скачивание .vcf
    const downloaded = downloadClientVCard(client);
    return {
        success: downloaded,
        mode: 'vcard'
    };
}

/**
 * Единый метод пакетной синхронизации клиентов
 */
export async function syncClientsBatchToDevice(clients = []) {
    if (!clients.length) {
        return { success: false, total: 0, saved: 0, skipped: 0, errors: 0 };
    }

    if (isNativeContactsSupported()) {
        try {
            const plugin = window?.Capacitor?.Plugins?.ContactsSyncPlugin;
            if (!plugin) throw new Error('Плагин недоступен');

            const perm = await plugin.requestPermission();
            if (!perm?.granted) {
                return {
                    success: false,
                    error: 'Не предоставлено разрешение на доступ к контактам'
                };
            }

            const formattedClients = clients.map(c => formatClientForContact(c)).filter(Boolean);
            const res = await plugin.syncClients({ clients: formattedClients });

            return {
                success: true,
                mode: 'native',
                total: res.total,
                saved: res.saved,
                skipped: res.skipped,
                errors: res.errors,
                googleAccount: res.googleAccount
            };
        } catch (err) {
            console.warn('[contactsSync] Ошибка пакетной нативной синхронизации:', err);
            downloadBatchVCard(clients);
            return {
                success: true,
                mode: 'vcard_fallback',
                total: clients.length
            };
        }
    }

    // Веб-режим
    downloadBatchVCard(clients);
    return {
        success: true,
        mode: 'vcard',
        total: clients.length
    };
}
