const FOUR_DIGIT_CODES = [
    '8332', // Киров
    '8352', // Чебоксары
    '8362', // Йошкар-Ола
    '8342', // Саранск
    '8412', // Пенза
    '8422', // Ульяновск
    '8482', // Тольятти
    '8552', // Набережные Челны
    '8793', // Пятигорск
    '8142', // Петрозаводск
    '8152', // Мурманск
    '8162', // Новгород
    '8172', // Вологда
    '8182', // Архангельск
    '8202', // Череповец
    '8212', // Сыктывкар
    '4852', // Ярославль
    '4922', // Владимир
    '4822', // Тверь
    '4912', // Рязань
    '4842', // Калуга
    '4872', // Тула
    '4732', // Воронеж
    '4712', // Курск
    '4722', // Белгород
    '4742', // Липецк
    '4752', // Тамбов
    '4812', // Смоленск
    '4832', // Брянск
    '4862', // Орел
    '4932', // Иваново
    '4942', // Кострома
    '3432', // Екатеринбург
    '3512', // Челябинск
    '3832', // Новосибирск
    '3812', // Омск
    '3852', // Барнаул
    '3912', // Красноярск
    '3952', // Иркутск
    '4212', // Хабаровск
    '4232'  // Владивосток
];

/**
 * Formats a phone string to +7 (xxx) xxx-xx-xx or +7 (xxxx) xx-xx-xx (for direct city numbers)
 * @param {string} phone
 * @param {boolean} inputMode - if true, returns partial formatting for live input
 * @returns {string}
 */
export function formatPhone(phone, inputMode = false) {
    if (!phone) return '';
    const raw = String(phone);
    const trimmed = raw.trim();
    if (!trimmed) return '';

    // In inputMode, backspacing to '+7 ', '+7 (', '+7', or '+' clears completely
    if (inputMode) {
        if (raw === '+7 ' || raw === '+7 (' || raw === '+7' || raw === '+' || trimmed === '+7 (' || trimmed === '+7 ' || trimmed === '+7' || trimmed === '+') {
            return '';
        }
        // Typing country code or plus into empty input initializes mask
        if (trimmed === '7' || trimmed === '8' || trimmed === '+8') {
            return '+7 (';
        }
    }

    let digits = trimmed.replace(/\D/g, '');
    if (!digits) return '';

    // Direct 6-digit city number (e.g. 450103 or 45-01-03) -> expand with Kirov code 8332
    if (digits.length === 6 && !trimmed.startsWith('+') && !trimmed.startsWith('7') && !trimmed.startsWith('8') && !trimmed.startsWith('9')) {
        digits = '8332' + digits;
    }

    // Handle double country code that occurs when pasting into existing "+7 (" (12+ digits)
    // e.g. "+7 (8912..." -> digits: "78912..." (12 digits) or "+7 (+7912..." -> "77912..."
    if (digits.length >= 12 && (digits.startsWith('77') || digits.startsWith('78'))) {
        digits = digits.slice(2);
    } else if (digits.length >= 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
        digits = digits.slice(1);
    } else if (digits.length > 1 && (trimmed.startsWith('+7') || trimmed.startsWith('+8') || trimmed.startsWith('+ 7'))) {
        digits = digits.slice(1);
    } else if (digits.length === 1 && (digits === '7' || digits === '8') && !inputMode) {
        return '';
    }

    const d = digits.slice(0, 10);
    const len = d.length;
    if (len === 0) return inputMode ? '+7 (' : '';

    const is4Digit = FOUR_DIGIT_CODES.some(code => d.startsWith(code));

    if (is4Digit) {
        let result = '+7 ';
        result += `(${d.substring(0, Math.min(4, len))}`;
        if (len >= 4) result += ') ';
        if (len > 4) result += d.substring(4, Math.min(6, len));
        if (len > 6) result += `-${d.substring(6, Math.min(8, len))}`;
        if (len > 8) result += `-${d.substring(8, 10)}`;
        return result;
    }

    let result = '+7 ';
    result += `(${d.substring(0, Math.min(3, len))}`;
    if (len > 3) result += `) ${d.substring(3, Math.min(6, len))}`;
    if (len > 6) result += `-${d.substring(6, Math.min(8, len))}`;
    if (len > 8) result += `-${d.substring(8, 10)}`;

    return result;
}

