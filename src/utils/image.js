/**
 * Compresses a base64 image string (or URL/blob data URL) to a thumbnail size
 * small enough to be stored in a Supabase text column without causing timeouts.
 *
 * Target: ≤ 120×120 px at JPEG quality 0.45 ≈ 5–12 KB base64
 *
 * @param {string} dataUrl - The base64 data URL to compress
 * @param {number} maxWidth - Maximum width of the compressed image (default 120)
 * @param {number} maxHeight - Maximum height of the compressed image (default 120)
 * @param {number} quality - JPEG compression quality 0–1 (default 0.45)
 * @returns {Promise<string>} Compressed base64 data URL
 */
export function compressImage(dataUrl, maxWidth = 120, maxHeight = 120, quality = 0.45) {
    return new Promise((resolve) => {
        if (!dataUrl || !dataUrl.startsWith('data:image/')) {
            resolve(dataUrl);
            return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > maxWidth || height > maxHeight) {
                const ratio = Math.min(maxWidth / width, maxHeight / height);
                width = Math.round(width * ratio);
                height = Math.round(height * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

/**
 * Compresses a File/Blob object into a thumbnail base64 string.
 * @param {File|Blob} blob
 * @returns {Promise<string>}
 */
export async function compressBlob(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = async () => {
            try {
                const compressed = await compressImage(reader.result);
                resolve(compressed);
            } catch (e) {
                reject(e);
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Reads the clipboard and returns the text content or compressed base64 image content.
 * Tries the modern Clipboard API first, then falls back to readText().
 *
 * @returns {Promise<{text?: string, image?: string, error?: string}>}
 */
export async function readClipboardAndCompress() {
    // Try modern Clipboard API (requires permissions in some browsers)
    try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
            const imageTypes = item.types.filter(t => t.startsWith('image/'));
            if (imageTypes.length > 0) {
                const blob = await item.getType(imageTypes[0]);
                const compressed = await compressBlob(blob);
                return { image: compressed };
            }
        }
    } catch (e) {
        console.warn('[Clipboard] clipboard.read() not available or denied:', e.message);
    }

    // Fallback: read text from clipboard
    try {
        const text = await navigator.clipboard.readText();
        if (text) {
            if (text.startsWith('data:image/')) {
                const compressed = await compressImage(text);
                return { image: compressed };
            }
            return { text };
        }
    } catch (e) {
        console.warn('[Clipboard] clipboard.readText() failed:', e.message);
        return { error: 'Нет доступа к буферу обмена. Вставьте ссылку вручную.' };
    }

    return {};
}
