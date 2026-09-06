import { serveRehearsal } from '../server/http.mjs';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const configFile=path.join(root,'.rehearsal/operator.json');
const saved=existsSync(configFile)?JSON.parse(readFileSync(configFile,'utf8')):{};
const server=await serveRehearsal({port:Number(process.env.MIHENK_PORT||8322),operatorPort:Number(process.env.MIHENK_OPERATOR_PORT||8323),...(/^[A-Za-z0-9_-]{43}$/.test(saved.token||'')?{operatorToken:saved.token}:{})});
mkdirSync(path.join(root,'.rehearsal'),{recursive:true});
writeFileSync(path.join(root,'.rehearsal/operator.json'),JSON.stringify({url:'http://127.0.0.1:'+server.operatorPort,participantUrl:'http://127.0.0.1:'+server.port,token:server.operatorToken}),{mode:0o600});
console.log('MİHENK participant: http://127.0.0.1:'+server.port+'\nOperator credentials saved locally. Use npm run rehearsal:control -- create.');
let closing=false;
async function close(){if(closing)return;closing=true;await server.close();process.exit(0);}
process.on('SIGINT',close);process.on('SIGTERM',close);
