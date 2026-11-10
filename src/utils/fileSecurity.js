/**
 * src/utils/fileSecurity.js
 *
 * Комплексная система защиты от загрузки веб-шеллов (Web Shells),
 * вредоносных исполняемых файлов, скриптов и обхода расширений.
 */

// Черный список опасных расширений (веб-шеллы, скрипты, исполняемые файлы)
export const DANGEROUS_EXTENSIONS = new Set([
  // PHP
  'php', 'php2', 'php3', 'php4', 'php5', 'php6', 'php7', 'php8',
  'phtml', 'phar', 'phps', 'pht', 'pgif', 'inc',
  // ASP / .NET
  'asp', 'aspx', 'axd', 'asx', 'ashx', 'asmx', 'cfm', 'cfc', 'cer', 'asa',
  // Java
  'jsp', 'jspx', 'jsw', 'jsv', 'jspa', 'war', 'ear', 'jar',
  // CGI, Perl, Python, Ruby, Shell
  'cgi', 'pl', 'pm', 'py', 'pyc', 'pyo', 'pyd', 'rb', 'sh', 'bash', 'zsh', 'csh', 'ksh',
  // Executables & Binaries
  'exe', 'dll', 'so', 'bin', 'com', 'bat', 'cmd', 'ps1', 'ps2', 'vbs', 'vbe', 'wsf', 'wsh', 'msi', 'scr',
  // Web Server Configs & Environment
  'htaccess', 'htpasswd', 'ini', 'conf', 'config', 'env',
  // Active web content / XSS vectors in downloads
  'html', 'htm', 'xhtml', 'shtml', 'svg', 'xml', 'js', 'mjs', 'ts'
]);

// Белый список разрешённых расширений для CRM (документы и фотографии)
export const ALLOWED_EXTENSIONS = new Set([
  // Изображения
  'jpg', 'jpeg', 'png', 'webp', 'gif',
  // Документы
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'csv'
]);

