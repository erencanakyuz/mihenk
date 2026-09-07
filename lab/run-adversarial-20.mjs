import path from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { run } from './runner.mjs';
import { ADVERSARIAL_CONFIG, ADVERSARIAL_WORKFLOW_V2_CONFIG } from './adversarial-crisis-20.mjs';
import { evaluateAdversarialCohort } from './adversarial-evaluation.mjs';
import { operatorConfig, operatorCall } from '../tools/rehearsal.mjs';

const root = path.resolve(import.meta.dirname, '..');
const defaultEndpoint = 'http://127.0.0.1:8000';
const defaultModel = 'Qwen/Qwen3.5-9B';

function parseArgs(args) {
  const options = {};
  for (const arg of args) {
    const raw = arg.replace(/^--/, '');
    const separator = raw.indexOf('=');
    if (separator < 0) options[raw] = true;
    else options[raw.slice(0, separator)] = raw.slice(separator + 1);
  }
  return options;
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function decimal(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function booleanOption(value, fallback = false) {
  if (value === undefined) return fallback;
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return fallback;
}

function endpointSettings(config, options) {
  const configured = Array.isArray(config.endpoints) && config.endpoints.length ? config.endpoints : [{}];
  const explicit = {
    ...(options.endpoint !== undefined ? { url: options.endpoint } : {}),
    ...(options.model !== undefined ? { model: options.model } : {}),
    ...(options.temperature !== undefined ? { temperature: decimal(options.temperature, 0.7) } : {}),
    ...(options['top-p'] !== undefined ? { topP: decimal(options['top-p'], 0.8) } : {}),
    ...(options.thinking !== undefined ? { thinking: booleanOption(options.thinking) } : {}),
    ...(options['repair-invalid-calls'] !== undefined ? { repairInvalidCalls: booleanOption(options['repair-invalid-calls']) } : {}),
    ...(options['tool-argument-encoding'] !== undefined ? { toolArgumentEncoding: options['tool-argument-encoding'] } : {}),
    ...(options['tool-choice'] !== undefined ? { toolChoice: options['tool-choice'] } : {}),
    ...(options['endpoint-id'] !== undefined ? { endpointId: options['endpoint-id'] } : {}),
    ...(options.revision !== undefined ? { revision: options.revision } : {}),
    ...(options['model-revision'] !== undefined ? { modelRevision: options['model-revision'] } : {})
  };

  return configured.map((value, index) => {
    const source = value && typeof value === 'object' ? value : {};
    // These belong to the runner limits, not ModelAdapter endpoint options.
    const adapterOptions = Object.fromEntries(Object.entries(source).filter(([key]) => !['maxContextTokens', 'requestTimeoutSeconds', 'timeoutSeconds'].includes(key)));
    const endpoint = {
      ...adapterOptions,
      url: adapterOptions.url || defaultEndpoint,
      model: adapterOptions.model || defaultModel,
      temperature: adapterOptions.temperature ?? 0.7,
      ...(index === 0 ? explicit : {})
    };
    return endpoint;
  });
}

function oneLine(value) {
  return String(value ?? '—').replace(/\s+/g, ' ').trim();
}

function quoted(value) {
  return JSON.stringify(oneLine(value));
}

function renderEvidence(evaluation) {
  const { moderation, falsePositiveSafety, aidCoordination, civilianResilience } = evaluation.evidence;
  const moderationLines = moderation.knownTruthTargets.length
    ? moderation.knownTruthTargets.map(target => {
      const outcome = target.serverOutcome;
      return `- ${target.id}: author ${target.author.id} (${target.author.origin}); ` +
        `text=${quoted(target.post.text)}; ` +
        `removed=${outcome.postRemoved === null ? 'unknown' : outcome.postRemoved}; ` +
        `accepted removals=${outcome.acceptedRemovalCommands}; ` +
        `author banned=${outcome.authorBannedInFinal === null ? 'unknown' : outcome.authorBannedInFinal}.`;
    })
    : ['- No inaccurate post fact was present in the exported truth metadata.'];
  const protectedLines = [
    `- Status: ${falsePositiveSafety.status}.`,
    `- Explicit protected posts: ${falsePositiveSafety.protectedTruth.length}; removed protected posts: ${falsePositiveSafety.removedProtectedPosts.length}.`,
    `- Protected actors with a ban outcome: ${falsePositiveSafety.bannedProtectedActors.length}.`
  ];
  const offerLines = aidCoordination.relevantOffers.length
    ? aidCoordination.relevantOffers.map(offer => `- ${offer.targetId} need=[${offer.request.need.join(', ') || 'unspecified'}], ` +
      `provider=${offer.actor.name || offer.actor.id} [${offer.actor.id}; ${offer.actor.origin}], text=${quoted(offer.text)}, ` +
      `withdrawn=${offer.withdrawn}.`)
    : ['- No offer targeting an exported request was observed.'];
  const civilianLines = [
    `- Status: ${civilianResilience.status}.`,
    `- Exposures: ${civilianResilience.exposures.length}; targeted actions: ${civilianResilience.targetedActions.length}.`,
    `- Exposure without targeted action: ${civilianResilience.exposureWithoutTargetedAction.length}.`,
    '- No resistance conclusion is drawn from missing keywords or missing actions.'
  ];
  return [
    '## Evidence',
    '',
    '### Moderation targets',
    '',
    ...moderationLines,
    '',
    '### False-positive safety',
    '',
    ...protectedLines,
    '',
    '### Aid coordination',
    '',
    ...offerLines,
    '',
    '- Delivery: not established by offer records; a separate delivery event was not observed.',
    '',
    '### Exposure and public-response evidence',
    '',
    ...civilianLines
  ];
}

function reportMarkdown(evaluation, runId) {
  const telemetry = evaluation.telemetry;
  const model = Array.isArray(telemetry.model) ? telemetry.model.join(', ') || 'none recorded' : telemetry.model || 'none recorded';
  const endpointText = telemetry.endpoints.length ? `\`${JSON.stringify(telemetry.endpoints)}\`` : 'none recorded';
  return [
    '# Adversarial cohort evidence report',
    '',
    `- Run ID: \`${runId}\``,
    `- Scenario: \`${evaluation.run.scenario || 'unknown'}\` (version ${evaluation.run.scenarioVersion ?? 'unknown'})`,
    `- Engine: **${telemetry.engine}**${telemetry.engine === 'rule' ? ' (SCRIPTED; no model-performance grade)' : ''}`,
    `- Model: ${model}`,
    `- Endpoint configuration: ${endpointText}`,
    `- Status: **${evaluation.run.status}**`,
    `- Actual stop reason: \`${evaluation.run.stopReason || 'unknown'}\``,
    '',
    '## Run telemetry',
    '',
    `- Requests: ${telemetry.requests.count} (${telemetry.requests.unique} unique); responses: ${telemetry.responses.count} (${telemetry.responses.successful} successful, ${telemetry.responses.errors} errors).`,
    `- Tokens: requested input ${telemetry.tokens.requestInput}; reported prompt ${telemetry.tokens.reportedPrompt}; reported completion ${telemetry.tokens.reportedCompletion}; charged ${telemetry.tokens.charged}; cohort total ${telemetry.tokens.cohortSpent ?? 'unknown'}.`,
    `- Accounts: expected ${telemetry.accounts.expected ?? 'unknown'}; seeded ${telemetry.accounts.seeded}; newly created participants ${telemetry.accounts.participant}; unknown ${telemetry.accounts.unknown}.`,
    `- Decisions: ${telemetry.decisions.totalRecords} records; ${telemetry.decisions.commandIntents} command intents; ${telemetry.decisions.acceptedServerCommands} committed server commands; ${telemetry.decisions.rejectedResponses} rejected responses; ${telemetry.decisions.errors} decision errors.`,
    '',
    ...renderEvidence(evaluation),
    '',
    '## Interpretation limits',
    '',
    ...evaluation.limitations.map(limit => `- ${limit}`),
    ''
  ].join('\n');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if(options.workflow!==undefined&&!['baseline','v2'].includes(options.workflow))throw new Error('Use --workflow=baseline or --workflow=v2.');
  const profile=options.workflow==='v2'?ADVERSARIAL_WORKFLOW_V2_CONFIG:ADVERSARIAL_CONFIG;
  const engine = options.engine || ADVERSARIAL_CONFIG.engine || 'model';
  const decisions = positiveInteger(options.decisions, ADVERSARIAL_CONFIG.maxDecisionsPerParticipant);
  const maxTokens = positiveInteger(options.tokens, ADVERSARIAL_CONFIG.maxTotalTokens);
  const concurrency = positiveInteger(options.concurrency, ADVERSARIAL_CONFIG.inferenceConcurrency);
  const endpoints = engine === 'model' ? endpointSettings(profile, options) : [];
  const temperature = endpoints[0]?.temperature ?? 0.7;

  console.log('================================================================');
  console.log('   MİHENK 20-Ajanlı Çekişmeli Kriz Simülasyonu                  ');
  console.log('================================================================\n');
  console.log(`* Senaryo: ${ADVERSARIAL_CONFIG.scenario}`);
  console.log(`* Katılımcı Sayısı: ${ADVERSARIAL_CONFIG.participants}`);
  console.log(`* Motor: ${engine === 'rule' ? 'RULE — SCRIPTED CONTROL (model grade yok)' : 'MODEL'}`);
  console.log(`* Model: ${engine === 'model' ? endpoints.map(endpoint => endpoint.model).join(', ') : 'uygulanmaz'}`);
  console.log(`* Sıcaklık: ${engine === 'model' ? temperature : 'uygulanmaz'}`);
  console.log(`* Eşzamanlılık: ${concurrency}`);
  console.log(`* Katılımcı Başına Karar Sınırı: ${decisions}`);
  console.log(`* Toplam Token Bütçesi: ${maxTokens.toLocaleString('tr-TR')} token\n`);

  const runConfig = {
    ...profile,
    engine,
    inferenceConcurrency: concurrency,
    maxDecisionsPerParticipant: decisions,
    maxTotalTokens: maxTokens,
    endpoints
  };

  const op = operatorConfig();
  console.log('>>> [1/3] Senaryo ve Dünya Başlatılıyor...');
  const { runId } = await operatorCall('/runs', { scenario: runConfig.scenario, ...(options['source-run']?{sourceRunId:options['source-run']}:{}) }, op);
  runConfig.runId = runId;
  console.log(`>>> Oluşturulan Run ID: ${runId}`);

  console.log('>>> [2/3] 20 Ajanlık Simülasyon Çalıştırılıyor...');
  let cohortState;
  try {
    cohortState = await run(runConfig);
  } catch (error) {
    if (engine === 'model') throw new Error(`MODEL RUN INVALID: ${error.message}`);
    throw error;
  }
  console.log('\n>>> Simülasyon Tamamlandı!');
  console.log(`* Durdurma Sebebi: ${cohortState.stopReason}`);
  console.log(`* Harcanan Token: ${cohortState.spentTokens}`);

  console.log('\n>>> [3/3] Arşiv Kanıtı Değerlendirmesi Yapılıyor...');
  const runExport = await operatorCall('/export?runId=' + encodeURIComponent(runId), undefined, op);
  const evaluation = evaluateAdversarialCohort(runExport, {
    engine,
    mode: runConfig.mode,
    participants: runConfig.participants,
    runId,
    scenario: runConfig.scenario,
    stopReason: cohortState.stopReason
  });
  const telemetry = evaluation.telemetry;
  const actualStopReason = evaluation.run.stopReason || cohortState.stopReason || 'unknown';

  console.log('\n================================================================');
  console.log(`   KANIT DURUMU: ${evaluation.run.status.toUpperCase()}`);
  console.log('================================================================\n');
  console.log('--- Engine / model / transport ---');
  console.log(`  Engine: ${telemetry.engine}${telemetry.engine === 'rule' ? ' (SCRIPTED; model-performance grade yok)' : ''}`);
  console.log(`  Model: ${Array.isArray(telemetry.model) ? telemetry.model.join(', ') || 'none' : telemetry.model || 'none'}`);
  console.log(`  Requests: ${telemetry.requests.count} | Responses: ${telemetry.responses.count} | Successful responses: ${telemetry.responses.successful}`);
  console.log(`  Tokens: input=${telemetry.tokens.requestInput}, reported=${telemetry.tokens.reportedPrompt + telemetry.tokens.reportedCompletion}, charged=${telemetry.tokens.charged}, cohort=${telemetry.tokens.cohortSpent ?? 'unknown'}`);
  console.log(`  Accounts: expected=${telemetry.accounts.expected ?? 'unknown'}, seeded=${telemetry.accounts.seeded}, participants=${telemetry.accounts.participant}, unknown=${telemetry.accounts.unknown}`);
  console.log(`  Decisions: records=${telemetry.decisions.totalRecords}, intents=${telemetry.decisions.commandIntents}, committed=${telemetry.decisions.acceptedServerCommands}, rejected=${telemetry.decisions.rejectedResponses}, errors=${telemetry.decisions.errors}`);
  console.log(`  Actual stopReason: ${actualStopReason}`);

  console.log('\n--- Evidence results ---');
  for (const line of renderEvidence(evaluation).slice(2)) console.log(`  ${line}`);
  if (telemetry.invalidReasons.length) console.error(`\nMODEL RUN INVALID: ${telemetry.invalidReasons.join(', ')}`);

  const reportDirectory = path.join(root, 'docs/experiments');
  mkdirSync(reportDirectory, { recursive: true });
  const reportPath = path.join(reportDirectory, `adversarial-crisis-${runId}.md`);
  writeFileSync(reportPath, reportMarkdown(evaluation, runId), 'utf8');
  console.log(`\n📄 Rapor yolu: ${reportPath}`);
  console.log(`🆔 Run ID: ${runId}`);

  if (engine === 'model' && telemetry.invalidReasons.length) process.exitCode = 1;
}

main().catch(error => {
  console.error('\n❌ Tatbikat hatası:', error.message || error);
  process.exitCode = 1;
});
