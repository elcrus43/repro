import { aiFetch } from '../lib/apiConfig.js';
import { getToken } from '../lib/neon.js';
import { formatPhone, stripPhone } from './format.js';

export const GREETING_TONES = [
    { id: 'warm', label: 'Тёплое', desc: 'Душевное с акцентом на счастье и здоровье' },
    { id: 'business', label: 'Деловое', desc: 'Уважительное для партнеров и клиентов' },
    { id: 'short', label: 'Короткое', desc: 'Емкое для SMS и быстрых мессенджеров' },
    { id: 'home', label: 'Уют и дом', desc: 'С акцентом на семейный очаг и новоселье' }
];

/**
 * Вычисляет информацию о дне рождения клиента:
 * возраст, форматированная дата, сколько дней осталось до ДР.
 */
export function getBirthdayInfo(birthDateStr) {
    if (!birthDateStr) return null;
    const bDate = new Date(birthDateStr);
    if (isNaN(bDate.getTime())) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bMonth = bDate.getMonth();
    const bDay = bDate.getDate();

    let thisYearBday = new Date(today.getFullYear(), bMonth, bDay);
    let daysLeft = Math.round((thisYearBday - today) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
        const nextYearBday = new Date(today.getFullYear() + 1, bMonth, bDay);
        daysLeft = Math.round((nextYearBday - today) / (1000 * 60 * 60 * 24));
    }

    let age = today.getFullYear() - bDate.getFullYear();
    const hasHadBirthdayThisYear = (today.getMonth() > bMonth) || (today.getMonth() === bMonth && today.getDate() >= bDay);
    if (!hasHadBirthdayThisYear) {
        age--;
    }

    const isToday = daysLeft === 0;
    const isSoon = daysLeft > 0 && daysLeft <= 7;

    const formattedDate = bDate.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const dayMonth = bDate.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long'
    });

    return {
        birthDate: bDate,
        dateStr: birthDateStr,
        formattedDate,
        dayMonth,
        age: age > 0 ? age : null,
        ageFormatted: age > 0 ? formatAge(age) : '',
        daysLeft,
        isToday,
        isSoon
    };
}

/**
 * Склонение возраста на русском языке (31 год, 32 года, 35 лет)
 */
export function formatAge(age) {
    if (!age || age <= 0) return '';
    const rem10 = age % 10;
    const rem100 = age % 100;
    if (rem100 >= 11 && rem100 <= 14) return `${age} лет`;
    if (rem10 === 1) return `${age} год`;
    if (rem10 >= 2 && rem10 <= 4) return `${age} года`;
    return `${age} лет`;
}

/**
 * Определяет форму вежливого обращения к клиенту
 */
export function getClientSalutation(fullName) {
    if (!fullName || typeof fullName !== 'string') {
        return {
            greetingName: 'Уважаемый клиент',
            shortName: '',
            fullName: '',
            prefix: 'Уважаемый'
        };
    }

    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
        return {
            greetingName: 'Уважаемый клиент',
            shortName: '',
            fullName: '',
            prefix: 'Уважаемый'
        };
    }

    if (parts.length >= 3) {
        const isPatronymic = (w) => /(ович|евич|ич|овна|евна|ична|инична|кызы|улы)$/i.test(w);
        let lastName = parts[0];
        let firstName = parts[1];
        let middleName = parts[2];

        // Если второе слово - отчество ("Иван Сергеевич Кузнецов")
        if (isPatronymic(parts[1])) {
            firstName = parts[0];
            middleName = parts[1];
            lastName = parts.slice(2).join(' ');
        } else if (isPatronymic(parts[2])) {
            // "Кузнецов Иван Сергеевич"
            lastName = parts[0];
            firstName = parts[1];
            middleName = parts[2];
        }

        const isFemale = /(на|ична|инична|кызы)$/i.test(middleName);
        const prefix = isFemale ? 'Уважаемая' : 'Уважаемый';
        return {
            greetingName: `${prefix} ${firstName} ${middleName}`,
            shortName: firstName,
            fullName: `${lastName} ${firstName} ${middleName}`,
            prefix
        };
    }

    if (parts.length === 2) {
        const [p1, p2] = parts;
        let firstName = p1;
        let isFemale = false;
        if (/(ов|ев|ин|ский|цкий)$/i.test(p1) && !/(ов|ев|ин)$/i.test(p2)) {
            firstName = p2;
        } else if (/(ова|ева|ина|ская|цкая)$/i.test(p1)) {
            firstName = p2;
            isFemale = true;
        }
        if (/(ова|ева|ина|ская|цкая)$/i.test(p2) || /(а|я|ия)$/i.test(firstName)) {
            isFemale = true;
        }
        const prefix = isFemale ? 'Уважаемая' : 'Уважаемый';
        return {
            greetingName: `${prefix} ${firstName}`,
            shortName: firstName,
            fullName: `${p1} ${p2}`,
            prefix
        };
    }

    const name = parts[0];
    const isFemale = /(а|я|ия)$/i.test(name);
    const prefix = isFemale ? 'Уважаемая' : 'Уважаемый';
    return {
        greetingName: `${prefix} ${name}`,
        shortName: name,
        fullName: name,
        prefix
    };
}

/**
 * Локальный шаблонный генератор поздравлений (fallback при отказе ИИ)
 * Строго соблюдает правила проекта: никаких длинных тире, только дефис.
 */
