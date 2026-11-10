import React, { useState } from 'react';
import { recordFeedback } from '../utils/uxTracker';
import { Star, X, Check } from 'lucide-react';

/**
 * UxFeedbackWidget - компактный микроопрос CES (Customer Effort Score)
 * Появляется в комфортной зоне большого пальца (Thumb Zone) после ключевых действий риелтора.
 * 
 * Правила проекта:
 * - Строго дефис '-', никаких длинных тире.
 * - Кодировка UTF-8, окончания LF.
 */
export function UxFeedbackWidget({
  scenario = 'general',
  question = 'Насколько легко было выполнить действие?',
  onClose,
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (scoreToSubmit) => {
    const finalScore = scoreToSubmit || rating;
    if (finalScore <= 0) return;

    recordFeedback(scenario, {
      score: finalScore,
      metricType: 'CES',
      comment,
    });

    setSubmitted(true);
    setTimeout(() => {
      if (onClose) onClose();
    }, 1800);
  };

  return (
    <div
      role="region"
      aria-label="UX опрос"
      style={{
        position: 'fixed',
        bottom: '84px', // чуть выше BottomNav
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '380px',
        backgroundColor: 'var(--surface-color, #1e2430)',
        color: 'var(--text-primary, #ffffff)',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.36)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 9999,
        animation: 'fadeInUp 0.25s ease-out',
      }}
    >
      {submitted ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', padding: '8px 0' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={18} color="#ffffff" />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 500 }}>Спасибо! Ваш отзыв поможет сделать CRM удобнее.</span>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', letterSpacing: '0.02em' }}>
              ОЦЕНКА УДОБСТВА (CES)
            </span>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label="Закрыть"
            >
              <X size={16} />
            </button>
          </div>

          <p style={{ margin: '0 0 12px 0', fontSize: '14px', lineHeight: 1.4, fontWeight: 500 }}>
            {question}
          </p>

          {/* Рейтинг 1-5 звезд */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            {[1, 2, 3, 4, 5].map((star) => {
              const active = (hoverRating || rating) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => {
                    setRating(star);
                    handleSubmit(star);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    color: active ? '#fbbf24' : '#64748b',
                    transition: 'transform 0.1s ease',
                  }}
                >
                  <Star size={24} fill={active ? '#fbbf24' : 'none'} />
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>{star}</span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
            <span>1 - Сложно</span>
            <span>5 - В 1 клик</span>
          </div>
        </>
      )}
    </div>
  );
}
