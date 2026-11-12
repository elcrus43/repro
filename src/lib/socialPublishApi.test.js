import { describe, it, expect } from 'vitest';
import { parsePngDataUrl, normalizeVkLinkUrl } from '../../api/social-publish.js';

describe('api/social-publish helpers', () => {
    it('parses valid PNG base64 data URL into buffer', () => {
        const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        const parsed = parsePngDataUrl(dataUrl);
        expect(parsed.mimeType).toBe('image/png');
        expect(parsed.ext).toBe('png');
        expect(parsed.buffer.length).toBeGreaterThan(0);
    });

    it('rejects non-image or malformed data URLs', () => {
        expect(() => parsePngDataUrl('not-a-data-url')).toThrow();
        expect(() => parsePngDataUrl('data:text/html;base64,PGgxPkZha2U8L2gxPg==')).toThrow();
    });

    it('allows https external URLs for VK story link and rejects localhost/http', () => {
        expect(normalizeVkLinkUrl('https://reacrm.ru/#/p/123')).toBe('https://reacrm.ru/#/p/123');
        expect(normalizeVkLinkUrl('http://reacrm.ru/#/p/123')).toBe('');
        expect(normalizeVkLinkUrl('https://localhost:5173/#/p/123')).toBe('');
        expect(normalizeVkLinkUrl('javascript:alert(1)')).toBe('');
    });
});
