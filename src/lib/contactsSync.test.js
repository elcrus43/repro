import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    formatClientForContact,
    generateVCard,
    generateBatchVCard,
    generateGoogleContactsCsv,
    isNativeContactsSupported,
    saveClientToDevice,
    syncClientsBatchToDevice
} from './contactsSync';

describe('contactsSync module', () => {
    const mockClient = {
        id: 'c1',
        full_name: 'Иван Сергеевич Петров',
        phone: '+7 912 345-67-89',
        email: 'ivan.petrov@example.com',
        client_types: ['buyer'],
        source: 'Авито',
        budget: 5200000,
        notes: 'Ищет 2-комнатную в районе парка'
    };

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('formats client for contact structure properly', () => {
        const formatted = formatClientForContact(mockClient);
        expect(formatted.name).toBe('Иван Сергеевич Петров');
        expect(formatted.phone).toBe('+7 912 345-67-89');
        expect(formatted.email).toBe('ivan.petrov@example.com');
        expect(formatted.organization).toBe('REA CRM');
        expect(formatted.jobTitle).toBe('Покупатель');
        expect(formatted.note).toContain('Категория: Покупатель');
        expect(formatted.note.replace(/\u00a0/g, ' ')).toContain('Бюджет: 5 200 000 ₽');
        expect(formatted.note).toContain('Заметка: Ищет 2-комнатную в районе парка');
    });

    it('generates standard vCard 3.0 content with UTF-8 encoding', () => {
        const vcard = generateVCard(mockClient);
        expect(vcard).toContain('BEGIN:VCARD');
        expect(vcard).toContain('VERSION:3.0');
        expect(vcard).toContain('FN;CHARSET=UTF-8:Иван Сергеевич Петров');
        expect(vcard).toContain('N;CHARSET=UTF-8:Иван;Сергеевич Петров;;;');
        expect(vcard).toContain('TEL;TYPE=CELL,VOICE:+7 912 345-67-89');
        expect(vcard).toContain('EMAIL;TYPE=INTERNET,WORK:ivan.petrov@example.com');
        expect(vcard).toContain('ORG;CHARSET=UTF-8:REA CRM');
        expect(vcard).toContain('TITLE;CHARSET=UTF-8:Покупатель');
        expect(vcard).toContain('END:VCARD');
    });

    it('generates multi-contact batch vCard', () => {
        const client2 = {
            id: 'c2',
            full_name: 'Анна Васильева',
            phone: '+7 922 987-65-43',
            client_types: ['seller']
        };

        const batch = generateBatchVCard([mockClient, client2]);
        const occurrences = (batch.match(/BEGIN:VCARD/g) || []).length;
        expect(occurrences).toBe(2);
        expect(batch).toContain('FN;CHARSET=UTF-8:Анна Васильева');
        expect(batch).toContain('TITLE;CHARSET=UTF-8:Продавец');
    });

    it('generates Google Contacts CSV with UTF-8 BOM and standard headers', () => {
        const csv = generateGoogleContactsCsv([mockClient]);
        expect(csv.startsWith('\uFEFF')).toBe(true);
        expect(csv).toContain('Name,Given Name,Family Name,Group Membership');
        expect(csv).toContain('"Иван Сергеевич Петров"');
        expect(csv).toContain('"REA CRM ::: * myContacts"');
        expect(csv).toContain('"+7 912 345-67-89"');
    });

    it('detects native Capacitor plugin availability safely', () => {
        // Without window.Capacitor
        expect(isNativeContactsSupported()).toBe(false);

        // With mock window.Capacitor
        window.Capacitor = {
            Plugins: {
                ContactsSyncPlugin: {}
            }
        };
        expect(isNativeContactsSupported()).toBe(true);
        delete window.Capacitor;
    });

    it('executes native saveContact when Capacitor plugin is present', async () => {
        const requestPermission = vi.fn().mockResolvedValue({ granted: true });
        const saveContact = vi.fn().mockResolvedValue({ success: true, alreadyExists: false, googleAccount: 'agent@gmail.com' });

        window.Capacitor = {
            Plugins: {
                ContactsSyncPlugin: {
                    requestPermission,
                    saveContact
                }
            }
        };

        const result = await saveClientToDevice(mockClient);
        expect(requestPermission).toHaveBeenCalled();
        expect(saveContact).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Иван Сергеевич Петров',
            phone: '+7 912 345-67-89',
            organization: 'REA CRM'
        }));
        expect(result.success).toBe(true);
        expect(result.mode).toBe('native');
        expect(result.googleAccount).toBe('agent@gmail.com');

        delete window.Capacitor;
    });

    it('falls back to vCard download when not running in native app', async () => {
        // Mock document.createElement('a')
        const clickMock = vi.fn();
        const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue({
            style: {},
            set href(val) {},
            set download(val) {},
            click: clickMock
        });
        const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {});
        const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {});

        global.URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
        global.URL.revokeObjectURL = vi.fn();

        const result = await saveClientToDevice(mockClient);
        expect(result.success).toBe(true);
        expect(result.mode).toBe('vcard');
        expect(clickMock).toHaveBeenCalled();

        createElementSpy.mockRestore();
        appendChildSpy.mockRestore();
        removeChildSpy.mockRestore();
    });
});
