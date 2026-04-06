/**
 * TypeScript типы для модуля matching.
 *
 * Используй JSDoc с @typedef для type-safe в JS файлах без TS компиляции.
 * VSCode будет подсказывать типы и ловить ошибки.
 */

/**
 * @typedef {Object} Property
 * @property {string} id
 * @property {string} realtor_id
 * @property {string} [client_id]
 * @property {string} status
 * @property {string} property_type
 * @property {string} market_type
 * @property {string} city
 * @property {string} district
 * @property {string} [microdistrict]
 * @property {string} [address]
 * @property {number} [price]
 * @property {number} [price_min]
 * @property {number} [rooms]
 * @property {number} [area_total]
 * @property {number} [area_living]
 * @property {number} [area_kitchen]
 * @property {number} [floor]
 * @property {number} [floors_total]
 * @property {string} [building_type]
 * @property {number} [year_built]
 * @property {string} [renovation]
 * @property {string} [bathroom]
 * @property {string} [balcony]
 * @property {string} [parking]
 * @property {boolean} [furniture]
 * @property {boolean} [mortgage_available]
 * @property {boolean} [matcapital_available]
 * @property {boolean} [encumbrance]
 * @property {boolean} [minor_owners]
 * @property {string} [sale_type]
 * @property {boolean} [docs_ready]
 * @property {string} [ownership_type]
 * @property {string} [urgency]
 * @property {string} [description]
 * @property {string} [notes]
 * @property {string} deal_type
 * @property {number} [commission]
 * @property {number} [commission_buyer]
 * @property {number} [surcharge]
 * @property {string} [contract_end_date]
 * @property {Array} [deal_expenses]
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} Request
 * @property {string} id
 * @property {string} realtor_id
 * @property {string} [client_id]
 * @property {string} [parent_property_id]
 * @property {string} status
 * @property {string[]} [property_types]
 * @property {string[]} [market_types]
 * @property {string} city
 * @property {string[]} [districts]
 * @property {string[]} [microdistricts]
 * @property {number} [budget_min]
 * @property {number} [budget_max]
 * @property {number[]} [rooms]
 * @property {number} [area_min]
 * @property {number} [area_max]
 * @property {number} [kitchen_area_min]
 * @property {number} [floor_min]
 * @property {number} [floor_max]
 * @property {boolean} [not_first_floor]
 * @property {boolean} [not_last_floor]
 * @property {string[]} [building_types]
 * @property {string} [renovation_min]
 * @property {boolean} [balcony_required]
 * @property {boolean} [parking_required]
 * @property {string[]} [payment_types]
 * @property {boolean} [mortgage_approved]
 * @property {string} [mortgage_bank]
 * @property {number} [mortgage_amount]
 * @property {string} [urgency]
 * @property {string} [desired_move_date]
 * @property {string} [must_have_notes]
 * @property {string} [nice_to_have_notes]
 * @property {string} [deal_breakers]
 * @property {number} [commission]
 * @property {Array} [deal_expenses]
 * @property {string} created_at
 * @property {string} updated_at
 */

/**
 * @typedef {Object} MatchResult
 * @property {number} score - 0-100
 * @property {'perfect'|'good'|'possible'} match_level
 * @property {string[]} matched_params
 * @property {string[]} mismatched_params
 */

/**
 * @typedef {Object} MatchWithIds
 * @property {string} property_id
 * @property {string} request_id
 * @property {number} score
 * @property {'perfect'|'good'|'possible'} match_level
 * @property {string[]} matched_params
 * @property {string[]} mismatched_params
 */

/**
 * Рассчитывает score соответствия объекта запросу.
 * @param {Property} property
 * @param {Request} request
 * @returns {MatchResult | null} - null если не проходит обязательные фильты
 */
export function calculateMatch(property, request) {}

/**
 * Запускает matching для одного объекта против всех запросов.
 * @param {Property} property
 * @param {Request[]} requests
 * @returns {MatchWithIds[]}
 */
export function runMatchingForProperty(property, requests) {}

/**
 * Запускает matching для одного запроса против всех объектов.
 * @param {Request} request
 * @param {Property[]} properties
 * @returns {MatchWithIds[]}
 */
export function runMatchingForRequest(request, properties) {}

/**
 * @param {'perfect'|'good'|'possible'} level
 * @returns {{ label: string, cls: string }}
 */
export function getLevelLabel(level) {}

/**
 * Форматирует цену для отображения.
 * @param {number} n
 * @returns {string}
 */
export function formatPrice(n) {}

/**
 * Очищает строку цены до числа.
 * @param {string|number} val
 * @returns {number | null}
 */
export function cleanPrice(val) {}

/**
 * Форматирует дату.
 * @param {string|Date} dt
 * @returns {string}
 */
export function formatDate(dt) {}

/**
 * Форматирует дату и время.
 * @param {string|Date} dt
 * @returns {string}
 */
export function formatDateTime(dt) {}
