// Deliberately scripted baseline. These rules never enter model participant inputs.
export function ruleDecision(view,random){
  const posts=view.posts||[],choices=posts.filter(p=>p.actions.includes('reply_create'));
  const roll=random();
  if(roll<0.25||!choices.length)return {operation:'wait',arguments:{seconds:1}};
  if(roll<0.4)return {operation:'read_view',arguments:{filter:random()<0.5?'yardim':'all',offset:0}};
  const post=choices[Math.floor(random()*choices.length)];
  if(roll<0.58)return {operation:'open_thread',arguments:{targetId:post.id}};
  if(roll<0.72&&post.actions.includes('offer_create'))return {operation:'offer_create',arguments:{targetId:post.id,text:'Bir miktar su getirebilirim. Yakınınızdaki belirgin bir yeri paylaşabilir misiniz?'}};
  if(roll<0.87)return {operation:'reply_create',arguments:{targetId:post.id,text:post.location.known?'Bu bilgi hâlâ güncel mi?':'Yakınınızda bir park, okul veya sokak adı var mı?'}};
  return {operation:'post_react',arguments:{targetId:post.id,active:!post.liked}};
}
export function seededRandom(seed){let value=seed>>>0;return ()=>{value+=0x6D2B79F5;let n=value;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return ((n^(n>>>14))>>>0)/4294967296;};}
export function shuffle(values,seed){const random=seededRandom(seed),out=values.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
