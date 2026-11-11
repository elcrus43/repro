/**
 * Утилита для отслеживания сроков действия агентских договоров (АД)
 * с учетом правила: автоматическое продление 1 раз на тот же срок.
 * 
 * Логика жизненного цикла договора:
 * 1. Исполнен (status === 'fulfilled' или завершена сделка):
 *    - Пролонгация не требуется, предупреждения отсутствуют.
 * 2. Основной срок (startDate + durationMonths):
 *    - Статус: «Действующий». Предусмотрено 1 автоматическое продление на тот же срок.
 * 3. Автопродление (от initialEndDate до maxEndDate = startDate + durationMonths * 2):
 *    - Статус: «Действующий» с учетом автоматического продления 1 раз на тот же срок.
 *    - За 14 дней до окончания автопродления: предупреждение о приближении окончания.
 *    - За 7 дней (и менее) до окончания автопродления: срочное напоминание о переподписании АД.
 * 4. Истёк (после maxEndDate):
 *    - Статус: «Истёк». Автопродление исчерпано, требуется обязательное перезаключение.
 */

import { formatPhone, stripPhone } from './format';

export const DEFAULT_CONTRACT_DURATION_MONTHS = 3;

export const CONTRACT_DURATION_OPTIONS = [
    { value: 1, label: '1 месяц' },
    { value: 2, label: '2 месяца' },
    { value: 3, label: '3 месяца (стандарт)' },
    { value: 6, label: '6 месяцев' },
    { value: 12, label: '1 год' }
];

/**
 * Цветовая палитра и стили для типов агентских договоров
 */
export function getContractTypeConfig(type = '') {
    const t = String(type || '').toLowerCase();
    if (t.includes('юсс') && (t.includes('покуп') || t.includes('buyer'))) {
        return { color: '#4f46e5', bg: 'rgba(79, 70, 229, 0.08)', border: 'rgba(79, 70, 229, 0.3)' };
    }
    if (t.includes('юсс') && (t.includes('продаж') || t.includes('seller'))) {
        return { color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.08)', border: 'rgba(124, 58, 237, 0.3)' };
    }
    if (t.includes('покуп') || t.includes('buyer')) {
        return { color: '#0052ff', bg: 'rgba(0, 82, 255, 0.08)', border: 'rgba(0, 82, 255, 0.3)' };
    }
    if (t.includes('продаж') || t.includes('seller')) {
        return { color: '#059669', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.3)' };
    }
    if (t.includes('наймодател') || t.includes('арендодател') || t.includes('landlord') || t.includes('lessor')) {
        return { color: '#d97706', bg: 'rgba(217, 119, 6, 0.08)', border: 'rgba(217, 119, 6, 0.3)' };
    }
    if (t.includes('нанимател') || t.includes('арендатор') || t.includes('tenant') || t.includes('lessee')) {
        return { color: '#0891b2', bg: 'rgba(8, 145, 178, 0.08)', border: 'rgba(8, 145, 178, 0.3)' };
    }
    if (t.includes('доу') || t.includes('3-сторон')) {
        return { color: '#e11d48', bg: 'rgba(225, 29, 72, 0.08)', border: 'rgba(225, 29, 72, 0.3)' };
    }
    return { color: '#059669', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.3)' };
}

/**
 * Вычисляет дату окончания договора.
 * @param {string|Date} startDate - дата заключения
 * @param {number} months - срок в месяцах
 * @param {boolean} isExtended - продлен ли на тот же срок (удваивает срок)
 * @returns {Date}
 */
export function calculateContractEndDate(startDate, months = DEFAULT_CONTRACT_DURATION_MONTHS, isExtended = false) {
    if (!startDate) return null;
    const d = new Date(startDate);
    if (isNaN(d.getTime())) return null;
    const totalMonths = isExtended ? months * 2 : months;
    const result = new Date(d);
    result.setMonth(result.getMonth() + totalMonths);
    return result;
}

