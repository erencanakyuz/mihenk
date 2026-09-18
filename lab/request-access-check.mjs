/* Narrow access exercise for the help-request privacy boundary.
   Starts an in-process rehearsal server on ephemeral ports with a temporary
   database, then drives one request through owner, authorized moderator,
   region-scoped moderator, public participant and observer roles.
   Usage: node lab/request-access-check.mjs */
import { serveRehearsal } from '../server/http.mjs';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const dir=mkdtempSync(path.join(tmpdir(),'mihenk-access-'));
const server=await serveRehearsal({port:0,operatorPort:0,dbPath:path.join(dir,'world.sqlite')});
const base='http://127.0.0.1:'+server.port, operatorBase='http://127.0.0.1:'+server.operatorPort;
const out=[];
const ok=(name,cond,extra='')=>{out.push((cond?'PASS':'FAIL')+' · '+name+(extra?' · '+extra:''));if(!cond)process.exitCode=1;};
const PRIVATE_ADDRESS='Gizli Sokak No 5, kat 2', PRIVATE_PHONE='0555 000 00 00';
const PRIVATE_TEXTS=['Arka bahçe kapısından girin','Aradım, ulaşamadım'];
const leaks=value=>{const s=JSON.stringify(value);return [PRIVATE_ADDRESS,PRIVATE_PHONE,...PRIVATE_TEXTS].filter(t=>s.includes(t));};

async function operator(route,payload){
  const r=await fetch(operatorBase+route,{method:payload===undefined?'GET':'POST',headers:{Authorization:'Bearer '+server.operatorToken,'Content-Type':'application/json'},...(payload===undefined?{}:{body:JSON.stringify(payload)})});
  const v=await r.json();if(!r.ok)throw new Error(v.error?.message||route);return v;
}
class Client{
  constructor(session){this.token=session.token;this.actorId=session.actorId;}
  async view(query={}){const r=await fetch(base+'/api/view?'+new URLSearchParams(query),{headers:{Authorization:'Bearer '+this.token}});return r.json();}
  async thread(id,channel='coordination'){return this.view({thread:id,channel,limit:1,relatedLimit:0});}
  async send(cmd){const r=await fetch(base+'/api/commands',{method:'POST',headers:{Authorization:'Bearer '+this.token,'Content-Type':'application/json'},body:JSON.stringify({commandId:randomUUID(),payload:{},...cmd})});return r.json();}
  async events(){
    const r=await fetch(base+'/api/events',{headers:{Authorization:'Bearer '+this.token}});
    const reader=r.body.getReader(),decoder=new TextDecoder();let buffer='',pending=null;
    return {
      async next(ms){
        const started=Date.now();
        while(Date.now()-started<ms){
          const match=buffer.match(/event: changed\ndata: (.*)\n\n/);
          if(match){buffer=buffer.slice(match.index+match[0].length);return JSON.parse(match[1]);}
          pending=pending||reader.read();
          const chunk=await Promise.race([pending,new Promise(resolve=>setTimeout(()=>resolve({timeout:true}),Math.max(1,ms-(Date.now()-started))))]);
          if(chunk.timeout)return null;
          pending=null;if(chunk.done)return null;
          buffer+=decoder.decode(chunk.value,{stream:true});
        }
        return null;
      },
      close(){reader.cancel().catch(()=>{});}
    };
  }
}
const code=result=>result.ok?'ok':result.error?.code;

