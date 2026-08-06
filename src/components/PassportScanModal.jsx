import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Loader2, CheckCircle, AlertTriangle, Eye, RefreshCw, ChevronRight, Info } from 'lucide-react';
import { useToastContext } from './Toast';

/**
 * Парсинг российского внутреннего паспорта (паспорт гражданина РФ)
 * 
 * Структура страницы 2-3 (основные данные):
 * - Фамилия
 * - Имя Отчество
 * - Пол / Дата рождения
 * - Место рождения
 * - Серия и номер (XXXX XXXXXX)
 * - Дата выдачи
 * - Код подразделения (XXX-XXX)
 * - Кем выдан
 */
function parseRussianPassport(text) {
  if (!text) return {};
  const result = {};

  // Нормализация — убираем лишние пробелы, переносы
  const normalized = text.replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Серия и номер паспорта — паттерн: 4 цифры + пробел + 6 цифр
  const seriesNumMatch = text.match(/(\d{4})\s{1,3}(\d{6})/);
  if (seriesNumMatch) {
    result.series = seriesNumMatch[1];
    result.number = seriesNumMatch[2];
  }

  // 2. Дата рождения — паттерн: ДД.ММ.ГГГГ или ДД ММ ГГГГ (на строке с "рождения" или просто дата)
  const birthDateMatches = [...text.matchAll(/(\d{2})[.\s/](\d{2})[.\s/](\d{4})/g)];
  // Обычно первая дата — дата рождения, вторая — дата выдачи
  if (birthDateMatches.length > 0) {
    const [, d, m, y] = birthDateMatches[0];
    result.birth_date = `${y}-${m}-${d}`; // ISO для input[type=date]
    result.birth_date_display = `${d}.${m}.${y}`;
  }
  if (birthDateMatches.length > 1) {
    const [, d, m, y] = birthDateMatches[1];
    result.issue_date = `${d}.${m}.${y}`;
  }

  // 3. Код подразделения — паттерн: XXX-XXX или XXX XXX
  const unitCodeMatch = text.match(/(\d{3})[\s-](\d{3})/);
  if (unitCodeMatch) {
    result.unit_code = `${unitCodeMatch[1]}-${unitCodeMatch[2]}`;
  }

  // 4. ФИО — ищем строки с русскими заглавными буквами
  //    В паспорте РФ: Фамилия на одной строке, Имя Отчество — на следующей
  const cyrillicUpperLines = lines.filter(l =>
    /^[А-ЯЁ][А-ЯЁа-яё\s-]{2,}$/.test(l) &&
    l.length >= 3 &&
    l.length <= 50 &&
    !/\d/.test(l) &&
    !['РОССИЙСКАЯ', 'ФЕДЕРАЦИЯ', 'ПАСПОРТ', 'ФАМИЛИЯ', 'ИМЯ', 'ОТЧЕСТВО', 'МЕСТО', 'РОЖДЕНИЯ',
      'ДАТА', 'ВЫДАЧИ', 'КОД', 'ПОЛА', 'МУЖСКОЙ', 'ЖЕНСКИЙ', 'ПОЛ', 'ВЫДАН'].includes(l.toUpperCase())
  );

  // Обычно первые 2-3 строки с именами — это ФИО
  if (cyrillicUpperLines.length >= 2) {
    const lastName = cyrillicUpperLines[0];
    const firstParts = cyrillicUpperLines[1].split(/\s+/);
    const firstName = firstParts[0] || '';
    const patronymic = firstParts.slice(1).join(' ') || (cyrillicUpperLines[2] || '');
    
    result.last_name = lastName;
    result.first_name = firstName;
    result.patronymic = patronymic;
    result.full_name = `${lastName} ${firstName} ${patronymic}`.trim().replace(/\s+/g, ' ');
  } else if (cyrillicUpperLines.length === 1) {
    result.full_name = cyrillicUpperLines[0];
  }

  // 5. Пол
  if (/МУЖСКОЙ|муж\./i.test(text)) result.sex = 'М';
  else if (/ЖЕНСКИЙ|жен\./i.test(text)) result.sex = 'Ж';

  // 6. Место рождения — строка после "МЕСТО РОЖДЕНИЯ" или "место рождения"
  const birthPlaceMatch = text.match(/(?:место\s+рождения|birth\s+place)[:\s\n]+([А-ЯЁа-яё\s.,\-]+)/i);
  if (birthPlaceMatch) {
    result.birth_place = birthPlaceMatch[1].trim().substring(0, 80);
  }

  // 7. Орган выдачи — строка после "Кем выдан" или "выдан"
  const issuedByMatch = text.match(/(?:кем\s+выдан|выдан|орган|department)[:\s\n]+([А-ЯЁа-яё\s.,\-№\d]+)/i);
  if (issuedByMatch) {
    result.issued_by = issuedByMatch[1].trim().substring(0, 120);
  }

  // 8. Адрес регистрации (страница 5) — ищем типичный адресный паттерн
  const addressMatch = text.match(/(?:г\.?\s|ул\.?\s|пр\.?\s|д\.?\s|кв\.?\s|обл\.?)([А-ЯЁа-яё\s.,\-\d№]+)/i);
  if (addressMatch) {
    result.address = addressMatch[0].trim().substring(0, 150);
  }

  return result;
}