/**
 * Форматирует дату в формат ДД.ММ.ГГГГ
 * @param {string|Date} date
 * @returns {string}
 */
export function formatContractDate(date) {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Возвращает полную информацию о сроке действия и статусе договора
 * с учетом автоматического продления 1 раз на тот же срок.
 * 
 * @param {Object} contract - объект договора
 * @param {Date} [referenceDate] - текущая дата для сравнения (по умолчанию new Date())
 * @param {Object} [context] - контекст ({ deals, client })
 * @returns {Object}
 */
export function getContractStatusInfo(contract, referenceDate = new Date(), context = {}) {
    if (!contract) return null;

    const isTerminated = contract.status === 'terminated' || contract.status === 'cancelled' || contract.status === 'closed';
    const durationMonths = Number(contract.duration_months) || DEFAULT_CONTRACT_DURATION_MONTHS;

    let startDate = null;
    if (contract.contract_date) {
        const parsed = new Date(contract.contract_date);
        if (!isNaN(parsed.getTime())) startDate = parsed;
    }

    // Проверка исполнения договора по завершенной сделке
    let isFulfilled = contract.status === 'fulfilled' || contract.status === 'executed' || Boolean(contract.fulfilled_deal_id);
    if (!isFulfilled && context?.deals && Array.isArray(context.deals)) {
        isFulfilled = context.deals.some(d => {
            if (d.status !== 'closed') return false;
            const sIds = d.seller_ids || (d.seller_id ? [d.seller_id] : []);
            const bIds = d.buyer_ids || (d.buyer_id ? [d.buyer_id] : []);
            const isClientInDeal = context.client?.id ? (sIds.includes(context.client.id) || bIds.includes(context.client.id)) : false;
            const isPropMatch = contract.property_id && contract.property_id === d.property_id;
            return isPropMatch || (isClientInDeal && !contract.property_id);
        });
    }

    // 1. ИСПОЛНЕН: сделка завершена — договор исполнен, пролонгация не требуется!
    if (isFulfilled) {
        return {
            isTerminated: false,
            isFulfilled: true,
            durationMonths,
            isExtended: false,
            isAutoExtended: false,
            extensionCount: 0,
            canExtend: false,
            needsRenewal: false,
            isOverdue: false,
            isExpiring: false,
            isUrgentReSign: false,
            statusCategory: 'fulfilled',
            daysLeft: null,
            startDate,
            endDate: null,
            initialEndDate: null,
            maxEndDate: null,
            badge: {
                label: 'Исполнен (сделка закрыта)',
                color: '#059669',
                bg: 'rgba(16, 185, 129, 0.12)',
                border: 'rgba(16, 185, 129, 0.35)'
            },
            warning: null
        };
    }

    // 2. РАСТОРГНУТ / ЗАКРЫТ
    if (isTerminated) {
        return {
            isTerminated: true,
            isFulfilled: false,
            durationMonths,
            isExtended: false,
            isAutoExtended: false,
            extensionCount: 0,
            canExtend: false,
            needsRenewal: false,
            isOverdue: false,
            isExpiring: false,
            isUrgentReSign: false,
            statusCategory: 'terminated',
            daysLeft: null,
            startDate,
            endDate: null,
            initialEndDate: null,
            maxEndDate: null,
            badge: {
                label: 'Расторгнут',
                color: '#64748b',
                bg: 'rgba(100, 116, 139, 0.08)',
                border: 'rgba(100, 116, 139, 0.2)'
            },
            warning: null
        };
    }

    if (!startDate) {
        return {
            isTerminated: false,
            isFulfilled: false,
            durationMonths,
            isExtended: false,
            isAutoExtended: false,
            extensionCount: 0,
            canExtend: false,
            needsRenewal: false,
            isOverdue: false,
            isExpiring: false,
            isUrgentReSign: false,
            statusCategory: 'active',
            daysLeft: null,
            startDate: null,
            endDate: null,
            initialEndDate: null,
            maxEndDate: null,
            badge: {
                label: 'Действует',
                color: '#059669',
                bg: 'rgba(16, 185, 129, 0.08)',
                border: 'rgba(16, 185, 129, 0.25)'
            },
            warning: null
        };
    }

    // Расчет дат:
    // 1) Основной срок (например 3 мес.)
    let initialEndDate = calculateContractEndDate(startDate, durationMonths, false);
    // 2) Срок с учетом автоматического продления 1 раз на тот же срок (например 3 + 3 = 6 мес.)
    let maxEndDate = calculateContractEndDate(startDate, durationMonths * 2, false);

    // Если дата окончания задана вручную (valid_until), учитываем её как точный срок действия
    if (contract.valid_until) {
        const manualEnd = new Date(contract.valid_until);
        if (!isNaN(manualEnd.getTime())) {
            maxEndDate = manualEnd;
            if (manualEnd < initialEndDate) {
                initialEndDate = manualEnd;
            }
        }
    }

    const refDay = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    const initialEndDay = new Date(initialEndDate.getFullYear(), initialEndDate.getMonth(), initialEndDate.getDate());
    const maxEndDay = new Date(maxEndDate.getFullYear(), maxEndDate.getMonth(), maxEndDate.getDate());

    const diffInitialDays = Math.round((initialEndDay.getTime() - refDay.getTime()) / (1000 * 60 * 60 * 24));
    const diffMaxDays = Math.round((maxEndDay.getTime() - refDay.getTime()) / (1000 * 60 * 60 * 24));

    // Проверяем статус с учетом автоматического продления 1 раз на тот же срок:
    // Договор автоматически продлен, если основной срок уже прошел, но срок автопродления еще не исчерпан,
    // либо если явно зафиксирован флаг is_extended.
    const isExplicitlyExtended = Boolean(contract.is_extended || contract.extension_count > 0);
    const inAutoProlongation = diffInitialDays < 0 && diffMaxDays >= 0;
    const isAutoExtended = isExplicitlyExtended || inAutoProlongation;
    const extensionCount = isAutoExtended ? 1 : 0;

    // Итоговая действующая дата окончания договора (с учетом автопродления 1 раз)
    const effectiveEndDate = maxEndDate;
    const daysLeft = diffMaxDays;

    let statusCategory = 'active'; // 'active' | 'expiring' | 'expired'
    let isUrgentReSign = false;
    let isOverdue = false;
    let isExpiring = false;

    // Договор считается просроченным ТОЛЬКО после окончания автопродления!
    if (diffMaxDays < 0) {
        statusCategory = 'expired';
        isOverdue = true;
    } else if (diffMaxDays <= 14) {
        statusCategory = 'expiring';
        isExpiring = true;
        if (diffMaxDays <= 7) {
            isUrgentReSign = true;
        }
    }

    // Продление возможно строго 1 раз на тот же срок:
    // Если договор уже в автопродлении или истек — продление исчерпано (canExtend = false), нужно перезаключение!
    const canExtend = !isAutoExtended && diffInitialDays >= 0;
    const needsRenewal = isOverdue || (isExpiring && isAutoExtended);

    let badge = { label: 'Действует', color: '#059669', bg: 'rgba(16, 185, 129, 0.08)', border: 'rgba(16, 185, 129, 0.25)' };
    let warning = null;

    if (isOverdue) {
        const daysAgo = Math.abs(diffMaxDays);
        badge = {
            label: `Истёк ${daysAgo} дн. назад`,
            color: '#dc2626',
            bg: 'rgba(239, 68, 68, 0.12)',
            border: 'rgba(239, 68, 68, 0.35)'
        };
        warning = `Срок договора с учетом автоматического продления (1 раз на ${durationMonths} мес.) истёк ${daysAgo} дн. назад. Автопродление исчерпано — требуется перезаключение договора!`;
    } else if (isExpiring) {
        if (isUrgentReSign) {
            // Напоминание за 7 дней о необходимости переподписать АД
            const labelText = diffMaxDays === 0 
                ? 'Истекает сегодня! Срочно переподписать АД' 
                : (diffMaxDays === 1 ? 'Остался 1 день! Переподписать АД' : `Осталось ${diffMaxDays} дн.! Переподписать АД`);
            badge = {
                label: labelText,
                color: '#d97706',
                bg: 'rgba(245, 158, 11, 0.14)',
                border: 'rgba(245, 158, 11, 0.4)'
            };
            warning = `🔔 Напоминание (за ${diffMaxDays} дн.): срок действия АД с учетом автопродления подходит к концу! Автопродление уже использовано (1 раз). Срочно необходимо переподписать новый АД!`;
        } else {
            badge = {
                label: `Истекает через ${diffMaxDays} дн.`,
                color: '#d97706',
                bg: 'rgba(245, 158, 11, 0.08)',
                border: 'rgba(245, 158, 11, 0.25)'
            };
            warning = `Срок договора с учетом автопродления истекает через ${diffMaxDays} дн. Автопродление (1 раз) исчерпано. Подготовьте переподписание нового договора.`;
        }
    } else {
        // Действующий договор
        if (isAutoExtended) {
            badge = {
                label: `Действует (автопродлен, еще ${diffMaxDays} дн.)`,
                color: '#059669',
                bg: 'rgba(16, 185, 129, 0.08)',
                border: 'rgba(16, 185, 129, 0.25)'
            };
        } else {
            badge = {
                label: `Действует (еще ${diffMaxDays} дн.)`,
                color: '#059669',
                bg: 'rgba(16, 185, 129, 0.08)',
                border: 'rgba(16, 185, 129, 0.25)'
            };
        }
    }

    return {
        isTerminated: false,
        isFulfilled: false,
        durationMonths,
        isExtended: isAutoExtended,
        isAutoExtended,
        extensionCount,
        canExtend,
        isOverdue,
        isExpiring,
        isUrgentReSign,
        needsRenewal,
        daysLeft: diffMaxDays,
        daysInitialLeft: diffInitialDays,
        startDate,
        endDate: effectiveEndDate,
        initialEndDate,
        maxEndDate,
        statusCategory,
        badge,
        warning
    };
}

/**
 * Проверяет клиента на наличие договоров, требующих внимания.
 * С учетом правила: договор автоматически действует еще 1 срок,
 * поэтому предупреждения выводятся только при приближении к окончанию срока автопродления
 * либо при превышении срока автопродления.
 * 
 * @param {Object} client
 * @param {Date} [referenceDate]
 * @param {Object} [context] - { deals }
 * @returns {Object}
 */
export function getClientContractAlerts(client, referenceDate = new Date(), context = {}) {
    if (!client) return { hasExpired: false, hasExpiring: false, hasUrgentExpiring: false, needsAttention: false, contractsCount: 0, alerts: [] };
    const rawContracts = Array.isArray(client.agency_contracts) ? client.agency_contracts : [];
    const contracts = [...rawContracts];
    if (contracts.length === 0 && (client.has_agency_contract || client.agency_contract_date)) {
        contracts.push({
            id: 'legacy-' + client.id,
            type: 'АД Продажа',
            contract_date: client.agency_contract_date,
            property_id: client.agency_contract_property_id || null,
            status: client.status === 'deal_closed' ? 'fulfilled' : 'active'
        });
    }

    const alerts = [];
    let hasExpired = false;
    let hasExpiring = false;
    let hasUrgentExpiring = false;

    const mergedContext = { ...context, client };

    contracts.forEach(c => {
        const info = getContractStatusInfo(c, referenceDate, mergedContext);
        if (!info || info.isTerminated || info.isFulfilled) return;
        if (info.statusCategory === 'expired') {
            hasExpired = true;
            alerts.push({ contract: c, info, type: 'expired' });
        } else if (info.statusCategory === 'expiring') {
            hasExpiring = true;
            if (info.isUrgentReSign) {
                hasUrgentExpiring = true;
            }
            alerts.push({ contract: c, info, type: info.isUrgentReSign ? 'urgent_expiring' : 'expiring' });
        }
    });

    return {
        hasExpired,
        hasExpiring,
        hasUrgentExpiring,
        needsAttention: hasExpired || hasExpiring,
        contractsCount: contracts.length,
        alerts
    };
}

/**
 * Создает пустой черновик реквизитов клиента для редактора документов.
 */
export function createEmptyClientDraft() {
    return {
        is_legal_entity: false,
        company_name: '',
        inn: '',
        kpp: '',
        ogrn: '',
        legal_address: '',
        authorized_position: 'Генеральный директор',
        authorized_name: '',
        authorized_basis: 'Устава',
        full_name: '',
        phone: '',
        birth_date: '',
        passport_series: '',
        passport_number: '',
        passport_issued_by: '',
        passport_issue_date: '',
        passport_unit_code: '',
        registration_address: '',
        auth_person_birth: '',
        auth_person_series: '',
        auth_person_number: '',
        auth_person_issued_by: '',
        auth_person_issue_date: '',
        auth_person_unit_code: '',
        auth_person_reg_address: '',
    };
}

/**
 * Извлекает объект черновика реквизитов из карточки клиента CRM.
 */
export function extractClientDraft(client, allClients = []) {
    if (!client) return createEmptyClientDraft();
    const p = client.passport_details || {};
    const cd = client.company_details || {};
    const ap = client.authorized_person || {};
    const authPersonId = client.authorized_person_id || ap.client_id;
    const authClient = authPersonId ? allClients.find(c => String(c.id) === String(authPersonId)) : null;
    const apPass = authClient?.passport_details || ap.passport_details || {};
    const isLegal = Boolean(
        client.is_legal_entity ||
        client.client_types?.includes('legal_entity') ||
        cd.inn ||
        cd.ogrn ||
        client.company_name ||
        cd.name ||
        /^(ООО|ОАО|ЗАО|ПАО|АО|МУП|ГУП|НКО|АНО)\b/i.test(client.full_name || '')
    );
    return {
        is_legal_entity: isLegal,
        company_name: client.company_name || cd.name || cd.short_name || (isLegal ? client.full_name : ''),
        inn: client.inn || cd.inn || p.inn || '',
        kpp: client.kpp || cd.kpp || '',
        ogrn: client.ogrn || cd.ogrn || '',
        legal_address: client.legal_address || cd.legal_address || client.reg_address || client.address || '',
        authorized_position: client.authorized_position || ap.position || cd.director_position || 'Генеральный директор',
        authorized_name: client.authorized_name || ap.name || authClient?.full_name || cd.director_name || (!isLegal ? client.full_name : ''),
        authorized_basis: client.authorized_basis || ap.basis_document || 'Устава',
        auth_person_birth: authClient?.birth_date || apPass.birth_date || ap.birth_date || '',
        auth_person_series: apPass.series || ap.series || '',
        auth_person_number: apPass.number || ap.number || '',
        auth_person_issued_by: apPass.issued_by || ap.issued_by || '',
        auth_person_issue_date: apPass.issue_date || ap.issue_date || '',
        auth_person_unit_code: apPass.unit_code || ap.unit_code || '',
        auth_person_reg_address: apPass.registration_address || authClient?.reg_address || authClient?.address || ap.registration_address || '',
        full_name: client.full_name || '',
        phone: formatPhone(client.phone || ap.phone || '', true),
        birth_date: client.birth_date || p.birth_date || '',
        passport_series: p.series || '',
        passport_number: p.number || '',
        passport_issued_by: p.issued_by || '',
        passport_issue_date: p.issue_date || '',
        passport_unit_code: p.unit_code || '',
        registration_address: p.registration_address || client.reg_address || client.address || '',
    };
}

/**
 * Считает количество незаполненных обязательных реквизитов в черновике клиента.
 */
export function countMissingClientDraftFields(draft) {
    if (!draft) return 9;
    if (draft.is_legal_entity) {
        return [
            !draft.company_name?.trim(),
            !draft.inn?.trim(),
            !draft.ogrn?.trim(),
            !draft.legal_address?.trim(),
            !draft.phone?.trim(),
            !draft.authorized_name?.trim(),
            !draft.authorized_position?.trim(),
            !draft.authorized_basis?.trim(),
        ].filter(Boolean).length;
    }
    return [
        !draft.full_name?.trim(),
        !draft.phone?.trim(),
        !draft.birth_date?.trim(),
        !draft.passport_series?.trim(),
        !draft.passport_number?.trim(),
        !draft.passport_issued_by?.trim(),
        !draft.passport_issue_date?.trim(),
        !draft.passport_unit_code?.trim(),
        !draft.registration_address?.trim(),
    ].filter(Boolean).length;
}

/**
 * Объединяет объект клиента (или null для ручного черновика) с данными черновика для предпросмотра.
 */
export function mergeClientWithDraft(client, draft) {
    const d = draft || createEmptyClientDraft();
    const isLegal = Boolean(d.is_legal_entity);
    const cd = {
        name: d.company_name || '',
        short_name: d.company_name || '',
        inn: d.inn || '',
        kpp: d.kpp || '',
        ogrn: d.ogrn || '',
        legal_address: d.legal_address || '',
        director_name: d.authorized_name || '',
        director_position: d.authorized_position || 'Генеральный директор',
    };
    const ap = {
        name: d.authorized_name || '',
        position: d.authorized_position || 'Генеральный директор',
        basis_document: d.authorized_basis || 'Устава',
        phone: d.phone || '',
    };

    if (!client) {
        const hasDraft = isLegal
            ? Boolean(d.company_name?.trim() || d.inn?.trim() || d.authorized_name?.trim())
            : Boolean(
                d.full_name?.trim() ||
                d.phone?.trim() ||
                d.passport_series?.trim() ||
                d.passport_number?.trim() ||
                d.registration_address?.trim()
            );
        if (!hasDraft) return null;
        return {
            id: 'draft_manual_client',
            is_legal_entity: isLegal,
            client_types: isLegal ? ['legal_entity'] : ['buyer'],
            company_name: d.company_name || '',
            inn: d.inn || '',
            kpp: d.kpp || '',
            ogrn: d.ogrn || '',
            legal_address: d.legal_address || '',
            authorized_position: d.authorized_position || 'Генеральный директор',
            authorized_name: d.authorized_name || '',
            authorized_basis: d.authorized_basis || 'Устава',
            company_details: cd,
            authorized_person: ap,
            full_name: isLegal ? (d.company_name || 'Юридическое лицо') : (d.full_name || ''),
            phone: d.phone || '',
            birth_date: d.birth_date || '',
            reg_address: isLegal ? (d.legal_address || '') : (d.registration_address || ''),
            passport_details: {
                series: d.passport_series || '',
                number: d.passport_number || '',
                issued_by: d.passport_issued_by || '',
                issue_date: d.passport_issue_date || '',
                unit_code: d.passport_unit_code || '',
                registration_address: isLegal ? (d.legal_address || '') : (d.registration_address || ''),
                birth_date: d.birth_date || '',
            }
        };
    }

    return {
        ...client,
        is_legal_entity: isLegal,
        client_types: isLegal
            ? Array.from(new Set([...(client.client_types || []), 'legal_entity']))
            : (client.client_types || []).filter(t => t !== 'legal_entity'),
        company_name: d.company_name || '',
        inn: d.inn || client.inn || '',
        kpp: d.kpp || '',
        ogrn: d.ogrn || '',
        legal_address: d.legal_address || '',
        authorized_position: d.authorized_position || 'Генеральный директор',
        authorized_name: d.authorized_name || '',
        authorized_basis: d.authorized_basis || 'Устава',
        company_details: {
            ...(client.company_details || {}),
            ...cd,
        },
        authorized_person: {
            ...(client.authorized_person || {}),
            ...ap,
        },
        full_name: isLegal ? (d.company_name || client.full_name) : (d.full_name || client.full_name),
        phone: d.phone || client.phone,
        birth_date: isLegal ? '' : (d.birth_date || client.birth_date),
        reg_address: isLegal ? (d.legal_address || client.reg_address) : (d.registration_address || client.reg_address),
        passport_details: {
            ...(client.passport_details || {}),
            series: d.passport_series,
            number: d.passport_number,
            issued_by: d.passport_issued_by,
            issue_date: d.passport_issue_date,
            unit_code: d.passport_unit_code,
            registration_address: isLegal ? (d.legal_address || '') : d.registration_address,
            birth_date: isLegal ? '' : d.birth_date,
        }
    };
}

/**
 * Применяет черновик реквизитов и обновляет/добавляет агентский договор в карточке клиента.
 */
export function applyDraftAndContractToClient(client, draft, contractParams = {}) {
    const isLegal = Boolean(draft.is_legal_entity);
    const series = draft.passport_series?.trim() || '';
    const number = draft.passport_number?.trim() || '';
    const passportStr = (series && number) ? `${series} ${number}` : (series || number || client.passport || '');
    const birthDateStr = isLegal ? '' : (draft.birth_date?.trim() || client.birth_date || '');
    const regAddressStr = isLegal ? (draft.legal_address?.trim() || '') : (draft.registration_address?.trim() || client.reg_address || '');
    const innStr = draft.inn?.trim() || client.inn || client.passport_details?.inn || '';

    const cd = {
        ...(client.company_details || {}),
        name: draft.company_name?.trim() || client.company_details?.name || '',
        short_name: draft.company_name?.trim() || client.company_details?.short_name || '',
        inn: innStr,
        kpp: draft.kpp?.trim() || '',
        ogrn: draft.ogrn?.trim() || '',
        legal_address: draft.legal_address?.trim() || '',
        director_name: draft.authorized_name?.trim() || '',
        director_position: draft.authorized_position?.trim() || 'Генеральный директор',
    };

    const ap = {
        ...(client.authorized_person || {}),
        name: draft.authorized_name?.trim() || '',
        position: draft.authorized_position?.trim() || 'Генеральный директор',
        basis_document: draft.authorized_basis?.trim() || 'Устава',
        phone: stripPhone(draft.phone) || draft.phone?.trim() || '',
    };

    const clientTypes = isLegal
        ? Array.from(new Set([...(client.client_types || []), 'legal_entity']))
        : (client.client_types || []).filter(t => t !== 'legal_entity');

    const {
        selectedContractId = '',
        groupId = null,
        coClientIds = null,
        propertyId = null,
        cleanComm = 0,
        validUntilIso = null,
        contractStatus = 'active',
        contractType = 'АД ЮСС Продажа',
    } = contractParams;

    const existingContracts = Array.isArray(client.agency_contracts) ? [...client.agency_contracts] : [];
    let matchIdx = -1;
    if (selectedContractId) {
        matchIdx = existingContracts.findIndex(c => c.id === selectedContractId);
    }
    if (matchIdx < 0 && groupId) {
        matchIdx = existingContracts.findIndex(c => c.group_id === groupId);
    }
    if (matchIdx < 0 && propertyId) {
        matchIdx = existingContracts.findIndex(c => String(c.property_id) === String(propertyId) && !selectedContractId);
    }

    const normalizedCoIds = Array.isArray(coClientIds) && coClientIds.length > 1 ? coClientIds : undefined;
    const nowIso = new Date().toISOString();
    let updatedContracts;

    if (matchIdx >= 0) {
        updatedContracts = existingContracts.map((c, i) => {
            if (i !== matchIdx) return c;
            const next = {
                ...c,
                commission: cleanComm > 0 ? cleanComm : c.commission,
                valid_until: validUntilIso || c.valid_until,
                status: contractStatus,
                property_id: propertyId || c.property_id || null,
                updated_at: nowIso,
            };
            if (groupId) next.group_id = groupId;
            if (normalizedCoIds) next.co_client_ids = normalizedCoIds;
            else delete next.co_client_ids;
            return next;
        });
    } else if (existingContracts.length > 0 && !selectedContractId && !groupId && !propertyId) {
        updatedContracts = existingContracts.map((c, i) => {
            if (i !== 0) return c;
            return {
                ...c,
                commission: cleanComm > 0 ? cleanComm : c.commission,
                valid_until: validUntilIso || c.valid_until,
                status: contractStatus,
                property_id: propertyId || c.property_id || null,
                updated_at: nowIso,
            };
        });
    } else {
        const newContract = {
            id: `contract_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            type: contractType,
            contract_date: nowIso.split('T')[0],
            valid_until: validUntilIso,
            commission: cleanComm > 0 ? cleanComm : null,
            status: contractStatus,
            property_id: propertyId || null,
            created_at: nowIso,
            ...(groupId ? { group_id: groupId } : {}),
            ...(normalizedCoIds ? { co_client_ids: normalizedCoIds } : {}),
        };
        updatedContracts = [newContract, ...existingContracts];
    }

    const activeContractsList = updatedContracts.filter(c => c && !['terminated', 'cancelled', 'closed', 'fulfilled', 'executed'].includes(c.status));
    const primaryContract = activeContractsList[0] || updatedContracts[0];

    return {
        ...client,
        is_legal_entity: isLegal,
        company_name: isLegal ? (draft.company_name?.trim() || client.company_name) : (client.company_name || ''),
        inn: innStr,
        kpp: draft.kpp?.trim() || '',
        ogrn: draft.ogrn?.trim() || '',
        legal_address: draft.legal_address?.trim() || '',
        authorized_position: draft.authorized_position?.trim() || '',
        authorized_name: draft.authorized_name?.trim() || '',
        authorized_basis: draft.authorized_basis?.trim() || '',
        company_details: cd,
        authorized_person: ap,
        client_types: clientTypes,
        full_name: isLegal
            ? (draft.company_name?.trim() || client.full_name)
            : (draft.full_name?.trim() || client.full_name),
        phone: stripPhone(draft.phone) || draft.phone?.trim() || client.phone,
        birth_date: birthDateStr,
        reg_address: regAddressStr,
        passport: isLegal ? '' : passportStr,
        agency_contracts: updatedContracts,
        has_agency_contract: activeContractsList.length > 0,
        agency_contract_date: primaryContract ? primaryContract.contract_date : client.agency_contract_date,
        agency_contract_property_id: primaryContract ? primaryContract.property_id : client.agency_contract_property_id,
        passport_details: {
            ...(client.passport_details || {}),
            series: isLegal ? '' : series,
            number: isLegal ? '' : number,
            issued_by: isLegal ? '' : (draft.passport_issued_by?.trim() || ''),
            issue_date: isLegal ? '' : (draft.passport_issue_date?.trim() || ''),
            unit_code: isLegal ? '' : (draft.passport_unit_code?.trim() || ''),
            registration_address: regAddressStr,
            birth_date: birthDateStr,
            inn: innStr,
        },
        updated_at: nowIso,
    };
}
