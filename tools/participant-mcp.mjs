import { readFileSync,writeFileSync,renameSync,appendFileSync,existsSync,openSync,closeSync,unlinkSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema,CallToolRequestSchema,ListResourcesRequestSchema,ListResourceTemplatesRequestSchema,ListPromptsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ParticipantGateway } from '../lab/gateway.mjs';
import { ToolSurface } from '../lab/tool-surface.mjs';

export function createParticipantMcp(gateway,surface=new ToolSurface()){
  const server=new Server({name:'account',version:'1.0.0'},{capabilities:{tools:{},resources:{},prompts:{}}});
  server.setRequestHandler(ListToolsRequestSchema,async()=>{
    await gateway.view();
    return {tools:surface.tools(gateway.client.capabilities()).map(t=>({name:t.function.name,...(t.function.description?{description:t.function.description}:{}),inputSchema:t.function.parameters,...(surface.options.descriptions?{annotations:{readOnlyHint:['read_view','open_thread','wait'].includes(surface.reverse.get(t.function.name)),destructiveHint:['post_remove','account_ban'].includes(surface.reverse.get(t.function.name)),openWorldHint:false}}:{})}))};
  });
  server.setRequestHandler(CallToolRequestSchema,async request=>{
    let result;
    try{const call=surface.decode(request.params.name,request.params.arguments||{},gateway.client.capabilities());result=await gateway.call(call.operation,call.arguments);}
    catch{result={ok:false,error:{code:'unavailable',message:'Hesap bağlantısı veya işlem yetkisi artık kullanılamıyor.'}};}
    if(result.ok&&result.waitSeconds)await new Promise(resolve=>setTimeout(resolve,result.waitSeconds*1000));
    return {content:[{type:'text',text:JSON.stringify(surface.project(result))}],isError:!result.ok};
  });
  server.setRequestHandler(ListResourcesRequestSchema,async()=>({resources:[]}));
  server.setRequestHandler(ListResourceTemplatesRequestSchema,async()=>({resourceTemplates:[]}));
  server.setRequestHandler(ListPromptsRequestSchema,async()=>({prompts:[]}));
  return server;
}
export async function main([filename,maxDecisions='100',maxWallSeconds='1200',surfaceFile,mode]=process.argv.slice(2)){
  if(!filename)throw new Error('An operator-provided account file is required.');
  const file=path.resolve(filename),lock=file+'.lock';let fd;
  try{fd=openSync(lock,'wx');}catch{
    const pid=Number(readFileSync(lock,'utf8'));
    if(!Number.isSafeInteger(pid)||pid<1)throw new Error('Invalid account lock.');
    try{process.kill(pid,0);throw new Error('The account is already in use.');}
    catch(error){if(error.code!=='ESRCH')throw error;unlinkSync(lock);fd=openSync(lock,'wx');}
  }
  writeFileSync(fd,String(process.pid));
  const release=()=>{if(fd===undefined)return;closeSync(fd);fd=undefined;unlinkSync(lock);};
  try{
    const account=JSON.parse(readFileSync(file,'utf8')),stateFile=file+'.gateway.json',inspect=mode==='inspect';
    const saved=surfaceFile?JSON.parse(readFileSync(surfaceFile,'utf8')):null,surface=new ToolSurface(saved?.options,saved?.aliases);
    const gateway=new ParticipantGateway(account,{maxDecisions:Number(maxDecisions),maxWallSeconds:Number(maxWallSeconds),
      state:!inspect&&existsSync(stateFile)?JSON.parse(readFileSync(stateFile,'utf8')):{},
      save:state=>{if(inspect)return;writeFileSync(stateFile+'.tmp',JSON.stringify(state),{mode:0o600});renameSync(stateFile+'.tmp',stateFile);},
      record:(kind,data)=>{if(!inspect)appendFileSync(file+'.events.jsonl',JSON.stringify({kind,mode:'external-tool',at:new Date().toISOString(),...data})+'\n');}});
    const server=createParticipantMcp(gateway,surface);
    process.once('exit',release);
    await server.connect(new StdioServerTransport(process.stdin,process.stdout,{maxBufferSize:65536}));
    server.onclose=()=>{release();process.exit(0);};
    for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close().finally(()=>{release();process.exit(0);}));
  }catch(error){release();throw error;}
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)main().catch(()=>{console.error('Account connection could not start. Check the operator configuration.');process.exitCode=1;});
