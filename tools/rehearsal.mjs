import { readFileSync,writeFileSync,mkdirSync,readdirSync,existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const root=path.resolve(import.meta.dirname,'..');
export function operatorConfig(){return JSON.parse(readFileSync(path.join(root,'.rehearsal/operator.json'),'utf8'));}
export async function operatorCall(route,payload,config=operatorConfig()) {
  const response=await fetch(config.url+route,{method:payload===undefined?'GET':'POST',headers:{Authorization:'Bearer '+config.token,'Content-Type':'application/json'},signal:AbortSignal.timeout(15000),redirect:'error',...(payload===undefined?{}:{body:JSON.stringify(payload)})});
  const result=await response.json();if(!response.ok)throw new Error(result.error?.message||'Operator request failed.');return result;
}
export async function main(args=process.argv.slice(2)){
  const [action='list',runId,value]=args;
  if(action==='create')console.log(JSON.stringify(await operatorCall('/runs',{scenario:runId||'incomplete-information'})));
  else if(action==='join')console.log(JSON.stringify(await operatorCall('/sessions',{runId,name:value})));
  else if(action==='prepare'){
    const count=Number(value||5);if(!Number.isInteger(count)||count<1||count>100)throw new Error('Participant count must be 1–100.');
    const config=operatorConfig(),directory=path.join(root,'.rehearsal/runs',runId,'accounts');mkdirSync(directory,{recursive:true});
    const files=[];
    for(let i=0;i<count;i++){
      const session=await operatorCall('/sessions',{runId,name:'Üye '+(i+1)},config);
      const file=path.join(directory,session.actorId+'.json');
      writeFileSync(file,JSON.stringify({url:new URL(session.url).origin,token:session.token,actorId:session.actorId,runId,pageSize:2},null,2),{mode:0o600});files.push(file);
    }
    console.log(JSON.stringify({runId,accounts:files},null,2));
  }
  else if(['start','resume','pause','stop','tick'].includes(action))console.log(JSON.stringify(await operatorCall('/control',{runId,action})));
  else if(action==='export'){
    const data=await operatorCall('/export?runId='+encodeURIComponent(runId));
    const directory=path.join(root,'.rehearsal/runs',runId);mkdirSync(directory,{recursive:true});
    const accounts=path.join(directory,'accounts');
    if(existsSync(accounts))for(const file of readdirSync(accounts).filter(f=>f.endsWith('.events.jsonl'))){
      const actorId=file.split('.json.')[0];
      for(const line of readFileSync(path.join(accounts,file),'utf8').split('\n').filter(Boolean))data.records.push({kind:'external-tool-record',actorId,entry:JSON.parse(line)});
    }
    const file=path.join(directory,'run.json');writeFileSync(file,JSON.stringify(data,null,2));console.log(file);
  } else if(action==='finding'){
    const note=JSON.parse(readFileSync(value,'utf8'));
    for(const field of ['journey','expected','observed','impact','severity','evidence'])if(!note[field])throw new Error('Finding needs '+field);
    console.log(JSON.stringify(await operatorCall('/records',{runId,kind:'finding',record:{...note,mode:'directed-review',at:new Date().toISOString()}})));
  } else if(action==='replay'){const data=JSON.parse(readFileSync(runId,'utf8'));console.log(JSON.stringify(await operatorCall('/replay',data)));}
  else if(action==='list')console.log(JSON.stringify(await operatorCall('/runs'),null,2));
  else throw new Error('Use create, join, prepare, list, start, pause, resume, stop, tick, export or replay.');
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)main().catch(e=>{console.error(e.message);process.exitCode=1;});
