import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    FileText, Calculator, Building2, Home, CheckCircle2, 
    ArrowRight, Percent, Landmark, Download, Upload, 
    Image as ImageIcon, Sparkles, TrendingUp, Info, X,
    Maximize2, Zap, FileSpreadsheet, Copy, Check
} from 'lucide-react';
import { formatNumber } from '../utils/format';
import { estimateOffline } from '../utils/estimation';
import { API_BASE } from '../config';
import * as XLSX from 'xlsx';

const MARKET_RATE = 20; // 20% market rate
const SUBSIDIZED_RATE = 14.75; // 14.75% subsidized rate
const FAMILY_RATE = 6; // 6% family mortgage
const STANDARD_NEW_RATE = 8; // 8% standard new building (state support)

const ANIMATIONS = `
@keyframes spin {
  to { transform: rotate(360deg); }
}
.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.fade-in {
  animation: fadeIn 0.3s ease-out;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
`;

export function PortfolioSection({ property, currentUser, onClose, onUpdate }) {
    const [activeSection, setActiveSection] = useState('passport');
    const [downPaymentPercent, setDownPaymentPercent] = useState(20);
    const [loanPeriod, setLoanPeriod] = useState(30);
    const [analogs, setAnalogs] = useState([]);
    const [newBuildAnalogs, setNewBuildAnalogs] = useState([]);
    const [pdfAnalogs, setPdfAnalogs] = useState([]);
    const [loadingPdf, setLoadingPdf] = useState(false);
    const [subsidizedFile, setSubsidizedFile] = useState(
        property.mortgage_calc_image 
            ? { name: 'Расчет', url: property.mortgage_calc_image, type: 'image/png', persistent: true } 
            : null
    );
    const [newBuildsFiles, setNewBuildsFiles] = useState(property.portfolio_new_builds_files || []);
    const [resaleFiles, setResaleFiles] = useState(property.portfolio_resale_files || []);
    const [uploading, setUploading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [scanResult, setScanResult] = useState(null);
    const [previewFile, setPreviewFile] = useState(null);
    const [copiedId, setCopiedId] = useState(null);

    useEffect(() => {
        // Fetch resale analogs
        const estimation = estimateOffline({
            city: property.city || 'Киров',
            district: property.district || property.microdistrict || '',
            rooms: property.rooms ?? 1,
            total_area: property.area_total || 0,
            deal_type: 'SALE'
        });
        setAnalogs(estimation.analogs);

        // Generate some mock new build analogs for comparison
        const mockNewBuilds = [
            {
                id: 'nb1',
                name: 'ЖК "Центральный"',
                developer: 'Железно',
                price: property.price * 1.15,
                area: property.area_total,
                rooms: property.rooms,
                deadline: '2026 кв. 4',
                image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80'
            },
            {
                id: 'nb2',
                name: 'ЖК "Видный"',
                developer: 'Кировспецмонтаж',
                price: property.price * 1.08,
                area: property.area_total + 2,
                rooms: property.rooms,
                deadline: '2025 кв. 2',
                image: 'https://images.unsplash.com/photo-1567684014761-b618b6983859?auto=format&fit=crop&w=400&q=80'
            }
        ];
        setNewBuildAnalogs(mockNewBuilds);
    }, [property]);

    const calculatePayment = (price, downPercent, rate, years) => {
        const principal = price * (1 - downPercent / 100);
        const monthlyRate = rate / 100 / 12;
        const months = years * 12;
        if (monthlyRate === 0) return principal / months;
        return (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    };

    const handlePdfUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setLoadingPdf(true);
        // Simulate PDF parsing
        setTimeout(() => {
            const newAnalog = {
                id: 'pdf-' + Date.now(),
                name: file.name.replace('.pdf', ''),
                price: property.price * (0.9 + Math.random() * 0.2),
                area: property.area_total * (0.9 + Math.random() * 0.2),
                rooms: property.rooms,
                source: 'PDF Файл',
                isPdf: true
            };
            setPdfAnalogs([...pdfAnalogs, newAnalog]);
            setLoadingPdf(false);
            setActiveSection('resale'); // Go to resale analogs to see it
        }, 1500);
    };

    const uploadToCloudinary = async (file) => {
        setUploading(true);
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

        if (!cloudName || !uploadPreset) {
            console.error('Cloudinary not configured');
            setUploading(false);
            return null;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);

        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            setUploading(false);
            return data.secure_url || null;
        } catch (err) {
            console.error('Upload error', err);
            setUploading(false);
            return null;
        }
    };

    const copyToClipboard = (url, id) => {
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const analyzePdfAnalog = async (file, section) => {
        // In a real app, this would call a specialized backend parser
        // For now, we simulate a very smart AI extraction
        const tempId = file.id;
        if (section === 'resale') {
            setResaleFiles(prev => prev.map(f => f.id === tempId ? { ...f, analyzing: true } : f));
        }

        setTimeout(() => {
            const result = {
                name: file.name.replace('.pdf', ''),
                price: property.price * (0.85 + Math.random() * 0.3),
                area: property.area_total * (0.9 + Math.random() * 0.2),
                rooms: property.rooms,
                source: 'PDF Анализ'
            };
            
            const newAnalog = {
                id: 'ai-' + Date.now(),
                ...result,
                isPdf: true
            };

            setPdfAnalogs(prev => [...prev, newAnalog]);
            if (section === 'resale') {
                setResaleFiles(prev => prev.map(f => f.id === tempId ? { ...f, analyzing: false, analyzed: true } : f));
            }
            setActiveSection('resale');
        }, 2000);
    };

    const scanMortgage = async (imageUrl) => {
        if (!imageUrl) return;
        setScanning(true);
        try {
            const response = await fetch(`${API_BASE}/ai/parse-mortgage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image_url: imageUrl })
            });
            const data = await response.json();
            if (data && !data.error) {
                setScanResult(data);
                // Optionally update loan period if parsed
                if (data.term) setLoanPeriod(data.term);
            }
        } catch (err) {
            console.error('Scan error', err);
        } finally {
            setScanning(false);
        }
    };

    const handleScreenshotUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSubsidizedFile({
            name: 'Загрузка...',
            url: URL.createObjectURL(file),
            type: file.type,
            loading: true
        });

        const url = await uploadToCloudinary(file);
        if (url) {
            setSubsidizedFile({
                name: 'Ипотечный расчет',
                url: url,
                type: file.type,
                loading: false,
                persistent: true
            });
            if (onUpdate) onUpdate({ mortgage_calc_image: url });
            scanMortgage(url);
        }
    };

    const handlePortfolioFileUpload = async (e, section) => {
        const file = e.target.files[0];
        if (!file) return;

        const tempId = Date.now().toString();
        const newFile = {
            id: tempId,
            name: file.name,
            url: URL.createObjectURL(file),
            type: file.type,
            loading: true
        };

        if (section === 'new_builds') {
            setNewBuildsFiles(prev => [...prev, newFile]);
        } else {
            setResaleFiles(prev => [...prev, newFile]);
        }

        const url = await uploadToCloudinary(file);
        if (url) {
            const finalFile = { ...newFile, url, loading: false, persistent: true };
            if (section === 'new_builds') {
                setNewBuildsFiles(prev => {
                    const next = prev.map(f => f.id === tempId ? finalFile : f);
                    if (onUpdate) onUpdate({ portfolio_new_builds_files: next });
                    return next;
                });
            } else {
                setResaleFiles(prev => {
                    const next = prev.map(f => f.id === tempId ? finalFile : f);
                    if (onUpdate) onUpdate({ portfolio_resale_files: next });
                    return next;
                });
            }
        }
    };

    const deletePortfolioFile = (id, section) => {
        if (section === 'new_builds') {
            setNewBuildsFiles(prev => {
                const next = prev.filter(f => f.id !== id);
                if (onUpdate) onUpdate({ portfolio_new_builds_files: next });
                return next;
            });
        } else {
            setResaleFiles(prev => {
                const next = prev.filter(f => f.id !== id);
                if (onUpdate) onUpdate({ portfolio_resale_files: next });
                return next;
            });
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = async (e, section) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (!file) return;

        if (section === 'screenshot') {
            handleScreenshotUpload({ target: { files: [file] } });
        } else {
            handlePortfolioFileUpload({ target: { files: [file] } }, section);
        }
    };

    const downloadPresentation = () => {
        const wb = XLSX.utils.book_new();
        
        // Sheet 1: Property Info
        const propData = [
            ["ПАРАМЕТР", "ЗНАЧЕНИЕ"],
            ["Адрес", property.address || property.city],
            ["Цена", `${formatNumber(property.price)} ₽`],
            ["Комнат", property.rooms],
            ["Площадь", `${property.area_total} м²`],
            ["Этаж", `${property.floor} из ${property.floors_total}`],
            ["Ремонт", property.renovation || "Не указан"],
            ["Тип дома", property.building_type || "Не указан"],
            ["Год постройки", property.build_year || "Не указан"],
            ["", ""],
            ["ОПИСАНИЕ", property.notes || ""]
        ];

        if (scanResult) {
            propData.push(["", ""]);
            propData.push(["ИПОТЕЧНЫЙ РАСЧЕТ (AI SCAN)", ""]);
            propData.push(["Ставка", `${scanResult.rate}%`]);
            propData.push(["Месячный платеж", `${formatNumber(scanResult.monthly_payment)} ₽`]);
            propData.push(["Срок", `${scanResult.term} лет`]);
            propData.push(["Первоначальный взнос", `${scanResult.down_payment}%`]);
        }

        const wsProp = XLSX.utils.aoa_to_sheet(propData);
        XLSX.utils.book_append_sheet(wb, wsProp, "Объект");

        // Sheet 2: Analogs
        const analogsData = [
            ["ТИП", "НАЗВАНИЕ / РАЙОН", "КОМНАТ", "ПЛОЩАДЬ", "ЦЕНА", "ПЛАТЕЖ", "ИСТОЧНИК"],
            ...analogs.map(a => ["Вторичка", a.district, property.rooms, a.total_area, a.price, calculatePayment(a.price, 20, MARKET_RATE, 30), a.label]),
            ...newBuildAnalogs.map(a => ["Новостройка", a.name, a.rooms, a.area, a.price, calculatePayment(a.price, 20, 6, 30), "БД"]),
            ...pdfAnalogs.map(a => ["PDF Аналог", a.name, a.rooms, a.area, a.price, calculatePayment(a.price, 20, MARKET_RATE, 30), a.source])
        ];
        const wsAnalogs = XLSX.utils.aoa_to_sheet(analogsData);
        XLSX.utils.book_append_sheet(wb, wsAnalogs, "Аналоги");

        XLSX.writeFile(wb, `Портфолио_${(property.address || property.city).replace(/\s/g, '_')}.xlsx`);
    };

    useEffect(() => {
        const handlePaste = async (e) => {
            if (activeSection !== 'passport') return;
            
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const blob = items[i].getAsFile();
                    if (blob) {
                        handleScreenshotUpload({ target: { files: [blob] } });
                        break;
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [activeSection, onUpdate]);

    const renderPassport = () => (
        <div className="fade-in">
            <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', marginBottom: 24, height: 240 }}>
                <img 
                    src={property.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80'} 
                    alt="Property" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }} />
                <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: 'white' }}>{formatNumber(property.price)} ₽</div>
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>{property.address || property.city}</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div className="card-subtle" style={{ background: 'var(--bg)', padding: 16, borderRadius: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Характеристики</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Комнат:</span>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{property.rooms === 0 ? 'Студия' : property.rooms}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Площадь:</span>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{property.area_total} м²</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Этаж:</span>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{property.floor}/{property.floors_total}</span>
                        </div>
                    </div>
                </div>
                <div className="card-subtle" style={{ background: 'var(--bg)', padding: 16, borderRadius: 16 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Здание</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Год:</span>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{property.build_year || '—'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Материал:</span>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{property.material || '—'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Ремонт:</span>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{property.renovation || '—'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: 24, border: '2px solid var(--primary)', borderRadius: 24, padding: 20, background: 'white' }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Calculator size={20} /> Расчет ипотеки
                </div>
                
                <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, 'screenshot')}
                    style={{ 
                        marginTop: 16, padding: 24, borderRadius: 20, 
                        border: `2px dashed ${isDragging ? 'var(--primary)' : 'var(--border-light)'}`,
                        background: isDragging ? 'var(--primary-light)' : 'var(--bg)',
                        textAlign: 'center', transition: 'all 0.2s'
                    }}
                >
                    {subsidizedFile ? (
                        <div className="fade-in">
                            <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
                                <img src={subsidizedFile.url} alt="Расчет" style={{ width: '100%', display: 'block' }} />
                                <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
                                    <button 
                                        onClick={() => scanMortgage(subsidizedFile.url)}
                                        disabled={scanning}
                                        style={{ 
                                            padding: '8px 12px', borderRadius: 10, border: 'none', 
                                            background: 'rgba(255,255,255,0.9)', color: 'var(--primary)',
                                            fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                                            cursor: 'pointer', backdropFilter: 'blur(4px)'
                                        }}
                                    >
                                        {scanning ? <div className="spinner" style={{ width: 14, height: 14 }}></div> : <Zap size={14} />}
                                        {scanning ? 'Сканирую...' : 'Скан AI'}
                                    </button>
                                    <button 
                                        onClick={() => {
                                            if (onUpdate) onUpdate({ mortgage_calc_image: null });
                                            setSubsidizedFile(null);
                                            setScanResult(null);
                                        }}
                                        style={{ 
                                            width: 32, height: 32, borderRadius: 10, border: 'none', 
                                            background: 'rgba(220,38,38,0.9)', color: 'white',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            cursor: 'pointer', backdropFilter: 'blur(4px)'
                                        }}
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {scanResult && (
                                <div className="fade-in" style={{ marginTop: 16, background: 'white', padding: 16, borderRadius: 16, border: '1px solid var(--primary-light)', textAlign: 'left' }}>
                                    <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Результаты сканирования</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                        <div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ставка</div>
                                            <div style={{ fontSize: 16, fontWeight: 800 }}>{scanResult.rate}%</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Платеж</div>
                                            <div style={{ fontSize: 16, fontWeight: 800 }}>{formatNumber(scanResult.monthly_payment)} ₽</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Срок</div>
                                            <div style={{ fontSize: 16, fontWeight: 800 }}>{scanResult.term} лет</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Взнос</div>
                                            <div style={{ fontSize: 16, fontWeight: 800 }}>{scanResult.down_payment_percent || scanResult.down_payment}%</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <label style={{ cursor: 'pointer' }}>
                            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                <ImageIcon size={24} />
                            </div>
                            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>Загрузить скриншот расчета</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Перетащите сюда или нажмите для выбора</div>
                            <input type="file" hidden accept="image/*" onChange={handleScreenshotUpload} />
                        </label>
                    )}
                </div>
            </div>
        </div>
    );

    const renderNewBuilds = () => (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div className="section-title" style={{ marginBottom: 0 }}>Новостройки (Аналоги)</div>
            </div>

            <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'new_builds')}
                style={{ 
                    marginBottom: 20, padding: 20, borderRadius: 16, 
                    border: `2px dashed ${isDragging ? 'var(--primary)' : 'var(--border-light)'}`,
                    background: isDragging ? 'var(--primary-light)' : 'var(--bg)',
                    textAlign: 'center', transition: 'all 0.2s'
                }}
            >
                <label style={{ cursor: 'pointer', display: 'block' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                        <Upload size={20} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>Добавить планировки или прайс</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>PDF, JPG, PNG до 10 МБ</div>
                    <input type="file" hidden multiple onChange={(e) => handlePortfolioFileUpload(e, 'new_builds')} />
                </label>
            </div>

            {newBuildsFiles.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    {newBuildsFiles.map(file => (
                        <div key={file.id} style={{ 
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                            background: 'white', padding: '12px 16px', borderRadius: 14, 
                            border: '1px solid var(--border-light)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
                                <div style={{ 
                                    width: 36, height: 36, borderRadius: 10, background: 'var(--primary-light)', 
                                    color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                                }}>
                                    <FileText size={18} />
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{file.type || 'Файл'}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {file.loading ? (
                                    <div className="spinner" style={{ width: 16, height: 16 }}></div>
                                ) : (
                                    <>
                                        <button 
                                            onClick={() => copyToClipboard(file.url, file.id)}
                                            style={{ padding: 6, borderRadius: 8, border: 'none', background: 'var(--bg)', color: 'var(--text-muted)', cursor: 'pointer' }}
                                            title="Копировать ссылку"
                                        >
                                            {copiedId === file.id ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
                                        </button>
                                        <button 
                                            onClick={() => setPreviewFile(file)}
                                            style={{ padding: 6, borderRadius: 8, border: 'none', background: 'var(--bg)', color: 'var(--primary)', cursor: 'pointer' }}
                                            title="Предпросмотр"
                                        >
                                            <Maximize2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => deletePortfolioFile(file.id, 'new_builds')}
                                            style={{ padding: 6, borderRadius: 8, border: 'none', background: 'var(--bg)', color: 'var(--danger)', cursor: 'pointer' }}
                                        >
                                            <X size={16} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {newBuildAnalogs.map(nb => {
                    const familyPayment = calculatePayment(nb.price, 20, FAMILY_RATE, 30);
                    const standardPayment = calculatePayment(nb.price, 20, STANDARD_NEW_RATE, 30);
                    
                    return (
                        <div key={nb.id} style={{ background: 'var(--bg)', borderRadius: 16, padding: 0, overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                            <div style={{ display: 'flex', height: 100 }}>
                                <img src={nb.image} alt={nb.name} style={{ width: 100, height: '100%', objectFit: 'cover' }} />
                                <div style={{ flex: 1, padding: 12 }}>
                                    <div style={{ fontWeight: 800, fontSize: 15 }}>{nb.name}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{nb.developer} · Сдача {nb.deadline}</div>
                                    <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--primary)', marginTop: 4 }}>{formatNumber(nb.price)} ₽</div>
                                </div>
                            </div>
                            <div style={{ padding: 12, background: 'rgba(0,0,0,0.02)', borderTop: '1px solid var(--border-light)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Семейная {FAMILY_RATE}%</div>
                                        <div style={{ fontSize: 14, fontWeight: 800 }}>{formatNumber(Math.round(familyPayment))} ₽/мес</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Господдержка {STANDARD_NEW_RATE}%</div>
                                        <div style={{ fontSize: 14, fontWeight: 800 }}>{formatNumber(Math.round(standardPayment))} ₽/мес</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <div style={{ marginTop: 24, textAlign: 'center' }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Сравните условия: новостройка может быть выгоднее за счет низких ставок!</p>
                <button className="btn btn-secondary" style={{ width: '100%' }}>Смотреть все новостройки</button>
            </div>
        </div>
    );

    const renderResale = () => (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div className="section-title" style={{ marginBottom: 0 }}>Вторичка (Аналоги)</div>
            </div>

            <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 'resale')}
                style={{ 
                    marginBottom: 20, padding: 20, borderRadius: 16, 
                    border: `2px dashed ${isDragging ? 'var(--primary)' : 'var(--border-light)'}`,
                    background: isDragging ? 'var(--primary-light)' : 'var(--bg)',
                    textAlign: 'center', transition: 'all 0.2s'
                }}
            >
                <label style={{ cursor: 'pointer', display: 'block' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                        <Upload size={20} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>Добавить PDF аналоги</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Автоматический разбор данных</div>
                    <input type="file" hidden multiple onChange={(e) => handlePortfolioFileUpload(e, 'resale')} />
                </label>
            </div>

            {resaleFiles.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                    {resaleFiles.map(file => (
                        <div key={file.id} style={{ 
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                            background: 'white', padding: '12px 16px', borderRadius: 14, 
                            border: '1px solid var(--border-light)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
                                <div style={{ 
                                    width: 36, height: 36, borderRadius: 10, background: 'var(--primary-light)', 
                                    color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                                }}>
                                    <FileText size={18} />
                                </div>
                                <div style={{ overflow: 'hidden' }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{file.analyzed ? 'Проанализировано AI' : 'Ожидает анализа'}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {file.loading ? (
                                    <div className="spinner" style={{ width: 16, height: 16 }}></div>
                                ) : (
                                    <>
                                        {!file.analyzed && (
                                            <button 
                                                onClick={() => analyzePdfAnalog(file, 'resale')}
                                                disabled={file.analyzing}
                                                style={{ 
                                                    padding: '6px 10px', borderRadius: 8, border: 'none', 
                                                    background: 'var(--primary-light)', color: 'var(--primary)', 
                                                    fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4,
                                                    cursor: 'pointer' 
                                                }}
                                            >
                                                {file.analyzing ? <div className="spinner" style={{ width: 12, height: 12 }}></div> : <Zap size={12} />}
                                                Анализ
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => setPreviewFile(file)}
                                            style={{ padding: 6, borderRadius: 8, border: 'none', background: 'var(--bg)', color: 'var(--primary)', cursor: 'pointer' }}
                                        >
                                            <Maximize2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => deletePortfolioFile(file.id, 'resale')}
                                            style={{ padding: 6, borderRadius: 8, border: 'none', background: 'var(--bg)', color: 'var(--danger)', cursor: 'pointer' }}
                                        >
                                            <X size={16} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pdfAnalogs.map(a => (
                    <div key={a.id} style={{ background: 'var(--primary-light)', borderRadius: 16, padding: 16, border: '1px solid var(--primary)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <FileText size={14} color="var(--primary)" />
                                    <span style={{ fontWeight: 800, fontSize: 14 }}>{a.name}</span>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{a.rooms}к · {a.area.toFixed(1)} м² · {a.source}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 15, fontWeight: 900 }}>{formatNumber(Math.round(a.price))} ₽</div>
                                <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 700 }}>{formatNumber(Math.round(calculatePayment(a.price, 20, MARKET_RATE, 30)))} ₽/мес</div>
                            </div>
                        </div>
                    </div>
                ))}

                {loadingPdf && (
                    <div style={{ textAlign: 'center', padding: '20px', background: 'var(--bg)', borderRadius: 16 }}>
                        <div className="spinner" style={{ margin: '0 auto 10px' }}></div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Анализируем PDF...</div>
                    </div>
                )}

                {analogs.map(a => (
                    <div key={a.id} style={{ background: 'var(--bg)', borderRadius: 16, padding: 16, border: '1px solid var(--border-light)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: 14 }}>{a.rooms} · {a.total_area} м²</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{a.district} · {a.label}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 15, fontWeight: 900 }}>{formatNumber(a.price)} ₽</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatNumber(Math.round(calculatePayment(a.price, 20, MARKET_RATE, 30)))} ₽/мес</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div style={{ 
            position: 'fixed', inset: 0, zIndex: 10000, 
            background: 'white', display: 'flex', flexDirection: 'column' 
        }}>
            <style>{ANIMATIONS}</style>
            <div className="topbar">
                <button className="topbar-back" onClick={onClose}>←</button>
                <span className="topbar-title">Портфолио объекта</span>
                <div style={{ width: 40 }}></div>
            </div>

            <div style={{ 
                display: 'flex', gap: 4, padding: '12px 16px', 
                background: 'var(--bg)', borderBottom: '1px solid var(--border-light)',
                overflowX: 'auto', whiteSpace: 'nowrap'
            }}>
                {[
                    { id: 'passport', label: 'Паспорт', icon: <Landmark size={14} /> },
                    { id: 'newbuilds', label: 'Новостройки', icon: <Building2 size={14} /> },
                    { id: 'resale', label: 'Аналоги', icon: <Home size={14} /> },
                ].map(tab => (
                    <button 
                        key={tab.id}
                        onClick={() => setActiveSection(tab.id)}
                        style={{
                            padding: '8px 16px', borderRadius: 20, border: 'none',
                            background: activeSection === tab.id ? 'var(--primary)' : 'white',
                            color: activeSection === tab.id ? 'white' : 'var(--text-secondary)',
                            fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
                            cursor: 'pointer', transition: 'all 0.2s',
                            boxShadow: activeSection === tab.id ? '0 4px 12px rgba(0,82,255,0.2)' : 'none'
                        }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                {activeSection === 'passport' && renderPassport()}
                {activeSection === 'newbuilds' && renderNewBuilds()}
                {activeSection === 'resale' && renderResale()}
            </div>

            <div style={{ padding: 16, borderTop: '1px solid var(--border-light)', display: 'flex', gap: 12 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Закрыть</button>
                <button 
                    className="btn btn-primary" 
                    onClick={downloadPresentation}
                    style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                    <FileSpreadsheet size={18} /> Сводная таблица (Excel)
                </button>
            </div>
        </div>
    );
}
