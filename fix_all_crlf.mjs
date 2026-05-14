import { readFileSync, writeFileSync } from 'fs';

const files = [
  'src/context/AppContext.jsx',
  'src/context/supabaseSync.js',
  'src/context/useDbDispatch.js',
  'src/pages/History/DetailsPage.jsx',
  'src/pages/History/ListPage.jsx',
  'src/pages/History/FormPage.jsx',
  'src/pages/Profile/ProfilePage.jsx',
  'src/pages/Properties/DetailsPage.jsx',
  'src/pages/Properties/FormPage.jsx',
  'src/pages/Properties/ListPage.jsx',
  'vite.config.js',
];

let totalFixed = 0;
for (const f of files) {
  try {
    const buf = readFileSync(f);
    const content = buf.toString('utf8');
    const fixed = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (buf.length !== Buffer.byteLength(fixed, 'utf8')) {
      writeFileSync(f, fixed, 'utf8');
      console.log(`Fixed: ${f} (${buf.length} -> ${Buffer.byteLength(fixed, 'utf8')} bytes)`);
      totalFixed++;
    }
  } catch (e) {
    console.log(`Error: ${f}: ${e.message}`);
  }
}
console.log(`\nFixed ${totalFixed} files.`);