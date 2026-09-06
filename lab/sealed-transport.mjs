import { createServer } from 'node:http';
import { randomBytes,timingSafeEqual } from 'node:crypto';
import { validateOperation } from './operations.mjs';
import { ToolSurface } from './tool-surface.mjs';

const namespace='mcp__account';
const textContent=text=>[{type:'input_text',text}];
const same=(a,b)=>typeof a==='string'&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
async function limitedBody(stream,maxBytes){let size=0,parts=[];for await(const chunk of stream){size+=chunk.length;if(size>maxBytes)throw new Error('Transport size limit reached.');parts.push(Buffer.from(chunk));}return Buffer.concat(parts).toString('utf8');}

// Only the selected account's vocabulary crosses this boundary in either
// direction. Responses are validated in full before the Codex executor sees
// any bytes, so an unadvertised native tool cannot execute by name guessing.
export class SealedConversation {
  constructor({operations,observation,instructions=null,surface=new ToolSurface()}){
    this.surface=surface;this.operations=surface.tools(operations);this.initial=JSON.stringify({observation:surface.project(observation)});this.instructions=instructions||'';
    this.history=[{role:'user',content:textContent(this.initial)}];this.pending=new Set();this.received=new Set();
  }
  request(input){
    if(!input||!Array.isArray(input.input))throw new Error('Unsupported model request.');
    for(const item of input.input){
      if(item.type!=='function_call_output'||!this.pending.has(item.call_id)||this.received.has(item.call_id))continue;
      if(typeof item.output!=='string'&&!Array.isArray(item.output))throw new Error('Unsupported account result.');
      this.history.push({type:'function_call_output',call_id:item.call_id,output:item.output});this.received.add(item.call_id);
    }
    for(const id of this.pending)if(!this.received.has(id))throw new Error('An account operation is still pending.');
    this.pending.clear();
    // The Responses namespace schema requires this field even when its text is hidden.
    const tools=[{type:'namespace',name:namespace,description:this.surface.options.descriptions?'Hesap işlemleri.':'',tools:this.operations.map(t=>({type:'function',name:t.function.name,description:t.function.description||'',parameters:t.function.parameters,strict:false}))}];
    const allowed=['model','reasoning','text','max_output_tokens','temperature','top_p','include','service_tier'];
    const request=Object.fromEntries(Object.entries(input).filter(([key])=>allowed.includes(key)));
    return {...request,instructions:this.instructions,input:structuredClone(this.history),tools,tool_choice:'auto',parallel_tool_calls:false,store:false,stream:true};
  }
  checkItem(item,complete=false){
    if(!item||!['message','reasoning','function_call'].includes(item.type))throw new Error('Model attempted an unavailable tool type.');
    if(item.type==='message'&&(item.role!=='assistant'||item.recipient&&item.recipient!=='all'))throw new Error('Unsupported message destination.');
    if(item.type!=='function_call')return;
    if(item.namespace!==undefined&&item.namespace!==namespace)throw new Error('Unsupported operation namespace.');
    const name=item.namespace===namespace?item.name:item.name?.startsWith(namespace+'.')?item.name.slice(namespace.length+1):item.name?.startsWith(namespace+'__')?item.name.slice(namespace.length+2):null;
    if(!name||!this.operations.some(t=>t.function.name===name))throw new Error('Model attempted an unavailable operation.');
    if(complete){
      let args;try{args=JSON.parse(item.arguments);}catch{throw new Error('Model returned invalid operation arguments.');}
      if(validateOperation({operation:name,arguments:args},this.operations))throw new Error('Model returned invalid operation arguments.');
      if(typeof item.call_id!=='string'||!item.call_id)throw new Error('Missing operation identity.');
    }
  }
  response(sse){
    let completed=null;this.lastShape=[];const done=new Map(),added=new Map(),indices=new Map(),argumentsById=new Map(),finishedArguments=new Map();
    const eventTypes=new Set(['response.created','response.in_progress','response.output_item.added','response.output_item.done','response.content_part.added','response.content_part.done','response.output_text.delta','response.output_text.done','response.output_text.annotation.added','response.refusal.delta','response.refusal.done','response.reasoning_summary_part.added','response.reasoning_summary_part.done','response.reasoning_summary_text.delta','response.reasoning_summary_text.done','response.reasoning_text.delta','response.reasoning_text.done','response.function_call_arguments.delta','response.function_call_arguments.done','response.completed','response.incomplete']);
    for(const block of sse.split(/\r?\n\r?\n/)){
      const data=block.split(/\r?\n/).filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');
      if(!data||data==='[DONE]')continue;
      const event=JSON.parse(data);
      if(completed)throw new Error('Response continued after completion.');
      if(!event.type?.endsWith('.delta'))this.lastShape.push({type:event.type,itemType:event.item?.type,name:event.item?.name,namespace:event.item?.namespace});
      if(!eventTypes.has(event.type))throw new Error('Unsupported response event.');
      if(['response.created','response.in_progress'].includes(event.type)&&event.response?.output?.length)throw new Error('Unexpected initial response output.');
      if(event.type==='response.output_item.added'){
        this.checkItem(event.item);
        if(typeof event.item.id!=='string'||!event.item.id||added.has(event.item.id)||!Number.isSafeInteger(event.output_index)||event.output_index<0||indices.has(event.output_index))throw new Error('Invalid response item identity.');
        if(event.item.type==='function_call'&&event.item.arguments!=='')throw new Error('Unexpected initial operation arguments.');
        added.set(event.item.id,event.item);indices.set(event.output_index,event.item.id);
      }
      if(event.type==='response.function_call_arguments.delta'){
        if(added.get(event.item_id)?.type!=='function_call'||indices.get(event.output_index)!==event.item_id||finishedArguments.has(event.item_id)||done.has(event.output_index)||typeof event.delta!=='string')throw new Error('Unbound operation arguments.');
        argumentsById.set(event.item_id,(argumentsById.get(event.item_id)||'')+event.delta);
      }
      if(event.type==='response.function_call_arguments.done'){
        if(added.get(event.item_id)?.type!=='function_call'||indices.get(event.output_index)!==event.item_id||finishedArguments.has(event.item_id)||done.has(event.output_index)||typeof event.arguments!=='string'||argumentsById.has(event.item_id)&&argumentsById.get(event.item_id)!==event.arguments)throw new Error('Conflicting operation arguments.');
        finishedArguments.set(event.item_id,event.arguments);
      }
      if(event.type==='response.output_item.done'){
        this.checkItem(event.item,true);const first=added.get(event.item.id);
        if(!first||first.type!==event.item.type||indices.get(event.output_index)!==event.item.id||done.has(event.output_index))throw new Error('Unbound final response item.');
        if(event.item.type==='function_call'&&(first.name!==event.item.name||first.namespace!==event.item.namespace||first.call_id!==event.item.call_id||argumentsById.has(event.item.id)&&argumentsById.get(event.item.id)!==event.item.arguments||finishedArguments.has(event.item.id)&&finishedArguments.get(event.item.id)!==event.item.arguments))throw new Error('Operation changed during transport.');
        done.set(event.output_index,event.item);
      }
      if(['response.completed','response.incomplete'].includes(event.type))completed=event.response;
      if(event.type==='response.failed'||event.type==='error')throw new Error('Model response did not complete.');
    }
    if(!completed||!Array.isArray(completed.output))throw new Error('Incomplete model response.');
    for(const item of completed.output)this.checkItem(item,true);
    const output=done.size?[...done.entries()].sort((a,b)=>a[0]-b[0]).map(([,item])=>item):completed.output;
    if(completed.output.length&&done.size&&JSON.stringify(completed.output)!==JSON.stringify(output))throw new Error('Conflicting final response.');
    for(const item of added.values())if(item.type==='function_call'&&!output.some(i=>i.id===item.id))throw new Error('Operation did not finish.');
    const calls=output.filter(i=>i.type==='function_call');
    if(calls.length>1)throw new Error('Only one account operation may be pending.');
    if(calls.some(c=>this.received.has(c.call_id)))throw new Error('Operation identity was reused.');
    for(const item of output){this.history.push(item);if(item.type==='function_call')this.pending.add(item.call_id);}
    return {calls:calls.map(c=>({callId:c.call_id,name:c.name,namespace:c.namespace})),usage:completed.usage||null};
  }
}
export async function serveSealedTransport({conversation,model,maxRequests=100,maxWallSeconds=1200,record=()=>{},inspectOnly=false}){
  const secret=randomBytes(32).toString('base64url'),deadline=Date.now()+maxWallSeconds*1000,shutdown=new AbortController();let requests=0,busy=false;
  const server=createServer(async(req,res)=>{
    const reply=(status,message)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{message}}));};
    const expected='127.0.0.1:'+server.address().port;
    if(req.headers.host!==expected||req.method!=='POST'||req.url!=='/responses'||!same(req.headers['x-account-transport'],secret))return reply(403,'Connection unavailable.');
    if(busy||requests>=maxRequests||Date.now()>=deadline)return reply(429,'Participant session limit reached.');
    busy=true;requests++;
    try{
      const original=JSON.parse(await limitedBody(req,2*1024*1024));
      if(original.model!==model)throw new Error('The requested model changed.');
      const body=conversation.request(original);
      await record('sealed-request',{requestNumber:requests,model,tools:body.tools,registeredAccountTools:(original.tools||[]).filter(t=>t.type==='namespace'&&t.name===namespace).flatMap(t=>(t.tools||[]).map(child=>namespace+'.'+child.name)),discardedTools:(original.tools||[]).filter(t=>t.name!==namespace).map(t=>t.name||t.type),visibleInput:requests===1?body.input:undefined,instructions:requests===1?body.instructions:undefined});
      if(inspectOnly){reply(400,'Local capability inspection completed; no inference was performed.');return;}
      // This adapter uses Codex's normal ChatGPT authentication, only with its
      // fixed first-party upstream. No arbitrary destination receives it.
      if(!/^Bearer .+/.test(req.headers.authorization||''))throw new Error('Codex login is required.');
      const headers={'Content-Type':'application/json',Accept:'text/event-stream',Authorization:req.headers.authorization};
      for(const key of ['chatgpt-account-id','openai-beta','originator','version','user-agent','session_id'])if(req.headers[key])headers[key]=req.headers[key];
      const response=await fetch('https://chatgpt.com/backend-api/codex/responses',{method:'POST',headers,body:JSON.stringify(body),redirect:'error',signal:AbortSignal.any([shutdown.signal,AbortSignal.timeout(Math.max(1,deadline-Date.now()))])});
      if(!response.ok){const error=await response.json().catch(()=>({}));throw new Error('Model connection returned HTTP '+response.status+': '+String(error.error?.message||error.detail||'request failed').slice(0,300));}
      const result=await limitedBody(response.body,8*1024*1024);let checked;
      try{checked=conversation.response(result);}finally{await record('response-shape',{events:conversation.lastShape});}
      await record('sealed-response',{requestNumber:requests,...checked});
      res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store'});res.end(result);
    }catch(error){try{await record('sealed-rejection',{requestNumber:requests,message:error.message});}catch{/* A failed recorder must still close the denied request. */}if(!res.destroyed)reply(502,'Participant transport rejected the response.');}
    finally{busy=false;}
  });
  server.on('upgrade',(req,socket)=>socket.destroy());
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {url:'http://127.0.0.1:'+server.address().port,secret,close:async()=>{shutdown.abort();server.closeAllConnections();await new Promise(r=>server.close(r));}};
}
