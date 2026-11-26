import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  normalizePhoneForGoogle,
  phonesMatch,
  extractGoogleContactSummary,
  buildGoogleContactPayload,
  searchGoogleContactByPhone,
  createGoogleContact,
} from './googleContacts';

vi.mock('./googleCalendar', () => ({
  isCalendarConfigured: vi.fn(() => true),
  isCalendarConnected: vi.fn(() => true),
  getGoogleAccessToken: vi.fn(async () => 'mock-google-token'),
}));

describe('googleContacts', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('normalizes Russian phone numbers in various formats', () => {
    expect(normalizePhoneForGoogle('+7 (909) 130-40-90')).toEqual({
      digits: '79091304090',
      last10: '9091304090',
      e164: '+79091304090',
    });
    expect(normalizePhoneForGoogle('89091304090').last10).toBe('9091304090');
    expect(normalizePhoneForGoogle('9091304090').digits).toBe('79091304090');
  });

  it('matches phones regardless of formatting or leading 7/8', () => {
    expect(phonesMatch('+7 (909) 130-40-90', '89091304090')).toBe(true);
    expect(phonesMatch('9091304090', '+79091304090')).toBe(true);
    expect(phonesMatch('+79091304090', '+79091304091')).toBe(false);
  });

  it('extracts Google contact summary cleanly', () => {
    const summary = extractGoogleContactSummary({
      resourceName: 'people/c123',
      names: [{ displayName: 'Иванов Иван' }],
      phoneNumbers: [{ value: '+7 909 130-40-90' }],
      emailAddresses: [{ value: 'ivan@example.com' }],
      organizations: [{ name: 'REA CRM' }],
    });
    expect(summary).toEqual({
      resourceName: 'people/c123',
      name: 'Иванов Иван',
      phone: '+7 909 130-40-90',
      email: 'ivan@example.com',
      organization: 'REA CRM',
      note: '',
    });
  });

  it('builds Google People API createContact payload', () => {
    const payload = buildGoogleContactPayload({
      full_name: 'Петров Сергей',
      phone: '79091304090',
      email: 'petrov@test.ru',
      client_types: ['buyer'],
      notes: 'Ищет 2к квартиру',
    });

    expect(payload.names[0]).toEqual({ familyName: 'Петров', givenName: 'Сергей' });
    expect(payload.phoneNumbers[0].value).toBe('+7 (909) 130-40-90');
    expect(payload.emailAddresses[0].value).toBe('petrov@test.ru');
    expect(payload.organizations[0].name).toBe('REA CRM');
    expect(payload.biographies[0].value).toContain('Ищет 2к квартиру');
  });

  it('returns too_short when phone has fewer than 10 digits', async () => {
    const res = await searchGoogleContactByPhone('+7 (909) 13');
    expect(res).toEqual({ status: 'too_short', found: false, contact: null });
  });

  it('searches Google Contacts and returns matched contact', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          {
            person: {
              resourceName: 'people/c999',
              names: [{ displayName: 'Алексей Смирнов' }],
              phoneNumbers: [{ value: '+7 909 130-40-90' }],
            },
          },
        ],
      }),
    });

    const res = await searchGoogleContactByPhone('+7 (909) 130-40-90');
    expect(res.status).toBe('found');
    expect(res.found).toBe(true);
    expect(res.contact.name).toBe('Алексей Смирнов');
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch.mock.calls[0][0]).toContain('query=9091304090');
  });

  it('returns insufficient_scope when Google returns 403 permission error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        error: {
          status: 'PERMISSION_DENIED',
          message: 'Request had insufficient authentication scopes.',
        },
      }),
    });

    const res = await searchGoogleContactByPhone('+7 (909) 130-40-90');
    expect(res.status).toBe('insufficient_scope');
    expect(res.found).toBe(false);
  });

  it('creates Google contact when not found in search', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          resourceName: 'people/c777',
          names: [{ displayName: 'Сидорова Анна' }],
          phoneNumbers: [{ value: '+7 (909) 130-40-90' }],
        }),
      });

    const res = await createGoogleContact({
      full_name: 'Сидорова Анна',
      phone: '+7 (909) 130-40-90',
    });

    expect(res.created).toBe(true);
    expect(res.alreadyExists).toBe(false);
    expect(res.contact.resourceName).toBe('people/c777');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('skips creating Google contact if already exists', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            person: {
              resourceName: 'people/c555',
              names: [{ displayName: 'Уже Есть' }],
              phoneNumbers: [{ value: '89091304090' }],
            },
          },
        ],
      }),
    });

    const res = await createGoogleContact({
      full_name: 'Новый Клиент',
      phone: '+7 (909) 130-40-90',
    });

    expect(res.created).toBe(false);
    expect(res.alreadyExists).toBe(true);
    expect(res.contact.name).toBe('Уже Есть');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
