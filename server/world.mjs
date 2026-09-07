import { randomUUID } from 'node:crypto';
import { hash } from './store.mjs';
import { permits, canSeePost, canTarget } from './access.mjs';
export const NEEDS = {kurtarma:'Arama kurtarma',saglik:'Sağlık / ilk yardım',barinma:'Barınma ve ısınma',gida:'Gıda ve su',ulasim:'Ulaşım'};
export const TAGS = ['yardim','enkaz','kayip','nokta','resmi','durum'];
const collections = ['actors','posts','replies','offers','reports','reactions','follows','observations'];
export class AppError extends Error {
  constructor(code,message,field=null) { super(message); this.code=code; this.field=field; }
}
export const reject = (code,message,field) => { throw new AppError(code,message,field); };
function fields(object,allowed) {
  if (!object || typeof object !== 'object' || Array.isArray(object) || Object.keys(object).some(k=>!allowed.includes(k)))
    reject('validation','İşlemde tanınmayan veya eksik alan var.');
}
function text(value,limit,required=false,field='text') {
  if (typeof value !== 'string' || value.length>limit || (required&&!value.trim())) reject('validation','Metni kontrol edin.',field);
  return value.trim();
}
function location(value) {
  fields(value,['region','text','known']);
  if (typeof value.known!=='boolean') reject('validation','Konum durumunu belirtin.','location');
  const region = value.region == null ? null : text(value.region,80,false,'location');
  const description = text(value.text??'',240,false,'location');
  if (value.known && !region && !description) reject('validation','Bir yer tarifi yazın veya konumu bilinmiyor olarak belirtin.','location');
  if (!value.known && (region||description)) reject('validation','Konum alanlarını kontrol edin.','location');
  return {region:region||null,text:description,known:value.known};
}
function source(value) {
  if (value==null) return {kind:null,url:null};
  fields(value,['kind','url']);
  if (![null,'firsthand','relayed','link'].includes(value.kind)) reject('validation','Bilginin kaynağını kontrol edin.','source');
  if (value.kind==='link') {
    let url;
    try { url=new URL(text(value.url,600,true,'source')); } catch { reject('validation','Geçerli bir kaynak bağlantısı yazın.','source'); }
    if (!['http:','https:'].includes(url.protocol)||url.username||url.password) reject('validation','http veya https bağlantısı kullanın.','source');
    return {kind:value.kind,url:url.href};
  }
  if (value.url) reject('validation','Bağlantı için kaynak türünü seçin.','source');
  return {kind:value.kind,url:null};
}
function requestFields(payload,partial=false) {
  fields(payload,['need','people','location']);
  const out={};
  if (!partial || 'need' in payload) {
    if (!Array.isArray(payload.need)||!payload.need.length||payload.need.length>5||payload.need.some(n=>!Object.hasOwn(NEEDS,n)))
      reject('validation','En az bir ihtiyaç seçin.','need');
    out.need=[...new Set(payload.need)];
  }
  if (!partial || 'people' in payload) {
    if (payload.people!==null&&(!Number.isSafeInteger(payload.people)||payload.people<1)) reject('validation','Kişi sayısı pozitif tam sayı veya bilinmiyor olmalı.','people');
    out.people=payload.people;
  }
  if (!partial || 'location' in payload) out.location=location(payload.location);
  return out;
}
const needsText=p=>p.need.map(n=>NEEDS[n]).join(', ')+' ihtiyacı var. '+(p.people===null?'Kişi sayısı henüz bilinmiyor.':p.people+' kişi.');
function own(entity,actor) { if (entity.authorId!==actor) reject('unauthorized','Bu kaydı yalnızca sahibi değiştirebilir.'); }
function version(entity,cmd) { if (!Number.isInteger(cmd.expectedVersion)||entity.version!==cmd.expectedVersion) reject('conflict','Talep güncellendi. Son bilgileri kontrol edin.'); }
export function deltaBetween(before,after) {
  const delta={};
  for (const c of collections) {
    const changed={};
    for (const [key,value] of Object.entries(after[c])) if (JSON.stringify(before[c][key])!==JSON.stringify(value)) changed[key]=value;
    if(Object.keys(changed).length) delta[c]=changed;
  }
  for(const key of ['tick','status']) if(before[key]!==after[key]) delta[key]=after[key];
  return delta;
}
export function applyDelta(state,delta) {
  for(const [key,value] of Object.entries(delta)) {
    if(collections.includes(key)) Object.assign(state[key],structuredClone(value));
    else if(['tick','status'].includes(key)) state[key]=value;
  }
  return state;
}
export function execute(state,actorId,cmd,now=new Date().toISOString()) {
  fields(cmd,['commandId','type','targetId','expectedVersion','payload']);
  if(typeof cmd.commandId!=='string'||!/^[-a-zA-Z0-9]{8,100}$/.test(cmd.commandId)) reject('validation','İşlem kimliği geçersiz.');
  if(typeof cmd.type!=='string') reject('validation','İşlem türü gerekli.');
  if(!Object.hasOwn(state.actors,actorId)) reject('unauthorized','Oturum bulunamadı.');
  const actor=state.actors[actorId];
  if(actor.banned)reject('unauthorized','Bu hesap yeni işlem yapamıyor.');
  if(!permits(actor,cmd.type))reject('unauthorized','Bu işlem için yetkiniz yok.');
  if(cmd.targetId&&!canTarget(state,actorId,cmd.targetId))reject('unauthorized','Bu kayıt erişiminizin dışında.');
  if(state.status==='stopped'||state.status==='replay') reject('unavailable','Bu oturum yeni işlemlere kapalı.');
  const p=cmd.payload??{}, target=Object.hasOwn(state.posts,cmd.targetId)?state.posts[cmd.targetId]:null;
  const stamp={authorId:actorId,version:1,createdAt:now,updatedAt:now};
  let entity;
  if(['post.remove','account.ban'].includes(cmd.type)){
    fields(p,[]);
    if(cmd.type==='post.remove'){
      if(!target||target.removed)reject('not_found','Gönderi artık görünmüyor.');
      version(target,cmd);target.removed=true;target.removedBy=actorId;target.version++;target.updatedAt=now;entity=target;
    }else{
      const account=Object.hasOwn(state.actors,cmd.targetId)?state.actors[cmd.targetId]:null;
      if(!account||account.id===actorId)reject('validation','Hesabı kontrol edin.');
      if(permits(account,'account.ban')||permits(account,'post.remove'))reject('unauthorized','Bu hesap bu işlemle engellenemez.');
      if(account.banned)reject('conflict','Bu hesap zaten kısıtlandı.');
      account.banned=true;account.bannedBy=actorId;account.updatedAt=now;account.version=(account.version||1)+1;entity=account;
    }
  } else if(cmd.type==='request.create') {
    const props=requestFields(p);
    entity={...stamp,id:randomUUID(),kind:'request',tag:'yardim',...props,status:'open',verification:'unverified',source:{kind:'firsthand',url:null}};
    entity.text=needsText(entity); state.posts[entity.id]=entity;
  } else if(cmd.type==='post.create') {
    fields(p,['text','tag','location','source']);
    if(!TAGS.includes(p.tag)) reject('validation','Bir konu seçin.','tag');
    entity={...stamp,id:randomUUID(),kind:'post',text:text(p.text,1000,true),tag:p.tag,location:location(p.location??{known:false,region:null,text:''}),source:source(p.source),verification:'unverified'};
    state.posts[entity.id]=entity;
  } else if(cmd.type==='account.follow') {
    fields(p,['active']);
    if(typeof p.active!=='boolean'||!Object.hasOwn(state.actors,cmd.targetId)||cmd.targetId===actorId) reject('validation','Takip işlemini kontrol edin.');
    entity={...stamp,id:actorId+':'+cmd.targetId,targetId:cmd.targetId,active:p.active};
    state.follows[entity.id]=entity;
  } else if(cmd.type==='offer.withdraw') {
    fields(p,[]);
    entity=Object.hasOwn(state.offers,cmd.targetId)?state.offers[cmd.targetId]:null;
    if(!entity) reject('not_found','Destek önerisi bulunamadı.');
    own(entity,actorId); version(entity,cmd); entity.withdrawn=true; entity.version++; entity.updatedAt=now;
  } else {
    if(!target||target.removed) reject('not_found','Gönderi bulunamadı.');
    if(cmd.type.startsWith('request.')) {
      if(target.kind!=='request') reject('validation','Bu kayıt bir yardım talebi değil.');
      own(target,actorId); version(target,cmd);
      if(cmd.type==='request.update') { Object.assign(target,requestFields(p,true)); target.text=needsText(target); }
      else if(cmd.type==='request.close'||cmd.type==='request.reopen') { fields(p,[]); target.status=cmd.type==='request.close'?'closed':'open'; }
      else reject('validation','İşlem tanınmıyor.');
      target.version++;target.updatedAt=now;entity=target;
    } else if(cmd.type==='reply.create'||cmd.type==='offer.create') {
      fields(p,['text']);
      if(cmd.type==='offer.create') {
        if(target.kind!=='request'||target.status!=='open') reject('conflict','Bu talep kapalı. Güncel durumu kontrol edin.');
        if(target.authorId===actorId) reject('validation','Kendi talebinize destek öneremezsiniz.');
        if(Object.values(state.offers).some(o=>o.targetId===target.id&&o.authorId===actorId&&!o.withdrawn)) reject('conflict','Bu talepte açık bir destek öneriniz var.');
        version(target,cmd);
      }
      entity={...stamp,id:randomUUID(),targetId:target.id,text:text(p.text,1000,true),withdrawn:false};
      state[cmd.type==='offer.create'?'offers':'replies'][entity.id]=entity;
    } else if(cmd.type==='post.react') {
      fields(p,['active']);
      if(typeof p.active!=='boolean') reject('validation','Beğeni işlemini kontrol edin.');
      entity={...stamp,id:actorId+':'+target.id,targetId:target.id,active:p.active}; state.reactions[entity.id]=entity;
    } else if(cmd.type==='post.repost') {
      fields(p,[]);
      const original=target.originalId?state.posts[target.originalId]:target;
      if(Object.values(state.posts).some(x=>x.authorId===actorId&&x.originalId===original.id)) reject('conflict','Bu gönderiyi zaten yeniden paylaştınız.');
      entity={...stamp,id:randomUUID(),kind:'repost',originalId:original.id}; state.posts[entity.id]=entity;
    } else if(cmd.type==='observation.create') {
      fields(p,[]);
      entity={...stamp,id:actorId+':'+target.id,targetId:target.id}; state.observations[entity.id]=entity;
    } else if(cmd.type==='report.create') {
      fields(p,['reason','details']);
      version(target,cmd);
      if(!['inaccurate','abuse','privacy','other'].includes(p.reason)) reject('validation','Bir bildirim nedeni seçin.','reason');
      entity={...stamp,id:randomUUID(),targetId:target.id,targetVersion:target.version,reason:p.reason,details:text(p.details??'',1000),status:'received'};
      state.reports[entity.id]=entity;
    } else reject('validation','İşlem tanınmıyor.');
  }
  if(entity.kind&&['post','request','repost'].includes(entity.kind)&&!canSeePost(state,actorId,entity))reject('unauthorized','Paylaşım erişim bölgenizin dışında.');
  return {ok:true,commandId:cmd.commandId,entityId:entity.id,entityVersion:entity.version};
}
export function createWorldService(store) {
  const listeners=new Set();
  const notify=(runId,delta)=>listeners.forEach(fn=>fn(runId,delta));
  return {
    store, listeners,
    mutate(runId,operation,metadata={}) {
      const result=store.transaction(()=>{
        const before=store.read(runId);
        if(!before) reject('not_found','Oturum bulunamadı.');
        const after=structuredClone(before), result=operation(after), delta=deltaBetween(before,after);
        store.save(after); store.event(runId,{at:new Date().toISOString(),...metadata,delta});
        return {result,delta};
      });
      notify(runId,result.delta);return result.result;
    },
    command(session,cmd) {
      if(!cmd || typeof cmd.commandId!=='string'||cmd.commandId.length>100) return {ok:false,error:{code:'validation',message:'İşlem kimliği gerekli.',field:null,retryable:false}};
      const digest=hash(JSON.stringify(cmd));let delta;
      const result=store.transaction(()=>{
        const saved=store.receipt(session.run_id,session.actor_id,cmd.commandId);
        if(saved) return saved.digest===digest ? JSON.parse(saved.result) : {ok:false,error:{code:'conflict',message:'Aynı işlem kimliği farklı içerikle kullanılamaz.',field:null,retryable:false}};
        const before=store.read(session.run_id);
        let result;
        try {
          const after=structuredClone(before);
          if(cmd.targetId && !JSON.parse(session.seen).includes(cmd.targetId)) {
            const ownPost=Object.hasOwn(after.posts,cmd.targetId)&&after.posts[cmd.targetId].authorId===session.actor_id;
            const ownOffer=Object.hasOwn(after.offers,cmd.targetId)&&after.offers[cmd.targetId].authorId===session.actor_id;
            if(!ownPost&&!ownOffer) reject('unauthorized','Önce ilgili kaydı açın.');
          }
          result=execute(after,session.actor_id,cmd);
          delta=deltaBetween(before,after);
          store.save(after);store.event(after.id,{at:new Date().toISOString(),actorId:session.actor_id,command:cmd,delta});
        } catch(error) {
          if(!(error instanceof AppError)) throw error;
          result={ok:false,error:{code:error.code,message:error.message,field:error.field,retryable:false}};
          store.record(session.run_id,'rejection',{actorId:session.actor_id,command:cmd,result,at:new Date().toISOString()});
        }
        store.saveReceipt(session.run_id,session.actor_id,cmd.commandId,digest,result);
        return result;
      });
      if(delta)notify(session.run_id,delta);
      return result;
    }
  };
}