export function buildFallbackBirthdayGreeting({
    client,
    agentName = 'Ваш риелтор',
    agentPhone = '',
    tone = 'warm',
    companyName = 'Самолет Плюс Киров'
}) {
    const salutation = getClientSalutation(client?.full_name);
    const greetingName = salutation.greetingName;
    const shortName = salutation.shortName || client?.full_name || 'клиент';

    const bInfo = getBirthdayInfo(client?.birth_date || client?.passport_details?.birth_date);
    const agePhrase = bInfo?.age ? ` в Ваши ${bInfo.ageFormatted}` : '';

    const signParts = [
        agentName,
        companyName
    ];
    if (agentPhone) {
        signParts.push(`тел. ${formatPhone(agentPhone)}`);
    }
    const signature = signParts.join('\n');

    switch (tone) {
        case 'business':
            return `${greetingName}!\n\nОт имени компании ${companyName} и от себя лично сердечно поздравляю Вас с днем рождения${agePhrase}!\n\nЖелаю Вам крепкого здоровья, неиссякаемой энергии, уверенности в завтрашнем дне и надежных партнеров. Пусть каждый новый проект приносит удовлетворение и успех, а любые амбициозные цели достигаются легко и уверенно. Благополучия, финансовой стабильности и процветания!\n\nС уважением,\n${signature}`;

        case 'short':
            return `${shortName}, с днем рождения! 🎉\n\nКрепкого здоровья, удачи, домашнего уюта и благополучия! Пусть каждый день приносит радость, новые возможности и отличные результаты!\n\nС уважением,\n${signature}`;

        case 'home':
            return `${greetingName}!\n\nПоздравляю Вас с днем рождения${agePhrase}!\n\nДля команды ${companyName} дом - это главное место силы, тепла и семейного счастья. Искренне желаю, чтобы в Вашем доме всегда царили гармония, уют, мир и достаток. Пусть рядом всегда будут дорогие сердцу люди, а впереди ждут только светлые и радостные события!\n\nС теплом и заботой,\n${signature}`;

        case 'warm':
        default:
            return `${greetingName}!\n\nОт всей души поздравляю Вас с днем рождения${agePhrase}!\n\nЖелаю крепкого здоровья, безграничного счастья, душевного спокойствия и весеннего настроения в любой день. Пусть жизнь радует приятными сюрпризами, заветные мечты сбываются, а каждый день будет наполнен улыбками близких и искренней заботой. Мира, тепла и уюта Вашему дому!\n\nС наилучшими пожеланиями,\n${signature}`;
    }
}

/**
 * Генерирует поздравление с помощью ИИ (через aiFetch),
 * а при любой ошибке или недоступности ИИ возвращает надежный шаблон.
 */
export function generateBirthdayGreeting({
    client,
    agentName = 'Ваш риелтор',
    agentPhone = '',
    tone = 'warm',
    companyName = 'Самолет Плюс Киров'
}) {
    return (async () => {
        const bInfo = getBirthdayInfo(client?.birth_date || client?.passport_details?.birth_date);
        const salutation = getClientSalutation(client?.full_name);

        const toneDescriptions = {
            warm: 'Тёплое, душевное, искреннее с акцентом на счастье, здоровье и семейное благополучие.',
            business: 'Деловое, респектабельное, подчеркивающее статус и профессиональное уважение.',
            short: 'Короткое, емкое, без лишних слов, оптимизировано для SMS и мессенджеров (2-4 предложения).',
            home: 'С акцентом на домашний уют, безопасность, семейный очаг и комфорт.'
        };

        const prompt = `Напиши персональное, вежливое и красивое поздравление с днем рождения клиенту на русском языке.

Данные для поздравления:
- Имя клиента: ${client?.full_name || 'Клиент'} (обращение: ${salutation.greetingName})
${bInfo?.age ? `- Исполняется лет: ${bInfo.age}` : ''}
${client?.client_types?.length ? `- Статус клиента: ${client.client_types.join(', ')}` : ''}

От кого поздравление:
- Компания: ${companyName}
- Персональный агент/риелтор: ${agentName}${agentPhone ? ` (телефон: ${formatPhone(agentPhone)})` : ''}

Стиль поздравления:
${toneDescriptions[tone] || toneDescriptions.warm}

Обязательные требования:
- Никаких длинных тире "—", используй только обычный дефис "-".
- Не используй избитые шаблонные канцеляризмы (например: "в этот знаменательный день", "спешим поздравить").
- Поздравление должно звучать естественно, живо и по-человечески тепло.
- В конце обязательно поставь подпись с уважением, именем агента и названием "${companyName}".
- Выведи только готовый текст поздравления, без вступительных фраз вроде "Вот ваше поздравление:".`;

        try {
            const token = getToken();
            const headers = { 'Content-Type': 'application/json' };
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const response = await aiFetch({
                method: 'POST',
                headers,
                body: JSON.stringify({
                    action: 'generateBirthdayGreeting',
                    prompt
                })
            });

            if (!response.ok) {
                // Если эндпоинт вернул ошибку, пробуем с экшеном generateAd
                const fallbackRes = await aiFetch({
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        action: 'generateAd',
                        prompt
                    })
                });
                if (!fallbackRes.ok) {
                    throw new Error(`AI error: status ${fallbackRes.status}`);
                }
                const fallbackData = await fallbackRes.json();
                const cleanText = (fallbackData.text || '').replace(/—/g, '-').trim();
                if (cleanText) {
                    return { text: cleanText, source: 'ai' };
                }
            } else {
                const data = await response.json();
                const cleanText = (data.text || '').replace(/—/g, '-').trim();
                if (cleanText) {
                    return { text: cleanText, source: 'ai' };
                }
            }
        } catch (err) {
            console.warn('[birthdayGreetingGenerator] AI fallback to template:', err?.message);
        }

        // Надёжный шаблонный fallback
        return {
            text: buildFallbackBirthdayGreeting({ client, agentName, agentPhone, tone, companyName }),
            source: 'template'
        };
    })();
}
