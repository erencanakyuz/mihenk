(function(M){
  'use strict';
  var listeners=[], cache=new Map(), currentQuery={}, currentView=null, offlineMessages=[], offlineOffers=[], generation=0;
  function account(a){return Object.assign({},a,{avatar:M.CATALOG.avatar(a.name)});}
  function converted(p){
    var me=currentView.me.id;
    return Object.assign({},p,{uid:p.authorId===me?'me':p.authorId,v:p.verification,t:time(p.updatedAt),
      loc:p.publicLocationText||p.location.region||p.location.text||'Konum henüz belirtilmedi',region:p.location.region||'',
      source:p.source.kind,sourceUrl:p.source.url||'',resolved:p.status==='closed',views:0,
      replies:p.replies||0,reposts:p.reposts||0,likes:p.likes||0,help:p.kind==='request'||(p.tag==='yardim'&&p.verification!=='official'),updates:(p.messageCounts&&p.messageCounts.coordination)||0,support:(p.messageCounts&&p.messageCounts.community)||0});
  }
  function time(at){var date=new Date(at);return date.toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'});}
  function hydrate(view){
    if(currentView&&currentView.accessRevision!==view.accessRevision){cache.clear();M.SEED.byId={};}
    currentView=view;M.sharedView=view;M.actorId=view.me.id;M.moderationOnly=view.controlMode==='moderation';
    var S=M.SEED;S.me=account(Object.assign({},view.me,{id:'me'}));S.byId.me=S.me;
    var posts=view.items.concat(view.relatedPosts||[],view.thread?[view.thread.post]:[]);
    posts.forEach(function(p){
      S.byId[p.authorId===view.me.id?'me':p.authorId]=account(p.author);
      cache.set(p.id,p);if(p.originalId)cache.set(p.originalId,Object.assign({},p,{id:p.originalId,originalId:null}));
    });
    while(cache.size>5000)cache.delete(cache.keys().next().value);
    S.crisis=view.items.map(converted);S.forYou=S.crisis;S.following=S.crisis.filter(function(p){return p.following;});
    S.users=Object.values(S.byId).filter(function(a){return a.id!=='me';});
    if(M.state){M.state.extraCrisis=[];view.items.forEach(function(p){M.state.likes[p.id]=p.liked;M.state.reposts[p.id]=p.reposted;M.state.corroborations[p.id]=p.observed;});}
    return view;
  }
  async function request(route,options){
    var response=await fetch(route,Object.assign({credentials:'same-origin',headers:{'Content-Type':'application/json'}},options));
    var value=await response.json();
    if(!response.ok){var error=new Error(value.error?value.error.message:'Bağlantı kurulamadı.');error.code=value.error?value.error.code:'unavailable';error.detail=value;throw error;}
    return value;
  }
  var localLoaded=false,localReceipts={};
  function loadLocal(){
    if(localLoaded||!M.state)return;localLoaded=true;
    try{var saved=JSON.parse(sessionStorage.getItem('mihenk:requests:v1'));if(saved){M.state.extraCrisis=saved.posts||[];offlineMessages=saved.messages||[];offlineOffers=saved.offers||[];localReceipts=saved.receipts||{};}}catch(_){}
    // Seed posts are rebuilt on every load, so their counters are restored from the saved messages.
    offlineMessages.concat(offlineOffers).forEach(function(m){var p=offlinePost(m.targetId);if(!p||M.state.extraCrisis.indexOf(p)>=0)return;if(m.kind==='offer'){if(!m.withdrawn)p.offers=(p.offers||0)+1;}else p.replies=(p.replies||0)+1;if(m.channel==='coordination')p.updates=(p.updates||0)+1;else if(m.kind!=='offer'||!m.withdrawn)p.support=(p.support||0)+1;});
  }
  function persistLocal(){try{sessionStorage.setItem('mihenk:requests:v1',JSON.stringify({posts:M.state.extraCrisis,messages:offlineMessages,offers:offlineOffers,receipts:localReceipts}));}catch(_){}}
  function offlinePost(id){loadLocal();return (M.state?M.state.extraCrisis:[]).concat(M.SEED.crisis,M.SEED.forYou,M.SEED.following).find(function(p){return p.id===id;});}
  function publicOffline(p){
    if(!p)return null;
    var author=M.SEED.byId[p.uid]||M.SEED.me;
    return Object.assign({},p,{authorId:p.uid,author:author,kind:p.need?'request':'post',version:p.version||1,status:p.resolved?'closed':'open',
      source:{kind:p.source||null,url:p.sourceUrl||null},verification:p.v||'unverified',createdAt:p.createdAt||new Date().toISOString(),updatedAt:p.updatedAt||new Date().toISOString(),
      location:p.location||{known:!!p.loc,region:p.region||null,text:p.loc||''},
      helpCall:!p.need&&p.tag==='yardim'&&p.v!=='official',messageCounts:{coordination:p.updates||0,community:p.support||0},capabilities:{canReadPrivate:p.uid==='me',canEditStatement:p.uid==='me'&&!!p.need,canWriteCoordination:p.uid==='me'&&(!!p.need||p.tag==='yardim')&&!p.resolved,canWriteCommunity:!p.resolved&&p.communityOpen!==false&&!(!p.need&&p.v==='official'),canManagePublicAccess:false,canClose:p.uid==='me'&&!!p.need&&!p.resolved,canReopen:p.uid==='me'&&!!p.need&&!!p.resolved}});
  }
  function offlineSend(cmd){
    var p=offlinePost(cmd.targetId), payload=cmd.payload||{}, id=crypto.randomUUID(), version=1;
    if(cmd.type==='request.create'||cmd.type==='request.update') {
      if(!p){p={id:id,uid:'me',tag:'yardim',v:'unverified'};M.state.extraCrisis.unshift(p);}
      ['need','people','location','details','phone','privacy','publicLocationText'].forEach(function(name){if(name in payload)p[name]=payload[name];});
      // A partial update keeps the fields it omits; a seed post may carry no location object at all.
      if(!p.location)p.location={known:!!p.loc,region:p.region||null,text:''};
      if(!Array.isArray(p.need)||!p.need.length)return {ok:false,error:{code:'validation',message:'En az bir ihtiyaç seçin.',field:'need'}};
      p.region=p.location.region||'';p.loc=p.publicLocationText||p.region||p.location.text||'Konum henüz belirtilmedi';p.t='şimdi';
      p.text=p.need.map(function(n){return {kurtarma:'Arama kurtarma',saglik:'Sağlık / ilk yardım',barinma:'Barınma ve ısınma',gida:'Gıda ve su',ulasim:'Ulaşım'}[n];}).join(', ')+' ihtiyacı var. '+(p.people===null?'Kişi sayısı bilinmiyor.':p.people+' kişi.');
    } else if(cmd.type==='request.close'||cmd.type==='request.reopen'){
      if(!p)return {ok:false,error:{code:'not_found',message:'Talep bulunamadı.'}};
      if(p.resolved===(cmd.type==='request.close'))return {ok:false,error:{code:'conflict',message:p.resolved?'Bu talep zaten kapalı.':'Bu talep zaten açık.'}};
      p.resolved=cmd.type==='request.close';p.closeReason=p.resolved?(payload.reason||'other'):null;}
    else if(cmd.type==='reply.create'||cmd.type==='offer.create'){
      if(!p||p.resolved)return {ok:false,error:{code:'conflict',message:'Bu talep kapalı.'}};if(!p.need&&p.v==='official')return {ok:false,error:{code:'validation',message:'Kurumsal duyurulara yorum yazılamaz.'}};
      if(payload.channel==='coordination'&&p.uid!=='me')return {ok:false,error:{code:'unauthorized',message:'Bu alana yalnızca talep sahibi ve moderatörler yazabilir.'}};
      // Community messages are public on the server, so the local adapter cannot store a private one.
      var m={channel:payload.channel||'community',visibility:(payload.channel==='coordination'?payload.visibility:'public')||'public',parentId:payload.parentId||null,id:id,targetId:p.id,text:payload.text,authorId:'me',author:M.SEED.me,version:1,createdAt:new Date().toISOString(),withdrawn:false,kind:cmd.type==='offer.create'?'offer':'reply',canWithdraw:cmd.type==='offer.create'};
      (m.kind==='offer'?offlineOffers:offlineMessages).push(m);p[m.kind==='offer'?'offers':'replies']=(p[m.kind==='offer'?'offers':'replies']||0)+1;if(m.channel==='coordination')p.updates=(p.updates||0)+1;else p.support=(p.support||0)+1;
      return {ok:true,entityId:id,entityVersion:1};
    } else if(cmd.type==='offer.withdraw'){var offer=offlineOffers.find(function(x){return x.id===cmd.targetId;});
      if(!offer)return {ok:false,error:{code:'not_found',message:'Destek önerisi bulunamadı.'}};
      offer.withdrawn=true;offer.canWithdraw=false;var host=offlinePost(offer.targetId);if(host){host.offers=Math.max(0,(host.offers||0)-1);host.support=Math.max(0,(host.support||0)-1);}return {ok:true,entityId:offer.id,entityVersion:++offer.version};}
    else if(cmd.type==='report.create'){
      try { var reports=JSON.parse(localStorage.getItem('mihenk:offline-reports')||'[]');reports.push({id:id,targetId:p.id,reason:payload.reason,details:payload.details,at:new Date().toISOString()});localStorage.setItem('mihenk:offline-reports',JSON.stringify(reports)); }
      catch(_){return {ok:false,error:{code:'unavailable',message:'Bildirim bu cihazda kaydedilemedi. Yeniden deneyin.'}};}
      return {ok:true,entityId:id,entityVersion:1};
    }
    else return {ok:false,error:{code:'unavailable',message:'Bu işlem burada kullanılamıyor.'}};
    p.version=(p.version||0)+1;p.updatedAt=new Date().toISOString();return {ok:true,entityId:p.id,entityVersion:p.version};
  }
  var ready=Promise.resolve();
  if(M.shared){
    ready=(async function(){
      var join=new URLSearchParams(location.hash.slice(1)).get('join');
      if(join){history.replaceState(null,'',location.pathname+location.search);await request('/api/session/redeem',{method:'POST',body:JSON.stringify({joinCode:join})});}
      return hydrate(await request('/api/view'));
    })();
    ready.catch(function(error){
      function show(){var host=document.getElementById('connection-screen');if(host){host.innerHTML='<h1>MİHENK</h1><p>'+M.CATALOG.esc(error.message)+'</p><button type="button" id="retry-connect">Yeniden dene</button>';document.getElementById('retry-connect').onclick=function(){location.reload();};}}
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show);else show();
    });
  }
  M.getPost=function(id){return M.shared?(cache.has(id)?converted(cache.get(id)):null):offlinePost(id);};
  M.rawPost=function(id){return M.shared?cache.get(id):publicOffline(offlinePost(id));};
  M.transport={
    initLocal:loadLocal,
    getRequestView:async function(id,channel,offset){
      if(!M.shared)return M.transport.getView({thread:id,channel:channel,messageOffset:offset||0});
      var view=await request('/api/view?'+new URLSearchParams({thread:id,channel:channel||'coordination',messageOffset:offset||0,messageLimit:40,context:'page',relatedLimit:0,limit:1}));
      if(currentView&&currentView.accessRevision!==view.accessRevision)cache.clear();
      if(view.thread)cache.set(view.thread.post.id,view.thread.post);
      return view;
    },
    clearRequestCache:function(){cache.clear();},
    ready:function(){return ready;},query:function(){return Object.assign({},currentQuery);},
    getView:async function(query){
      if(!M.shared){
        var p=query&&query.thread?offlinePost(query.thread):null,channel=query?.channel||'community';
        // Same help test as the server: an official announcement has no channels.
        var help=!!p&&(!!p.need||(p.tag==='yardim'&&p.v!=='official'));
        var messages=offlineMessages.concat(offlineOffers.filter(function(o){return !o.withdrawn;})).filter(function(m){return p&&m.targetId===p.id&&(!help||(m.channel||'community')===channel)&&(m.visibility!=='private'||p.uid==='me');});
        var end=Math.max(0,messages.length-(query?.messageOffset||0)),start=Math.max(0,end-40);
        var slice=messages.slice(start,end),shown={};slice.forEach(function(m){shown[m.id]=1;});
        return {me:{id:'me'},thread:p?{post:publicOffline(p),channel:channel,messages:slice,parents:messages.filter(function(m){return !shown[m.id]&&slice.some(function(c){return c.parentId===m.id;});}),earlierCount:start,newerCount:messages.length-end,nextMessageOffset:start?(query?.messageOffset||0)+40:null}:null};
      }
      query=Object.assign({},currentQuery,query||{});
      if(!query.thread)currentQuery=Object.assign({},query);
      var serial=++generation;
      var view=await request('/api/view?'+new URLSearchParams(query));
      if(serial===generation)hydrate(view);
      return view;
    },
    send:async function(command){
      command.commandId=command.commandId||crypto.randomUUID();
      if(!M.shared){loadLocal();if(localReceipts[command.commandId])return localReceipts[command.commandId];var result=offlineSend(command);if(result.ok){localReceipts[command.commandId]=result;persistLocal();}return result;}
      try{
        var result=await request('/api/commands',{method:'POST',body:JSON.stringify(command)});
        try{if(!M.requestPageActive)await M.transport.getView();listeners.forEach(function(fn){fn();});}catch(_){/* The stored receipt remains successful if refreshing fails. */}
        return result;
      }catch(error){return error.detail||{ok:false,error:{code:'unavailable',message:'Gönderim doğrulanamadı. Bilgileriniz korundu; yeniden deneyin.',retryable:true}};}
    },
    subscribe:function(fn){listeners.push(fn);return function(){listeners=listeners.filter(function(f){return f!==fn;});};},
    watch:function(){
      if(!M.shared)return function(){};
      var stream=new EventSource('/api/events');
      stream.addEventListener('ready',function(){listeners.forEach(function(fn){fn('reconnect');});});
      stream.addEventListener('changed',function(event){var change={};try{change=JSON.parse(event.data);}catch(_){}listeners.forEach(function(fn){fn('changed',change);});});
      stream.onerror=function(){if(M.connectionStatus)M.connectionStatus(false);};
      stream.onopen=function(){if(M.connectionStatus)M.connectionStatus(true);};
      return function(){stream.close();};
    }
  };
})(window.MIHENK=window.MIHENK||{});
