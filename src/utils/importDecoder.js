/**
 * Safely decodes base64 import data, supporting Unicode (UTF-8) characters
 * and handling situations where '+' was converted to space in query parameters.
 * Never throws exceptions.
 * 
 * @param {string} importData - Base64 encoded string or raw JSON from URL
 * @returns {object|null} Decoded JSON object or null
 */
export function decodeImportData(importData) {
    if (!importData) return null;
    
    try {
        const rawStr = String(importData).trim();
        if (!rawStr) return null;

        // 1. Try raw JSON parse first (if data was sent unencoded)
        if (rawStr.startsWith('{') || rawStr.startsWith('[')) {
            try { return JSON.parse(rawStr); } catch (e) {}
            try { return JSON.parse(decodeURIComponent(rawStr)); } catch (e) {}
        }

        // Normalize base64: replace spaces with '+'
        const normalizedBase64 = rawStr.replace(/\s/g, '+');

        // 2. Try TextDecoder with Uint8Array for modern UTF-8 base64
        try {
            const binaryString = atob(normalizedBase64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const decodedUtf8 = new TextDecoder('utf-8').decode(bytes);
            return JSON.parse(decodedUtf8);
        } catch (e1) {
            // Ignore & fallback
        }

        // 3. Try atob + escape + decodeURIComponent
        try {
            const decodedJson = atob(normalizedBase64);
            return JSON.parse(decodeURIComponent(escape(decodedJson)));
        } catch (e2) {
            // Ignore & fallback
        }

        // 4. Fallback: try raw decodeURIComponent
        try {
            return JSON.parse(decodeURIComponent(rawStr));
        } catch (e3) {
            // Ignore
        }

        return null;
    } catch (err) {
        console.error('[decodeImportData] Unhandled error in decoder:', err);
        return null;
    }
}
