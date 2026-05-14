import { execSync } from 'child_process';

// Get the git HEAD version
const gitVersion = execSync('git show HEAD:src/pages/History/DetailsPage.jsx', { encoding: 'utf8' });

// Get the working copy version
import { readFileSync } from 'fs';
const workVersion = readFileSync('src/pages/History/DetailsPage.jsx', 'utf8');

// Compare byte by byte
const gitBytes = Buffer.from(gitVersion);
const workBytes = Buffer.from(workVersion);

console.log('Git version size:', gitBytes.length);
console.log('Work version size:', workBytes.length);

let firstDiff = -1;
let lastDiff = -1;
for (let i = 0; i < Math.max(gitBytes.length, workBytes.length); i++) {
  const g = i < gitBytes.length ? gitBytes[i] : -1;
  const w = i < workBytes.length ? workBytes[i] : -1;
  if (g !== w) {
    if (firstDiff === -1) firstDiff = i;
    lastDiff = i;
  }
}

console.log('First diff at byte:', firstDiff);
console.log('Last diff at byte:', lastDiff);

if (firstDiff >= 0) {
  const start = Math.max(0, firstDiff - 20);
  const end = Math.min(Math.max(gitBytes.length, workBytes.length), lastDiff + 20);
  console.log('\nContext around first diff:');
  console.log('Git bytes:', [...gitBytes.slice(start, end)].map(b => b.toString(16).padStart(2,'0')).join(' '));
  console.log('Wrk bytes:', [...workBytes.slice(start, end)].map(b => b.toString(16).padStart(2,'0')).join(' '));

  // Show as text
  console.log('\nGit text around diff:', gitVersion.slice(Math.max(0, start-5), end+5));
  console.log('Wrk text around diff:', workVersion.slice(Math.max(0, start-5), end+5));
}