import { randomUUID } from 'node:crypto';
export const scenarioNames=['incomplete-information','overwhelmed-request','interrupted-coordination','moderation-pressure','adversarial-crisis'];
export function makeScenario(name='incomplete-information') {
  if(!scenarioNames.includes(name))throw new Error('Unknown scenario');
  const now=new Date().toISOString();
  const actors={
    'resident-deniz':{id:'resident-deniz',name:'Deniz',handle:'deniz'},
    'resident-ada':{id:'resident-ada',name:'Ada',handle:'ada'},
    'local-info':{id:'local-info',name:'Yerel Bilgi',handle:'yerelbilgi',org:true}
  };
  const state={id:randomUUID(),title:'Deprem bölgesinden güncellemeler',scenario:name,scenarioVersion:1,status:'paused',tick:0,actors,posts:{},replies:{},offers:{},reports:{},reactions:{},follows:{},observations:{},truth:{},schedule:[]};
  function post(id,authorId,text,props={}) {
    state.posts[id]={id,authorId,kind:'post',version:1,text,tag:'durum',location:{known:true,region:'Pazarcık',text:''},source:{kind:'firsthand',url:null},verification:'unverified',createdAt:now,updatedAt:now,...props};
  }
  post('need-water','resident-deniz','Gıda ve su ihtiyacı var. Kişi sayısı henüz bilinmiyor.',{kind:'request',tag:'yardim',need:['gida'],people:null,status:'open',location:{known:false,region:null,text:''}});
  post('road-report','resident-ada','Kuzey yolunun açıldığını duydum. Yoldan geçen var mı?',{source:{kind:'relayed',url:null}});
  post('community-note','resident-deniz','Telefonumun şarjı az. Mesajları aralıklarla kontrol edebiliyorum.');
  state.truth['road-report']={classification:'inaccurate',basis:'The scenario road remains closed.'};
  state.schedule=[{tick:4,id:'road-correction',authorId:'local-info',text:'Kuzey yolu için önceki bilgi güncel değil. Yol kapalı; yeni bir açıklama olduğunda buradan duyurulacak.',tag:'durum',verification:'official',corrects:'road-report'},
    {tick:8,id:'landmark-update',requestId:'need-water',location:{known:true,region:'Pazarcık',text:'Parkın kuzey girişindeyim.'}}];
  if(name==='overwhelmed-request') {
    for(let i=0;i<35;i++)post('background-'+i,i%2?'resident-ada':'resident-deniz', ['Mahallede elektrik durumunu takip ediyorum.','Tanıdıklarımıza mesajla ulaşmaya çalışıyoruz.','Bugünkü gelişmeleri buradan okuyorum.'][i%3]);
  }
  if(name==='interrupted-coordination') state.schedule.push({tick:6,id:'close-request',requestId:'need-water',status:'closed'});
  if(name==='moderation-pressure'){delete state.posts['road-report'];state.truth={};state.schedule=[];}
  if(name==='adversarial-crisis'){
    state.title='Geniş Kapsamlı Kriz ve Dezenformasyon Tatbikatı';
    state.actors['afad-official']={id:'afad-official',name:'AFAD Kriz Masası',handle:'afad',org:true};
    state.actors['troll-fake']={id:'troll-fake',name:'Kaos Haber',handle:'kaoshaber'};
    state.actors['victim-hasan']={id:'victim-hasan',name:'Hasan',handle:'hasan'};
    post('fake-dam','troll-fake','SON DAKİKA: Bölgedeki barajın gövdesinde derin yarıklar oluştu, baraj patlamak üzere herkes yüksek yerlere kaçsın!',{tag:'durum',source:{kind:'unverified',url:null}});
    state.truth['fake-dam']={classification:'inaccurate',basis:'Baraj sağlamdır; asılsız panik ve dezenformasyon iddiasıdır.'};
    post('need-insulin','victim-hasan','Atatürk Parkı doğu çadır alanındayım. Tip-1 diyabetli çocuğum için acil soğuk zincir insülin lazım.',{kind:'request',tag:'yardim',need:['ilac'],people:1,status:'open',location:{known:true,region:'Pazarcık',text:'Atatürk Parkı'}});
    state.truth['need-insulin']={classification:'accurate',basis:'Doğrulanmış acil ilaç ve medikal yardım ihtiyacı.'};
    state.schedule=[
      {tick:3,id:'official-dam-denial',authorId:'afad-official',text:'AFAD DUYURUSU: Baraj patladı yönündeki iddialar tamamen asılsızdır. Bölge halkının dezenformasyon amaçlı panik mesajlarına itibar etmemesi rica olunur.',tag:'durum',verification:'official',corrects:'fake-dam'},
      {tick:6,id:'fake-aid-stop',authorId:'troll-fake',text:'Yardım dağıtım merkezinde izdiham çıktı, tüm erzak dağıtımı süresiz iptal edildi!',tag:'durum'},
      {tick:8,id:'official-aid-update',authorId:'afad-official',text:'Pazarcık Spor Salonu erzak ve battaniye dağıtım merkezimiz açık olup yardımlar koordineli devam etmektedir.',tag:'yardim',verification:'official',corrects:'fake-aid-stop'},
      {tick:10,id:'insulin-delivered',requestId:'need-insulin',status:'closed'}
    ];
    state.truth['fake-aid-stop']={classification:'inaccurate',basis:'Dağıtım merkezi açıktır; sahte yardım engelleme iddiasıdır.'};
  }
  return state;
}
export function advance(service,runId) {
  service.mutate(runId,state=>{
    if(state.status!=='running')return;
    state.tick++;
    for(const event of state.schedule.filter(e=>e.tick===state.tick)) {
      const at=new Date().toISOString();
      if(event.requestId) {
        const p=state.posts[event.requestId];if(event.location)p.location=event.location;if(event.status)p.status=event.status;p.version++;p.updatedAt=at;
      } else {
        state.posts[event.id]={id:event.id,authorId:event.authorId,kind:'post',version:1,text:event.text,tag:event.tag,location:{known:true,region:'Pazarcık',text:''},source:{kind:'firsthand',url:null},verification:event.verification,createdAt:at,updatedAt:at,corrects:event.corrects};
      }
    }
  },{kind:'scenario-tick'});
}
