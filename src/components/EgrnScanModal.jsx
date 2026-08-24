import React, { useState, useRef } from 'react';
import { X, Loader2, CheckCircle, AlertTriangle, Upload, FileText, RefreshCw, User, Home, ChevronRight } from 'lucide-react';
import { useToastContext } from './Toast';
import * as pdfjsLib from 'pdfjs-dist';

// Safe worker initialization
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url
    ).toString();
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => { resolve(reader.result.split(',')[1]); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function renderPdfPagesToBase64(file, maxPages = 4) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = Math.min(pdf.numPages, maxPages);
  const pages = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const base64 = dataUrl.split(',')[1];
    pages.push({ data: base64, mime: 'image/jpeg' });
  }

  return pages;
}

const PROPERTY_TYPE_LABELS = {
  apartment: 'Квартира', house: 'Дом', land: 'Земельный участок',
  room: 'Комната', commercial: 'Коммерческая недвижимость',
};

export function EgrnScanModal({ isOpen, onClose, onApplyProperty, onApplyOwner }) {
  const { toast } = useToastContext();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(f.type)) { toast.error('Поддерживаются PDF, JPG, PNG, WEBP'); return; }
    setFile(f);
    setFileUrl(f.type === 'application/pdf' ? null : URL.createObjectURL(f));
    setExtracted(null);
    setError(null);
  };

  const processFile = async () => {
    if (!file) return;
    setIsProcessing(true); setError(null);
    setProgressStatus('Подготовка документа...');
    try {
      let pagesBase64 = [];
      let fileBase64 = '';
      const mimeType = file.type || 'application/pdf';

      if (mimeType === 'application/pdf') {
        setProgressStatus('Рендеринг страниц выписки...');
        try {
          pagesBase64 = await renderPdfPagesToBase64(file, 4);
        } catch (pdfErr) {
          console.warn('PDF.js render warning, will fallback to raw base64:', pdfErr);
        }
      }

      fileBase64 = await fileToBase64(file);

      setProgressStatus('Распознавание выписки ЕГРН через ИИ...');
      const isCapacitor = typeof window !== 'undefined' && (
        window.Capacitor || window.location.href.startsWith('file:') || window.location.hostname === ''
      );
      const proxyUrl = isCapacitor ? 'https://realtor-match.vercel.app/api/ai-proxy' : '/api/ai-proxy';
      
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scanEgrn',
          fileBase64,
          mimeType,
          pagesBase64
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Ошибка сервера: ${response.status}`);
      }

      const parsedData = await response.json();
      setExtracted(parsedData);
      setProgressStatus('Готово!');
      const fields = [parsedData.address, parsedData.cadastral_number, parsedData.area_total, ...(parsedData.owners||[]).map(o=>o.full_name)].filter(Boolean).length;
      if (fields === 0) setError('Не удалось извлечь данные. Убедитесь что документ хорошо читаем.');
      else toast.success(`Распознано ${fields} полей из ЕГРН!`);
    } catch (err) {
      console.error('EGRN scan error:', err);
      setError(`Ошибка распознавания: ${err.message || 'Попробуйте другой файл'}`);
    } finally { setIsProcessing(false); }
  };

  const handleApplyProperty = () => {
    if (!extracted) return;
    onApplyProperty({
      address: extracted.address || '',
      cadastral_number: extracted.cadastral_number || '',
      area_total: extracted.area_total || null,
      property_type: extracted.property_type || null,
      floor: extracted.floor || null,
      floors_total: extracted.floors_total || null,
      egrnNotes: extracted.encumbrances ? `Обременения: ${extracted.encumbrances}` : '',
    });
    toast.success('Данные из ЕГРН применены к объекту!');
    onClose();
  };

  const handleApplyOwner = (owner) => {
    if (!owner) return;
    onApplyOwner({
      full_name: owner.full_name || '',
      passport_details: { series: owner.passport_series||'', number: owner.passport_number||'', inn: owner.inn||'', snils: owner.snils||'' },
      inn: owner.inn || '',
      source_note: `Из ЕГРН, доля: ${owner.share||'—'}, основание: ${owner.ownership_basis||'—'}`,
    });
    toast.success(`Данные правообладателя скопированы!`);
  };

  const handleReset = () => {
    setFile(null); setFileUrl(null); setExtracted(null); setError(null); setProgressStatus('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  const overlayStyle = { position:'fixed',inset:0,zIndex:3000,background:'rgba(0,0,0,0.55)',backdropFilter:'blur(6px)',display:'flex',alignItems:'flex-end',justifyContent:'center' };
  const sheetStyle = { background:'var(--surface)',borderRadius:'28px 28px 0 0',width:'100%',maxWidth:600,maxHeight:'90vh',overflowY:'auto',padding:'28px 24px 40px',display:'flex',flexDirection:'column',gap:20 };
  const btnBase = { border:'none',cursor:'pointer',fontFamily:"'Oswald',sans-serif" };

  return (
    <div style={overlayStyle} onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div style={sheetStyle}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontFamily:"'Oswald',sans-serif",fontSize:20,fontWeight:500,color:'var(--text)'}}>📄 Сканер ЕГРН</div>
            <div style={{fontSize:13,color:'var(--text-secondary)',marginTop:2}}>Загрузите выписку из ЕГРН — PDF или скриншот</div>
          </div>
          <button onClick={onClose} style={{...btnBase,width:36,height:36,borderRadius:10,background:'var(--bg-light)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-secondary)'}}>
            <X size={18}/>
          </button>
        </div>

        {/* Upload */}
        {!extracted && (
          <div>
            <input ref={fileInputRef} type="file" accept=".pdf,image/jpeg,image/png,image/webp" style={{display:'none'}} onChange={handleFileChange}/>
            <div onClick={()=>fileInputRef.current?.click()} style={{border:`2px dashed ${file?'var(--primary)':'var(--border)'}`,borderRadius:20,padding:'32px 20px',textAlign:'center',cursor:'pointer',background:file?'rgba(0,82,255,0.03)':'var(--bg-light)'}}>
              {file ? (
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8}}>
                  <FileText size={36} style={{color:'var(--primary)'}}/>
                  <div style={{fontWeight:500,color:'var(--text)',fontSize:15}}>{file.name}</div>
                  <div style={{fontSize:12,color:'var(--text-secondary)'}}>{(file.size/1024/1024).toFixed(1)} МБ · {file.type==='application/pdf'?'PDF':'Изображение'}</div>
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10}}>
                  <Upload size={36} style={{color:'var(--text-secondary)',opacity:0.5}}/>
                  <div style={{fontWeight:500,color:'var(--text)',fontSize:15}}>Загрузить выписку ЕГРН</div>
                  <div style={{fontSize:12,color:'var(--text-secondary)'}}>PDF, JPG, PNG — до 20 МБ</div>
                </div>
              )}
            </div>
            {fileUrl && <img src={fileUrl} alt="Preview" style={{width:'100%',borderRadius:12,marginTop:12,maxHeight:200,objectFit:'contain',background:'var(--bg-light)'}}/>}
            {file && (
              <button onClick={processFile} disabled={isProcessing} style={{...btnBase,width:'100%',marginTop:16,height:52,borderRadius:16,background:isProcessing?'var(--bg-light)':'var(--primary)',color:isProcessing?'var(--text-secondary)':'#fff',fontSize:16,fontWeight:500,display:'flex',alignItems:'center',justifyContent:'center',gap:10,cursor:isProcessing?'not-allowed':'pointer'}}>
                {isProcessing ? (<><Loader2 size={20} style={{animation:'spin 1s linear infinite'}}/>{progressStatus||'Обработка...'}</>) : (<><FileText size={20}/> Распознать ЕГРН</>)}
              </button>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{display:'flex',gap:10,padding:'14px 16px',background:'rgba(239,68,68,0.08)',borderRadius:14,border:'1px solid rgba(239,68,68,0.2)'}}>
            <AlertTriangle size={18} style={{color:'#ef4444',flexShrink:0,marginTop:1}}/>
            <div style={{fontSize:13,color:'#ef4444',lineHeight:1.5}}>{error}</div>
          </div>
        )}

        {/* Results */}
        {extracted && (
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <CheckCircle size={20} style={{color:'#10b981'}}/>
              <span style={{fontFamily:"'Oswald',sans-serif",fontSize:16,fontWeight:500,color:'var(--text)'}}>Данные распознаны</span>
              <button onClick={handleReset} style={{...btnBase,marginLeft:'auto',display:'flex',alignItems:'center',gap:6,padding:'4px 12px',borderRadius:10,background:'var(--bg-light)',fontSize:13,color:'var(--text-secondary)'}}>
                <RefreshCw size={13}/> Другой файл
              </button>
            </div>

            {/* Property block */}
            <div style={{background:'var(--bg-light)',borderRadius:20,padding:'18px 16px',display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                <Home size={16} style={{color:'var(--primary)'}}/>
                <span style={{fontFamily:"'Oswald',sans-serif",fontSize:15,fontWeight:500,color:'var(--text)'}}>Объект недвижимости</span>
              </div>
              {extracted.address && <Row label="Адрес" value={extracted.address}/>}
              {extracted.cadastral_number && <Row label="Кадастровый №" value={extracted.cadastral_number}/>}
              {extracted.area_total && <Row label="Площадь" value={`${extracted.area_total} м²`}/>}
              {extracted.property_type && <Row label="Тип объекта" value={PROPERTY_TYPE_LABELS[extracted.property_type]||extracted.property_type}/>}
              {extracted.floor && <Row label="Этаж" value={`${extracted.floor}${extracted.floors_total?`/${extracted.floors_total}`:''}`}/>}
              {extracted.encumbrances && <Row label="Обременения" value={extracted.encumbrances} accent={extracted.encumbrances!=='Не зарегистрированы'}/>}
              {extracted.issue_date && <Row label="Дата выписки" value={extracted.issue_date}/>}
              <button onClick={handleApplyProperty} style={{...btnBase,marginTop:4,height:44,borderRadius:12,border:'1.5px solid var(--primary)',background:'rgba(0,82,255,0.06)',color:'var(--primary)',fontSize:14,fontWeight:500,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                Применить к объекту <ChevronRight size={16}/>
              </button>
            </div>

            {/* Owners */}
            {(extracted.owners||[]).map((owner,idx)=>(
              <div key={idx} style={{background:'var(--bg-light)',borderRadius:20,padding:'18px 16px',display:'flex',flexDirection:'column',gap:12}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                  <User size={16} style={{color:'#10b981'}}/>
                  <span style={{fontFamily:"'Oswald',sans-serif",fontSize:15,fontWeight:500,color:'var(--text)'}}>Правообладатель {extracted.owners.length>1?`#${idx+1}`:''}</span>
                  {owner.share && <span style={{marginLeft:'auto',fontSize:12,color:'var(--text-secondary)',background:'var(--surface)',padding:'2px 8px',borderRadius:8}}>Доля {owner.share}</span>}
                </div>
                {owner.full_name && <Row label="ФИО" value={owner.full_name} bold/>}
                {owner.ownership_type && <Row label="Тип собственности" value={owner.ownership_type}/>}
                {owner.ownership_basis && <Row label="Основание права" value={owner.ownership_basis}/>}
                {owner.registration_date && <Row label="Дата регистрации" value={owner.registration_date}/>}
                {owner.passport_series && <Row label="Серия паспорта" value={owner.passport_series}/>}
                {owner.passport_number && <Row label="Номер паспорта" value={owner.passport_number}/>}
                {owner.inn && <Row label="ИНН" value={owner.inn}/>}
                {owner.snils && <Row label="СНИЛС" value={owner.snils}/>}
                <button onClick={()=>handleApplyOwner(owner)} style={{...btnBase,marginTop:4,height:44,borderRadius:12,border:'1.5px solid #10b981',background:'rgba(16,185,129,0.06)',color:'#10b981',fontSize:14,fontWeight:500,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  Скопировать данные владельца <ChevronRight size={16}/>
                </button>
              </div>
            ))}
            {extracted.notes && (
              <div style={{fontSize:13,color:'var(--text-secondary)',padding:'10px 14px',background:'var(--bg-light)',borderRadius:12,lineHeight:1.5}}>
                💬 {extracted.notes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold, accent }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,fontSize:13}}>
      <span style={{color:'var(--text-secondary)',flexShrink:0,minWidth:110}}>{label}</span>
      <span style={{color:accent?'#ef4444':'var(--text)',fontWeight:bold?600:400,textAlign:'right',wordBreak:'break-word'}}>{value}</span>
    </div>
  );
}
