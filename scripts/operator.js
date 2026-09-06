(() => {
  'use strict';
  const $=s=>document.querySelector(s),create=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
  const names={post_remove:'Paylaşımı kaldır',account_ban:'Hesabı engelle',read_view:'Akışı okudu',open_thread:'Yanıtları açtı',wait:'Beklemeyi seçti',request_create:'Yardım talebi paylaş',request_update:'Talebi güncelle',request_close:'Talebi kapat',request_reopen:'Talebi yeniden aç',reply_create:'Yanıt yaz',offer_create:'Destek öner',offer_withdraw:'Öneriyi geri çek',post_create:'Gönderi paylaş',post_react:'Beğeniyi değiştir',post_repost:'Yeniden paylaş',account_follow:'Takibi değiştir',observation_create:'Gözlem beyanı',report_create:'Gönderiyi bildir',click:'Tıkla',fill:'Metin yaz',select:'Seçenek seç',press:'Tuşa bas',scroll:'Kaydır',refresh:'Sayfayı yenile'};
  const statusNames={running:'Devam ediyor',paused:'Duraklatıldı',stopped:'Sonlandırıldı',replay:'Kayıt tekrar oynatımı'};
  let key=new URLSearchParams(location.hash.slice(1)).get('key')||sessionStorage.getItem('mihenk:operator-key')||'';
  if(location.hash)history.replaceState(null,'',location.pathname+location.search);
  if(key)sessionStorage.setItem('mihenk:operator-key',key);
  let runId='',selected='',records=[],events=[],actors=[],activity=[],actions=[],afterRecord=0,afterEvent=0,busy=false,revision=0;
  async function api(route,body){const response=await fetch(route,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});if(response.status===401){$('#access').hidden=false;throw new Error('Gözlem anahtarı gerekiyor');}const data=await response.json();if(!response.ok)throw new Error(data.error?.message||'Bağlantı kurulamadı');return data;}
  const stamp=at=>at?new Date(at).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'';
  function entries(){
    const observedActors=new Set(records.filter(r=>r.kind==='observation').map(r=>r.actorId));
    const completed=new Set([...events.filter(e=>e.actorId===selected&&e.command).map(e=>e.command.commandId),...records.filter(r=>r.actorId===selected&&r.kind==='rejection').map(r=>r.command.commandId)]);
    const noteFor=id=>records.find(r=>r.actorId===selected&&r.kind==='participant-note'&&r.eventId===id)?.note;
    return [...records.filter(r=>r.actorId===selected&&!(r.kind==='participant-note'&&completed.has(r.eventId))&&(['participant-comment','participant-note','rejection','decision-error','runner-error','observation','decision-held','sealed-rejection'].includes(r.kind)||r.kind==='view'&&!observedActors.has(r.actorId)||r.kind==='decision'&&r.mode==='browser')).map(r=>({...r,note:r.note||noteFor(r.command?.commandId),_key:'r'+r.id})),...events.filter(e=>e.actorId===selected&&e.command).map(e=>({...e,note:noteFor(e.command.commandId),kind:'accepted',_key:'e'+e.seq}))].sort((a,b)=>(b.at||'').localeCompare(a.at||'')).slice(0,70);
  }
  function showObservation(host,item){
    const view=item.view||item.observation||{},posts=view.items||view.posts||[];
    const details=create('details');details.append(create('summary','',posts.length?posts.length+' gönderinin içeriği':view.text?'Gördüğü ekran metni':'Açılan görünüm'));
    for(const p of posts){const block=create('div','seen-post');block.append(create('b','',p.author?.name||'Gönderi'),create('p','',p.text||''));const loc=p.location?.text||p.location?.region||'Konum belirtilmedi';block.append(create('small','',loc+(p.status?' · '+(p.status==='open'?'Talep açık':'Talep kapalı'):'')));details.append(block);}
    if(view.thread){const block=create('div','seen-post');block.append(create('b','','Açılan gönderi'),create('p','',view.thread.post?.text||''));for(const message of view.thread.messages||[])block.append(create('p','',(message.author?.name||'Üye')+': '+message.text));details.append(block);}
    if(view.text)details.append(create('p','',view.text.join('\n')));
    if(!posts.length&&!view.thread&&!view.text)details.append(create('p','','Bu görünümde gönderi yok.'));
    host.append(details);
  }
  function renderTimeline(){
    const list=$('#timeline'),oldScroll=list.scrollTop,oldDetails=new Set([...list.querySelectorAll('details[open]')].map(d=>d.closest('[data-key]').dataset.key));list.replaceChildren();
    const rows=entries();$('#action-count').textContent=actions.find(a=>a.actorId===selected)?.count||0;
    if(!rows.length){list.append(create('div','empty','Bu hesap henüz içerik açmadı veya işlem yapmadı. Bağlandığında akışı burada görünecek.'));return;}
    for(const item of rows){
      const article=create('article','entry');article.dataset.key=item._key;
      const isView=['view','observation'].includes(item.kind),operation=item.operation||item.decision?.operation||item.command?.type.replace('.','_');
      const title=isView?(item.mode==='browser'?'Ekranda görünenler':'Hesaba iletilen içerik'):item.kind==='participant-comment'?'Katılımcının mesajı':item.kind==='accepted'?'Kaydedildi · '+(names[operation]||operation):item.kind==='participant-note'?'Seçimi · '+(names[operation]||operation):item.kind==='decision'?'Ekrandaki işlem · '+(names[operation]||operation):item.kind==='decision-held'?'İşlem bekletildi':item.kind==='sealed-rejection'?'İşlem sınırında durduruldu':'İşlem tamamlanamadı';
      article.dataset.tone=item.kind==='accepted'?'success':isView?'view':['participant-comment','participant-note','decision','decision-held'].includes(item.kind)?'decision':'error';
      const head=create('div','entry-head');head.append(create('h3','',title),create('time','',stamp(item.at)));article.append(head);
      const body=create('div','entry-body');
      if(isView)showObservation(body,item);
      else {
        if(item.kind==='participant-comment')body.append(create('p','',item.text||''));
        const note=item.note||item.decision?.arguments?.decisionNote;
        if(note){body.append(create('div','note-label','KISA KARAR NOTU'),create('p','note',note));}
        const text=item.command?.payload?.text||item.decision?.arguments?.text;if(text)body.append(create('p','',text));
        if(item.kind==='accepted'&&item.command.type==='account.ban'){const target=actors.find(a=>a.id===item.command.targetId);body.append(create('p','',(target?.name||'Hesap')+' · Yeni paylaşım yapması engellendi.'));}
        if(item.kind==='accepted'){const p=Object.values(item.delta?.posts||{})[0];if(p?.text&&p.text!==text)body.append(create('p','',p.text));if(p?.location)body.append(create('p','',(p.location.text||p.location.region||'Konum bilinmiyor')+(p.people===null?' · Kişi sayısı bilinmiyor':'')));}
        const error=item.result?.error?.message||item.error?.message||item.message;if(error)body.append(create('p','',error));
        if(item.kind==='decision'&&item.result?.ok)body.append(create('p','','Ekran işlemi uygulandı. Gönderim sonucu ayrıca uygulamadan takip edilir.'));
      }
      article.append(body);list.append(article);if(oldDetails.has(item._key)&&body.querySelector('details'))body.querySelector('details').open=true;
    }
    list.scrollTop=$('#follow-latest').checked?0:oldScroll;
  }
  function renderAccounts(){
    if(runId)history.replaceState(null,'',location.pathname+'?'+new URLSearchParams({run:runId,...(selected?{actor:selected}:{})}));
    const host=$('#accounts');host.replaceChildren();
    for(const actor of actors){const button=create('button','account');button.type='button';button.setAttribute('aria-pressed',actor.id===selected);const text=create('span','account-text');text.append(create('b','',actor.name),create('small','',activity.some(r=>r.actorId===actor.id)?'Etkinlik kaydı var':'Henüz etkinlik yok'));button.append(create('span','avatar',actor.name.split(' ').map(s=>s[0]).slice(0,2).join('')),text);button.onclick=()=>{revision++;selected=actor.id;records=[];events=[];afterRecord=0;afterEvent=0;renderAccounts();renderTimeline();poll();};host.append(button);}
    const actor=actors.find(a=>a.id===selected),engine=activity.find(r=>r.actorId===selected)?.engine;$('#selected-name').textContent=actor?.name||'Bir hesap seç';
    const role=actor?.access?.role,roleLabel={participant:'Katılımcı',moderator:'Moderatör',observer:'Gözlemci',disabled:'Erişim kapalı'}[role]||role;
    $('#selected-detail').textContent=actor?'@'+actor.handle+' · '+(engine==='rule'?'Kurallı katılımcı':engine==='model'?'Model katılımcısı':'Harici hesap')+(roleLabel?' · '+roleLabel+' · '+actor.access.operations.length+' işlem izni':''):'Katılımcı bağlantısı bekleniyor.';
  }
  async function poll(){
    if(busy||!runId||!key)return;busy=true;const current=++revision;
    try{
      const data=await api('/monitor?'+new URLSearchParams({runId,afterRecord,afterEvent,actorId:selected}));if(current!==revision)return;
      const changed=data.records.length||data.events.length||actors.length!==data.participantIds.length;
      records=records.concat(data.records).slice(-1000);events=events.concat(data.events).slice(-1000);afterRecord=selected?data.afterRecord:0;afterEvent=selected?data.afterEvent:0;activity=data.activity||[];actions=data.actions||[];actors=data.actors.filter(a=>data.participantIds.includes(a.id));
      if(!actors.some(a=>a.id===selected))selected=actors[0]?.id||'';
      $('#participant-count').textContent=actors.length;$('#request-count').textContent=data.run.openRequests;$('#run-status').textContent=statusNames[data.run.status]||data.run.status;
      $('#toggle-run').textContent=data.run.status==='running'?'Duraklat':'Devam et';$('#toggle-run').dataset.action=data.run.status==='running'?'pause':'resume';$('#toggle-run').disabled=['stopped','replay'].includes(data.run.status);
      $('#connection').textContent='Canlı bağlantı';$('#connection').dataset.online='true';$('#access').hidden=true;
      if(changed){renderAccounts();if($('#follow-latest').checked||!$('#timeline .entry'))renderTimeline();}
    }catch(error){$('#connection').textContent=error.message;$('#connection').dataset.online='false';}finally{busy=false;}
  }
  function switchRun(){revision++;const requested=new URLSearchParams(location.search);runId=$('#runs').value;records=[];events=[];actors=[];afterRecord=0;afterEvent=0;selected=requested.get('run')===runId?(requested.get('actor')||''):'';renderAccounts();renderTimeline();poll();}
  async function init(){try{const runs=await api('/runs');$('#runs').replaceChildren();for(const run of runs){const option=create('option','',run.title+' · '+run.id.slice(0,6));option.value=run.id;$('#runs').append(option);}const requested=new URLSearchParams(location.search).get('run');if(runs.some(r=>r.id===requested))$('#runs').value=requested;if(runs.length)switchRun();else{$('#connection').textContent='Henüz oturum yok';}}catch(error){$('#connection').textContent=error.message;}}
  $('#runs').onchange=switchRun;$('#follow-latest').onchange=renderTimeline;
  $('#toggle-run').onclick=async()=>{const button=$('#toggle-run');button.disabled=true;try{await api('/control',{runId,action:button.dataset.action});await poll();}catch(error){$('#connection').textContent=error.message;}finally{button.disabled=false;}};
  $('#access').onsubmit=e=>{e.preventDefault();key=$('#access-key').value;sessionStorage.setItem('mihenk:operator-key',key);$('#access-key').value='';init();};
  init();setInterval(()=>{if(!document.hidden)poll();},2000);
})();
