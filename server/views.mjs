import { randomUUID } from 'node:crypto';
import { reject } from './world.mjs';
const actorView=a=>({id:a.id,name:a.name,handle:a.handle,org:!!a.org});
export function publicPost(state,entry,actorId) {
  const p=entry.originalId?state.posts[entry.originalId]:entry;
  const count=(c,predicate)=>Object.values(state[c]).filter(predicate).length;
  const mine=p.authorId===actorId;
  return {
    id:entry.id,originalId:entry.originalId??null,authorId:p.authorId,author:actorView(state.actors[p.authorId]),
    repostedBy:entry.originalId?actorView(state.actors[entry.authorId]):null,
    kind:p.kind,text:p.text,tag:p.tag,version:p.version,createdAt:p.createdAt,updatedAt:p.updatedAt,
    source:p.source,verification:p.verification,location:p.location,corrects:p.corrects??null,
    ...(p.kind==='request'?{need:p.need,people:p.people,status:p.status}:{}),
    likes:count('reactions',x=>x.targetId===p.id&&x.active),liked:!!state.reactions[actorId+':'+p.id]?.active,
    replies:count('replies',x=>x.targetId===p.id),offers:count('offers',x=>x.targetId===p.id&&!x.withdrawn),
    reposts:count('posts',x=>x.originalId===p.id),reposted:Object.values(state.posts).some(x=>x.originalId===p.id&&x.authorId===actorId),
    observed:!!state.observations[actorId+':'+p.id],following:!!state.follows[actorId+':'+p.authorId]?.active,
    actions: ['reply.create','post.react','post.repost','report.create',...(!mine?['observation.create','account.follow']:[]),
      ...(p.kind==='request'?(mine?['request.update',p.status==='open'?'request.close':'request.reopen']:p.status==='open'?['offer.create']:[]):[])]
  };
}
export function projectView(service,session,query={}) {
  const state=service.store.read(session.run_id);
  if(!state)reject('not_found','Oturum bulunamadı.');
  const actorId=session.actor_id;
  const filter=['all','resmi','yardim','dogrulanmis','mine','following'].includes(query.filter)?query.filter:'all';
  const region=typeof query.region==='string'?query.region.slice(0,80):'';
  const topic=typeof query.topic==='string'?query.topic.slice(0,30):'';
  const search=typeof query.search==='string'?query.search.slice(0,200).toLocaleLowerCase('tr-TR'):'';
  const offset=Math.max(0,Math.min(100000,parseInt(query.offset,10)||0));
  const limit=Math.max(1,Math.min(20,parseInt(query.limit,10)||20));
  const posts=Object.values(state.posts).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id));
  const canonical=Object.values(state.posts).filter(p=>!p.originalId);
  const filtered=posts.filter(entry=>{
    const p=entry.originalId?state.posts[entry.originalId]:entry;
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
    if(!entry)reject('not_found','Gönderi bulunamadı.');
    const p=entry.originalId?state.posts[entry.originalId]:entry;
    const messages=[...Object.values(state.replies).map(x=>({...x,kind:'reply'})),...Object.values(state.offers).map(x=>({...x,kind:'offer'}))]
      .filter(x=>x.targetId===p.id).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
    thread={post:publicPost(state,p,actorId),messages:messages.slice(-100).map(x=>({...x,author:actorView(state.actors[x.authorId]),canWithdraw:x.kind==='offer'&&x.authorId===actorId&&!x.withdrawn})),earlierCount:Math.max(0,messages.length-100)};
  }
  const ownPosts=new Set(canonical.filter(p=>p.authorId===actorId).map(p=>p.id));
  const involved=new Set([...ownPosts,...Object.values(state.replies).filter(r=>r.authorId===actorId).map(r=>r.targetId),...Object.values(state.offers).filter(r=>r.authorId===actorId).map(r=>r.targetId)]);
  const updates=[...Object.values(state.replies).map(x=>({...x,kind:'reply'})),...Object.values(state.offers).map(x=>({...x,kind:'offer'}))]
    .filter(x=>involved.has(x.targetId)&&x.authorId!==actorId)
    .sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,20)
    .map(x=>({id:x.id,targetId:x.targetId,kind:x.kind,at:x.updatedAt,text:x.text,author:actorView(state.actors[x.authorId])}));
  const items=filtered.slice(offset,offset+limit).map(p=>publicPost(state,p,actorId));
  const view={viewId:randomUUID(),runId:state.id,title:state.title,me:actorView(state.actors[actorId]),
    query:{filter,region,topic,search,offset,limit},items,thread,updates,
    nextOffset:offset+limit<filtered.length?offset+limit:null,total:filtered.length,
    counts:{all:posts.length,yardim:canonical.filter(p=>p.kind==='request'&&p.status==='open').length,mine:canonical.filter(p=>p.kind==='request'&&p.authorId===actorId).length,
      unknown:canonical.filter(p=>p.kind==='request'&&p.status==='open'&&!p.location.known).length,resmi:canonical.filter(p=>p.verification==='official').length,dogrulanmis:canonical.filter(p=>p.verification==='verified').length},
    actions:state.status==='stopped'||state.status==='replay'?[]:['post.create','request.create'],
    at:new Date().toISOString()};
  const visible=[...items,...(thread?[thread.post]:[])];
  service.store.seen(session,[...visible.flatMap(p=>[p.id,p.originalId,p.authorId].filter(Boolean)),...updates.map(x=>x.targetId),...(thread?thread.messages.map(m=>m.id):[])]);
  service.store.record(state.id,'view',{actorId,view});
  return view;
}