export function PassportScanModal({ isOpen, onClose, onExtracted }) {
  const { toast } = useToastContext();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStatus, setProgressStatus] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [error, setError] = useState(null);
  const [scanPage, setScanPage] = useState('main'); // 'main' | 'reg'

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите изображение (JPG, PNG)');
      return;
    }
    setImage(file);
    setImageUrl(URL.createObjectURL(file));
    setExtracted(null);
    setError(null);
  };

  const processImage = useCallback(async () => {
    if (!image) return;
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setProgressStatus('Загрузка движка (Tesseract.js)...');

    try {
      const Tesseract = await import('tesseract.js');
      setProgressStatus('Распознавание текста на русском языке...');
      setProgress(10);

      const result = await Tesseract.recognize(
        image,
        'rus', // только русский язык для точности
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProgress(10 + Math.round(m.progress * 80));
              setProgressStatus(`Обработка: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );

      setProgress(90);
      setProgressStatus('Анализ полей паспорта...');

      const text = result.data.text || '';
      const parsedData = parseRussianPassport(text);

      setProgress(100);
      setProgressStatus('Готово!');

      // Для страницы регистрации — добавляем к уже извлечённым данным
      if (scanPage === 'reg' && extracted) {
        const merged = {
          ...extracted,
          reg_address: parsedData.address || extracted.reg_address || '',
        };
        setExtracted(merged);
        toast.success('Адрес регистрации распознан!');
      } else {
        setExtracted(parsedData);

        const fieldsFound = Object.values(parsedData).filter(v => v && v.toString().trim()).length;
        if (fieldsFound === 0) {
          setError('Не удалось извлечь данные. Убедитесь что страница паспорта хорошо освещена, не смазана и полностью попадает в кадр.');
        } else {
          toast.success(`Распознано ${fieldsFound} полей! Проверьте и при необходимости исправьте.`);
        }
      }
    } catch (err) {
      console.error('OCR error:', err);
      setError(`Ошибка распознавания: ${err.message || 'Попробуйте другое фото'}`);
    } finally {
      setIsProcessing(false);
    }
  }, [image, toast, scanPage, extracted]);

  const handleAccept = () => {
    if (!extracted) return;
    onExtracted(extracted);
    toast.success('Данные паспорта внесены в форму!');
    onClose();
  };

  const handleReset = () => {
    setImage(null);
    setImageUrl(null);
    setExtracted(null);
    setError(null);
    setProgress(0);
    setProgressStatus('');
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16
    }}>
      <div style={{
        background: 'var(--surface, #ffffff)',
        borderRadius: 24, width: '100%', maxWidth: 520,
        maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
        border: '1px solid var(--border-light, #e2e8f0)',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 20px',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '24px 24px 0 0', color: '#ffffff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Camera size={20} color="#60a5fa" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Сканирование паспорта РФ</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                OCR распознавание · данные остаются на устройстве
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{
            border: 'none', background: 'rgba(255,255,255,0.1)', color: '#ffffff',
            width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Выбор страницы паспорта */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { id: 'main', label: '📋 Стр. 2-3 (ФИО, дата, серия)', sub: 'Основные данные' },
              { id: 'reg', label: '🏠 Стр. 5 (Прописка)', sub: 'Адрес регистрации' }
            ].map(pg => (
              <button
                key={pg.id}
                type="button"
                onClick={() => { setScanPage(pg.id); handleReset(); }}
                style={{
                  flex: 1, padding: '10px 8px', borderRadius: 12, border: 'none',
                  background: scanPage === pg.id ? '#1e293b' : '#f1f5f9',
                  color: scanPage === pg.id ? '#ffffff' : '#475569',
                  fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  transition: 'all 0.2s', textAlign: 'center'
                }}
              >
                <div>{pg.label}</div>
                <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>{pg.sub}</div>
              </button>
            ))}
          </div>

          {/* Инструкция */}
          {!imageUrl && (
            <div style={{
              background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14,
              padding: '12px 14px', fontSize: 12, color: '#1e40af'
            }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                <div style={{ lineHeight: 1.6 }}>
                  {scanPage === 'main' ? (
                    <>
                      <strong>Сфотографируйте разворот 2-3</strong> — страница с фото и данными.<br />
                      Держите паспорт ровно, избегайте бликов и теней. Весь текст должен быть чётким.
                    </>
                  ) : (
                    <>
                      <strong>Сфотографируйте страницу 5</strong> — «Место жительства».<br />
                      Убедитесь что штамп с адресом полностью виден.
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Кнопки загрузки */}
          {!imageUrl && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  padding: '24px 16px', border: '2px dashed #3b82f6', borderRadius: 18,
                  background: '#eff6ff', color: '#2563eb', cursor: 'pointer'
                }}
              >
                <Camera size={32} color="#3b82f6" />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Камера</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Сфотографировать</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                  padding: '24px 16px', border: '2px dashed #8b5cf6', borderRadius: 18,
                  background: '#f5f3ff', color: '#7c3aed', cursor: 'pointer'
                }}
              >
                <Upload size={32} color="#8b5cf6" />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Файл</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>JPG, PNG, WEBP</div>
                </div>
              </button>

              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileChange} />
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            </div>
          )}

          {/* Превью */}
          {imageUrl && !isProcessing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                <img src={imageUrl} alt="Паспорт" style={{ width: '100%', maxHeight: 280, objectFit: 'contain', display: 'block', background: '#000' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {!extracted && (
                  <button
                    type="button"
                    onClick={processImage}
                    style={{
                      flex: 1, padding: '12px 0', borderRadius: 14, border: 'none',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                      color: '#ffffff', fontSize: 14, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
                    }}
                  >
                    <Eye size={18} />
                    Распознать паспорт
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    padding: '12px 16px', borderRadius: 14, border: '1px solid #e2e8f0',
                    background: '#f8fafc', color: '#64748b', fontSize: 13, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={16} />
                  Другое фото
                </button>
              </div>
            </div>
          )}

          {/* Прогресс */}
          {isProcessing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Loader2 size={22} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{progressStatus}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>15–40 секунд, пожалуйста подождите...</div>
                </div>
              </div>
              <div style={{ height: 6, borderRadius: 4, background: '#e2e8f0', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                  width: `${progress}%`, transition: 'width 0.4s ease'
                }} />
              </div>
              {imageUrl && <img src={imageUrl} alt="Паспорт" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 12, border: '1px solid #e2e8f0', opacity: 0.5 }} />}
            </div>
          )}

          {/* Ошибка */}
          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 14, padding: '12px 14px', display: 'flex', gap: 10 }}>
              <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.5 }}>{error}</div>
            </div>
          )}

          {/* Результат */}
          {extracted && !isProcessing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={18} color="#10b981" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Данные распознаны — проверьте и исправьте</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'ФИО', key: 'full_name', type: 'text', placeholder: 'Иванов Иван Иванович' },
                  { label: 'Дата рождения', key: 'birth_date', type: 'date', placeholder: '' },
                  { label: 'Серия паспорта', key: 'series', type: 'text', placeholder: '1234' },
                  { label: 'Номер паспорта', key: 'number', type: 'text', placeholder: '567890' },
                  { label: 'Дата выдачи', key: 'issue_date', type: 'text', placeholder: 'ДД.ММ.ГГГГ' },
                  { label: 'Код подразделения', key: 'unit_code', type: 'text', placeholder: '123-456' },
                  { label: 'Кем выдан', key: 'issued_by', type: 'text', placeholder: 'ГУ МВД России...' },
                  { label: 'Адрес регистрации', key: 'reg_address', type: 'text', placeholder: 'г. Москва, ул...' },
                ].map(field => (
                  <div key={field.key} style={{
                    padding: '8px 12px', background: '#f8fafc',
                    borderRadius: 12, border: `1px solid ${extracted[field.key] ? '#a7f3d0' : '#e2e8f0'}`
                  }}>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500, marginBottom: 2 }}>{field.label}</div>
                    <input
                      type={field.type}
                      value={extracted[field.key] || ''}
                      placeholder={extracted[field.key] ? '' : `${field.placeholder} (не распознано)`}
                      onChange={e => setExtracted(prev => ({ ...prev, [field.key]: e.target.value }))}
                      style={{
                        fontSize: 13, fontWeight: 600,
                        color: extracted[field.key] ? '#0f172a' : '#94a3b8',
                        border: 'none', background: 'none', width: '100%', outline: 'none', padding: 0
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Кнопка доп. сканирования страницы прописки */}
              {scanPage === 'main' && !extracted.reg_address && (
                <button
                  type="button"
                  onClick={() => { setScanPage('reg'); handleReset(); }}
                  style={{
                    padding: '10px', borderRadius: 12, border: '1.5px dashed #94a3b8',
                    background: '#f8fafc', color: '#475569', fontSize: 12, fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    cursor: 'pointer'
                  }}
                >
                  🏠 Дополнительно: сканировать страницу прописки
                </button>
              )}

              <button
                type="button"
                onClick={handleAccept}
                style={{
                  padding: '14px', borderRadius: 14, border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff', fontSize: 15, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)'
                }}
              >
                <CheckCircle size={18} />
                Заполнить форму этими данными
                <ChevronRight size={18} />
              </button>
              <div style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>
                Все поля можно отредактировать в форме после заполнения
              </div>
            </div>
          )}

          <style>{`
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          `}</style>
        </div>
      </div>
    </div>
  );
}
