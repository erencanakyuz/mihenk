import { operations } from '../lab/operations.mjs';

const names=operations.map(t=>t.function.name);
const read=['read_view','open_thread','wait'];
// Never granted to plain participants. A new moderation operation must be listed here,
// otherwise the participant allowlist below (names.filter) would hand it to everyone.
const moderation=['post_remove','account_ban','request_manage','post_verify'];
export const roles=Object.freeze({
  participant:{role:'participant',operations:names.filter(n=>!moderation.includes(n)),scope:{posts:'public',regions:null}},
  moderator:{role:'moderator',operations:[...read,'post_remove','account_ban'],scope:{posts:'public',regions:null}},
  request_moderator:{role:'request_moderator',operations:[...read,'request_manage','reply_create','request_close','request_reopen','message_endorse','post_verify'],scope:{posts:'public',regions:null}},
  observer:{role:'observer',operations:read,scope:{posts:'public',regions:null}}
});
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
const only=(value,keys)=>plain(value)&&Object.keys(value).every(k=>keys.includes(k));
export function normalizeAccess(input='participant'){
  if(typeof input==='string'){
    if(!Object.hasOwn(roles,input))throw new Error('Unknown role.');
    return structuredClone(roles[input]);
  }
  if(!only(input,['role','operations','scope'])||typeof input.role!=='string'||!/^[a-z][a-z0-9_-]{0,59}$/.test(input.role))throw new Error('Invalid role policy.');
  if(!Array.isArray(input.operations)||input.operations.some(n=>!names.includes(n))||new Set(input.operations).size!==input.operations.length)throw new Error('Invalid operation allowlist.');
  const scope=input.scope??{posts:'public',regions:null};
  if(!only(scope,['posts','regions'])||!['public','own'].includes(scope.posts))throw new Error('Invalid post scope.');
  if(scope.regions!=null&&(!Array.isArray(scope.regions)||scope.regions.length>100||scope.regions.some(r=>typeof r!=='string'||!r.trim()||r.length>80)))throw new Error('Invalid region scope.');
  return {role:input.role,operations:[...input.operations],scope:{posts:scope.posts,regions:scope.regions==null?null:[...new Set(scope.regions)]}};
}
export function accessFor(actor){
  if(!actor)return {role:'disabled',operations:[],scope:{posts:'own',regions:[]}};
  try{const policy=normalizeAccess(actor.policy??(actor.access==='moderation'?'moderator':actor.access??'participant'));if(actor.banned)policy.operations=policy.operations.filter(n=>read.includes(n));return policy;}
  catch{return {role:'disabled',operations:[],scope:{posts:'own',regions:[]}};}
}
export const permits=(actor,operation)=>accessFor(actor).operations.includes(operation.replace('.','_'));
export const requestModerator=actor=>permits(actor,'request.manage');
export const privateRequestAccess=(state,actorId,p)=>p.authorId===actorId||requestModerator(state.actors[actorId]);
export const messageChannel=m=>m.channel||'community';
export function canReadMessage(state,actorId,m){
  const p=state.posts[m.targetId];
  return !!p&&!p.removed&&canSeePost(state,actorId,p)&&(m.visibility!=='private'||privateRequestAccess(state,actorId,p));
}
export function canSeePost(state,actorId,entry){
  const actor=state.actors[actorId],policy=accessFor(actor),post=entry?.originalId?state.posts[entry.originalId]:entry;
  if(!post||!policy.operations.includes('read_view'))return false;
  if(post.kind==='request'&&post.publicAccess==='restricted'&&!privateRequestAccess(state,actorId,post))return false;
  if(policy.scope.posts==='own'&&post.authorId!==actorId)return false;
  return policy.scope.regions===null||policy.scope.regions.includes(post.location?.known?post.location.region:'unknown');
}
export function canTarget(state,actorId,id){
  if(Object.hasOwn(state.posts,id))return canSeePost(state,actorId,state.posts[id]);
  if(Object.hasOwn(state.offers,id))return canSeePost(state,actorId,state.posts[state.offers[id].targetId]);
  // A readable reply is a target too: community endorsements point at messages.
  if(Object.hasOwn(state.replies,id))return canReadMessage(state,actorId,state.replies[id]);
  // Removal changes feed visibility, not the scope of an already observed account.
  // The command service still requires this session to have seen the target.
  if(Object.hasOwn(state.actors,id))return Object.values(state.posts).some(p=>p.authorId===id&&canSeePost(state,actorId,p))||
    [...Object.values(state.replies),...Object.values(state.offers)].some(m=>m.authorId===id&&canReadMessage(state,actorId,m));
  return false;
}
