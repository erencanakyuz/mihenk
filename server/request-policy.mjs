import { permits, canSeePost, privateRequestAccess, requestModerator } from './access.mjs';

export function requestCapabilities(state,actorId,p){
  const actor=state.actors[actorId],readable=canSeePost(state,actorId,p)&&!p.removed;
  const owner=p.authorId===actorId,mod=requestModerator(actor);
  const writable=readable&&!actor.banned&&!['stopped','replay'].includes(state.status);
  return {
    canReadPrivate:readable&&privateRequestAccess(state,actorId,p),
    canEditStatement:writable&&owner&&permits(actor,'request.update'),
    canWriteCoordination:writable&&p.status==='open'&&(owner||mod)&&permits(actor,'reply.create'),
    canWriteCommunity:writable&&p.status==='open'&&p.communityOpen!==false&&permits(actor,'reply.create'),
    canManagePublicAccess:writable&&mod,
    canClose:writable&&p.status==='open'&&(owner||mod)&&permits(actor,'request.close'),
    canReopen:writable&&p.status==='closed'&&(owner||mod)&&permits(actor,'request.reopen')
  };
}

export function requestProjection(state,actorId,p){
  const capabilities=requestCapabilities(state,actorId,p);
  const privacy={address:p.privacy?.address||'public',phone:p.privacy?.phone||'private'};
  const location={known:!!p.location?.known,region:p.location?.region||null};
  if(capabilities.canReadPrivate||privacy.address==='public')location.text=p.location?.text||'';
  const value={need:p.need,people:p.people,status:p.status,details:p.details||'',
    publicLocationText:p.publicLocationText||'',location,capabilities,
    communityOpen:p.communityOpen!==false,publicAccess:p.publicAccess||'public',
    closeReason:p.closeReason||null,closedAt:p.closedAt||null};
  if(capabilities.canReadPrivate)value.privacy=privacy;
  if(capabilities.canReadPrivate||privacy.phone==='public')value.phone=p.phone||'';
  if(p.removed){value.details='';value.location={known:false,region:null};delete value.phone;delete value.privacy;}
  return value;
}
