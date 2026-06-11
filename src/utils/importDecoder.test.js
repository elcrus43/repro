import { describe, it, expect } from 'vitest';
import { decodeImportData } from './importDecoder';

describe('decodeImportData', () => {
    it('returns null for empty or undefined input', () => {
        expect(decodeImportData(null)).toBeNull();
        expect(decodeImportData('')).toBeNull();
        expect(decodeImportData(undefined)).toBeNull();
    });

    it('decodes simple ASCII JSON object', () => {
        // {"price":10000,"rooms":2} encoded in base64: eyJwcmljZSI6MTAwMDAsInJvb21zIjoyfQ==
        const base64 = 'eyJwcmljZSI6MTAwMDAsInJvb21zIjoyfQ==';
        const result = decodeImportData(base64);
        expect(result).toEqual({ price: 10000, rooms: 2 });
    });

    it('decodes Russian Unicode characters correctly', () => {
        const data = { address: 'ул. Ленина, д. 5', description: 'Отличная квартира с ремонтом' };
        // Encode using the extension's method
        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
        
        const result = decodeImportData(encoded);
        expect(result).toEqual(data);
    });

    it('decodes base64 correctly even when "+" characters are converted to spaces by URL decoding', () => {
        const data = { test: '\u083e' };
        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));

        expect(encoded).toContain('+');
        
        // Simulate URL-decoding replacing '+' with space
        const corrupted = encoded.replace(/\+/g, ' ');
        expect(corrupted).toContain(' ');
        expect(corrupted).not.toContain('+');

        const result = decodeImportData(corrupted);
        expect(result).toEqual(data);
    });
});
