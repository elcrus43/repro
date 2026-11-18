import { describe, it, expect } from 'vitest';
import {
    getBirthdayInfo,
    formatAge,
    getClientSalutation,
    buildFallbackBirthdayGreeting,
    GREETING_TONES
} from './birthdayGreetingGenerator.js';

describe('birthdayGreetingGenerator', () => {
    describe('formatAge', () => {
        it('correctly declines age in Russian', () => {
            expect(formatAge(1)).toBe('1 год');
            expect(formatAge(21)).toBe('21 год');
            expect(formatAge(2)).toBe('2 года');
            expect(formatAge(24)).toBe('24 года');
            expect(formatAge(5)).toBe('5 лет');
            expect(formatAge(11)).toBe('11 лет');
            expect(formatAge(14)).toBe('14 лет');
            expect(formatAge(35)).toBe('35 лет');
        });
    });

    describe('getBirthdayInfo', () => {
        it('returns null for empty dates', () => {
            expect(getBirthdayInfo(null)).toBeNull();
            expect(getBirthdayInfo('')).toBeNull();
            expect(getBirthdayInfo('invalid-date')).toBeNull();
        });

        it('calculates birthday details accurately', () => {
            const today = new Date();
            const birthYear = today.getFullYear() - 30;
            const pad = (n) => String(n).padStart(2, '0');
            const todayBirthStr = `${birthYear}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

            const info = getBirthdayInfo(todayBirthStr);
            expect(info).not.toBeNull();
            expect(info.isToday).toBe(true);
            expect(info.daysLeft).toBe(0);
            expect(info.age).toBe(30);
            expect(info.ageFormatted).toBe('30 лет');
        });
    });

    describe('getClientSalutation', () => {
        it('extracts first and middle name with respectful prefix', () => {
            const resMale = getClientSalutation('Иванов Петр Сергеевич');
            expect(resMale.greetingName).toBe('Уважаемый Петр Сергеевич');
            expect(resMale.shortName).toBe('Петр');

            const resFemale = getClientSalutation('Смирнова Елена Дмитриевна');
            expect(resFemale.greetingName).toBe('Уважаемая Елена Дмитриевна');
            expect(resFemale.shortName).toBe('Елена');
        });

        it('handles two-word names', () => {
            const res = getClientSalutation('Анна Соколова');
            expect(res.greetingName).toBe('Уважаемая Анна');
        });

        it('handles single names or fallback', () => {
            const res = getClientSalutation('Алексей');
            expect(res.greetingName).toBe('Уважаемый Алексей');

            const emptyRes = getClientSalutation('');
            expect(emptyRes.greetingName).toBe('Уважаемый клиент');
        });
    });

    describe('buildFallbackBirthdayGreeting', () => {
        const client = {
            full_name: 'Иван Сергеевич Кузнецов',
            birth_date: '1990-05-15'
        };

        it('includes Самолет Плюс Киров and agent name in all tones', () => {
            GREETING_TONES.forEach(tone => {
                const text = buildFallbackBirthdayGreeting({
                    client,
                    agentName: 'Константин Смирнов',
                    agentPhone: '+7 (912) 345-67-89',
                    tone: tone.id,
                    companyName: 'Самолет Плюс Киров'
                });

                expect(text).toContain('Самолет Плюс Киров');
                expect(text).toContain('Константин Смирнов');
                expect(text).toContain(tone.id === 'short' ? 'Иван' : 'Иван Сергеевич');
                // Строго дефис -, никаких длинных тире — по правилам AGENTS.md
                expect(text).not.toContain('—');
            });
        });

        it('generates warm tone correctly', () => {
            const text = buildFallbackBirthdayGreeting({
                client,
                agentName: 'Анна Риелтор',
                tone: 'warm'
            });
            expect(text).toContain('От всей души поздравляю Вас с днем рождения');
            expect(text).toContain('Самолет Плюс Киров');
        });

        it('generates business tone correctly', () => {
            const text = buildFallbackBirthdayGreeting({
                client,
                agentName: 'Анна Риелтор',
                tone: 'business'
            });
            expect(text).toContain('финансовой стабильности и процветания');
        });

        it('generates home tone correctly', () => {
            const text = buildFallbackBirthdayGreeting({
                client,
                agentName: 'Анна Риелтор',
                tone: 'home'
            });
            expect(text).toContain('главное место силы');
        });

        it('generates short tone correctly', () => {
            const text = buildFallbackBirthdayGreeting({
                client,
                agentName: 'Анна Риелтор',
                tone: 'short'
            });
            expect(text).toContain('Иван, с днем рождения!');
        });
    });
});
