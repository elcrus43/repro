import { neonDb } from './neon';

const LS_KEY_PREFIX = 'rem_saved_banners_';

function getLocalBanners(userId) {
  try {
    const raw = localStorage.getItem(LS_KEY_PREFIX + (userId || 'guest'));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function setLocalBanners(userId, list) {
  try {
    localStorage.setItem(LS_KEY_PREFIX + (userId || 'guest'), JSON.stringify(list.slice(0, 40)));
  } catch (err) {
    console.warn('[savedBanners] Failed to write localStorage:', err);
  }
}

async function uploadBlobToCloudinary(blob, fileName) {
  const cloudName = import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env?.VITE_CLOUDINARY_UPLOAD_PRESET;
  if (!cloudName || !uploadPreset || !blob) return null;

  try {
    const formData = new FormData();
    formData.append('file', blob, fileName || 'banner.webp');
    formData.append('upload_preset', uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.secure_url || null;
  } catch {
    return null;
  }
}

export async function canvasToBannerImage(canvas, fileName = 'banner.webp') {
  if (!canvas) throw new Error('Canvas is not ready');

  const blob = await new Promise((resolve) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob((b) => resolve(b), 'image/webp', 0.86);
    } else {
      resolve(null);
    }
  });

  if (blob) {
    const cloudUrl = await uploadBlobToCloudinary(blob, fileName);
    if (cloudUrl) return cloudUrl;
  }

  try {
    const webp = canvas.toDataURL('image/webp', 0.82);
    if (webp && webp.startsWith('data:image/webp')) return webp;
  } catch {
    // ignore and fallback to jpeg
  }

  return canvas.toDataURL('image/jpeg', 0.84);
}

export async function fetchSavedBanners({ userId, kind, propertyId } = {}) {
  const local = getLocalBanners(userId).filter((b) => {
    if (kind && b.kind !== kind) return false;
    if (propertyId && String(b.property_id) !== String(propertyId)) return false;
    return true;
  });

  if (!userId) {
    return { data: local, error: null };
  }

  try {
    const filters = { realtor_id: userId };
    if (kind) filters.kind = kind;
    if (propertyId) filters.property_id = String(propertyId);

    const { data, error } = await neonDb.select('saved_banners', filters, {
      orderBy: 'created_at DESC',
      limit: 60
    });

    if (error || !Array.isArray(data)) {
      return { data: local, error };
    }

    return { data, error: null };
  } catch (err) {
    return { data: local, error: err };
  }
}

export async function saveBannerToDb({
  userId,
  kind = 'ads',
  propertyId = null,
  title = 'Баннер',
  format = 'story',
  canvas,
  caption = '',
  config = null
}) {
  const imageData = await canvasToBannerImage(canvas, `banner-${kind}-${format}.webp`);
  const record = {
    realtor_id: userId,
    kind,
    property_id: propertyId ? String(propertyId) : null,
    title,
    format,
    image_data: imageData,
    caption,
    config: config ? JSON.stringify(config) : null
  };

  if (userId) {
    try {
      const { data, error } = await neonDb.insert('saved_banners', record);
      if (!error && data) {
        return { data, error: null };
      }
    } catch (err) {
      console.warn('[savedBanners] DB insert failed, falling back to local cache:', err);
    }
  }

  const localRecord = {
    ...record,
    id: `local-${Date.now()}`,
    created_at: new Date().toISOString()
  };
  const existing = getLocalBanners(userId);
  setLocalBanners(userId, [localRecord, ...existing]);
  return { data: localRecord, error: null };
}

export async function deleteSavedBanner({ id, userId }) {
  const local = getLocalBanners(userId).filter((b) => String(b.id) !== String(id));
  setLocalBanners(userId, local);

  if (id && !String(id).startsWith('local-')) {
    try {
      const { error } = await neonDb.delete('saved_banners', id);
      if (error) return { error };
    } catch (err) {
      return { error: err };
    }
  }
  return { error: null };
}

export async function shareSavedBanner({ imageData, title = 'Рекламный баннер', caption = '', fileName = 'banner.png' }) {
  if (!imageData) return { ok: false, message: 'Изображение отсутствует' };

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const res = await fetch(imageData);
      const blob = await res.blob();
      const ext = blob.type.includes('webp') ? 'webp' : blob.type.includes('jpeg') ? 'jpg' : 'png';
      const file = new File([blob], fileName.replace(/\.\w+$/, `.${ext}`), { type: blob.type || 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ title, text: caption, files: [file] });
        return { ok: true, message: 'Баннер отправлен' };
      }

      await navigator.share({
        title,
        text: caption,
        ...(imageData.startsWith('http') ? { url: imageData } : {})
      });
      return { ok: true, message: 'Баннер отправлен' };
    } catch (err) {
      if (err?.name === 'AbortError') {
        return { ok: false, cancelled: true, message: 'Отправка отменена' };
      }
    }
  }

  // Fallback: download image + copy caption
  const link = document.createElement('a');
  link.href = imageData;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (caption && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(caption);
    } catch {
      // ignore clipboard errors
    }
  }

  return { ok: true, message: 'Файл скачан, текст скопирован' };
}
