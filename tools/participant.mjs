import { readFileSync,writeFileSync,renameSync,appendFileSync,openSync,closeSync,unlinkSync,existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Participant,observation } from '../lab/participant.mjs';

export async function main([filename,action='view',input]=process.argv.slice(2)){
  if(!filename)throw new Error('Use participant.mjs ACCOUNT_FILE view|operations|act|retry. act reads {operation,arguments} from stdin or a JSON file.');
  const alias=filename.startsWith('@')?filename.slice(1):null;
  if(alias&&!/^[a-f0-9-]{36}$/.test(alias))throw new Error('Invalid account handle.');
  const file=alias?JSON.parse(readFileSync(path.resolve(import.meta.dirname,'../.rehearsal/interfaces',alias+'.json'),'utf8')).file:path.resolve(filename),lock=file+'.lock';
  let fd;
  try{fd=openSync(lock,'wx');}catch{
    const pid=Number(readFileSync(lock,'utf8'));
    if(!Number.isSafeInteger(pid)||pid<1)throw new Error('An incomplete account lock exists: '+lock);
    try{process.kill(pid,0);throw new Error('This account already has an active operation.');}
    catch(error){if(error.code!=='ESRCH')throw error;unlinkSync(lock);fd=openSync(lock,'wx');}
  }
  writeFileSync(fd,String(process.pid));
  try{
    const account=JSON.parse(readFileSync(file,'utf8'));
    const stateFile=file+'.state.json',state=existsSync(stateFile)?JSON.parse(readFileSync(stateFile,'utf8')):{};
    const client=new Participant(account,state);
    const save=()=>{writeFileSync(stateFile+'.tmp',JSON.stringify(client.snapshot()),{mode:0o600});renameSync(stateFile+'.tmp',stateFile);};
    if(action==='view'){
      const value=await client.read();save();
      appendFileSync(file+'.events.jsonl',JSON.stringify({at:new Date().toISOString(),mode:'external-tool',kind:'observation',viewId:client.view.viewId,observation:value})+'\n');
      console.log(JSON.stringify({observation:value,operations:client.available(),pending:client.pending?client.pending.decision:null},null,2));return;
    }
    if(action==='operations'){console.log(JSON.stringify(client.available(),null,2));return;}
    if(!['act','retry'].includes(action))throw new Error('Use view, operations, act or retry.');
    if(!client.view)await client.read();
    if(action==='act'&&client.pending)throw new Error('An unacknowledged operation is pending. Use retry with the same account.');
    const decision=action==='act'?JSON.parse(readFileSync(input||0,'utf8')):client.pending?.decision;
    if(!decision)throw new Error('No operation is pending.');
    const prepared=action==='retry'?client.pending:client.prepare(decision);
    appendFileSync(file+'.events.jsonl',JSON.stringify({at:new Date().toISOString(),mode:'external-tool',kind:'action-start',observation:observation(client.view),decision,commandId:prepared.command?.commandId})+'\n');
    const result=await client.execute(prepared,save);save();
    appendFileSync(file+'.events.jsonl',JSON.stringify({at:new Date().toISOString(),mode:'external-tool',kind:'action-result',decision,result})+'\n');
    console.log(JSON.stringify(result,null,2));
  }finally{closeSync(fd);unlinkSync(lock);}
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)main().catch(e=>{console.error(e.message);process.exitCode=1;});
