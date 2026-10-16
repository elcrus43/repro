import { formatPhone } from '../../utils/format';
import { formatPropertyKind, numberToWordsRu } from '../../utils/docxGenerator';

export function toShortName(fullName) {
    if (!fullName) return '____________________';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]} ${parts[1][0]}.`;
    return `${parts[0]} ${parts[1][0]}.${parts[2][0]}.`;
}

/**
 * Собирает словарь актуальных значений для всех динамических полей договора.
 */
export function buildSlotValues(data, template) {
    if (!data) return {};
    const { seller, buyer, property, realtor, agencyName, deal } = data;

    function f(val, fb = '') {
        if (val === null || val === undefined || val === '') return fb;
        return String(val);
    }
    function fDate(d) {
        if (!d) return '';
        const dt = new Date(d);
        if (isNaN(dt.getTime())) return '';
        return dt.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    function fPrice(p) {
        if (!p && p !== 0) return '';
        const n = Number(String(p).replace(/\D/g, ''));
        return isNaN(n) ? String(p) : n.toLocaleString('ru-RU') + ' ₽';
    }

    const realtorName = f(realtor?.full_name);
    const agency = f(agencyName || realtor?.agency_name);
    const sellerName = f(seller?.full_name);
    const buyerName = f(buyer?.full_name);
    const address = f(property?.address || property?.city);
    const area = property?.area_total ? `${property.area_total} кв.м.` : '';
    const price = fPrice(deal?.price || property?.price);
    const dealDate = fDate(deal?.deal_date);
    const today = fDate(deal?.deal_date || new Date().toISOString());

    const isAgencySale = template === 'agency_sale_1' || template === 'agency_rent_landlord_1';
    const principal = isAgencySale ? (seller || buyer) : (buyer || seller);
    const pDetails = principal?.passport_details || {};
    const principalName = f(principal?.full_name);
    const principalBirth = principal?.birth_date ? fDate(principal.birth_date) : (pDetails.birth_date ? fDate(pDetails.birth_date) : '');
    const principalSeries = f(pDetails.series);
    const principalNumber = f(pDetails.number);
    const principalIssuedBy = f(pDetails.issued_by);
    const principalIssueDate = pDetails.issue_date ? fDate(pDetails.issue_date) : '';
    const principalUnitCode = f(pDetails.unit_code);
    const principalRegAddress = f(pDetails.registration_address || principal?.reg_address || principal?.address);
    const principalPhone = f(formatPhone(principal?.phone) || principal?.phone);
    const principalShort = toShortName(principalName);

    const propKind = formatPropertyKind(property);
    const propAddress = f(property?.address || property?.city);
    const propCadastral = f(property?.cadastral_number);
    const propArea = property?.area_total ? `${property.area_total} кв.м.` : '';

    const rawPrice = deal?.price || property?.price;
    const cleanPriceNum = rawPrice ? Number(String(rawPrice).replace(/\D/g, '')) : 0;
    const priceFormatted = cleanPriceNum > 0 ? cleanPriceNum.toLocaleString('ru-RU') : '';
    const priceWords = cleanPriceNum > 0 ? `(${numberToWordsRu(cleanPriceNum)})` : '';

    const rawCommission = deal?.commission || property?.commission;
    const cleanComm = rawCommission ? Number(String(rawCommission).replace(/\D/g, '')) : 0;
    const commFormatted = cleanComm > 0 ? cleanComm.toLocaleString('ru-RU') : '';
    const commWords = cleanComm > 0 ? `(${numberToWordsRu(cleanComm)})` : '';
    const rawEndDate = data.contractEndDate || deal?.contract_end_date;
    const contractEndDate = rawEndDate ? fDate(rawEndDate) : '';

    return {
        contract_date: today,
        principal_name: principalName,
        principal_birth: principalBirth,
        principal_series: principalSeries,
        principal_number: principalNumber,
        principal_issued_by: principalIssuedBy,
        principal_issue_date: principalIssueDate,
        principal_unit_code: principalUnitCode,
        principal_reg_address: principalRegAddress,
        principal_phone: principalPhone,
        principal_short: principalShort,
        prop_kind: propKind,
        prop_address: propAddress,
        prop_cadastral: propCadastral,
        prop_area: propArea,
        price_formatted: priceFormatted,
        price_words: priceWords,
        comm_formatted: commFormatted,
        comm_words: commWords,
        contract_end_date: contractEndDate,
        seller_name: sellerName,
        buyer_name: buyerName,
        realtor_name: realtorName,
        agency_name: agency,
        address: address,
        area: area,
        price: price,
        deal_date: dealDate,
    };
}

/**
 * Подставляет актуальные данные в сохраненный HTML-шаблон.
 * Автоматически распознает слоты как по data-slot-id, так и по data-input-id / title / label
 * для обеспечения обратной совместимости с ранее сохраненными шаблонами.
 */
export function injectDataIntoTemplateHtml(html, slotValues, highlight = true, isEditing = false) {
    if (!html || typeof html !== 'string') return '';
    try {
        if (typeof DOMParser === 'undefined') return html;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const slots = doc.querySelectorAll('[data-slot-id], .doc-slot, [data-input-id]');

        slots.forEach(el => {
            let slotId = el.getAttribute('data-slot-id');
            const inputId = el.getAttribute('data-input-id') || '';
            const title = el.getAttribute('title') || '';
            const label = el.getAttribute('data-label') || '';
            const fallback = el.getAttribute('data-fallback') || '';

            // Распознаем slotId, если он не был явно задан (шаблоны из предыдущих сохранений)
            if (!slotId) {
                if (inputId === 'doc-input-full-name' || title.includes('ФИО') || label.includes('ФИО')) slotId = 'principal_name';
                else if (inputId === 'doc-input-phone' || title.includes('Телефон') || label.includes('Телефон')) slotId = 'principal_phone';
                else if (inputId === 'doc-input-birth-date' || title.includes('рождения')) slotId = 'principal_birth';
                else if (inputId === 'doc-input-series' || title.includes('Серия')) slotId = 'principal_series';
                else if (inputId === 'doc-input-number' || title.includes('Номер паспорта')) slotId = 'principal_number';
                else if (inputId === 'doc-input-issued-by' || title.includes('Кем выдан')) slotId = 'principal_issued_by';
                else if (inputId === 'doc-input-issue-date' || title.includes('Дата выдачи')) slotId = 'principal_issue_date';
                else if (inputId === 'doc-input-unit-code' || title.includes('подразделения')) slotId = 'principal_unit_code';
                else if (inputId === 'doc-input-reg-address' || title.includes('регистрации')) slotId = 'principal_reg_address';
                else if (inputId === 'doc-input-prop-kind' || title.includes('Вид объекта')) slotId = 'prop_kind';
                else if (inputId === 'doc-input-prop-address' || title.includes('Адрес объекта')) slotId = 'prop_address';
                else if (inputId === 'doc-input-prop-cadastral' || title.includes('Кадастровый')) slotId = 'prop_cadastral';
                else if (inputId === 'doc-input-prop-area' || title.includes('Площадь')) slotId = 'prop_area';
                else if (inputId === 'doc-input-prop-price') {
                    slotId = (label.includes('прописью') || title.includes('прописью')) ? 'price_words' : 'price_formatted';
                }
                else if (inputId === 'doc-input-commission') {
                    slotId = (label.includes('прописью') || title.includes('прописью')) ? 'comm_words' : 'comm_formatted';
                }
                else if (inputId === 'doc-input-contract-end-date' || title.includes('Срок')) slotId = 'contract_end_date';
                else if (title.includes('Дата договора') || label.includes('Дата договора')) slotId = 'contract_date';
                else if (title.includes('Покупатель') || label.includes('Покупатель')) slotId = 'buyer_name';
                else if (title.includes('Продавец') || label.includes('Продавец') || title.includes('Наймодатель')) slotId = 'seller_name';
                else if (title.includes('Наниматель') || label.includes('Наниматель')) slotId = 'buyer_name';
            }

            if (slotId && slotValues[slotId] !== undefined) {
                const val = slotValues[slotId];
                const hasVal = Boolean(val && String(val).trim());
                const displayVal = hasVal ? String(val) : (fallback || `[● Заполнить: ${label || slotId}]`);

                el.textContent = displayVal;
                el.setAttribute('data-slot-id', slotId);

                if (highlight && !isEditing) {
                    if (hasVal) {
                        el.className = 'doc-slot doc-slot-filled';
                        el.style.backgroundColor = 'rgba(0, 102, 255, 0.08)';
                        el.style.color = '#0052cc';
                        el.style.fontWeight = '600';
                        el.style.padding = '1px 6px';
                        el.style.borderRadius = '4px';
                        el.style.borderBottom = '2px solid #0066ff';
                        el.style.margin = '0 2px';
                    } else {
                        el.className = 'doc-slot doc-slot-empty';
                        el.style.backgroundColor = 'rgba(245, 158, 11, 0.14)';
                        el.style.color = '#b45309';
                        el.style.fontWeight = '600';
                        el.style.padding = '2px 8px';
                        el.style.borderRadius = '4px';
                        el.style.border = '1.5px dashed #f59e0b';
                        el.style.margin = '0 2px';
                    }
                } else {
                    el.className = 'doc-slot';
                    el.style.backgroundColor = 'transparent';
                    el.style.color = 'inherit';
                    el.style.border = 'none';
                    el.style.borderBottom = 'none';
                    el.style.padding = '0';
                    el.style.margin = '0';
                    el.style.fontWeight = hasVal ? 'normal' : '600';
                }
            }
        });

        return doc.body.innerHTML;
    } catch (e) {
        console.error('Failed to inject data into template HTML:', e);
        return html;
    }
}

/**
 * Очищает персональные данные клиента перед сохранением шаблона,
 * превращая значения слотов обратно в плейсхолдеры.
 */
export function sanitizeTemplateForSaving(domElement) {
    if (!domElement) return '';
    const clone = domElement.cloneNode(true);
    const slots = clone.querySelectorAll('[data-slot-id], .doc-slot, [data-input-id]');
    
    slots.forEach(el => {
        let slotId = el.getAttribute('data-slot-id');
        const inputId = el.getAttribute('data-input-id') || '';
        const title = el.getAttribute('title') || '';
        const label = el.getAttribute('data-label') || '';
        const fallback = el.getAttribute('data-fallback') || '';

        if (!slotId) {
            if (inputId === 'doc-input-full-name' || title.includes('ФИО') || label.includes('ФИО')) slotId = 'principal_name';
            else if (inputId === 'doc-input-phone' || title.includes('Телефон') || label.includes('Телефон')) slotId = 'principal_phone';
            else if (inputId === 'doc-input-birth-date' || title.includes('рождения')) slotId = 'principal_birth';
            else if (inputId === 'doc-input-series' || title.includes('Серия')) slotId = 'principal_series';
            else if (inputId === 'doc-input-number' || title.includes('Номер паспорта')) slotId = 'principal_number';
            else if (inputId === 'doc-input-issued-by' || title.includes('Кем выдан')) slotId = 'principal_issued_by';
            else if (inputId === 'doc-input-issue-date' || title.includes('Дата выдачи')) slotId = 'principal_issue_date';
            else if (inputId === 'doc-input-unit-code' || title.includes('подразделения')) slotId = 'principal_unit_code';
            else if (inputId === 'doc-input-reg-address' || title.includes('регистрации')) slotId = 'principal_reg_address';
            else if (inputId === 'doc-input-prop-kind' || title.includes('Вид объекта')) slotId = 'prop_kind';
            else if (inputId === 'doc-input-prop-address' || title.includes('Адрес объекта')) slotId = 'prop_address';
            else if (inputId === 'doc-input-prop-cadastral' || title.includes('Кадастровый')) slotId = 'prop_cadastral';
            else if (inputId === 'doc-input-prop-area' || title.includes('Площадь')) slotId = 'prop_area';
            else if (inputId === 'doc-input-prop-price') {
                slotId = (label.includes('прописью') || title.includes('прописью')) ? 'price_words' : 'price_formatted';
            }
            else if (inputId === 'doc-input-commission') {
                slotId = (label.includes('прописью') || title.includes('прописью')) ? 'comm_words' : 'comm_formatted';
            }
            else if (inputId === 'doc-input-contract-end-date' || title.includes('Срок')) slotId = 'contract_end_date';
            else if (title.includes('Дата договора') || label.includes('Дата договора')) slotId = 'contract_date';
            else if (title.includes('Покупатель') || label.includes('Покупатель')) slotId = 'buyer_name';
            else if (title.includes('Продавец') || label.includes('Продавец') || title.includes('Наймодатель')) slotId = 'seller_name';
            else if (title.includes('Наниматель') || label.includes('Наниматель')) slotId = 'buyer_name';
        }

        if (slotId) {
            el.setAttribute('data-slot-id', slotId);
        }
        el.textContent = fallback || `[● Заполнить: ${label || slotId || 'Поле'}]`;
        el.className = 'doc-slot doc-slot-placeholder';
        el.style.backgroundColor = '';
        el.style.color = '';
        el.style.border = '';
        el.style.borderBottom = '';
        el.style.padding = '';
        el.style.margin = '';
    });

    return clone.innerHTML;
}
