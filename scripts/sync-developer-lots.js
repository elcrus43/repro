/* global process */
/**
 * scripts/sync-developer-lots.js
 *
 * CLI-раннер для синхронизации свободных лотов застройщиков (КССК, КСМ, КИНО, АВИТЕК, АЛТАЙ, СТРОЙСОЮЗ) в Neon DB.
 * Использование:
 *   node scripts/sync-developer-lots.js [--provider=all|ksm|kssk|kino|avitek|altai|stroysoyuz]
 */

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { resolveProviders, runScheduledLotsSync } from '../api/cron-lots.js';

function parseProviderArg(argv) {
  let providerArg = 'all';
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--provider=')) {
      providerArg = arg.slice('--provider='.length);
    } else if (arg === '--provider' && i + 1 < argv.length) {
      providerArg = argv[i + 1];
      i += 1;
    }
  }
  return providerArg;
}

function logProviderSummary(label, summary) {
  if (!summary) return;
  if (summary.skipped) {
    console.log(`[sync-lots] ${label}: skipped (${summary.reason})`);
    return;
  }
  console.log(
    `[sync-lots] ${label}: syncedProjects=${summary.syncedProjects}, failedProjects=${summary.failedProjects}, totalLots=${summary.totalLots}`
  );
  for (const item of summary.results || []) {
    if (item.status === 'error') {
      console.error(`[sync-lots]   ERROR ${item.projectSlug}: ${item.error}`);
    } else {
      console.log(`[sync-lots]   OK ${item.projectSlug}: ${item.syncedCount} lots`);
    }
  }
}

async function main() {
  const providerArg = parseProviderArg(process.argv.slice(2));
  const providers = resolveProviders(providerArg);

  if (!providers) {
    console.error(`[sync-lots] Invalid --provider value: "${providerArg}". Expected all|ksm|kssk|kino|avitek|altai|stroysoyuz.`);
    process.exit(1);
  }

  const dbUrl = process.env.NEON_DATABASE_URL;
  if (!dbUrl) {
    console.error('[sync-lots] NEON_DATABASE_URL is not configured.');
    process.exit(1);
  }

  const sql = neon(dbUrl);
  const summary = await runScheduledLotsSync(sql, { providers });

  console.log(`[sync-lots] Completed at ${summary.syncedAt} in ${summary.durationMs}ms (providers=${providers.join(',')})`);
  logProviderSummary('KSSK', summary.kssk);
  logProviderSummary('KSM', summary.ksm);
  logProviderSummary('KINO', summary.kino);
  logProviderSummary('AVITEK', summary.avitek);
  logProviderSummary('ALTAI', summary.altai);
  logProviderSummary('STROYSOYUZ', summary.stroysoyuz);

  const requestedSummaries = providers.map((p) => summary[p]).filter(Boolean);
  const totalSynced = requestedSummaries.reduce((acc, s) => acc + (s.syncedProjects || 0), 0);
  const totalFailed = requestedSummaries.reduce((acc, s) => acc + (s.failedProjects || 0), 0);

  if (totalFailed > 0 && totalSynced === 0) {
    console.error('[sync-lots] All requested project syncs failed.');
    process.exit(1);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[sync-lots] Fatal error:', String(err?.message || err));
  process.exit(1);
});
