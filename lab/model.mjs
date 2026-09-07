import { randomUUID } from 'node:crypto';
import { validateOperation } from './operations.mjs';
import { localURL } from './participant.mjs';
import { ToolSurface } from './tool-surface.mjs';

export const modelDefaults={model:'Qwen/Qwen3.5-9B',url:'http://127.0.0.1:8000',temperature:0.7,topP:0.8,thinking:false,instructions:null,repairInvalidCalls:false,toolChoice:'auto'};
// A named function has one JSON object as its output. Some providers' required
// mode still generates an unbounded array despite parallel_tool_calls:false.
export function singleActionTool(presented){
  return {type:'function',function:{name:'account_step',parameters:{oneOf:presented.map(({function:fn})=>({
    type:'object',...(fn.description?{description:fn.description}:{}),properties:{operation:{type:'string',enum:[fn.name]},arguments:fn.parameters},required:['operation','arguments'],additionalProperties:false
  }))}}};
}
// vLLM's Qwen XML parser serializes nullable integer parameters as strings.
// Decode only unambiguous scalar representations at the configured transport boundary.
// Keep raw provider output and every conversion in the recording; validation stays strict.
function decodeXmlScalars(value,schema,changes,field='arguments'){
  const types=Array.isArray(schema?.type)?schema.type:[schema?.type];
  if(typeof value==='string'&&!types.includes('string')){
    let decoded=value;
    if(value==='null'&&types.includes('null'))decoded=null;
    else if(types.includes('integer')&&/^-?(0|[1-9][0-9]*)$/.test(value)&&Number.isSafeInteger(Number(value)))decoded=Number(value);
    if(decoded!==value){changes.push({field,from:value,to:decoded});return decoded;}
  }
  if(Array.isArray(value)&&schema?.items)return value.map((v,i)=>decodeXmlScalars(v,schema.items,changes,field+'['+i+']'));
  if(value&&typeof value==='object'&&!Array.isArray(value)&&schema?.properties)return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,decodeXmlScalars(v,schema.properties[key],changes,field+'.'+key)]));
  return value;
}
export class ModelAdapter {
  constructor(config={}){
    this.config={...modelDefaults,...config};
    if(!['auto','required','single'].includes(this.config.toolChoice))throw new Error('Unsupported tool choice.');
    if(this.config.toolArgumentEncoding!=null&&this.config.toolArgumentEncoding!=='qwen3_xml')throw new Error('Unsupported tool argument encoding.');
    this.surface=new ToolSurface(this.config.toolPresentation);
    if(this.config.instructions!==null&&(typeof this.config.instructions!=='string'||this.config.instructions.length>8000))throw new Error('Invalid participant instructions.');
    // Remote endpoints require an explicit operator configuration; no provider fallback.
    if(!this.config.allowRemote)this.origin=localURL(this.config.url);
    else {const u=new URL(this.config.url);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw new Error('Invalid inference URL.');this.origin=u.origin;}
  }
  async request(route,payload,timeout=60000){
    const response=await fetch(this.origin+route,{method:payload===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(this.config.apiKeyEnv?{Authorization:'Bearer '+(process.env[this.config.apiKeyEnv]||'')}: {})},redirect:'error',signal:AbortSignal.timeout(timeout),...(payload===undefined?{}:{body:JSON.stringify(payload)})});
    const data=await response.json();if(!response.ok)throw new Error('Inference HTTP '+response.status+': '+String(data.error?.message||data.detail||'request failed').slice(0,400));return data;
  }
  async preflight(){
    const models=await this.request('/v1/models',undefined,10000);
    if(!models.data?.some(m=>m.id===this.config.model))throw new Error('Configured model is not served by the endpoint.');
    const count=await this.count([{role:'user',content:'Merhaba'}],[]);
    return {model:this.config.model,endpoint:this.origin,tokenizerAvailable:count>0};
  }
  async count(messages,tools,timeout=60000){
    const value=await this.request('/tokenize',{model:this.config.model,messages,tools,add_generation_prompt:true,chat_template_kwargs:{enable_thinking:this.config.thinking}},timeout);
    if(!Number.isSafeInteger(value.count)||value.count<1)throw new Error('Tokenizer did not return a prompt token count.');return value.count;
  }
  async decide({observation,history=[],memory=[],operations,limits,seed,ledger,record,instructions=this.config.instructions,surface=this.surface}){
    if(instructions!==null&&(typeof instructions!=='string'||instructions.length>8000))throw new Error('Invalid participant instructions.');
    const kept=history.slice(),remembered=memory.slice(),presented=surface.tools(operations);let dropped=0,memoryDropped=0,repair=null;
    const requestTools=this.config.toolChoice==='single'?[singleActionTool(presented)]:presented;
    for(let attempt=0;attempt<2;attempt++){
      if(limits.deadline&&Date.now()>=limits.deadline)return {error:{code:'wall_budget',message:'Run time budget reached.'},dropped};
      let messages,count;
      for(;;){
        const {image,...visible}=observation;
        const context=JSON.stringify(surface.project({history:kept,...(memory.length?{previouslySeen:remembered}:{}),observation:visible,...(repair?{formatError:repair}: {})}));
        messages=[...(instructions?[{role:'system',content:instructions}]:[]),{role:'user',content:image?[{type:'text',text:context},{type:'image_url',image_url:{url:image}}]:context}];
        count=await this.count(messages,requestTools,Math.max(1,Math.min(limits.requestTimeoutSeconds*1000,(limits.deadline||Infinity)-Date.now())));
        if(count<=limits.maxInputTokensPerDecision)break;
        if(remembered.length){remembered.shift();memoryDropped++;continue;}
        if(!kept.length)return {error:{code:'input_budget',message:'Current observation and operations exceed the input budget.'},dropped,inputTokens:count};
        kept.shift();dropped++;
      }
      const allowance=limits.maxInputTokensPerDecision+limits.maxOutputTokensPerDecision;
      if(limits.deadline&&Date.now()>=limits.deadline)return {error:{code:'wall_budget',message:'Run time budget reached.'},dropped};
      const requestId=randomUUID();
      if(!await ledger.reserve(requestId,allowance))return {error:{code:'token_budget',message:'Run token budget reached.'},dropped};
      const body={model:this.config.model,messages,tools:requestTools,tool_choice:this.config.toolChoice==='single'?{type:'function',function:{name:'account_step'}}:this.config.toolChoice,parallel_tool_calls:false,max_tokens:limits.maxOutputTokensPerDecision,temperature:this.config.temperature,top_p:this.config.topP,seed:seed+attempt,chat_template_kwargs:{enable_thinking:this.config.thinking},stream:false};
      const started=Date.now();
      await record('model-request',{requestId,attempt,body,inputTokens:count,dropped,memoryDropped,historyEntries:kept.length,memoryEntries:remembered.length,reservedTokens:allowance,at:new Date().toISOString()});
      let raw;
      try{raw=await this.request('/v1/chat/completions',body,Math.max(1,Math.min(limits.requestTimeoutSeconds*1000,(limits.deadline||Infinity)-Date.now())));}
      catch(error){await ledger.settle(requestId,allowance);await record('model-response',{requestId,attempt,error:String(error.message),durationMs:Date.now()-started,chargedTokens:allowance});return {error:{code:'inference',message:error.message},dropped};}
      const usage=raw.usage;
      const total=usage&&Number.isSafeInteger(usage.prompt_tokens)&&Number.isSafeInteger(usage.completion_tokens)&&usage.prompt_tokens>=0&&usage.completion_tokens>=0?usage.prompt_tokens+usage.completion_tokens:allowance;
      await ledger.settle(requestId,total);
      const message=raw.choices?.[0]?.message,calls=message?.tool_calls,transportConversions=[];let decision,error;
      const responseError=!message?{code:'inference',message:'The model returned no message.'}:usage?.prompt_tokens>limits.maxInputTokensPerDecision?{code:'tokenizer_mismatch',message:'Actual input exceeded the counted budget.'}:message.refusal?{code:'refusal',message:message.refusal}:raw.choices[0].finish_reason==='length'?{code:'truncated_output',message:'Response reached its output limit; no operation was applied.'}:this.config.toolChoice!=='auto'&&!calls?.length?{code:'missing_operation',message:'No complete operation was returned; nothing was applied.'}:null;
      if(responseError){
        await record('model-response',{requestId,attempt,raw,decision:null,error:responseError.message,durationMs:Date.now()-started,chargedTokens:total,usageKnown:!!usage});
        return {error:responseError,dropped,history:kept};
      }
      if(calls?.length===1){try{
        let name=calls[0].function.name,args=JSON.parse(calls[0].function.arguments);
        if(this.config.toolChoice==='single'){
          if(name!=='account_step'||!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).some(k=>!['operation','arguments'].includes(k)))throw new Error('Invalid action envelope.');
          name=args.operation;args=args.arguments;
        }
        decision={operation:name,arguments:this.config.toolArgumentEncoding==='qwen3_xml'?decodeXmlScalars(args,presented.find(t=>t.function.name===name)?.function.parameters,transportConversions):args};
      }catch{error='Arguments must be valid JSON.';}}
      else if(calls?.length)error='Only one operation can execute at a time.';
      else {
        await record('model-response',{requestId,attempt,raw,decision:null,durationMs:Date.now()-started,chargedTokens:total,usageKnown:!!usage});
        return {noAction:true,text:typeof message?.content==='string'?message.content.slice(0,8000):'',dropped,history:kept};
      }
      error=error||validateOperation(decision,presented);
      await record('model-response',{requestId,attempt,raw,decision:decision||null,transportConversions,formatError:error||null,durationMs:Date.now()-started,chargedTokens:total,usageKnown:!!usage});
      if(!error)return {decision:surface.decode(decision.operation,decision.arguments,operations),dropped,history:kept,repaired:attempt===1};
      if(!this.config.repairInvalidCalls)return {error:{code:'schema',message:error},attemptedDecision:decision||null,history:kept,dropped};
      repair={message:error,previousOperation:decision||message?.content||null};
    }
    return {error:{code:'schema',message:repair.message},attemptedDecision:repair.previousOperation,history:kept,dropped};
  }
}
