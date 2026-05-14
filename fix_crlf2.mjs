import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const files = [
  'src/pages/History/DetailsPage.jsx',
  'src/pages/History/ListPage.jsx',
  'src/pages/History/FormPage.jsx',
  'src/pages/History/index.js'
];

let anyFixed = false;
for (const f of files) {
  const fullPath = resolve(f);
  const buf = readFileSync(fullPath);
  const content = buf.toString('utf8');

  // Check for CRLF
  const crlfCount = (content.match(/\r\n/g) || []).length;
  const loneCr = (content.match(/\r(?!\n)/g) || []).length;
  console.log(`${f}: ${buf.length} bytes, ${crlfCount} CRLF, ${loneCr} lone CR`);

  // Replace CRLF with LF
  const fixed = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (buf.length !== Buffer.byteLength(fixed, 'utf8')) {
    writeFileSync(fullPath, fixed, 'utf8');
    console.log(`  -> Fixed! New size: ${Buffer.byteLength(fixed, 'utf8')} bytes`);
    anyFixed = true;
  } else {
    console.log(`  -> No change needed`);
  }
}
console.log(anyFixed ? '\nSome files were fixed.' : '\nNo files needed fixing.');