/**
 * Strips phone to digits for storage (e.g. 79998887766 or 78332450103)
 */
export function stripPhone(phone) {
    if (!phone) return '';
    let clean = String(phone).replace(/\D/g, '');
    if (!clean) return '';
    if (clean.length >= 12 && (clean.startsWith('77') || clean.startsWith('78'))) {
        clean = clean.substring(1);
    }
    // 6-digit local city number -> auto-prepend Kirov code 8332
    if (clean.length === 6) {
        return '78332' + clean;
    }
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
            planned: 'Подбор запланирован',
            completed: 'Подбор проведён',
            failed: 'Подбор не состоялся'
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

/**
 * Formats a Date object or date string (YYYY-MM-DD or ISO) to dd.mm.yyyy format
 * @param {Date|string} dateOrStr
 * @returns {string}
 */
export function formatDate(dateOrStr) {
    if (!dateOrStr) return '';
    // Handle string YYYY-MM-DD directly without timezone shift
    if (typeof dateOrStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateOrStr)) {
        const [y, m, d] = dateOrStr.split('-');
        return `${d}.${m}.${y}`;
    }
    const d = new Date(dateOrStr);
    if (isNaN(d.getTime())) return String(dateOrStr);
    const pad = (num) => String(num).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/**
 * Safely parses a PostgreSQL array representation, JS array, or single string ID into an array of strings
 * Handles "{uuid1,uuid2}", "{}", null, undefined, ["uuid1"], etc.
 * @param {Array|string|null|undefined} arr
 * @returns {string[]}
 */
export function parsePgArray(arr) {
    if (!arr) return [];
    if (Array.isArray(arr)) return arr.map(String).filter(Boolean);
    if (typeof arr === 'string') {
        const cleaned = arr.replace(/[{}"']/g, '').trim();
        if (!cleaned) return [];
        return cleaned.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [String(arr)];
}

/**
 * Formats passport unit code according to mask: ___-___ (e.g. "430-001")
 * @param {string} raw
 * @returns {string}
 */
export function formatUnitCode(raw) {
    if (!raw) return '';
    const digits = String(raw).replace(/\D/g, '').slice(0, 6);
    if (digits.length <= 3) return digits;
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
}

/**
 * Formats combined passport series and number according to mask: __ __ ______ (e.g. "33 14 123456")
 * @param {string} raw
 * @returns {string}
 */
export function formatPassportInput(raw) {
    if (!raw) return '';
    const digits = String(raw).replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 2) {
        return digits;
    }
    if (digits.length <= 4) {
        return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    }
    return `${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4)}`;
}

/**
 * Parses combined passport series and number into separate { series, number }
 * With mask __ __ ______: series is first 4 digits ("XX XX"), number is remaining up to 6 digits ("XXXXXX")
 * @param {string} raw
 * @returns {{ series: string, number: string }}
 */
export function parsePassportInput(raw) {
    if (!raw) return { series: '', number: '' };
    const digits = String(raw).replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 2) {
        return { series: digits, number: '' };
    }
    if (digits.length <= 4) {
        return { series: `${digits.slice(0, 2)} ${digits.slice(2)}`, number: '' };
    }
    return {
        series: `${digits.slice(0, 2)} ${digits.slice(2, 4)}`,
        number: digits.slice(4)
    };
}

/**
 * Combines separate series and number into display string formatted by mask __ __ ______
 * @param {string} series
 * @param {string} number
 * @returns {string}
 */
export function formatPassportDisplay(series, number) {
    const s = String(series || '').trim();
    const n = String(number || '').trim();
    if (!s && !n) return '';
    if (!s) return n;
    if (!n) return formatPassportInput(s);
    return formatPassportInput(`${s} ${n}`);
}





