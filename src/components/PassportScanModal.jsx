import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Loader2, CheckCircle, AlertTriangle, Eye, RefreshCw, ChevronRight } from 'lucide-react';
import { useToastContext } from './Toast';

// Парсер MRZ строк для российского паспорта
function parseMRZ(line1, line2) {
  try {
    if (!line1 || !line2) return null;
    
    // Очистка строк — убираем лишние символы OCR
    const clean1 = line1.replace(/[^A-Z0-9<]/g, '').padEnd(44, '<').substring(0, 44);
    const clean2 = line2.replace(/[^A-Z0-9<]/g, '').padEnd(44, '<').substring(0, 44);
    
    if (clean1.length < 30 || clean2.length < 30) return null;
    
    // Строка 1: P<RUS[Фамилия]<<[Имя]<[Отчество]
    const namePart = clean1.substring(5).replace(/<<.*/, '').replace(/<+/g, ' ').trim();
    const givenPart = clean1.includes('<<') ? clean1.substring(clean1.indexOf('<<') + 2).replace(/<+/g, ' ').trim() : '';
    
    // Строка 2: [Номер документа][Проверка][Гражданство][Дата рождения][Проверка][Пол][Дата окончания]
    const docNumber = clean2.substring(0, 9).replace(/<+/g, '');
    const birthDateRaw = clean2.substring(13, 19); // YYMMDD
    const sex = clean2.substring(20, 21); // M/F
    const expiryRaw = clean2.substring(21, 27); // YYMMDD
    
    // Форматирование даты рождения
    let birthDate = '';
    if (birthDateRaw && birthDateRaw.length === 6 && /^\d+$/.test(birthDateRaw)) {
      const year = parseInt(birthDateRaw.substring(0, 2));
      const month = birthDateRaw.substring(2, 4);
      const day = birthDateRaw.substring(4, 6);
      const fullYear = year > 30 ? `19${String(year).padStart(2, '0')}` : `20${String(year).padStart(2, '0')}`;
      birthDate = `${fullYear}-${month}-${day}`; // ISO для input[type=date]
    }
    
    return {
      lastName: namePart,
      firstName: givenPart.split(' ')[0] || '',
      patronymic: givenPart.split(' ').slice(1).join(' ') || '',
      fullNameMRZ: `${namePart} ${givenPart}`.trim(),
      docNumber,
      birthDate,
      sex: sex === 'M' ? 'Мужской' : sex === 'F' ? 'Женский' : '',
      expiry: expiryRaw,
      raw1: clean1,
      raw2: clean2
    };
  } catch (e) {
    return null;
  }
}

// Поиск MRZ в распознанном тексте
function findMRZLines(text) {
  if (!text) return null;
  
  // Паттерн: строки из заглавных букв, цифр и < длиной 30-44 символа
  const lines = text.split('\n')
    .map(l => l.replace(/\s/g, '').toUpperCase())
    .filter(l => l.length >= 25 && /^[A-Z0-9<]{25,}$/.test(l));
  
  for (let i = 0; i < lines.length - 1; i++) {
    const l1 = lines[i];
    const l2 = lines[i + 1];
    // MRZ первой строки обычно начинается с P или I
    if ((l1.startsWith('P') || l1.startsWith('I')) && l1.includes('<') && l2.includes('<')) {
      return { line1: l1, line2: l2 };
    }
  }
  
  // Поиск паттерна без первой строки
  for (const l of lines) {
    // Вторая строка MRZ паспорта РФ: 9 цифр номера + RUS + дата рождения
    if (/\d{7}[A-Z0-9]<RUS\d{6}/.test(l) || /[A-Z]{3}\d{6}[A-Z]\d{6}/.test(l)) {
      const idx = lines.indexOf(l);
      if (idx > 0) return { line1: lines[idx - 1], line2: l };
    }
  }
  
  return null;
}

