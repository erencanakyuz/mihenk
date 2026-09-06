import http from 'node:http';
import path from 'node:path';
import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { openStore, secret, hash } from './store.mjs';
import { AppError, createWorldService, applyDelta, reject } from './world.mjs';
import { projectView } from './views.mjs';
import { makeScenario, advance } from '../lab/scenarios.mjs';

const ROOT=path.resolve(import.meta.dirname,'..');
const scripts=['catalog','transport','app','feed','crisis','imdat','request-thread','shared'];
const assets=new Set(['/participant.html',...scripts.map(s=>s==='catalog'?'/data/catalog.js':'/scripts/'+s+'.js'),...['tokens','base','feed','crisis','refine','plain'].map(s=>'/styles/'+s+'.css'),'/assets/fonts/archivo-700.woff2']);
const json=(res,code,value)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
async function body(req,limit=65536) {
  let size=0;const parts=[];
  for await(const part of req) {size+=part.length;if(size>limit)reject('validation','İstek çok büyük.');parts.push(part);}
  try { return JSON.parse(Buffer.concat(parts).toString('utf8')||'{}'); } catch {reject('validation','Geçersiz JSON.');}
}
export async function serveRehearsal({port=8322,operatorPort=8323,host='127.0.0.1',dbPath=path.join(ROOT,'.rehearsal/world.sqlite'),operatorToken=secret()}={}) {
  if(host!=='127.0.0.1')throw new Error('Rehearsal must bind to 127.0.0.1.');
  const store=openStore(dbPath), service=createWorldService(store), streams=new Set(), rates=new Map();
  const fail=(res,error)=>json(res,error.code==='unauthorized'?401:error.code==='not_found'?404:error.code==='conflict'?409:error.code==='rate_limited'?429:error.code==='unavailable'?503:400,{ok:false,error:{code:error.code||'unavailable',message:error instanceof AppError?error.message:'İşlem tamamlanamadı.',field:error.field??null,retryable:!error.code||error.code==='unavailable'}});
  function origin(req,expected) {
    if(req.headers.host!==new URL(expected).host)reject('unauthorized','Geçersiz sunucu adresi.');
    if(req.headers.origin&&req.headers.origin!==expected)reject('unauthorized','Geçersiz istek kaynağı.');
    if(req.headers['sec-fetch-site']==='cross-site')reject('unauthorized','Bu istek kaynağına izin verilmiyor.');
  }
  function authenticate(req) {
    const bearer=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    const cookie=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('mihenk_session='))?.slice(15);
    const session=store.session(bearer||cookie);
    if(!session)reject('unauthorized','Oturum açmak için katılım bağlantısını kullanın.');
    return session;
  }
  function limit(key) {
    const now=Date.now(), old=rates.get(key);
    const slot=old&&now-old.start<60000?old:{start:now,count:0};
    slot.count++;rates.set(key,slot);
    if(slot.count>240)reject('rate_limited','Çok sık işlem yapıldı. Biraz bekleyip yeniden deneyin.');
    if(rates.size>1000)for(const [k,v] of rates)if(now-v.start>60000)rates.delete(k);
  }
  const participant=http.createServer(async(req,res)=>{
    try {
      const expected='http://127.0.0.1:'+participant.address().port;origin(req,expected);
      const url=new URL(req.url,expected);
      res.setHeader('Referrer-Policy','no-referrer');
      if(url.pathname==='/api/session/redeem'&&req.method==='POST') {
        limit(req.socket.remoteAddress);
        const input=await body(req);
        if(typeof input.joinCode!=='string'||input.joinCode.length>100)reject('validation','Katılım kodu geçersiz.');
        const token=store.redeem(input.joinCode);if(!token)reject('unauthorized','Katılım bağlantısı kullanılmış veya süresi dolmuş.');
        res.setHeader('Set-Cookie','mihenk_session='+token+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400');
        return json(res,200,{ok:true});
      }
      if(url.pathname.startsWith('/api/')) {
        const session=authenticate(req);
        if(url.pathname==='/api/view'&&req.method==='GET')return json(res,200,projectView(service,session,Object.fromEntries(url.searchParams)));
        if(url.pathname==='/api/commands'&&req.method==='POST') {
          limit(session.token);
          const result=service.command(session,await body(req));
          return json(res,result.ok?200:result.error.code==='conflict'?409:result.error.code==='unauthorized'?403:result.error.code==='unavailable'?503:400,result);
        }
        if(url.pathname==='/api/activity'&&req.method==='POST'){
          limit(session.token);const p=await body(req,4096);
          if(Object.keys(p).some(k=>!['eventId','operation','note','targetId'].includes(k))||typeof p.eventId!=='string'||p.eventId.length>100||typeof p.operation!=='string'||!/^[a-z_]{1,40}$/.test(p.operation)||typeof p.note!=='string'||p.note.length>240)reject('validation','Karar notu geçersiz.');
          if(p.targetId&&!JSON.parse(session.seen).includes(p.targetId))reject('unauthorized','Önce ilgili kaydı açın.');
          store.record(session.run_id,'participant-note',{actorId:session.actor_id,eventId:p.eventId,operation:p.operation,targetId:p.targetId||null,note:p.note});
          return json(res,200,{ok:true});
        }
        if(url.pathname==='/api/events'&&req.method==='GET') {
          const same=[...streams].filter(s=>s.session.token===session.token);
          if(same.length>=3)reject('rate_limited','Çok sayıda açık bağlantı var.');
          res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive'});
          res.write('event: ready\ndata: {}\n\n');
          const stream={session,res};streams.add(stream);
          const keepalive=setInterval(()=>{if(Date.now()>session.expires)res.end();else res.write(': keepalive\n\n');},20000);
          req.on('close',()=>{clearInterval(keepalive);streams.delete(stream);});
          return;
        }
        reject('not_found','İşlem bulunamadı.');
      }
      if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
      let pathname=url.pathname;
      if(['/','/kriz','/takip'].includes(pathname))pathname='/participant.html';
      if(!assets.has(pathname))reject('not_found','Sayfa bulunamadı.');
      const file=path.join(ROOT,pathname);
      if(!existsSync(file)||!realpathSync(file).startsWith(ROOT+path.sep))reject('not_found','Sayfa bulunamadı.');
      const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.woff2':'font/woff2'};
      res.writeHead(200,{'Content-Type':mime[path.extname(file)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'"});res.end(req.method==='HEAD'?undefined:readFileSync(file));
    } catch(error){if(!res.headersSent)fail(res,error);else res.end();}
  });
  const operator=http.createServer(async(req,res)=>{
    try {
      const expected='http://127.0.0.1:'+operator.address().port;origin(req,expected);
      const url=new URL(req.url,expected);
      const shell={'/':'operator.html','/operator.html':'operator.html','/operator.js':'scripts/operator.js','/operator.css':'styles/operator.css'};
      if(req.method==='GET'&&Object.hasOwn(shell,url.pathname)){
        res.writeHead(200,{'Content-Type':url.pathname.endsWith('.js')?'text/javascript; charset=utf-8':url.pathname.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' blob:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"});return res.end(readFileSync(path.join(ROOT,shell[url.pathname])));
      }
      if(hash(req.headers.authorization??'')!==hash('Bearer '+operatorToken))reject('unauthorized','Operator credential required.');
      if(url.pathname==='/monitor'&&req.method==='GET'){
        const run=store.read(url.searchParams.get('runId'));if(!run)reject('not_found','Run not found.');
        const after=key=>Math.max(0,Number.parseInt(url.searchParams.get(key),10)||0);
        return json(res,200,{run:{id:run.id,title:run.title,status:run.status,tick:run.tick,openRequests:Object.values(run.posts).filter(p=>p.kind==='request'&&p.status==='open').length},actors:Object.values(run.actors).map(a=>({id:a.id,name:a.name,handle:a.handle})),...store.monitor(run.id,after('afterRecord'),after('afterEvent'),url.searchParams.get('actorId')||null)});
      }
      if(url.pathname==='/runs'&&req.method==='GET')return json(res,200,store.list());
      if(url.pathname==='/runs'&&req.method==='POST'){const p=await body(req);const state=makeScenario(p.scenario);store.create(state);return json(res,201,{runId:state.id});}
      if(url.pathname==='/sessions'&&req.method==='POST') {
        const p=await body(req), state=store.read(p.runId);if(!state)reject('not_found','Run not found.');
        let actorId=p.actorId;
        if(actorId&&!Object.hasOwn(state.actors,actorId))reject('not_found','Account not found.');
        if(!actorId) {actorId=randomUUID();const name=typeof p.name==='string'?p.name.trim().slice(0,60):'Üye '+(Object.keys(state.actors).length+1);
          service.mutate(state.id,s=>{s.actors[actorId]={id:actorId,name:name||'Üye',handle:'uye'+actorId.slice(0,8)};},{kind:'account-created'});}
        const session=store.createSession(state.id,actorId);
        return json(res,201,{...session,url:'http://127.0.0.1:'+participant.address().port+'/kriz#join='+session.joinCode});
      }
      if(url.pathname==='/control'&&req.method==='POST') {
        const p=await body(req),state=store.read(p.runId);if(!state)reject('not_found','Run not found.');
        if(state.status==='replay')reject('conflict','Replay is read-only. Create a new run to make new decisions.');
        if(p.action==='tick')advance(service,p.runId);
        else if(['start','resume','pause','stop'].includes(p.action))service.mutate(p.runId,s=>{s.status=['start','resume'].includes(p.action)?'running':p.action==='pause'?'paused':'stopped';},{kind:'operator-'+p.action});
        else reject('validation','Unknown control.');
        return json(res,200,store.list().find(s=>s.id===p.runId));
      }
      if(url.pathname==='/export'&&req.method==='GET'){const data=store.export(url.searchParams.get('runId'));if(!data)reject('not_found','Run not found.');return json(res,200,data);}
      if(url.pathname==='/records'&&req.method==='POST'){const p=await body(req,2*1024*1024);if(!store.read(p.runId))reject('not_found','Run not found.');store.record(p.runId,p.kind,p.record);return json(res,200,{ok:true});}
      if(url.pathname==='/replay'&&req.method==='POST') {
        const data=await body(req,32*1024*1024);
        if(data.version!==1||!data.initial||!Array.isArray(data.events))reject('validation','Invalid run archive.');
        const state=structuredClone(data.initial);
        for(const event of data.events)applyDelta(state,event.delta);
        const matches=JSON.stringify(state)===JSON.stringify(data.final);
        if(!matches)reject('conflict','Replay state does not match the recorded final state.');
        state.id=randomUUID();state.status='replay';store.create(state);
        return json(res,201,{runId:state.id,matches});
      }
      reject('not_found','Operator route not found.');
    }catch(error){if(!res.headersSent)fail(res,error);else res.end();}
  });
  service.listeners.add((runId,delta)=>{
    const publicChange=Object.keys(delta).some(k=>!['reports'].includes(k));
    if(!publicChange)return;
    for(const stream of streams)if(stream.session.run_id===runId)stream.res.write('event: changed\ndata: {}\n\n');
  });
  const listen=(server,p)=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(p,host,resolve);});
  try {await listen(participant,port);await listen(operator,operatorPort);}
  catch(error){participant.close();operator.close();store.close();throw error;}
  return {service,store,operatorToken,port:participant.address().port,operatorPort:operator.address().port,
    close:async()=>{for(const s of streams)s.res.end();await Promise.all([new Promise(r=>participant.close(r)),new Promise(r=>operator.close(r))]);store.close();}};
}
