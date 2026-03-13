/**
 * Formats a phone string to +7 (xxx) xxx-xx-xx
 * @param {string} phone
 * @returns {string}
 */
export function formatPhone(phone, inputMode = false) {
    if (!phone) return inputMode ? '' : '';
    
    // Clean all non-digits
    let clean = phone.replace(/\D/g, '');

    // Handle the case where user starts typing with 8 or 7
    if (clean.startsWith('8') || clean.startsWith('7')) {
        clean = clean.substring(1);
    }

    // Limit to 10 digits
    const match = clean.substring(0, 10);
    const len = match.length;

    if (len === 0) return inputMode ? '' : '+7 ';

    const prefix = '+7 ';
    let result = prefix;
    if (len > 0) result += `(${match.substring(0, 3)}`;
    if (len > 3) result += `) ${match.substring(3, 6)}`;
    if (len > 6) result += `-${match.substring(6, 8)}`;
    if (len > 8) result += `-${match.substring(8, 10)}`;

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
