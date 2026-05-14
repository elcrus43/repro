import { readFileSync } from 'fs';
import { resolve } from 'path';

const fullPath = resolve('src/pages/History/DetailsPage.jsx');
const buf = readFileSync(fullPath);
const text = buf.toString('utf8');

console.log('File size:', buf.length, 'bytes');
console.log('Has BOM:', text.charCodeAt(0) === 0xFEFF);

// Check for CR characters
const crMatches = text.match(/\r/g);
console.log('CR count:', crMatches ? crMatches.length : 0);

// Show bytes around line 95
const lines = text.split('\n');
console.log('\nLines 93-97:');
for (let i = 92; i < Math.min(lines.length, 97); i++) {
  console.log(`  ${i+1}: [${lines[i]}] (${lines[i].length} chars, ${Buffer.byteLength(lines[i])} bytes)`);
}

// Look for any suspicious characters around line 95
if (lines.length >= 95) {
  const line95 = lines[94]; // 0-indexed
  console.log('\nLine 95 detailed byte analysis:');
  for (let i = 0; i < line95.length; i++) {
    const code = line95.charCodeAt(i);
    const char = line95[i];
    if (code < 32 || code > 127) {
      console.log(`  pos ${i}: U+${code.toString(16).padStart(4,'0')} (${code}) char='${char}'`);
    }
  }
}

// Look for regex-like patterns in JSX
console.log('\nSearching for potential regex issues in JSX...');
let offset = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // Look for {...} patterns that might contain /
  for (let j = 0; j < line.length; j++) {
    if (line[j] === '/' && j > 0 && line[j-1] === '{') {
      console.log(`  Line ${i+1}, pos ${j}: / after {`);
      const start = Math.max(0, j-3);
      const end = Math.min(line.length, j+10);
      console.log(`    Context: "${line.slice(start, end)}"`);
    }
  }
  offset += line.length + 1;
}