import { randomUUID } from 'node:crypto';
import { reject } from './world.mjs';
import { accessFor, permits, canSeePost } from './access.mjs';
const actorView=a=>({id:a.id,name:a.name,handle:a.handle,org:!!a.org});
export function publicPost(state,entry,actorId) {
  const p=entry.originalId?state.posts[entry.originalId]:entry;
  const count=(c,predicate)=>Object.values(state[c]).filter(predicate).length;
  const mine=p.authorId===actorId;
  const actor=state.actors[actorId];
  const readOnly=state.actors[actorId].banned||['stopped','replay'].includes(state.status);
  return {
    id:entry.id,originalId:entry.originalId??null,authorId:p.authorId,author:actorView(state.actors[p.authorId]),
    repostedBy:entry.originalId?actorView(state.actors[entry.authorId]):null,
    kind:p.kind,text:p.text,tag:p.tag,removed:!!p.removed,version:p.version,createdAt:p.createdAt,updatedAt:p.updatedAt,
    source:p.source,verification:p.verification,location:p.location,corrects:p.corrects??null,
    ...(p.kind==='request'?{need:p.need,people:p.people,status:p.status}:{}),
    likes:count('reactions',x=>x.targetId===p.id&&x.active),liked:!!state.reactions[actorId+':'+p.id]?.active,
    replies:count('replies',x=>x.targetId===p.id),offers:count('offers',x=>x.targetId===p.id&&!x.withdrawn),
    reposts:count('posts',x=>x.originalId===p.id),reposted:Object.values(state.posts).some(x=>x.originalId===p.id&&x.authorId===actorId),
    observed:!!state.observations[actorId+':'+p.id],following:!!state.follows[actorId+':'+p.authorId]?.active,
    actions: readOnly?[]:[...(!state.actors[p.authorId].banned&&!mine&&!permits(state.actors[p.authorId],'account.ban')&&!permits(state.actors[p.authorId],'post.remove')?['account.ban']:[]),
      ...(!p.removed?['post.remove','reply.create','post.react','post.repost','report.create',...(!mine?['observation.create','account.follow']:[]),
      ...(p.kind==='request'?(mine?['request.update',p.status==='open'?'request.close':'request.reopen']:p.status==='open'?['offer.create']:[]):[])]:[])].filter(type=>permits(actor,type))
  };
}
export function projectView(service,session,query={}) {
  const state=service.store.read(session.run_id);
  if(!state)reject('not_found','Oturum bulunamadı.');
  const actorId=session.actor_id;
  const actor=state.actors[actorId],policy=accessFor(actor);
  if(!permits(actor,'read_view'))reject('unauthorized','Bu görünüm için yetkiniz yok.');
  if(query.thread&&!permits(actor,'open_thread'))reject('unauthorized','Yanıtları açma yetkiniz yok.');
  const filter=['all','resmi','yardim','dogrulanmis','mine','following'].includes(query.filter)?query.filter:'all';
  const region=typeof query.region==='string'?query.region.slice(0,80):'';
  const topic=typeof query.topic==='string'?query.topic.slice(0,30):'';
  const search=typeof query.search==='string'?query.search.slice(0,200).toLocaleLowerCase('tr-TR'):'';
  const authorId=typeof query.authorId==='string'?query.authorId.slice(0,100):'';
  const context=query.context==='page'?'page':'author-history';
  const offset=Math.max(0,Math.min(100000,parseInt(query.offset,10)||0));
  const limit=Math.max(1,Math.min(20,parseInt(query.limit,10)||20));
  const posts=Object.values(state.posts).filter(p=>!p.removed&&(!p.originalId||!state.posts[p.originalId]?.removed)&&canSeePost(state,actorId,p)).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id));
  const canonical=posts.filter(p=>!p.originalId);
  const filtered=posts.filter(entry=>{
    const p=entry.originalId?state.posts[entry.originalId]:entry;
    if(p.removed||entry.removed)return false;
    if(authorId&&p.authorId!==authorId)return false;
    if(region==='unknown'&&(p.kind!=='request'||p.location.known))return false;
    if(region&&region!=='unknown'&&p.location.region!==region)return false;
    if(topic&&p.tag!==topic)return false;
    if(search&&!p.text.toLocaleLowerCase('tr-TR').includes(search))return false;
    if(filter==='mine')return p.kind==='request'&&p.authorId===actorId&&!entry.originalId;
    if(filter==='yardim')return p.kind==='request'&&p.status==='open';
    if(filter==='resmi')return p.verification==='official';
    if(filter==='dogrulanmis')return p.verification==='verified';
    if(filter==='following')return !!state.follows[actorId+':'+entry.authorId]?.active;
    return true;
  });
  let thread=null;
  if(query.thread) {
    const entry=Object.hasOwn(state.posts,query.thread)?state.posts[query.thread]:null;
    if(!entry||!canSeePost(state,actorId,entry))reject('not_found','Gönderi bulunamadı.');
    const p=entry.originalId?state.posts[entry.originalId]:entry;
    const messages=[...Object.values(state.replies).map(x=>({...x,kind:'reply'})),...Object.values(state.offers).map(x=>({...x,kind:'offer'}))]
      .filter(x=>x.targetId===p.id).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
    thread=p.removed?{post:{...publicPost(state,p,actorId),text:'Bu gönderi kaldırıldı.',location:{known:false,region:null,text:''},source:{kind:null,url:null},need:undefined,people:undefined},messages:[],earlierCount:0}:{post:publicPost(state,p,actorId),messages:messages.slice(-100).map(x=>({...x,author:actorView(state.actors[x.authorId]),canWithdraw:x.kind==='offer'&&x.authorId===actorId&&!x.withdrawn&&permits(actor,'offer.withdraw')})),earlierCount:Math.max(0,messages.length-100)};
  }
  const ownPosts=new Set(canonical.filter(p=>p.authorId===actorId).map(p=>p.id));
  const involved=new Set([...ownPosts,...Object.values(state.replies).filter(r=>r.authorId===actorId).map(r=>r.targetId),...Object.values(state.offers).filter(r=>r.authorId===actorId).map(r=>r.targetId)]);
  const updates=[...Object.values(state.replies).map(x=>({...x,kind:'reply'})),...Object.values(state.offers).map(x=>({...x,kind:'offer'}))]
    .filter(x=>involved.has(x.targetId)&&x.authorId!==actorId&&!state.posts[x.targetId]?.removed&&canSeePost(state,actorId,state.posts[x.targetId]))
    .sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,20)
    .map(x=>({id:x.id,targetId:x.targetId,kind:x.kind,at:x.updatedAt,text:x.text,author:actorView(state.actors[x.authorId])}));
  const items=filtered.slice(offset,offset+limit).map(p=>publicPost(state,p,actorId));
  // Context is ordinary accessible content, never a classification of truth or intent.
  // Keep it outside the main page so pagination and feed counts stay stable.
  const anchors=thread?[thread.post]:items;
  const relatedPosts=[],visibleIds=new Set(anchors.map(p=>p.originalId||p.id));
  if(context==='author-history'){
    const added=new Set(visibleIds),authorCounts=new Map();
    for(const anchor of anchors){
      const candidates=[...canonical.filter(p=>p.id===anchor.corrects),...canonical.filter(p=>p.authorId===anchor.authorId)];
      for(const p of candidates){
        if(added.has(p.id))continue;
        if(relatedPosts.length===12)break;
        if((authorCounts.get(anchor.authorId)||0)===2)break;
        relatedPosts.push({...publicPost(state,p,actorId),relation:p.id===anchor.corrects?'corrects':'same_author',relatedTo:anchor.originalId||anchor.id});
        added.add(p.id);authorCounts.set(anchor.authorId,(authorCounts.get(anchor.authorId)||0)+1);
      }
    }
  }
  const view={viewId:randomUUID(),runId:state.id,title:state.title,me:actorView(state.actors[actorId]),
    query:{filter,region,topic,search,authorId,context,offset,limit},items,relatedPosts,thread,updates,
    nextOffset:offset+limit<filtered.length?offset+limit:null,total:filtered.length,
    counts:{all:posts.length,yardim:canonical.filter(p=>p.kind==='request'&&p.status==='open').length,mine:canonical.filter(p=>p.kind==='request'&&p.authorId===actorId).length,
      unknown:canonical.filter(p=>p.kind==='request'&&p.status==='open'&&!p.location.known).length,resmi:canonical.filter(p=>p.verification==='official').length,dogrulanmis:canonical.filter(p=>p.verification==='verified').length},
    controlMode:!policy.operations.some(n=>!['read_view','open_thread','wait','post_remove','account_ban'].includes(n))?'moderation':'participant',
    accessRevision:actor.accessRevision||0,
    operations:policy.operations.filter(n=>!['stopped','replay'].includes(state.status)||['read_view','open_thread','wait'].includes(n)),
    actions:state.status==='stopped'||state.status==='replay'?[]:['post.create','request.create'].filter(type=>permits(actor,type)),
    at:new Date().toISOString()};
  const visible=[...items,...relatedPosts,...(thread?[thread.post]:[])];
  service.store.seen(session,[...visible.flatMap(p=>[p.id,p.originalId,p.authorId].filter(Boolean)),...updates.map(x=>x.targetId),...(thread?thread.messages.map(m=>m.id):[])]);
  service.store.record(state.id,'view',{actorId,view});
  return view;
}
