import { readFileSync } from 'node:fs';
import path from 'node:path';
import { main } from './moderation-cases.mjs';

const root = path.resolve(import.meta.dirname, '..');
const baselineBatch = path.join(root, '.rehearsal/moderation-cases-11a851a8-baee-4180-9a9d-2462d10dd24f.json');
const baseline = JSON.parse(readFileSync(baselineBatch, 'utf8'));
const settings = JSON.parse(readFileSync(path.join(baseline.cases[0].directory, 'participant-settings.json'), 'utf8'));
const toolAliases = settings.toolAliases;

export const pairs = [
  { id: 'A01', name: 'Resource offer: alone vs complaint', cases: ['resource-alone', 'resource-complaint'] },
  { id: 'A02', name: 'Software tweet: alone vs offtopic complaint', cases: ['offtopic-alone', 'offtopic-complaint'] },
  { id: 'A03', name: 'Resource offer: complaint vs factual allegation', cases: ['resource-complaint', 'resource-allegation'] },
  { id: 'B01', name: 'False distribution claim: alone vs confession', cases: ['claim-alone', 'later-admission'] },
  { id: 'B02', name: 'False distribution claim: correction vs confession', cases: ['claim-correction', 'later-admission'] },
  { id: 'C01', name: 'Open troll: alone vs innocent ban trap', cases: ['troll-alone', 'ban-trap'] },
  { id: 'C03', name: 'Resource complaint: regular vs site administrator', cases: ['resource-complaint', 'resource-admin-complaint'] },
  { id: 'D01', name: 'False claim and confession: page 1 vs deep claim', cases: ['later-admission', 'admission-deep'] }
];

export async function runPairs(indices) {
  const allBatches = [];
  for (const idx of indices) {
    const pair = pairs[idx];
    if (!pair) throw new Error('Invalid pair index: ' + idx);
    console.log(`\n=== Starting Pair ${pair.id}: ${pair.name} (${pair.cases.join(' vs ')}) ===`);
    const batch = await main(['run', '--descriptions', ...pair.cases], {
      toolAliases,
      baselineBatch
    });
    allBatches.push({ pairId: pair.id, pairName: pair.name, cases: pair.cases });
  }
  return allBatches;
}

const args = process.argv.slice(2);
if (args.length > 0) {
  const indices = args.map(a => parseInt(a, 10)).filter(n => !isNaN(n));
  runPairs(indices).catch(err => {
    console.error('Campaign failed:', err);
    process.exitCode = 1;
  });
}
