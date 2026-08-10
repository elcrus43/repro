import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Loader2, CheckCircle, AlertTriangle, Eye, RefreshCw, ChevronRight, Info } from 'lucide-react';
import { useToastContext } from './Toast';

/**
 * Парсинг российского внутреннего паспорта (паспорт гражданина РФ)
 *
 * Реальная структура разворота (по образцу):
 *
 * Страница 3 (верх — орган выдачи):
 *   РОССИЙСКАЯ ФЕДЕРАЦИЯ
 *   Паспорт выдан ОТДЕЛОМ УФМС РОССИЙ ПО КИРОВСКОЙ ОБЛАСТИ В ПГТ. ОРИЧИ
 *   Дата выдачи 17.12.2015    вподразделения 430-024
 *
 * Страница 2 (низ — личные данные):
 *   ПУШКАРЕВ          <- ЗНАЧЕНИЕ (крупный шрифт)
 *   Фамилия           <- метка (мелкий курсив НИЖЕ значения!)
 *   СЕРГЕЙ
 *   Имя
 *   БОРИСОВИЧ
 *   Отчество
 *   МУЖ   07.12.1970
 *   Пол   Дата рождения
 *   С.АДЫШЕВО ОРИЧЕВСКОГО Р-НА КИРОВСКОЙ ОБЛ.
 *   Место рождения
 *
 * Серия+номер: "33 15 382413" — вертикально на полях.
 */
