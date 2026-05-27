/**
 * Formats a phone string to +7 (xxx) xxx-xx-xx
 * @param {string} phone
 * @param {boolean} inputMode - if true, returns partial formatting for live input
 * @returns {string}
 */
export function formatPhone(phone, inputMode = false) {
    if (!phone) return '';

    // Extract only digits
    let clean = phone.replace(/\D/g, '');

    // Strip leading country code (7 or 8) ONLY if there are more digits after it.
    // Without this guard, typing '7' as first digit makes it vanish (bug).
    if (clean.length > 1 && (clean.startsWith('8') || clean.startsWith('7'))) {
        clean = clean.substring(1);
    }

    // Limit to 10 local digits
    const d = clean.substring(0, 10);
    const len = d.length;

    if (len === 0) return '';

    // Build formatted string progressively so partial input looks nice
    let result = '+7 ';
    result += `(${d.substring(0, Math.min(3, len))}`;
    if (len > 3) result += `) ${d.substring(3, Math.min(6, len))}`;
    if (len > 6) result += `-${d.substring(6, Math.min(8, len))}`;
    if (len > 8) result += `-${d.substring(8, 10)}`;

    return result;
}

/**
 * Strips phone to digits for storage (e.g. 79998887766)
 */
export function stripPhone(phone) {
    if (!phone) return '';
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 10) return '7' + clean;
    if (clean.length === 11 && (clean.startsWith('8') || clean.startsWith('7'))) return '7' + clean.substring(1);
    return clean;
}

/**
 * Formats a number with space as thousands separator
 * @param {number|string} num
 * @returns {string}
 */
export function formatNumber(num) {
    if (num === null || num === undefined || num === '') return '0';
    const val = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(val)) return '0';
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Returns localized event status label based on event type and status
 * @param {string} eventType
 * @param {string} status
 * @returns {string}
 */
export function getEventStatusLabel(eventType, status) {
    const labels = {
        deposit: {
            planned: 'Задаток запланирован',
            completed: 'Задаток передан',
            failed: 'Задаток расторгнут'
        },
        deal: {
            planned: 'Сделка запланирована',
            completed: 'Сделка прошла успешно',
            failed: 'Сделка не состоялась'
        },
        showing: {
            planned: 'Показ запланирован',
            completed: 'Показ проведен',
            failed: 'Показ не состоялся'
        },
        meeting: {
            planned: 'Встреча запланирована',
            completed: 'Встреча состоялась',
            failed: 'Встреча не состоялась'
        },
        viewing: {
            planned: 'Просмотр запланирован',
            completed: 'Просмотр проведен',
            failed: 'Просмотр не состоялся'
        },
        call: {
            planned: 'Звонок запланирован',
            completed: 'Звонок совершен',
            failed: 'Звонок не состоялся'
        }
    };
    return labels[eventType]?.[status] || labels.showing[status] || status;
}

/**
 * Formats a Date object or ISO string to local YYYY-MM-DDTHH:mm for datetime-local inputs
 * @param {Date|string} dateOrStr
 * @returns {string}
 */
export function toLocalISOString(dateOrStr) {
    if (!dateOrStr) return '';
    const d = new Date(dateOrStr);
    if (isNaN(d.getTime())) return '';
    const pad = (num) => String(num).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Parses YYYY-MM-DDTHH:mm string from datetime-local input safely as local time.
 * @param {string} dateStr
 * @returns {Date|null}
 */
export function parseLocalDateTime(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split(/[-T:]/);
    if (parts.length < 5) {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
    }
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const hour = parseInt(parts[3], 10);
    const minute = parseInt(parts[4], 10);
    const second = parts[5] ? parseInt(parts[5], 10) : 0;
    
    const d = new Date(year, month, day, hour, minute, second);
    return isNaN(d.getTime()) ? null : d;
}



