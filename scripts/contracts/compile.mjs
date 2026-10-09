import solc from 'solc';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
export function compile(includeTests = false) {
  const files = ['contracts/ClunkVault.sol', ...(includeTests ? ['contracts/test/Mocks.sol'] : [])];
  const input = {language:'Solidity', sources:Object.fromEntries(files.map(f=>[f,{content:readFileSync(f,'utf8')}])), settings:{optimizer:{enabled:true,runs:200}, evmVersion:'paris', outputSelection:{'*':{'*':['abi','evm.bytecode.object','evm.deployedBytecode.object']}}}};
  const output=JSON.parse(solc.compile(JSON.stringify(input),{import:p=>{try{return {contents:readFileSync(resolve('node_modules',p),'utf8')}}catch{return {error:'Missing import '+p}}}}));
  const errors=(output.errors??[]).filter(e=>e.severity==='error');
  if(errors.length) throw new Error(errors.map(e=>e.formattedMessage).join('\n'));
  return output.contracts;
}
if(process.argv[1]?.endsWith('/compile.mjs')) {
 const c=compile()['contracts/ClunkVault.sol'].ClunkVault;
 mkdirSync('artifacts/contracts',{recursive:true});
 writeFileSync('artifacts/contracts/ClunkVault.json',JSON.stringify({contractName:'ClunkVault',compiler:solc.version(),evmVersion:'paris',...c},null,2));
 mkdirSync('src/lib/nft',{recursive:true});
 writeFileSync('src/lib/nft/vault-abi.json',JSON.stringify(c.abi,null,2));
 console.log('Compiled ClunkVault for Paris EVM; ABI and deployable bytecode written.');
}
