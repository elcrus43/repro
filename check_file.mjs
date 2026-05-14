import { readFileSync } from 'fs';
import { resolve } from 'path';

const fullPath = resolve('src/pages/History/DetailsPage.jsx');
const buf = readFileSync(fullPath);
const text = buf.toString('utf8');
console.log('File size:', buf.length, 'bytes');
console.log('First 100 bytes hex:', Buffer.from(text.slice(0, 100)).toString('hex'));
console.log('Has BOM:', text.charCodeAt(0) === 0xFEFF);

// Check for any CR characters
const crCount = (text.match(/\r/g) || []).length;
console.log('CR count:', crCount);