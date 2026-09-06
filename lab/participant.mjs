import { randomUUID } from 'node:crypto';
import { operations,commandType,validateOperation } from './operations.mjs';

export function localURL(value){
  const url=new URL(value);
  if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password)throw new Error('A loopback HTTP address is required.');
  return url.origin;
}
function postView(p){
  const {version,authorId,originalId,...visible}=p;
  return {...visible,id:originalId||p.id,own:p.own,actions:p.actions.map(t=>t.replace('.','_'))};
}
export function observation(view){
  return {title:view.title,account:view.me,query:view.query,posts:view.items.map(postView),relatedPosts:(view.relatedPosts||[]).map(postView),
    thread:view.thread?{post:postView(view.thread.post),messages:view.thread.messages.map(({id,author,text,kind,createdAt,withdrawn,canWithdraw})=>({id,author,text,kind,createdAt,withdrawn,canWithdraw})),earlierCount:view.thread.earlierCount}:null,
    updates:view.updates,nextOffset:view.nextOffset,total:view.total,counts:view.counts,actions:view.actions.map(t=>t.replace('.','_'))};
}
export class Participant {
  constructor({url,token,pageSize=2,actorId,runId,contextMode='author-history'},state={}){
    this.contextMode=state.contextMode??contextMode;
    if(!['page','author-history'].includes(this.contextMode))throw new Error('Invalid observation context mode.');
    this.url=localURL(url);this.token=token;this.actorId=actorId;this.runId=runId;this.pageSize=pageSize;this.query=state.query||{};this.view=state.view||null;this.known=new Map(state.known||[]);this.pending=state.pending||null;
  }
  snapshot(){return {contextMode:this.contextMode,query:this.query,view:this.view,known:[...this.known],pending:this.pending};}
  async request(route,body){
    if(!['/api/view','/api/commands','/api/activity'].includes(route.split('?')[0]))throw new Error('Participant route is not allowed.');
    const response=await fetch(this.url+route,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+this.token,'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(15000),...(body===undefined?{}:{body:JSON.stringify(body)})});
    const result=await response.json();
    if(!response.ok&&!result.error)throw new Error('Connection failed.');
    return result;
  }
  async read(query=this.query){
    const view=await this.request('/api/view?'+new URLSearchParams({...query,context:this.contextMode,limit:this.pageSize}));
    if(view.error)throw new Error(view.error.message);
    if(this.actorId&&view.me.id!==this.actorId||this.runId&&view.runId!==this.runId)throw new Error('Account binding does not match the session.');
    if(!Array.isArray(view.operations))throw new Error('The server must support explicit participant permissions.');
    if(this.view&&this.view.accessRevision!==view.accessRevision)this.known.clear();
    this.query={...query};this.view=view;
    for(const p of [...view.items,...(view.relatedPosts||[]),...(view.thread?[view.thread.post]:[])]){
      this.known.set(p.id,p);if(p.originalId)this.known.set(p.originalId,{...p,id:p.originalId,originalId:null});
      this.known.set(p.authorId,{id:p.authorId,actions:['account.follow','account.ban'].filter(type=>p.actions.includes(type))});
      if(p.corrects&&!this.known.has(p.corrects))this.known.set(p.corrects,{id:p.corrects,actions:[]});
    }
    for(const u of view.updates)if(!this.known.has(u.targetId))this.known.set(u.targetId,{id:u.targetId,actions:[]});
    for(const m of view.thread?.messages||[])this.known.set(m.id,{...m,actions:m.canWithdraw?['offer.withdraw']:[]});
    while(this.known.size>300)this.known.delete(this.known.keys().next().value);
    return observation(view);
  }
  available(){
    const types=new Set([...this.view?.actions||[],...[...this.known.values()].flatMap(p=>p.actions||[])]);
    return operations.filter(t=>this.view?.operations?.includes(t.function.name)&&(['read_view','open_thread','wait'].includes(t.function.name)||types.has(commandType(t.function.name))));
  }
  capabilities(){return operations.filter(t=>this.view?.operations?.includes(t.function.name));}
  prepare(decision){
    const invalid=validateOperation(decision,this.available());if(invalid)return {error:{code:'schema',message:invalid}};
    const {operation,arguments:args}=decision;
    if(args.targetId&&!this.known.has(args.targetId))return {error:{code:'not_observed',message:'Önce ilgili kaydı görünümde açın.'}};
    if(['wait','read_view','open_thread'].includes(operation))return {decision};
    const type=commandType(operation),target=args.targetId?this.known.get(args.targetId):null;
    if(target&&!target.actions?.includes(type))return {error:{code:'unavailable_action',message:'Bu kayıt için işlem kullanılamıyor.'}};
    const {targetId,decisionNote,...payload}=args;
    return {decision,command:{commandId:randomUUID(),type,...(targetId?{targetId}:{}),...(target?.version?{expectedVersion:target.version}:{}),payload}};
  }
  async execute(prepared,save=()=>{}){
    if(prepared.error)return {ok:false,error:prepared.error};
    const {operation,arguments:args}=prepared.decision;
    try{await this.request('/api/activity',{eventId:prepared.command?.commandId||randomUUID(),operation,note:args.decisionNote||'',targetId:args.targetId||null});}catch{/* Product receipts remain independent of optional decision notes. */}
    if(operation==='wait')return {ok:true,waitSeconds:args.seconds||10};
    if(operation==='read_view')return {ok:true,observation:await this.read({...args})};
    if(operation==='open_thread')return {ok:true,observation:await this.read({...this.query,thread:args.targetId})};
    this.pending=prepared;await save();
    try{
      const result=await this.request('/api/commands',prepared.command);
      if(result.ok&&prepared.command.type==='post.remove'){
        const post=this.known.get(prepared.command.targetId);if(post){post.actions=[];post.removed=true;}
      }
      if(result.ok&&prepared.command.type==='account.ban'){
        for(const record of this.known.values())if(record.id===prepared.command.targetId||record.authorId===prepared.command.targetId)record.actions=(record.actions||[]).filter(type=>type!=='account.ban');
      }
      // An HTTP response is authoritative even when the product rejects the command.
      this.pending=null;await save();return result;
    }catch{return {ok:false,error:{code:'transport',message:'Gönderim doğrulanamadı. Aynı işlem yeniden denenebilir.'}};}
  }
}
