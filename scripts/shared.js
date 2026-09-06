(function(M){
  'use strict';
  if(!M.shared)return;
  var timer=null, refreshId=0, searchTimer=null;
  M.connectionStatus=function(online){var bar=M.$('#connection-status');if(bar){bar.hidden=online;bar.textContent='Bağlantı kesildi. Son alınan bilgiler gösteriliyor; taslaklarınız korunuyor.';}};
  function query(){var crisis=M.state.tab==='crisis';return {filter:M.state.tab==='following'?'following':crisis?M.state.filter:'all',region:crisis?(M.$('#crisis-region')?.value||''):'',topic:crisis?(M.$('#crisis-topic')?.value||''):'',search:M.$('#feed-search-input')?.value||'',offset:0};}
  function redraw(){
    if(M.state.tab==='crisis')M.renderCrisisList();
    else {var host=M.panel(M.state.tab).querySelector('.feed__list');if(host)host.innerHTML=M.SEED.forYou.map(M.postHTML).join('');}
    var more=M.$('#shared-more');if(more)more.hidden=M.sharedView.nextOffset===null;
    var end=M.$('#panel-crisis .feed__end');if(end)end.hidden=M.sharedView.nextOffset!==null;
    M.renderOwnUpdates();M.refreshTrustCard();
  }
  M.refreshShared=async function(force){
    var serial=++refreshId;
    try{await M.transport.getView(query());if(serial!==refreshId)return;M.connectionStatus(true);
      if(force||window.scrollY<100){redraw();}else{
        var old=M.$('#shared-update');if(!old){var button=M.el('<button type="button" id="shared-update" class="new-updates">Yeni bilgiler var · Akışı güncelle</button>');M.$('#feeds').before(button);button.onclick=function(){button.remove();redraw();};}
      }
    }catch(error){M.connectionStatus(false);}
  };
  M.renderOwnUpdates=function(){
    var list=M.$('#own-updates-list'),button=M.$('#own-updates-button');if(!list)return;
    var updates=M.sharedView.updates.filter(function(u){try{return u.at>(localStorage.getItem('mihenk:read:'+M.sharedView.runId+':'+M.actorId+':'+u.targetId)||'');}catch(_){return true;}});
    button.textContent='Yanıtlarınız'+(updates.length?' · '+updates.length:'');
    list.innerHTML=updates.length?updates.map(function(u){return '<button type="button" data-thread="'+M.CATALOG.esc(u.targetId)+'"><b>'+M.CATALOG.esc(u.author.name)+'</b><span>'+M.CATALOG.esc(u.text)+'</span></button>';}).join(''):'<p>Yeni yanıtınız yok.</p>';
  };
  M.initShared=function(){
    var screen=M.$('#connection-screen');if(screen)screen.remove();
    var bar=M.el('<p class="connection-status" id="connection-status" role="status" hidden></p>');M.$('#topbar').after(bar);
    var updates=M.el('<details class="own-updates"><summary id="own-updates-button">Yanıtlarınız</summary><div id="own-updates-list"></div></details>');bar.after(updates);
    var more=M.el('<button class="btn btn--ghost shared-more" id="shared-more" type="button">Daha fazla göster</button>');M.$('#feeds').after(more);
    more.onclick=async function(){
      if(more.disabled||M.sharedView.nextOffset===null)return;
      more.disabled=true;
      var previous=M.SEED.crisis.slice(),next=M.sharedView.nextOffset;
      try{
        await M.transport.getView(Object.assign(query(),{offset:next}));
        var additions=M.SEED.crisis.slice();
        M.SEED.crisis=previous.concat(additions);M.SEED.forYou=M.SEED.crisis;
        var list=M.state.tab==='crisis'?M.$('#clist'):M.panel(M.state.tab).querySelector('.feed__list');
        list.insertAdjacentHTML('beforeend',additions.map(M.state.tab==='crisis'?M.crisisPostHTML:M.postHTML).join(''));
        more.hidden=M.sharedView.nextOffset===null;
      }catch(_){M.toast('Daha fazla gönderi alınamadı. Yeniden deneyin.');}
      finally{more.disabled=false;}
    };
    M.on('tab',function(){M.refreshShared(true);});
    document.addEventListener('input',function(e){if(e.target.matches('[data-search-input]')&&M.transport.query().search!==e.target.value){clearTimeout(searchTimer);searchTimer=setTimeout(function(){M.refreshShared(true);},240);}});
    var draftKey='mihenk:compose:'+M.sharedView.runId+':'+M.actorId;
    M.lockCompose=function(on){M.$('#cta').readOnly=on;M.$$('#ccomposer select, #ccomposer input, #ctagsel button').forEach(function(control){control.disabled=on;});};
    M.saveComposeDraft=function(){
      var ta=M.$('#cta');if(!ta)return;
      var picked=M.$('#ctagsel [aria-pressed="true"]');
      try{localStorage.setItem(draftKey,JSON.stringify({text:ta.value,region:M.$('#post-region').value,source:M.$('#post-source').value,url:M.$('#post-link').value,tag:picked?picked.dataset.tag:null,pending:M.crisisPending||null}));}catch(_){}
    };
    try{var saved=JSON.parse(localStorage.getItem(draftKey));if(saved&&saved.text){
      M.$('#cta').value=saved.text;M.$('#post-region').value=saved.region||'';M.$('#post-source').value=saved.source||'';M.$('#post-link').value=saved.url||'';M.$('#post-link-field').hidden=saved.source!=='link';
      M.crisisPending=saved.pending||null;M.$('#cpostbtn').disabled=false;M.$('#compose-count').textContent=saved.text.length+' / 1000';M.lockCompose(!!M.crisisPending);if(M.crisisPending)M.$('#cpostbtn').textContent='Gönderimi yeniden dene';
      if(saved.tag){var tag=M.$('#ctagsel [data-tag="'+saved.tag+'"]');if(tag)tag.setAttribute('aria-pressed','true');}
    }}catch(_){}
    ['input','change','click'].forEach(function(event){M.$('#ccomposer').addEventListener(event,M.saveComposeDraft);});
    M.transport.subscribe(function(reason){
      if(reason){M.threadChanged();clearTimeout(timer);timer=setTimeout(function(){M.refreshShared(false);},180);}
      else redraw();
    });
    M.transport.watch();
    M.renderOwnUpdates();more.hidden=M.sharedView.nextOffset===null;
    var stop=function(){if(document.hidden)return;M.refreshShared(false);};
    document.addEventListener('visibilitychange',stop);
    var thread=new URLSearchParams(location.hash.slice(1)).get('post');if(thread)M.openThread(thread);
  };
})(window.MIHENK=window.MIHENK||{});
