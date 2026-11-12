import { describe, it, expect } from 'vitest';
import { getAiProxyUrl, buildApiUrl, PRIMARY_API_ORIGIN } from './apiConfig';

describe('getAiProxyUrl', () => {
    it('возвращает абсолютный URL прокси, чтобы ИИ не вызывался напрямую с локального IP', () => {
        const url = getAiProxyUrl();
        expect(url).toMatch(/^https?:\/\//);
        expect(url.endsWith('/api/ai-proxy')).toBe(true);
    });

    it('в dev-режиме указывает на основной домен, а не на localhost', () => {
        const url = getAiProxyUrl();
        expect(url).not.toContain('localhost');
        expect(url).toContain(new URL(PRIMARY_API_ORIGIN).hostname);
    });

    it('buildApiUrl корректно склеивает endpoint и origin', () => {
        expect(buildApiUrl('api/ai-proxy', 'https://example.com')).toBe('https://example.com/api/ai-proxy');
        expect(buildApiUrl('/api/ai-proxy', 'https://example.com/')).toBe('https://example.com/api/ai-proxy');
    });
});
