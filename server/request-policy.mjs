import { permits, canSeePost, privateRequestAccess, requestModerator, canReadMessage, messageChannel } from './access.mjs';

// Two page kinds share one mechanic with different purposes: a structured help request
// coordinates aid, an information post discusses whether the information is accurate.
// Institutional announcements (official verification) have neither a page nor comments.
export const pageKind=p=>!p?null:p.kind==='request'?'request':p.kind==='post'&&p.verification!=='official'?'info':null;
export const threadPost=p=>!!pageKind(p);
export const commentsClosed=p=>!!p&&p.kind!=='request'&&p.verification==='official';

export function requestCapabilities(state,actorId,p){
  const actor=state.actors[actorId],readable=canSeePost(state,actorId,p)&&!p.removed;
  const owner=p.authorId===actorId,mod=requestModerator(actor),request=p.kind==='request';
  const writable=readable&&!actor.banned&&!['stopped','replay'].includes(state.status);
  const open=!request||p.status==='open';
  return {
    canReadPrivate:readable&&privateRequestAccess(state,actorId,p),
    canEditStatement:writable&&request&&owner&&permits(actor,'request.update'),
    canWriteCoordination:writable&&open&&(owner||mod)&&permits(actor,'reply.create'),
    canWriteCommunity:writable&&open&&(!request||p.communityOpen!==false)&&permits(actor,'reply.create'),
    canManagePublicAccess:writable&&request&&mod,
    canClose:writable&&request&&p.status==='open'&&(owner||mod)&&permits(actor,'request.close'),
    canReopen:writable&&request&&p.status==='closed'&&(owner||mod)&&permits(actor,'request.reopen')
  };
}

// Readable messages per channel for this viewer; withdrawn offers are not counted.
export function messageCounts(state,actorId,p){
  const counts={coordination:0,community:0};
  for(const m of [...Object.values(state.replies),...Object.values(state.offers).filter(o=>!o.withdrawn)])
    if(m.targetId===p.id&&canReadMessage(state,actorId,m))counts[messageChannel(m)]++;
  return counts;
}

export function requestProjection(state,actorId,p){
  const capabilities=requestCapabilities(state,actorId,p);
  const counts=messageCounts(state,actorId,p);
  // An information post has no lifecycle of its own: its discussion stays open.
  if(p.kind!=='request')return {pageKind:'info',status:'open',communityOpen:true,publicAccess:'public',capabilities,messageCounts:counts};
  const privacy={address:p.privacy?.address||'public',phone:p.privacy?.phone||'private'};
  const location={known:!!p.location?.known,region:p.location?.region||null};
  if(capabilities.canReadPrivate||privacy.address==='public')location.text=p.location?.text||'';
  const value={pageKind:'request',need:p.need,people:p.people,status:p.status,details:p.details||'',
    publicLocationText:p.publicLocationText||'',location,capabilities,messageCounts:counts,
    communityOpen:p.communityOpen!==false,publicAccess:p.publicAccess||'public',
    closeReason:p.closeReason||null,closedAt:p.closedAt||null};
  if(capabilities.canReadPrivate)value.privacy=privacy;
  if(capabilities.canReadPrivate||privacy.phone==='public')value.phone=p.phone||'';
  if(p.removed){value.details='';value.location={known:false,region:null};delete value.phone;delete value.privacy;}
  return value;
}

// A quote-like reference from an information post to a help request. Only the need
// summary travels, never a private field, and only while the referenced request is
// still readable by this viewer.
export function aboutProjection(state,actorId,p){
  const ref=p.about?state.posts[p.about]:null;
  if(!ref||ref.removed||ref.kind!=='request'||!canSeePost(state,actorId,ref))return null;
  return {id:ref.id,need:ref.need,people:ref.people,status:ref.status,
    author:{id:ref.authorId,name:state.actors[ref.authorId]?.name||''}};
}
