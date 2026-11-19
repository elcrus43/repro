import { describe, it, expect, vi } from 'vitest';
import handler from '../../api/_image-proxy.js';

describe('api/image-proxy', () => {
  it('returns 400 when url is missing', async () => {
    let statusCode = null;
    let jsonBody = null;

    const req = {
      method: 'GET',
      query: {},
    };
    const res = {
      setHeader: vi.fn(),
      status: vi.fn((code) => {
        statusCode = code;
        return {
          json: (data) => { jsonBody = data; },
        };
      }),
    };

    await handler(req, res);
    expect(statusCode).toBe(400);
    expect(jsonBody.error).toMatch(/Missing url/i);
  });

  it('rejects private / localhost IP addresses for SSRF protection', async () => {
    let statusCode = null;
    let jsonBody = null;

    const req = {
      method: 'GET',
      query: { url: 'http://127.0.0.1:8080/secret.png' },
    };
    const res = {
      setHeader: vi.fn(),
      status: vi.fn((code) => {
        statusCode = code;
        return {
          json: (data) => { jsonBody = data; },
        };
      }),
    };

    await handler(req, res);
    expect(statusCode).toBe(403);
    expect(jsonBody.error).toMatch(/prohibited/i);
  });

  it('rejects unsupported protocols', async () => {
    let statusCode = null;
    let jsonBody = null;

    const req = {
      method: 'GET',
      query: { url: 'ftp://example.com/plan.png' },
    };
    const res = {
      setHeader: vi.fn(),
      status: vi.fn((code) => {
        statusCode = code;
        return {
          json: (data) => { jsonBody = data; },
        };
      }),
    };

    await handler(req, res);
    expect(statusCode).toBe(400);
    expect(jsonBody.error).toMatch(/http and https/i);
  });
});
