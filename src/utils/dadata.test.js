import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeFmsCode, fetchFmsUnitByCode, suggestFmsUnits } from './dadata';

describe('dadata fms_unit utils', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    describe('normalizeFmsCode', () => {
        it('normalizes clean 6 digits into XXX-XXX', () => {
            expect(normalizeFmsCode('430001')).toBe('430-001');
            expect(normalizeFmsCode('430-001')).toBe('430-001');
            expect(normalizeFmsCode(' 430 - 024 ')).toBe('430-024');
        });

        it('returns empty string for incomplete or invalid code', () => {
            expect(normalizeFmsCode('')).toBe('');
            expect(normalizeFmsCode('430')).toBe('');
            expect(normalizeFmsCode('430-0')).toBe('');
            expect(normalizeFmsCode(null)).toBe('');
            expect(normalizeFmsCode('abcdef')).toBe('');
        });
    });

    describe('fetchFmsUnitByCode', () => {
        it('returns empty array when code is not 6 digits', async () => {
            const fetchSpy = vi.spyOn(globalThis, 'fetch');
            const res = await fetchFmsUnitByCode('123');
            expect(res).toEqual([]);
            expect(fetchSpy).not.toHaveBeenCalled();
        });

        it('returns empty array when token is missing', async () => {
            const res = await fetchFmsUnitByCode('430001', { token: '' });
            expect(res).toEqual([]);
        });

        it('parses suggestions correctly from DaData response', async () => {
            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    suggestions: [
                        {
                            value: 'ТП УФМС РОССИИ ПО КИРОВСКОЙ ОБЛ. В АРБАЖСКОМ РАЙОНЕ',
                            data: { code: '430-001', region_code: '43' },
                        },
                        {
                            value: 'УМВД РОССИИ ПО КИРОВСКОЙ ОБЛ.',
                            data: { code: '430-001', region_code: '43' },
                        },
                    ],
                }),
            });

            const results = await fetchFmsUnitByCode('430-001', { token: 'mock-token' });
            expect(results).toHaveLength(2);
            expect(results[0].value).toBe('ТП УФМС РОССИИ ПО КИРОВСКОЙ ОБЛ. В АРБАЖСКОМ РАЙОНЕ');
            expect(results[0].code).toBe('430-001');
            expect(results[1].value).toBe('УМВД РОССИИ ПО КИРОВСКОЙ ОБЛ.');
        });

        it('handles HTTP error gracefully without throwing', async () => {
            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: false,
                status: 403,
            });

            const results = await fetchFmsUnitByCode('430-001', { token: 'mock-token' });
            expect(results).toEqual([]);
        });

        it('handles network failure gracefully', async () => {
            vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network offline'));

            const results = await fetchFmsUnitByCode('430-001', { token: 'mock-token' });
            expect(results).toEqual([]);
        });
    });

    describe('suggestFmsUnits', () => {
        it('returns empty array for queries shorter than 3 characters', async () => {
            const res = await suggestFmsUnits('УФ');
            expect(res).toEqual([]);
        });

        it('fetches text suggestions when query is valid', async () => {
            vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    suggestions: [
                        { value: 'УФМС ПО КИРОВСКОЙ ОБЛ.', data: { code: '430-000' } },
                    ],
                }),
            });

            const res = await suggestFmsUnits('УФМС', { token: 'mock-token' });
            expect(res).toHaveLength(1);
            expect(res[0].value).toBe('УФМС ПО КИРОВСКОЙ ОБЛ.');
        });
    });
});
