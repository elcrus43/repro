import { readFileSync } from 'fs';
import { resolve } from 'path';

const fullPath = resolve('src/pages/History/DetailsPage.jsx');
const content = readFileSync(fullPath, 'utf8');
const lines = content.split('\n');

// Show lines around 95 with hex dump
for (let i = Math.max(0, 90); i < Math.min(lines.length, 100); i++) {
  const hex = Buffer.from(lines[i]).toString('hex');
  console.log(`${i+1}: ${JSON.stringify(lines[i])} | hex: ${hex}`);
}