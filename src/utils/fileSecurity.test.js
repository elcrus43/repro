import { describe, it, expect } from 'vitest';
import {
  checkFileNameSecurity,
  sanitizeFileName,
  checkFileBufferSecurity,
  validateUploadFile,
  DANGEROUS_EXTENSIONS,
  ALLOWED_EXTENSIONS
} from './fileSecurity';

describe('fileSecurity - Web Shell & Malicious File Upload Protection', () => {
  describe('checkFileNameSecurity', () => {
    it('blocks dangerous executable and web shell extensions', () => {
      const webshells = [
        'c99.php', 'r57.phtml', 'shell.phar', 'backdoor.php5', 'info.php8',
        'cmd.jsp', 'shell.jspx', 'exploit.asp', 'shell.aspx', 'test.ashx',
        'script.sh', 'bot.py', 'runner.pl', 'handler.cgi', 'trojan.exe',
        'script.bat', 'autorun.vbs', 'bad.ps1', 'payload.dll'
      ];
      for (const name of webshells) {
        const res = checkFileNameSecurity(name);
        expect(res.ok).toBe(false);
      }
    });

    it('blocks double extension bypass attempts (e.g. shell.php.jpg)', () => {
      const doubleExts = [
        'shell.php.jpg',
        'backdoor.phtml.png',
        'cmd.jsp.pdf',
        'exploit.sh.docx',
        'test.aspx.xlsx',
        'photo.py.jpeg'
      ];
      for (const name of doubleExts) {
        const res = checkFileNameSecurity(name);
        expect(res.ok).toBe(false);
        expect(res.reason).toMatch(/опасное расширение|веб-шелла/i);
      }
    });

    it('blocks null byte injection and path traversal in file names', () => {
      expect(checkFileNameSecurity('shell.php\0.jpg').ok).toBe(false);
      expect(checkFileNameSecurity('shell.php%00.png').ok).toBe(false);
      expect(checkFileNameSecurity('../../../etc/passwd').ok).toBe(false);
      expect(checkFileNameSecurity('..\\..\\shell.php').ok).toBe(false);
    });

    it('allows legitimate safe documents and images', () => {
      const safeFiles = [
        'contract_2026.pdf',
        'apartment_photo.jpg',
        'floor_plan.png',
        'presentation.docx',
        'table.xlsx',
        'notes.txt',
        'house.webp'
      ];
      for (const name of safeFiles) {
        const res = checkFileNameSecurity(name);
        expect(res.ok).toBe(true);
      }
    });
  });

  describe('sanitizeFileName', () => {
    it('strips path traversal and special characters from filenames', () => {
      expect(sanitizeFileName('../../test.pdf')).toBe('test.pdf');
      expect(sanitizeFileName('..\\..\\contract.pdf')).toBe('contract.pdf');
      expect(sanitizeFileName('file name (1).pdf')).toBe('file_name__1_.pdf');
      expect(sanitizeFileName('отчет_2026.docx')).toBe('отчет_2026.docx');
    });
  });

  describe('checkFileBufferSecurity', () => {
    it('detects PHP web shell opening tags in file content', () => {
      const phpCode = '<?php system($_GET["cmd"]); ?>';
      const buffer = new TextEncoder().encode(phpCode);
      const res = checkFileBufferSecurity(buffer, 'jpg');
      expect(res.ok).toBe(false);
      expect(res.reason).toMatch(/веб-шелл|исполняемый код/i);
    });

    it('detects short PHP opening tags <? and <?= in file content', () => {
      const shortPhp = '<?= `id` ?>';
      const buffer = new TextEncoder().encode(shortPhp);
      const res = checkFileBufferSecurity(buffer, 'png');
      expect(res.ok).toBe(false);
      expect(res.reason).toMatch(/веб-шелл|исполняемый код/i);
    });

    it('detects shell script shebang in file content', () => {
      const shCode = '#!/bin/bash\nrm -rf /';
      const buffer = new TextEncoder().encode(shCode);
      const res = checkFileBufferSecurity(buffer, 'txt');
      expect(res.ok).toBe(false);
      expect(res.reason).toMatch(/веб-шелл|исполняемый код/i);
    });

    it('validates matching image magic bytes for JPEG and PNG', () => {
      // Valid JPEG header FF D8 FF
      const validJpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10]);
      expect(checkFileBufferSecurity(validJpeg, 'jpg').ok).toBe(true);

      // Fake JPEG with text content
      const fakeJpeg = new TextEncoder().encode('Not a real jpeg file');
      expect(checkFileBufferSecurity(fakeJpeg, 'jpg').ok).toBe(false);
    });
  });

  describe('validateUploadFile', () => {
    it('rejects files larger than the maximum allowed size', async () => {
      const largeFile = new File(['a'.repeat(100)], 'test.pdf', { type: 'application/pdf' });
      const res = await validateUploadFile(largeFile, { maxSize: 50 });
      expect(res.valid).toBe(false);
      expect(res.error).toMatch(/слишком велик/i);
    });

    it('rejects web shell files asynchronously', async () => {
      const webShellFile = new File(['<?php phpinfo(); ?>'], 'backdoor.php', { type: 'application/x-php' });
      const res = await validateUploadFile(webShellFile);
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    });

    it('accepts legitimate files with proper extension', async () => {
      const validPdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x35]); // %PDF-1.5
      const pdfFile = new File([validPdf], 'statement.pdf', { type: 'application/pdf' });
      const res = await validateUploadFile(pdfFile);
      expect(res.valid).toBe(true);
      expect(res.sanitizedName).toBe('statement.pdf');
    });
  });
});
