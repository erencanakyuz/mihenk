import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { localURL } from './participant.mjs';
import { validateOperation } from './operations.mjs';
const obj=(properties={},required=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:false});
const target={target:{type:'string',maxLength:20}};
const tool=(name,description,parameters=obj())=>({type:'function',function:{name,description,parameters:{...parameters,properties:{...parameters.properties,decisionNote:{type:'string',maxLength:240,description:'İsteğe bağlı kısa karar özeti (tek cümle).'}}}}});
export const browserOperations=[
  tool('click','Görünen hedefe tıkla.',obj(target)),
  tool('fill','Görünen yazı alanına metin yaz.',obj({...target,text:{type:'string',maxLength:1000}})),
  tool('select','Görünen seçme alanındaki bir seçeneği seç.',obj({...target,value:{type:'string',maxLength:100}})),
  tool('press','Klavye tuşuna bas.',obj({key:{type:'string',enum:['Enter','Escape','Tab','Shift+Tab','ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Space']}})),
  tool('scroll','Ekranı yukarı veya aşağı kaydır. İsteğe bağlı hedefin üzerinde kaydır.',obj({direction:{type:'string',enum:['up','down']},...target},['direction'])),
  tool('refresh','Sayfayı yenile.'),
  tool('wait','İşlem yapmadan bekle.',obj({seconds:{type:'integer',minimum:1,maximum:60}},[]))
];
export class BrowserParticipant {
  static async launch(account,{directory,width=390,height=844,state={}}={}){
    const client=new BrowserParticipant();client.url=localURL(account.url);client.directory=directory;client.width=width;client.height=height;
    mkdirSync(directory,{recursive:true});
    client.browser=await chromium.launch({headless:true});
    client.context=await client.browser.newContext({viewport:{width,height},locale:'tr-TR',serviceWorkers:'block',acceptDownloads:false,...(state.storage?{storageState:state.storage}:{})});
    await client.context.addCookies([{name:'mihenk_session',value:account.token,url:client.url,httpOnly:true,sameSite:'Strict'}]);
    await client.context.route('**/*',route=>{const u=new URL(route.request().url());return u.origin===client.url?route.continue():route.abort('blockedbyclient');});
    client.page=await client.context.newPage();client.page.on('popup',page=>page.close());client.page.setDefaultTimeout(5000);
    await client.page.goto(client.url+'/kriz',{waitUntil:'networkidle'});
    client.targets=new Map();client.pending=null;return client;
  }
  available(){return browserOperations;}
  snapshot(){return {storage:this.storage||null};}
  async read(){
    if(new URL(this.page.url()).origin!==this.url)throw new Error('Participant navigation left the application.');
    for(const handle of this.targets.values())await handle.dispose().catch(()=>{});this.targets.clear();
    const handles=await this.page.$$('button,a,input,textarea,select,summary,[role="button"]');
    const targets=[];
    for(const handle of handles){
      const info=await handle.evaluate(el=>{
        const r=el.getBoundingClientRect(),style=getComputedStyle(el);
        if(!r.width||!r.height||r.bottom<=0||r.top>=innerHeight||r.right<=0||r.left>=innerWidth||style.visibility==='hidden'||style.display==='none'||el.closest('[inert],[hidden],[aria-hidden="true"]'))return null;
        const x=Math.max(1,Math.min(innerWidth-1,r.x+r.width/2)),y=Math.max(1,Math.min(innerHeight-1,r.y+r.height/2)),hit=document.elementFromPoint(x,y);
        if(hit&&!el.contains(hit)&&!hit.contains(el))return null;
        const labels=el.labels?Array.from(el.labels).map(l=>l.innerText.trim()).join(' '):'';
        return {tag:el.tagName.toLowerCase(),name:el.getAttribute('aria-label')||labels||el.innerText||el.placeholder||'',value:'value'in el?el.value:undefined,disabled:!!el.disabled||el.getAttribute('aria-disabled')==='true',pressed:el.getAttribute('aria-pressed'),options:el.tagName==='SELECT'?Array.from(el.options).map(o=>({value:o.value,label:o.label})):undefined};
      });
      if(info){const id='t'+targets.length;targets.push({target:id,...info});this.targets.set(id,handle);}else await handle.dispose();
    }
    const visible=await this.page.evaluate(()=>{
      const onScreen=el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth&&s.visibility!=='hidden'&&!el.closest('[hidden],[inert],[aria-hidden="true"]');};
      const text=[...document.querySelectorAll('h1,h2,h3,p,.cpost__body,.cpost__name,.vpill,.request-status,.cpost__loc,.source-line,.flow__review,.thread-status,.thread-time,[role="alert"]')].filter(onScreen).map(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight?el.innerText:'[Metin kısmen ekran dışında]';}).filter(Boolean);
      const postIds=[...document.querySelectorAll('.cpost[data-id],.post[data-id]')].filter(onScreen).map(el=>el.dataset.id);
      return {text:[...new Set(text)],postIds};
    });
    const viewId=randomUUID(),file=path.join(this.directory,viewId+'.png');
    const screenshot=await this.page.screenshot({path:file,fullPage:false});
    this.storage=await this.context.storageState();
    this.evidence={viewId,screenshot:file,visiblePostIds:visible.postIds,at:new Date().toISOString(),mode:'browser'};
    this.lastObservation={title:await this.page.title(),text:visible.text,targets,image:'data:image/png;base64,'+screenshot.toString('base64')};
    return this.lastObservation;
  }
  prepare(decision){
    const error=validateOperation(decision,browserOperations);if(error)return {error:{code:'schema',message:error}};
    if(decision.arguments.target&&!this.targets.has(decision.arguments.target))return {error:{code:'not_visible',message:'Hedef güncel görünümde yok.'}};
    return {decision};
  }
  async execute(prepared){
    if(prepared.error)return {ok:false,error:prepared.error};
    const {operation,arguments:args}=prepared.decision;
    if(operation==='wait')return {ok:true,waitSeconds:args.seconds||10};
    const handle=args.target?this.targets.get(args.target):null;
    try{
      if(handle){const b=await handle.boundingBox();if(!b||b.y>=this.height||b.y+b.height<=0)throw new Error('Hedef artık görünür değil.');}
      if(operation==='click')await handle.click({timeout:5000});
      else if(operation==='fill')await handle.fill(args.text,{timeout:5000});
      else if(operation==='select')await handle.selectOption(args.value,{timeout:5000});
      else if(operation==='press')await this.page.keyboard.press(args.key);
      else if(operation==='refresh')await this.page.reload({waitUntil:'networkidle'});
      else if(operation==='scroll'){
        const box=handle?await handle.boundingBox():null;
        await this.page.mouse.move(box?Math.min(this.width-1,Math.max(1,box.x+box.width/2)):this.width/2,box?Math.min(this.height-1,Math.max(1,box.y+box.height/2)):this.height/2);
        await this.page.mouse.wheel(0,(args.direction==='up'?-1:1)*Math.round(this.height*0.65));
      }
      await this.page.waitForTimeout(200);
      return {ok:true,uiActionCompleted:true};
    }catch(error){return {ok:false,error:{code:'ui_action',message:error.message.split('\n')[0]}};}
  }
  async close(){await this.browser.close();}
}
