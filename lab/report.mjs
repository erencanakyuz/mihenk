import { readFileSync,writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { applyDelta } from '../server/world.mjs';

export function summarize(archive){
  const replay=structuredClone(archive.initial);for(const event of archive.events)applyDelta(replay,event.delta);
  const replayMatches=JSON.stringify(replay)===JSON.stringify(archive.final);
  const records=archive.records||[],commands=archive.events.filter(e=>e.command),rejections=records.filter(r=>r.kind==='rejection');
  const byType=type=>commands.filter(e=>e.command.type===type);
  const starts=[...new Map(records.filter(r=>r.kind==='cohort-start').map(r=>[r.cohortId,r])).values()];
  const cohorts=starts.map(start=>{
    const own=records.filter(r=>r.cohortId===start.cohortId);
    const end=own.filter(r=>r.kind==='cohort-end').at(-1);
    const responses=own.filter(r=>r.kind==='model-response'),first=responses.filter(r=>r.attempt===0);
    const requestIds=new Set(own.filter(r=>r.kind==='model-request').map(r=>r.requestId));
    const recordedResponses=new Set(own.filter(r=>['model-response','interrupted-inference'].includes(r.kind)).map(r=>r.requestId));
    const decisions=own.filter(r=>r.kind==='decision'),errors=own.filter(r=>r.kind==='decision-error');
    const latencies=responses.map(r=>r.durationMs).filter(Number.isFinite).sort((a,b)=>a-b);
    const total=end?.decisions.reduce((n,a)=>n+a.count,0)??null;
    return {id:start.cohortId,engine:start.engine,mode:start.mode,participants:start.settings.participants,seed:start.settings.seed,stopReason:end?.stopReason||'not_finished',
      decisions:total,appliedOrRejected:decisions.length,decisionErrors:errors.length,waits:decisions.filter(r=>r.decision.operation==='wait').length,
      validBeforeRepair:{valid:first.filter(r=>r.decision&&!r.formatError&&!r.error).length,attempts:first.length},
      requestRecordsComplete:[...requestIds].every(id=>recordedResponses.has(id)),decisionRecordsComplete:total!==null&&decisions.length+errors.length===total,
      latencyMs:latencies.length?{p50:latencies[Math.floor((latencies.length-1)*0.5)],p95:latencies[Math.floor((latencies.length-1)*0.95)]}:null,
      contextEntriesRemoved:own.filter(r=>r.kind==='model-request').reduce((n,r)=>n+(r.dropped||0),0),spentTokens:end?.spentTokens??null,
      providedObservations:own.filter(r=>r.kind==='observation'&&r.mode==='tool').length,visibleObservations:own.filter(r=>['observation','browser-after'].includes(r.kind)&&r.mode==='browser').length,
      modelSettings:start.settings.endpoints||null};
  });
  const attempts=byType('request.create').length+rejections.filter(r=>r.command.type==='request.create').length;
  const findings=[...new Map(records.filter(r=>r.kind==='finding').map(r=>[[r.journey,r.expected,r.observed].join('|'),r])).values()];
  const safetyRecords=records.filter(r=>r.kind==='boundary-check'&&r.passed);
  const required=['ownership','idempotency','stale_version','restart','cross_run','private_reports','unseen_target'];
  const safetyComplete=required.every(check=>safetyRecords.some(r=>r.checks?.includes(check)));
  const pilot=cohorts.find(c=>c.engine==='model'&&c.participants>=5&&c.stopReason==='completed'&&c.requestRecordsComplete&&c.decisionRecordsComplete&&c.validBeforeRepair.attempts>0&&c.validBeforeRepair.valid/c.validBeforeRepair.attempts>=0.9);
  const unresolved=findings.filter(f=>['critical','important'].includes(f.severity)&&!['fixed','rejected'].includes(f.resolution));
  return {runId:archive.initial.id,scenario:archive.initial.scenario,scenarioVersion:archive.initial.scenarioVersion,replayMatches,cohorts,
    product:{submissionAttempts:attempts,acknowledgedRequests:byType('request.create').length,unknownLocationRequests:byType('request.create').filter(e=>!e.command.payload.location.known).length,unknownCountRequests:byType('request.create').filter(e=>e.command.payload.people===null).length,
      replies:byType('reply.create').length,offers:byType('offer.create').length,authorUpdates:byType('request.update').length,closureClaims:byType('request.close').length,reopenings:byType('request.reopen').length,reports:byType('report.create').length,
      staleConflicts:rejections.filter(r=>r.result.error.code==='conflict').length,ownershipRejections:rejections.filter(r=>r.result.error.code==='unauthorized').length},
    externalToolRecords:records.filter(r=>r.kind==='external-tool-record').length,findings,
    viability:{readyFor50:!!pilot&&replayMatches&&safetyComplete&&!unresolved.length,pilotMeetsOutputGate:!!pilot,safetyChecksRecorded:safetyComplete,unresolvedImportant:unresolved.length},
    interpretation:'Provided/visible content does not establish comprehension. Offers and closure claims do not establish physical aid. Scripted, externally directed and model decisions are separate evidence.'};
}
export function main([file]=process.argv.slice(2)){
  if(!file)throw new Error('Provide an exported run.json file.');
  const report=summarize(JSON.parse(readFileSync(file,'utf8'))),base=path.resolve(file).replace(/\.json$/,'');
  writeFileSync(base+'.report.json',JSON.stringify(report,null,2));
  const lines=['# MİHENK run report','', 'Scenario: '+report.scenario+'. Recorded event replay: '+(report.replayMatches?'matches':'does not match')+'.','',
    '| Mode | Engine | Accounts | Decisions | Waits | Stop reason |','|---|---|---:|---:|---:|---|',
    ...report.cohorts.map(c=>'| '+[c.mode,c.engine,c.participants,c.decisions??'unknown',c.waits,c.stopReason].join(' | ')+' |'),'',
    'Acknowledged help requests: '+report.product.acknowledgedRequests+' / '+report.product.submissionAttempts+' observed submission attempts. Replies: '+report.product.replies+'. Offers: '+report.product.offers+'. Closure claims: '+report.product.closureClaims+'.','',
    ...report.findings.map(f=>'- '+f.journey+': '+f.observed+' Impact: '+f.impact+' ['+(f.resolution||'unresolved')+']'),'',report.interpretation,''];
  writeFileSync(base+'.report.md',lines.join('\n'));console.log(JSON.stringify({report:base+'.report.json',summary:base+'.report.md',replayMatches:report.replayMatches,cohorts:report.cohorts},null,2));
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)try{main();}catch(error){console.error(error.message);process.exitCode=1;}
