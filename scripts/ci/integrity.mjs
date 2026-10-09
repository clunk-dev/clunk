import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {compile} from '../contracts/compile.mjs';
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
assert.ok(files.length>50,'Source tree must be tracked');
for(const file of files){
 assert.ok(!/^(private|dist[^/]*|node_modules|deployment-output|artifacts|docs\/nft)\//.test(file),'Private/generated data tracked: '+file);
 assert.ok(!/^\.env(?:\.|$)/.test(file),'Environment file tracked: '+file);
 assert.ok(!/\.(pem|key|p12|pfx)$/.test(file),'Key file tracked: '+file);
 if(!/\.(ts|tsx|js|mjs|sol|md|json|yml)$/.test(file))continue;
 const text=readFileSync(file,'utf8');
 assert.ok(!text.includes('-----BEGIN '+'PRIVATE KEY-----'),'Private key in '+file);
 assert.ok(!/gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}/.test(text),'GitHub token in '+file);
}
for(const path of ['src/pages/hooks.tsx','src/pages/vaults.tsx','public/brand/clunk-mascot-640.webp','contracts/ClunkVault.sol','server/reveal.mjs','SECURITY.md','CONTRIBUTING.md'])assert.ok(existsSync(path),path);
const app=readFileSync('src/App.tsx','utf8'),routes=readFileSync('src/routes-meta.ts','utf8');
for(const path of ['/hooks','/vaults','/marketplace','/weather','/rising-tide','/docs'])assert.ok(app.includes("'"+path+"'")&&routes.includes("'"+path+"'"),'Missing route '+path);
const abi=JSON.parse(readFileSync('src/lib/nft/vault-abi.json','utf8'));
assert.deepEqual(compile()['contracts/ClunkVault.sol'].ClunkVault.abi,abi,'Committed ABI differs from contract');
for(const file of ['README.md','docs/GETTING_STARTED.md','docs/ARCHITECTURE.md','docs/CI.md']){
 const text=readFileSync(file,'utf8');
 for(const match of text.matchAll(/\]\(([^)]+)\)/g)){
  const href=match[1];if(/^(https?:|#)/.test(href))continue;
  const parent=file.includes('/')?file.slice(0,file.lastIndexOf('/')+1):'';
  assert.ok(existsSync(parent+href.split('#')[0]),'Broken documentation link: '+file+' -> '+href);
 }
}
assert.equal(readdirSync('.github/workflows').filter(f=>f.endsWith('.yml')).length,8);
console.log('Public source, routes, assets, ABI, documentation links and eight workflows verified.');