function parseRussianPassport(text) {
  if (!text) return {};
  const result = {};

  const normalized = text
    .replace(/\r/g, '\n')
    .replace(/[–—]/g, '-')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const lines = normalized.split('\n').map(l => l.trim()).filter(Boolean);

  // Метки паспорта РФ (все варианты OCR)
  const LABEL_MAP = {
    lastName:   ['ФАМИЛИЯ', 'ФАМИЛ', 'SURNAME'],
    firstName:  ['ИМЯ', 'NAME'],
    patronymic: ['ОТЧЕСТВО', 'ОТЧЕСТ', 'PATRONYMIC'],
    sex:        ['ПОЛ', 'SEX'],
    birthDate:  ['ДАТА РОЖДЕНИЯ', 'ДАТАРОЖДЕНИЯ', 'ДАТА РОЖД', 'DATE OF BIRTH'],
    birthPlace: ['МЕСТО РОЖДЕНИЯ', 'МЕСТЕРОЖДЕНИЯ', 'МЕСТО РОЖД', 'PLACE OF BIRTH'],
    issuedBy:   ['ПАСПОРТ ВЫДАН', 'КЕМ ВЫДАН', 'КЕМВЫДАН', 'ВЫДАН'],
    issueDate:  ['ДАТА ВЫДАЧИ', 'ДАТАВЫДАЧИ', 'ДАТА ВЫД'],
    unitCode:   ['ВПОДРАЗДЕЛЕНИЯ', 'КОД ПОДРАЗДЕЛЕНИЯ', 'КОДПОДРАЗДЕЛЕНИЯ', 'КОД ПОДР', 'ПОДРАЗДЕЛЕН'],
  };

  const allLabelStrings = Object.values(LABEL_MAP).flat();
  const isLabelLine = (line) =>
    allLabelStrings.some(lv => line.toUpperCase().replace(/\s+/g, ' ').includes(lv));

  // Страница 2: значение находится ПЕРЕД меткой (выше неё)
  function findValueBeforeLabel(labelVariants) {
    for (let i = 0; i < lines.length; i++) {
      const upper = lines[i].toUpperCase().replace(/\s+/g, ' ');
      if (labelVariants.some(lv => upper.includes(lv))) {
        for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
          const candidate = lines[j].trim();
          if (candidate && !isLabelLine(candidate)) return candidate;
        }
      }
    }
    return null;
  }

  // Страница 3: значение находится ПОСЛЕ метки или на той же строке
  function findValueAfterLabel(labelVariants) {
    for (let i = 0; i < lines.length; i++) {
      const upper = lines[i].toUpperCase().replace(/\s+/g, ' ');
      const matchedLv = labelVariants.find(lv => upper.includes(lv));
      if (matchedLv) {
        const sameLineVal = lines[i]
          .substring(lines[i].toUpperCase().indexOf(matchedLv) + matchedLv.length)
          .trim();
        if (sameLineVal && sameLineVal.length > 1) return sameLineVal;
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const candidate = lines[j].trim();
          if (candidate && !isLabelLine(candidate)) return candidate;
        }
      }
    }
    return null;
  }

  // ── СЕРИЯ И НОМЕР ──
  // "33 15 382413" → серия "3315", номер "382413"
  const snMatch1 = text.match(/\b(\d{2})\s+(\d{2})\s+(\d{6})\b/);
  const snMatch2 = text.match(/\b(\d{4})\s{1,4}(\d{6})\b/);
  if (snMatch1) {
    result.series = snMatch1[1] + snMatch1[2];
    result.number = snMatch1[3];
  } else if (snMatch2) {
    result.series = snMatch2[1];
    result.number = snMatch2[2];
  }

  // ── ФИО (значение ПЕРЕД меткой) ──
  result.last_name  = findValueBeforeLabel(LABEL_MAP.lastName)   || '';
  result.first_name = findValueBeforeLabel(LABEL_MAP.firstName)  || '';
  result.patronymic = findValueBeforeLabel(LABEL_MAP.patronymic) || '';

  // Имя и отчество могут слиться: "СЕРГЕЙ БОРИСОВИЧ"
  if (result.first_name.includes(' ') && !result.patronymic) {
    const parts = result.first_name.trim().split(/\s+/);
    result.first_name = parts[0];
    result.patronymic = parts.slice(1).join(' ');
  }

  if (result.last_name || result.first_name) {
    result.full_name = `${result.last_name} ${result.first_name} ${result.patronymic}`
      .trim().replace(/\s+/g, ' ');
  }

  // ── ПОЛ ──
  const rawSexLine = findValueBeforeLabel(LABEL_MAP.sex);
  if (rawSexLine && /МУЖ|ЖЕН/i.test(rawSexLine)) {
    result.sex = /МУЖ/i.test(rawSexLine) ? 'МУЖ' : 'ЖЕН';
  } else if (/\bМУЖ\b/i.test(text)) result.sex = 'МУЖ';
  else if (/\bЖЕН\b/i.test(text)) result.sex = 'ЖЕН';

  // ── ДАТА РОЖДЕНИЯ (значение ПЕРЕД меткой "Дата рождения") ──
  const allDates = [...text.matchAll(/(\d{2})[.\-](\d{2})[.\-](\d{4})/g)];
  const birthDateLine = findValueBeforeLabel(LABEL_MAP.birthDate);

  if (birthDateLine) {
    const dm = birthDateLine.match(/(\d{2})[.\-](\d{2})[.\-](\d{4})/);
    if (dm) {
      result.birth_date = `${dm[3]}-${dm[2]}-${dm[1]}`;
      result.birth_date_display = `${dm[1]}.${dm[2]}.${dm[3]}`;
    }
  }
  if (!result.birth_date && allDates.length > 0) {
    const [, d, m, y] = allDates[0];
    result.birth_date = `${y}-${m}-${d}`;
    result.birth_date_display = `${d}.${m}.${y}`;
  }

  // ── МЕСТО РОЖДЕНИЯ (значение ПЕРЕД меткой, может быть многострочным) ──
  const birthPlaceRaw = findValueBeforeLabel(LABEL_MAP.birthPlace);
  if (birthPlaceRaw) {
    const bpIdx = lines.findIndex(l => l.trim() === birthPlaceRaw.trim());
    if (bpIdx !== -1) {
      const parts = [birthPlaceRaw];
      for (let k = bpIdx - 1; k >= Math.max(0, bpIdx - 3); k--) {
        const ln = lines[k].trim();
        if (!ln || isLabelLine(ln) || /\d{2}[.\-]\d{2}[.\-]\d{4}/.test(ln)) break;
        parts.unshift(ln);
      }
      result.birth_place = parts.join(' ').substring(0, 100);
    } else {
      result.birth_place = birthPlaceRaw;
    }
  }

  // ── КЕМ ВЫДАН (значение ПОСЛЕ "Паспорт выдан" — стр. 3) ──
  const rawIssuedBy = findValueAfterLabel(LABEL_MAP.issuedBy);
  if (rawIssuedBy) {
    const idx = lines.findIndex(l => l.trim() === rawIssuedBy.trim());
    if (idx !== -1) {
      const parts = [rawIssuedBy];
      for (let k = idx + 1; k < Math.min(idx + 4, lines.length); k++) {
        const ln = lines[k].trim();
        if (!ln || isLabelLine(ln) || /^\d{2}[.\-]\d{2}[.\-]\d{4}/.test(ln)) break;
        parts.push(ln);
      }
      result.issued_by = parts.join(' ').substring(0, 150);
    } else {
      result.issued_by = rawIssuedBy;
    }
  }

  // ── ДАТА ВЫДАЧИ (inline: "Дата выдачи 17.12.2015") ──
  const issueDateInline = text.match(/[Дд]ата\s+выдачи[\s:]*(\d{2}[.\-]\d{2}[.\-]\d{4})/);
  if (issueDateInline) {
    result.issue_date = issueDateInline[1];
  } else if (allDates.length > 1) {
    const [, d, m, y] = allDates[1];
    result.issue_date = `${d}.${m}.${y}`;
  }

  // ── КОД ПОДРАЗДЕЛЕНИЯ (XXX-XXX рядом с датой выдачи) ──
  const ucInline = text.match(/(?:под\s*разделени[яе]|вподразделения)[\s:]*(\d{3}[-\s]\d{3})/i);
  if (ucInline) {
    result.unit_code = ucInline[1].replace(/\s/, '-');
  } else {
    const ucMatch = text.match(/\b(\d{3})-(\d{3})\b/);
    if (ucMatch) result.unit_code = `${ucMatch[1]}-${ucMatch[2]}`;
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
  const [scanPage, setScanPage] = useState('main');

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
        'rus',
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

      if (scanPage === 'reg' && extracted) {
        const merged = {
          ...extracted,
          reg_address: parsedData.birth_place || parsedData.address || extracted.reg_address || '',
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

          {/* Выбор страницы */}
          <div style={{ display: 'flex', gap: 8 }}>
            {[
              { id: 'main', label: '📋 Стр. 2-3 (ФИО, дата, серия)', sub: 'Основные данные' },
              { id: 'reg',  label: '🏠 Стр. 5 (Прописка)',           sub: 'Адрес регистрации' }
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
                      Держите паспорт ровно, избегайте бликов на ламинате. Весь текст должен быть чётким.
                    </>
                  ) : (
                    <>
                      <strong>Сфотографируйте страницу 5</strong> — «Место жительства».<br />
                      Убедитесь что штамп с адресом полностью виден и не смазан.
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
                  { label: 'ФИО',                key: 'full_name',  type: 'text', placeholder: 'Иванов Иван Иванович' },
                  { label: 'Дата рождения',      key: 'birth_date', type: 'date', placeholder: '' },
                  { label: 'Серия паспорта',     key: 'series',     type: 'text', placeholder: '3315' },
                  { label: 'Номер паспорта',     key: 'number',     type: 'text', placeholder: '382413' },
                  { label: 'Место рождения',     key: 'birth_place',type: 'text', placeholder: 'г. Москва' },
                  { label: 'Дата выдачи',        key: 'issue_date', type: 'text', placeholder: 'ДД.ММ.ГГГГ' },
                  { label: 'Код подразделения',  key: 'unit_code',  type: 'text', placeholder: '430-024' },
                  { label: 'Кем выдан',          key: 'issued_by',  type: 'text', placeholder: 'Отдел УФМС...' },
                  { label: 'Адрес регистрации',  key: 'reg_address',type: 'text', placeholder: 'г. Москва, ул...' },
                ].map(field => (
                  <div key={field.key} style={{
                    padding: '8px 12px', background: '#f8fafc',
                    borderRadius: 12, border: `1px solid ${extracted[field.key] ? '#a7f3d0' : '#e2e8f0'}`
                  }}>
                    <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500, marginBottom: 2 }}>{field.label}</div>
                    <input
                      type={field.type}
                      value={extracted[field.key] || ''}
                      placeholder={`${field.placeholder} (не распознано)`}
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
