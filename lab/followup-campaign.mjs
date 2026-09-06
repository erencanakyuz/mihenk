import { readFileSync } from 'node:fs';
import path from 'node:path';
import { main } from './moderation-cases.mjs';

const root = path.resolve(import.meta.dirname, '..');
const baselineBatch = path.join(root, '.rehearsal/moderation-cases-11a851a8-baee-4180-9a9d-2462d10dd24f.json');
const baseline = JSON.parse(readFileSync(baselineBatch, 'utf8'));
const settings = JSON.parse(readFileSync(path.join(baseline.cases[0].directory, 'participant-settings.json'), 'utf8'));
const toolAliases = settings.toolAliases;

const followups = [
  // Followup 1: D01 rep 2 (alternated order)
  { label: 'D01-rep2', cases: ['admission-deep', 'later-admission'] },
  // Followup 2: D01 rep 3 (standard order)
  { label: 'D01-rep3', cases: ['later-admission', 'admission-deep'] },
  // Followup 3: A02 rep 2 (alternated order)
  { label: 'A02-rep2', cases: ['offtopic-complaint', 'offtopic-alone'] },
  // Followup 4: A02 rep 3 (standard order)
  { label: 'A02-rep3', cases: ['offtopic-alone', 'offtopic-complaint'] }
];

async function runFollowups() {
  for (const f of followups) {
    console.log(`\n=== Starting Adaptive Follow-up: ${f.label} (${f.cases.join(' vs ')}) ===`);
    await main(['run', '--descriptions', ...f.cases], {
      toolAliases,
      baselineBatch
    });
  }
}

runFollowups().catch(err => {
  console.error('Followups failed:', err);
  process.exitCode = 1;
});