try{
  const {runId}=await operator('/runs',{scenario:'incomplete-information'});
  await operator('/control',{runId,action:'start'});
  const owner=new Client(await operator('/sessions',{runId,actorId:'resident-deniz'}));
  const moderator=new Client(await operator('/sessions',{runId,name:'Gönüllü Moderatör',policy:'request_moderator'}));
  const neighbor=new Client(await operator('/sessions',{runId,name:'Komşu'}));
  const observer=new Client(await operator('/sessions',{runId,name:'Gözlemci',policy:'observer'}));
  const scoped=new Client(await operator('/sessions',{runId,name:'Bölge Moderatörü',policy:{role:'request_moderator',operations:['read_view','open_thread','wait','request_manage','reply_create','request_close','request_reopen'],scope:{posts:'public',regions:['Hatay']}}}));

  // 1. Creation with private fields.
  const created=await owner.send({type:'request.create',payload:{need:['barinma'],people:4,location:{known:true,region:'Pazarcık',text:PRIVATE_ADDRESS},details:'Çadırda iki çocukla bekliyoruz, battaniye gerekiyor.',phone:PRIVATE_PHONE,publicLocationText:'Çınar Parkı yakını',privacy:{address:'private',phone:'private'}}});
  ok('owner creates a request with private address and phone',created.ok,JSON.stringify(created.error||''));
  const R=created.entityId;
  const ownerThread=(await owner.thread(R)).thread;
  ok('owner reads own private fields and capabilities',ownerThread?.post.phone===PRIVATE_PHONE&&ownerThread.post.location.text===PRIVATE_ADDRESS&&ownerThread.post.privacy?.address==='private'&&ownerThread.post.capabilities.canReadPrivate&&ownerThread.post.capabilities.canWriteCoordination&&ownerThread.post.capabilities.canEditStatement&&!ownerThread.post.capabilities.canManagePublicAccess);

  // 2. Public feed projection.
  const neighborFeed=await neighbor.view({filter:'yardim'});
  const card=neighborFeed.items.find(p=>p.id===R);
  ok('participant feed keeps the public landmark and omits private fields',!!card&&card.publicLocationText==='Çınar Parkı yakını'&&!('phone' in card)&&!('privacy' in card)&&!('text' in card.location)&&card.capabilities.canReadPrivate===false&&card.capabilities.canWriteCoordination===false&&card.capabilities.canWriteCommunity===true);
  ok('participant feed response contains no private strings',leaks(neighborFeed).length===0,leaks(neighborFeed).join(','));

  // 3. Coordination messages.
  const m1=await owner.send({type:'reply.create',targetId:R,payload:{text:PRIVATE_TEXTS[0]+', telefon '+PRIVATE_PHONE,channel:'coordination',visibility:'private',parentId:null}});
  ok('owner writes a private coordination message',m1.ok,code(m1));
  const modThread=(await moderator.thread(R)).thread;
  ok('authorized moderator reads the private message and fields',modThread?.messages.length===1&&modThread.messages[0].id===m1.entityId&&modThread.post.phone===PRIVATE_PHONE&&modThread.post.capabilities.canManagePublicAccess===true&&modThread.post.capabilities.canWriteCoordination===true);
  const m2=await moderator.send({type:'reply.create',targetId:R,payload:{text:PRIVATE_TEXTS[1]+'. Ekip yolda.',channel:'coordination',visibility:'private',parentId:m1.entityId}});
  ok('moderator replies privately to a private parent',m2.ok,code(m2));
  const publicChild=await moderator.send({type:'reply.create',targetId:R,payload:{text:'Herkese açık yanıt denemesi',channel:'coordination',visibility:'public',parentId:m1.entityId}});
  ok('public reply to a private parent is rejected',!publicChild.ok&&publicChild.error.code==='validation',code(publicChild));
  const neighborStream=await neighbor.events();
  const m3=await moderator.send({type:'reply.create',targetId:R,payload:{text:'Battaniye ekibi bölgeye yönlendirildi.',channel:'coordination',visibility:'public',parentId:null}});
  ok('moderator writes a public coordination update',m3.ok,code(m3));
  const publicEvent=await neighborStream.next(1500);
  ok('participant stream announces the public coordination update only',!!publicEvent&&(publicEvent.channels?.[R]||[]).includes('coordination')&&!publicEvent.posts?.length,JSON.stringify(publicEvent));
  const m4=await owner.send({type:'reply.create',targetId:R,payload:{text:'Kapı numarası: '+PRIVATE_ADDRESS,channel:'coordination',visibility:'private',parentId:m3.entityId}});
  ok('owner replies privately to a public update',m4.ok,code(m4));
  const privateEvent=await neighborStream.next(1200);
  ok('participant stream stays silent for a private message',privateEvent===null,JSON.stringify(privateEvent));
  neighborStream.close();

  // 4. Outsider projections of the coordination channel.
  const neighborThread=await neighbor.thread(R);
  ok('participant sees only the public update, with no parents or hidden counts',neighborThread.thread?.messages.length===1&&neighborThread.thread.messages[0].id===m3.entityId&&neighborThread.thread.parents.length===0&&neighborThread.thread.post.replies===1&&neighborThread.thread.earlierCount===0&&neighborThread.thread.newerCount===0);
  ok('participant thread response contains no private strings',leaks(neighborThread).length===0,leaks(neighborThread).join(','));
  const outsiderWrite=await neighbor.send({type:'reply.create',targetId:R,payload:{text:'Ben de yazayım',channel:'coordination',visibility:'public',parentId:null}});
  ok('participant coordination write is rejected',!outsiderWrite.ok&&outsiderWrite.error.code==='unauthorized',code(outsiderWrite));
  const observerThread=await observer.thread(R);
  ok('observer reads the public update only',observerThread.thread?.messages.length===1&&leaks(observerThread).length===0);
  const observerWrite=await observer.send({type:'reply.create',targetId:R,payload:{text:'Gözlemci yazıyor',channel:'community',visibility:'public',parentId:null}});
  ok('observer cannot write in community',!observerWrite.ok&&observerWrite.error.code==='unauthorized',code(observerWrite));

  // 5. Community channel.
  const c1=await neighbor.send({type:'reply.create',targetId:R,payload:{text:'Parkın girişinde su dağıtımı var.',channel:'community',visibility:'public',parentId:null}});
  ok('participant writes a public community message',c1.ok,code(c1));
  const privateCommunity=await neighbor.send({type:'reply.create',targetId:R,payload:{text:'Gizli olsun',channel:'community',visibility:'private',parentId:null}});
  ok('private community message is rejected',!privateCommunity.ok&&privateCommunity.error.code==='validation',code(privateCommunity));
  const offer=await neighbor.send({type:'offer.create',targetId:R,expectedVersion:(await neighbor.thread(R)).thread.post.version,payload:{text:'İki battaniye getirebilirim.'}});
  ok('participant support offer lands in community',offer.ok,code(offer));
  const crossChannel=await owner.send({type:'reply.create',targetId:R,payload:{text:'Kanal dışı yanıt',channel:'coordination',visibility:'private',parentId:c1.entityId}});
  ok('coordination reply to a community parent is rejected',!crossChannel.ok&&crossChannel.error.code==='validation',code(crossChannel));
  const privateParentInCommunity=await owner.send({type:'reply.create',targetId:R,payload:{text:'Özel ebeveyn',channel:'community',visibility:'public',parentId:m1.entityId}});
  ok('community reply to a private coordination parent is rejected',!privateParentInCommunity.ok&&privateParentInCommunity.error.code==='validation',code(privateParentInCommunity));
  const neighborCommunity=(await neighbor.thread(R,'community')).thread;
  ok('community view lists community messages only',neighborCommunity.messages.length===2&&neighborCommunity.messages.every(m=>m.channel==='community')&&leaks(neighborCommunity).length===0);
  const withdrawn=await neighbor.send({type:'offer.withdraw',targetId:offer.entityId,expectedVersion:1,payload:{}});
  const afterWithdraw=(await neighbor.thread(R,'community')).thread;
  ok('withdrawn offer disappears from the thread and counts',withdrawn.ok&&!afterWithdraw.messages.some(m=>m.id===offer.entityId)&&afterWithdraw.post.messageCounts.community===1&&afterWithdraw.post.offers===0,code(withdrawn));
  const ownerCoordination=(await owner.thread(R,'coordination')).thread;
  ok('owner coordination view excludes community messages',ownerCoordination.messages.length===4&&ownerCoordination.messages.every(m=>m.channel==='coordination'));
  const ownerFeed=await owner.view({});
  const updateIds=ownerFeed.updates.map(u=>u.id);
  ok('owner updates carry coordination replies but no community traffic',updateIds.includes(m2.entityId)&&updateIds.includes(m3.entityId)&&!updateIds.includes(c1.entityId)&&!updateIds.includes(offer.entityId));
  const search=await neighbor.view({search:'Gizli Sokak'});
  ok('search does not match the private address',search.total===0);

  // 6. Partial privacy edit.
  let version=(await owner.thread(R)).thread.post.version;
  const stale=await owner.send({type:'request.update',targetId:R,expectedVersion:version-1,payload:{privacy:{address:'public',phone:'private'}}});
  ok('stale version edit is rejected',!stale.ok&&stale.error.code==='conflict',code(stale));
  const opened=await owner.send({type:'request.update',targetId:R,expectedVersion:version,payload:{privacy:{address:'public',phone:'private'}}});
  ok('partial privacy update succeeds',opened.ok,code(opened));
  const afterOpen=(await neighbor.thread(R)).thread.post;
  ok('public address becomes visible and other fields are preserved',afterOpen.location.text===PRIVATE_ADDRESS&&!('phone' in afterOpen)&&afterOpen.people===4&&afterOpen.details.startsWith('Çadırda'));
  version=(await owner.thread(R)).thread.post.version;
  const closedAgain=await owner.send({type:'request.update',targetId:R,expectedVersion:version,payload:{privacy:{address:'private',phone:'private'}}});
  ok('address returns to private',closedAgain.ok&&!('text' in (await neighbor.thread(R)).thread.post.location));

  // 7. Management by role.
  const neighborManage=await neighbor.send({type:'request.manage',targetId:R,expectedVersion:1,payload:{communityOpen:false}});
  ok('participant cannot manage the request',!neighborManage.ok&&neighborManage.error.code==='unauthorized',code(neighborManage));
  const neighborClose=await neighbor.send({type:'request.close',targetId:R,expectedVersion:1,payload:{reason:'other'}});
  ok('participant cannot close another person\'s request',!neighborClose.ok&&neighborClose.error.code==='unauthorized',code(neighborClose));
  const scopedThread=await scoped.thread(R);
  ok('out-of-scope moderator cannot open the request',!!scopedThread.error&&scopedThread.error.code==='not_found',scopedThread.error?.code);
  const scopedManage=await scoped.send({type:'request.manage',targetId:R,expectedVersion:1,payload:{communityOpen:false}});
  ok('out-of-scope moderator cannot manage the request',!scopedManage.ok&&scopedManage.error.code==='unauthorized',code(scopedManage));
  version=(await moderator.thread(R)).thread.post.version;
  const pause=await moderator.send({type:'request.manage',targetId:R,expectedVersion:version,payload:{communityOpen:false,reason:'Yanıltıcı mesajlar'}});
  ok('moderator pauses community writing',pause.ok,code(pause));
  const pausedWrite=await neighbor.send({type:'reply.create',targetId:R,payload:{text:'Yine yazıyorum',channel:'community',visibility:'public',parentId:null}});
  ok('community write is rejected while paused',!pausedWrite.ok&&pausedWrite.error.code==='conflict',code(pausedWrite));
  const stillCoordinating=await owner.send({type:'reply.create',targetId:R,payload:{text:'Hâlâ bekliyoruz.',channel:'coordination',visibility:'private',parentId:null}});
  ok('coordination continues during the community pause',stillCoordinating.ok,code(stillCoordinating));
  version=(await moderator.thread(R)).thread.post.version;
  const restrict=await moderator.send({type:'request.manage',targetId:R,expectedVersion:version,payload:{publicAccess:'restricted'}});
  ok('moderator restricts public access',restrict.ok,code(restrict));
  const hiddenFeed=await neighbor.view({filter:'yardim'});
  const hiddenThread=await neighbor.thread(R);
  ok('restricted request disappears from the participant feed and direct link',!hiddenFeed.items.some(p=>p.id===R)&&hiddenThread.error?.code==='not_found'&&leaks(hiddenFeed).length===0);
  ok('owner and moderator keep access after restriction',!!(await owner.thread(R)).thread&&!!(await moderator.thread(R)).thread);
  version=(await moderator.thread(R)).thread.post.version;
  const close=await moderator.send({type:'request.close',targetId:R,expectedVersion:version,payload:{reason:'resolved'}});
  ok('moderator closes the request with a reason',close.ok,code(close));
  const closedWrite=await owner.send({type:'reply.create',targetId:R,payload:{text:'Kapalıyken mesaj',channel:'coordination',visibility:'private',parentId:null}});
  const closedPost=(await owner.thread(R)).thread.post;
  ok('closed request rejects new messages and reports the reason',!closedWrite.ok&&closedWrite.error.code==='conflict'&&closedPost.status==='closed'&&closedPost.closeReason==='resolved'&&closedPost.capabilities.canWriteCoordination===false&&closedPost.capabilities.canReopen===true);
  const reopen=await owner.send({type:'request.reopen',targetId:R,expectedVersion:closedPost.version,payload:{}});
  const reopened=(await owner.thread(R)).thread.post;
  ok('reopening keeps community paused and access restricted',reopen.ok&&reopened.status==='open'&&reopened.communityOpen===false&&reopened.publicAccess==='restricted'&&reopened.closeReason===null);
  const reopenAgain=await owner.send({type:'request.reopen',targetId:R,expectedVersion:reopened.version,payload:{}});
  ok('reopening an open request is rejected',!reopenAgain.ok&&reopenAgain.error.code==='conflict',code(reopenAgain));
  const emptyManage=await moderator.send({type:'request.manage',targetId:R,expectedVersion:reopened.version,payload:{}});
  ok('management without a setting is rejected',!emptyManage.ok&&emptyManage.error.code==='validation',code(emptyManage));
  version=(await owner.thread(R)).thread.post.version;
  ok('a rejected close or manage leaves the version untouched',version===reopened.version,'version='+version);
  const ownerClose=await owner.send({type:'request.close',targetId:R,expectedVersion:version,payload:{reason:'resolved'}});
  const closedByOwner=(await moderator.thread(R)).thread.post;
  const secondClose=await moderator.send({type:'request.close',targetId:R,expectedVersion:closedByOwner.version,payload:{reason:'duplicate'}});
  const afterSecondClose=(await owner.thread(R)).thread.post;
  ok('a second close cannot rewrite the recorded closure reason',ownerClose.ok&&!secondClose.ok&&secondClose.error.code==='conflict'&&afterSecondClose.closeReason==='resolved',code(secondClose));
  await owner.send({type:'request.reopen',targetId:R,expectedVersion:afterSecondClose.version,payload:{}});

  // 8. Idempotent retry.
  const before=(await owner.thread(R)).thread.messages.length;
  const commandId=randomUUID();
  const first=await owner.send({commandId,type:'reply.create',targetId:R,payload:{text:'Tekrar denenen mesaj',channel:'coordination',visibility:'private',parentId:null}});
  const second=await owner.send({commandId,type:'reply.create',targetId:R,payload:{text:'Tekrar denenen mesaj',channel:'coordination',visibility:'private',parentId:null}});
  const after=(await owner.thread(R)).thread.messages.length;
  ok('retrying with the same command produces one message',first.ok&&second.ok&&first.entityId===second.entityId&&after===before+1);

  // 9. Legacy records keep their public behaviour.
  const legacy=(await neighbor.thread('need-water','community')).thread;
  ok('legacy request without privacy fields stays public and open',!!legacy&&legacy.post.communityOpen===true&&legacy.post.publicAccess==='public'&&'text' in legacy.post.location);

  // 10. Ordinary posts tagged 'yardim' follow the same channel rules; other posts have no coordination channel.
  const passerby=new Client(await operator('/sessions',{runId,name:'Yoldan Geçen'}));
  const call=await neighbor.send({type:'post.create',payload:{text:'Mahallede battaniye lazım, kim getirebilir?',tag:'yardim'}});
  ok('participant creates a plain help call',call.ok,code(call));
  const C=call.entityId;
  const callCard=(await passerby.view({filter:'all'})).items.find(p=>p.id===C);
  ok('help call carries capabilities and readable counts',!!callCard&&callCard.helpCall===true&&callCard.capabilities.canWriteCoordination===false&&callCard.capabilities.canWriteCommunity===true&&callCard.messageCounts.coordination===0);
  const callPrivate=await neighbor.send({type:'reply.create',targetId:C,payload:{text:'Numaram '+PRIVATE_PHONE,channel:'coordination',visibility:'private',parentId:null}});
  ok('help call author writes a private coordination message',callPrivate.ok,code(callPrivate));
  const outsiderOnCall=await passerby.thread(C);
  ok('outsider sees no coordination message on the help call',outsiderOnCall.thread?.messages.length===0&&leaks(outsiderOnCall).length===0,outsiderOnCall.error?JSON.stringify(outsiderOnCall.error):'messages='+outsiderOnCall.thread?.messages.length+' leaks='+leaks(outsiderOnCall).join(','));
  const outsiderCallWrite=await passerby.send({type:'reply.create',targetId:C,payload:{text:'Ben de yazayım',channel:'coordination',visibility:'public',parentId:null}});
  ok('outsider coordination write on a help call is rejected',!outsiderCallWrite.ok&&outsiderCallWrite.error.code==='unauthorized',code(outsiderCallWrite));
  const modOnCall=await moderator.thread(C);
  ok('request moderator reads the help call coordination message',modOnCall.thread?.messages.length===1&&modOnCall.thread.post.messageCounts.coordination===1);
  const plain=await neighbor.send({type:'post.create',payload:{text:'Yol açıldı.',tag:'durum'}});
  const plainCoordination=await neighbor.send({type:'reply.create',targetId:plain.entityId,payload:{text:'Deneme',channel:'coordination',visibility:'private',parentId:null}});
  ok('ordinary posts have no coordination channel',!plainCoordination.ok&&plainCoordination.error.code==='validation',code(plainCoordination));
  // 10a. A public landmark alone makes the location known, without a private address.
  const landmarkOnly=await neighbor.send({type:'request.create',payload:{need:['gida'],people:null,location:{known:true,region:null,text:''},details:'',phone:'',publicLocationText:'Çınar Parkı girişi',privacy:{address:'private',phone:'private'}}});
  ok('a request with only a public landmark is accepted as a known location',landmarkOnly.ok&&(await neighbor.thread(landmarkOnly.entityId)).thread.post.location.known===true,code(landmarkOnly));

  // 10b. Chat messages are capped at 1000 characters with a clear message.
  const tooLong=await neighbor.send({type:'reply.create',targetId:C,payload:{text:'x'.repeat(1001),channel:'community',visibility:'public',parentId:null}});
  ok('messages longer than 1000 characters are rejected',!tooLong.ok&&tooLong.error.code==='validation'&&/1000/.test(tooLong.error.message),code(tooLong));
  const longEnough=await neighbor.send({type:'reply.create',targetId:C,payload:{text:'y'.repeat(1000),channel:'community',visibility:'public',parentId:null}});
  ok('a 1000-character message is accepted',longEnough.ok,code(longEnough));

  // 11. Institutional announcements take no comments; the unverified filter works.
  for(let i=0;i<4;i++)await operator('/control',{runId,action:'tick'});
  const official=(await passerby.view({filter:'resmi'})).items.find(p=>p.verification==='official');
  ok('official announcement is listed without a reply action',!!official&&!official.actions.includes('reply.create'));
  const officialReply=official?await passerby.send({type:'reply.create',targetId:official.id,payload:{text:'Yorum',channel:'community',visibility:'public',parentId:null}}):{ok:false,error:{code:'skipped'}};
  ok('replying to an official announcement is rejected',!officialReply.ok&&officialReply.error.code==='validation',code(officialReply));
  const unverifiedFilter=await passerby.view({filter:'dogrulanmamis'});
  ok('unverified filter lists only unverified posts',unverifiedFilter.items.length>0&&unverifiedFilter.items.every(p=>p.verification==='unverified')&&unverifiedFilter.counts.dogrulanmamis===unverifiedFilter.total);
}catch(error){ok('exercise completed without exceptions',false,error.stack||String(error));}
finally{
  await server.close();
  try{rmSync(dir,{recursive:true,force:true});}catch{/* WAL files may linger briefly on Windows. */}
}
console.log(out.join('\n'));
console.log((out.filter(l=>l.startsWith('FAIL')).length||'0')+' failed of '+out.length);
