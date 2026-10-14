import { stripPhone } from './format';

/**
 * Finds potential duplicate clients by phone number and name.
 * 
 * @param {Array} clients - Array of client objects from state
 * @param {Object} input - { full_name, phone }
 * @returns {Object} { phoneMatches: Array, nameMatches: Array }
 */
export function findDuplicateClients(clients = [], { full_name = '', phone = '', phones = [] } = {}) {
    const rawPhones = [phone, ...(Array.isArray(phones) ? phones : [])].filter(Boolean);
    const cleanPhones = rawPhones.map(p => stripPhone(p)).filter(p => p && p.length >= 6);
    const cleanName = (full_name || '').trim().toLowerCase();
    
    if (cleanPhones.length === 0 && cleanName.length < 3) {
        return { phoneMatches: [], nameMatches: [] };
    }

    const phoneMatches = [];
    const nameMatches = [];

    clients.forEach(c => {
        if (!c) return;
        
        // 1. Check Phone
        if (cleanPhones.length > 0) {
            const mainPhone = stripPhone(c.phone);
            const altPhones = (c.phones || []).map(p => stripPhone(p));
            const extraPhones = (c.additional_contacts || []).map(ac => stripPhone(ac.phone));
            const allTargetPhones = [mainPhone, ...altPhones, ...extraPhones].filter(Boolean);

            const hasPhoneMatch = cleanPhones.some(cp => allTargetPhones.includes(cp));
            if (hasPhoneMatch) {
                phoneMatches.push(c);
                return; // Avoid duplicating in nameMatches
            }
        }

        // 2. Check Name
        if (cleanName && cleanName.length >= 3) {
            const targetName = (c.full_name || '').trim().toLowerCase();
            if (targetName) {
                if (targetName === cleanName || targetName.includes(cleanName) || cleanName.includes(targetName)) {
                    nameMatches.push(c);
                }
            }
        }
    });

    return { phoneMatches, nameMatches };
}
