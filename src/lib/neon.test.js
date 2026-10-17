import { describe, it, expect, vi } from 'vitest';
import {
  isValidIdentifier,
  assertValidIdentifier,
  sanitizeOrderBy,
  buildWhere,
  neonDb,
} from './neon';

describe('neon.js SQL injection prevention and security suite', () => {
  describe('isValidIdentifier & assertValidIdentifier', () => {
    it('allows valid SQL table and column identifiers', () => {
      const valid = ['users', 'user_sessions', '_id', 'created_at', 'table123', 'profile_id'];
      for (const id of valid) {
        expect(isValidIdentifier(id)).toBe(true);
        expect(() => assertValidIdentifier(id)).not.toThrow();
      }
    });

    it('rejects identifiers with SQL injection payloads or special characters', () => {
      const invalid = [
        'users" --',
        'table; DROP TABLE users',
        'users" OR "1"="1',
        'user id',
        'col-name',
        'users/*comment*/',
        'table\0',
        '1table', // starts with digit
        '',
        null,
        undefined,
      ];
      for (const id of invalid) {
        expect(isValidIdentifier(id)).toBe(false);
        expect(() => assertValidIdentifier(id)).toThrow();
      }
    });
  });

  describe('sanitizeOrderBy', () => {
    it('allows standard and safe ORDER BY clauses', () => {
      expect(sanitizeOrderBy('created_at DESC')).toBe('created_at DESC');
      expect(sanitizeOrderBy('price ASC, created_at DESC')).toBe('price ASC, created_at DESC');
      expect(sanitizeOrderBy('p.price ASC NULLS LAST')).toBe('p.price ASC NULLS LAST');
      expect(sanitizeOrderBy('updated_at')).toBe('updated_at');
      expect(sanitizeOrderBy('')).toBe('');
      expect(sanitizeOrderBy(null)).toBe('');
    });

    it('rejects SQL injection attempts in ORDER BY', () => {
      const maliciousOrderBy = [
        'id; DROP TABLE clients',
        'price; SELECT * FROM profiles',
        'price ASC -- comment',
        '(SELECT CASE WHEN (1=1) THEN price ELSE NULL END)',
        'price UNION SELECT 1, 2',
        'price/*comment*/DESC',
      ];
      for (const clause of maliciousOrderBy) {
        expect(() => sanitizeOrderBy(clause)).toThrow(/SECURITY ERROR|Недопустимое выражение ORDER BY/i);
      }
    });
  });

  describe('buildWhere parameterized query generator', () => {
    it('produces properly indexed parameterized queries and parameters', () => {
      const filters = {
        status: 'active',
        price: ['gte', 5000000],
        realtor_id: 'user_123',
      };
      const { clause, params } = buildWhere(filters);
      expect(clause).toBe('WHERE "status" = $1 AND "price" >= $2 AND "realtor_id" = $3');
      expect(params).toEqual(['active', 5000000, 'user_123']);
    });

    it('handles null values safely', () => {
      const { clause, params } = buildWhere({ deleted_at: null, is_active: ['is', null] });
      expect(clause).toBe('WHERE "deleted_at" IS NULL AND "is_active" IS NULL');
      expect(params).toEqual([]);
    });

    it('handles array ANY comparison safely for "in" operator', () => {
      const { clause, params } = buildWhere({ status: ['in', ['active', 'pending']] });
      expect(clause).toBe('WHERE "status" = ANY($1)');
      expect(params).toEqual([['active', 'pending']]);
    });

    it('rejects unsupported operators or malicious operator strings', () => {
      expect(() => buildWhere({ status: ['or 1=1', 'test'] })).toThrow(/Недопустимый оператор/i);
      expect(() => buildWhere({ status: ['; DROP TABLE', 'test'] })).toThrow(/Недопустимый оператор/i);
    });

    it('rejects invalid column names in filters', () => {
      expect(() => buildWhere({ 'status"; DROP TABLE users; --': 'active' })).toThrow(/Недопустимое или небезопасное имя/i);
    });
  });

  describe('neonDb methods safety guards', () => {
    it('rejects malicious table names in select without sending network requests', async () => {
      const res = await neonDb.select('clients" OR "1"="1');
      expect(res.error).toBeDefined();
      expect(res.error.code).toBe('SECURITY_ERROR');
      expect(res.data).toBeNull();
    });

    it('rejects malicious column names in insert without sending network requests', async () => {
      const res = await neonDb.insert('clients', {
        'name" = \'pwned\'; --': 'John Doe',
      });
      expect(res.error).toBeDefined();
      expect(res.error.code).toBe('SECURITY_ERROR');
      expect(res.data).toBeNull();
    });

    it('rejects malicious column names in update without sending network requests', async () => {
      const res = await neonDb.update('clients', '123', {
        'id" = \'pwned\'; --': 'malicious',
      });
      expect(res.error).toBeDefined();
      expect(res.error.code).toBe('SECURITY_ERROR');
      expect(res.data).toBeNull();
    });

    it('rejects malicious table names in delete without sending network requests', async () => {
      const res = await neonDb.delete('clients"; DROP TABLE users; --', '123');
      expect(res.error).toBeDefined();
      expect(res.error.code).toBe('SECURITY_ERROR');
      expect(res.data).toBeNull();
    });

    it('rejects malicious ORDER BY in select without sending network requests', async () => {
      const res = await neonDb.select('clients', {}, { orderBy: 'price; DROP TABLE clients' });
      expect(res.error).toBeDefined();
      expect(res.error.code).toBe('SECURITY_ERROR');
      expect(res.data).toBeNull();
    });
  });
});
