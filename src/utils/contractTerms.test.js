import { describe, it, expect } from 'vitest';
import {
    getContractStatusInfo,
    getClientContractAlerts,
    applyDraftAndContractToClient
} from './contractTerms';

describe('contractTerms - Contract renewal, archive and alert suppression', () => {
    it('correctly marks closed and renewed contracts in getContractStatusInfo', () => {
        const closedContract = {
            id: 'c-1',
            status: 'closed',
            contract_date: '2026-01-01',
            duration_months: 3
        };
        const closedInfo = getContractStatusInfo(closedContract);
        expect(closedInfo.isTerminated).toBe(true);
        expect(closedInfo.statusCategory).toBe('closed');
        expect(closedInfo.badge.label).toBe('Закрыт');

        const renewedContract = {
            id: 'c-2',
            status: 'closed',
            closed_reason: 'renewed',
            contract_date: '2026-01-01',
            duration_months: 3
        };
        const renewedInfo = getContractStatusInfo(renewedContract);
        expect(renewedInfo.isTerminated).toBe(true);
        expect(renewedInfo.statusCategory).toBe('closed');
        expect(renewedInfo.badge.label).toBe('Перезаключен (архив)');
    });

    it('suppresses alerts for closed or archived contracts in getClientContractAlerts', () => {
        const expiredDate = '2025-01-01'; // clearly expired relative to 2026-11-24
        const clientWithExpired = {
            id: 'client-1',
            agency_contracts: [
                {
                    id: 'c-expired',
                    status: 'active',
                    contract_date: expiredDate,
                    duration_months: 3,
                    is_extended: true
                }
            ]
        };

        const activeAlerts = getClientContractAlerts(clientWithExpired, new Date('2026-11-24'));
        expect(activeAlerts.hasExpired).toBe(true);
        expect(activeAlerts.needsAttention).toBe(true);
        expect(activeAlerts.alerts.length).toBe(1);

        // When contract is closed in archive (e.g. after renewal)
        const clientWithClosed = {
            id: 'client-1',
            agency_contracts: [
                {
                    id: 'c-new',
                    status: 'active',
                    contract_date: '2026-11-24',
                    duration_months: 3,
                    is_extended: false
                },
                {
                    id: 'c-expired',
                    status: 'closed',
                    closed_reason: 'renewed',
                    closed_at: '2026-11-24T09:00:00.000Z',
                    contract_date: expiredDate,
                    duration_months: 3
                }
            ]
        };

        const renewedAlerts = getClientContractAlerts(clientWithClosed, new Date('2026-11-24'));
        expect(renewedAlerts.hasExpired).toBe(false);
        expect(renewedAlerts.hasExpiring).toBe(false);
        expect(renewedAlerts.needsAttention).toBe(false);
        expect(renewedAlerts.alerts.length).toBe(0);
    });

    it('applyDraftAndContractToClient archives the old contract when renewingContractId is provided', () => {
        const client = {
            id: 'client-1',
            full_name: 'Иван Иванов',
            agency_contracts: [
                {
                    id: 'c-old',
                    status: 'active',
                    contract_date: '2026-01-01',
                    duration_months: 3,
                    comment: 'Первоначальный договор'
                }
            ]
        };

        const draft = {
            full_name: 'Иван Иванов',
            phone: '+7 900 123-45-67'
        };

        const updated = applyDraftAndContractToClient(client, draft, {
            renewingContractId: 'c-old',
            contractType: 'АД ЮСС Продажа',
            validUntilIso: '2027-02-24T00:00:00.000Z',
            contractStatus: 'active'
        });

        expect(updated.agency_contracts.length).toBe(2);

        const oldContract = updated.agency_contracts.find(c => c.id === 'c-old');
        expect(oldContract.status).toBe('closed');
        expect(oldContract.closed_reason).toBe('renewed');
        expect(oldContract.closed_at).toBeDefined();

        const newContract = updated.agency_contracts.find(c => c.id !== 'c-old');
        expect(newContract.status).toBe('active');
        expect(newContract.renewed_from_id).toBe('c-old');
        expect(updated.has_agency_contract).toBe(true);
    });
});
