import { spawn } from 'node:child_process';
import { readFileSync,writeFileSync,mkdirSync,appendFileSync } from 'node:fs';
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
function accountArgs(profile,file,maxDecisions,maxWallSeconds,inspect=false){return [...profile.args,
  '-c','mcp_servers.account={command='+JSON.stringify(process.execPath)+',args='+list([path.join(root,'tools/participant-mcp.mjs'),file,String(maxDecisions),String(maxWallSeconds),profile.surfaceFile,...(inspect?['inspect']:[])])+',required=true,tool_timeout_sec=65,default_tools_approval_mode="approve"}',
  '-c','model_reasoning_effort="max"'];}
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
    child.on('exit',code=>{clearTimeout(timer);resolve({code,timedOut,errors});});
    child.stdin.end(JSON.stringify(input));
  });
}
function surfaceNames(tools){
  return (tools||[]).flatMap(t=>t.type==='namespace'?t.tools.map(child=>t.name+'.'+child.name):[t.name||t.type]);
}
function transportArgs(transport,auth){return ['-c','model_provider="account"','-c','model_providers.account={name="account",base_url='+JSON.stringify(transport.url)+',wire_api="responses",requires_openai_auth='+auth+',request_max_retries=0,stream_max_retries=0,supports_websockets=false,http_headers={"X-Account-Transport"='+JSON.stringify(transport.secret)+'}}'];}
export async function inspectCodex(file,{model='gpt-5.6-luna',directory,toolPresentation={},toolAliases}={}){
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
  try{execution=await invoke(profile,[...accountArgs(profile,file,100,1200,true),...transportArgs(probe,false)],{observation:surface.project(observation)},45);}finally{await probe.close();}
  const tools=surfaceNames(captured?.tools),unexpected=tools.filter(n=>!allowed.includes(n));
  const registeredAccountTools=captured?.registeredAccountTools||[],registered=registeredAccountTools.length===allowed.length&&allowed.every(n=>registeredAccountTools.includes(n));
  const report={version:profile.version,model,toolPresentation:surface.options,tools,allowed,unexpected,registeredAccountTools,discardedTools:captured?.discardedTools||[],passed:!!captured&&registered&&tools.length===allowed.length&&!unexpected.length,at:new Date().toISOString(),...(captured?{}:{error:execution.errors})};
  writeFileSync(path.join(directory,'surface.json'),JSON.stringify(report,null,2));
  if(captured)writeFileSync(path.join(directory,'model-input.json'),JSON.stringify({instructions:captured.instructions,input:captured.visibleInput,tools:captured.tools},null,2));
  return {profile,account,observation,report,surface};
}
export async function runCodex(file,{model='gpt-5.6-luna',maxDecisions=20,maxWallSeconds=180,instructions=null,toolPresentation={},toolAliases}={}){
  normalizePresentation(toolPresentation);
  if(!Number.isSafeInteger(maxDecisions)||maxDecisions<1||maxDecisions>1000||!Number.isSafeInteger(maxWallSeconds)||maxWallSeconds<1||maxWallSeconds>1200||instructions!==null&&(typeof instructions!=='string'||instructions.length>8000))throw new Error('Invalid participant settings.');
  file=path.resolve(file);
  const {profile,account,report,surface}=await inspectCodex(file,{model,toolPresentation,toolAliases});
  if(!report.passed)throw new Error('Codex isolation preflight failed. Inspect '+path.join(profile.directory,'surface.json'));
  const record=async(kind,data)=>{
    const entry={actorId:account.actorId,engine:'model',mode:'tool',provider:'codex',at:new Date().toISOString(),...data};
    appendFileSync(path.join(profile.directory,'events.jsonl'),JSON.stringify({kind,...entry})+'\n');
    if(kind==='sealed-request'&&data.requestNumber===1)writeFileSync(path.join(profile.directory,'model-input.json'),JSON.stringify({instructions:data.instructions,input:data.visibleInput,tools:data.tools},null,2));
    await operatorCall('/records',{runId:account.runId,kind,record:entry});
  };
  const participant=new Participant(account),observation=await participant.read();
  const conversation=new SealedConversation({operations:participant.capabilities(),observation,instructions,surface});
  const transport=await serveSealedTransport({conversation,model,maxRequests:maxDecisions,maxWallSeconds,record});
  let execution,recordError;const pendingRecords=[];
  try{
    await record('account-provenance',{model,isolation:'sealed-transport',surface:report});
    execution=await invoke(profile,[...accountArgs(profile,file,maxDecisions,maxWallSeconds),...transportArgs(transport,true)],{observation:surface.project(observation)},maxWallSeconds,event=>{
      const item=event.item;
      if(item?.type==='reasoning')return;
      if(item&&['command_execution','file_change','web_search','image_generation','collab_tool_call'].includes(item.type))throw new Error('Unexpected native tool activity.');
      if(event.type==='item.completed'&&item?.type==='agent_message'){
        // Visible final/commentary text only; reasoning items are not recorded.
        pendingRecords.push(record('participant-comment',{text:item.text||''}).catch(error=>{recordError=error;}));
      }
    });
  }finally{await transport.close();}
  await Promise.all(pendingRecords);
  if(recordError)throw recordError;
  await record('participant-end',{...execution});
  return {runId:account.runId,actorId:account.actorId,directory:profile.directory,...execution};
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
