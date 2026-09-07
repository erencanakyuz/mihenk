// Account-local observations and receipts, never model-generated explanations.
// Recalled cards are historical evidence, not current action permissions.
const cards = observation => [...(observation.posts||[]), ...(observation.relatedPosts||[]), ...(observation.ownRequests||[]), ...(observation.thread?[observation.thread.post]:[])];
const messages = observation => [...(observation.updates||[]), ...(observation.thread?.messages||[])];
export function remember(memory={}, observation, turn) {
  const posts=new Map((memory.posts||[]).map(p=>[p.id,p]));
  const replies=new Map((memory.messages||[]).map(p=>[p.id,p]));
  for(const p of cards(observation)){
    const {id,author,kind,text,tag,location,source,verification,need,people,status,removed,corrects}=p;
    posts.delete(id);posts.set(id,{id,author,kind,text,tag,location,source,verification,need,people,status,removed,corrects,lastSeenTurn:turn});
  }
  for(const p of messages(observation)){
    replies.delete(p.id);replies.set(p.id,{id:p.id,targetId:p.targetId||observation.thread?.post.id,author:p.author,text:p.text,kind:p.kind,withdrawn:p.withdrawn,lastSeenTurn:turn});
  }
  return {posts:[...posts.values()].slice(-32),messages:[...replies.values()].slice(-24)};
}
export function recall(memory={}, observation) {
  const visiblePosts=new Set(cards(observation).map(p=>p.id));
  const visibleMessages=new Set(messages(observation).map(p=>p.id));
  return [...(memory.posts||[]).filter(p=>!visiblePosts.has(p.id)).slice(-12).map(p=>({historicalPost:p})),
    ...(memory.messages||[]).filter(p=>!visibleMessages.has(p.id)).slice(-8).map(p=>({historicalMessage:p}))];
}
export function receipt(turn, operation, result, observation) {
  // Read results are remembered separately; do not duplicate the entire page.
  const {observation:readObservation,...outcome}=result;
  const target=cards(observation).find(p=>p.id===operation?.arguments?.targetId);
  return {turn,operation,result:outcome,...(target?{target:{id:target.id,author:target.author,textExcerpt:target.text.slice(0,240),kind:target.kind}}:{}),
    ...(readObservation?{view:{query:readObservation.query,postIds:cards(readObservation).map(p=>p.id)}}:{})};
}
