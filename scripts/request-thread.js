(function(M){
  'use strict';
  var esc=M.CATALOG.esc, activeThread=null;
  function key(id){return 'mihenk:reply:'+(M.sharedView?M.sharedView.runId+':'+M.actorId:'offline')+':'+id;}
  function read(id){try{return JSON.parse(localStorage.getItem(key(id)))||{text:'',kind:'reply'};}catch(_){return {text:'',kind:'reply'};}}
  function save(id,value){try{localStorage.setItem(key(id),JSON.stringify(value));}catch(_){}}
  M.cardActions=function(p){
    var id=p.originalId||p.id;
    return '<div class="request-actions"><button type="button" data-thread="'+esc(id)+'">'+M.icon('reply','ic--sm')+'<span>Yanıtlar'+(p.replies?' · '+p.replies:'')+'</span></button>'+
      (p.need&&p.uid!=='me'&&!p.resolved?'<button class="offer-action" type="button" data-offer="'+esc(id)+'">'+M.icon('people','ic--sm')+'Destek öner</button>':'')+
      (M.shared?'<button type="button" data-react="'+esc(id)+'" aria-label="Beğen" aria-pressed="'+!!p.liked+'">'+M.icon('heart','ic--sm')+'<span>'+p.likes+'</span></button><button type="button" data-repost="'+esc(id)+'" aria-label="Yeniden paylaş" '+(p.reposted?'disabled':'')+'>'+M.icon('repost','ic--sm')+'</button>':'')+
      '<button class="report-action" type="button" data-report="'+esc(id)+'" aria-label="Gönderiyi bildir">'+M.icon('flag','ic--sm')+'</button></div>';
  };
  M.openThread=async function(id,offer){
    try{
      var view=await M.transport.getView({thread:id}), thread=view.thread;
      if(!thread)return;
      var p=thread.post, draft=read(id), mine=p.authorId===(M.actorId||'me');
      if(offer&&!draft.pending)draft.kind='offer';
      if(p.status==='closed')draft.kind='reply';
      var node=M.el('<div class="modal thread-dialog"><div class="thread-top"><h2 class="modal__h" id="thread-title">'+(p.kind==='request'?'Talebin yanıtları':'Gönderinin yanıtları')+'</h2><button type="button" data-thread-close aria-label="Yanıtları kapat">'+M.icon('close')+'</button></div>'+
        '<div class="thread-original"><b>'+esc(p.author.name)+'</b><p>'+esc(p.text)+'</p><p class="thread-location">'+M.icon('pin','ic--sm')+esc(p.location.text||p.location.region||'Konum henüz belirtilmedi')+'</p>'+
        (p.kind==='request'?'<strong class="thread-status" data-closed="'+(p.status==='closed')+'">'+(p.status==='closed'?'Talep kapalı · Sahibi ihtiyacın karşılandığını belirtti':'Talep açık')+'</strong>':'')+
        '<p class="thread-time">Son güncelleme: '+esc(new Date(p.updatedAt).toLocaleString('tr-TR'))+'</p>'+
        (M.shared&&!mine?'<button class="btn btn--ghost" data-follow-account="'+esc(p.authorId)+'">'+(p.following?'Takibi bırak':'Takip et')+'</button>':'')+'</div>'+
        '<button type="button" class="new-updates" id="thread-refresh" hidden>Yeni durum veya yanıt var · Güncelle</button>'+
        '<div class="thread-messages" aria-label="Yanıtlar">'+(thread.earlierCount?'<p class="thread-time">Son 100 yanıt gösteriliyor.</p>':'')+
        (thread.messages.length?thread.messages.map(function(m){return '<article class="thread-message" data-message-id="'+esc(m.id)+'"><div><b>'+esc(m.author.name)+'</b><span>'+esc(new Date(m.createdAt).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}))+'</span></div>'+
          (m.kind==='offer'?'<strong class="offer-label">'+(m.withdrawn?'Geri çekilmiş destek önerisi':'Destek önerisi')+'</strong>':'')+'<p>'+esc(m.text)+'</p>'+
          (m.canWithdraw?'<button type="button" class="text-action" data-withdraw="'+esc(m.id)+'" data-version="'+m.version+'">Önerimi geri çek</button>':'')+'</article>';}).join(''):'<p class="thread-empty">Henüz yanıt yok. Bildiklerinizi paylaşabilir veya bir ayrıntıyı sorabilirsiniz.</p>')+'</div>'+
        '<form class="thread-form"><label for="thread-kind">İşlem<select id="thread-kind"><option value="reply">Yanıt yaz</option>'+
        (p.kind==='request'&&!mine&&p.status==='open'?'<option value="offer">Destek öner</option>':'')+'</select></label>'+
        '<label for="thread-text">Mesajınız<textarea id="thread-text" rows="3" maxlength="1000" placeholder="Kısa ve açık bir mesaj yazın."></textarea></label>'+
        '<p class="field-hint">Yanıtınız bu gönderiyi gören herkese görünür. Telefon veya özel adres paylaşmayın.</p>'+
        '<p id="thread-error" class="compose-error" role="alert" hidden></p><button class="btn" id="thread-send" type="submit">Yanıtı gönder</button></form></div>');
      M.openModal(node,{labelledBy:'thread-title'});activeThread={id:id,version:p.version,node:node};
      var input=node.querySelector('#thread-text'),kind=node.querySelector('#thread-kind'),button=node.querySelector('#thread-send');
      input.value=draft.text;kind.value=draft.kind;if(!kind.value)kind.value='reply';
      function persist(){draft.text=input.value;draft.kind=kind.value;save(id,draft);}
      function label(){button.textContent=draft.pending?'Gönderimi yeniden dene':kind.value==='offer'?'Destek önerisini gönder':'Yanıtı gönder';}
      function lock(on){input.readOnly=on;kind.disabled=on;}
      label();lock(!!draft.pending);
      input.addEventListener('input',persist);kind.addEventListener('change',function(){persist();label();});
      node.querySelector('[data-thread-close]').onclick=function(){persist();activeThread=null;M.closeModal();};
      node.querySelector('#thread-refresh').onclick=function(){persist();M.openThread(id);};
      node.addEventListener('click',async function(e){
        var withdraw=e.target.closest('[data-withdraw]');
        if(withdraw){withdraw.disabled=true;var r=await M.transport.send({type:'offer.withdraw',targetId:withdraw.dataset.withdraw,expectedVersion:Number(withdraw.dataset.version),payload:{}});if(r.ok)M.openThread(id);else{withdraw.disabled=false;M.toast(r.error.message);}}
        var follow=e.target.closest('[data-follow-account]');
        if(follow){follow.disabled=true;var r2=await M.transport.send({type:'account.follow',targetId:p.authorId,payload:{active:!p.following}});if(r2.ok)M.openThread(id);else{follow.disabled=false;M.toast(r2.error.message);}}
      });
      node.querySelector('form').onsubmit=async function(e){
        e.preventDefault();if(button.disabled)return;
        var error=node.querySelector('#thread-error');
        if(!input.value.trim()){error.hidden=false;error.textContent='Bir mesaj yazın.';input.focus();return;}
        draft.pending=draft.pending||{commandId:crypto.randomUUID(),type:kind.value==='offer'?'offer.create':'reply.create',targetId:p.id,expectedVersion:p.version,payload:{text:input.value.trim()}};
        persist();lock(true);button.disabled=true;button.textContent='Gönderiliyor…';
        var result=await M.transport.send(draft.pending);
        if(result.ok){save(id,{text:'',kind:'reply'});if(node.isConnected)M.openThread(id);return;}
        error.hidden=false;error.textContent=result.error.message;button.disabled=false;
        if((result.error.code!=='unavailable'||result.error.retryable===false)){delete draft.pending;lock(false);save(id,draft);}
        if(result.error.code==='conflict')node.querySelector('#thread-refresh').hidden=false;
        label();
      };
      if(M.sharedView)try{localStorage.setItem('mihenk:read:'+M.sharedView.runId+':'+M.actorId+':'+id,new Date().toISOString());}catch(_){}
      if(M.renderOwnUpdates)M.renderOwnUpdates();
    }catch(error){M.toast(error.message||'Yanıtlar açılamadı. Yeniden deneyin.');}
  };
  M.threadChanged=function(){if(activeThread&&activeThread.node.isConnected)activeThread.node.querySelector('#thread-refresh').hidden=false;};
  M.openReport=function(id,shownVersion){
    var node=M.el('<div class="modal report-dialog"><h2 class="modal__h" id="report-title">Gönderiyi bildir</h2><p class="modal__p">Bu gönderideki sorun nedir?</p><form>'+
      '<fieldset class="report-reasons"><legend class="sr-only">Bildirim nedeni</legend>'+
      [['inaccurate','Yanlış veya güncelliğini yitirmiş bilgi'],['abuse','Spam veya kötüye kullanım'],['privacy','Kişisel bilgilerin paylaşılması'],['other','Başka bir sorun']].map(function(r){return '<label><input type="radio" name="reason" value="'+r[0]+'"><span>'+r[1]+'</span></label>';}).join('')+'</fieldset>'+
      '<label class="field"><span class="field__l">Ek açıklama (isteğe bağlı)</span><textarea name="details" rows="3" maxlength="1000"></textarea></label>'+
      '<p class="compose-error" role="alert" hidden></p><div class="modal__actions"><button class="btn btn--ghost" type="button" data-cancel-report>Vazgeç</button><button class="btn" type="submit">Bildirimi gönder</button></div></form></div>');
    M.openModal(node,{labelledBy:'report-title'});
    node.querySelector('[data-cancel-report]').onclick=function(){M.closeModal();};
    var reportKey=key(id)+':report',saved={};try{saved=JSON.parse(localStorage.getItem(reportKey))||{};}catch(_){}
    var pending=saved.pending||null;
    function remember(){var reason=node.querySelector('input:checked');try{localStorage.setItem(reportKey,JSON.stringify({reason:reason?.value,details:node.querySelector('textarea').value,pending:pending}));}catch(_){}}
    function lock(on){node.querySelectorAll('input').forEach(function(input){input.disabled=on;});node.querySelector('textarea').readOnly=on;}
    if(saved.reason){var selected=node.querySelector('input[value="'+saved.reason+'"]');if(selected)selected.checked=true;}node.querySelector('textarea').value=saved.details||'';
    lock(!!pending);if(pending)node.querySelector('[type="submit"]').textContent='Gönderimi yeniden dene';
    node.addEventListener('input',remember);node.addEventListener('change',remember);
    node.querySelector('form').onsubmit=async function(e){
      e.preventDefault();var selected=node.querySelector('input:checked'),error=node.querySelector('[role="alert"]'),button=node.querySelector('[type="submit"]');
      if(button.disabled)return;
      if(!selected){error.hidden=false;error.textContent='Bir bildirim nedeni seçin.';return;}
      pending=pending||{commandId:crypto.randomUUID(),type:'report.create',targetId:id,expectedVersion:shownVersion||M.rawPost(id)?.version,payload:{reason:selected.value,details:node.querySelector('textarea').value}};
      remember();lock(true);button.disabled=true;var result=await M.transport.send(pending);
      if(result.ok){try{localStorage.removeItem(reportKey);}catch(_){}node.innerHTML='<h2 class="modal__h" id="report-title">Bildiriminiz alındı</h2><p class="modal__p">'+(M.shared?'Bildiriminiz inceleme için kaydedildi.':'Bildiriminiz bu cihazda kaydedildi.')+' Bu işlem gönderinin doğruluk durumunu otomatik değiştirmez.</p><button class="btn" type="button" data-report-done>Kapat</button>';node.querySelector('[data-report-done]').onclick=function(){M.closeModal();};return;}
      error.hidden=false;error.textContent=result.error.message;button.disabled=false;if((result.error.code!=='unavailable'||result.error.retryable===false)){pending=null;lock(false);}remember();button.textContent=pending?'Gönderimi yeniden dene':'Bildirimi gönder';
      if(result.error.code==='conflict'){button.disabled=true;var review=M.el('<button class="btn btn--ghost" type="button">Güncel gönderiyi aç</button>');error.after(review);review.onclick=function(){M.openThread(id);};}
    };
  };
  document.addEventListener('click',async function(e){
    var thread=e.target.closest('[data-thread]'),offer=e.target.closest('[data-offer]'),report=e.target.closest('[data-report]'),react=e.target.closest('[data-react]'),repost=e.target.closest('[data-repost]');
    if(thread){M.openThread(thread.dataset.thread);return;}if(offer){M.openThread(offer.dataset.offer,true);return;}if(report){M.openReport(report.dataset.report,Number(report.closest('[data-version]')?.dataset.version)||undefined);return;}
    var control=react||repost;if(!control)return;
    control.disabled=true;var id=react?react.dataset.react:repost.dataset.repost,p=M.rawPost(id);
    var result=await M.transport.send({type:react?'post.react':'post.repost',targetId:id,payload:react?{active:!p.liked}:{}});
    if(!result.ok){control.disabled=false;M.toast(result.error.message);}else if(M.refreshShared)M.refreshShared(true);
  });
})(window.MIHENK=window.MIHENK||{});
