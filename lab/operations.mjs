const string=(maxLength=1000)=>({type:'string',maxLength});
const enumeration=values=>({type:'string',enum:values});
const object=(properties={},required=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:false});
const target={targetId:{...string(100),description:'Görünümdeki kaydın kimliği.'}};
const location=object({known:{type:'boolean'},region:{type:['string','null'],maxLength:80},text:string(240)});
const request={need:{type:'array',items:enumeration(['kurtarma','saglik','barinma','gida','ulasim']),minItems:1,maxItems:5},people:{type:['integer','null'],minimum:1},location};
const tool=(name,description,parameters=object())=>({type:'function',function:{name,description,parameters:{...parameters,properties:{...parameters.properties,decisionNote:{type:'string',maxLength:240,description:'İsteğe bağlı kısa karar özeti (tek cümle).'}}}}});
export const operations=[
  tool('read_view','Akışı oku veya filtrele.',object({filter:enumeration(['all','resmi','yardim','dogrulanmis','mine','following']),region:string(80),topic:enumeration(['','yardim','enkaz','kayip','nokta','resmi','durum']),search:string(200),offset:{type:'integer',minimum:0,maximum:100000}},[])),
  tool('open_thread','Görünen gönderinin güncel ayrıntılarını ve herkese açık yanıtlarını aç.',object(target)),
  tool('wait','İşlem yapmadan bekle.',object({seconds:{type:'integer',minimum:1,maximum:60}},[])),
  tool('request_create','Yardım talebi paylaş. Bilinmeyen kişi sayısı null; bilinmeyen konum known:false, region:null, text:"".',object(request)),
  tool('post_create','Herkese açık gönderi paylaş. Kaynak: firsthand kendi gözlemi, relayed duyum, link bağlantı.',object({text:string(),tag:enumeration(['yardim','enkaz','kayip','nokta','resmi','durum']),location,source:object({kind:{type:['string','null'],enum:[null,'firsthand','relayed','link']},url:{type:['string','null'],maxLength:600}})})),
  tool('request_update','Kendi talebinin ayrıntılarını güncelle.',object({...target,...request},['targetId'])),
  tool('request_close','Kendi talebini ihtiyaç karşılandı olarak kapat.',object(target)),
  tool('request_reopen','Kendi kapalı talebini yeniden aç.',object(target)),
  tool('reply_create','Gönderiye herkese açık yanıt yaz.',object({...target,text:string()})),
  tool('offer_create','Başkasının açık talebine herkese açık destek önerisi gönder. Bu işlem talebi kapatmaz.',object({...target,text:string()})),
  tool('offer_withdraw','Kendi destek önerini geri çek.',object(target)),
  tool('post_react','Gönderiyi beğen veya beğeniyi kaldır.',object({...target,active:{type:'boolean'}})),
  tool('post_repost','Gönderinin aslını referans alarak yeniden paylaş.',object(target)),
  tool('account_follow','Görünen hesabı takip et veya takibi bırak. targetId hesap kimliğidir.',object({...target,active:{type:'boolean'}})),
  tool('observation_create','Bu bilgiyi senin de gördüğünü belirt. Bu beyan bağımsız doğrulama değildir.',object(target)),
  tool('report_create','Gönderiyi bildir: inaccurate yanlış/eski bilgi, abuse spam/kötüye kullanım, privacy kişisel bilgi, other başka sorun. Açıklama isteğe bağlı.',object({...target,reason:enumeration(['inaccurate','abuse','privacy','other']),details:string()},['targetId','reason']))
];
export const commandType=name=>name.replace('_','.');
function check(schema,value,path='arguments') {
  const types=Array.isArray(schema.type)?schema.type:[schema.type];
  const type=value===null?'null':Array.isArray(value)?'array':typeof value;
  if(!types.includes(type)&&!(type==='number'&&types.includes('integer')&&Number.isSafeInteger(value)))return path+': invalid type';
  if(schema.enum&&!schema.enum.includes(value))return path+': invalid option';
  if(typeof value==='number'&&(value<(schema.minimum??-Infinity)||value>(schema.maximum??Infinity)))return path+': outside range';
  if(typeof value==='string'&&value.length>(schema.maxLength??Infinity))return path+': too long';
  if(type==='array'){
    if(value.length<(schema.minItems??0)||value.length>(schema.maxItems??Infinity))return path+': invalid length';
    for(const v of value){const error=check(schema.items,v,path+'[]');if(error)return error;}
  }
  if(type==='object'){
    if(Object.keys(value).some(k=>!Object.hasOwn(schema.properties,k))||(schema.required||[]).some(k=>!Object.hasOwn(value,k)))return path+': unknown or missing field';
    for(const [key,val] of Object.entries(value)){const error=check(schema.properties[key],val,path+'.'+key);if(error)return error;}
  }
  return null;
}
export function validateOperation(decision,allowed=operations){
  if(!decision||typeof decision!=='object'||Object.keys(decision).some(k=>!['operation','arguments'].includes(k)))return 'Return operation and arguments only.';
  const tool=allowed.find(t=>t.function.name===decision.operation);
  return tool?check(tool.function.parameters,decision.arguments):'Choose an available operation.';
}
