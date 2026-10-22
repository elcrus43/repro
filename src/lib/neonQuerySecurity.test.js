/**
 * neonQuerySecurity.test.js
 *
 * Тесты безопасности серверного шлюза api/neon-query.js и api/deal-chat.js:
 * Проверка защиты от обходов (P0-1 ... P0-6).
 */

import { describe, it, expect } from 'vitest';
import {
  isPublicQuery,
  stripSensitiveFields,
  extractTableAndAlias,
  hasProfilesWildcard,
  extractSubqueries,
  transformAndValidateQuery
} from '../../api/neon-query.js';
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

describe('SQL alias and keyword collision guards (P0-2, P0-5)', () => {
  it('correctly ignores SQL reserved words like WHERE or SET as aliases in FROM clause', () => {
    const res = extractTableAndAlias('SELECT * FROM "clients" WHERE id = $1', 'FROM');
    expect(res.table).toBe('clients');
    expect(res.alias).toBeNull();
  });

  it('correctly extracts explicit aliases in FROM clause', () => {
    const res = extractTableAndAlias('SELECT * FROM "clients" c WHERE c.id = $1', 'FROM');
    expect(res.table).toBe('clients');
    expect(res.alias).toBe('c');
  });

  it('correctly extracts table and alias in UPDATE clause ignoring SET', () => {
    const res = extractTableAndAlias('UPDATE "clients" SET status = $1 WHERE id = $2', 'UPDATE');
    expect(res.table).toBe('clients');
    expect(res.alias).toBeNull();
  });

  it('correctly extracts alias in UPDATE clause when AS is provided', () => {
    const res = extractTableAndAlias('UPDATE "clients" AS c SET status = $1 WHERE c.id = $2', 'UPDATE');
    expect(res.table).toBe('clients');
    expect(res.alias).toBe('c');
  });
});

describe('Profiles wildcard query detector (P0-3, P0-4)', () => {
  it('detects bare asterisk in SELECT * FROM profiles', () => {
    expect(hasProfilesWildcard('SELECT * FROM "profiles" WHERE id = $1')).toBe(true);
    expect(hasProfilesWildcard('SELECT * FROM profiles')).toBe(true);
  });

  it('detects table-prefixed asterisk like profiles.* or p.* (including quotes)', () => {
    expect(hasProfilesWildcard('SELECT profiles.* FROM profiles WHERE id = $1')).toBe(true);
    expect(hasProfilesWildcard('SELECT "profiles".* FROM "profiles" WHERE id = $1')).toBe(true);
    expect(hasProfilesWildcard('SELECT p.* FROM "profiles" p WHERE p.id = $1')).toBe(true);
    expect(hasProfilesWildcard('SELECT "p".* FROM "profiles" "p" WHERE "p".id = $1')).toBe(true);
    expect(hasProfilesWildcard('SELECT p.* FROM profiles AS p WHERE p.id = $1')).toBe(true);
  });

  it('allows safe explicit column lists for profiles', () => {
    expect(hasProfilesWildcard('SELECT id, full_name, email, role FROM profiles WHERE id = $1')).toBe(false);
    expect(hasProfilesWildcard('SELECT p.id, p.full_name, p.role FROM "profiles" p WHERE p.id = $1')).toBe(false);
  });
});

describe('Precise Subquery Extractor (P0-2, P0-3)', () => {
  it('extracts multiple independent subqueries without merging them into a single span', () => {
    const sql = `SELECT json_build_object(
      'a', (SELECT id FROM "requests" WHERE realtor_id = $1),
      'b', (SELECT * FROM "clients")
    )`;
    const sqs = extractSubqueries(sql);
    expect(sqs.length).toBe(2);
    expect(sqs[0]).toContain('FROM "requests"');
    expect(sqs[1]).toContain('FROM "clients"');
  });

  it('extracts nested subqueries correctly', () => {
    const sql = `SELECT * FROM properties WHERE client_id IN (SELECT id FROM clients WHERE status = (SELECT val FROM config))`;
    const sqs = extractSubqueries(sql);
    expect(sqs.length).toBe(2);
  });
});

