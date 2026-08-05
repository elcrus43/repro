import { describe, it, expect } from 'vitest';
import { findDuplicateClients } from './clientDuplicate';

describe('findDuplicateClients', () => {
    const clients = [
        { id: '1', full_name: 'Иванов Иван', phone: '+7 999 123 45 67', client_types: ['seller'] },
        { id: '2', full_name: 'Петров Петр', phone: '8 (999) 765-43-21', client_types: ['buyer'] },
        { id: '3', full_name: 'Сидоров Сергей', phone: '79001112233', phones: ['+7 999 123 45 67'] }
    ];

    it('finds exact phone matches', () => {
        const result = findDuplicateClients(clients, { phone: '89991234567' });
        expect(result.phoneMatches).toHaveLength(2);
        expect(result.phoneMatches.map(c => c.id)).toContain('1');
        expect(result.phoneMatches.map(c => c.id)).toContain('3');
    });

    it('finds name matches', () => {
        const result = findDuplicateClients(clients, { full_name: 'Иванов' });
        expect(result.nameMatches).toHaveLength(1);
        expect(result.nameMatches[0].id).toBe('1');
    });

    it('returns empty when input is too short', () => {
        const result = findDuplicateClients(clients, { full_name: 'Ив', phone: '12' });
        expect(result.phoneMatches).toHaveLength(0);
        expect(result.nameMatches).toHaveLength(0);
    });
});
