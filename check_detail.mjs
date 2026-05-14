import { readFileSync } from 'fs';
import { resolve } from 'path';

const fullPath = resolve('src/pages/History/DetailsPage.jsx');
const buf = readFileSync(fullPath);
const text = buf.toString('utf8');
const lines = text.split('\n');

console.log(`Total lines: ${lines.length}`);
console.log(`Total bytes: ${buf.length}`);

// Show lines 88-98 with detailed byte analysis
for (let i = 87; i < Math.min(lines.length, 98); i++) {
  const line = lines[i];
  const hex = Buffer.from(line).toString('hex');
  console.log(`\n--- Line ${i+1} (${line.length} chars, ${Buffer.byteLength(line)} bytes) ---`);
  console.log(`  Display: [${line}]`);
  console.log(`  Hex: ${hex}`);
  // Check each byte
  for (let j = 0; j < line.length; j++) {
    const code = line.charCodeAt(j);
    if (code > 127) {
      const char = line[j];
      console.log(`  Byte ${j}: U+${code.toString(16).padStart(4,'0')} '${char}' (multi-byte UTF-8)`);
    }
  }
}

// Look for any / that could start a regex
console.log('\n--- Checking for problematic / characters ---');
let runningOffset = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (let j = 0; j < line.length; j++) {
    if (line[j] === '/') {
      console.log(`  / at line ${i+1}, col ${j+1}, byte offset ${runningOffset + j}`);
      // Show context
      const start = Math.max(0, j - 5);
      const end = Math.min(line.length, j + 5);
      console.log(`    Context: ...${line.slice(start, end)}...`);
    }
  }
  runningOffset += line.length + 1; // +1 for \n
}