describe('Pipeline Security Filter: transformAndValidateQuery (P0-1 ... P0-6)', () => {
  const realtorPayload = { sub: 'realtor-uuid-1', role: 'realtor', status: 'approved' };
  const adminPayload = { sub: 'admin-uuid-9', role: 'admin', status: 'approved' };

  it('P0-1: blocks UNION / UNION ALL queries for non-admins', () => {
    const attack = `SELECT * FROM "clients" UNION ALL SELECT * FROM "clients"`;
    const res = transformAndValidateQuery(attack, [], realtorPayload);
    expect(res.error).toMatch(/UNION queries are forbidden/i);
    expect(res.status).toBe(403);
  });

  it('P0-1: allows admin to execute complex queries', () => {
    const query = `SELECT * FROM "clients" UNION ALL SELECT * FROM "clients"`;
    const res = transformAndValidateQuery(query, [], adminPayload);
    expect(res.error).toBeNull();
  });

  it('P0-2: blocks subqueries in SELECT projection targeting private tables without realtor_id', () => {
    const attack = `SELECT (SELECT row_to_json(t) FROM "clients") AS data FROM "properties" p`;
    const res = transformAndValidateQuery(attack, [], realtorPayload);
    expect(res.error).toMatch(/subquery to clients must filter by realtor_id/i);
    expect(res.status).toBe(403);
  });

  it('P0-3: blocks multi-subquery aggregate when decoy subquery is used', () => {
    const attack = `SELECT json_build_object(
      'a', (SELECT id FROM "requests" t WHERE t."realtor_id" = $1),
      'b', (SELECT * FROM "clients")
    ) as data`;
    const res = transformAndValidateQuery(attack, ['realtor-uuid-1'], realtorPayload);
    expect(res.error).toMatch(/subquery to clients must filter by realtor_id/i);
    expect(res.status).toBe(403);
  });

  it('P0-4: blocks mass read of profiles without WHERE clause', () => {
    const attack = `SELECT id, email, inn, passport_details FROM "profiles"`;
    const res = transformAndValidateQuery(attack, [], realtorPayload);
    expect(res.error).toMatch(/profile query must specify own id in WHERE/i);
    expect(res.status).toBe(403);
  });

  it('P0-4: blocks read of another user profile', () => {
    const attack = `SELECT id, email, phone FROM "profiles" WHERE id = $1`;
    const res = transformAndValidateQuery(attack, ['another-user-uuid'], realtorPayload);
    expect(res.error).toMatch(/cannot query another user profile/i);
    expect(res.status).toBe(403);
  });

  it('P0-4: allows reading own profile by own id', () => {
    const safe = `SELECT id, email, phone FROM "profiles" WHERE id = $1`;
    const res = transformAndValidateQuery(safe, ['realtor-uuid-1'], realtorPayload);
    expect(res.error).toBeNull();
  });

  it('P0-5: isolates deal_messages SELECT via deals ownership without breaking schema (no realtor_id in deal_messages)', () => {
    const query = `SELECT * FROM "deal_messages" WHERE "deal_id" = $1 AND "side" = $2 ORDER BY "created_at" ASC`;
    const res = transformAndValidateQuery(query, ['deal-uuid-10', 'buyer'], realtorPayload);
    expect(res.error).toBeNull();
    expect(res.query).toContain(`"deal_id" IN (SELECT id FROM deals WHERE realtor_id = $3)`);
    expect(res.params).toEqual(['deal-uuid-10', 'buyer', 'realtor-uuid-1']);
  });

  it('P0-5: isolates deal_messages DISTINCT ON query in DealsPage', () => {
    const query = `SELECT DISTINCT ON (deal_id, side) deal_id, side, sender_id, created_at FROM deal_messages ORDER BY deal_id, side, created_at DESC`;
    const res = transformAndValidateQuery(query, [], realtorPayload);
    expect(res.error).toBeNull();
    expect(res.query).toContain(`WHERE "deal_id" IN (SELECT id FROM deals WHERE realtor_id = $1)`);
    expect(res.params).toEqual(['realtor-uuid-1']);
  });

  it('P0-5: isolates deal_messages DELETE via deals ownership', () => {
    const query = `DELETE FROM "deal_messages" WHERE id = $1`;
    const res = transformAndValidateQuery(query, ['msg-uuid-55'], realtorPayload);
    expect(res.error).toBeNull();
    expect(res.query).toMatch(/WHERE "deal_id" IN \(SELECT id FROM deals WHERE realtor_id = \$2\)\s+AND\s+\(id = \$1\)/);
    expect(res.params).toEqual(['msg-uuid-55', 'realtor-uuid-1']);
  });

  it('P0-6: isolates clients SELECT with realtor_id', () => {
    const query = `SELECT * FROM "clients" WHERE id = $1`;
    const res = transformAndValidateQuery(query, ['c-1'], realtorPayload);
    expect(res.error).toBeNull();
    expect(res.query).toContain(`"realtor_id" = $2`);
    expect(res.params).toEqual(['c-1', 'realtor-uuid-1']);
  });

  it('P0-6: isolates clients UPDATE with realtor_id', () => {
    const query = `UPDATE "clients" SET full_name = $1 WHERE id = $2`;
    const res = transformAndValidateQuery(query, ['New Name', 'c-1'], realtorPayload);
    expect(res.error).toBeNull();
    expect(res.query).toContain(`"realtor_id" = $3`);
    expect(res.params).toEqual(['New Name', 'c-1', 'realtor-uuid-1']);
  });

  it('P0-6: isolates clients DELETE with realtor_id', () => {
    const query = `DELETE FROM "clients" WHERE id = $1`;
    const res = transformAndValidateQuery(query, ['c-1'], realtorPayload);
    expect(res.error).toBeNull();
    expect(res.query).toContain(`"realtor_id" = $2`);
    expect(res.params).toEqual(['c-1', 'realtor-uuid-1']);
  });

  it('blocks non-admin from modifying pricelist', () => {
    const query = `UPDATE "pricelist" SET price = $1 WHERE id = $2`;
    const res = transformAndValidateQuery(query, [1000, 'p-1'], realtorPayload);
    expect(res.error).toMatch(/only admins can modify pricelist/i);
    expect(res.status).toBe(403);
  });

  it('allows full user data loading query when all private subqueries filter by realtor_id', () => {
    const query = `
      SELECT json_build_object(
        'clients', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "clients" t WHERE t."realtor_id" = $1),
        'properties', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "properties" t),
        'requests', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "requests" t WHERE t."realtor_id" = $1),
        'matches', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "matches" t WHERE t."realtor_id" = $1),
        'showings', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "showings" t WHERE t."realtor_id" = $1),
        'tasks', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "tasks" t WHERE t."realtor_id" = $1),
        'pricelist', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "pricelist" t),
        'deals', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "deals" t WHERE t."realtor_id" = $1),
        'profiles', (SELECT COALESCE(json_agg(json_build_object(
          'id', t.id,
          'email', t.email,
          'full_name', t.full_name,
          'phone', t.phone,
          'agency_name', t.agency_name,
          'inn', t.inn,
          'role', t.role,
          'status', t.status,
          'created_at', t.created_at,
          'passport_details', CASE WHEN t.id = $1 THEN t.passport_details ELSE NULL END
        )), '[]'::json) FROM "profiles" t),
        'selection_items', (SELECT COALESCE(json_agg(t), '[]'::json) FROM "selection_items" t WHERE t."realtor_id" = $1)
      ) as data
    `;
    const res = transformAndValidateQuery(query, ['realtor-uuid-1'], realtorPayload);
    expect(res.error).toBeNull();
  });

  // ─── Тесты на векторы уязвимостей SQLi-1 ... SQLi-6 и регрессий ───

  it('SQLi-1: wraps existing WHERE conditions in parens to prevent AND/OR precedence bypass', () => {
    const attackQuery = `SELECT * FROM "clients" WHERE id = $1 OR 1=1`;
    const res = transformAndValidateQuery(attackQuery, ['c-1'], realtorPayload);
    expect(res.error).toBeNull();
    // Изоляция конъюнктивно объединяется с обёрнутым в скобки предикатом
    expect(res.query).toContain(`WHERE "realtor_id" = $2 AND (id = $1 OR 1=1)`);
    expect(res.params).toEqual(['c-1', 'realtor-uuid-1']);
  });

  it('SQLi-2: blocks subqueries to private tables that use dummy strings or non-equality realtor_id checks', () => {
    const attack1 = `SELECT (SELECT json_agg(c) FROM "clients" c WHERE 'realtor_id' IS NOT NULL) FROM properties`;
    const res1 = transformAndValidateQuery(attack1, [], realtorPayload);
    expect(res1.error).toMatch(/must filter by realtor_id = \$N/i);
    expect(res1.status).toBe(403);

    const attack2 = `SELECT (SELECT json_agg(c) FROM "clients" c WHERE c.realtor_id IS NOT NULL) FROM properties`;
    const res2 = transformAndValidateQuery(attack2, [], realtorPayload);
    expect(res2.error).toMatch(/must filter by realtor_id = \$N/i);
    expect(res2.status).toBe(403);

    const attack3 = `SELECT (SELECT json_agg(c) FROM "clients" c WHERE c.realtor_id = $1) FROM properties`;
    // Параметр $1 указывает на чужой UUID, а не на realtorPayload.sub
    const res3 = transformAndValidateQuery(attack3, ['victim-uuid'], realtorPayload);
    expect(res3.error).toMatch(/realtor_id parameter does not match current user/i);
    expect(res3.status).toBe(403);
  });

  it('SQLi-3: CTE WITH subqueries are extracted and validated', () => {
    const attackCTE = `SELECT (WITH x AS (SELECT 1) SELECT * FROM "clients") FROM properties`;
    const res = transformAndValidateQuery(attackCTE, [], realtorPayload);
    expect(res.error).toMatch(/must filter by realtor_id = \$N/i);
    expect(res.status).toBe(403);
  });

  it('SQLi-4: blocks unauthenticated query injection into public property/matches templates', () => {
    const maliciousPublicProp = `SELECT p.id, p.title, p.price, p.address, p.city, p.rooms, p.area_total, p.floor, p.floors_total, p.property_type, p.building_type, p.description, p.images, p.cover_image, json_build_object('dump', (SELECT json_agg(c) FROM clients c)) as profiles FROM properties p LEFT JOIN profiles prof ON p.realtor_id = prof.id WHERE p.id = $1`;
    expect(isPublicQuery(maliciousPublicProp)).toBe(false);

    const maliciousPublicMatch = `SELECT m.id, m.request_id, m.property_id, m.score, m.match_level, m.matched_params, m.mismatched_params, m.status, json_build_object('dump', (SELECT json_agg(c) FROM clients c)) as properties FROM matches m JOIN properties pr ON m.property_id = pr.id WHERE m.request_id = ANY($1)`;
    expect(isPublicQuery(maliciousPublicMatch)).toBe(false);
  });

  it('SQLi-5: validates subqueries to deal_messages for deal_id presence', () => {
    const attack = `SELECT (SELECT json_agg(dm) FROM deal_messages dm) FROM properties`;
    const res = transformAndValidateQuery(attack, [], realtorPayload);
    expect(res.error).toMatch(/must filter by deal_id/i);
    expect(res.status).toBe(403);
  });

  it('Matches status rejection: allows bulk rejection of matches by property_id for property owner', () => {
    const query = `UPDATE matches SET status = 'rejected', updated_at = NOW() WHERE property_id = $1 AND status != 'rejected'`;
    const res = transformAndValidateQuery(query, ['prop-uuid-1'], realtorPayload);
    expect(res.error).toBeNull();
    expect(res.query).toContain(`("realtor_id" = $2 OR "property_id" IN (SELECT id FROM properties WHERE realtor_id = $2) OR "request_id" IN (SELECT id FROM requests WHERE realtor_id = $2))`);
    expect(res.params).toEqual(['prop-uuid-1', 'realtor-uuid-1']);
  });
});
