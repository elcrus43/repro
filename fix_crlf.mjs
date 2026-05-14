import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const files = [
  'src/pages/History/DetailsPage.jsx',
  'src/pages/History/ListPage.jsx',
  'src/pages/History/FormPage.jsx',
  'src/pages/History/index.js'
];

for (const f of files) {
  const fullPath = resolve(f);
  const content = readFileSync(fullPath, 'utf8');
  const fixed = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (content !== fixed) {
    writeFileSync(fullPath, fixed, 'utf8');
    console.log('Fixed: ' + f);
  } else {
    console.log('No change: ' + f);
  }
}