import { execFileSync } from 'node:child_process';
import { mkdirSync,writeFileSync,existsSync } from 'node:fs';
import path from 'node:path';

export const supportedCodexVersion='codex-cli 0.144.1';
export function codexCommand(){
  if(process.platform!=='win32')return {command:'codex',prefix:[]};
  const cli=path.join(process.env.APPDATA||'', 'npm/node_modules/@openai/codex/bin/codex.js');
  if(!existsSync(cli))throw new Error('Install the supported Codex CLI before using the Codex adapter.');
  return {command:process.execPath,prefix:[cli]};
}
const disabled=['apps','browser_use','browser_use_external','browser_use_full_cdp_access','code_mode','code_mode_host','code_mode_only','computer_use','goals','hooks','image_generation','in_app_browser','memories','multi_agent','plugins','remote_plugin','shell_tool','shell_snapshot','skill_mcp_dependency_install','unified_exec','tool_call_mcp_elicitation','tool_suggest','workspace_dependencies'];
export function prepareCodexProfile(directory,model='gpt-5.6-luna'){
  const cli=codexCommand(),run=args=>execFileSync(cli.command,[...cli.prefix,...args],{encoding:'utf8',windowsHide:true,timeout:15000,maxBuffer:8*1024*1024});
  const version=run(['--version']).trim();
  if(version!==supportedCodexVersion)throw new Error('This Codex version has not been verified for participant isolation.');
  const catalog=JSON.parse(run(['debug','models','--bundled']));
  const metadata=catalog.models.find(m=>m.slug===model);
  if(!metadata)throw new Error('The requested model is not in this Codex catalog.');
  // These are local tool-registration metadata, not model weights or a role prompt.
  Object.assign(metadata,{apply_patch_tool_type:null,tool_mode:'function',multi_agent_version:null,input_modalities:['text'],supports_search_tool:false,supports_parallel_tool_calls:false,experimental_supported_tools:[],base_instructions:'',model_messages:null,include_skills_usage_instructions:false,use_responses_lite:false});
  mkdirSync(directory,{recursive:true});
  const catalogFile=path.join(directory,'models.json'),cwd=path.join(directory,'workspace');mkdirSync(cwd,{recursive:true});
  writeFileSync(catalogFile,JSON.stringify({models:[metadata]}));
  const config={model_catalog_json:catalogFile,project_doc_max_bytes:0,developer_instructions:'',web_search:'disabled','history.persistence':'none',personality:'none',mcp_servers:{}};
  const toml=value=>typeof value==='object'?'{}':JSON.stringify(value);
  const args=['exec','--ignore-user-config','--ephemeral','--skip-git-repo-check','--strict-config','--json','-C',cwd,'-m',model,'-s','read-only',...disabled.flatMap(f=>['--disable',f]),...Object.entries(config).flatMap(([k,v])=>['-c',k+'='+toml(v)])];
  return {...cli,args,version,model,cwd,catalogFile,directory};
}