// Сигнатуры (Magic Numbers) безопасных типов файлов
const FILE_SIGNATURES = [
  { ext: ['jpg', 'jpeg'], mime: 'image/jpeg', magic: [0xFF, 0xD8, 0xFF] },
  { ext: ['png'], mime: 'image/png', magic: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  { ext: ['gif'], mime: 'image/gif', magic: [0x47, 0x49, 0x46, 0x38] }, // GIF8
  { ext: ['pdf'], mime: 'application/pdf', magic: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { ext: ['docx', 'xlsx'], mime: 'application/zip', magic: [0x50, 0x4B, 0x03, 0x04] }, // PK.. (ZIP archive)
];

// Паттерны веб-шеллов и скриптов в заголовках файлов
const SCRIPT_HEADER_PATTERNS = [
  /<\?php/i,
  /<\?=/i,
  /<\?[\s\S]{0,10}/i,
  /<script\b/i,
  /<%[\s\S]{0,10}/i,
  /^#!\/(bin|usr)/i,
  /\b(eval|system|exec|passthru|shell_exec|assert)\s*\(/i
];

/**
 * Очищает имя файла от Path Traversal и спецсимволов.
 */
export function sanitizeFileName(fileName) {
  if (!fileName || typeof fileName !== 'string') return 'file_' + Date.now();
  // Убираем пути (../, ..\, /)
  let clean = fileName.replace(/^.*[\\\/]/, '');
  // Убираем null-bytes и управляющие символы
  clean = clean.replace(/[\0\x00-\x1F\x7F]/g, '');
  // Оставляем только безопасные символы: буквы, цифры, дефис, подчеркивание, точку
  clean = clean.replace(/[^a-zA-Z0-9а-яА-ЯёЁ._-]/g, '_');
  // Предотвращаем имена из одних точек
  if (/^\.+$/.test(clean)) {
    clean = 'file_' + Date.now();
  }
  return clean;
}

/**
 * Проверяет имя файла на признаки обхода расширений (Double extension, Hidden web shell).
 * Например: shell.php.jpg, backdoor.phtml.png, test.php;.jpg
 */
export function checkFileNameSecurity(fileName) {
  if (!fileName || typeof fileName !== 'string') {
    return { ok: false, reason: 'Имя файла отсутствует или некорректно' };
  }

  // Проверка на Null Byte инъекцию
  if (fileName.includes('\0') || fileName.includes('%00')) {
    return { ok: false, reason: 'Обнаружен недопустимый символ (Null Byte)' };
  }

  // Проверка на Path Traversal
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return { ok: false, reason: 'Недопустимый путь в имени файла (Path Traversal)' };
  }

  // Извлекаем все расширения (например ['shell', 'php', 'jpg'])
  const parts = fileName.toLowerCase().split('.').filter(Boolean);
  if (parts.length < 2) {
    return { ok: false, reason: 'Файл должен иметь допустимое расширение' };
  }

  const primaryExt = parts[parts.length - 1];

  // Проверка всех промежуточных расширений на наличие веб-шеллов (Double extension attack)
  for (let i = 1; i < parts.length; i++) {
    const ext = parts[i];
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      return {
        ok: false,
        reason: `Заблокировано: обнаружено опасное расширение ".${ext}" в имени файла (попытка внедрения веб-шелла)`
      };
    }
  }

  // Проверка основного расширения по белому списку
  if (!ALLOWED_EXTENSIONS.has(primaryExt)) {
    return {
      ok: false,
      reason: `Тип файла ".${primaryExt}" запрещён. Разрешены только изображения и офисные документы.`
    };
  }

  return { ok: true, primaryExt };
}

/**
 * Проверяет байты начала файла на сигнатуры и отсутствие веб-шелл тегов.
 * @param {ArrayBuffer|Uint8Array} buffer 
 * @param {string} ext 
 */
export function checkFileBufferSecurity(buffer, ext) {
  if (!buffer) return { ok: true };
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length === 0) return { ok: false, reason: 'Файл пуст' };

  // Проверка на текстовые скриптовые теги в начале файла (даже если расширение .jpg)
  const headerSlice = bytes.subarray(0, Math.min(bytes.length, 512));
  let headerText = '';
  for (let i = 0; i < headerSlice.length; i++) {
    headerText += String.fromCharCode(headerSlice[i]);
  }

  for (const pattern of SCRIPT_HEADER_PATTERNS) {
    if (pattern.test(headerText)) {
      return {
        ok: false,
        reason: 'Заблокировано: содержимое файла содержит исполняемый код или веб-шелл сигнатуру'
      };
    }
  }

  // Проверка магических чисел для изображений и PDF
  const lowerExt = ext?.toLowerCase();
  const signatureRule = FILE_SIGNATURES.find(rule => rule.ext.includes(lowerExt));
  if (signatureRule && bytes.length >= signatureRule.magic.length) {
    const matches = signatureRule.magic.every((byte, idx) => bytes[idx] === byte);
    if (!matches) {
      // Исключение: текстовые и некоторые docx/xlsx могут иметь альтернативные заголовки,
      // но для jpg, png, pdf несоответствие сигнатуре — признак подделки расширения
      if (['jpg', 'jpeg', 'png', 'gif', 'pdf'].includes(lowerExt)) {
        return {
          ok: false,
          reason: `Сигнатура файла не соответствует заявленному формату .${lowerExt}`
        };
      }
    }
  }

  return { ok: true };
}

/**
 * Комплексная валидация объекта File перед загрузкой.
 * @param {File} file 
 * @param {object} [options]
 * @returns {Promise<{valid: boolean, error?: string, sanitizedName?: string}>}
 */
export async function validateUploadFile(file, options = {}) {
  if (!file) {
    return { valid: false, error: 'Файл не выбран' };
  }

  // 1. Проверка размера (по умолчанию до 25 МБ)
  const maxSize = options.maxSize || 25 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: `Файл слишком велик (макс. ${(maxSize / (1024 * 1024)).toFixed(0)} МБ)` };
  }

  // 2. Проверка имени и расширений
  const nameCheck = checkFileNameSecurity(file.name);
  if (!nameCheck.ok) {
    return { valid: false, error: nameCheck.reason };
  }

  // 3. Проверка байтов на клиенте (если доступен FileReader / arrayBuffer)
  try {
    let buffer;
    if (typeof file.arrayBuffer === 'function') {
      buffer = await file.slice(0, 1024).arrayBuffer();
    } else if (typeof FileReader !== 'undefined') {
      buffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file.slice(0, 1024));
      });
    }

    if (buffer) {
      const bufferCheck = checkFileBufferSecurity(buffer, nameCheck.primaryExt);
      if (!bufferCheck.ok) {
        return { valid: false, error: bufferCheck.reason };
      }
    }
  } catch (err) {
    console.warn('[validateUploadFile] Не удалось прочитать заголовок файла:', err);
  }

  return {
    valid: true,
    sanitizedName: sanitizeFileName(file.name),
    extension: nameCheck.primaryExt
  };
}
