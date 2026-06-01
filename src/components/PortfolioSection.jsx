import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
    FileText, Calculator, Building2, Home, CheckCircle2, 
    ArrowRight, Percent, Landmark, Download, Upload, 
    Image as ImageIcon, TrendingUp, Info, X,
    Maximize2, FileSpreadsheet, Copy, Check,
    Plus, ExternalLink, Link2, Save
} from 'lucide-react';
import { formatNumber } from '../utils/format';
import { estimateOffline } from '../utils/estimation';
import { API_BASE } from '../config';
import * as XLSX from 'xlsx';
import { nanoid } from '../utils/nanoid';
import { RENOVATION_LABELS, BUILDING_TYPES } from '../data/constants';

function compressImage(file, maxW = 1200, maxH = 1200) {
    return new Promise((resolve) => {
        if (!file.type.startsWith('image/')) {
            resolve(file);
            return;
        }
        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            URL.revokeObjectURL(img.src);
            let w = img.width;
            let h = img.height;
            if (w > maxW || h > maxH) {
                if (w > h) {
                    h = Math.round((h * maxW) / w);
                    w = maxW;
                } else {
                    w = Math.round((w * maxH) / h);
                    h = maxH;
                }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob((blob) => {
                if (!blob) {
                    resolve(file);
                    return;
                }
                const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                });
                resolve(compressedFile);
            }, 'image/jpeg', 0.85); // Compress to JPEG with 85% quality
        };
        img.onerror = () => {
            resolve(file);
        };
    });
}


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
    const [mortgageFiles, setMortgageFiles] = useState(property.portfolio_mortgage_files || []);
    const [newBuildsFiles, setNewBuildsFiles] = useState(property.portfolio_new_builds_files || []);
    const [resaleFiles, setResaleFiles] = useState(property.portfolio_resale_files || []);
    const [manualLinks, setManualLinks] = useState(property.portfolio_analog_links || []);
    const [linkInput, setLinkInput] = useState('');
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [previewFile, setPreviewFile] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [analogs, setAnalogs] = useState([]);
    const [saveStatus, setSaveStatus] = useState(null);
    const [loadingLinkIds, setLoadingLinkIds] = useState([]);
    const pdfAnalogs = [];

    const onUpdateRef = useRef(onUpdate);

    useEffect(() => {
        onUpdateRef.current = onUpdate;
    }, [onUpdate]);

    useEffect(() => {
        const estimation = estimateOffline({
            city: property.city || 'Киров',
            district: property.district || property.microdistrict || '',
            rooms: property.rooms ?? 1,
            total_area: property.area_total || 0,
            deal_type: 'SALE'
        });
        setAnalogs(estimation.analogs);
    }, [property]);

    useEffect(() => {
        const handlePaste = (e) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            const files = [];
            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1 || items[i].type.indexOf('pdf') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) files.push(file);
                }
            }
            if (files.length > 0) {
                handlePortfolioFileUpload({ target: { files } }, 'resale');
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    const handleSave = () => {
        if (onUpdateRef.current) {
            onUpdateRef.current({
                portfolio_mortgage_files: mortgageFiles,
                portfolio_new_builds_files: newBuildsFiles,
                portfolio_resale_files: resaleFiles,
                portfolio_analog_links: manualLinks
            });
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus(null), 3000);
        }
    };

    const addManualLink = () => {
        if (!linkInput.trim()) return;
        let url = linkInput.trim();
        if (!url.startsWith('http')) url = 'https://' + url;
        
        let domain = 'link';
        if (url.includes('cian.ru')) domain = 'cian';
        else if (url.includes('avito.ru')) domain = 'avito';
        else if (url.includes('domclick.ru')) domain = 'domclick';
        else if (url.includes('yandex.ru')) domain = 'yandex';

        const newLink = {
            id: nanoid(),
            url,
            domain,
            added_at: new Date().toISOString()
        };

        const next = [...manualLinks, newLink];
        setManualLinks(next);
        setLinkInput('');
        if (onUpdateRef.current) onUpdateRef.current({ portfolio_analog_links: next });
    };

    const removeManualLink = (id) => {
        const next = manualLinks.filter(l => l.id !== id);
        setManualLinks(next);
        if (onUpdateRef.current) onUpdateRef.current({ portfolio_analog_links: next });
    };

    const calculatePayment = (price, downPercent, rate, years) => {
        const principal = price * (1 - downPercent / 100);
        const monthlyRate = rate / 100 / 12;
        const months = years * 12;
        if (monthlyRate === 0) return principal / months;
        return (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    };

    const uploadToCloudinary = async (file) => {
        setUploading(true);
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
        if (!cloudName || !uploadPreset) return null;
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        try {
            const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
                method: 'POST', body: formData
            });
            const data = await res.json();
            setUploading(false);
            return data.secure_url || null;
        } catch (err) {
            setUploading(false);
            return null;
        }
    };

    const copyToClipboard = (url, id) => {
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    async function handlePortfolioFileUpload(e, section) {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        for (const file of files) {
            const tempId = nanoid();
            const newFile = { id: tempId, name: file.name, url: URL.createObjectURL(file), type: file.type, loading: true };
            let setFiles, field;
            if (section === 'mortgage') { setFiles = setMortgageFiles; field = 'portfolio_mortgage_files'; }
            else if (section === 'new_builds') { setFiles = setNewBuildsFiles; field = 'portfolio_new_builds_files'; }
            else { setFiles = setResaleFiles; field = 'portfolio_resale_files'; }
            setFiles(prev => [...prev, newFile]);
            compressImage(file).then(compressedFile => {
                uploadToCloudinary(compressedFile).then(url => {
                    if (url) {
                        const finalFile = { ...newFile, url, loading: false, persistent: true };
                        setFiles(prev => {
                            const next = prev.map(f => f.id === tempId ? finalFile : f);
                            if (onUpdateRef.current) onUpdateRef.current({ [field]: next });
                            return next;
                        });
                    } else {
                        setFiles(prev => prev.filter(f => f.id !== tempId));
                    }
                });
            });
        }
    }

    const deletePortfolioFile = (id, section) => {
        let setFiles, field;
        if (section === 'mortgage') { setFiles = setMortgageFiles; field = 'portfolio_mortgage_files'; }
        else if (section === 'new_builds') { setFiles = setNewBuildsFiles; field = 'portfolio_new_builds_files'; }
        else { setFiles = setResaleFiles; field = 'portfolio_resale_files'; }
        setFiles(prev => {
            const next = prev.filter(f => f.id !== id);
            if (onUpdateRef.current) onUpdateRef.current({ [field]: next });
            return next;
        });
    };

    const downloadPresentation = () => {
        const wb = XLSX.utils.book_new();
        const propData = [
            ["ПАРАМЕТР", "ЗНАЧЕНИЕ"],
            ["Адрес", property.address || property.city],
            ["Цена", `${formatNumber(property.price)} ₽`],
            ["Комнат", property.rooms],
            ["Площадь", `${property.area_total} м²`],
            ["Этаж", `${property.floor} из ${property.floors_total}`],
            ["Ремонт", RENOVATION_LABELS[property.renovation] || property.renovation || "Не указан"],
            ["Тип дома", BUILDING_TYPES[property.building_type] || property.building_type || "Не указан"],
            ["Год постройки", property.build_year || "Не указан"],
            ["", ""],
            ["ОПИСАНИЕ", property.notes || ""]
        ];
        const wsProp = XLSX.utils.aoa_to_sheet(propData);
        XLSX.utils.book_append_sheet(wb, wsProp, "Объект");
        const analogsData = [
            ["ТИП", "НАЗВАНИЕ / РАЙОН", "КОМНАТ", "ПЛОЩАДЬ", "ЦЕНА", "ПЛАТЕЖ", "ИСТОЧНИК"],
            ...analogs.map(a => ["Вторичка", a.district, property.rooms, a.total_area, a.price, calculatePayment(a.price, 20, MARKET_RATE, 30), a.label]),
            ...pdfAnalogs.map(a => ["PDF Аналог", a.name, a.rooms, a.area, a.price, calculatePayment(a.price, 20, MARKET_RATE, 30), a.source]),
            ...manualLinks.map(l => ["Ссылка", l.url, "", "", "", "", l.domain])
        ];
        const wsAnalogs = XLSX.utils.aoa_to_sheet(analogsData);
        XLSX.utils.book_append_sheet(wb, wsAnalogs, "Аналоги");
        XLSX.writeFile(wb, `Портфолио_${(property.address || property.city).replace(/\s/g, '_')}.xlsx`);
    };

    const allFiles = [...resaleFiles, ...newBuildsFiles, ...mortgageFiles];

    const getDomainIcon = (domain) => {
        switch(domain) {
            case 'cian': return <div style={{ background: '#04c', color: 'white', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 900 }}>CIAN</div>;
            case 'avito': return <div style={{ background: '#9c3', color: 'white', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 900 }}>AVITO</div>;
            case 'domclick': return <div style={{ background: '#3b3', color: 'white', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 900 }}>DOM</div>;
            case 'yandex': return <div style={{ background: '#f00', color: 'white', padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 900 }}>YANDEX</div>;
            default: return <Link2 size={14} />;
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'var(--surface)', display: 'flex', flexDirection: 'column' }}>
            <style>{ANIMATIONS}</style>
            <div className="topbar">
                <button className="topbar-back" onClick={onClose}>←</button>
                <span className="topbar-title">Портфолио объекта</span>
                <div style={{ width: 40 }}></div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 80px' }}>
                <div style={{ position: 'relative', borderRadius: 24, overflow: 'hidden', marginBottom: 24, height: 220, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
                    <img 
                        src={property.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80'} 
                        alt="Property" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }} />
                    <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
                        <div style={{ fontSize: 26, fontWeight: 900, color: 'white', letterSpacing: '-0.02em' }}>{formatNumber(property.price)} ₽</div>
                        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Landmark size={14} /> {property.address || property.city}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                    <div className="card-subtle" style={{ background: 'var(--bg)', padding: 16, borderRadius: 20, border: '1px solid var(--border-light)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: 12 }}>Характеристики</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Комнат:</span>
                                <span style={{ fontSize: 13, fontWeight: 800 }}>{property.rooms === 0 ? 'Студия' : property.rooms}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Площадь:</span>
                                <span style={{ fontSize: 13, fontWeight: 800 }}>{property.area_total} м²</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Этаж:</span>
                                <span style={{ fontSize: 13, fontWeight: 800 }}>{property.floor}/{property.floors_total}</span>
                            </div>
                        </div>
                    </div>
                    <div className="card-subtle" style={{ background: 'var(--bg)', padding: 16, borderRadius: 20, border: '1px solid var(--border-light)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em', marginBottom: 12 }}>Здание</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Год:</span>
                                <span style={{ fontSize: 13, fontWeight: 800 }}>{property.build_year || '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Материал:</span>
                                <span style={{ fontSize: 13, fontWeight: 800 }}>{BUILDING_TYPES[property.building_type] || property.building_type || '—'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Ремонт:</span>
                                <span style={{ fontSize: 13, fontWeight: 800 }}>{RENOVATION_LABELS[property.renovation] || property.renovation || '—'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ marginBottom: 32 }}>
                    <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handlePortfolioFileUpload({ target: { files: e.dataTransfer.files } }, 'resale'); }}
                        style={{ 
                            padding: 32, borderRadius: 24, 
                            border: `2px dashed ${isDragging ? 'var(--primary)' : 'var(--border-light)'}`,
                            background: isDragging ? 'var(--primary-light)' : 'var(--bg)',
                            textAlign: 'center', transition: 'all 0.2s'
                        }}
                    >
                        <label style={{ cursor: 'pointer', display: 'block' }}>
                            <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <Upload size={28} />
                            </div>
                            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6, color: 'var(--text-primary)' }}>Добавить планировки или файлы</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ctrl+V или выберите файлы (IMG/PDF)</div>
                            <input type="file" hidden multiple onChange={(e) => handlePortfolioFileUpload(e, 'resale')} />
                        </label>
                    </div>

                    {allFiles.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 24 }}>
                            {allFiles.map(file => (
                                <div key={file.id} className="fade-in" style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.12)', background: 'var(--surface)', border: '1px solid var(--border-light)' }}>
                                    {file.loading ? (
                                        <div style={{ padding: 60, display: 'flex', justifyContent: 'center' }}><div className="spinner"></div></div>
                                    ) : (
                                        <>
                                            {file.type && file.type.includes('pdf') ? (
                                                <iframe src={`${file.url}#view=FitH`} style={{ width: '100%', height: '450px', border: 'none', display: 'block' }} title={file.name} />
                                            ) : (
                                                <img src={file.url} alt={file.name} style={{ width: '100%', display: 'block' }} />
                                            )}
                                            <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 10 }}>
                                                <button 
                                                    onClick={() => copyToClipboard(file.url, file.id)}
                                                    style={{ width: 36, height: 36, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.95)', color: 'var(--text-muted)', cursor: 'pointer', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                >
                                                    {copiedId === file.id ? <Check size={18} color="var(--success)" /> : <Copy size={18} />}
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        const section = resaleFiles.find(f => f.id === file.id) ? 'resale' : (newBuildsFiles.find(f => f.id === file.id) ? 'new_builds' : 'mortgage');
                                                        deletePortfolioFile(file.id, section);
                                                    }}
                                                    style={{ width: 36, height: 36, borderRadius: 12, border: 'none', background: 'rgba(220,38,38,0.95)', color: 'white', cursor: 'pointer', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                >
                                                    <X size={20} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ marginTop: 12, marginBottom: 40 }}>
                    <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TrendingUp size={20} color="var(--primary)" /> Аналоги рынка
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                        <input 
                            type="text" 
                            className="form-control" 
                            placeholder="Вставьте ссылку на объявление (Циан, Авито...)" 
                            value={linkInput}
                            onChange={(e) => setLinkInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addManualLink()}
                            style={{ flex: 1, borderRadius: 14, height: 48 }}
                        />
                        <button 
                            className="btn btn-primary" 
                            onClick={addManualLink}
                            style={{ width: 48, height: 48, borderRadius: 14, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Plus size={24} />
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {manualLinks.map(link => (
                            <div key={link.id} className="fade-in" style={{ background: 'var(--surface)', borderRadius: 20, overflow: 'hidden', border: '1px solid var(--border-light)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                {link.screenshotUrl && (
                                    <div style={{ width: '100%', height: 160, overflow: 'hidden', borderBottom: '1px solid var(--border-light)' }}>
                                        <img src={link.screenshotUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                )}
                                <div style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {getDomainIcon(link.domain)}
                                    </div>
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{link.url}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{new Date(link.added_at).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <label style={{ 
                                            width: 36, height: 36, borderRadius: 10, 
                                            background: 'var(--primary-light)', color: 'var(--primary)', 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                            cursor: loadingLinkIds.includes(link.id) ? 'wait' : 'pointer',
                                            opacity: loadingLinkIds.includes(link.id) ? 0.6 : 1
                                        }}>
                                            {loadingLinkIds.includes(link.id) ? (
                                                <div className="spinner" style={{ width: 16, height: 16, border: '2px solid var(--border)', borderTopColor: 'var(--primary)' }}></div>
                                            ) : (
                                                <ImageIcon size={18} />
                                            )}
                                            <input 
                                                type="file" 
                                                hidden 
                                                disabled={loadingLinkIds.includes(link.id)}
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    setLoadingLinkIds(prev => [...prev, link.id]);
                                                    try {
                                                        const compressedFile = await compressImage(file);
                                                        const url = await uploadToCloudinary(compressedFile);
                                                        if (url) {
                                                            const next = manualLinks.map(l => l.id === link.id ? { ...l, screenshotUrl: url } : l);
                                                            setManualLinks(next);
                                                            if (onUpdateRef.current) onUpdateRef.current({ portfolio_analog_links: next });
                                                        }
                                                    } catch (err) {
                                                        console.error("Screenshot upload failed", err);
                                                    } finally {
                                                        setLoadingLinkIds(prev => prev.filter(id => id !== link.id));
                                                    }
                                                }} 
                                            />
                                        </label>
                                        <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <ExternalLink size={18} />
                                        </a>
                                        <button 
                                            onClick={() => removeManualLink(link.id)}
                                            style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(220,38,38,0.1)', color: 'var(--danger)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderTop: '1px solid var(--border-light)', display: 'flex', gap: 12, zIndex: 10 }}>
                <button className="btn btn-secondary" style={{ flex: 1, borderRadius: 16, height: 48 }} onClick={onClose}>Закрыть</button>
                <button 
                    className="btn btn-primary" 
                    onClick={handleSave}
                    style={{ flex: 1, borderRadius: 16, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: saveStatus === 'saved' ? 'var(--success)' : 'var(--primary)', transition: 'all 0.3s' }}
                >
                    {saveStatus === 'saved' ? <><Check size={20} /> Сохранено</> : <><Save size={20} /> Сохранить</>}
                </button>
                <button 
                    className="btn btn-secondary" 
                    onClick={downloadPresentation}
                    style={{ width: 48, height: 48, borderRadius: 16, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    title="Скачать Excel"
                >
                    <FileSpreadsheet size={24} />
                </button>
            </div>
        </div>
    );
}
