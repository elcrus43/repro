/* global process */
import { describe, it, expect } from 'vitest';
import { formatAiError } from '../../api/ai-proxy.js';

const GEO_ERROR = 'Gemini gemini-3.8-flash (400): {"error":{"code":400,"message":"User location is not supported for the API use.","status":"FAILED_PRECONDITION"}}';
const BALANCE_ERROR = 'Gemini gemini-3.8-flash (402): Your prepayment credits are depleted';
const OPENMODEL_BALANCE = 'OpenModel deepseek-v4-flash (402): {"error":{"message":"insufficient balance"}}';
const ZHIPU_BALANCE = 'Zhipu glm-4.5-air (429): {"error":{"code":"1113","message":"余额不足"}}';
const FREE_TIER_QUOTA_ERROR = 'Gemini gemini-3.8-flash (429): {"error":{"code":429,"message":"You exceeded your current quota, please check your plan and billing details. Quota exceeded for metric: generate_content_free_tier_requests, limit: 20, model: gemini-3.8-flash","status":"RESOURCE_EXHAUSTED"}}';

describe('formatAiError', () => {
  it('возвращает заглушку при пустом списке ошибок', () => {
    expect(formatAiError([])).toBe('Все модели ИИ недоступны или не сконфигурированы.');
    expect(formatAiError(null)).toBe('Все модели ИИ недоступны или не сконфигурированы.');
  });

  it('не называет геоблокировку нехваткой лимитов', () => {
    const message = formatAiError([GEO_ERROR, 'OPENMODEL_API_KEY is not configured', 'ZHIPU_API_KEY is not configured']);

    expect(message).toContain('геоблокировки');
    expect(message).toContain('Google Gemini (AI Studio): API блокирует запросы');
    expect(message).toContain('ключ не настроен');
    expect(message).not.toContain('требуется пополнение');
    expect(message).toContain('Vercel');
  });

  it('сообщает о пополнении баланса, когда деньги правда закончились', () => {
    const message = formatAiError([BALANCE_ERROR, OPENMODEL_BALANCE, ZHIPU_BALANCE]);

    expect(message).toContain('закончились деньги');
    expect(message).not.toContain('геоблокировки');
    expect(message).toContain('Google Gemini (AI Studio): исчерпан баланс');
    expect(message).toContain('OpenModel (DeepSeek): исчерпан баланс');
    expect(message).toContain('Zhipu AI (GLM): исчерпан баланс');
    expect(message).toContain('пополните баланс');
  });

  it('различает дневной лимит free tier и отсутствие денег', () => {
    const message = formatAiError([FREE_TIER_QUOTA_ERROR]);

    expect(message).toContain('превысили лимит запросов');
    expect(message).toContain('превышен лимит количества запросов');
    expect(message).not.toContain('пополните баланс');
    expect(message).not.toContain('геоблокировки');
    expect(message).toContain('20 генераций в сутки');
  });

  it('показывает исходную деталь при неизвестной ошибке провайдера', () => {
    const message = formatAiError(['Gemini gemini-3.8-flash (503): upstream unavailable']);

    expect(message).toContain('Gemini gemini-3.8-flash (503): upstream unavailable');
    expect(message).toContain('Проверьте настройки AI-провайдеров');
  });
});
