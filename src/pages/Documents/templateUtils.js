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

    // Данные организации (Юрлицо) для принципала
    const pCompany = principal?.company_details || {};
    const pAuth = principal?.authorized_person || {};
    const isLegalEntity = Boolean(
        data.isLegalEntity ||
        principal?.is_legal_entity ||
        principal?.client_types?.includes('legal_entity') ||
        principal?.company_name ||
        pCompany.name ||
        pCompany.inn ||
        pCompany.ogrn
    );
    const companyName = f(principal?.company_name || pCompany.name || pCompany.short_name || (isLegalEntity ? principal?.full_name : ''));
    const companyInn = f(principal?.inn || pCompany.inn);
    const companyKpp = f(principal?.kpp || pCompany.kpp);
    const companyOgrn = f(principal?.ogrn || pCompany.ogrn);
    const companyLegalAddress = f(principal?.legal_address || pCompany.legal_address || principal?.reg_address || principal?.address);
    const authPosition = f(principal?.authorized_position || pAuth.position || pCompany.director_position || 'Генеральный директор');
    const authName = f(principal?.authorized_name || pAuth.name || pCompany.director_name || (!isLegalEntity ? principal?.full_name : ''));
    const authBasis = f(principal?.authorized_basis || pAuth.basis_document || 'Устава');
    const authShort = toShortName(authName);

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

    // Данные риэлтора (Исполнитель 2 — самозанятый)
    const rDetails = realtor?.passport_details || {};
    const realtorInn = f(realtor?.inn);
    const realtorBirth = realtor?.birth_date ? fDate(realtor.birth_date) : (rDetails.birth_date ? fDate(rDetails.birth_date) : '');
    const realtorSeries = f(rDetails.series);
    const realtorNumber = f(rDetails.number);
    const realtorIssuedBy = f(rDetails.issued_by);
    const realtorIssueDate = rDetails.issue_date ? fDate(rDetails.issue_date) : '';
    const realtorUnitCode = f(rDetails.unit_code);
    const realtorRegAddress = f(rDetails.registration_address || realtor?.reg_address || realtor?.address);
    const realtorPhone = f(formatPhone(realtor?.phone) || realtor?.phone);
    const realtorShort = toShortName(realtorName);

    // Данные заказчика (клиента) для 3-стороннего договора
    const customer = buyer || seller || principal;
    const cDetails = customer?.passport_details || {};
    const cCompany = customer?.company_details || {};
    const cAuth = customer?.authorized_person || {};
    const isCustomerLegalEntity = Boolean(
        data.isLegalEntity ||
        customer?.is_legal_entity ||
        customer?.client_types?.includes('legal_entity') ||
        customer?.company_name ||
        cCompany.name ||
        cCompany.inn ||
        cCompany.ogrn
    );
    const customerCompanyName = f(customer?.company_name || cCompany.name || cCompany.short_name || (isCustomerLegalEntity ? customer?.full_name : ''));
    const customerCompanyInn = f(customer?.inn || cCompany.inn);
    const customerCompanyKpp = f(customer?.kpp || cCompany.kpp);
    const customerCompanyOgrn = f(customer?.ogrn || cCompany.ogrn);
    const customerCompanyLegalAddress = f(customer?.legal_address || cCompany.legal_address || customer?.reg_address || customer?.address);
    const customerAuthPosition = f(customer?.authorized_position || cAuth.position || cCompany.director_position || 'Генеральный директор');
    const customerAuthName = f(customer?.authorized_name || cAuth.name || cCompany.director_name || (!isCustomerLegalEntity ? customer?.full_name : ''));
    const customerAuthBasis = f(customer?.authorized_basis || cAuth.basis_document || 'Устава');
    const customerAuthShort = toShortName(customerAuthName);

    const customerName = f(customer?.full_name);
    const customerBirth = customer?.birth_date ? fDate(customer.birth_date) : (cDetails.birth_date ? fDate(cDetails.birth_date) : '');
    const customerSeries = f(cDetails.series);
    const customerNumber = f(cDetails.number);
    const customerIssuedBy = f(cDetails.issued_by);
    const customerIssueDate = cDetails.issue_date ? fDate(cDetails.issue_date) : '';
    const customerUnitCode = f(cDetails.unit_code);
    const customerRegAddress = f(cDetails.registration_address || customer?.reg_address || customer?.address);
    const customerPhone = f(formatPhone(customer?.phone) || customer?.phone);
    const customerEmail = f(customer?.email);
    const customerShort = toShortName(customerName);

    // Стоимости услуг (Исполнитель 1 и Исполнитель 2)
    const rawService1 = data.service1Cost !== undefined ? data.service1Cost : (deal?.service1_cost || '');
    const cleanS1 = rawService1 ? Number(String(rawService1).replace(/\D/g, '')) : 0;
    const service1Formatted = cleanS1 > 0 ? cleanS1.toLocaleString('ru-RU') : '';
    const service1Words = cleanS1 > 0 ? `(${numberToWordsRu(cleanS1)})` : '';

    const rawService2 = data.service2Cost !== undefined ? data.service2Cost : (deal?.service2_cost || '');
    const cleanS2 = rawService2 ? Number(String(rawService2).replace(/\D/g, '')) : 0;
    const service2Formatted = cleanS2 > 0 ? cleanS2.toLocaleString('ru-RU') : '';
    const service2Words = cleanS2 > 0 ? `(${numberToWordsRu(cleanS2)})` : '';

    const actDate = fDate(data.actDate || deal?.act_date || deal?.deal_date || new Date().toISOString());
    const contractNumber = f(data.contractNumber || deal?.contract_number || 'б/н');

    return {
        contract_date: today,
        act_date: actDate,
        contract_number: contractNumber,
        is_legal_entity: isLegalEntity || isCustomerLegalEntity,
        company_name: isCustomerLegalEntity ? (customerCompanyName || companyName) : companyName,
        company_inn: isCustomerLegalEntity ? (customerCompanyInn || companyInn) : companyInn,
        company_kpp: isCustomerLegalEntity ? (customerCompanyKpp || companyKpp) : companyKpp,
        company_ogrn: isCustomerLegalEntity ? (customerCompanyOgrn || companyOgrn) : companyOgrn,
        company_legal_address: isCustomerLegalEntity ? (customerCompanyLegalAddress || companyLegalAddress) : companyLegalAddress,
        auth_position: isCustomerLegalEntity ? (customerAuthPosition || authPosition) : authPosition,
        auth_name: isCustomerLegalEntity ? (customerAuthName || authName) : authName,
        auth_basis: isCustomerLegalEntity ? (customerAuthBasis || authBasis) : authBasis,
        auth_short: isCustomerLegalEntity ? (customerAuthShort || authShort) : authShort,
        principal_name: isLegalEntity ? (companyName || principalName) : principalName,
        principal_birth: principalBirth,
        principal_series: principalSeries,
        principal_number: principalNumber,
        principal_issued_by: principalIssuedBy,
        principal_issue_date: principalIssueDate,
        principal_unit_code: principalUnitCode,
        principal_reg_address: isLegalEntity ? (companyLegalAddress || principalRegAddress) : principalRegAddress,
        principal_phone: principalPhone,
        principal_short: isLegalEntity ? authShort : principalShort,
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
        realtor_inn: realtorInn,
        realtor_birth: realtorBirth,
        realtor_series: realtorSeries,
        realtor_number: realtorNumber,
        realtor_issued_by: realtorIssuedBy,
        realtor_issue_date: realtorIssueDate,
        realtor_unit_code: realtorUnitCode,
        realtor_reg_address: realtorRegAddress,
        realtor_phone: realtorPhone,
        realtor_short: realtorShort,
        customer_name: isCustomerLegalEntity ? (customerCompanyName || customerName) : customerName,
        customer_birth: customerBirth,
        customer_series: customerSeries,
        customer_number: customerNumber,
        customer_issued_by: customerIssuedBy,
        customer_issue_date: customerIssueDate,
        customer_unit_code: customerUnitCode,
        customer_reg_address: isCustomerLegalEntity ? (customerCompanyLegalAddress || customerRegAddress) : customerRegAddress,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        customer_short: isCustomerLegalEntity ? customerAuthShort : customerShort,
        service1_cost: service1Formatted,
        service1_words: service1Words,
        service2_cost: service2Formatted,
        service2_words: service2Words,
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
                if (inputId === 'doc-input-realtor-name') slotId = 'realtor_name';
                else if (inputId === 'doc-input-realtor-inn') slotId = 'realtor_inn';
                else if (inputId === 'doc-input-realtor-birth') slotId = 'realtor_birth';
                else if (inputId === 'doc-input-realtor-series') slotId = 'realtor_series';
                else if (inputId === 'doc-input-realtor-number') slotId = 'realtor_number';
                else if (inputId === 'doc-input-realtor-issued-by') slotId = 'realtor_issued_by';
                else if (inputId === 'doc-input-realtor-issue-date') slotId = 'realtor_issue_date';
                else if (inputId === 'doc-input-realtor-unit-code') slotId = 'realtor_unit_code';
                else if (inputId === 'doc-input-realtor-reg-address') slotId = 'realtor_reg_address';
                else if (inputId === 'doc-input-realtor-phone') slotId = 'realtor_phone';
                else if (inputId === 'doc-input-customer-name' || label.includes('ФИО Заказчика')) slotId = 'customer_name';
                else if (inputId === 'doc-input-customer-phone') slotId = 'customer_phone';
                else if (inputId === 'doc-input-customer-birth') slotId = 'customer_birth';
                else if (inputId === 'doc-input-customer-series') slotId = 'customer_series';
                else if (inputId === 'doc-input-customer-number') slotId = 'customer_number';
                else if (inputId === 'doc-input-customer-issued-by') slotId = 'customer_issued_by';
                else if (inputId === 'doc-input-customer-issue-date') slotId = 'customer_issue_date';
                else if (inputId === 'doc-input-customer-unit-code') slotId = 'customer_unit_code';
                else if (inputId === 'doc-input-customer-reg-address') slotId = 'customer_reg_address';
                else if (inputId === 'doc-input-customer-email') slotId = 'customer_email';
                else if (inputId === 'doc-input-customer-short') slotId = 'customer_short';
                else if (inputId === 'doc-input-realtor-short') slotId = 'realtor_short';
                else if (inputId === 'doc-input-act-date') slotId = 'act_date';
                else if (inputId === 'doc-input-contract-number') slotId = 'contract_number';
                else if (inputId === 'doc-input-service1-cost') {
                    slotId = (label.includes('прописью') || title.includes('прописью')) ? 'service1_words' : 'service1_cost';
                }
                else if (inputId === 'doc-input-service2-cost') {
                    slotId = (label.includes('прописью') || title.includes('прописью')) ? 'service2_words' : 'service2_cost';
                }
                else if (inputId === 'doc-input-full-name' || title.includes('ФИО') || label.includes('ФИО')) slotId = 'principal_name';
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
                else if (inputId === 'doc-input-company-name' || label.includes('Наименование организации') || label.includes('Организация')) slotId = 'company_name';
                else if (inputId === 'doc-input-inn' || label.includes('ИНН организации') || (label.includes('ИНН') && !label.includes('Риэлтор'))) slotId = 'company_inn';
                else if (inputId === 'doc-input-kpp' || label.includes('КПП')) slotId = 'company_kpp';
                else if (inputId === 'doc-input-ogrn' || label.includes('ОГРН')) slotId = 'company_ogrn';
                else if (inputId === 'doc-input-legal-address' || label.includes('Юридический адрес') || label.includes('Юр. адрес')) slotId = 'company_legal_address';
                else if (inputId === 'doc-input-auth-position' || label.includes('Должность уполномоченного') || label.includes('Должность')) slotId = 'auth_position';
                else if (inputId === 'doc-input-auth-name' || label.includes('ФИО уполномоченного')) slotId = 'auth_name';
                else if (inputId === 'doc-input-auth-basis' || label.includes('Основание полномочий')) slotId = 'auth_basis';
                else if (inputId === 'doc-input-auth-short' || label.includes('Инициалы уполномоченного')) slotId = 'auth_short';
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