// Парсинг визуальных полей на странице паспорта с помощью Tesseract OCR
function extractVisualFields(text) {
  if (!text) return {};
  const result = {};
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Поиск серии и номера (паттерн: 4 цифры и 6 цифр рядом)
  const seriesNumMatch = text.match(/(\d{4})\s+(\d{6})/);
  if (seriesNumMatch) {
    result.series = seriesNumMatch[1];
    result.number = seriesNumMatch[2];
  }
  
  // Поиск даты выдачи (ДД.ММ.ГГГГ)
  const datePattern = /(\d{2}[.\-/]\d{2}[.\-/]\d{4})/g;
  const dates = text.match(datePattern) || [];
  if (dates.length > 0) result.issue_date_str = dates[0];
  if (dates.length > 1) result.issue_date2_str = dates[1];
  
  // Поиск кода подразделения (паттерн: 3 цифры - 3 цифры)
  const unitCodeMatch = text.match(/(\d{3}[- ]\d{3})/);
  if (unitCodeMatch) result.unit_code = unitCodeMatch[1].replace(' ', '-');
  
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
  const [rawText, setRawText] = useState('');
  const [showRaw, setShowRaw] = useState(false);
  const [error, setError] = useState(null);

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
    setRawText('');
  };

  const processImage = useCallback(async () => {
    if (!image) return;
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    setProgressStatus('Загрузка движка распознавания...');

    try {
      // Динамический импорт Tesseract для code splitting
      const Tesseract = await import('tesseract.js');
      
      setProgressStatus('Распознавание текста паспорта...');
      setProgress(10);

      const result = await Tesseract.recognize(
        image,
        'rus+eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProgress(10 + Math.round(m.progress * 80));
              setProgressStatus(`Распознавание: ${Math.round(m.progress * 100)}%`);
            }
          }
        }
      );
      
      setProgress(90);
      setProgressStatus('Анализ данных...');
      
      const text = result.data.text || '';
      setRawText(text);
      
      // Поиск MRZ строк
      const mrzLines = findMRZLines(text);
      let mrzData = null;
      if (mrzLines) {
        mrzData = parseMRZ(mrzLines.line1, mrzLines.line2);
      }
      
      // Парсинг визуальных полей
      const visualFields = extractVisualFields(text);
      
      setProgress(100);
      setProgressStatus('Готово!');
      
      const extractedData = {
        // Из MRZ
        lastName: mrzData?.lastName || '',
        firstName: mrzData?.firstName || '',
        patronymic: mrzData?.patronymic || '',
        full_name: mrzData ? `${mrzData.lastName} ${mrzData.firstName} ${mrzData.patronymic}`.trim() : '',
        birth_date: mrzData?.birthDate || '',
        sex: mrzData?.sex || '',
        // Из визуального OCR
        series: visualFields.series || (mrzData?.docNumber?.substring(0, 4) || ''),
        number: visualFields.number || (mrzData?.docNumber?.substring(4, 10) || ''),
        unit_code: visualFields.unit_code || '',
        // MRZ сырые данные для отладки
        mrzFound: !!mrzData,
        mrzRaw1: mrzLines?.line1 || '',
        mrzRaw2: mrzLines?.line2 || '',
      };
      
      setExtracted(extractedData);
      
      if (!mrzData && Object.keys(visualFields).length === 0) {
        setError('Не удалось извлечь данные паспорта. Попробуйте сфотографировать страницу паспорта с данными более четко, убедившись что нижняя зона (MRZ) видна.');
      } else {
        toast.success(mrzData ? 'MRZ-зона распознана успешно!' : 'Частичное распознавание — проверьте и исправьте данные');
      }
    } catch (err) {
      console.error('OCR error:', err);
      setError(`Ошибка распознавания: ${err.message || 'Попробуйте другое фото'}`);
      toast.error('Ошибка OCR. Попробуйте другое фото.');
    } finally {
      setIsProcessing(false);
    }
  }, [image, toast]);

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
    setRawText('');
    setError(null);
    setProgress(0);
    setProgressStatus('');
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(15, 23, 42, 0.72)',
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
          padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-light, #e2e8f0)',
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '24px 24px 0 0', color: '#ffffff'
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
              <div style={{ fontSize: 16, fontWeight: 700 }}>Сканирование паспорта</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                OCR + MRZ парсер · Данные не покидают устройство
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

          {/* Инструкция */}
          {!imageUrl && (
            <div style={{
              background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: '12px 14px',
              fontSize: 12, color: '#1e40af', lineHeight: 1.5
            }}>
              📌 <strong>Совет:</strong> Фотографируйте страницу с фото и основными данными. Убедитесь что нижняя полоса с символами &lt;&lt;&lt; (MRZ) хорошо видна — по ней происходит основное распознавание.
            </div>
          )}

          {/* Кнопки загрузки */}
          {!imageUrl && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Камера */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 10, padding: '24px 16px',
                  border: '2px dashed #3b82f6', borderRadius: 18,
                  background: '#eff6ff', color: '#2563eb',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                <Camera size={32} color="#3b82f6" />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Камера</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Сфотографировать</div>
                </div>
              </button>

              {/* Файл */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 10, padding: '24px 16px',
                  border: '2px dashed #8b5cf6', borderRadius: 18,
                  background: '#f5f3ff', color: '#7c3aed',
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                <Upload size={32} color="#8b5cf6" />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Файл</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>JPG, PNG, WEBP</div>
                </div>
              </button>

              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileChange} />
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            </div>
          )}

          {/* Превью изображения */}
          {imageUrl && !isProcessing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', position: 'relative' }}>
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
                    <span>Распознать паспорт</span>
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
                  <span>Другое фото</span>
                </button>
              </div>
            </div>
          )}

          {/* Прогресс распознавания */}
          {isProcessing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Loader2 size={22} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{progressStatus}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Это займет 10–30 секунд...</div>
                </div>
              </div>
              <div style={{ height: 6, borderRadius: 4, background: '#e2e8f0', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 4,
                  background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                  width: `${progress}%`, transition: 'width 0.4s ease'
                }} />
              </div>
              {imageUrl && (
                <img src={imageUrl} alt="Паспорт" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 12, border: '1px solid #e2e8f0', opacity: 0.6 }} />
              )}
            </div>
          )}

          {/* Ошибка */}
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 14,
              padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start'
            }}>
              <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.5 }}>{error}</div>
            </div>
          )}

          {/* Результат распознавания */}
          {extracted && !isProcessing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={18} color="#10b981" />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  Данные распознаны {extracted.mrzFound ? '(MRZ ✓)' : '(частично)'}
                </span>
              </div>

              {/* Поля с распознанными данными */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: 'ФИО', value: extracted.full_name, field: 'full_name' },
                  { label: 'Дата рождения', value: extracted.birth_date, field: 'birth_date' },
                  { label: 'Серия паспорта', value: extracted.series, field: 'series' },
                  { label: 'Номер паспорта', value: extracted.number, field: 'number' },
                  { label: 'Код подразделения', value: extracted.unit_code, field: 'unit_code' },
                  { label: 'Пол', value: extracted.sex, field: 'sex' },
                ].map(item => item.value ? (
                  <div key={item.field} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', background: '#f8fafc',
                    borderRadius: 12, border: '1px solid #e2e8f0', gap: 8
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>{item.label}</div>
                      <input
                        type={item.field === 'birth_date' ? 'date' : 'text'}
                        value={item.value}
                        onChange={e => setExtracted(prev => ({ ...prev, [item.field]: e.target.value,
                          ...(item.field === 'full_name' ? {} : {})
                        }))}
                        style={{
                          fontSize: 13, fontWeight: 600, color: '#0f172a',
                          border: 'none', background: 'none', width: '100%',
                          outline: 'none', padding: 0
                        }}
                      />
                    </div>
                    <CheckCircle size={16} color="#10b981" />
                  </div>
                ) : null)}
              </div>

              {/* MRZ raw текст (для отладки) */}
              {extracted.mrzFound && (
                <button
                  type="button"
                  onClick={() => setShowRaw(!showRaw)}
                  style={{
                    fontSize: 11, color: '#64748b', border: 'none', background: 'none',
                    cursor: 'pointer', textAlign: 'left', padding: 0
                  }}
                >
                  {showRaw ? '▲' : '▼'} Показать MRZ строки
                </button>
              )}
              {showRaw && (
                <div style={{ fontSize: 10, fontFamily: 'monospace', background: '#f1f5f9', borderRadius: 8, padding: 10, wordBreak: 'break-all', color: '#475569' }}>
                  <div>{extracted.mrzRaw1}</div>
                  <div>{extracted.mrzRaw2}</div>
                </div>
              )}

              {/* Кнопка принятия */}
              <button
                type="button"
                onClick={handleAccept}
                style={{
                  padding: '14px', borderRadius: 14, border: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff', fontSize: 15, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                  marginTop: 4
                }}
              >
                <CheckCircle size={18} />
                <span>Заполнить форму этими данными</span>
                <ChevronRight size={18} />
              </button>
              <div style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>
                Вы сможете отредактировать данные после заполнения
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
