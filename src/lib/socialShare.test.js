import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    SOCIAL_NETWORKS,
    normalizeSocialAccounts,
    getConnectedSocialNetworks,
    resolveSocialUrl,
    buildBannerCaption,
    shareBannerToSocial,
} from './socialShare';

describe('socialShare utilities', () => {
    it('defines all 5 story networks in expected order', () => {
        expect(SOCIAL_NETWORKS.map(n => n.id)).toEqual(['vk', 'ok', 'tg', 'instagram', 'whatsapp']);
    });

    it('normalizes social_accounts from user.passport_details safely', () => {
        const normalized = normalizeSocialAccounts({
            passport_details: {
                social_accounts: {
                    vk: { enabled: true, handle: 'vk.com/realtor', publishMode: 'api' },
                    instagram: { enabled: true, handle: '@my_insta', publishMode: 'api' }, // non-API network falls back to share
                },
            },
        });

        expect(normalized.vk).toEqual({ enabled: true, handle: 'vk.com/realtor', publishMode: 'api' });
        expect(normalized.instagram).toEqual({ enabled: true, handle: '@my_insta', publishMode: 'share' });
        expect(normalized.ok.enabled).toBe(false);
        expect(normalized.tg.enabled).toBe(false);
        expect(normalized.whatsapp.enabled).toBe(false);
    });

    it('returns only enabled networks from getConnectedSocialNetworks', () => {
        const connected = getConnectedSocialNetworks({
            passport_details: {
                social_accounts: {
                    vk: { enabled: true, handle: 'id123' },
                    tg: { enabled: true, handle: '@agent' },
                    whatsapp: { enabled: false, handle: '+79990001122' },
                },
            },
        });

        expect(connected.map(c => c.id)).toEqual(['vk', 'tg']);
    });

    it('resolves safe social URLs and rejects unsafe schemes', () => {
        expect(resolveSocialUrl('vk', '@ivan_realtor')).toBe('https://vk.com/ivan_realtor');
        expect(resolveSocialUrl('tg', '@mychannel')).toBe('https://t.me/mychannel');
        expect(resolveSocialUrl('instagram', '@agent.kirov')).toBe('https://www.instagram.com/agent.kirov/');
        expect(resolveSocialUrl('whatsapp', '8 (912) 345-67-89')).toBe('https://wa.me/79123456789');
        expect(resolveSocialUrl('ok', 'javascript:alert(1)')).toBe('https://ok.ru/javascript%3Aalert(1)');
    });

    it('builds clean banner caption without em-dash', () => {
        const caption = buildBannerCaption(
            { rooms: 2, price: 4500000, area_total: 54, floor: 5, floors_total: 10, address: 'ул. Ленина, 10' },
            '+7 (912) 345-67-89',
            'Центр'
        );
        expect(caption).toContain('2-комн. объект недвижимости');
        expect(caption).toContain('4 500 000 ₽');
        expect(caption).toContain('54 м²');
        expect(caption).toContain('5/10 эт.');
        expect(caption).toContain('Центр - ул. Ленина, 10');
        expect(caption).not.toContain('—');
    });
});

describe('shareBannerToSocial', () => {
    const sampleDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const originalCapacitor = window.Capacitor;
    const originalShare = navigator.share;
    const originalCanShare = navigator.canShare;

    beforeEach(() => {
        delete window.Capacitor;
        vi.restoreAllMocks();
    });

    afterEach(() => {
        window.Capacitor = originalCapacitor;
        navigator.share = originalShare;
        navigator.canShare = originalCanShare;
    });

    it('dispatches to Android SocialSharePlugin when running inside Android Capacitor', async () => {
        const shareToStory = vi.fn().mockResolvedValue({ ok: true, method: 'instagram_story' });
        window.Capacitor = {
            getPlatform: () => 'android',
            Plugins: {
                SocialSharePlugin: { shareToStory },
            },
        };

        const res = await shareBannerToSocial({
            networkId: 'instagram',
            dataUrl: sampleDataUrl,
            fileName: 'banner-1.png',
            caption: 'Квартира в центре',
            account: { enabled: true, publishMode: 'share' },
        });

        expect(shareToStory).toHaveBeenCalledWith({
            network: 'instagram',
            imageBase64: sampleDataUrl,
            fileName: 'banner-1.png',
            caption: 'Квартира в центре',
        });
        expect(res.ok).toBe(true);
        expect(res.method).toBe('android');
    });

    it('uses Web Share API with PNG file when supported by mobile browser', async () => {
        const shareMock = vi.fn().mockResolvedValue(undefined);
        navigator.canShare = vi.fn().mockReturnValue(true);
        navigator.share = shareMock;

        const res = await shareBannerToSocial({
            networkId: 'whatsapp',
            dataUrl: sampleDataUrl,
            fileName: 'banner-2.png',
            caption: 'Тест',
            account: { enabled: true, publishMode: 'share' },
        });

        expect(shareMock).toHaveBeenCalledTimes(1);
        const payload = shareMock.mock.calls[0][0];
        expect(payload.files).toHaveLength(1);
        expect(payload.files[0].name).toBe('banner-2.png');
        expect(res).toMatchObject({ ok: true, method: 'web-share' });
    });

    it('publishes to VK Stories API when publishMode is api and token exists', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
            ok: true,
            json: async () => ({ ok: true, storyId: 42, message: 'Баннер опубликован в Сторис VK' }),
        });

        const res = await shareBannerToSocial({
            networkId: 'vk',
            dataUrl: sampleDataUrl,
            fileName: 'banner-vk.png',
            caption: 'Описание',
            linkUrl: 'https://reacrm.ru/#/p/1',
            account: { enabled: true, publishMode: 'api' },
            tokenStatus: { vk: { hasToken: true } },
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(res).toMatchObject({ ok: true, method: 'api', message: 'Баннер опубликован в Сторис VK' });
    });

    it('throws helpful error if VK API mode is selected without saved token', async () => {
        await expect(
            shareBannerToSocial({
                networkId: 'vk',
                dataUrl: sampleDataUrl,
                account: { enabled: true, publishMode: 'api' },
                tokenStatus: { vk: { hasToken: false } },
            })
        ).rejects.toThrow('укажите токен доступа VK в профиле');
    });
});
