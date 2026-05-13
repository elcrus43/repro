import React, { useState, useCallback } from 'react';
import { Wand2, Copy, Check, ChevronDown, ChevronUp, Loader, RefreshCw } from 'lucide-react';
import { BUILDING_TYPES, RENOVATION_LABELS, BALCONY_LABELS, MARKET_LABELS } from '../data/constants';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

/* ─── Low-level Gemini fetch ──────────────────────────────────────────────── */

async function geminiRequest(contents, { useSearch = false, maxTokens = 600 } = {}) {
    if (!GEMINI_API_KEY) throw new Error('Добавьте VITE_GEMINI_API_KEY в файл .env');

    // v1beta needed for google_search tool; v1 for regular generation
    const api = useSearch ? 'v1beta' : 'v1';
    const url = `https://generativelanguage.googleapis.com/${api}/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const body = {
        contents,
        generationConfig: { temperature: 0.6, maxOutputTokens: maxTokens },
    };
    if (useSearch) {
        body.tools = [{ google_search: {} }];
    }

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

/* ─── Step 0: analyze property photos via Gemini Vision ─────────────────── */

async function analyzePhotos(images = []) {
    if (!images || images.length === 0) return '';

    // Limit to first 4 photos to stay within token limits
    const toAnalyze = images.slice(0, 4);

    // Fetch each image and convert to base64
    const imageParts = [];
    for (const url of toAnalyze) {
        try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const buffer = await res.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
            const base64 = btoa(binary);
            const mimeType = res.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
            imageParts.push({ inlineData: { mimeType, data: base64 } });
        } catch {
            // Skip failed images silently
        }
    }

    if (imageParts.length === 0) return '';

    const textPart = {
        text: `Ты элитный копирайтер по недвижимости. Проведи глубокий визуальный аудит объекта по фото.
Оцени: 
1. Качество материалов и бренд техники (если видно). 
2. Эргономику пространства и освещенность. 
3. "Vibe" объекта: для кого он (бизнесмен, молодая пара, семья).
4. Эстетические акценты (дизайнерский свет, панорамные окна, вид).
Ответ дай в виде 7-10 мощных фактов-аргументов для покупателя. Без воды.`
    };

    try {
        return await geminiRequest(
            [{ role: 'user', parts: [textPart, ...imageParts] }],
            { useSearch: false, maxTokens: 300 }
        );
    } catch {
        return '';
    }
}

/* ─── Step 1: fetch building + infra info via Google Search ──────────────── */

async function fetchBuildingAndInfra(address, city) {
    if (!address && !city) return { building: '', infra: '' };
    const location = [address, city].filter(Boolean).join(', ');

    const prompt = `Как аналитик рынка недвижимости, найди ключевые ценности по адресу "${location}":
1. О доме: Архитектурный стиль, год постройки, статус (бизнес/комфорт/премиум), безопасность (закрытая территория, охрана, видеонаблюдение), уровень входных групп, лифты (KONE/Otis и т.д.).
2. Инфраструктура ценности: Премиальные фитнес-центры, частные школы/сады, популярные рестораны, парки, транспортные развязки, бизнес-кластеры в пешей доступности.
Формат ответа — строго два блока:
=== ГЛУБОКИЙ АНАЛИЗ ДОМА ===
(факты-преимущества)
=== ИНФРАСТРУКТУРА И ОКРУЖЕНИЕ ===
(факты-аргументы)
Без общих фраз. Только конкретика, которая повышает цену.` ;

    try {
        const raw = await geminiRequest(
            [{ role: 'user', parts: [{ text: prompt }] }],
            { useSearch: true, maxTokens: 400 }
        );

        const buildingMatch = raw.match(/=== О ДОМЕ ===([\s\S]*?)(?:=== ИНФРАСТРУКТУРА ===|$)/);
        const infraMatch    = raw.match(/=== ИНФРАСТРУКТУРА ===([\s\S]*?)$/);

        return {
            building: buildingMatch?.[1]?.trim() || '',
            infra:    infraMatch?.[1]?.trim() || '',
        };
    } catch {
        return { building: '', infra: '' };
    }
}

/* ─── Step 2: build main ad prompt ──────────────────────────────────────── */

function buildPrompt(prop, tone, buildingExtra, infraExtra, photoDesc = '') {
    // Accusative case for Russian grammar
    const typeAccusative = {
        apartment: 'квартиру',
        house:     'дом',
        land:      'участок',
        commercial:'коммерческое помещение',
        room:      'комнату',
    };
    const isRent   = prop.deal_type === 'rent';
    const dealVerb = isRent ? 'Сдаю' : 'Продаю';
    const typeAcc  = typeAccusative[prop.property_type] || 'объект';
    const roomsLabel = (!prop.rooms || prop.rooms === 0)
        ? 'студию'
        : `${prop.rooms}-комнатную ${typeAcc}`;

    // First line built fully in JS — correct grammar guaranteed
    const floorPart   = prop.floor ? ` на **${prop.floor} этаже**` : '';
    const totalFloors = prop.floors_total ? ` **${prop.floors_total}-этажного**` : '';
    const bldgType    = BUILDING_TYPES?.[prop.building_type]
        ? ` **${BUILDING_TYPES[prop.building_type].toLowerCase()} дома**`
        : '';
    const buildYear   = prop.build_year ? ` **${prop.build_year} года постройки**` : '';
    const firstLine   = `${dealVerb} **${roomsLabel}**${floorPart}${totalFloors}${bldgType}${buildYear}.`;

    // — О доме —
    const houseSection = [
        prop.floors_total  && `Этажность дома: ${prop.floors_total}`,
        prop.build_year    && `Год постройки: ${prop.build_year}`,
        prop.building_type && `Тип дома: ${BUILDING_TYPES?.[prop.building_type] || prop.building_type}`,
        prop.market_type   && `Рынок: ${MARKET_LABELS?.[prop.market_type] || prop.market_type}`,
        prop.parking && prop.parking !== 'none' && (() => {
            const parking = { open: 'Открытая', garage: 'Гараж', underground: 'Подземная' };
            return `Парковка: ${parking[prop.parking] || 'есть'}`;
        })(),
        buildingExtra      && `Дополнительно из интернета:\n${buildingExtra}`,
    ].filter(Boolean).join('\n');

    // — О квартире —
    const flatSection = [
        prop.area_total    && `Общая площадь: ${prop.area_total} м²`,
        prop.area_living   && `Жилая площадь: ${prop.area_living} м²`,
        prop.area_kitchen  && `Кухня: ${prop.area_kitchen} м²`,
        prop.floor         && `Этаж: ${prop.floor}${prop.floors_total ? ` из ${prop.floors_total}` : ''}`,
        prop.renovation    && `Ремонт: ${RENOVATION_LABELS?.[prop.renovation] || prop.renovation}`,
        prop.furniture != null && `Мебель: ${prop.furniture ? 'есть' : 'нет'}`,
        prop.bathroom      && (() => {
            const bath = { combined: 'Совмещённый', separate: 'Раздельный', two: 'Два и более' };
            return `Санузел: ${bath[prop.bathroom] || prop.bathroom}`;
        })(),
        prop.balcony && prop.balcony !== 'none' && `Балкон/лоджия: ${BALCONY_LABELS?.[prop.balcony] || prop.balcony}`,
        photoDesc          && `Дополнительно с фотографий:\n${photoDesc}`,
    ].filter(Boolean).join('\n');

    // — Инфраструктура —
    const locationSection = [
        prop.address       && `Адрес: ${prop.address}`,
        prop.city          && `Город: ${prop.city}`,
        prop.district      && `Район: ${prop.district}`,
        prop.microdistrict && `Микрорайон: ${prop.microdistrict}`,
        infraExtra         && `Инфраструктура из интернета:\n${infraExtra}`,
    ].filter(Boolean).join('\n');

    // — Условия сделки —
    const dealSection = [
        prop.price && `Цена: ${Number(prop.price).toLocaleString('ru-RU')} ₽${
            prop.area_total ? ` (${Math.round(Number(prop.price) / Number(prop.area_total)).toLocaleString('ru-RU')} ₽/м²)` : ''
        }`,
        prop.price_min && prop.price_min !== prop.price
            && `Возможный торг: от ${Number(prop.price_min).toLocaleString('ru-RU')} ₽`,
        prop.mortgage_available  && 'Ипотека: одобрена',
        prop.matcapital_available && 'Материнский капитал: принимается',
        prop.certificate_available && 'Жилищный сертификат: принимается',
        prop.encumbrance   && 'Обременение: есть',
        prop.minor_owners  && 'Несовершеннолетние собственники: есть',
        prop.docs_ready    && 'Документы готовы к сделке',
        prop.notes         && `Заметки: ${prop.notes}`,
    ].filter(Boolean).join('\n');

    const toneMap = {
        professional: 'Экспертный, уверенный, с акцентом на ликвидность и цифры.',
        friendly:     'Вдохновляющий, эмоциональный, "о жизни в этой квартире".',
        concise:      'Ультра-минимализм. Каждое слово на вес золота.',
    };
    const toneInstruction = toneMap[tone] || toneMap.professional;

    const userMessage = `Ты топовый копирайтер в сфере недвижимости (уровень Refero.design). 
Твоя задача: превратить сухие данные в текст, вызывающий желание купить. 

ИСПОЛЬЗУЙ МОДЕЛЬ AIDA:
1. ATTENTION: Сильный, "цепляющий" заголовок с Playfair-эстетикой (текстом).
2. INTEREST: Описание преимуществ дома и локации через пользу (не "есть парк", а "утренние пробежки в парке в 2 минутах").
3. DESIRE: Описание интерьера и состояния через ощущения качества и комфорта.
4. ACTION: Призыв к действию (записаться на показ).

ПРАВИЛА:
- ЗАПРЕЩЕНО: канцеляризмы ("предлагается к продаже"), клише ("заезжай и живи"), эпитеты-пустышки ("уникальный", "шикарный").
- Числа (площадь, этаж, цена) выделяй **жирным**.
- Структурируй текст абзацами с короткими заголовками.
- ${toneInstruction}
- Максимум 1500 знаков.

ДАННЫЕ ОБЪЕКТА:
**Первая строка (уже написана):** ${firstLine}

**О доме:**
${houseSection || '(нет данных)'}

**О квартире:**
${flatSection || '(нет данных)'}

**Инфраструктура:**
${locationSection || '(нет данных)'}

**Сделка:**
${dealSection || '(нет данных)'}

Начни сразу с заголовка и основного текста.`;

    return { userMessage, firstLine };
}

/* ─── Step 3: generate ad with prefill ──────────────────────────────────── */

async function generateAd(prop, tone, buildingExtra, infraExtra, photoDesc) {
    const { userMessage, firstLine } = buildPrompt(prop, tone, buildingExtra, infraExtra, photoDesc);

    // Multi-turn: model "already wrote" firstLine, continues from there
    const continuation = await geminiRequest(
        [
            { role: 'user',  parts: [{ text: userMessage }] },
            { role: 'model', parts: [{ text: firstLine }] },
        ],
        { useSearch: false, maxTokens: 700 }
    );

    return `${firstLine}\n${continuation}`;
}

/* ─── Markdown bold renderer ─────────────────────────────────────────────── */

function renderBold(text) {
    const parts = text.split(/\*\*(.+?)\*\*/g);
    return parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    );
}

function AdText({ text }) {
    return (
        <div style={{ fontSize: 14, lineHeight: 1.85, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
            {text.split('\n').map((line, i) => (
                <p key={i} style={{ margin: '0 0 6px' }}>{renderBold(line)}</p>
            ))}
        </div>
    );
}

function WordCount({ text }) {
    const count = text.trim().split(/\s+/).filter(Boolean).length;
    const color = count > 200 ? 'var(--danger, #dc2626)' : 'var(--text-muted)';
    return <span style={{ fontSize: 11, color }}>{count} слов</span>;
}

/* ─── Loading status indicator ───────────────────────────────────────────── */

function LoadingStatus({ step }) {
    const steps = [
        'Поиск данных о доме и инфраструктуре...',
        'Анализирую фотографии...',
        'Генерирую объявление...',
    ];
    return (
        <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Loader size={12} style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
            {steps[step] || 'Обработка...'}
        </div>
    );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

export function AdGenerator({ prop, realtorName }) {
    const [open, setOpen]       = useState(false);
    const [loading, setLoading] = useState(false);
    const [loadStep, setLoadStep] = useState(0);
    const [result, setResult]   = useState('');
    const [error, setError]     = useState('');
    const [copied, setCopied]   = useState(false);
    const [tone, setTone]       = useState('professional');

    const generate = useCallback(async () => {
        setLoading(true);
        setLoadStep(0);
        setError('');
        setResult('');

        try {
            // Step 0: search building + infra (parallel-friendly, non-critical)
            const { building, infra } = await fetchBuildingAndInfra(prop.address, prop.city);

            // Step 1: analyze photos via Gemini Vision (skipped if no images)
            setLoadStep(1);
            const photoDesc = await analyzePhotos(prop.images || []);

            // Step 2: generate structured ad
            setLoadStep(2);
            const ad = await generateAd(prop, tone, building, infra, photoDesc);
            setResult(ad);
        } catch (err) {
            setError(err.message || 'Неизвестная ошибка');
        } finally {
            setLoading(false);
        }
    }, [prop, tone]);

    const handleCopy = useCallback(() => {
        const plain = result.replace(/\*\*(.+?)\*\*/g, '$1');
        navigator.clipboard.writeText(plain).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [result]);

    const TONES = [
        { value: 'professional', label: 'Деловой' },
        { value: 'friendly',     label: 'Дружелюбный' },
        { value: 'concise',      label: 'Краткий' },
    ];

    return (
        <div className="card" style={{ padding: 0, overflow: 'hidden', border: 'none', boxShadow: '0 8px 32px rgba(0,0,0,0.03)', borderRadius: 28, background: 'white' }}>
            {/* Header toggle */}
            <button
                id="ad-generator-toggle"
                style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', padding: '18px 20px',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit',
                }}
                onClick={() => setOpen(o => !o)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                        background: 'linear-gradient(135deg, var(--primary), #3b82f6)',
                        padding: 10, borderRadius: 14, color: 'white',
                        boxShadow: '0 4px 12px rgba(0,82,255,0.2)'
                    }}>
                        <Wand2 size={20} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <div className="font-oswald" style={{ fontWeight: 700, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--text)' }}>Генератор объявления</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                            {result ? 'Объявление готово' : 'AI + глубокий анализ данных'}
                        </div>
                    </div>
                </div>
                {open
                    ? <ChevronUp size={20} color="var(--text-muted)" />
                    : <ChevronDown size={20} color="var(--text-muted)" />
                }
            </button>

            {open && (
                <div style={{ padding: '4px 20px 24px', borderTop: '1px solid var(--border-light)' }}>

                    {/* Tone selector */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        {TONES.map(t => (
                            <button
                                key={t.value}
                                onClick={() => setTone(t.value)}
                                style={{
                                    flex: 1, padding: '10px 0', fontSize: 13, borderRadius: 14,
                                    border: `1.5px solid ${tone === t.value ? 'var(--primary)' : 'var(--border-light)'}`,
                                    background: tone === t.value ? 'var(--primary-light)' : 'var(--bg-light)',
                                    color: tone === t.value ? 'var(--primary)' : 'var(--text-secondary)',
                                    cursor: 'pointer', fontFamily: 'inherit', fontWeight: tone === t.value ? 700 : 500,
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* Generate button */}
                    <button
                        id="ad-generator-btn"
                        className="btn btn-primary btn-full"
                        style={{ marginTop: 16, height: 52, borderRadius: 16 }}
                        onClick={generate}
                        disabled={loading}
                    >
                        {loading
                            ? <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Анализирую...</>
                            : <><Wand2 size={18} /> {result ? 'Перегенерировать' : 'Сгенерировать объявление'}</>
                        }
                    </button>

                    {/* Loading status */}
                    {loading && <LoadingStatus step={loadStep} />}

                    {/* Error */}
                    {error && (
                        <div style={{
                            marginTop: 16, padding: 16,
                            background: 'var(--danger-light)',
                            borderRadius: 16, fontSize: 14,
                            color: 'var(--danger)',
                            border: '1px solid rgba(239, 68, 68, 0.1)',
                        }}>
                            {error}
                        </div>
                    )}

                    {/* Result */}
                    {result && !error && (
                        <div className="fade-in" style={{ marginTop: 20 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <WordCount text={result} />
                                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--border)' }} />
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>AIDA модель</span>
                                </div>
                                <button
                                    onClick={generate}
                                    disabled={loading}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
                                    title="Перегенерировать"
                                >
                                    <RefreshCw size={14} />
                                </button>
                            </div>

                            <div style={{
                                background: 'var(--bg-light)',
                                border: '1px solid var(--border-light)',
                                borderRadius: 20,
                                padding: 20,
                                marginBottom: 16,
                            }}>
                                <AdText text={result} />
                            </div>

                            <button
                                id="ad-copy-btn"
                                className="btn btn-secondary btn-full"
                                style={{ height: 52, borderRadius: 16, background: 'white', color: 'var(--text)' }}
                                onClick={handleCopy}
                            >
                                {copied
                                    ? <><Check size={18} /> Скопировано!</>
                                    : <><Copy size={18} /> Копировать текст</>
                                }
                            </button>

                            <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', opacity: 0.8 }}>
                                * Проверьте текст перед публикацией на соответствие правилам площадки.
                            </div>
                        </div>
                    )}
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

