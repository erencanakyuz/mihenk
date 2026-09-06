(function(M){
  'use strict';
  var listeners=[], cache=new Map(), currentQuery={}, currentView=null, offlineMessages=[], offlineOffers=[], generation=0;
  function account(a){return Object.assign({},a,{avatar:M.CATALOG.avatar(a.name)});}
  function converted(p){
    var me=currentView.me.id;
    return Object.assign({},p,{uid:p.authorId===me?'me':p.authorId,v:p.verification,t:time(p.updatedAt),
      loc:p.location.text||p.location.region||'Konum henüz belirtilmedi',region:p.location.region||'',
      source:p.source.kind,sourceUrl:p.source.url||'',resolved:p.status==='closed',views:0,
      replies:p.replies||0,reposts:p.reposts||0,likes:p.likes||0});
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
  function offlinePost(id){return (M.state?M.state.extraCrisis:[]).concat(M.SEED.crisis,M.SEED.forYou,M.SEED.following).find(function(p){return p.id===id;});}
  function publicOffline(p){
    var author=M.SEED.byId[p.uid]||M.SEED.me;
    return Object.assign({},p,{authorId:p.uid,author:author,kind:p.need?'request':'post',version:p.version||1,status:p.resolved?'closed':'open',
      source:{kind:p.source||null,url:p.sourceUrl||null},verification:p.v||'unverified',createdAt:p.createdAt||new Date().toISOString(),updatedAt:p.updatedAt||new Date().toISOString(),
      location:p.location||{known:!!p.loc,region:p.region||null,text:p.loc||''}});
  }
  function offlineSend(cmd){
    var p=offlinePost(cmd.targetId), payload=cmd.payload||{}, id=crypto.randomUUID(), version=1;
    if(cmd.type==='request.create'||cmd.type==='request.update') {
      if(!p){p={id:id,uid:'me',tag:'yardim',v:'unverified'};M.state.extraCrisis.unshift(p);}
      Object.assign(p,{need:payload.need,people:payload.people,location:payload.location,region:payload.location.region||'',loc:payload.location.text||payload.location.region||'Konum henüz belirtilmedi',t:'şimdi'});
      p.text=payload.need.map(function(n){return {kurtarma:'Arama kurtarma',saglik:'Sağlık / ilk yardım',barinma:'Barınma ve ısınma',gida:'Gıda ve su',ulasim:'Ulaşım'}[n];}).join(', ')+' ihtiyacı var. '+(p.people===null?'Kişi sayısı bilinmiyor.':p.people+' kişi.');
    } else if(cmd.type==='request.close'||cmd.type==='request.reopen'){p.resolved=cmd.type==='request.close';}
    else if(cmd.type==='reply.create'||cmd.type==='offer.create'){
      var m={id:id,targetId:p.id,text:payload.text,authorId:'me',author:M.SEED.me,version:1,createdAt:new Date().toISOString(),withdrawn:false,kind:cmd.type==='offer.create'?'offer':'reply',canWithdraw:cmd.type==='offer.create'};
      (m.kind==='offer'?offlineOffers:offlineMessages).push(m);p[m.kind==='offer'?'offers':'replies']=(p[m.kind==='offer'?'offers':'replies']||0)+1;
      return {ok:true,entityId:id,entityVersion:1};
    } else if(cmd.type==='offer.withdraw'){var offer=offlineOffers.find(function(x){return x.id===cmd.targetId;});offer.withdrawn=true;offer.canWithdraw=false;return {ok:true,entityId:offer.id,entityVersion:++offer.version};}
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
      if(join){history.replaceState(null,'',location.pathname);await request('/api/session/redeem',{method:'POST',body:JSON.stringify({joinCode:join})});}
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
    ready:function(){return ready;},query:function(){return Object.assign({},currentQuery);},
    getView:async function(query){
      if(!M.shared){var p=query&&query.thread?offlinePost(query.thread):null;return {thread:p?{post:publicOffline(p),messages:offlineMessages.concat(offlineOffers).filter(function(m){return m.targetId===p.id;}),earlierCount:0}:null};}
      query=Object.assign({},currentQuery,query||{});
      if(!query.thread)currentQuery=Object.assign({},query);
      var serial=++generation;
      var view=await request('/api/view?'+new URLSearchParams(query));
      if(serial===generation)hydrate(view);
      return view;
    },
    send:async function(command){
      command.commandId=command.commandId||crypto.randomUUID();
      if(!M.shared)return offlineSend(command);
      try{
        var result=await request('/api/commands',{method:'POST',body:JSON.stringify(command)});
        try{await M.transport.getView();listeners.forEach(function(fn){fn();});}catch(_){/* The stored receipt remains successful if refreshing fails. */}
        return result;
      }catch(error){return error.detail||{ok:false,error:{code:'unavailable',message:'Gönderim doğrulanamadı. Bilgileriniz korundu; yeniden deneyin.',retryable:true}};}
    },
    subscribe:function(fn){listeners.push(fn);return function(){listeners=listeners.filter(function(f){return f!==fn;});};},
    watch:function(){
      if(!M.shared)return function(){};
      var stream=new EventSource('/api/events');
      stream.addEventListener('ready',function(){listeners.forEach(function(fn){fn('reconnect');});});
      stream.addEventListener('changed',function(){listeners.forEach(function(fn){fn('changed');});});
      stream.onerror=function(){if(M.connectionStatus)M.connectionStatus(false);};
      stream.onopen=function(){if(M.connectionStatus)M.connectionStatus(true);};
      return function(){stream.close();};
    }
  };
})(window.MIHENK=window.MIHENK||{});
