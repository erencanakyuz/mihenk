import { randomBytes } from 'node:crypto';
import { operations,validateOperation } from './operations.mjs';

export const presentationDefaults=Object.freeze({decisionNotes:true,descriptions:true,names:'semantic'});
export const opaquePresentation=Object.freeze({decisionNotes:false,descriptions:false,names:'random'});
export function normalizePresentation(input={}){
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!Object.hasOwn(presentationDefaults,k)))throw new Error('Invalid tool presentation.');
  const options={...presentationDefaults,...input};
  if(typeof options.decisionNotes!=='boolean'||typeof options.descriptions!=='boolean'||!['semantic','random'].includes(options.names))throw new Error('Invalid tool presentation.');
  return options;
}
// The map is trusted controller state. It is never included in model input.
export class ToolSurface {
  constructor(options={},aliases){
    this.options=normalizePresentation(options);
    const names=operations.map(t=>t.function.name);
    this.aliases=aliases?{...aliases}:Object.fromEntries(names.map(n=>[n,this.options.names==='random'?'f_'+randomBytes(6).toString('hex'):n]));
    if(Object.keys(this.aliases).length!==names.length||names.some(n=>!Object.hasOwn(this.aliases,n)||typeof this.aliases[n]!=='string'||(this.options.names==='random'?!/^f_[a-f0-9]{12}$/.test(this.aliases[n]):this.aliases[n]!==n))||new Set(Object.values(this.aliases)).size!==names.length)throw new Error('Invalid tool alias map.');
    this.reverse=new Map(Object.entries(this.aliases).map(([name,alias])=>[alias,name]));
  }
  snapshot(){return {options:{...this.options},aliases:{...this.aliases}};}
  name(value){return this.aliases[value.replace('.','_')]||value;}
  tools(allowed){
    const clean=value=>{
      if(Array.isArray(value))return value.map(clean);
      if(!value||typeof value!=='object')return value;
      return Object.fromEntries(Object.entries(value).filter(([key])=>this.options.descriptions||!['description','title','examples','default'].includes(key)).map(([key,child])=>[key,clean(child)]));
    };
    const result=allowed.map(t=>{
      const tool=clean(structuredClone(t));
      if(this.options.names==='random'&&!Object.hasOwn(this.aliases,t.function.name)&&!this.reverse.has(t.function.name))throw new Error('Random tool names require account operations.');
      tool.function.name=this.name(t.function.name);
      if(!this.options.decisionNotes){delete tool.function.parameters.properties.decisionNote;tool.function.parameters.required=tool.function.parameters.required.filter(n=>n!=='decisionNote');}
      return tool;
    });
    return this.options.names==='random'?result.sort((a,b)=>a.function.name.localeCompare(b.function.name)):result;
  }
  decode(name,args,allowed){
    const error=validateOperation({operation:name,arguments:args},this.tools(allowed));
    if(error)throw new Error('Unavailable operation or invalid arguments.');
    return {operation:this.reverse.get(name)||name,arguments:args};
  }
  project(value){
    if(Array.isArray(value))return value.map(item=>this.project(item));
    if(!value||typeof value!=='object')return value;
    return Object.fromEntries(Object.entries(value).filter(([key])=>this.options.decisionNotes||key!=='decisionNote').map(([key,child])=>{
      if(key==='actions'&&Array.isArray(child))return [key,child.map(name=>this.name(name))];
      if(key==='operations'&&Array.isArray(child))return [key,child.every(t=>typeof t==='string')?child.map(n=>this.name(n)):this.tools(child)];
      if(key==='operation'&&typeof child==='string')return [key,this.name(child)];
      return [key,this.project(child)];
    }));
  }
}
