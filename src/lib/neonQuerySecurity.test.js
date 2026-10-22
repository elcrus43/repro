/**
 * neonQuerySecurity.test.js
 *
 * Тесты безопасности серверного шлюза api/neon-query.js и api/deal-chat.js:
 * Проверка защиты от обходов (P0-1 ... P0-6).
 */

import { describe, it, expect } from 'vitest';
import { isPublicQuery, stripSensitiveFields } from '../../api/neon-query.js';
import { isValidDealToken } from '../../api/deal-chat.js';

describe('neon-query isPublicQuery security filter', () => {
  it('blocks wildcard deal dumps (P0-4)', () => {
    expect(isPublicQuery("SELECT * FROM deals WHERE id::text LIKE '%'")).toBe(false);
    expect(isPublicQuery("SELECT * FROM deals")).toBe(false);
    expect(isPublicQuery("SELECT id, title, status, lawyer FROM deals WHERE id::text LIKE $1")).toBe(false);
  });

  it('blocks wildcard client dumps with * (P0-4)', () => {
    expect(isPublicQuery("SELECT * FROM clients WHERE public_token = $1 LIMIT 1")).toBe(false);
    expect(isPublicQuery("SELECT id, full_name, realtor_id FROM clients WHERE public_token = $1 LIMIT 1")).toBe(true);
  });

  it('blocks wildcard property dumps with p.* (P1-6)', () => {
    const maliciousQuery = `SELECT p.*, json_build_object('full_name', prof.full_name, 'phone', prof.phone, 'agency_name', prof.agency_name) as profiles FROM properties p LEFT JOIN profiles prof ON p.realtor_id = prof.id WHERE p.id = $1`;
    expect(isPublicQuery(maliciousQuery)).toBe(false);
  });

  it('allows public property query with safe explicit column whitelist', () => {
    const safeQuery = `SELECT p.id, p.title, p.price, p.address, p.city, p.rooms, p.area_total, p.floor, p.floors_total, p.property_type, p.building_type, p.description, p.images, p.cover_image, json_build_object('full_name', prof.full_name, 'phone', prof.phone, 'agency_name', prof.agency_name) as profiles FROM properties p LEFT JOIN profiles prof ON p.realtor_id = prof.id WHERE p.id = $1`;
    expect(isPublicQuery(safeQuery)).toBe(true);
  });

  it('blocks direct public access to deal_messages (P0-5 moved to dedicated api/deal-chat.js)', () => {
    expect(isPublicQuery(`SELECT * FROM "deal_messages" WHERE "deal_id" = $1 AND "side" = $2 ORDER BY "created_at" ASC`)).toBe(false);
    expect(isPublicQuery(`INSERT INTO "deal_messages" (deal_id, text) VALUES ($1, $2)`)).toBe(false);
  });

  it('blocks arbitrary mutations disguised as public queries', () => {
    expect(isPublicQuery("DROP TABLE users")).toBe(false);
    expect(isPublicQuery("UPDATE profiles SET role = 'admin'")).toBe(false);
    expect(isPublicQuery("DELETE FROM deals")).toBe(false);
  });

  it('blocks matches query with m.* to prevent leaking realtor comments', () => {
    expect(isPublicQuery(`SELECT m.*, json_build_object('id', pr.id) as properties FROM matches m JOIN properties pr ON m.property_id = pr.id WHERE m.request_id = ANY($1)`)).toBe(false);
  });

  it('allows matches query with safe explicit columns without realtor comments', () => {
    const safeMatches = `SELECT m.id, m.request_id, m.property_id, m.score, m.match_level, m.matched_params, m.mismatched_params, m.status, json_build_object('id', pr.id, 'price', pr.price) as properties FROM matches m JOIN properties pr ON m.property_id = pr.id WHERE m.request_id = ANY($1)`;
    expect(isPublicQuery(safeMatches)).toBe(true);
  });
});

describe('Defense-in-depth stripSensitiveFields (P0-2)', () => {
  it('recursively removes password_hash from objects and nested arrays', () => {
    const raw = {
      id: 'u-1',
      full_name: 'Agent',
      password_hash: '$2b$10$abcdef123456',
      profiles: [
        { id: 'u-2', password_hash: '$2b$10$secret', name: 'Other' }
      ]
    };
    const cleaned = stripSensitiveFields(raw);
    expect(cleaned.password_hash).toBeUndefined();
    expect(cleaned.profiles[0].password_hash).toBeUndefined();
    expect(cleaned.full_name).toBe('Agent');
  });
});

describe('deal-chat token security (P0-5)', () => {
  it('rejects bare deal UUID as token', () => {
    const dealId = '123e4567-e89b-12d3-a456-426614174000';
    expect(isValidDealToken(dealId, 'buyer', dealId)).toBe(false);
  });

  it('validates secret token matching deterministic hash', () => {
    const dealId = '123e4567-e89b-12d3-a456-426614174000';
    const hash = Math.abs(dealId.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)).toString(36);
    const validToken = `t_sec_buyer_${dealId.substring(0, 8)}_${hash}`;
    expect(isValidDealToken(dealId, 'buyer', validToken)).toBe(true);
    expect(isValidDealToken(dealId, 'seller', validToken)).toBe(false);
    expect(isValidDealToken('different-id', 'buyer', validToken)).toBe(false);
  });
});
