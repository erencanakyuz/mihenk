import { randomUUID } from 'node:crypto';
import { operations,commandType,validateOperation } from './operations.mjs';

export function localURL(value){
  const url=new URL(value);
  if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password)throw new Error('A loopback HTTP address is required.');
  return url.origin;
}
function postView(p){
  const {version,authorId,originalId,...visible}=p;
  return {...visible,id:originalId||p.id,targetKind:'post',own:p.own,actions:(p.actions||[]).map(t=>t.replace('.','_'))};
}
export function observation(view){
  const shown=new Set(),unique=entries=>entries.filter(p=>{const id=p.originalId||p.id;if(shown.has(id))return false;shown.add(id);return true;}).map(p=>({...postView(p),own:p.authorId===view.me.id}));
  const posts=unique(view.items),relatedPosts=unique(view.relatedPosts||[]),ownRequests=unique(view.ownRequests||[]);
  const messageIds=new Set((view.thread?.messages||[]).map(m=>m.id));
  return {title:view.title,account:view.me,query:view.query,posts,relatedPosts,ownRequests,ownRequestIds:(view.ownRequests||[]).map(p=>p.id),
    thread:view.thread?{post:postView(view.thread.post),messages:view.thread.messages.map(({id,author,authorActions,text,kind,createdAt,withdrawn,canWithdraw})=>({id,author,authorActions:(authorActions||[]).map(t=>t.replace('.','_')),text,kind,targetKind:kind==='offer'?'offer':'message',createdAt,withdrawn,canWithdraw})),earlierCount:view.thread.earlierCount,newerCount:view.thread.newerCount,nextMessageOffset:view.thread.nextMessageOffset}:null,
    updates:(view.updates||[]).filter(u=>!messageIds.has(u.id)).map(update=>({...update,authorActions:(update.authorActions||[]).map(t=>t.replace('.','_'))})),nextOffset:view.nextOffset,total:view.total,counts:view.counts,actions:(view.actions||[]).map(t=>t.replace('.','_'))};
}

const targetKinds=Object.freeze({
  post_remove:'posts', account_ban:'accounts', request_update:'posts', request_close:'posts', request_reopen:'posts',
  reply_create:'posts', offer_create:'posts', offer_withdraw:'offers', post_react:'posts', post_repost:'posts',
  account_follow:'accounts', observation_create:'posts', report_create:'posts'
});
const navigationPostKinds=new Set(['post','request','repost']);
const maxNavigationTargets=64;
const normalizeAction=value=>typeof value==='string'?(value.includes('.')?value:value.replace('_','.')):value;
const canonicalPostId=entry=>entry?.originalId||entry?.id||null;

