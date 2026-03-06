/**
 * Formats a phone string to +7 (xxx) xxx-xx-xx
 * @param {string} phone
 * @returns {string}
 */
export function formatPhone(phone, inputMode = false) {
    if (!phone) return '';
    // Clean all non-digits
    const clean = phone.replace(/\D/g, '');

    // If it starts with 7 or 8, we strip it to get the 10 digits
    let match = clean;
    if (clean.length === 11 && (clean.startsWith('7') || clean.startsWith('8'))) {
        match = clean.substring(1);
    } else if (clean.length > 10) {
        match = clean.slice(-10);
    }

    if (match.length < 10) return phone; // Return as is if format is unknown

    const part1 = match.substring(0, 3);
    const part2 = match.substring(3, 6);
    const part3 = match.substring(6, 8);
    const part4 = match.substring(8, 10);

    const prefix = inputMode ? '' : '+7 ';
    return `${prefix}(${part1}) ${part2}-${part3}-${part4}`;
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
