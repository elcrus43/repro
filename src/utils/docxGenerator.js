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

/* ─── Карта шаблонов ─────────────────────────────────────────────────────── */

const TEMPLATES = {
    yuss_buy_1: { title: 'ЮСС Покупка (1 принципал)', builder: buildYussBuy1Contract },
    sale: { title: 'Договор купли-продажи', builder: buildSaleContract },
    rent: { title: 'Договор аренды', builder: buildRentContract },
    act: { title: 'Акт приема-передачи', builder: buildHandoverAct },
};

/**
 * Генерирует DOCX и скачивает файл.
 *
 * @param {string} templateKey - 'yuss_buy_1' | 'sale' | 'rent' | 'act'
 * @param {Object} data - { seller, buyer, property, realtor, agencyName, deal }
 */
export async function generateAndDownloadDocx(templateKey, data) {
    const template = TEMPLATES[templateKey];
    if (!template) throw new Error(`Неизвестный шаблон: ${templateKey}`);

    const result = template.builder(data);
    const isConfig = result && !Array.isArray(result) && result.children;
    const bodyChildren = isConfig ? result.children : result;
    const headers = isConfig ? result.headers : undefined;
    const sectionProperties = isConfig && result.properties ? result.properties : {
        page: {
            margin: {
                top: convertInchesToTwip(0.8),
                right: convertInchesToTwip(0.8),
                bottom: convertInchesToTwip(0.8),
                left: convertInchesToTwip(1.18),
            },
        },
    };

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
    return Object.entries(TEMPLATES).map(([key, t]) => ({ key, title: t.title }));
}
