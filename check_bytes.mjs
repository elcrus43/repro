import { readFileSync } from 'fs';
import { resolve } from 'path';

const fullPath = resolve('src/pages/History/DetailsPage.jsx');
const buf = readFileSync(fullPath);

// Show all bytes around position corresponding to line 95, col 14
const text = buf.toString('utf8');
const lines = text.split('\n');
let byteOffset = 0;
for (let i = 0; i < 94; i++) {
  byteOffset += lines[i].length + 1; // +1 for \n
}
// Line 95 (0-indexed 94), column 14 (0-indexed 13)
const targetByte = byteOffset + 13;
console.log('Byte offset of line 95, col 14:', targetByte);
console.log('Bytes around target:');
for (let i = Math.max(0, targetByte - 20); i < Math.min(buf.length, targetByte + 30); i++) {
  const b = buf[i];
  const charRepr = b < 32 || b === 127 ? `[${b}]` : String.fromCharCode(b);
  console.log(`  [${i}]: 0x${b.toString(16).padStart(2,'0')} (${b}) '${charRepr}'`);
}

// Also check for any non-ASCII bytes in the whole file
console.log('\nAll non-ASCII or control bytes:');
for (let i = 0; i < buf.length; i++) {
  if (buf[i] > 127 || (buf[i] < 32 && buf[i] !== 10 && buf[i] !== 13 && buf[i] !== 9)) {
    console.log(`  [${i}]: 0x${buf[i].toString(16).padStart(2,'0')} (${buf[i]})`);
  }
}