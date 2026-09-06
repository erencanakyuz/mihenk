import { readFileSync,writeFileSync,renameSync,mkdirSync,appendFileSync,existsSync,openSync,closeSync,unlinkSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { operatorCall,operatorConfig } from '../tools/rehearsal.mjs';
import { Participant } from './participant.mjs';
import { ModelAdapter } from './model.mjs';
import { seededRandom,shuffle,ruleDecision } from './rule-participants.mjs';
import { normalizeAccess } from '../server/access.mjs';
import { ToolSurface,normalizePresentation } from './tool-surface.mjs';

const root=path.resolve(import.meta.dirname,'..');
export const defaults={engine:'model',mode:'tool',participants:5,inferenceConcurrency:2,maxDecisionsPerParticipant:20,maxInputTokensPerDecision:4096,maxOutputTokensPerDecision:256,maxTotalTokens:450000,requestTimeoutSeconds:60,maxWallMinutes:20,seed:1,pageSize:2,scenario:'incomplete-information',roles:null,participantInstructions:null};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function validate(settings){
  normalizePresentation(settings.toolPresentation);
  if(settings.mode==='browser'&&settings.toolPresentation?.names==='random')throw new Error('Random tool names require tool mode.');
  if(settings.participantInstructions!==null&&(!Array.isArray(settings.participantInstructions)||settings.participantInstructions.length!==settings.participants||settings.participantInstructions.some(s=>s!==null&&(typeof s!=='string'||s.length>8000))))throw new Error('Provide one optional instruction string per participant.');
  if(settings.roles!==null){if(settings.accounts||!Array.isArray(settings.roles)||settings.roles.length!==settings.participants)throw new Error('Provide one role policy per new account. Existing accounts keep their server-managed policies.');settings.roles.forEach(normalizeAccess);}
  if(!['model','rule'].includes(settings.engine)||!['tool','browser'].includes(settings.mode)||settings.engine==='rule'&&settings.mode==='browser')throw new Error('Use model/tool, model/browser or rule/tool.');
  for(const key of ['participants','inferenceConcurrency','maxDecisionsPerParticipant','maxInputTokensPerDecision','maxOutputTokensPerDecision','maxTotalTokens','requestTimeoutSeconds','maxWallMinutes','pageSize'])if(!Number.isSafeInteger(settings[key])||settings[key]<1)throw new Error('Invalid positive integer: '+key);
  if(settings.participants>100||settings.inferenceConcurrency>settings.participants||settings.requestTimeoutSeconds>60||settings.pageSize>20)throw new Error('Invalid participant, concurrency, timeout or page limit.');
  if(settings.engine==='model'&&settings.participants>=50){
    const report=settings.scaleEvidence?JSON.parse(readFileSync(settings.scaleEvidence,'utf8')):null;
    if(!report?.viability?.readyFor50)throw new Error('A completed five-participant pilot with the recorded scaling gate is required.');
  }
}
export async function run(config={},resume=false){
  const op=operatorConfig(),settings={...defaults,...config};validate(settings);
  const models=settings.engine==='model'?(settings.endpoints||[{}]).map(endpoint=>new ModelAdapter(endpoint)):[];
  if(settings.engine==='model'&&!models.length)throw new Error('An inference endpoint is required.');
  const preflight=[];
  for(const model of models)preflight.push(await model.preflight());
  let checkpoint=settings.checkpoint?path.resolve(settings.checkpoint):null,state;
  if(resume){
    if(!checkpoint)throw new Error('Resume requires the checkpoint path in the config.');
    state=JSON.parse(readFileSync(checkpoint,'utf8'));
    for(const key of Object.keys(defaults))if(JSON.stringify(state.settings[key])!==JSON.stringify(settings[key]))throw new Error('Resume settings changed: '+key);
    if(JSON.stringify(normalizePresentation(state.settings.toolPresentation))!==JSON.stringify(normalizePresentation(settings.toolPresentation)))throw new Error('Resume tool presentation changed; start a new cohort.');
    if(JSON.stringify(state.settings.endpoints)!==JSON.stringify(settings.endpoints))throw new Error('Resume endpoint configuration changed.');
  }else{
    if(checkpoint&&existsSync(checkpoint))throw new Error('Checkpoint exists; use --resume or a new path.');
    const runId=settings.runId||(await operatorCall('/runs',{scenario:settings.scenario},op)).runId;
    const cohortId=randomUUID();
    checkpoint=checkpoint||path.join(root,'.rehearsal/runs',runId,'cohort-'+cohortId+'.json');
    state={version:1,runId,cohortId,settings,createdAt:new Date().toISOString(),elapsedMs:0,round:0,spentTokens:0,reservations:{},actors:[],stopReason:null};
  }
  mkdirSync(path.dirname(checkpoint),{recursive:true});
  const lock=path.join(root,'.rehearsal','controller-'+state.runId+'.lock');
  let lockFd;
  try{lockFd=openSync(lock,'wx');}catch{
    const pid=Number(readFileSync(lock,'utf8'));
    if(!Number.isSafeInteger(pid)||pid<1)throw new Error('An incomplete controller lock exists: '+lock);
    try{process.kill(pid,0);throw new Error('This world already has an active controller.');}
    catch(error){if(error.code!=='ESRCH')throw error;unlinkSync(lock);lockFd=openSync(lock,'wx');}
  }
  writeFileSync(lockFd,String(process.pid));
  const clients=new Map(),surfaces=new Map(),started=Date.now(),previousElapsed=state.elapsedMs;
  const eventsFile=checkpoint+'.events.jsonl';
  function save(){state.elapsedMs=previousElapsed+Date.now()-started;writeFileSync(checkpoint+'.tmp',JSON.stringify(state),{mode:0o600});renameSync(checkpoint+'.tmp',checkpoint);}
  async function record(kind,data){
    const record={cohortId:state.cohortId,mode:settings.mode,engine:settings.engine,...data};
    appendFileSync(eventsFile,JSON.stringify({kind,...record})+'\n');
    await operatorCall('/records',{runId:state.runId,kind,record},op);
  }
  let interrupted=false;
  const interrupt=()=>{interrupted=true;};process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);
  const ledger={
    async reserve(id,amount){const held=Object.values(state.reservations).reduce((a,b)=>a+b,0);if(state.spentTokens+held+amount>settings.maxTotalTokens)return false;state.reservations[id]=amount;save();return true;},
    async settle(id,amount){state.spentTokens+=amount;delete state.reservations[id];save();}
  };
  try{
    if(resume){
      for(const [requestId,amount] of Object.entries(state.reservations)){state.spentTokens+=amount;await record('interrupted-inference',{requestId,chargedTokens:amount});}
      state.reservations={};
    }
    if(!state.actors.length){
      if(settings.accounts&&settings.accounts.length!==settings.participants)throw new Error('Provide one account file per participant.');
      for(let i=0;i<settings.participants;i++){
        let account;
        if(settings.accounts){account=JSON.parse(readFileSync(settings.accounts[i],'utf8'));if(account.runId!==state.runId)throw new Error('Account belongs to a different world.');}
        else {const session=await operatorCall('/sessions',{runId:state.runId,name:'Üye '+(i+1),policy:settings.roles?.[i]??'participant'},op);account={token:session.token,url:new URL(session.url).origin,actorId:session.actorId,runId:state.runId};}
        state.actors.push({id:account.actorId,account:{...account,pageSize:settings.pageSize},history:[],decisions:0,nextAt:0,client:{},pendingDecision:null});save();
      }
      if(new Set(state.actors.map(a=>a.id)).size!==state.actors.length)throw new Error('Participant accounts must be independent.');
    }
    for(const actor of state.actors){
      const surface=new ToolSurface(settings.toolPresentation,actor.toolSurface?.aliases);actor.toolSurface=surface.snapshot();surfaces.set(actor.id,surface);
      const client=settings.mode==='browser'?await (await import('./browser.mjs')).BrowserParticipant.launch(actor.account,{state:actor.client,directory:path.join(path.dirname(checkpoint),'screens',state.cohortId,actor.id)}):new Participant(actor.account,actor.client);
      clients.set(actor.id,client);
      if(resume&&settings.mode==='browser'&&actor.pendingDecision){await record('interrupted-ui-action',{actorId:actor.id,decision:actor.pendingDecision.decision,applied:'unknown'});actor.pendingDecision=null;}
    }
    await record('cohort-start',{settings,preflight,resume,at:new Date().toISOString()});
    state.stopReason=null;save();
    await operatorCall('/control',{runId:state.runId,action:resume?'resume':'start'},op);
    async function step(actor){
      const client=clients.get(actor.id),saveActor=()=>{actor.client=client.snapshot();save();};
      let pending=actor.pendingDecision;
      if(!pending){
        const previousRevision=client.view?.accessRevision;
        const observation=await client.read();
        if(previousRevision!==undefined&&previousRevision!==client.view?.accessRevision)actor.history=[];
        saveActor();
        await record('observation',{actorId:actor.id,observation,...(client.evidence||{viewId:client.view?.viewId,providedPostIds:client.view?.items.map(p=>p.originalId||p.id)}),at:new Date().toISOString()});
        actor.decisions++;save();
        const decisionSeed=(settings.seed+state.round*100003+state.actors.indexOf(actor)*997)>>>0;
        let selected;
        if(settings.engine==='rule')selected={decision:ruleDecision(observation,seededRandom(decisionSeed)),history:actor.history,dropped:0};
        else selected=await models[state.actors.indexOf(actor)%models.length].decide({observation,history:actor.history,operations:client.available(),surface:surfaces.get(actor.id),instructions:settings.participantInstructions?.[state.actors.indexOf(actor)],limits:{...settings,deadline:started+settings.maxWallMinutes*60000-previousElapsed},seed:decisionSeed,ledger,record:(kind,value)=>record(kind,{actorId:actor.id,decisionNumber:actor.decisions,...value})});
        if(selected.error){
          await record('decision-error',{actorId:actor.id,decisionNumber:actor.decisions,...selected,at:new Date().toISOString()});
          if(['inference','token_budget','input_budget','tokenizer_mismatch','wall_budget'].includes(selected.error.code)){state.stopReason=selected.error.code;if(selected.error.code==='inference')state.suggestedConcurrency=Math.max(1,Math.floor(settings.inferenceConcurrency/2));}
          saveActor();return;
        }
        actor.history=selected.history||actor.history;
        if(selected.noAction){
          await record('participant-comment',{actorId:actor.id,text:selected.text,decisionNumber:actor.decisions,at:new Date().toISOString()});
          const {image,...past}=observation;actor.history.push({observation:past,text:selected.text,noAction:true});actor.nextAt=Date.now()+5000;saveActor();return;
        }
        pending={decision:selected.decision,observation,prepared:client.prepare(selected.decision),repaired:!!selected.repaired};actor.pendingDecision=pending;saveActor();
      }
      const status=(await operatorCall('/runs',undefined,op)).find(r=>r.id===state.runId)?.status;
      if(status!=='running'){state.stopReason=status||'world_unavailable';await record('decision-held',{actorId:actor.id,decision:pending.decision,reason:state.stopReason});saveActor();return;}
      const result=await client.execute(pending.prepared,saveActor);
      let after=null;
      if(settings.mode==='browser'){after=await client.read();await record('browser-after',{actorId:actor.id,observation:after,...client.evidence});}
      await record('decision',{actorId:actor.id,decisionNumber:actor.decisions,decision:pending.decision,commandId:pending.prepared.command?.commandId,result,repaired:pending.repaired,at:new Date().toISOString()});
      if(result.error?.code==='transport'){state.stopReason='participant_transport';saveActor();return;}
      const {image,...past}=pending.observation;
      actor.history.push({observation:past,operation:pending.decision,result});
      // Older images remain in recordings; future inputs retain their visible text and actions.
      actor.pendingDecision=null;actor.nextAt=Date.now()+(result.waitSeconds||0)*1000;saveActor();
    }
    while(!state.stopReason){
      if(interrupted){state.stopReason='interrupted';break;}
      if(previousElapsed+Date.now()-started>=settings.maxWallMinutes*60000){state.stopReason='wall_budget';break;}
      const status=(await operatorCall('/runs',undefined,op)).find(r=>r.id===state.runId)?.status;
      if(status!=='running'){state.stopReason=status||'world_unavailable';break;}
      const remaining=state.actors.filter(a=>a.pendingDecision||a.decisions<settings.maxDecisionsPerParticipant);
      if(!remaining.length){state.stopReason='completed';break;}
      const ready=shuffle(remaining.filter(a=>a.nextAt<=Date.now()),settings.seed+state.round);
      if(!ready.length){await sleep(Math.min(1000,Math.max(1,Math.min(...remaining.map(a=>a.nextAt))-Date.now())));continue;}
      for(let i=0;i<ready.length;i+=settings.inferenceConcurrency){
        if(state.stopReason||interrupted)break;
        if(previousElapsed+Date.now()-started>=settings.maxWallMinutes*60000){state.stopReason='wall_budget';break;}
        const outcomes=await Promise.allSettled(ready.slice(i,i+settings.inferenceConcurrency).map(step));
        for(let j=0;j<outcomes.length;j++)if(outcomes[j].status==='rejected'){state.stopReason='runner_error';await record('runner-error',{actorId:ready[i+j].id,message:String(outcomes[j].reason?.message||outcomes[j].reason)});}
      }
      if(!state.stopReason&&!interrupted){await operatorCall('/control',{runId:state.runId,action:'tick'},op);state.round++;save();}
    }
    if(interrupted&&!state.stopReason)state.stopReason='interrupted';
    const latest=(await operatorCall('/runs',undefined,op)).find(r=>r.id===state.runId);
    if(latest?.status==='running')await operatorCall('/control',{runId:state.runId,action:'pause'},op);
    await record('cohort-end',{stopReason:state.stopReason,spentTokens:state.spentTokens,elapsedMs:previousElapsed+Date.now()-started,decisions:state.actors.map(a=>({actorId:a.id,count:a.decisions,pending:!!a.pendingDecision})),at:new Date().toISOString()});save();
    const archive=await operatorCall('/export?runId='+state.runId,undefined,op);writeFileSync(path.join(path.dirname(checkpoint),'run.json'),JSON.stringify(archive,null,2));
    return {runId:state.runId,cohortId:state.cohortId,checkpoint,stopReason:state.stopReason,spentTokens:state.spentTokens,decisions:state.actors.reduce((sum,a)=>sum+a.decisions,0)};
  }catch(error){state.stopReason='runner_error';state.error=error.message;save();throw error;}
  finally{process.off('SIGINT',interrupt);process.off('SIGTERM',interrupt);for(const client of clients.values())if(client.close)await client.close().catch(()=>{});closeSync(lockFd);unlinkSync(lock);}
}
export async function main([file,resume]=process.argv.slice(2)){
  const config=file?JSON.parse(readFileSync(file,'utf8')):{};
  console.log(JSON.stringify(await run(config,resume==='--resume'),null,2));
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)main().catch(e=>{console.error(e.message);process.exitCode=1;});
