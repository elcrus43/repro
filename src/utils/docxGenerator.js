/**
 * docxGenerator.js
 *
 * Генерация DOCX-документов (договоров, актов) с подстановкой данных из CRM.
 * Использует библиотеку `docx` для формирования .docx файлов.
 */

import {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, BorderStyle, WidthType, convertInchesToTwip, Header, ImageRun,
} from 'docx';
import { formatPhone } from './format';
import { YUSS_BUY_1_LOGO_BASE64 } from '../assets/templates/yuss_buy_1_logo.base64';

function getLogoUint8Array() {
    if (typeof atob === 'function') {
        const bin = atob(YUSS_BUY_1_LOGO_BASE64);
        const len = bin.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = bin.charCodeAt(i);
        }
        return bytes;
    }
    // Node.js fallback
    if (typeof globalThis !== 'undefined' && globalThis.Buffer) {
        return Uint8Array.from(globalThis.Buffer.from(YUSS_BUY_1_LOGO_BASE64, 'base64'));
    }
    return new Uint8Array();
}

/* ─── Вспомогательные функции ────────────────────────────────────────────── */

function fmt(val, fallback = '________________________') {
    if (val === null || val === undefined || val === '') return fallback;
    return String(val);
}

function fmtDate(dateStr) {
    if (!dateStr) return '«___» ___________ 20___ г.';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '«___» ___________ 20___ г.';
    return d.toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtPrice(price) {
    if (!price && price !== 0) return '________________________';
    const num = Number(String(price).replace(/\D/g, ''));
    if (isNaN(num)) return String(price);
    return num.toLocaleString('ru-RU') + ' ₽';
}

export function toShortName(fullName) {
    if (!fullName) return '____________________';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    if (parts.length === 2) return `${parts[0]} ${parts[1][0]}.`;
    return `${parts[0]} ${parts[1][0]}.${parts[2][0]}.`;
}

/**
 * Формирует вид объекта недвижимости (например, '2-комн. квартира')
 */
export function formatPropertyKind(property) {
    if (!property) return 'Квартира';
    if (property.property_kind && String(property.property_kind).trim()) {
        return String(property.property_kind).trim();
    }
    const type = property.property_type;
    const rooms = property.rooms;

    if (!type || type === 'apartment') {
        if (rooms === 'studio' || rooms === 0 || rooms === '0') {
            return 'Квартира-студия';
        }
        if (rooms) {
            const cleanRooms = String(rooms).replace(/[^\d]/g, '');
            if (cleanRooms) {
                return `${cleanRooms}-комн. квартира`;
            }
            return `${rooms}-комн. квартира`;
        }
        return 'Квартира';
    }
    if (type === 'room') {
        return 'Комната';
    }
    if (type === 'house') {
        if (property.land_area || property.has_house) {
            return 'Жилой дом с земельным участком';
        }
        return 'Жилой дом';
    }
    if (type === 'land' || type === 'garden') {
        return 'Земельный участок';
    }
    if (type === 'commercial') {
        return 'Нежилое помещение';
    }
    if (type === 'garage') {
        return 'Гараж';
    }
    return 'Квартира';
}


/**
 * Преобразует целое число в рубли прописью на русском языке
 */
export function numberToWordsRu(num) {
    if (!num && num !== 0) return '';
    const cleanNum = Number(String(num).replace(/\D/g, ''));
    if (isNaN(cleanNum) || cleanNum === 0) return 'ноль';

    const onesM = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
    const onesF = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
    const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
    const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
    const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];

    function triplet(val, isFemale) {
        const res = [];
        const h = Math.floor(val / 100);
        const t = Math.floor((val % 100) / 10);
        const o = val % 10;
        if (h > 0) res.push(hundreds[h]);
        if (t === 1) {
            res.push(teens[o]);
        } else {
            if (t > 1) res.push(tens[t]);
            if (o > 0) res.push(isFemale ? onesF[o] : onesM[o]);
        }
        return res.join(' ');
    }

    function plural(n, form1, form2, form5) {
        const n10 = n % 10;
        const n100 = n % 100;
        if (n100 >= 11 && n100 <= 19) return form5;
        if (n10 === 1) return form1;
        if (n10 >= 2 && n10 <= 4) return form2;
        return form5;
    }

    const billions = Math.floor(cleanNum / 1000000000);
    const millions = Math.floor((cleanNum % 1000000000) / 1000000);
    const thousands = Math.floor((cleanNum % 1000000) / 1000);
    const remainder = cleanNum % 1000;

    const parts = [];
    if (billions > 0) {
        parts.push(triplet(billions, false) + ' ' + plural(billions, 'миллиард', 'миллиарда', 'миллиардов'));
    }
    if (millions > 0) {
        parts.push(triplet(millions, false) + ' ' + plural(millions, 'миллион', 'миллиона', 'миллионов'));
    }
    if (thousands > 0) {
        parts.push(triplet(thousands, true) + ' ' + plural(thousands, 'тысяча', 'тысячи', 'тысяч'));
    }
    if (remainder > 0) {
        parts.push(triplet(remainder, false));
    }
    return parts.join(' ').trim();
}

function priceInWords(price) {
    if (!price && price !== 0) return '________________________';
    const num = Number(String(price).replace(/\D/g, ''));
    if (isNaN(num)) return '________________________';
    const words = numberToWordsRu(num);
    return `${words} рублей`;
}

/**
 * Формирует паспортные данные клиента в текстовую строку
 */
function fmtPassport(client) {
    if (!client) return '________________________';
    const p = client.passport_details || {};
    const parts = [];
    if (p.series || p.number) parts.push(`паспорт: серия ${fmt(p.series, '_____')} № ${fmt(p.number, '__________')}`);
    if (p.issued_by) parts.push(`выдан ${p.issued_by}`);
    if (p.issue_date) parts.push(fmtDate(p.issue_date));
    if (p.unit_code) parts.push(`код подразделения ${p.unit_code}`);
    const regAddress = p.registration_address || client.reg_address || client.address;
    if (regAddress) parts.push(`зарегистрирован(а) по адресу: ${regAddress}`);
    return parts.length > 0 ? parts.join(', ') : '________________________';
}

/**
 * Извлекает реквизиты юридического лица и данные уполномоченного лица
 */
export function extractLegalEntityDetails(client, fallbackName = '') {
    const isLegal = Boolean(
        client?.is_legal_entity ||
        client?.client_types?.includes('legal_entity') ||
        client?.company_name ||
        client?.company_details?.inn ||
        client?.company_details?.ogrn ||
        client?.company_details?.name ||
        /^(ООО|ОАО|ЗАО|ПАО|АО|МУП|ГУП|НКО|АНО)\b/i.test(client?.full_name || '')
    );
    const cd = client?.company_details || {};
    const ap = client?.authorized_person || {};
    const name = fmt(client?.company_name || cd.name || cd.short_name || (isLegal ? client?.full_name : '') || fallbackName);
    const inn = fmt(client?.inn || cd.inn, '_____________');
    const kpp = fmt(client?.kpp || cd.kpp, '');
    const ogrn = fmt(client?.ogrn || cd.ogrn, '_____________');
    const legalAddress = fmt(client?.legal_address || cd.legal_address || client?.reg_address || client?.address, '__________________________________________________');
    const position = fmt(client?.authorized_position || ap.position || cd.director_position || 'Генеральный директор');
    const authName = fmt(client?.authorized_name || ap.name || cd.director_name || (!isLegal ? client?.full_name : ''));
    const basis = fmt(client?.authorized_basis || ap.basis_document || 'Устава');
    const authShort = toShortName(authName);

    return {
        isLegal,
        name,
        inn,
        kpp,
        ogrn,
        legalAddress,
        position,
        authName,
        basis,
        authShort,
    };
}

/* ─── Стили текста ───────────────────────────────────────────────────────── */

const FONT = 'Times New Roman';
const FONT_SIZE = 24; // half-points = 12pt

function boldRun(text) {
    return new TextRun({ text, bold: true, font: FONT, size: FONT_SIZE });
}

function normalRun(text) {
    return new TextRun({ text, font: FONT, size: FONT_SIZE });
}

function para(children, opts = {}) {
    const runs = Array.isArray(children) ? children : [normalRun(children)];
    return new Paragraph({
        children: runs,
        alignment: opts.alignment || AlignmentType.JUSTIFIED,
        spacing: { after: opts.afterPt !== undefined ? opts.afterPt * 20 : 120 },
        indent: opts.indent ? { firstLine: convertInchesToTwip(0.4) } : undefined,
    });
}

function sigLine(label, name) {
    return new Paragraph({
        children: [
            normalRun(`${label}:`),
            normalRun('   ____________________   /   '),
            boldRun(name || '____________________'),
            normalRun('   /'),
        ],
        spacing: { after: 200 },
    });
}

function sectionTitle(text) {
    return new Paragraph({
        children: [boldRun(text)],
        alignment: AlignmentType.CENTER,
        spacing: { after: 140, before: 240 },
    });
}

/* ─── Шаблон: ЮСС Покупка 1 (Юридическое сопровождение покупки — 1 принципал) ── */

const ARIAL_FONT = 'Arial';
const ARIAL_SIZE = 17; // 8.5 pt (точно как в шаблоне пользователя)

function arialRun(text, opts = {}) {
    return new TextRun({ text, font: ARIAL_FONT, size: ARIAL_SIZE, ...opts });
}

function arialBold(text, opts = {}) {
    return new TextRun({ text, font: ARIAL_FONT, size: ARIAL_SIZE, bold: true, ...opts });
}

function arialPara(children, opts = {}) {
    const runs = Array.isArray(children) ? children : [arialRun(children)];
    return new Paragraph({
        children: runs,
        alignment: opts.alignment || AlignmentType.JUSTIFIED,
        spacing: {
            line: opts.line !== undefined ? opts.line : 260,
            before: opts.beforePt !== undefined ? opts.beforePt * 20 : 0,
            after: opts.afterPt !== undefined ? opts.afterPt * 20 : 60,
        },
        indent: opts.indent ? { firstLine: convertInchesToTwip(0.35) } : undefined,
    });
}

