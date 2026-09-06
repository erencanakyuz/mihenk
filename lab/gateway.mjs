import { Participant } from './participant.mjs';
import { validateOperation } from './operations.mjs';

// Trusted host boundary shared by adapters. No model-controlled URL, file,
// account, role, executable code, or operator credential enters this interface.
export class ParticipantGateway {
  constructor(account,{state={},save=()=>{},record=()=>{},maxDecisions=100,maxWallSeconds=1200}={}){
    if(!Number.isSafeInteger(maxDecisions)||maxDecisions<1||maxDecisions>1000||!Number.isSafeInteger(maxWallSeconds)||maxWallSeconds<1||maxWallSeconds>86400)throw new Error('Invalid gateway limits.');
    this.client=new Participant(account,state.client||{});this.saveState=save;this.record=record;
    this.decisions=state.decisions||0;this.nextAt=state.nextAt||0;this.expiresAt=state.expiresAt||Date.now()+maxWallSeconds*1000;this.maxDecisions=maxDecisions;this.tail=Promise.resolve();
  }
  snapshot(){return {client:this.client.snapshot(),decisions:this.decisions,nextAt:this.nextAt,expiresAt:this.expiresAt};}
  async save(){await this.saveState(this.snapshot());}
  serial(fn){const next=this.tail.then(fn,fn);this.tail=next.catch(()=>{});return next;}
  async view(){return this.serial(async()=>{
    if(Date.now()>=this.expiresAt)throw new Error('Participant session time limit reached.');
    const observation=await this.client.read();await this.save();
    await this.record('observation',{observation,viewId:this.client.view.viewId});
    return {observation,operations:this.client.available(),pending:this.client.pending?.decision||null};
  });}
  async call(operation,args={}){return this.serial(async()=>{
    const decision={operation,arguments:args};
    const fail=(code,message)=>({ok:false,error:{code,message}});
    if(Date.now()>=this.expiresAt||this.decisions>=this.maxDecisions)return fail('budget','Participant session limit reached.');
    if(Date.now()<this.nextAt)return {ok:false,error:{code:'waiting',message:'Waiting interval has not elapsed.'},waitSeconds:Math.ceil((this.nextAt-Date.now())/1000)};
    this.decisions++;await this.save();
    const invalid=validateOperation(decision,this.client.available());
    if(invalid){const result=fail('unavailable_action',invalid);await this.record('decision',{decision,result});return result;}
    const pending=this.client.pending;
    if(pending&&JSON.stringify(pending.decision)!==JSON.stringify(decision))return fail('pending','The previous operation has no confirmed result.');
    const prepared=pending||this.client.prepare(decision);
    await this.record('action-start',{decision,commandId:prepared.command?.commandId});
    const result=await this.client.execute(prepared,()=>this.save());
    if(result.waitSeconds)this.nextAt=Date.now()+result.waitSeconds*1000;
    await this.save();await this.record('decision',{decision,result,commandId:prepared.command?.commandId});
    return result.observation?{...result,operations:this.client.available()}:result;
  });}
}
