import { execSync } from 'child_process';
import { readFileSync } from 'fs';

// Check all modified JS files for CRLF
const modifiedFiles = [
  'src/context/AppContext.jsx',
  'src/context/supabaseSync.js',
  'src/context/useDbDispatch.js',
  'src/pages/History/DetailsPage.jsx',
  'src/pages/History/ListPage.jsx',
  'src/pages/History/FormPage.jsx',
  'src/pages/History/index.js',
  'src/pages/Profile/ProfilePage.jsx',
  'src/pages/Properties/DetailsPage.jsx',
  'src/pages/Properties/FormPage.jsx',
  'src/pages/Properties/ListPage.jsx',
];

for (const f of modifiedFiles) {
  try {
    const content = readFileSync(f, 'utf8');
    const crlfCount = (content.match(/\r\n/g) || []).length;
    const hasCRLF = crlfCount > 0;
    const gitContent = execSync(`git show HEAD:${f}`, { encoding: 'utf8' });
    const gitCRLF = (gitContent.match(/\r\n/g) || []).length;
    console.log(`${hasCRLF ? 'CRLF' : '  OK '} ${f} (local CRLF: ${crlfCount}, git CRLF: ${gitCRLF})`);
  } catch (e) {
    console.log(`ERR  ${f}: ${e.message}`);
  }
}