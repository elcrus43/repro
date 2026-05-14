import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Get git HEAD version
const gitVersion = execSync('git show HEAD:src/pages/History/DetailsPage.jsx', { encoding: 'utf8' });
const workVersion = readFileSync(resolve('src/pages/History/DetailsPage.jsx'), 'utf8');

console.log('Git version chars:', gitVersion.length);
console.log('Work version chars:', workVersion.length);

let diffCount = 0;
for (let i = 0; i < Math.max(gitVersion.length, workVersion.length); i++) {
  const g = i < gitVersion.length ? gitVersion.charCodeAt(i) : -1;
  const w = i < workVersion.length ? workVersion.charCodeAt(i) : -1;
  if (g !== w) {
    if (diffCount < 20) {
      const start = Math.max(0, i - 10);
      const end = Math.min(Math.max(gitVersion.length, workVersion.length), i + 10);
      console.log(`\nDiff #${diffCount+1} at pos ${i}:`);
      console.log(`  Git: ...${[...gitVersion.slice(start, end)].map(c => c.charCodeAt(0).toString(16).padStart(2,'0')).join(' ')}...`);
      console.log(`  Wrk: ...${[...workVersion.slice(start, end)].map(c => c.charCodeAt(0).toString(16).padStart(2,'0')).join(' ')}...`);
    }
    diffCount++;
  }
}
console.log(`\nTotal differing positions: ${diffCount}`);