function targetTool(tool,ids){
  const result=structuredClone(tool),schema=result.function.parameters;
  if(schema.properties?.targetId) schema.properties.targetId.enum=[...ids];
  return result;
}
export class Participant {
  constructor({url,token,pageSize=2,actorId,runId,contextMode='author-history',viewLimits={}},state={}){
    this.viewLimits={...(state.viewLimits??viewLimits)};
    for(const [key,value] of Object.entries(this.viewLimits))if(!['messageLimit','relatedLimit','updateLimit'].includes(key)||!Number.isSafeInteger(value)||value<1||value>100)throw new Error('Invalid view limit.');
    this.contextMode=state.contextMode??contextMode;
    if(!['page','author-history'].includes(this.contextMode))throw new Error('Invalid observation context mode.');
    this.url=localURL(url);this.token=token;this.actorId=actorId;this.runId=runId;this.pageSize=state.pageSize??pageSize;this.query=state.query||{};this.view=state.view||null;this.pending=state.pending||null;
    this.navigationPosts=new Map();
    const savedNavigation=Array.isArray(state.navigationPosts)?state.navigationPosts:Array.isArray(state.known)?state.known:[];
    for(const [key,entry] of savedNavigation){
      const id=canonicalPostId(entry)||key;
      if(id&&navigationPostKinds.has(entry?.kind))this.navigationPosts.set(id,{id,kind:entry.kind});
    }
    while(this.navigationPosts.size>maxNavigationTargets)this.navigationPosts.delete(this.navigationPosts.keys().next().value);
    // Keep the old snapshot name for resumability; it now contains navigation IDs only.
    this.known=this.navigationPosts;
    this.targets={posts:new Map(),accounts:new Map(),offers:new Map()};
    this.rebuildTargets(this.view);
  }
  snapshot(){return {pageSize:this.pageSize,viewLimits:this.viewLimits,contextMode:this.contextMode,query:this.query,view:this.view,navigationPosts:[...this.navigationPosts],known:[...this.navigationPosts],pending:this.pending};}
  narrowView(){
    const previous=JSON.stringify([this.pageSize,this.viewLimits]);
    this.pageSize=Math.max(1,Math.floor(this.pageSize/2));
    for(const [key,fallback] of Object.entries({messageLimit:100,relatedLimit:12,updateLimit:20}))this.viewLimits[key]=Math.max(1,Math.floor((this.viewLimits[key]??fallback)/2));
    return previous!==JSON.stringify([this.pageSize,this.viewLimits]);
  }
  async request(route,body){
    if(!['/api/view','/api/commands','/api/activity'].includes(route.split('?')[0]))throw new Error('Participant route is not allowed.');
    const response=await fetch(this.url+route,{method:body===undefined?'GET':'POST',headers:{Authorization:'Bearer '+this.token,'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(15000),...(body===undefined?{}:{body:JSON.stringify(body)})});
    const result=await response.json();
    if(!response.ok&&!result.error)throw new Error('Connection failed.');
    return result;
  }
  async read(query=this.query){
    const view=await this.request('/api/view?'+new URLSearchParams({...query,...this.viewLimits,context:this.contextMode,limit:this.pageSize}));
    if(view.error)throw new Error(view.error.message);
    if(this.actorId&&view.me.id!==this.actorId||this.runId&&view.runId!==this.runId)throw new Error('Account binding does not match the session.');
    if(!Array.isArray(view.operations))throw new Error('The server must support explicit participant permissions.');
    if(this.view&&this.view.accessRevision!==view.accessRevision)this.navigationPosts.clear();
    this.query={...query};this.view=view;
    this.rebuildTargets(view);
    return observation(view);
  }
  rememberNavigation(entry){
    const id=canonicalPostId(entry);
    if(!id||!navigationPostKinds.has(entry?.kind||'post'))return;
    this.navigationPosts.delete(id);this.navigationPosts.set(id,{id,kind:entry.kind||'post'});
    while(this.navigationPosts.size>maxNavigationTargets)this.navigationPosts.delete(this.navigationPosts.keys().next().value);
  }
  rebuildTargets(view){
    this.targets={posts:new Map(),accounts:new Map(),offers:new Map()};
    if(!view)return;
    const addAccount=(id,meta,actions=[])=>{
      if(!id)return;
      const allowed=actions.map(normalizeAction).filter(type=>['account.ban','account.follow'].includes(type));
      if(!allowed.length)return;
      const previous=this.targets.accounts.get(id);
      const target=previous||{id,name:meta?.name||null,handle:meta?.handle||null,org:!!meta?.org,actions:new Set()};
      for(const type of allowed)target.actions.add(type);
      this.targets.accounts.set(id,target);
    };
    const addPost=entry=>{
      const id=canonicalPostId(entry);
      if(!id)return;
      this.rememberNavigation(entry);
      const actions=(entry.actions||[]).map(normalizeAction).filter(Boolean),previous=this.targets.posts.get(id);
      const target=previous||{id,kind:entry.kind||'post',authorId:entry.authorId||entry.author?.id||null,version:entry.version??null,actions:new Set()};
      for(const type of actions)target.actions.add(type);
      if(Number.isInteger(entry.version)&&(target.version===null||entry.version>target.version))target.version=entry.version;
      this.targets.posts.set(id,target);
      addAccount(entry.authorId||entry.author?.id,entry.author,actions);
    };
    for(const entry of [...(view.items||[]),...(view.relatedPosts||[]),...(view.ownRequests||[]),...(view.thread?[view.thread.post]:[])])addPost(entry);
    for(const message of view.thread?.messages||[]){
      addAccount(message.author?.id,message.author,message.authorActions||message.actions||[]);
      if(message.kind==='offer'&&message.canWithdraw&&!message.withdrawn&&message.id){
        this.targets.offers.set(message.id,{id:message.id,targetId:message.targetId||null,version:message.version??null,actions:new Set(['offer.withdraw'])});
      }
    }
    for(const update of view.updates||[]){
      if(update.targetId)this.rememberNavigation({id:update.targetId,kind:'post'});
      addAccount(update.author?.id,update.author,update.authorActions||update.actions||[]);
    }
  }
  targetIds(operation){
    const kind=targetKinds[operation],targets=this.targets[kind];
    if(!targets)return [];
    const type=commandType(operation);
    return [...targets.values()].filter(target=>target.actions.has(type)).map(target=>target.id);
  }
  available(){
    const operationsAllowed=new Set(this.view?.operations||[]),viewActions=new Set((this.view?.actions||[]).map(normalizeAction));
    return operations.filter(tool=>{
      const name=tool.function.name;
      if(!operationsAllowed.has(name))return false;
      if(name==='read_view'||name==='wait')return true;
      if(name==='open_thread')return this.navigationPosts.size>0;
      if(name==='post_create'||name==='request_create')return viewActions.has(commandType(name));
      return this.targetIds(name).length>0;
    }).map(tool=>targetKinds[tool.function.name]?targetTool(tool,this.targetIds(tool.function.name)):structuredClone(tool));
  }
  capabilities(){return operations.filter(tool=>this.view?.operations?.includes(tool.function.name));}
  prepare(decision){
    const invalid=validateOperation(decision,this.available());if(invalid)return {error:{code:'schema',message:invalid}};
    const {operation,arguments:args}=decision;
    if(operation==='open_thread')return this.navigationPosts.has(args.targetId)?{decision}:{error:{code:'not_observed',message:'Önce ilgili gönderiyi görünümde açın.'}};
    if(['wait','read_view'].includes(operation))return {decision};
    if(['post_create','request_create'].includes(operation)){
      const {decisionNote,...payload}=args;
      return {decision,command:{commandId:randomUUID(),type:commandType(operation),payload}};
    }
    const kind=targetKinds[operation],target=args.targetId?this.targets[kind]?.get(args.targetId):null,type=commandType(operation);
    if(!target)return {error:{code:'not_observed',message:'Hedef güncel görünümde yok.'}};
    if(!target.actions.has(type))return {error:{code:'unavailable_action',message:'Bu kayıt için işlem kullanılamıyor.'}};
    const {targetId,decisionNote,...payload}=args;
    return {decision,command:{commandId:randomUUID(),type,...(targetId?{targetId}:{}),...(Number.isInteger(target.version)?{expectedVersion:target.version}:{}),payload}};
  }
  applyAccepted(command){
    const target=command?.targetId;
    if(!target)return;
    if(command.type==='post.remove')this.targets.posts.delete(target);
    else if(command.type==='account.ban')this.targets.accounts.get(target)?.actions.delete('account.ban');
    else if(command.type==='post.repost'||command.type==='offer.create')this.targets.posts.get(target)?.actions.delete(command.type);
    else if(command.type==='offer.withdraw')this.targets.offers.delete(target);
    else if(command.type==='request.close'){
      const post=this.targets.posts.get(target);if(post){post.actions.delete('request.close');post.actions.add('request.reopen');}
    } else if(command.type==='request.reopen'){
      const post=this.targets.posts.get(target);if(post){post.actions.delete('request.reopen');post.actions.add('request.close');}
    }
  }
  async execute(prepared,save=()=>{}){
    if(prepared.error)return {ok:false,error:prepared.error};
    const {operation,arguments:args}=prepared.decision;
    try{await this.request('/api/activity',{eventId:prepared.command?.commandId||randomUUID(),operation,note:args.decisionNote||'',targetId:args.targetId||null});}catch{/* Product receipts remain independent of optional decision notes. */}
    if(operation==='wait')return {ok:true,waitSeconds:args.seconds||10};
    if(operation==='read_view')return {ok:true,observation:await this.read({...args})};
    if(operation==='open_thread')return {ok:true,observation:await this.read({...this.query,thread:args.targetId,messageOffset:args.offset||0})};
    this.pending=prepared;await save();
    try{
      const result=await this.request('/api/commands',prepared.command);
      if(result.ok){
        this.applyAccepted(prepared.command);
        if(['post.create','request.create'].includes(prepared.command.type)&&result.entityId)this.rememberNavigation({id:result.entityId,kind:prepared.command.type==='request.create'?'request':'post'});
        const changed=this.targets.posts.get(result.entityId)||this.targets.offers.get(result.entityId);
        if(changed&&Number.isInteger(result.entityVersion))changed.version=result.entityVersion;
      }
      // An HTTP response is authoritative even when the product rejects the command.
      this.pending=null;await save();return result;
    }catch{return {ok:false,error:{code:'transport',message:'Gönderim doğrulanamadı. Aynı işlem yeniden denenebilir.'}};}
  }
}
