import { spawn } from 'node:child_process';
import { readFileSync,writeFileSync,mkdirSync,appendFileSync,existsSync,renameSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { prepareCodexProfile } from './codex-profile.mjs';
import { Participant } from './participant.mjs';
import { SealedConversation,serveSealedTransport } from './sealed-transport.mjs';
import { ToolSurface,normalizePresentation } from './tool-surface.mjs';
import { operatorCall } from '../tools/rehearsal.mjs';

const root=path.resolve(import.meta.dirname,'..');
const list=items=>'['+items.map(JSON.stringify).join(',')+']';
function accountArgs(profile,file,maxDecisions,maxWallSeconds,inspect=false,reasoningEffort='max'){return [...profile.args,
  '-c','mcp_servers.account={command='+JSON.stringify(process.execPath)+',args='+list([path.join(root,'tools/participant-mcp.mjs'),file,String(maxDecisions),String(maxWallSeconds),profile.surfaceFile,...(inspect?['inspect']:[])])+',required=true,tool_timeout_sec=65,default_tools_approval_mode="approve"}',
  '-c','model_reasoning_effort='+JSON.stringify(reasoningEffort)];}
async function invoke(profile,args,input,seconds,onEvent=()=>{}){
  return new Promise((resolve,reject)=>{
    const keep=['PATH','Path','PATHEXT','SystemRoot','SYSTEMROOT','WINDIR','TEMP','TMP','USERPROFILE','APPDATA','LOCALAPPDATA','HOMEDRIVE','HOMEPATH','HOME','CODEX_HOME','HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','NO_PROXY'];
    const env=Object.fromEntries(keep.filter(k=>process.env[k]!==undefined).map(k=>[k,process.env[k]]));env.RUST_LOG='error';
    const child=spawn(profile.command,[...profile.prefix,...args,'-'],{windowsHide:true,env,stdio:['pipe','pipe','pipe']});
    let buffer='',errors='',timedOut=false;
    const timer=setTimeout(()=>{timedOut=true;child.kill();},seconds*1000);
    child.stderr.on('data',c=>{errors=(errors+c).slice(-4000);});
    child.stdout.on('data',chunk=>{buffer+=chunk;for(;;){const at=buffer.indexOf('\n');if(at<0)break;const line=buffer.slice(0,at);buffer=buffer.slice(at+1);try{onEvent(JSON.parse(line));}catch(error){child.kill();errors=error.message;}}});
    child.on('error',error=>{clearTimeout(timer);reject(error);});
    child.on('close',code=>{clearTimeout(timer);resolve({code,timedOut,errors});});
    child.stdin.end(JSON.stringify(input));
  });
}
async function accountReleased(file,deadline){
  const lock=file+'.lock',until=Math.min(deadline,Date.now()+5000);
  while(existsSync(lock)){
    let pid;try{pid=Number(readFileSync(lock,'utf8'));}catch(error){if(error.code==='ENOENT')return;throw error;}
    if(!Number.isSafeInteger(pid)||pid<1)throw new Error('Invalid account lock.');
    try{process.kill(pid,0);}catch(error){if(error.code==='ESRCH')return;throw error;}
    if(Date.now()>=until)throw new Error('Previous account connection has not closed.');
    await new Promise(resolve=>setTimeout(resolve,50));
  }
}
function surfaceNames(tools){
  return (tools||[]).flatMap(t=>t.type==='namespace'?t.tools.map(child=>t.name+'.'+child.name):[t.name||t.type]);
}
function transportArgs(transport,auth){return ['-c','model_provider="account"','-c','model_providers.account={name="account",base_url='+JSON.stringify(transport.url)+',wire_api="responses",requires_openai_auth='+auth+',request_max_retries=0,stream_max_retries=0,supports_websockets=false,http_headers={"X-Account-Transport"='+JSON.stringify(transport.secret)+'}}'];}
export async function inspectCodex(file,{model='gpt-5.6-luna',directory,toolPresentation={},toolAliases,reasoningEffort='max'}={}){
  if(!['low','medium','high','xhigh','max'].includes(reasoningEffort))throw new Error('Invalid reasoning effort.');
  const surface=new ToolSurface(toolPresentation,toolAliases);
  file=path.resolve(file);const account=JSON.parse(readFileSync(file,'utf8'));
  directory=directory||path.join(root,'.rehearsal/runs',account.runId,'codex-'+randomUUID());mkdirSync(directory,{recursive:true});
  const participant=new Participant(account),observation=await participant.read();
  const allowed=surface.tools(participant.capabilities()).map(t=>'mcp__account.'+t.function.name);
  const profile=prepareCodexProfile(directory,model);let captured=null;
  profile.surfaceFile=path.join(directory,'tool-map.json');writeFileSync(profile.surfaceFile,JSON.stringify(surface.snapshot(),null,2),{mode:0o600});
  // No model is called here. Capture the installed CLI's actual request so
  // unsupported configuration or newly exposed tools stop before a live run.
  const conversation=new SealedConversation({operations:participant.capabilities(),observation,surface});
  const probe=await serveSealedTransport({conversation,model,inspectOnly:true,record:(kind,data)=>{if(kind==='sealed-request')captured=data;}});
  let execution;
  try{execution=await invoke(profile,[...accountArgs(profile,file,100,1200,true,reasoningEffort),...transportArgs(probe,false)],{observation:surface.project(observation)},45);}finally{await probe.close();}
  const tools=surfaceNames(captured?.tools),unexpected=tools.filter(n=>!allowed.includes(n));
  const registeredAccountTools=captured?.registeredAccountTools||[],registered=registeredAccountTools.length===allowed.length&&allowed.every(n=>registeredAccountTools.includes(n));
  const report={version:profile.version,model,reasoningEffort,actualReasoning:captured?.reasoning,toolPresentation:surface.options,tools,allowed,unexpected,registeredAccountTools,discardedTools:captured?.discardedTools||[],passed:!!captured&&captured.reasoning?.effort===reasoningEffort&&registered&&tools.length===allowed.length&&!unexpected.length,at:new Date().toISOString(),...(captured?{}:{error:execution.errors})};
  writeFileSync(path.join(directory,'surface.json'),JSON.stringify(report,null,2));
  if(captured)writeFileSync(path.join(directory,'model-input.json'),JSON.stringify({instructions:captured.instructions,input:captured.visibleInput,tools:captured.tools},null,2));
  return {profile,account,observation,report,surface};
}
export async function runCodex(file,{model='gpt-5.6-luna',maxDecisions=20,maxWallSeconds=180,instructions=null,toolPresentation={},toolAliases,reasoningEffort='max',watch=false}={}){
  normalizePresentation(toolPresentation);
  if(typeof watch!=='boolean'||!Number.isSafeInteger(maxDecisions)||maxDecisions<1||maxDecisions>1000||!Number.isSafeInteger(maxWallSeconds)||maxWallSeconds<1||maxWallSeconds>1200||instructions!==null&&(typeof instructions!=='string'||instructions.length>8000))throw new Error('Invalid participant settings.');
  file=path.resolve(file);
  const {profile,account,report,surface}=await inspectCodex(file,{model,toolPresentation,toolAliases,reasoningEffort});
  if(!report.passed)throw new Error('Codex isolation preflight failed. Inspect '+path.join(profile.directory,'surface.json'));
  let recoverableError=null;
  const record=async(kind,data)=>{
    const entry={actorId:account.actorId,engine:'model',mode:'tool',provider:'codex',at:new Date().toISOString(),...data};
    appendFileSync(path.join(profile.directory,'events.jsonl'),JSON.stringify({kind,...entry})+'\n');
    if(kind==='sealed-request'&&data.requestNumber===1)writeFileSync(path.join(profile.directory,'model-input.json'),JSON.stringify({instructions:data.instructions,input:data.visibleInput,tools:data.tools},null,2));
    await operatorCall('/records',{runId:account.runId,kind,record:entry});
    if(kind==='sealed-rejection'&&data.operationError)recoverableError=data.operationError;
  };
  const stateFile=file+'.gateway.json';
  const savedState=()=>existsSync(stateFile)?JSON.parse(readFileSync(stateFile,'utf8')):{};
  let participant=new Participant(account,savedState().client||{});
  const observation=await participant.read(),deadline=Date.now()+maxWallSeconds*1000;
  const conversation=new SealedConversation({operations:participant.capabilities(),observation,instructions,surface});
  const transport=await serveSealedTransport({conversation,model,maxRequests:maxDecisions,maxWallSeconds,record});
  let execution,recordError,stopReason='completed',wakeups=0;const pendingRecords=[];
  try{
    await record('account-provenance',{model,reasoningEffort,watch,isolation:'sealed-transport',surface:report});
    const onEvent=event=>{
      const item=event.item;
      if(item?.type==='reasoning')return;
      if(item&&['command_execution','file_change','web_search','image_generation','collab_tool_call'].includes(item.type))throw new Error('Unexpected native tool activity.');
      if(event.type==='item.completed'&&item?.type==='agent_message'){
        // Visible final/commentary text only; reasoning items are not recorded.
        pendingRecords.push(record('participant-comment',{text:item.text||''}).catch(error=>{recordError=error;}));
      }
      if(event.type==='error'||event.type==='turn.failed')pendingRecords.push(record('participant-engine-error',{message:String(event.message||event.error?.message||'Execution failed').slice(0,1500)}).catch(error=>{recordError=error;}));
    };
    for(;;){
      await accountReleased(file,deadline);
      const remaining=Math.max(1,Math.ceil((deadline-Date.now())/1000)),before=transport.requests;
      recoverableError=null;
      execution=await invoke(profile,[...accountArgs(profile,file,maxDecisions,remaining,false,reasoningEffort),...transportArgs(transport,true)],{observation:surface.project(observation)},remaining,onEvent);
      await accountReleased(file,deadline);
      await Promise.all(pendingRecords);if(recordError)throw recordError;
      if(transport.requests>=maxDecisions){stopReason='decision_budget';break;}
      if(!watch)break;
      if(recoverableError&&!conversation.pending.size&&Date.now()<deadline){
        const world=(await operatorCall('/runs')).find(r=>r.id===account.runId);
        if(world?.status!=='running'){stopReason=world?.status||'world_unavailable';break;}
        participant=new Participant(account,savedState().client||participant.snapshot());
        const next=await participant.read();
        conversation.observe(next,participant.capabilities(),{operationError:recoverableError});
        await record('participant-recovery',{requests:transport.requests,operationError:recoverableError});
        continue;
      }
      if(execution.code!==0||execution.timedOut||transport.requests===before||conversation.pending.size){stopReason=execution.timedOut?'wall_budget':'execution_error';break;}
      await record('participant-idle',{requests:transport.requests});
      let changed=false;
      while(Date.now()<deadline){
        const world=(await operatorCall('/runs')).find(r=>r.id===account.runId);
        if(world?.status!=='running'){stopReason=world?.status||'world_unavailable';break;}
        const saved=savedState();
        if((saved.nextAt||0)<=Date.now()){
          participant=new Participant(account,saved.client||participant.snapshot());
          const previousRevision=participant.view?.accessRevision,next=await participant.read();
          const reset=previousRevision!==undefined&&previousRevision!==participant.view?.accessRevision;
          if(reset||JSON.stringify(surface.project(next))!==conversation.latestObservation){
            // The prior executor has exited. Persist the refreshed view before
            // its successor acquires the same account's gateway lock.
            writeFileSync(stateFile+'.tmp',JSON.stringify({...saved,client:participant.snapshot()}),{mode:0o600});renameSync(stateFile+'.tmp',stateFile);
            conversation.observe(next,participant.capabilities(),{reset});wakeups++;changed=true;
            await record('participant-wakeup',{wakeups,requests:transport.requests,historyItems:conversation.history.length,accessReset:reset,observation:next});
            break;
          }
        }
        await new Promise(resolve=>setTimeout(resolve,Math.min(2000,Math.max(1,deadline-Date.now()))));
      }
      if(!changed){if(Date.now()>=deadline)stopReason='wall_budget';break;}
    }
  }finally{await transport.close();}
  await Promise.all(pendingRecords);
  if(recordError)throw recordError;
  await record('participant-end',{...execution,stopReason,requests:transport.requests,wakeups});
  return {runId:account.runId,actorId:account.actorId,directory:profile.directory,...execution,stopReason,requests:transport.requests,wakeups};
}
export async function main([action='inspect',file,model='gpt-5.6-luna']=process.argv.slice(2)){
  if(!file||!['inspect','run'].includes(action))throw new Error('Use inspect|run ACCOUNT_FILE [MODEL].');
  const config=JSON.parse(readFileSync(file,'utf8')),settings=typeof config.accountFile==='string'?{model,...config}:{model};
  if(config.accountFile)file=path.resolve(path.dirname(path.resolve(file)),config.accountFile);
  if(action==='run'){
    const result=await runCodex(file,settings);
    console.log(JSON.stringify(result,null,2));if(result.code!==0)process.exitCode=1;return;
  }
  const {profile,report}=await inspectCodex(file,settings);console.log(JSON.stringify({...report,directory:profile.directory},null,2));if(!report.passed)process.exitCode=1;
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)main().catch(error=>{console.error(error.message);process.exitCode=1;});