function buildYussBuy1Contract(data) {
    const principal = data.buyer || data.seller; // Принципал
    const p = principal?.passport_details || {};
    const deal = data.deal;

    const fullName = fmt(principal?.full_name);
    const birthDate = principal?.birth_date ? fmtDate(principal.birth_date) : (p.birth_date ? fmtDate(p.birth_date) : '________________________________________');
    const series = fmt(p.series, '_________________');
    const number = fmt(p.number, '__________________________');
    const issuedBy = fmt(p.issued_by, '_____________________________________________________________________________________________________________________________________________________________________________________________________________');
    const issueDate = p.issue_date ? fmtDate(p.issue_date) : '________________';
    const regAddress = fmt(p.registration_address || principal?.reg_address || principal?.address, '_______________________________________________________________________________________________________________________');
    const phone = fmt(formatPhone(principal?.phone) || principal?.phone, '______________________________________________');

    const leg = extractLegalEntityDetails(principal, fullName);
    const isLegal = Boolean(data.isLegalEntity || leg.isLegal);

    const rawComm = deal?.commission || data.property?.commission;
    const cleanComm = rawComm ? Number(String(rawComm).replace(/\D/g, '')) : 0;
    const commFormatted = cleanComm > 0 ? cleanComm.toLocaleString('ru-RU') : '_________________________';
    const commWords = cleanComm > 0 ? `(${numberToWordsRu(cleanComm)})` : '________________________________________________________________________________________________';

    const rawEndDate = data.contractEndDate || deal?.contract_end_date;
    const contractEndDate = rawEndDate ? fmtDate(rawEndDate) : '__________________________г.';
    const todayStr = fmtDate(deal?.deal_date || new Date().toISOString());

    const bodyChildren = [
        arialPara([arialBold('Агентский договор')], { alignment: AlignmentType.CENTER, afterPt: 6 }),
        arialPara([
            arialRun('Город Киров, Кировская область                                                        '),
            arialRun(`«${todayStr}»`),
        ], { alignment: AlignmentType.LEFT, afterPt: 10 }),

        ...(isLegal ? [
            arialPara([
                arialBold(leg.name),
                arialRun(`, ОГРН ${leg.ogrn}, ИНН ${leg.inn}`),
                leg.kpp ? arialRun(`, КПП ${leg.kpp}`) : arialRun(''),
                arialRun(`, адрес места нахождения: ${leg.legalAddress}, в лице `),
                arialRun(`${leg.position} `),
                arialBold(leg.authName),
                arialRun(`, действующего(-ей) на основании ${leg.basis}, телефон: ${phone}, именуемое в дальнейшем `),
                arialBold('«Принципал»'),
                arialRun(', с одной стороны,'),
            ], { indent: true, afterPt: 6 }),
        ] : [
            arialPara([
                arialRun('Мы, '),
                arialBold(fullName),
                arialRun(','),
            ], { indent: true, afterPt: 3 }),
            arialPara([
                arialRun(`дата рождения: ${birthDate}, паспорт серия `),
                arialBold(series),
                arialRun(' номер '),
                arialBold(number),
                arialRun(` выдан ${issuedBy} дата выдачи: ${issueDate},`),
            ], { indent: true, afterPt: 3 }),
            arialPara([
                arialRun(`зарегистрированный(-ая) по адресу: ${regAddress},`),
            ], { indent: true, afterPt: 3 }),
            arialPara([
                arialRun(`телефон: ${phone}, именуемый(-ая) в дальнейшем `),
                arialBold('«Принципал»'),
                arialRun(', с одной стороны,'),
            ], { indent: true, afterPt: 6 }),
        ]),

        arialPara([
            arialRun('и '),
            arialBold('Индивидуальный предприниматель Муравьева Юлия Анатольевна'),
            arialRun(', ИНН 434560366213, ОГРН 323784700414782, адрес фактического местонахождения: 610000, Кировская область, г. Киров, ул. Ленина, д. 89, помещение 4; р/сч 40802810400005970330 в АО «Тинькофф Банк», БИК 044525974, к/сч 30101810145250000974, именуемая в дальнейшем '),
            arialBold('«Агент»'),
            arialRun(', с другой стороны, именуемые в дальнейшем совместно «Стороны», заключили Агентский договор о следующем:'),
        ], { indent: true, afterPt: 8 }),

        arialPara([arialBold('1. Предмет договора')], { afterPt: 4, beforePt: 4 }),
        arialPara([
            arialRun('1.1. Принципал поручает, а Агент обязуется за вознаграждение осуществить юридическое сопровождение планируемой Принципалом сделки по ПРИОБРЕТЕНИЮ объекта недвижимого имущества в соответствии с условиями настоящего договора.'),
        ], { indent: true, afterPt: 6 }),

        arialPara([arialBold('2. Обязанности сторон')], { afterPt: 4, beforePt: 4 }),
        arialPara([arialBold('2.1. Обязанности Принципала:')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.1.1. Сообщить Агенту описание (основные характеристики объекта недвижимости, соответствующие сведениям Единого государственного реестра недвижимости, а также его стоимость не позднее, чем за 2 (два) рабочих дня до предполагаемой даты сделки. Стороны вправе изменить стоимость объекта недвижимости путем заключения дополнительного соглашения к Агентскому договору.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.1.2. По своей воле заключить договор о приобретении объекта недвижимого имущества (договор купли-продажи, договор участия в долевом строительстве, договор уступки прав и обязанностей и т.п., именуемый далее по тексту – сделка с объектом недвижимости), передаточный акт и иные необходимые документы, а также выполнить иные оговоренные сторонами сделки условия; предоставить заявление и иные необходимые для государственной регистрации перехода права собственности (сделки, подлежащей государственной регистрации) документы в Многофункциональный центр предоставления государственных и муниципальных услуг, Территориальный орган Федеральной службы государственной регистрации, кадастра и картографии (Росреестр), в другие организации; предоставить запрошенные Агентом необходимые документы (сведения) и т.п. до момента заключения сделки с объектом недвижимости; совершать иные законные действия, в т. ч. рекомендованные Агентом.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.1.3. В день заключения предварительного договора купли-продажи или соглашения об авансе принять составляемый Агентом Отчет о частичном исполнении Агентского договора, в день заключения сделки с объектом недвижимости принять составляемый Агентом Отчет об исполнении Агентского договора (далее – Отчеты Агента).')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.1.4. За счет собственных средств оплачивать предусмотренные действующим законодательством государственные пошлины и платы (в т.ч. за нотариальные действия), услуги кадастрового инженера, оценщика, банковские комиссии и т.п., в случае необходимости в совершении таких действий и получении указанных услуг.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.1.5. В период действия настоящего договора не заключать аналогичных Агентских договоров с третьими лицами и воздерживаться от самостоятельной деятельности, являющейся предметом настоящего договора без участия Агента.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.1.6. Самостоятельное заключение Принципалом, его аффилированным лицом либо лицом, находящимся в родстве или свойстве сделки с объектом недвижимости, считается фактом исполнения обязательств Агентом по Агентскому договору, о чем Агентом направляется соответствующее уведомление в соответствии с порядком, установленным настоящим договором.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.1.7. Права и обязанности по сделкам, совершенным при участии Агента, возникают непосредственно у Принципала.')], { indent: true, afterPt: 6 }),

        arialPara([arialBold('2.2. Обязанности Агента:')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.2.1. Вести переговоры с продавцами (правоотчуждателями) объекта недвижимости, а также составить проект договора о приобретении объекта недвижимого имущества, передаточного акта и иных документов, необходимых для государственной регистрации перехода права собственности (сделки, подлежащей государственной регистрации) на объект недвижимости; организовать предоставление Принципалом заявления и иных необходимых для государственной регистрации перехода права собственности (сделки, подлежащей государственной регистрации) документов в Многофункциональный центр предоставления государственных и муниципальных услуг, Территориальный орган Федеральной службы государственной регистрации, кадастра и картографии (Росреестр), в другие организации; в необходимых случаях давать Принципалу соответствующие рекомендации.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.2.2. Составить для Принципала Отчеты Агента.')], { indent: true, afterPt: 6 }),

        arialPara([arialBold('3. Агентское вознаграждение и расчеты между сторонами')], { afterPt: 4, beforePt: 4 }),
        arialPara([
            arialRun('3.1. Размер вознаграждения Агента (Агентского вознаграждения) составляет: '),
            arialBold(commFormatted),
            arialRun(' '),
            arialRun(commWords),
            arialRun(' рублей, в том числе НДС 5 %.'),
        ], { indent: true, afterPt: 3 }),
        arialPara([arialRun('3.2. Принципал обязуется уплатить Агенту вознаграждение путем внесения обеспечительного платежа, окончательный расчет производится в день заключения сделки с объектом недвижимости.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('3.3. Расчеты по Агентскому договору осуществляются в следующем порядке: путем внесения наличных денежных средств в кассу Агента или в безналичном порядке платежными поручениями на расчетный счет Агента.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('3.4. Обязательства Принципала по оплате считаются исполненными в момент зачисления денежных средств на расчетный счет Агента или внесения Принципалом денежных средств в кассу Агента.')], { indent: true, afterPt: 6 }),

        arialPara([arialBold('4. Ответственность сторон')], { afterPt: 4, beforePt: 4 }),
        arialPara([arialRun('4.1. При нарушении Принципалом условий настоящего договора без уважительных причин (временная нетрудоспособность и т.п.), в том числе - если он не будет присутствовать лично или не обеспечит присутствие своего уполномоченного представителя в назначенный день для совершения необходимых действий по заключению сделки с объектом недвижимости, либо заключит аналогичный Агентский договор с третьим лицом или будет осуществлять самостоятельную деятельность, являющуюся предметом настоящего договора, Принципал уплачивает неустойку Агенту в размере 50 (пятидесяти) процентов от установленных Агентским договором размеров Агентских вознаграждений.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('4.2. Материальная ответственность Агента перед Принципалом не может превышать размер Агентского вознаграждения.')], { indent: true, afterPt: 6 }),

        arialPara([arialBold('5. Срок действия настоящего договора')], { afterPt: 4, beforePt: 4 }),
        arialPara([
            arialRun('5.1. Настоящий договор вступает в силу с момента его заключения Сторонами и действует до '),
            arialBold(contractEndDate),
            arialRun(' включительно, а в части расчетов между сторонами – до полного исполнения всех обязательств.'),
        ], { indent: true, afterPt: 3 }),
        arialPara([arialRun('5.2. Если ни одна из Сторон не заявит о своем намерении прекратить действие договора, то настоящий договор считается возобновленным на тех же условиях и на тот же срок.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('5.3. Договор может быть изменен или расторгнут только по письменному соглашению сторон.')], { indent: true, afterPt: 6 }),

        arialPara([arialBold('6. Дополнительные условия')], { afterPt: 4, beforePt: 4 }),
        arialPara([arialRun('6.1. Все споры, возникающие при выполнении настоящего договора, решаются сторонами путем переговоров, направления и вручения письменных претензий, а при недостижении согласия – в судебном порядке, в соответствии с действующим законодательством.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('6.2. Агент вправе направить Принципалу по последнему известному ему адресу регистрации Принципала письменные сообщения и (или) электронные сообщения на указанные Принципалом мобильный номер телефона и (или) электронную почту о ходе и результатах исполнения Агентского договора. Все юридически значимые сообщения в адрес Агента должны направляться исключительно по почтовому адресу, который указан в преамбуле Агентского договора. Направление сообщения по другим адресам не может считаться надлежащим. Сообщение считается доставленным и в тех случаях, если оно поступило лицу, которому оно направлено (адресату), но по обстоятельствам, зависящим от него, не было ему вручено или адресат не ознакомился с ним.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('6.3. Настоящим пунктом Принципал подтверждает, что у него отсутствуют какие-либо обстоятельства и ситуации, которые препятствуют или могут препятствовать заключению им законным образом настоящего Агентского договора и впоследствии – сделки с объектом недвижимости.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('6.4. Принципал дает согласие на получение от Агента рекламной и иной информации, необходимой для осуществления деятельности Агента, путем направления сообщений смс на телефон, электронных писем на электронную почту, указанных Принципалом в настоящем договоре.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('6.5. Настоящим пунктом Принципал выражает свое письменное заявление о согласии на обработку и использование Агентом своих персональных данных, содержащихся в настоящем договоре и в представленных (подготовленных) документах на срок, необходимый для исполнения Агентского договора.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('6.6. Договор составлен в двух экземплярах, по одному экземпляру каждой из сторон.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('6.7. Настоящим стороны Договора заверяют и гарантируют, что они и близкие родственники не имеют гражданства иностранных(ого) государств(а), совершающих(его) в отношении Российской Федерации, российских юридических и физических лиц недружественные действия, а также местом регистрации, местом преимущественного пребывания, местом преимущественного ведения хозяйственной деятельности или извлечения прибыли от деятельности не являются(ется) указанные(ое) государства(о) и территория(ии), перечень которых установлен Распоряжением Правительства Российской Федерации от 05.03.2022 N 430-р «Об утверждении перечня иностранных государств и территорий, совершающих недружественные действия в отношении Российской Федерации, российских юридических и физических лиц».')], { indent: true, afterPt: 10 }),

        arialPara([arialBold('7. Подписи сторон')], { afterPt: 6, beforePt: 6 }),
        ...(isLegal ? [
            new Paragraph({
                children: [arialBold('Принципал:')],
                spacing: { line: 260, before: 60, after: 20 },
            }),
            new Paragraph({
                children: [arialRun(leg.name)],
                spacing: { line: 260, after: 20 },
            }),
            new Paragraph({
                children: [arialRun(`ОГРН: ${leg.ogrn}, ИНН: ${leg.inn}${leg.kpp ? `, КПП: ${leg.kpp}` : ''}`)],
                spacing: { line: 260, after: 20 },
            }),
            new Paragraph({
                children: [arialRun(`Юр. адрес: ${leg.legalAddress}`)],
                spacing: { line: 260, after: 40 },
            }),
            new Paragraph({
                children: [
                    arialRun(`${leg.position}: ____________________ / `),
                    arialBold(leg.authShort),
                    arialRun(' /    М.П.'),
                ],
                spacing: { line: 260, after: 120 },
            }),
        ] : [
            new Paragraph({
                children: [arialRun('Принципал:')],
                border: {
                    bottom: { color: '000000', space: 0, style: BorderStyle.SINGLE, size: 12 },
                },
                spacing: { line: 260, after: 0 },
            }),
            new Paragraph({
                children: [arialRun('\u00A0')],
                border: {
                    bottom: { color: '000000', space: 0, style: BorderStyle.SINGLE, size: 12 },
                },
                spacing: { line: 260, after: 0 },
            }),
            new Paragraph({
                children: [arialRun('\u00A0')],
                border: {
                    bottom: { color: '000000', space: 0, style: BorderStyle.SINGLE, size: 12 },
                },
                spacing: { line: 260, after: 0 },
            }),
            new Paragraph({
                children: [arialRun('\u00A0')],
                spacing: { line: 260, after: 120 },
            }),
        ]),
        new Paragraph({
            children: [arialRun('Агент:')],
            spacing: { line: 260, before: 60, after: 0 },
        }),
        new Paragraph({
            children: [arialRun('\u00A0')],
            border: {
                bottom: { color: '000000', space: 1, style: BorderStyle.SINGLE, size: 12 },
            },
            spacing: { line: 260, after: 0 },
        }),
    ];

    return {
        headers: {
            default: new Header({
                children: [
                    new Paragraph({
                        children: [
                            new ImageRun({
                                data: getLogoUint8Array(),
                                transformation: { width: 150, height: 124 },
                            }),
                        ],
                        spacing: { after: 120 },
                    }),
                ],
            }),
        },
        properties: {
            page: {
                margin: {
                    top: 851,
                    right: 566,
                    bottom: 851,
                    left: 1134,
                },
            },
        },
        children: bodyChildren,
    };
}

/* ─── Шаблон: Агентский договор — Продажа (1 принципал) ──────────────────── */

function buildAgencySale1Contract(data) {
    const principal = data.seller || data.buyer; // Принципал (собственник/продавец)
    const p = principal?.passport_details || {};
    const deal = data.deal;
    const property = data.property;

    const fullName = fmt(principal?.full_name);
    const birthDate = principal?.birth_date ? fmtDate(principal.birth_date) : (p.birth_date ? fmtDate(p.birth_date) : '________________________________________');
    const series = fmt(p.series, '_________________');
    const number = fmt(p.number, '__________________________');
    const issuedBy = fmt(p.issued_by, '_____________________________________________________________________________________________________________________________________________________________________________________________________________');
    const issueDate = p.issue_date ? fmtDate(p.issue_date) : '________________';
    const regAddress = fmt(p.registration_address || principal?.reg_address || principal?.address, '_______________________________________________________________________________________________________________________');
    const phone = fmt(formatPhone(principal?.phone) || principal?.phone, '______________________________________________');

    const leg = extractLegalEntityDetails(principal, fullName);
    const isLegal = Boolean(data.isLegalEntity || leg.isLegal);

    // Характеристики объекта недвижимости для таблицы
    const propKind = formatPropertyKind(property);
    const propAddress = fmt(property?.address || property?.city, '_______________________________________________________________________________________________________________________');
    const propCadastral = property?.cadastral_number ? `, кад. № ${property.cadastral_number}` : '';
    const propertyAddressDetails = `${propAddress}${propCadastral}`;

    // Ориентировочная стоимость объекта (п. 1.1.1)
    const rawPrice = deal?.price || property?.price;
    const cleanPriceNum = rawPrice ? Number(String(rawPrice).replace(/\D/g, '')) : 0;
    const priceFormatted = cleanPriceNum > 0 ? cleanPriceNum.toLocaleString('ru-RU') : '_________________________';
    const priceWords = cleanPriceNum > 0 ? `(${numberToWordsRu(cleanPriceNum)})` : '________________________________________________________________________________________________';

    // Вознаграждение Агента (п. 3.1)
    const rawComm = deal?.commission || data.property?.commission;
    const cleanComm = rawComm ? Number(String(rawComm).replace(/\D/g, '')) : 0;
    const commFormatted = cleanComm > 0 ? cleanComm.toLocaleString('ru-RU') : '_________________________';
    const commWords = cleanComm > 0 ? `(${numberToWordsRu(cleanComm)})` : '________________________________________________________________________________________________';

    // Срок действия договора (п. 5.1)
    const rawEndDate = data.contractEndDate || deal?.contract_end_date;
    const contractEndDate = rawEndDate ? fmtDate(rawEndDate) : '__________________________г.';
    const todayStr = fmtDate(deal?.deal_date || new Date().toISOString());

    const propertyTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
        },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 30, type: WidthType.PERCENTAGE },
                        children: [arialPara([arialBold('Вид объекта недвижимости')], { indent: false, afterPt: 2, beforePt: 2 })],
                    }),
                    new TableCell({
                        width: { size: 70, type: WidthType.PERCENTAGE },
                        children: [arialPara([arialRun(propKind)], { indent: false, afterPt: 2, beforePt: 2 })],
                    }),
                ],
            }),
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 30, type: WidthType.PERCENTAGE },
                        children: [arialPara([arialBold('Адрес (местоположение)')], { indent: false, afterPt: 2, beforePt: 2 })],
                    }),
                    new TableCell({
                        width: { size: 70, type: WidthType.PERCENTAGE },
                        children: [arialPara([arialRun(propertyAddressDetails)], { indent: false, afterPt: 2, beforePt: 2 })],
                    }),
                ],
            }),
        ],
    });

    const bodyChildren = [
        arialPara([arialBold('Агентский договор')], { alignment: AlignmentType.CENTER, afterPt: 6 }),
        arialPara([
            arialRun('Город Киров, Кировская область                                                        '),
            arialRun(`«${todayStr}»`),
        ], { alignment: AlignmentType.LEFT, afterPt: 10 }),

        ...(isLegal ? [
            arialPara([
                arialBold(leg.name),
                arialRun(`, ОГРН ${leg.ogrn}, ИНН ${leg.inn}`),
                leg.kpp ? arialRun(`, КПП ${leg.kpp}`) : arialRun(''),
                arialRun(`, адрес места нахождения: ${leg.legalAddress}, в лице `),
                arialRun(`${leg.position} `),
                arialBold(leg.authName),
                arialRun(`, действующего(-ей) на основании ${leg.basis}, телефон: ${phone}, именуемое в дальнейшем `),
                arialBold('«Принципал»'),
                arialRun(', с одной стороны,'),
            ], { indent: true, afterPt: 6 }),
        ] : [
            arialPara([
                arialRun('Мы, '),
                arialBold(fullName),
                arialRun(','),
            ], { indent: true, afterPt: 3 }),
            arialPara([
                arialRun(`дата рождения: ${birthDate}, паспорт серия `),
                arialBold(series),
                arialRun(' номер '),
                arialBold(number),
                arialRun(` выдан ${issuedBy} дата выдачи: ${issueDate},`),
            ], { indent: true, afterPt: 3 }),
            arialPara([
                arialRun(`зарегистрированный(-ая) по адресу: ${regAddress},`),
            ], { indent: true, afterPt: 3 }),
            arialPara([
                arialRun(`телефон: ${phone}, именуемый(-ая) в дальнейшем `),
                arialBold('«Принципал»'),
                arialRun(', с одной стороны,'),
            ], { indent: true, afterPt: 6 }),
        ]),

        arialPara([
            arialRun('и '),
            arialBold('Индивидуальный предприниматель Муравьева Юлия Анатольевна'),
            arialRun(', ИНН 434560366213, ОГРН 323784700414782, адрес фактического местонахождения: 610000, Кировская область, г. Киров, ул. Ленина, д. 89, помещение 4; р/сч 40802810400005970330 в АО «Тинькофф Банк», БИК 044525974, к/сч 30101810145250000974., именуемая в дальнейшем '),
            arialBold('«Агент»'),
            arialRun(', с другой стороны, именуемые в дальнейшем совместно '),
            arialBold('«Стороны»'),
            arialRun(', заключили Агентский договор о следующем:'),
        ], { indent: true, afterPt: 6 }),

        arialPara([arialBold('1. Предмет договора')], { afterPt: 4, beforePt: 4 }),
        arialPara([
            arialRun('1.1. Принципал поручает, а Агент обязуется за вознаграждение осуществить поиск покупателя (правоприобретателя) на объект недвижимого имущества, имеющего следующие характеристики в Едином государственном реестре недвижимости:\n(далее – объект недвижимости).'),
        ], { indent: true, afterPt: 4 }),
        propertyTable,
        arialPara([
            arialRun('1.1.1. Ориентировочная стоимость отчуждаемого объекта недвижимости составляет '),
            arialBold(priceFormatted),
            arialRun(' '),
            arialRun(priceWords),
            arialRun(' рублей.'),
        ], { indent: true, beforePt: 4, afterPt: 3 }),
        arialPara([
            arialRun('1.1.2. При увеличении / снижении / отсутствии предложения на рынке недвижимости стороны вправе изменить стоимость объекта недвижимости путем заключения дополнительного соглашения к Агентскому договору.'),
        ], { indent: true, afterPt: 3 }),
        arialPara([
            arialRun('1.2. Принципал гарантирует, что до заключения договора недвижимое имущество никому не отчуждено. не заложено, не обещано.'),
        ], { indent: true, afterPt: 6 }),

        arialPara([arialBold('2. Обязанности сторон')], { afterPt: 4, beforePt: 4 }),
        arialPara([arialBold('2.1. Обязанности Принципала:')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.1.1. По своей воле заключить договор об отчуждении объекта недвижимого имущества (договор купли-продажи, договор участия в долевом строительстве, договор уступки прав и обязанностей и т.п., именуемый далее по тексту – сделка с объектом недвижимости), передаточный акт и иные необходимые документы, а также выполнить иные оговоренные сторонами сделки условия; предоставить заявление и иные необходимые для государственной регистрации перехода права собственности (сделки, подлежащей государственной регистрации) документы в Многофункциональный центр предоставления государственных и муниципальных услуг, Территориальный орган Федеральной службы государственной регистрации, кадастра и картографии (Росреестр), в другие организации; предоставить запрошенные Агентом необходимые документы (сведения) и т.п. до момента заключения сделки с объектом недвижимости; совершать иные законные действия, в т. ч. рекомендованные Агентом.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.1.2. В день заключения предварительного договора купли-продажи или соглашения об авансе принять составляемый Агентом Отчет о частичном исполнении Агентского договора, в день заключения сделки с объектом недвижимости принять составляемый Агентом Отчет об исполнении Агентского договора (далее – Отчеты Агента).')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.1.3. За счет собственных средств оплачивать предусмотренные действующим законодательством государственные пошлины и платы (в т.ч. за нотариальные действия), услуги кадастрового инженера, оценщика, банковские комиссии и т.п., в случае необходимости в совершении таких действий и получении указанных услуг.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.1.4. Не разглашать свои персональные и контактные данные (номер телефона, адрес проживания и/или места работы и т.д.) третьим лицам, с которыми могут возникнуть какие-либо отношения, связанные с исполнением настоящего договора (потенциальные покупатели (правоприобретатели) объекта недвижимости и иные заинтересованные лица) до момента принятия Отчета Агента.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.1.5. В период действия настоящего договора не заключать аналогичных Агентских договоров с третьими лицами и воздерживаться от самостоятельной деятельности, являющейся предметом настоящего договора (размещать объявления о реализации объекта недвижимости в сети Интернет, печатных изданиях и т.д., вести переговоры и проводить осмотры объектов недвижимости без участия Агента и т.д.).')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.1.6. Самостоятельное заключение Принципалом сделки с найденным Агентом покупателем (правоприобретателем) объекта недвижимости, его аффилированным лицом либо лицом, находящимся в родстве или свойстве, считается фактом исполнения обязательств Агентом по Агентскому договору, о чем Агентом направляется соответствующее уведомление в соответствии с порядком, установленным настоящим договором.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.1.7. Права и обязанности по сделкам, совершенным при участии Агента, возникают непосредственно у Принципала.')], { indent: true, afterPt: 6 }),

        arialPara([arialBold('2.2. Обязанности Агента:')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.2.1. Осуществить поиск (подбор) потенциального покупателя (правоприобретателя) отчуждаемого объекта недвижимости, используя все законные методы и инструменты (реклама и т.п.), вести переговоры, а также совместно с Принципалом составить проект договора о отчуждении объекта недвижимого имущества, передаточного акта и иных документов, необходимых для государственной регистрации перехода права собственности (сделки, подлежащей государственной регистрации) на объект недвижимости.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.2.2. Составить для Принципала Отчет Агента.')], { indent: true, afterPt: 6 }),

        arialPara([arialBold('3. Агентское вознаграждение и расчеты между сторонами')], { afterPt: 4, beforePt: 4 }),
        arialPara([
            arialRun('3.1. Размер вознаграждения Агента (Агентского вознаграждения) составляет: '),
            arialBold(commFormatted),
            arialRun(' '),
            arialRun(commWords),
            arialRun(' рублей, в том числе НДС 5 %.'),
        ], { indent: true, afterPt: 3 }),
        arialPara([arialRun('3.2. Принципал обязуется уплатить Агенту вознаграждение путем внесения обеспечительного платежа при заключении соглашения об авансе/обеспечительно платеже/предварительного договора о задатке с Покупателем, окончательный расчет производится в день заключения сделки с объектом недвижимости.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('3.3. Принципал обязуется уплатить Агенту вознаграждение на основании Отчета Агента в день сделки.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('3.4. Расчеты по Агентскому договору осуществляются в следующем порядке: путем внесения наличных денежных средств в кассу Агента или в безналичном порядке платежными поручениями на расчетный счет Агента.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('3.5. Обязательства Принципала по оплате считаются исполненными в момент зачисления денежных средств на расчетный счет Агента или внесения Принципалом денежных средств в кассу Агента.')], { indent: true, afterPt: 6 }),

        arialPara([arialBold('4. Ответственность сторон')], { afterPt: 4, beforePt: 4 }),
        arialPara([arialRun('4.1. При нарушении Принципалом условий настоящего договора без уважительных причин (временная нетрудоспособность и т.п.), в том числе - если он не будет присутствовать лично или не обеспечит присутствие своего уполномоченного представителя в назначенный день для совершения необходимых действий по заключению сделки с объектом недвижимости, либо заключит аналогичный Агентский договор с третьим лицом, являющуюся предметом настоящего договора, Принципал уплачивает неустойку Агенту в размере 50 (пятидесяти) процентов от установленных Агентским договором размеров Агентских вознаграждений.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('4.2. Материальная ответственность Агента перед Принципалом не может превышать размер Агентского вознаграждения.')], { indent: true, afterPt: 6 }),

        arialPara([arialBold('5. Срок действия настоящего договора')], { afterPt: 4, beforePt: 4 }),
        arialPara([
            arialRun('5.1. Настоящий договор вступает в силу с момента его заключения Сторонами и действует до '),
            arialBold(contractEndDate),
            arialRun(' включительно, а в части расчетов между сторонами – до полного исполнения всех обязательств.'),
        ], { indent: true, afterPt: 3 }),
        arialPara([arialRun('5.2. Если ни одна из Сторон не заявит о своем намерении прекратить действие договора, то настоящий договор считается возобновленным на тех же условиях и на тот же срок.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('5.3. Договор может быть изменен или расторгнут только по письменному соглашению сторон.')], { indent: true, afterPt: 6 }),

        arialPara([arialBold('6. Дополнительные условия')], { afterPt: 4, beforePt: 4 }),
        arialPara([arialRun('6.1. Все споры, возникающие при выполнении настоящего договора, решаются сторонами путем переговоров, направления и вручения письменных претензий, а при недостижении согласия – в судебном порядке, в соответствии с действующим законодательством.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('6.2. Агент вправе направить Принципалу по последнему известному ему адресу регистрации Принципала письменные сообщения и (или) электронные сообщения на указанные Принципалом мобильный номер телефона и (или) электронную почту о ходе и результатах исполнения Агентского договора. Все юридически значимые сообщения в адрес Агента должны направляться исключительно по почтовому адресу, который указан в преамбуле Агентского договора. Направление сообщения по другим адресам не может считаться надлежащим. Сообщение считается доставленным и в тех случаях, если оно поступило лицу, которому оно направлено (адресату), но по обстоятельствам, зависящим от него, не было ему вручено или адресат не ознакомился с ним.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('6.3. Настоящим пунктом Принципал подтверждает, что у него отсутствуют какие-либо обстоятельства и ситуации, которые препятствуют или могут препятствовать заключению им законным образом настоящего Агентского договора и впоследствии – сделки с объектом недвижимости.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('6.4. Принципал дает согласие на получение от Агента рекламной и иной информации, необходимой для осуществления деятельности Агента, путем направления сообщений смс на телефон, электронных писем на электронную почту, указанных Принципалом в настоящем договоре.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('6.5. Настоящим пунктом Принципал выражает свое письменное заявление о согласии на обработку и использование Агентом своих персональных данных, содержащихся в настоящем договоре и в представленных (подготовленных) документах на срок действия настоящего договора.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('6.6. Договор составлен в двух экземплярах, по одному экземпляру каждой из сторон.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('6.7. Настоящим стороны Договора заверяют и гарантируют, что они и близкие родственники не имеют гражданства иностранных(ого) государств(а), совершающих(его) в отношении Российской Федерации, российских юридических и физических лиц недружественные действия, а также местом регистрации, местом преимущественного пребывания, местом преимущественного ведения хозяйственной деятельности или извлечения прибыли от деятельности не являются(ется) указанные(ое) государства(о) и территория(ии), перечень которых установлен Распоряжением Правительства Российской Федерации от 05.03.2022 N 430-р «Об утверждении перечня иностранных государств и территорий, совершающих недружественные действия в отношении Российской Федерации, российских юридических и физических лиц».')], { indent: true, afterPt: 10 }),

        arialPara([arialBold('7. Подписи сторон')], { afterPt: 6, beforePt: 6 }),
        ...(isLegal ? [
            new Paragraph({
                children: [arialBold('Принципал:')],
                spacing: { line: 260, before: 60, after: 20 },
            }),
            new Paragraph({
                children: [arialRun(leg.name)],
                spacing: { line: 260, after: 20 },
            }),
            new Paragraph({
                children: [arialRun(`ОГРН: ${leg.ogrn}, ИНН: ${leg.inn}${leg.kpp ? `, КПП: ${leg.kpp}` : ''}`)],
                spacing: { line: 260, after: 20 },
            }),
            new Paragraph({
                children: [arialRun(`Юр. адрес: ${leg.legalAddress}`)],
                spacing: { line: 260, after: 40 },
            }),
            new Paragraph({
                children: [
                    arialRun(`${leg.position}: ____________________ / `),
                    arialBold(leg.authShort),
                    arialRun(' /    М.П.'),
                ],
                spacing: { line: 260, after: 120 },
            }),
        ] : [
            new Paragraph({
                children: [arialRun('Принципал:')],
                border: {
                    bottom: { color: '000000', space: 0, style: BorderStyle.SINGLE, size: 12 },
                },
                spacing: { line: 260, after: 0 },
            }),
            new Paragraph({
                children: [arialRun('\u00A0')],
                border: {
                    bottom: { color: '000000', space: 0, style: BorderStyle.SINGLE, size: 12 },
                },
                spacing: { line: 260, after: 0 },
            }),
            new Paragraph({
                children: [arialRun('\u00A0')],
                border: {
                    bottom: { color: '000000', space: 0, style: BorderStyle.SINGLE, size: 12 },
                },
                spacing: { line: 260, after: 0 },
            }),
            new Paragraph({
                children: [arialRun('\u00A0')],
                spacing: { line: 260, after: 120 },
            }),
        ]),
        new Paragraph({
            children: [arialRun('Агент:')],
            spacing: { line: 260, before: 60, after: 0 },
        }),
        new Paragraph({
            children: [arialRun('\u00A0')],
            border: {
                bottom: { color: '000000', space: 1, style: BorderStyle.SINGLE, size: 12 },
            },
            spacing: { line: 260, after: 0 },
        }),
    ];

    return {
        headers: {
            default: new Header({
                children: [
                    new Paragraph({
                        children: [
                            new ImageRun({
                                data: getLogoUint8Array(),
                                transformation: { width: 150, height: 124 },
                            }),
                        ],
                        spacing: { after: 120 },
                    }),
                ],
            }),
        },
        properties: {
            page: {
                margin: {
                    top: 851,
                    right: 566,
                    bottom: 851,
                    left: 1134,
                },
            },
        },
        children: bodyChildren,
    };
}

/* ─── Шаблон: АД Найм с наймодателем ─────────────────────────────────────── */

function buildAgencyRentLandlord1Contract(data) {
    const principal = data.seller || data.buyer; // Принципал (Наймодатель / Собственник)
    const p = principal?.passport_details || {};
    const deal = data.deal;
    const property = data.property;

    const fullName = fmt(principal?.full_name);
    const birthDate = principal?.birth_date ? fmtDate(principal.birth_date) : (p.birth_date ? fmtDate(p.birth_date) : '________________________________________');
    const series = fmt(p.series, '____________');
    const number = fmt(p.number, '____________');
    const issuedBy = fmt(p.issued_by, '_____________________________________________________________________ ______________________');
    const issueDate = p.issue_date ? fmtDate(p.issue_date) : '_________ года';
    const regAddress = fmt(p.registration_address || principal?.reg_address || principal?.address, '___________________________________________________________________________________________________________________');
    const phone = fmt(formatPhone(principal?.phone) || principal?.phone, '______________________________________________');

    const leg = extractLegalEntityDetails(principal, fullName);
    const isLegal = Boolean(data.isLegalEntity || leg.isLegal);

    // Характеристики объекта недвижимости для таблицы
    const propKind = formatPropertyKind(property);
    const propAddress = fmt(property?.address || property?.city, '_______________________________________________________________________________________________________________________');
    const propCadastral = property?.cadastral_number ? `, кад. № ${property.cadastral_number}` : '';
    const propertyAddressDetails = `${propAddress}${propCadastral}`;

    // Ориентировочная стоимость платы за найм/арендной платы в месяц (п. 1.1.1)
    const rawPrice = deal?.price || property?.price;
    const cleanPriceNum = rawPrice ? Number(String(rawPrice).replace(/\D/g, '')) : 0;
    const priceFormatted = cleanPriceNum > 0 ? cleanPriceNum.toLocaleString('ru-RU') : '___________________________________';
    const priceWords = cleanPriceNum > 0 ? `(${numberToWordsRu(cleanPriceNum)})` : '__________________________________________________________________________________________________________';

    // Вознаграждение Агента (п. 3.1)
    const rawComm = deal?.commission || data.property?.commission;
    const cleanComm = rawComm ? Number(String(rawComm).replace(/\D/g, '')) : 0;
    const commFormatted = cleanComm > 0 ? cleanComm.toLocaleString('ru-RU') : '_____________________________________________';
    const commWords = cleanComm > 0 ? `(${numberToWordsRu(cleanComm)})` : '_________________________________________________________________________________________________________';

    // Срок действия договора (п. 5.1)
    const rawEndDate = data.contractEndDate || deal?.contract_end_date;
    const contractEndDate = rawEndDate ? fmtDate(rawEndDate) : '__________________ г.';
    const todayStr = fmtDate(deal?.deal_date || new Date().toISOString());

    const propertyTable = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
            insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
        },
        rows: [
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 30, type: WidthType.PERCENTAGE },
                        children: [arialPara([arialBold('Вид объекта недвижимости')], { indent: false, afterPt: 2, beforePt: 2 })],
                    }),
                    new TableCell({
                        width: { size: 70, type: WidthType.PERCENTAGE },
                        children: [arialPara([arialRun(propKind)], { indent: false, afterPt: 2, beforePt: 2 })],
                    }),
                ],
            }),
            new TableRow({
                children: [
                    new TableCell({
                        width: { size: 30, type: WidthType.PERCENTAGE },
                        children: [arialPara([arialBold('Адрес (местоположение)')], { indent: false, afterPt: 2, beforePt: 2 })],
                    }),
                    new TableCell({
                        width: { size: 70, type: WidthType.PERCENTAGE },
                        children: [arialPara([arialRun(propertyAddressDetails)], { indent: false, afterPt: 2, beforePt: 2 })],
                    }),
                ],
            }),
        ],
    });

    const bodyChildren = [
        arialPara([arialBold('Агентский договор')], { alignment: AlignmentType.CENTER, afterPt: 6 }),
        arialPara([
            arialRun('Город Киров, Кировская область                                                        '),
            arialRun(`«${todayStr}»`),
        ], { alignment: AlignmentType.LEFT, afterPt: 10 }),

        ...(isLegal ? [
            arialPara([
                arialBold(leg.name),
                arialRun(`, ОГРН ${leg.ogrn}, ИНН ${leg.inn}`),
                leg.kpp ? arialRun(`, КПП ${leg.kpp}`) : arialRun(''),
                arialRun(`, адрес места нахождения: ${leg.legalAddress}, в лице `),
                arialRun(`${leg.position} `),
                arialBold(leg.authName),
                arialRun(`, действующего(-ей) на основании ${leg.basis}, телефон: ${phone}, именуемое в дальнейшем `),
                arialBold('«Принципал»'),
                arialRun(', с одной стороны,'),
            ], { indent: true, afterPt: 6 }),
        ] : [
            arialPara([
                arialRun('Мы, Гр. '),
                arialBold(fullName),
                arialRun(`, дата рождения: ${birthDate}, паспорт РФ серия `),
                arialBold(series),
                arialRun(' номер '),
                arialBold(number),
                arialRun(` выдан ${issueDate} года ${issuedBy} зарегистрированный(-ая) по адресу: ${regAddress}`),
            ], { indent: true, afterPt: 3 }),
            arialPara([
                arialRun('именуемый(-ая,-ые) в дальнейшем '),
                arialBold('«Принципал»'),
                arialRun(', с одной стороны,'),
            ], { indent: true, afterPt: 6 }),
        ]),

        arialPara([
            arialRun('и '),
            arialBold('Индивидуальный предприниматель Муравьева Юлия Анатольевна'),
            arialRun(', ИНН 434560366213, ОГРН 323784700414782, адрес фактического местонахождения: 610000, Кировская область, г. Киров, ул. Ленина, д. 89, помещение 4; р/сч 40802810400005970330 в АО «Тинькофф Банк», БИК 044525974, к/сч 30101810145250000974., именуемая в дальнейшем '),
            arialBold('«Агент»'),
            arialRun(', с другой стороны, именуемые в дальнейшем совместно '),
            arialBold('«Стороны»'),
            arialRun(', заключили Агентский договор о следующем:'),
        ], { indent: true, afterPt: 6 }),

        arialPara([arialBold('1. Предмет договора')], { afterPt: 4, beforePt: 4 }),
        arialPara([
            arialRun('1.1. Принципал поручает, а Агент обязуется за вознаграждение осуществить поиск нанимателя/арендатора на объект недвижимого имущества, имеющего следующие характеристики в Едином государственном реестре недвижимости:\n(далее – объект недвижимости).'),
        ], { indent: true, afterPt: 4 }),
        propertyTable,
        arialPara([
            arialRun('1.1.1. Ориентировочная стоимость платы за найм/арендной платы в месяц составляет: '),
            arialBold(priceFormatted),
            arialRun(' '),
            arialRun(priceWords),
            arialRun(' рублей.'),
        ], { indent: true, beforePt: 4, afterPt: 3 }),
        arialPara([
            arialRun('1.1.2. При увеличении / снижении / отсутствии предложения на рынке недвижимости стороны вправе изменить стоимость, указанную в п. 1.1.1 настоящего договора.'),
        ], { indent: true, afterPt: 3 }),
        arialPara([
            arialRun('1.2. Принципал гарантирует, что до заключения договора недвижимое имущество никому не отчуждено. не заложено, не обещано, в найм и аренду не передано.'),
        ], { indent: true, afterPt: 6 }),

        arialPara([arialBold('2. Обязанности сторон')], { afterPt: 4, beforePt: 4 }),
        arialPara([arialBold('2.1. Обязанности Принципала:')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.1.1. По своей воле заключить договор найма жилого помещения/аренды нежилого помещения (именуемый далее по тексту – сделка с объектом недвижимости), передаточный акт и иные необходимые документы, а также выполнить иные оговоренные сторонами сделки условия; совершать иные законные действия, в т. ч. рекомендованные Агентом.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.1.2. В день заключения сделки с объектом недвижимости принять составляемый Агентом Отчет об исполнении Агентского договора (далее – Отчет Агента).')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.1.3. Не разглашать свои персональные и контактные данные (номер телефона, адрес проживания и/или места работы и т.д.) третьим лицам, с которыми могут возникнуть какие-либо отношения, связанные с исполнением настоящего договора до момента принятия Отчета Агента.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.1.4. В период действия настоящего договора не заключать аналогичных Агентских договоров с третьими лицами и воздерживаться от самостоятельной деятельности, являющейся предметом настоящего договора (размещать объявления о реализации объекта недвижимости в сети Интернет, печатных изданиях и т.д., вести переговоры и проводить осмотры объектов недвижимости без участия Агента и т.д.).')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.1.5. Самостоятельное заключение Принципалом сделки с найденным Агентом нанимателем/арендатором (объекта недвижимости, его аффилированным лицом либо лицом, находящимся в родстве или свойстве, считается фактом исполнения обязательств Агентом по Агентскому договору, о чем Агентом направляется соответствующее уведомление в соответствии с порядком, установленным настоящим договором.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.1.6. Права и обязанности по сделкам, совершенным при участии Агента, возникают непосредственно у Принципала.')], { indent: true, afterPt: 6 }),

        arialPara([arialBold('2.2. Обязанности Агента:')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.2.1. Осуществить поиск (подбор) потенциального нанимателя/арендатора отчуждаемого объекта недвижимости, используя все законные методы и инструменты (реклама и т.п.), вести переговоры, а также составить проект договора найма жилого помещения/аренды нежилого помещения, передаточного акта и иных документов, необходимых для заключения сделки.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('2.2.2. В день исполнения обязательств по Агентскому договору составить для Принципала Отчет Агента.')], { indent: true, afterPt: 6 }),

        arialPara([arialBold('3. Агентское вознаграждение и расчеты между сторонами')], { afterPt: 4, beforePt: 4 }),
        arialPara([
            arialRun('3.1. Размер вознаграждения Агента (Агентского вознаграждения) составляет: '),
            arialBold(commFormatted),
            arialRun(' '),
            arialRun(commWords),
            arialRun(' рублей, в том числе НДС 5 %.'),
        ], { indent: true, afterPt: 3 }),
        arialPara([arialRun('3.2. Настоящим пунктом Принципал предоставляет Агенту право получить с нанимателя/арендатора объекта недвижимости аванс в сумме, не превышающей размер агентского вознаграждения, в счет частичной оплаты его стоимости. Полученный Агентом аванс засчитывается в счет стоимости агентского вознаграждения, подлежащего оплате Принципалом.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('3.3. Принципал обязуется уплатить Агенту вознаграждение на основании Отчета Агента в день заключения сделки с объектом недвижимости.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('3.4. Расчеты по Агентскому договору осуществляются в следующем порядке: путем внесения наличных денежных средств в кассу Агента или в безналичном порядке платежными поручениями на расчетный счет Агента.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('3.5. Обязательства Принципала по оплате считаются исполненными в момент зачисления денежных средств на расчетный счет Агента или внесения Принципалом денежных средств в кассу Агента.')], { indent: true, afterPt: 6 }),

        arialPara([arialBold('4. Ответственность сторон')], { afterPt: 4, beforePt: 4 }),
        arialPara([arialRun('4.1. При нарушении Принципалом условий настоящего договора без уважительных причин (временная нетрудоспособность и т.п.), в том числе - если он не будет присутствовать лично или не обеспечит присутствие своего уполномоченного представителя в назначенный день для совершения необходимых действий по заключению сделки с объектом недвижимости, либо заключит аналогичный Агентский договор с третьим лицом или будет осуществлять самостоятельную деятельность, являющуюся предметом настоящего договора, Принципал уплачивает неустойку Агенту в размере 50 (пятидесяти) процентов от установленных Агентским договором размеров Агентских вознаграждений.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('4.2. Материальная ответственность Агента перед Принципалом не может превышать размер Агентского вознаграждения.')], { indent: true, afterPt: 6 }),

        arialPara([arialBold('5. Срок действия настоящего договора')], { afterPt: 4, beforePt: 4 }),
        arialPara([
            arialRun('5.1. Настоящий договор вступает в силу с момента его заключения Сторонами и действует до '),
            arialBold(contractEndDate),
            arialRun(' включительно, а в части расчетов между сторонами – до полного исполнения всех обязательств.'),
        ], { indent: true, afterPt: 3 }),
        arialPara([arialRun('5.2. Если ни одна из Сторон не заявит о своем намерении прекратить действие договора, то настоящий договор считается возобновленным на тех же условиях и на тот же срок.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('5.3. Договор может быть изменен или расторгнут только по письменному соглашению сторон.')], { indent: true, afterPt: 6 }),

        arialPara([arialBold('6. Дополнительные условия')], { afterPt: 4, beforePt: 4 }),
        arialPara([arialRun('6.1. Все споры, возникающие при выполнении настоящего договора, решаются сторонами путем переговоров, направления и вручения письменных претензий, а при недостижении согласия – в судебном порядке, в соответствии с действующим законодательством.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('6.2. Агент вправе направить Принципалу по последнему известному ему адресу регистрации Принципала письменные сообщения и (или) электронные сообщения на указанные Принципалом мобильный номер телефона и (или) электронную почту о ходе и результатах исполнения Агентского договора. Все юридически значимые сообщения в адрес Агента должны направляться исключительно по почтовому адресу, который указан в преамбуле Агентского договора. Направление сообщения по другим адресам не может считаться надлежащим. Сообщение считается доставленным и в тех случаях, если оно поступило лицу, которому оно направлено (адресату), но по обстоятельствам, зависящим от него, не было ему вручено или адресат не ознакомился с ним.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('6.3. Настоящим пунктом Принципал подтверждает, что у него отсутствуют какие-либо обстоятельства и ситуации, которые препятствуют или могут препятствовать заключению им законным образом настоящего Агентского договора и впоследствии – сделки с объектом недвижимости.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('6.4. Принципал дает согласие на получение от Агента рекламной и иной информации, необходимой для осуществления деятельности Агента, путем направления сообщений смс на телефон, электронных писем на электронную почту, указанных Принципалом в настоящем договоре.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('6.5. Настоящим пунктом Принципал выражает свое письменное заявление о согласии на обработку и использование Агентом своих персональных данных, содержащихся в настоящем договоре и в представленных (подготовленных) документах на срок, необходимый для исполнения Агентского договора.')], { indent: true, afterPt: 3 }),
        arialPara([arialRun('6.6. Договор составлен в двух экземплярах, по одному экземпляру каждой из сторон.')], { indent: true, afterPt: 10 }),

        arialPara([arialBold('7. Подписи сторон')], { afterPt: 6, beforePt: 6 }),
        ...(isLegal ? [
            new Paragraph({
                children: [arialBold('Принципал:')],
                spacing: { line: 260, before: 60, after: 20 },
            }),
            new Paragraph({
                children: [arialRun(leg.name)],
                spacing: { line: 260, after: 20 },
            }),
            new Paragraph({
                children: [arialRun(`ОГРН: ${leg.ogrn}, ИНН: ${leg.inn}${leg.kpp ? `, КПП: ${leg.kpp}` : ''}`)],
                spacing: { line: 260, after: 20 },
            }),
            new Paragraph({
                children: [arialRun(`Юр. адрес: ${leg.legalAddress}`)],
                spacing: { line: 260, after: 40 },
            }),
            new Paragraph({
                children: [
                    arialRun(`${leg.position}: ____________________ / `),
                    arialBold(leg.authShort),
                    arialRun(' /    М.П.'),
                ],
                spacing: { line: 260, after: 120 },
            }),
        ] : [
            new Paragraph({
                children: [arialRun('Принципал:')],
                border: {
                    bottom: { color: '000000', space: 0, style: BorderStyle.SINGLE, size: 12 },
                },
                spacing: { line: 260, after: 0 },
            }),
            new Paragraph({
                children: [arialRun('\u00A0')],
                border: {
                    bottom: { color: '000000', space: 0, style: BorderStyle.SINGLE, size: 12 },
                },
                spacing: { line: 260, after: 0 },
            }),
            new Paragraph({
                children: [arialRun('\u00A0')],
                border: {
                    bottom: { color: '000000', space: 0, style: BorderStyle.SINGLE, size: 12 },
                },
                spacing: { line: 260, after: 0 },
            }),
            new Paragraph({
                children: [arialRun('\u00A0')],
                spacing: { line: 260, after: 120 },
            }),
        ]),
        new Paragraph({
            children: [arialRun('Агент:')],
            spacing: { line: 260, before: 60, after: 0 },
        }),
        new Paragraph({
            children: [arialRun('\u00A0')],
            border: {
                bottom: { color: '000000', space: 1, style: BorderStyle.SINGLE, size: 12 },
            },
            spacing: { line: 260, after: 0 },
        }),
    ];

    return {
        headers: {
            default: new Header({
                children: [
                    new Paragraph({
                        children: [
                            new ImageRun({
                                data: getLogoUint8Array(),
                                transformation: { width: 150, height: 124 },
                            }),
                        ],
                        spacing: { after: 120 },
                    }),
                ],
            }),
        },
        properties: {
            page: {
                margin: {
                    top: 851,
                    right: 566,
                    bottom: 851,
                    left: 1134,
                },
            },
        },
        children: bodyChildren,
    };
}

/* ─── Шаблон: Договор купли-продажи ─────────────────────────────────────── */

function buildSaleContract(data) {
    const { seller, buyer, property, realtor, agencyName, deal } = data;

    const sellerName = fmt(seller?.full_name);
    const buyerName = fmt(buyer?.full_name);
    const sellerPassport = fmtPassport(seller);
    const buyerPassport = fmtPassport(buyer);
    const address = fmt(property?.address || property?.city);
    const cadastral = fmt(property?.cadastral_number);
    const area = fmt(property?.area_total);
    const price = deal?.price || property?.price;
    const dealDate = fmtDate(deal?.deal_date);
    const realtorName = fmt(realtor?.full_name);
    const agency = fmt(agencyName || realtor?.agency_name);

    return [
        para([boldRun('ДОГОВОР КУПЛИ-ПРОДАЖИ НЕДВИЖИМОСТИ')], { alignment: AlignmentType.CENTER }),
        para([
            normalRun('г. Москва                                                                 '),
            normalRun(`«${dealDate}»`),
        ], { alignment: AlignmentType.LEFT }),
        para(''),
        para([
            normalRun('Мы, нижеподписавшиеся:'),
        ]),
        para([
            normalRun('Гр. '),
            boldRun(sellerName),
            normalRun(`, ${sellerPassport}, именуемый(ая) в дальнейшем `),
            boldRun('«Продавец»'),
            normalRun(', с одной стороны, и'),
        ], { indent: true }),
        para([
            normalRun('Гр. '),
            boldRun(buyerName),
            normalRun(`, ${buyerPassport}, именуемый(ая) в дальнейшем `),
            boldRun('«Покупатель»'),
            normalRun(', с другой стороны,'),
        ], { indent: true }),
        para([
            normalRun(`при посредничестве Агентства недвижимости «${agency}» в лице риелтора `),
            boldRun(realtorName),
            normalRun(', заключили настоящий Договор о нижеследующем:'),
        ], { indent: true }),

        sectionTitle('1. ПРЕДМЕТ ДОГОВОРА'),
        para([
            normalRun('1.1. Продавец продает, а Покупатель покупает в собственность недвижимое имущество (далее – «Объект»):'),
        ], { indent: true }),
        para([normalRun(`Адрес: ${address}`)], { indent: true }),
        ...(cadastral !== '________________________' ? [para([normalRun(`Кадастровый номер: ${cadastral}`)], { indent: true })] : []),
        ...(area !== '________________________' ? [para([normalRun(`Общая площадь: ${area} кв. м.`)], { indent: true })] : []),

        sectionTitle('2. ЦЕНА И ПОРЯДОК РАСЧЕТОВ'),
        para([
            normalRun('2.1. Объект продается за цену в размере '),
            boldRun(fmtPrice(price)),
            normalRun(` (${priceInWords(price)}).`),
        ], { indent: true }),
        para([
            normalRun('2.2. Покупатель обязуется выплатить указанную сумму в течение ___ банковских дней с момента регистрации перехода права собственности.'),
        ], { indent: true }),

        sectionTitle('3. ПОДПИСИ СТОРОН'),
        sigLine('Продавец', sellerName),
        sigLine('Покупатель', buyerName),
        sigLine('Риелтор', realtorName),
    ];
}

/* ─── Шаблон: Договор аренды ─────────────────────────────────────────────── */

function buildRentContract(data) {
    const { seller: landlord, buyer: tenant, property, realtor, agencyName, deal } = data;

    const landlordName = fmt(landlord?.full_name);
    const tenantName = fmt(tenant?.full_name);
    const landlordPassport = fmtPassport(landlord);
    const tenantPassport = fmtPassport(tenant);
    const address = fmt(property?.address || property?.city);
    const price = deal?.price || property?.price;
    const dealDate = fmtDate(deal?.deal_date);
    const realtorName = fmt(realtor?.full_name);
    const agency = fmt(agencyName || realtor?.agency_name);

    return [
        para([boldRun('ДОГОВОР АРЕНДЫ ЖИЛОГО ПОМЕЩЕНИЯ')], { alignment: AlignmentType.CENTER }),
        para([
            normalRun('г. Москва                                                                 '),
            normalRun(`«${dealDate}»`),
        ], { alignment: AlignmentType.LEFT }),
        para(''),
        para([
            normalRun('Гр. '),
            boldRun(landlordName),
            normalRun(`, ${landlordPassport}, именуемый(ая) в дальнейшем `),
            boldRun('«Наймодатель»'),
            normalRun(', с одной стороны, и'),
        ], { indent: true }),
        para([
            normalRun('Гр. '),
            boldRun(tenantName),
            normalRun(`, ${tenantPassport}, именуемый(ая) в дальнейшем `),
            boldRun('«Наниматель»'),
            normalRun(', с другой стороны,'),
        ], { indent: true }),
        para([
            normalRun(`при содействии риелтора `),
            boldRun(realtorName),
            normalRun(` (Агентство недвижимости «${agency}»), заключили настоящий Договор о нижеследующем:`),
        ], { indent: true }),

        sectionTitle('1. ПРЕДМЕТ ДОГОВОРА'),
        para([
            normalRun('1.1. Наймодатель предоставляет Нанимателю за плату во владение и пользование жилое помещение по адресу: '),
            boldRun(address),
            normalRun('.'),
        ], { indent: true }),

        sectionTitle('2. АРЕНДНАЯ ПЛАТА'),
        para([
            normalRun('2.1. Ежемесячная плата за пользование помещением составляет '),
            boldRun(fmtPrice(price)),
            normalRun(` (${priceInWords(price)}).`),
        ], { indent: true }),
        para([
            normalRun('2.2. Арендная плата вносится ежемесячно не позднее ___ числа каждого месяца.'),
        ], { indent: true }),

        sectionTitle('3. ПОДПИСИ СТОРОН'),
        sigLine('Наймодатель', landlordName),
        sigLine('Наниматель', tenantName),
        sigLine('Риелтор', realtorName),
    ];
}

/* ─── Шаблон: Акт приема-передачи ───────────────────────────────────────── */

function buildHandoverAct(data) {
    const { seller, buyer, property, realtor, agencyName, deal } = data;

    const sellerName = fmt(seller?.full_name);
    const buyerName = fmt(buyer?.full_name);
    const address = fmt(property?.address || property?.city);
    const dealDate = fmtDate(deal?.deal_date);
    const handoverDate = fmtDate(deal?.handover_date || deal?.deal_date);
    const realtorName = fmt(realtor?.full_name);
    const agency = fmt(agencyName || realtor?.agency_name);

    return [
        para([boldRun('АКТ ПРИЕМА-ПЕРЕДАЧИ ОБЪЕКТА НЕДВИЖИМОСТИ')], { alignment: AlignmentType.CENTER }),
        para([
            normalRun('г. Москва                                                                 '),
            normalRun(`«${handoverDate}»`),
        ], { alignment: AlignmentType.LEFT }),
        para(''),
        para([
            normalRun('Мы, нижеподписавшиеся, '),
            normalRun('Гр. '),
            boldRun(sellerName),
            normalRun(' (Продавец/Наймодатель), с одной стороны, и Гр. '),
            boldRun(buyerName),
            normalRun(' (Покупатель/Наниматель), с другой стороны, составили настоящий Акт о том, что в соответствии с Договором от '),
            normalRun(`«${dealDate}»:`),
        ]),
        para(''),
        para([
            normalRun('1. Продавец/Наймодатель передал, а Покупатель/Наниматель принял недвижимое имущество по адресу: '),
            boldRun(address),
            normalRun('.'),
        ], { indent: true }),
        para([
            normalRun('2. Состояние имущества соответствует условиям договора. Стороны претензий друг к другу не имеют.'),
        ], { indent: true }),
        para([
            normalRun(`3. Передачу осуществил в присутствии риелтора `),
            boldRun(realtorName),
            normalRun(` (Агентство недвижимости «${agency}»).`),
        ], { indent: true }),

        sectionTitle('ПОДПИСИ СТОРОН'),
        sigLine('Передал', sellerName),
        sigLine('Принял', buyerName),
        sigLine('Риелтор', realtorName),
    ];
}

/* ─── Шаблон: ДОУ Аренда / найм 3-сторонний (Исполнитель 1: ИП, Исполнитель 2: Риэлтор-самозанятый, Заказчик) ── */

export function buildServicesRent3PartyContract(data) {
    const customer = data.buyer || data.seller;
    const cp = customer?.passport_details || {};
    const realtor = data.realtor || {};
    const rp = realtor?.passport_details || {};
    const deal = data.deal;

    const dealDate = fmtDate(deal?.deal_date || data.contractDate || new Date().toISOString());
    const rawEndDate = data.contractEndDate || deal?.contract_end_date;
    const contractEndDate = rawEndDate ? fmtDate(rawEndDate) : '«___» ____________ 20___ г.';
    const actDate = data.actDate ? fmtDate(data.actDate) : dealDate;
    const contractNumber = data.deal?.contract_number || data.contractNumber || '________';

    // Реквизиты Исполнителя 2 (из профиля или generatorData)
    const realtorTaxStatus = data.realtorTaxStatus || realtor?.tax_status || rp?.tax_status || 'Самозанятый';
    const isRealtorSelfEmployed = Boolean(
        data.isRealtorSelfEmployed !== undefined 
            ? data.isRealtorSelfEmployed 
            : (realtorTaxStatus || '').toLowerCase().includes('самозанят')
    );
    const realtorPrefix = isRealtorSelfEmployed ? 'Самозанятый ' : (realtorTaxStatus === 'Индивидуальный предприниматель' ? 'Индивидуальный предприниматель ' : 'Гр. ');
    const realtorFullName = fmt(realtor?.full_name);
    const realtorBirth = realtor?.birth_date ? fmtDate(realtor.birth_date) : (rp.birth_date ? fmtDate(rp.birth_date) : '__________________');
    const realtorSeries = fmt(rp.series, '______');
    const realtorNumber = fmt(rp.number, '_________');
    const realtorIssuedBy = fmt(rp.issued_by, '__________________________________________________');
    const realtorIssueDate = rp.issue_date ? fmtDate(rp.issue_date) : '_______________';
    const realtorRegAddress = fmt(rp.registration_address || realtor?.reg_address || realtor?.address, '___________________________');
    const realtorPhone = fmt(realtor?.phone ? formatPhone(realtor.phone, true) : '', '_________________');
    const realtorInn = realtor?.inn ? `ИНН ${realtor.inn}` : 'ИНН _________________';
    const realtorShort = toShortName(realtorFullName);

    // Реквизиты Заказчика
    const customerFullName = fmt(customer?.full_name);
    const leg = extractLegalEntityDetails(customer, customerFullName);
    const isCustomerLegal = Boolean(data.isLegalEntity || leg.isLegal);

    const customerBirth = customer?.birth_date ? fmtDate(customer.birth_date) : (cp.birth_date ? fmtDate(cp.birth_date) : '_________________');
    const customerSeries = fmt(cp.series, '______');
    const customerNumber = fmt(cp.number, '_________');
    const customerIssuedBy = fmt(cp.issued_by, '__________________________________________________');
    const customerIssueDate = cp.issue_date ? fmtDate(cp.issue_date) : '_______________';
    const customerRegAddress = fmt(cp.registration_address || customer?.reg_address || customer?.address, '___________________________');
    const customerPhone = fmt(customer?.phone ? formatPhone(customer.phone, true) : '', '_________________');
    const customerEmail = fmt(customer?.email, '_________________');
    const customerShort = toShortName(customerFullName);

    // Оплата услуг (п. 3.2 и 3.3)
    const rawS1 = data.service1Cost !== undefined && data.service1Cost !== '' ? data.service1Cost : deal?.service1_cost;
    const cleanS1 = rawS1 ? Number(String(rawS1).replace(/\D/g, '')) : 0;
    const s1Formatted = cleanS1 > 0 ? cleanS1.toLocaleString('ru-RU') : '________________________';
    const s1Words = cleanS1 > 0 ? `(${numberToWordsRu(cleanS1)})` : '_______________________________________________________________________';

    const rawS2 = data.service2Cost !== undefined && data.service2Cost !== '' ? data.service2Cost : (deal?.service2_cost || deal?.commission);
    const cleanS2 = rawS2 ? Number(String(rawS2).replace(/\D/g, '')) : 0;
    const s2Formatted = cleanS2 > 0 ? cleanS2.toLocaleString('ru-RU') : '________________________';
    const s2Words = cleanS2 > 0 ? `(${numberToWordsRu(cleanS2)})` : '_______________________________________________________________________';

    return [
        para([boldRun('ДОГОВОР ОКАЗАНИЯ УСЛУГ')], { alignment: AlignmentType.CENTER, afterPt: 10 }),
        new Paragraph({
            children: [
                normalRun('Город Киров, Кировская область'),
                normalRun('                                                                                        '),
                normalRun(`«${dealDate}»`),
            ],
            alignment: AlignmentType.LEFT,
            spacing: { after: 200 },
        }),
        para([
            boldRun('Индивидуальный предприниматель Муравьева Юлия Анатольевна'),
            normalRun(', ИНН 434560366213, ОГРН 323784700414782, адрес фактического местонахождения: 610000, Кировская область, г. Киров, ул. Ленина, д. 89, помещение 4; р/сч 40802810400005970330 в АО «Тинькофф Банк», БИК 044525974, к/сч 30101810145250000974, с одной стороны, именуемая в дальнейшем '),
            boldRun('«Исполнитель 1»'),
            normalRun(','),
        ], { indent: true, afterPt: 6 }),
        para([
            normalRun(realtorPrefix),
            boldRun(realtorFullName),
            normalRun(`, дата рождения: ${realtorBirth}, паспорт РФ серия `),
            boldRun(realtorSeries),
            normalRun(' номер '),
            boldRun(realtorNumber),
            normalRun(`, выдан ${realtorIssuedBy} дата выдачи: ${realtorIssueDate}, зарегистрированный(-ая) по адресу: ${realtorRegAddress}, телефон: ${realtorPhone}, ${realtorInn}, ${isRealtorSelfEmployed ? 'действующий(-ая) в качестве плательщика налога на профессиональный доход (самозанятый), ' : ''}со второй стороны, именуемый(-ая) в дальнейшем `),
            boldRun('«Исполнитель 2»'),
            normalRun(','),
        ], { indent: true, afterPt: 6 }),
        isCustomerLegal
            ? para([
                boldRun(leg.name),
                normalRun(`, ОГРН ${leg.ogrn}, ИНН ${leg.inn}${leg.kpp ? `, КПП ${leg.kpp}` : ''}, адрес местонахождения: ${leg.legalAddress}, в лице ${leg.position} `),
                boldRun(leg.authName),
                normalRun(`, действующего(-ей) на основании ${leg.basis}, далее по тексту `),
                boldRun('«Заказчик»'),
                normalRun(', с третьей стороны, вместе именуемые «Стороны», а по отдельности «Сторона», заключили настоящий договор (далее договор) о нижеследующем:'),
            ], { indent: true, afterPt: 10 })
            : para([
                normalRun('Гр. '),
                boldRun(customerFullName),
                normalRun(', паспорт серия '),
                boldRun(customerSeries),
                normalRun(' номер '),
                boldRun(customerNumber),
                normalRun(` выдан ${customerIssuedBy} дата выдачи: ${customerIssueDate}, зарегистрированный (-ая) по адресу: ${customerRegAddress}, дата рождения: ${customerBirth}, телефон: ${customerPhone}, адрес эл. почты: ${customerEmail}, далее по тексту `),
                boldRun('«Заказчик»'),
                normalRun(', с третьей стороны, вместе именуемые «Стороны», а по отдельности «Сторона», заключили настоящий договор (далее договор) о нижеследующем:'),
            ], { indent: true, afterPt: 10 }),

        para([boldRun('1. ПРЕДМЕТ ДОГОВОРА')], { afterPt: 4, beforePt: 6 }),
        para('1.1. Предметом Договора в отношении Исполнителя 1 является:', { indent: true, afterPt: 3 }),
        para('1.1.1. Организовать просмотры вариантов объектов недвижимости, извещая о времени и месте просмотра Заказчика.', { indent: true, afterPt: 3 }),
        para('1.1.2. Согласовать место и время проведения переговоров с арендодателем/наймодателем Объекта.', { indent: true, afterPt: 3 }),
        para('1.1.3. Правовая экспертиза договоров.', { indent: true, afterPt: 3 }),
        para('1.2. Предметом Договора в отношении Исполнителя 2 является:', { indent: true, afterPt: 3 }),
        para('1.2.1. Консультирование Заказчика по правовым, организационным и маркетинговым аспектам совершения сделок на рынке недвижимости, а также информирование его о правилах и особенностях совершения сделок по аренде недвижимого имущества.', { indent: true, afterPt: 3 }),
        para('1.2.2. Определение реалистичной цены и реалистичных условий аренды, на основании финансовых возможностей Заказчика и ценовой конъюнктуры рынка.', { indent: true, afterPt: 3 }),
        para('1.2.3. Анализ рынка недвижимости, выявление вариантов объектов.', { indent: true, afterPt: 3 }),
        para('1.2.4. Подготовка, составление и заполнение документов для проведения сделки по аренде/найму объекта недвижимости между Заказчиком и Арендодателем/Наймодателем выбранного Заказчиком объекта недвижимости.', { indent: true, afterPt: 3 }),
        para([
            normalRun('1.3. Услуги оказываются Исполнителями в период с момента заключения Договора до '),
            boldRun(contractEndDate),
            normalRun('. Если ни одна из Сторон не заявит о своем намерении прекратить действие договора, то настоящий договор считается возобновленным на тех же условиях и на тот же срок.'),
        ], { indent: true, afterPt: 8 }),

        para([boldRun('2. ОБЯЗАННОСТИ СТОРОН')], { afterPt: 4, beforePt: 6 }),
        para('2.1. Исполнитель 1 обязан:', { indent: true, afterPt: 3 }),
        para('2.1.1. Оказать Заказчику услуги, перечисленные в п.1.1. Договора на условиях, установленных в разделах 2-4 Договора.', { indent: true, afterPt: 3 }),
        para('2.1.2. Составить и направить Заказчику Акт выполненных работ.', { indent: true, afterPt: 3 }),
        para('2.2. Исполнитель 2 обязан:', { indent: true, afterPt: 3 }),
        para('2.2.1. Оказать Заказчику услуги, перечисленные в п.1.2. Договора на условиях, установленных в разделах 2-4 Договора.', { indent: true, afterPt: 3 }),
        para('2.2.2. Составить и направить Заказчику Акт выполненных работ.', { indent: true, afterPt: 3 }),
        para('2.3. Заказчик Обязан:', { indent: true, afterPt: 3 }),
        para('2.3.1. Проводить действия, связанные с поиском Объекта только при содействии Исполнителя.', { indent: true, afterPt: 3 }),
        para('2.3.2. Оплатить Исполнителям вознаграждение в размере и в сроки, предусмотренные настоящим договором.', { indent: true, afterPt: 3 }),
        para('2.3.3. Сохранять конфиденциальность предоставленной ему информации и передавать ее третьим лицам, без согласия Исполнителей.', { indent: true, afterPt: 3 }),
        para('2.3.4. Не заключать договоры аналогичные настоящему Договору с другими физическими и/или юридическими лицами до истечения срока действия Договора.', { indent: true, afterPt: 3 }),
        para('2.3.5. Предоставить Исполнителям информацию и документы, необходимые для надлежащего исполнения Договора.', { indent: true, afterPt: 3 }),
        para('2.3.6. Незамедлительно информировать Исполнителей обо всех обстоятельствах, влияющих на совершение сделки по аренде/найме Объекта.', { indent: true, afterPt: 3 }),
        para('2.3.7. Своевременно являться для просмотров вариантов объектов недвижимости, подписания необходимых документов, в том числе Актов осмотра объектов недвижимости, и заключения договора о аренде/найме Объекта.', { indent: true, afterPt: 3 }),
        para('2.3.8. В случае выбора из представленных вариантов объектов недвижимости Объекта с целью его аренды/найма оповестить об этом Исполнителей.', { indent: true, afterPt: 3 }),
        para('2.3.9. Не вести самостоятельно никаких переговоров с собственником (-ами) Объекта.', { indent: true, afterPt: 3 }),
        para('2.3.10. В случае возникновения такой необходимости, оплатить расходы по оформлению договора аренды/найма Объекта и возможной последующей регистрации обременения.', { indent: true, afterPt: 3 }),
        para('2.3.11. В день заключения договора аренды/найма подписать Акт об оказании услуг с Исполнителем 1. Если Акт выполненных работ не будет подписан, а также не будут предоставлены мотивированные возражения Заказчика от подписания Акта, Акт считается подписанным Заказчиком, а Услуги, указанные в Акте принятыми Заказчиком, что является основанием для оплаты услуг Исполнителя.', { indent: true, afterPt: 3 }),
        para('2.3.12. В день заключения договора аренды/найма подписать Акт об оказании услуг с Исполнителем 2. Если Акт выполненных работ не будет подписан, а также не будут предоставлены мотивированные возражения Заказчика от подписания Акта, Акт считается подписанным Заказчиком, а Услуги, указанные в Акте принятыми Заказчиком, что является основанием для оплаты услуг Исполнителя.', { indent: true, afterPt: 8 }),

        para([boldRun('3. ОПЛАТА УСЛУГ')], { afterPt: 4, beforePt: 6 }),
        para('3.1. Оплата Исполнителю 1 и Исполнителю 2 производится Заказчиком индивидуально.', { indent: true, afterPt: 3 }),
        para([
            normalRun('3.2. Стоимость услуг, оказываемых Исполнителем 1 по настоящему Договору, определена сторонами в сумме '),
            boldRun(s1Formatted),
            normalRun(' '),
            normalRun(s1Words),
            normalRun(' рублей, в том числе НДС 5%.'),
        ], { indent: true, afterPt: 3 }),
        para([
            normalRun('3.3. Стоимость услуг, оказываемых Исполнителем 2 по настоящему Договору, определена сторонами в сумме '),
            boldRun(s2Formatted),
            normalRun(' '),
            normalRun(s2Words),
            normalRun(' рублей.'),
        ], { indent: true, afterPt: 3 }),
        para('3.4. Услуги Исполнителей оплачиваются в день подписания договора аренды/найма.', { indent: true, afterPt: 8 }),

        para([boldRun('4. РАЗЪЯСНЕНИЯ, ГАРАНТИИ И ПОДТВЕРЖДЕНИЯ СТОРОН')], { afterPt: 4, beforePt: 6 }),
        para('4.1. В случае неисполнения обязательств по настоящему договору Стороны несут ответственность в порядке и по основаниям, предусмотренным действующим законодательством РФ.', { indent: true, afterPt: 3 }),
        para('4.2. В случае отказа Заказчика от аренды/найма Объекта по причине, не связанной с действиями Арендодателя/Наймодателя Объекта, либо уклонения от аренды/найма данного Объекта, в том числе при неявке на заключение договора о аренде/найме Объекта, Заказчик обязан уплатить Исполнителям вознаграждение соразмерно оказанным на момент прекращения Договора услугам, размер которого в любом случае не может составлять менее 50% от сумм, указанных в п. 3 настоящего договора.', { indent: true, afterPt: 8 }),

        para([boldRun('5. ЗАКЛЮЧИТЕЛЬНЫЕ ПОЛОЖЕНИЯ')], { afterPt: 4, beforePt: 6 }),
        para('5.1. Стороны гарантируют друг другу конфиденциальность условий договора и предстоящих сделок.', { indent: true, afterPt: 3 }),
        para('5.2. Исполнители не несут ответственности за задержку выдачи документов регистрирующим органом.', { indent: true, afterPt: 3 }),
        para('5.3. Заказчик в соответствии с требованиями законодательства Российской Федерации, в том числе на основании статьи 9 Федерального закона «О персональных данных» от 27.07.2006 №152-ФЗ, путем подписания данного Договора предоставляет Исполнителям согласие на обработку и использование своих персональных данных, содержащихся в настоящем договоре и представленных им документах в целях надлежащего исполнения обязанностей Исполнителя в соответствии с настоящем Договором. Заказчик подтверждает наличие у него прав на передачу Исполнителям всех персональных данных, содержащихся в передаваемых документах (копиях документов).', { indent: true, afterPt: 3 }),
        para('5.4. Во избежание сомнений Стороны установили, что Исполнители, оказывая услуги в рамках настоящего договора, не осуществляют управление денежными средствами, ценными бумагами или иным имуществом Заказчика.', { indent: true, afterPt: 3 }),
        para('5.5. Настоящий Договор составлен в трех экземплярах, по одному для каждой стороны.', { indent: true, afterPt: 3 }),
        para('5.6. Все споры, возникающие в связи с исполнением настоящего Договора разрешаются путем переговоров. В случае не достижения согласия путем переговоров, спор подлежит рассмотрению судом.', { indent: true, afterPt: 3 }),
        para('5.7. Все изменения и дополнения к настоящему Договору действительны, если они совершены в письменной форме и подписаны представителями обеих сторон. Стороны пришли к соглашению, что все уведомления, запросы, документы, связанные с исполнением Сторонами своих обязательств по настоящему Договору, могут направляться Сторонами по реквизитам, указанным в договоре: на электронный адрес, смс сообщением или сообщением посредством Telegram. Стороны обязаны уведомлять друг друга об изменении адресов и телефонов в течении 3 (трех) рабочих дней с момента их изменения.', { indent: true, afterPt: 3 }),
        para('5.8. Все уведомления, запросы, документы, связанные с исполнением Сторонами своих обязательств по настоящему Договору, должны направляться Сторонами по указанным ниже адресам и реквизитам. Стороны обязаны уведомлять друг друга об изменении адресов и реквизитов в течение 3 (трех) рабочих дней с момента их изменения.', { indent: true, afterPt: 3 }),
        para('5.9. Все приложения к Договору являются его неотъемлемой частью.', { indent: true, afterPt: 3 }),
        para('5.10. Вопросы, не урегулированные Договором, и споры подлежат разрешению в соответствии с действующим законодательством.', { indent: true, afterPt: 12 }),

        para([boldRun('6. ПОДПИСИ СТОРОН')], { afterPt: 6, beforePt: 6 }),
        para([boldRun('Исполнитель 1: '), normalRun('___________________ / Муравьева Ю.А. /')], { afterPt: 3 }),
        para([boldRun('Исполнитель 2: '), normalRun(`___________________ / ${isRealtorSelfEmployed ? 'Самозанятый ' : ''}${realtorShort} /`)], { afterPt: 3 }),
        isCustomerLegal
            ? para([
                boldRun('Заказчик: '),
                normalRun(`${leg.name}\n${leg.position}: ___________________ / ${leg.authShort} /  М.П.`),
            ], { afterPt: 24 })
            : para([boldRun('Заказчик: '), normalRun(`___________________ / ${customerShort} /`)], { afterPt: 24 }),

        // АКТ ВЫПОЛНЕННЫХ РАБОТ
        para([boldRun('АКТ ВЫПОЛНЕННЫХ РАБОТ')], { alignment: AlignmentType.CENTER, afterPt: 4, beforePt: 18 }),
        para([normalRun(`К ДОГОВОРУ № ${contractNumber} от «${dealDate}»`)], { alignment: AlignmentType.CENTER, afterPt: 10 }),
        new Paragraph({
            children: [
                normalRun('г. Киров'),
                normalRun('                                                                                                                    '),
                normalRun(`«${actDate}»`),
            ],
            alignment: AlignmentType.LEFT,
            spacing: { after: 160 },
        }),
        para(`1. Мы, нижеподписавшиеся, составили настоящий акт по факту завершения услуг по Договору об оказании услуг. Исполнители выполнили в полном объеме свои обязательства согласно Договору об оказании услуг № ${contractNumber} от «${dealDate}».`, { indent: true, afterPt: 4 }),
        para('2. Заказчик считает услуги полностью выполненными и претензий к сроку выполнения, полноте и качеству услуг не имеет.', { indent: true, afterPt: 4 }),
        para('3. Настоящий акт является основанием для оплаты Заказчиком вознаграждения Исполнителю 1 и Исполнителю 2.', { indent: true, afterPt: 16 }),

        isCustomerLegal
            ? para([
                boldRun('Заказчик:'),
                normalRun(`\n${leg.name}\n${leg.position}: ____________________ / `),
                boldRun(leg.authShort),
                normalRun(' /  М.П.\n      (Подпись)                  (ФИО)'),
            ], { afterPt: 12 })
            : para([
                boldRun('Заказчик:'),
                normalRun('\n____________________ / '),
                boldRun(customerShort),
                normalRun('\n      (Подпись)                  (ФИО)'),
            ], { afterPt: 12 }),
        para([
            boldRun('Исполнитель 1:'),
            normalRun('\n____________________ / '),
            boldRun('Муравьева Ю.А.'),
            normalRun('\n      (Подпись)                  (ФИО)'),
        ], { afterPt: 12 }),
        para([
            boldRun('Исполнитель 2:'),
            normalRun('\n____________________ / '),
            boldRun(`${isRealtorSelfEmployed ? 'Самозанятый ' : ''}${realtorShort}`),
            normalRun('\n      (Подпись)                  (ФИО)'),
        ], { afterPt: 12 }),
    ];
}

/* ─── Карта шаблонов ─────────────────────────────────────────────────────── */

export const DOCUMENT_CATEGORIES = [
    { id: 'all', label: 'Все' },
    { id: 'buy', label: 'Покупка' },
    { id: 'sale', label: 'Продажа' },
    { id: 'rent', label: 'Аренда' },
    { id: 'hire', label: 'Найм' },
    { id: 'other', label: 'Иные' },
];

export const CATEGORY_LABELS = {
    buy: 'Покупка',
    sale: 'Продажа',
    rent: 'Аренда',
    hire: 'Найм',
    other: 'Иные',
};

const TEMPLATES = {
    yuss_buy_1: {
        title: 'ЮСС Покупка (1 принципал)',
        builder: buildYussBuy1Contract,
        category: 'buy',
        categories: ['buy'],
    },
    agency_sale_1: {
        title: 'Агентский договор — Продажа (1 принципал)',
        builder: buildAgencySale1Contract,
        category: 'sale',
        categories: ['sale'],
    },
    agency_rent_landlord_1: {
        title: 'АД Найм с наймодателем',
        builder: buildAgencyRentLandlord1Contract,
        category: 'hire',
        categories: ['hire'],
    },
    services_rent_3party: {
        title: 'ДОУ Аренда и найм (3-сторонний)',
        builder: buildServicesRent3PartyContract,
        category: 'rent',
        categories: ['rent', 'hire'],
    },
    sale: {
        title: 'Договор купли-продажи',
        builder: buildSaleContract,
        category: 'sale',
        categories: ['sale', 'buy'],
    },
    rent: {
        title: 'Договор аренды',
        builder: buildRentContract,
        category: 'rent',
        categories: ['rent'],
    },
    act: {
        title: 'Акт приема-передачи',
        builder: buildHandoverAct,
        category: 'other',
        categories: ['other'],
    },
};

/**
 * Извлекает блоки docx (Paragraph, Table, ImageRun) из DOM-элемента окна предпросмотра
 */
export function collectDocxBlocksFromDom(domElement, isAgencyContract = false) {
    if (!domElement) return [];
    const blocks = [];
    const font = isAgencyContract ? 'Arial' : 'Times New Roman';
    const fontSize = isAgencyContract ? 20 : 24;

    function extractRuns(parent, defaultFont, defaultSize) {
        const runs = [];
        function walk(node, isBold = false, isItalic = false, isUnderline = false) {
            if (node.nodeType === 3 /* Node.TEXT_NODE */) {
                const txt = node.textContent;
                if (txt) {
                    runs.push(new TextRun({
                        text: txt,
                        font: defaultFont,
                        size: defaultSize,
                        bold: isBold,
                        italics: isItalic,
                        underline: isUnderline ? {} : undefined,
                    }));
                }
                return;
            }
            if (node.nodeType === 1 /* Node.ELEMENT_NODE */) {
                if (node.classList?.contains('no-print')) return;
                const b = isBold || ['B', 'STRONG'].includes(node.tagName) || node.style?.fontWeight === 'bold' || Number(node.style?.fontWeight) >= 600;
                const i = isItalic || ['I', 'EM'].includes(node.tagName) || node.style?.fontStyle === 'italic';
                const u = isUnderline || node.tagName === 'U' || node.style?.textDecoration?.includes('underline');
                for (const child of node.childNodes) {
                    walk(child, b, i, u);
                }
            }
        }
        for (const child of parent.childNodes) {
            walk(child);
        }
        return runs;
    }

    function processBlock(el) {
        if (!el || el.nodeType !== 1) return;
        if (el.classList?.contains('no-print')) return;

        // Логотип (картинка)
        if (el.tagName === 'IMG' || (el.children?.length === 1 && el.children[0].tagName === 'IMG')) {
            try {
                const bytes = getLogoUint8Array();
                if (bytes.length > 0) {
                    blocks.push(new Paragraph({
                        children: [
                            new ImageRun({
                                data: bytes,
                                transformation: { width: 150, height: 124 },
                            }),
                        ],
                        spacing: { after: 120 },
                    }));
                }
            } catch (e) {
                console.warn('Failed to embed logo in DOCX:', e);
            }
            return;
        }

        // Таблица
        if (el.tagName === 'TABLE') {
            const trList = Array.from(el.querySelectorAll('tr'));
            const tableRows = trList.map(tr => {
                const tdList = Array.from(tr.querySelectorAll('td, th'));
                const tableCells = tdList.map((td, idx) => {
                    const runs = extractRuns(td, font, fontSize);
                    const widthPercent = idx === 0 ? 30 : 70;
                    return new TableCell({
                        width: { size: widthPercent, type: WidthType.PERCENTAGE },
                        children: [
                            new Paragraph({
                                children: runs.length > 0 ? runs : [new TextRun({ text: td.textContent || '', font, size: fontSize })],
                                spacing: { before: 40, after: 40 },
                            }),
                        ],
                    });
                });
                return new TableRow({ children: tableCells });
            });

            if (tableRows.length > 0) {
                blocks.push(new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: {
                        top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                        bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                        left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                        right: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                        insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                        insideVertical: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
                    },
                    rows: tableRows,
                }));
            }
            return;
        }

        // Элементы со сложной вложенностью
        const hasChildBlocks = Array.from(el.children || []).some(c => 
            ['P', 'TABLE', 'DIV', 'H1', 'H2', 'H3', 'H4', 'IMG', 'UL', 'OL', 'LI'].includes(c.tagName)
        );

        if (hasChildBlocks && el.tagName !== 'P') {
            for (const child of el.children) {
                processBlock(child);
            }
            return;
        }

        // Обычный абзац текста
        const text = el.textContent || '';
        if (!text.trim()) return;

        const styleAlign = el.style?.textAlign;
        let alignment = AlignmentType.JUSTIFIED;
        if (styleAlign === 'center') alignment = AlignmentType.CENTER;
        else if (styleAlign === 'right') alignment = AlignmentType.RIGHT;
        else if (styleAlign === 'left') alignment = AlignmentType.LEFT;

        const hasIndent = Boolean(el.style?.textIndent && el.style.textIndent !== '0' && el.style.textIndent !== '0px');
        const runs = extractRuns(el, font, fontSize);

        blocks.push(new Paragraph({
            children: runs.length > 0 ? runs : [new TextRun({ text, font, size: fontSize })],
            alignment,
            indent: hasIndent ? { firstLine: convertInchesToTwip(0.4) } : undefined,
            spacing: { after: 80, before: 40 },
        }));
    }

    for (const child of domElement.children) {
        processBlock(child);
    }
    return blocks;
}

/**
 * Генерирует DOCX и скачивает файл.
 * Если передан editedDomElement (элемент из окна предпросмотра с правками),
 * формирует DOCX с учетом всех правок пользователя.
 *
 * @param {string} templateKey - 'yuss_buy_1' | 'agency_sale_1' | 'agency_rent_landlord_1' | 'sale' | 'rent' | 'act'
 * @param {Object} data - { seller, buyer, property, realtor, agencyName, deal }
 * @param {HTMLElement|null} editedDomElement - DOM-элемент предпросмотра с правками пользователя
 */
export async function generateAndDownloadDocx(templateKey, data, editedDomElement = null) {
    const template = TEMPLATES[templateKey];
    if (!template) throw new Error(`Неизвестный шаблон: ${templateKey}`);

    const isAgencyContract = templateKey === 'yuss_buy_1' || templateKey === 'agency_sale_1' || templateKey === 'agency_rent_landlord_1';

    let bodyChildren = null;
    let headers = undefined;
    let sectionProperties = {
        page: {
            margin: {
                top: convertInchesToTwip(0.8),
                right: convertInchesToTwip(0.8),
                bottom: convertInchesToTwip(0.8),
                left: convertInchesToTwip(1.18),
            },
        },
    };

    if (editedDomElement && typeof document !== 'undefined') {
        const domBlocks = collectDocxBlocksFromDom(editedDomElement, isAgencyContract);
        if (domBlocks && domBlocks.length > 0) {
            bodyChildren = domBlocks;
        }
    }

    if (!bodyChildren || bodyChildren.length === 0) {
        const result = template.builder(data);
        const isConfig = result && !Array.isArray(result) && result.children;
        bodyChildren = isConfig ? result.children : result;
        headers = isConfig ? result.headers : undefined;
        if (isConfig && result.properties) {
            sectionProperties = result.properties;
        }
    }

    const section = {
        properties: sectionProperties,
        children: bodyChildren,
    };
    if (headers) {
        section.headers = headers;
    }

    const doc = new Document({
        sections: [section],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.title}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Возвращает список доступных шаблонов.
 */
export function getDocumentTemplates() {
    return Object.entries(TEMPLATES).map(([key, t]) => ({
        key,
        title: t.title,
        category: t.category || 'other',
        categories: t.categories || [t.category || 'other'],
    }));
}

