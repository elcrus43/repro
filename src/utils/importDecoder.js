/**
 * Safely decodes base64 import data, supporting Unicode characters
 * and handling situations where '+' was converted to space in query parameters.
 * 
 * @param {string} importData - Base64 encoded string from URL
 * @returns {object|null} Decoded JSON object or null if input is empty
 */
export function decodeImportData(importData) {
    if (!importData) return null;
    
    // Replace spaces back to pluses (if encodedData with '+' was URL-decoded into ' ')
    const normalizedBase64 = importData.replace(/\s/g, '+');
    
    // Decode base64
    const decodedJson = atob(normalizedBase64);
    
    // Safely parse unicode characters (escape/unescape and decodeURIComponent)
    return JSON.parse(decodeURIComponent(escape(decodedJson)));
}
