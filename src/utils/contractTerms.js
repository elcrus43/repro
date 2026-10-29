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

export const DEFAULT_CONTRACT_DURATION_MONTHS = 3;

export const CONTRACT_DURATION_OPTIONS = [
    { value: 1, label: '1 месяц' },
    { value: 2, label: '2 месяца' },
    { value: 3, label: '3 месяца (стандарт)' },
    { value: 6, label: '6 месяцев' },
    { value: 12, label: '1 год' }
];

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
    const initialEndDate = calculateContractEndDate(startDate, durationMonths, false);
    // 2) Срок с учетом автоматического продления 1 раз на тот же срок (например 3 + 3 = 6 мес.)
    const maxEndDate = calculateContractEndDate(startDate, durationMonths * 2, false);

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
