(function(M){
  'use strict';
  var page=null,serial=0,esc=M.CATALOG.esc;
  var needs={kurtarma:'Arama kurtarma',saglik:'Sağlık / ilk yardım',barinma:'Barınma ve ısınma',gida:'Gıda ve su',ulasim:'Ulaşım'};
  var labels={coordination:'Yetkililerle iletişim',community:'Topluluk desteği'};
  function isHelp(p){return !!p&&(p.kind==='request'||(p.tag==='yardim'&&p.verification!=='official'));}
  function pageTitle(p){return p.kind==='request'?'Yardım talebi':'Yardım çağrısı';}
  function authorRole(p){return p.kind==='request'?'Talep sahibi':'Çağrıyı paylaşan';}
  function isOwner(p){return p.authorId===(M.actorId||'me');}
  function glyph(name){
    var paths={lock:'M6 10h12v11H6zM8 10V7a4 4 0 0 1 8 0v3',globe:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18',down:'m6 9 6 6 6-6',send:'m3 3 18 9-18 9 4-9-4-9zM7 12h14'};
    return paths[name]?'<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="'+paths[name]+'"/></svg>':M.icon(name);
  }
  function avatar(a){return '<span class="rp-avatar" aria-hidden="true">'+esc((a.name||'?').split(/\s+/).slice(0,2).map(function(n){return n[0];}).join(''))+'</span>';}
  function date(value){var d=new Date(value);return isNaN(d)?'':d.toLocaleString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});}
  function key(channel){return 'mihenk:request-draft:'+ (M.sharedView?M.sharedView.runId+':'+M.actorId:'local')+':'+page.id+':'+channel;}
  function draft(){var c=page.channel;if(!page.drafts[c]){try{page.drafts[c]=JSON.parse(sessionStorage.getItem(key(c)));}catch(_){}page.drafts[c]=page.drafts[c]||{text:'',visibility:c==='coordination'?'private':'public',parentId:null,kind:'reply'};}return page.drafts[c];}
  function persist(){if(!page)return;try{sessionStorage.setItem(key(page.channel),JSON.stringify(draft()));}catch(_){} }
  function counter(form){var count=form.querySelector('.rp-count');if(!count)return;var n=form.elements.text.value.length;count.hidden=n<800;count.textContent=n+' / 1000';count.classList.toggle('rp-count--limit',n>=1000);}
  /* The visibility control is absent while replying to a private message, so the draft keeps its own value. */
  function capture(){if(!page)return;var form=page.node.querySelector('.rp-compose');if(form){counter(form);draft().text=form.elements.text.value;if(!draft().pending){draft().visibility=form.elements.visibility?.value||draft().visibility||'public';draft().kind=form.elements.kind?.value||'reply';}persist();}page.node.querySelectorAll('details[data-section]').forEach(function(d){page.expanded[d.dataset.section]=d.open;});}
  function allMessages(){return (page.thread.messages||[]).concat(page.thread.parents||[]);}
  function parent(){return allMessages().find(function(m){return m.id===draft().parentId;});}
  function writing(){var c=page.thread.post.capabilities||{};return page.channel==='coordination'?c.canWriteCoordination:c.canWriteCommunity;}
  function options(value){return '<option value="private"'+(value==='private'?' selected':'')+'>Yalnızca moderatörler</option><option value="public"'+(value==='public'?' selected':'')+'>Herkese açık</option>';}
  function detail(name,title,body,cls){return '<details class="'+(cls||'rp-disclosure')+'" data-section="'+name+'"'+(page.expanded[name]?' open':'')+'><summary>'+title+glyph('down')+'</summary>'+body+'</details>';}
  function fields(p){
    var privateFields='',names=[],anyPrivate=false,anyPublic=false;
    if(p.location.text){var addressPrivate=p.privacy?.address==='private';names.push('adres');if(addressPrivate)anyPrivate=true;else anyPublic=true;privateFields+='<div><dt>Ayrıntılı adres</dt><dd>'+esc(p.location.text)+'</dd><small>'+glyph(addressPrivate?'lock':'globe')+(addressPrivate?'Yalnızca moderatörler':'Herkese açık')+'</small></div>';}
    if(p.phone){var phonePrivate=p.privacy?.phone==='private';names.push('telefon');if(phonePrivate)anyPrivate=true;else anyPublic=true;privateFields+='<div><dt>Telefon</dt><dd>'+esc(p.phone)+'</dd><small>'+glyph(phonePrivate?'lock':'globe')+(phonePrivate?'Yalnızca moderatörler':'Herkese açık')+'</small></div>';}
    if(!privateFields)return '';
    var hint=(anyPrivate?'Özel işaretli bilgileri yalnızca siz ve yetkili moderatörler görebilir. ':'')+(anyPublic?'Herkese açık işaretlediğiniz bilgiler talebi görebilen herkese görünür. ':'')+'Görünürlüğü değiştirmek için talep bilgilerini düzenleyin.';
    return detail('privateFields',glyph(anyPrivate?'lock':'globe')+'<span>Özel bilgiler ve görünürlük</span><small>'+names.join(', ')+'</small>','<dl class="rp-fields">'+privateFields+'</dl>'+(p.capabilities.canEditStatement?'<p class="rp-hint">'+hint+'</p>':''));
  }
  function management(p){
    var c=p.capabilities;if(!c.canClose&&!c.canReopen&&!c.canManagePublicAccess)return '';
    var body='<div class="rp-manage-body">';
    if(c.canManagePublicAccess)body+='<div><span><b>Topluluk mesajları</b><small>Geçmiş mesajlar görünür kalır. Yetkililerle iletişim devam eder.</small></span><button class="rp-button" data-manage="community">'+(p.communityOpen===false?'Topluluk mesajlarını aç':'Topluluk mesajlarını durdur')+'</button></div><div><span><b>Herkese açık erişim</b><small>Kapattığınızda yalnızca talep sahibi ve yetkili moderatörler erişir.</small></span><button class="rp-button" data-manage="public">'+(p.publicAccess==='restricted'?'Talebi herkese aç':'Talebi herkese kapat')+'</button></div>';
    if(c.canClose)body+='<div><label>Kapatma nedeni<select id="rp-close-reason"><option value="" selected>Kapatma nedenini seçin</option><option value="resolved">İhtiyaç karşılandı</option><option value="withdrawn">Talep geri çekildi</option><option value="duplicate">Mükerrer talep</option><option value="other">Diğer</option></select></label><button class="rp-button" data-manage="close">Talebi kapat</button></div>';
    if(c.canReopen)body+='<div><span>Talebi yeniden açmak diğer erişim ayarlarını değiştirmez.</span><button class="rp-button" data-manage="reopen">Talebi yeniden aç</button></div>';
    return detail('management',glyph('dots')+'<span>Talep işlemleri</span>',body+'</div>','rp-management');
  }
  /* The requester keeps one visible action; rare and destructive controls stay in the disclosure. */
  function ownerActions(p){
    var c=p.capabilities;if(!isOwner(p)||(!c.canClose&&!c.canEditStatement))return '';
    return '<div class="rp-owner-actions">'+(c.canClose?'<button class="rp-primary" data-manage="resolved">'+glyph('check')+'İhtiyacım karşılandı</button>':'')+
      (c.canEditStatement?'<button class="rp-button" data-edit-statement>'+glyph('quill')+'Talep bilgilerini düzenle</button>':'')+'</div>';
  }
  function statement(p){
    var verification={unverified:'Beyan · Henüz doğrulanmadı',verified:'Doğrulanmış',official:'Resmî kaynak',disputed:'Çelişkili'};
    var summary=(p.need||[]).map(function(n){return needs[n]||n;}).join(', ');
    var chip='<span class="rp-verification" data-verification="'+esc(p.verification)+'">'+glyph('shield')+esc(verification[p.verification]||verification.unverified)+'</span>';
    var title=summary?'<h2>'+esc(summary)+'</h2>':p.kind==='request'?'<h2>Yardım ihtiyacı</h2>':'';
    /* A help call has no need summary, so the verification chip joins the fact row instead of sitting in an empty title row. */
    var written=!!(p.details&&String(p.details).trim()),statementText=written?String(p.details):(p.kind==='request'?'':String(p.text||''));
    var peek=statementText.replace(/\s+/g,' ').trim();
    return '<section class="rp-overview" aria-label="'+(p.kind==='request'?'Talep özeti':'Çağrı özeti')+'">'+(title?'<div class="rp-overview-title">'+title+chip+'</div>':'')+
      '<div class="rp-facts">'+(title?'':chip)+(p.kind==='request'?'<span>'+glyph('people')+(p.people==null?'Kişi sayısı henüz bilinmiyor':esc(p.people)+' kişi')+'</span>':'')+'<span>'+glyph('pin')+esc(p.kind==='request'?(p.publicLocationText||p.location.region||'Konum belirtilmedi'):([p.location.region,p.location.text].filter(Boolean).join(' · ')||'Konum belirtilmedi'))+'</span>'+(!p.location.known?'<span>'+glyph('questionc')+'Konum kesin değil</span>':'')+'</div>'+
      /* Kartın kimliği üst kenarı kıran künye plakasında durur; özet satırında beyanın sahibi ve zamanı kalır. */
      detail('statement','<span class="kunye">'+glyph('quill')+(p.kind==='request'?(written?'Talep sahibinin beyanı':'Beyan eklenmedi'):'Çağrı metni')+'</span><span class="rp-statement-author">'+avatar(p.author)+'<span><strong>'+esc(p.author.name)+'</strong><small>'+esc(date(p.updatedAt))+'</small></span></span>'+(peek?'<span class="rp-statement-peek">'+esc(peek)+'</span>':''),
      '<div class="rp-statement-body">'+(peek?'<p>'+esc(statementText)+'</p>':'<p class="rp-hint">Talep sahibi ek bir açıklama yazmadı. İhtiyaç başlıkları yukarıda görünür.</p>')+fields(p)+'</div>','rp-statement')+ownerActions(p)+management(p)+'</section>';
  }
  function messageHTML(m,indented){
    var p=page.thread.post,par=allMessages().find(function(x){return x.id===m.parentId;}),role=m.authorId===p.authorId?authorRole(p):m.author.requestModerator?'Moderatör':'';
    /* The community channel is public throughout, so the per-message audience badge is kept for coordination only. */
    return '<article class="rp-message'+(indented?' rp-message--reply':'')+'" id="rp-message-'+esc(m.id)+'">'+avatar(m.author)+'<div class="rp-message-content"><div class="rp-message-meta"><b>'+esc(m.author.name)+'</b>'+(role?'<span class="rp-role">'+role+'</span>':'')+'<time datetime="'+esc(m.createdAt)+'">'+esc(date(m.createdAt))+'</time>'+(page.channel==='coordination'?'<span class="rp-audience">'+glyph(m.visibility==='private'?'lock':'globe')+(m.visibility==='private'?'Özel':'Herkese açık')+'</span>':'')+'</div>'+
      (par?'<a class="rp-parent" href="#rp-message-'+esc(par.id)+'" data-parent-link="'+esc(par.id)+'">'+esc(par.author.name)+' kişisine yanıt</a>':'')+
      (m.kind==='offer'?'<span class="rp-offer">'+(m.withdrawn?'Geri çekilmiş destek önerisi':'Destek önerisi')+'</span>':'')+
      '<p>'+esc(m.withdrawn?'Destek önerisi geri çekildi.':m.text)+'</p><div class="rp-message-actions">'+(writing()?'<button data-reply-to="'+esc(m.id)+'">'+glyph('reply')+'Yanıtla</button>':'')+(m.canWithdraw?'<button data-withdraw-offer="'+esc(m.id)+'">Önerimi geri çek</button>':'')+'</div></div></article>';
  }
  /* Empty states are addressed to the actual viewer and never invite an action the next screen refuses. */
  function emptyHTML(){
    var p=page.thread.post,c=p.capabilities||{},owner=isOwner(p),head,body;
    if(page.channel==='coordination'){
      if(!c.canReadPrivate){head='Henüz herkese açık bir güncelleme yok';body=c.canWriteCommunity?'Topluluk desteği sekmesinden bilgi veya destek paylaşabilirsiniz.':'Yeni bir güncelleme paylaşıldığında burada görünür.';}
      else if(owner){head='Henüz moderatör yanıtı yok';body=writing()?'Eklemek istediğiniz bilgiyi aşağıdan paylaşabilirsiniz.':'Yeni bir mesaj geldiğinde burada görünür.';}
      else{head='Henüz mesaj yok';body=writing()?'Talep sahibine ilk güncellemeyi yazabilirsiniz.':'Yeni bir mesaj geldiğinde burada görünür.';}
    }else{
      head='Henüz topluluk mesajı yok';
      body=owner?'Gelen bilgi ve destek önerilerini burada göreceksiniz.':writing()?'İlk mesajı siz yazabilirsiniz.':'Şu anda bu sekmeye yazamıyorsunuz.';
    }
    return '<div class="rp-empty">'+glyph(page.channel==='coordination'?'reply':'people')+'<h3>'+head+'</h3><p>'+body+'</p></div>';
  }
  function messagesHTML(){
    var ms=page.thread.messages||[],parents=page.thread.parents||[],all=parents.concat(ms),seen=new Set(),html='';
    function add(m,depth){if(seen.has(m.id))return;seen.add(m.id);html+=messageHTML(m,depth>0);all.filter(function(x){return x.parentId===m.id;}).forEach(function(x){add(x,depth+1);});}
    all.filter(function(m){return !m.parentId||!all.some(function(x){return x.id===m.parentId;});}).forEach(function(m){add(m,0);});all.forEach(function(m){add(m,0);});
    if(!ms.length)return emptyHTML();
    return html;
  }
  function composer(){
    var p=page.thread.post,c=p.capabilities,d=draft(),par=parent();
    if(!writing())return '<div class="rp-readonly">'+glyph('lock')+'<p>'+(p.status==='closed'?(p.kind==='request'?'Talep kapalı. Yeni mesaj yazılamaz.':'Çağrı kapalı. Yeni mesaj yazılamaz.'):page.channel==='community'&&p.communityOpen===false?'Topluluk mesajları moderatör tarafından durduruldu.':page.channel==='coordination'?(p.kind==='request'?'Buraya talep sahibi ve yetkili moderatörler yazabilir.':'Buraya çağrıyı paylaşan kişi ve yetkili moderatörler yazabilir.'):'Bu hesap bu konuşmada yalnızca okuyabilir.')+'</p></div>';
    if(par?.visibility==='private')d.visibility='private';
    var canOffer=page.channel==='community'&&p.authorId!==(M.actorId||'me')&&(!M.shared||p.actions.includes('offer.create'));
    return '<form class="rp-compose" aria-label="Mesaj yaz"><div class="rp-reply-target"'+(!par?' hidden':'')+'><span>'+glyph('reply')+esc(par?par.author.name+' kişisine yanıt':'')+'</span><button type="button" data-cancel-reply aria-label="Yanıtı iptal et">'+glyph('close')+'</button></div><label for="rp-text">'+(page.channel==='coordination'?'Mesajınız':'Bilgi veya destek öneriniz')+'</label>'+
      '<textarea id="rp-text" name="text" rows="3" maxlength="1000" placeholder="'+(page.channel==='coordination'?'Moderatörlere bir mesaj yazın…':'Paylaşabileceğiniz bilgiyi veya desteği yazın…')+'"'+(d.pending?' readonly':'')+'>'+esc(d.text)+'</textarea><span class="rp-count" aria-live="polite" hidden></span>'+
      '<div class="rp-compose-footer">'+(page.channel!=='coordination'?'<span class="rp-public-note">'+glyph('globe')+'Herkese açık</span>':par?.visibility==='private'?'<span class="rp-public-note">'+glyph('lock')+'Özel · Yanıt özel kalır</span>':'<label class="rp-visibility">'+glyph(d.visibility==='private'?'lock':'globe')+'<span class="sr-only">Mesaj görünürlüğü</span><select name="visibility"'+(d.pending?' disabled':'')+'>'+options(d.visibility)+'</select></label>')+
      (canOffer?'<label class="rp-kind"><span>Mesaj türü</span><select name="kind"'+(d.pending?' disabled':'')+'><option value="reply">Bilgi veya yanıt</option><option value="offer"'+(d.kind==='offer'?' selected':'')+'>Destek önerisi</option></select></label>':'')+
      '<button class="rp-send" type="submit">'+glyph('send')+(d.pending?'Gönderimi yeniden dene':'Gönder')+'</button></div><p class="rp-compose-hint">'+(par?.visibility==='private'?'Özel bir mesaja verdiğiniz yanıt da özel kalır.':page.channel==='coordination'?'Özel mesajları yalnızca talep sahibi ve yetkili moderatörler görür. Herkese açık seçerseniz mesaj, talebi görebilen herkese görünür.':'Destek önerisi, yardımın ulaştığı anlamına gelmez.'+(d.kind==='offer'?' Öneriler ayrı listelenir ve geri çekilebilir.':''))+'</p><p class="rp-error" role="alert" hidden></p></form>';
  }
  /* Closure, pause and restriction can hold at the same time and none of them may hide in a disclosure. */
  function noticesHTML(p){
    var reasons={resolved:'İhtiyaç karşılandı.',withdrawn:'Talep geri çekildi.',duplicate:'Mükerrer talep.'},notices=[];
    if(p.kind==='request'&&p.status==='closed')notices.push('Talep kapalı. Yeni mesaj yazılamaz. '+(reasons[p.closeReason]||'Kapatma nedeni belirtilmedi.'));
    if(p.communityOpen===false)notices.push('Topluluk mesajları durduruldu. Geçmiş mesajlar görünür kalır.');
    if(p.publicAccess==='restricted')notices.push('Bu talep yalnızca size ve yetkili moderatörlere açık.');
    return notices.map(function(text){return '<p class="rp-notice">'+glyph('lock')+esc(text)+'</p>';}).join('');
  }
  function showRefresh(label){if(!page)return;var b=page.node.querySelector('[data-refresh-request]');if(b){if(label)b.textContent=label;b.hidden=false;}}
  function render(){
    var p=page.thread.post,c=p.capabilities;
    if(p.removed){unavailable('Bu talep kaldırıldı.');return;}
    document.title=pageTitle(p)+' · MİHENK';
    // A parent that is not in the loaded window only drops the reply target. A pending
    // command keeps its own frozen parentId so an uncertain retry reuses the same command ID.
    var d=draft();if(d.parentId&&!parent()){d.parentId=null;persist();}
    page.node.innerHTML='<header class="rp-header"><button class="rp-back" data-request-back aria-label="Akışa dön">'+glyph('chevl')+'<span>Akışa dön</span></button><div><h1 tabindex="-1">'+pageTitle(p)+'</h1><span class="rp-id">#'+esc(p.id.slice(0,8))+'</span></div>'+(p.kind==='request'?'<span class="rp-state">'+glyph(p.status==='closed'?'lock':'clock')+(p.status==='closed'?'Talep kapalı':'Talep açık')+'</span>':'')+'</header>'+statement(p)+
      noticesHTML(p)+
      '<div class="rp-tabs" role="tablist" aria-label="Talep konuşmaları">'+Object.keys(labels).map(function(channel){return '<button role="tab" id="rp-tab-'+channel+'" aria-controls="rp-panel" aria-selected="'+(page.channel===channel)+'" tabindex="'+(page.channel===channel?'0':'-1')+'" data-request-channel="'+channel+'">'+glyph(channel==='coordination'?'shield':'people')+'<span>'+labels[channel]+'</span>'+(page.unread[channel]?'<span class="rp-new-dot" role="img" aria-label="Yeni mesaj"></span>':'')+'</button>';}).join('')+'</div>'+
      '<section class="rp-conversation" id="rp-panel" role="tabpanel" aria-labelledby="rp-tab-'+page.channel+'">'+M.sectionNoteHTML('request:'+page.channel,(page.channel==='coordination'?(c.canReadPrivate?(p.kind==='request'?'Bu sekmede talep sahibi ve yetkili moderatörler yazışır.':'Bu sekmede çağrıyı paylaşan kişi ve yetkili moderatörler yazışır.'):'Herkese açık güncellemeler. Destek için Topluluk desteği sekmesini kullanın.'):'Yapabileceğiniz desteği ve güncel bilgileri paylaşın.'))+'<p class="rp-connection" role="status" hidden></p><button class="rp-updates" data-refresh-request hidden>Yeni mesajlar</button>'+
      (page.thread.nextMessageOffset!=null?'<button class="rp-earlier" data-earlier>Önceki mesajları göster</button>':'')+'<div class="rp-messages">'+messagesHTML()+'</div>'+composer()+'</section>'+
      (!M.shared?'<footer class="rp-local">Tatbikat · Gerçek yardım iletilmez.</footer>':'');
    page.node.setAttribute('aria-label',pageTitle(p));
    page.node.querySelectorAll('details[data-section]').forEach(function(n){n.addEventListener('toggle',function(){if(page)page.expanded[n.dataset.section]=n.open;});});
    var form=page.node.querySelector('.rp-compose');if(form){counter(form);form.addEventListener('input',capture);form.addEventListener('change',capture);form.onsubmit=send;}
    page.node.querySelector('.rp-tabs').onkeydown=function(e){if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();switchChannel(e.key==='Home'?'coordination':e.key==='End'?'community':page.channel==='coordination'?'community':'coordination',true);};
    persist();
  }
  async function send(e){
    e.preventDefault();var current=page,form=e.currentTarget,button=form.querySelector('[type="submit"]');if(button.disabled)return;
    capture();var d=draft(),error=form.querySelector('.rp-error');
    if(!d.text.trim()){error.hidden=false;error.textContent='Bir mesaj yazın.';form.elements.text.focus();return;}
    var channel=current.channel;
    d.pending=d.pending||{commandId:crypto.randomUUID(),type:d.kind==='offer'&&channel==='community'?'offer.create':'reply.create',targetId:current.id,expectedVersion:current.thread.post.version,payload:{text:d.text.trim(),channel:channel,visibility:channel==='community'?'public':d.visibility,parentId:d.parentId||null}};
    persist();button.disabled=true;button.textContent='Gönderiliyor…';form.elements.text.readOnly=true;
    var result=await M.transport.send(d.pending);
    if(result.ok){d.text='';d.parentId=null;d.kind='reply';d.visibility=channel==='coordination'?'private':'public';delete d.pending;if(form.isConnected){form.elements.text.value='';form.elements.text.readOnly=false;if(form.elements.visibility)form.elements.visibility.value=d.visibility;if(form.elements.kind)form.elements.kind.value='reply';}}
    else if(result.error.code!=='unavailable'||result.error.retryable===false)delete d.pending;
    if(page===current){try{sessionStorage.setItem(key(channel),JSON.stringify(d));}catch(_){}if(current.channel===channel){
      if(result.ok){await load(false);if(page===current){var input=page.node.querySelector('#rp-text');input?.focus({preventScroll:true});}}
      // A refresh during the send detaches this composer; rebuild it so the error is still shown.
      else if(!form.isConnected){render();M.toast(result.error.message);}
      else{form.elements.text.readOnly=!!d.pending;button.disabled=false;button.textContent=d.pending?'Gönderimi yeniden dene':'Gönder';error.hidden=false;error.textContent=result.error.message;if(result.error.code==='conflict')showRefresh('Talep güncellendi · Yeniden yükle');}
    }}
  }
  function shell(){return '<header class="rp-header"><button class="rp-back" data-request-back>'+glyph('chevl')+'Akışa dön</button><h1>Yardım talebi</h1></header>';}
  function unavailable(message){if(!page)return;page.node.innerHTML=shell()+'<div class="rp-empty">'+glyph('lock')+'<h2>'+esc(message)+'</h2><button class="rp-button" data-refresh-request>Yeniden dene</button></div>';}
  /* Loading is not an error: no padlock and no retry before the first attempt has finished. */
  function loading(){if(!page)return;page.node.innerHTML=shell()+'<p class="rp-loading" role="status">Talep yükleniyor…</p>';}
  async function load(earlier,provided){
    if(!page)return;var current=page,run=++serial;capture();
    var anchor=current.node.querySelector('.rp-message'),anchorId=anchor?.id,anchorY=anchor?.getBoundingClientRect().top;
    /* A refresh must not steal focus or move the caret: remember where the user was. */
    var active=document.activeElement,activeId=active&&active.id&&current.node.contains(active)?active.id:null;
    var caretStart=activeId&&active.selectionStart!=null?active.selectionStart:null,caretEnd=activeId&&active.selectionEnd!=null?active.selectionEnd:null;
    try{
      var v=provided||await M.transport.getRequestView(current.id,current.channel,earlier?current.thread.nextMessageOffset:0);
      if(page!==current||run!==serial)return;
      if(!v.thread||!isHelp(v.thread.post)){unavailable('Bu talep şu anda görüntülenemiyor.');return;}
      if(earlier){v.thread.messages=v.thread.messages.concat(current.thread.messages);v.thread.parents=v.thread.parents.concat(current.thread.parents||[]);}
      current.thread=v.thread;current.id=v.thread.post.id;current.unread[current.channel]=false;render();
      if(activeId){var back=document.getElementById(activeId);if(back){back.focus({preventScroll:true});if(caretStart!=null&&back.setSelectionRange)try{back.setSelectionRange(caretStart,caretEnd);}catch(_){}}}
      if(earlier&&anchorId){var restored=document.getElementById(anchorId);if(restored)window.scrollBy(0,restored.getBoundingClientRect().top-anchorY);}
    }catch(error){if(page!==current||run!==serial)return;
      if(['unauthorized','not_found'].includes(error.code)){M.transport.clearRequestCache();current.thread=null;unavailable('Bu talep şu anda görüntülenemiyor.');}
      else if(current.thread){var bar=current.node.querySelector('.rp-connection');if(bar){bar.hidden=false;bar.textContent='Bağlantı kurulamadı. Son bilgiler ve taslağınız korundu.';}showRefresh('Yeniden yükle');}
      else unavailable('Talep yüklenemedi. Bağlantınızı kontrol edin.');
    }
  }
  async function switchChannel(channel,focus){
    if(!page||channel===page.channel)return;capture();page.scroll[page.channel]=window.scrollY;page.channel=channel;
    var url=new URL(location.href);url.searchParams.set('channel',channel);history.replaceState(history.state,'',url);
    await load(false);if(!page)return;window.scrollTo(0,page.scroll[channel]||0);if(focus)page.node.querySelector('#rp-tab-'+channel)?.focus({preventScroll:true});
  }
  function leave(){
    if(!page)return;capture();var old=page;serial++;page=null;M.requestPageActive=null;old.node.remove();document.documentElement.removeAttribute('data-request-page');
    document.title=old.title;window.scrollTo(0,old.returnScroll||0);if(old.origin?.isConnected)old.origin.focus({preventScroll:true});
    else document.querySelector('.tab[aria-selected="true"]')?.focus({preventScroll:true});
    if(M.shared)M.refreshShared(false);
  }
  function back(){
    if(history.state?.requestReturn){history.back();return;}
    var url=new URL(location.href);url.searchParams.delete('request');url.searchParams.delete('channel');history.replaceState(null,'',url);leave();
  }
  M.openRequestPage=async function(id,opts){
    opts=opts||{};var first=!page||page.id!==id;
    if(first){if(page)leave();var origin=document.activeElement,node=M.el('<section id="request-page" class="request-page" aria-label="Yardım talebi"></section>');
      page={id:id,node:node,channel:opts.channel||(opts.offer?'community':'coordination'),drafts:{},expanded:{},unread:{},scroll:{},thread:null,returnScroll:window.scrollY,origin:origin,title:document.title};
      M.$('#main').appendChild(node);M.requestPageActive=id;document.documentElement.dataset.requestPage='1';document.title='Yardım talebi · MİHENK';
      node.onclick=handleClick;node.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key==='Enter'&&e.target.closest('.rp-compose')){e.preventDefault();e.target.closest('form').requestSubmit();}});
      loading();window.scrollTo(0,0);
      var url=new URL(location.href);url.hash='';url.searchParams.set('request',id);url.searchParams.set('channel',page.channel);
      history[opts.fromHistory?'replaceState':'pushState'](opts.fromHistory?history.state:{requestReturn:true},'',url);
    }
    if(opts.offer)draft().kind='offer';
    await load(false,opts.view&&opts.view.thread.channel===page.channel?opts.view:null);
    if(!page)return;
    /* Someone who pressed Destek öner asked to write, so start at the composer instead of the top of the thread. */
    if(opts.offer){var input=page.node.querySelector('#rp-text');if(input){input.focus({preventScroll:true});input.scrollIntoView({block:'center',behavior:'auto'});return;}}
    if(first)page.node.querySelector('h1')?.focus({preventScroll:true});
  };
  async function handleClick(e){
    var button=e.target.closest('button,a');if(!button||!page)return;
    if(button.hasAttribute('data-request-back')){back();return;}
    if(button.dataset.requestChannel){await switchChannel(button.dataset.requestChannel,true);return;}
    if(button.hasAttribute('data-refresh-request')){await load(false);return;}
    if(button.hasAttribute('data-earlier')){button.disabled=true;await load(true);return;}
    if(button.hasAttribute('data-edit-statement')){M.openImdat({editId:page.id});return;}
    if(button.dataset.parentLink){e.preventDefault();document.getElementById('rp-message-'+button.dataset.parentLink)?.scrollIntoView({block:'center',behavior:M.motionOff()?'auto':'smooth'});return;}
    if(button.dataset.replyTo||button.hasAttribute('data-cancel-reply')){
      capture();if(draft().pending){M.toast('Bekleyen mesaj gönderilmeden yanıt hedefi değiştirilemez. Aşağıdan gönderimi yeniden deneyin.');return;}
      draft().parentId=button.dataset.replyTo||null;if(parent()?.visibility==='private')draft().visibility='private';persist();
      var form=page.node.querySelector('.rp-compose');if(form){var replacement=M.el(composer());form.replaceWith(replacement);replacement.addEventListener('input',capture);replacement.addEventListener('change',capture);replacement.onsubmit=send;replacement.querySelector('textarea')?.focus();}return;
    }
    if(button.dataset.withdrawOffer){
      var msg=allMessages().find(function(m){return m.id===button.dataset.withdrawOffer;});if(!msg)return;
      var confirm=M.el('<div class="modal report-dialog"><h2 class="modal__h" id="withdraw-title">Destek önerisi geri çekilsin mi?</h2><p class="modal__p">Öneriniz konuşmadan kaldırılır. Gerekirse yeni bir öneri yazabilirsiniz.</p><p class="compose-error" role="alert" hidden></p><div class="modal__actions"><button class="btn btn--ghost" type="button" data-cancel>Vazgeç</button><button class="btn" type="button" data-confirm>Geri çek</button></div></div>');
      M.openModal(confirm,{labelledBy:'withdraw-title'});confirm.querySelector('[data-cancel]').onclick=M.closeModal;
      confirm.querySelector('[data-confirm]').onclick=async function(){this.disabled=true;var r=await M.transport.send({type:'offer.withdraw',targetId:msg.id,expectedVersion:msg.version,payload:{}});
        if(r.ok){M.closeModal();M.toast('Destek önerisi geri çekildi.');await load(false);}else{this.disabled=false;var err=confirm.querySelector('[role="alert"]');err.hidden=false;err.textContent=r.error.message;}};
      return;
    }
    if(button.dataset.manage){
      var p=page.thread.post,action=button.dataset.manage,payload={},type='request.manage',ask=null,done='';
      if(action==='community'){
        var reopening=p.communityOpen===false;payload.communityOpen=reopening;
        ask=reopening?{title:'Topluluk mesajları açılsın mı?',body:'Topluluk desteği sekmesine yeniden yazılabilir.',confirm:'Topluluk mesajlarını aç'}
          :{title:'Topluluk mesajları durdurulsun mu?',body:'Kimse yeni topluluk mesajı yazamaz. Geçmiş mesajlar görünür kalır ve yetkililerle iletişim devam eder.',confirm:'Topluluk mesajlarını durdur'};
        done=reopening?'Topluluk mesajları açıldı.':'Topluluk mesajları durduruldu.';
      }
      if(action==='public'){
        var opening=p.publicAccess==='restricted';payload.publicAccess=opening?'public':'restricted';
        ask=opening?{title:'Talep herkese açılsın mı?',body:'Talep yeniden akışta, aramada ve bağlantılarda görünür.',confirm:'Talebi herkese aç'}
          :{title:'Talep herkese kapatılsın mı?',body:'Talep akışta, aramada ve bağlantılarda görünmez. Talep sahibi ve yetkili moderatörler erişmeye devam eder.',confirm:'Talebi herkese kapat'};
        done=opening?'Talep herkese açıldı.':'Talep herkese kapatıldı.';
      }
      if(action==='close'||action==='resolved'){
        type='request.close';payload.reason=action==='resolved'?'resolved':page.node.querySelector('#rp-close-reason').value;
        if(!payload.reason){M.toast('Kapatma nedenini seçin.');page.node.querySelector('#rp-close-reason')?.focus();return;}
        ask={title:'Talep kapatılsın mı?',body:'Her iki sekmeye de yeni mesaj yazılamaz. Geçmiş silinmez ve talebi yeniden açabilirsiniz.',confirm:'Talebi kapat'};
        done='Talep kapatıldı.';
      }
      if(action==='reopen'){type='request.reopen';ask={title:'Talep yeniden açılsın mı?',body:'Yeni mesaj yazılabilir. Herkese açık erişim ve topluluk ayarları değişmez.',confirm:'Talebi yeniden aç'};done='Talep yeniden açıldı.';}
      if(!ask)return;
      var confirmManage=M.el('<div class="modal report-dialog"><h2 class="modal__h" id="manage-title">'+esc(ask.title)+'</h2><p class="modal__p">'+esc(ask.body)+'</p><p class="compose-error" role="alert" hidden></p><div class="modal__actions"><button class="btn btn--ghost" type="button" data-cancel>Vazgeç</button><button class="btn" type="button" data-confirm>'+esc(ask.confirm)+'</button></div></div>');
      M.openModal(confirmManage,{labelledBy:'manage-title'});confirmManage.querySelector('[data-cancel]').onclick=M.closeModal;
      confirmManage.querySelector('[data-confirm]').onclick=async function(){this.disabled=true;var result=await M.transport.send({type:type,targetId:p.id,expectedVersion:p.version,payload:payload});
        if(result.ok){M.closeModal();M.toast(done);page.expanded.management=false;await load(false);}else{this.disabled=false;var err=confirmManage.querySelector('[role="alert"]');err.hidden=false;err.textContent=result.error.message;}};
      return;
    }
  }
  M.requestChanged=function(change){
    if(!page)return;
    if(!change||change.accessChanged||change.posts?.includes(page.id)){M.transport.clearRequestCache();load(false);return;}
    var channels=change.channels?.[page.id]||[];
    if(channels.includes(page.channel))showRefresh('Yeni mesajlar');
    // The requester always learns about coordination; only moderators get a community dot.
    // Moderators are recognised by private access on a request they do not own, so help
    // calls (which have no management controls) mark their moderators too.
    var other=page.channel==='coordination'?'community':'coordination',post=page.thread?.post;
    var moderating=!!post&&post.capabilities.canReadPrivate&&post.authorId!==(M.actorId||'me');
    if(channels.includes(other)&&(other==='coordination'||moderating)){
      page.unread[other]=true;var tab=page.node.querySelector('[data-request-channel="'+other+'"]');if(tab&&!tab.querySelector('.rp-new-dot'))tab.insertAdjacentHTML('beforeend','<span class="rp-new-dot" role="img" aria-label="Yeni mesaj"></span>');
    }
  };
  M.refreshRequestPage=function(){if(page)load(false);};
  M.initRequestPage=function(){
    if(!M.shared)M.transport.initLocal();
    var q=new URLSearchParams(location.search),id=q.get('request');if(id)M.openRequestPage(id,{fromHistory:true,channel:q.get('channel')==='community'?'community':'coordination'});
    window.addEventListener('popstate',function(){var q=new URLSearchParams(location.search),id=q.get('request');if(id){if(page?.id===id){var c=q.get('channel')==='community'?'community':'coordination';if(c!==page.channel)switchChannel(c,false);}else M.openRequestPage(id,{fromHistory:true,channel:q.get('channel')==='community'?'community':'coordination'});}else leave();});
    document.addEventListener('visibilitychange',function(){if(!document.hidden&&page)load(false);});
  };
})(window.MIHENK=window.MIHENK||{});
