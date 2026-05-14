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
