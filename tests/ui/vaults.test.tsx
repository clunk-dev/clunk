import {test,afterEach,before} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import React from 'react';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://clunk.lat/vaults'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,HTMLDialogElement:dom.window.HTMLDialogElement,MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}} as any);
HTMLDialogElement.prototype.showModal=function(){this.open=true;};HTMLDialogElement.prototype.close=function(){this.open=false;};
let fetches:string[]=[];
globalThis.fetch=async(input:any)=>{fetches.push(String(input));throw new Error('Unexpected network request: '+input);};
const {render,fireEvent,screen,waitFor,cleanup,within,act}=await import('@testing-library/react');
const {VaultsPage}=await import('../../src/pages/vaults');
const {MarketplacePage}=await import('../../src/pages/nft');
const {LaunchNotice}=await import('../../src/components/tx');
const {walletStore,walletUi,txNotice}=await import('../../src/lib/runtime');
const {nftTransaction,submitVaultAction}=await import('../../src/lib/nft/client');
const {launch}=await import('../../src/config/launch');
const {nftLaunch,nftConfigured,nftEnabled}=await import('../../src/config/nft');
afterEach(()=>{cleanup();txNotice.set(null);walletStore.set({address:null,source:null});walletUi.set({open:false,reason:null});fetches=[];window.history.replaceState(null,'','/vaults');});
async function ready(){render(<VaultsPage/>);await waitFor(()=>assert.equal(document.querySelectorAll('.nft-grid .nft-card').length,24));await new Promise(r=>setTimeout(r,0));}
test('prelaunch conceals all artwork and rarity without any NFT data request',async()=>{await ready();assert.ok(screen.getByRole('heading',{name:'NFT Vaults'}));assert.equal((screen.getByRole('button',{name:'Mint an identity'}) as HTMLButtonElement).disabled,false);assert.equal(fetches.length,0);assert.equal(document.querySelectorAll('.nft-grid .nft-concealed').length,24);assert.equal(document.querySelectorAll('.nft-rarity-badge').length,0);assert.equal(screen.queryByRole('group',{name:'Filter by rarity'}),null);for(const img of document.querySelectorAll('img'))assert.ok(!img.src.includes('/nft/'));});
test('search only uses identity numbers and never reveals traits',async()=>{await ready();fireEvent.change(screen.getByRole('searchbox'),{target:{value:'001'}});assert.equal(document.querySelectorAll('.nft-grid .nft-card').length,1);fireEvent.change(screen.getByRole('searchbox'),{target:{value:'Observatory'}});assert.ok(screen.getByText('No matching identities.'));fireEvent.click(screen.getByRole('button',{name:'Clear search'}));assert.equal(document.querySelectorAll('.nft-grid .nft-card').length,24);});
test('all 300 concealed identities are reachable in number order',async()=>{await ready();const seen:number[]=[];for(let i=0;i<13;i++){for(const card of document.querySelectorAll('.nft-grid .nft-card'))seen.push(Number(card.textContent!.match(/#(\d+)/)![1]));const next=within(screen.getByRole('navigation',{name:'Collection pages'})).getByRole('button',{name:'Next',exact:true}) as HTMLButtonElement;if(i<12)fireEvent.click(next);else assert.equal(next.disabled,true);}assert.deepEqual(seen,Array.from({length:300},(_,i)=>i+1));});
test('unminted details have a cover, no traits, no rarity and no original link',async()=>{await ready();fireEvent.change(screen.getByRole('searchbox'),{target:{value:'001'}});fireEvent.click(screen.getByRole('button',{name:/^Clunk #001/}));const dialog=screen.getByRole('dialog',{name:'Clunk #001'});assert.ok(within(dialog).getByRole('img',{name:'Unrevealed Clunk Identity'}));assert.equal(dialog.querySelectorAll('dd').length,0);assert.equal(within(dialog).queryByRole('link',{name:'View full artwork'}),null);assert.equal(fetches.length,0);fireEvent.click(screen.getByRole('button',{name:'Close',exact:true}));assert.equal(screen.queryByRole('dialog'),null);});
test('unconnected collection opens connect UI; watch-only wallet stays prelaunch',async()=>{await ready();fireEvent.click(screen.getByRole('button',{name:'My identities'}));assert.ok(screen.getByText('Your corner of the notebook.'));fireEvent.click(screen.getAllByRole('button',{name:'Connect Wallet'})[0]);assert.equal(walletUi.get().open,true);});
test('token address alone never activates vault; direct action is blocked',async()=>{const old=launch.contractAddress;launch.contractAddress='0x1111111111111111111111111111111111111111';try{assert.equal(nftConfigured(),false);assert.equal(nftEnabled(),false);await assert.rejects(submitVaultAction('mint'),/not open yet/);assert.equal(nftTransaction.get().pending,null);}finally{launch.contractAddress=old;}});
test('metadata identity URL opens matching detail directly',async()=>{window.history.replaceState(null,'','/vaults?identity=300');await ready();assert.ok(screen.getByRole('dialog',{name:'Clunk #300'}));});
test('a pasted public address cannot submit even with a complete live configuration',async()=>{
 const previous={contract:launch.contractAddress,chain:launch.chain.chainId,mode:launch.features.vaults,nft:{...nftLaunch}};
 launch.contractAddress='0x1111111111111111111111111111111111111111';launch.chain.chainId=999;launch.features.vaults='live';Object.assign(nftLaunch,{vaultAddress:'0x2222222222222222222222222222222222222222',rpcUrl:'https://rpc.invalid',deploymentBlock:1,metadataBaseURI:'ipfs://collection/',enabled:true,confirmations:2});
 walletStore.set({address:'0x3333333333333333333333333333333333333333',source:'manual'});
 try {assert.equal(nftEnabled(),true);await assert.rejects(submitVaultAction('mint',1),/pasted address is read-only/);assert.equal(nftTransaction.get().pending,null);assert.equal(fetches.length,0);}
 finally{launch.contractAddress=previous.contract;launch.chain.chainId=previous.chain;launch.features.vaults=previous.mode;Object.assign(nftLaunch,previous.nft);}
});

test('prelaunch mint opens Coming Soon immediately without wallet connection or transaction',async()=>{
 render(<><VaultsPage/><LaunchNotice/></>);
 fireEvent.click(screen.getByRole('button',{name:'Mint an identity'}));
 const dialog=screen.getByRole('dialog',{name:'Coming Soon'});
 assert.match(dialog.textContent!,/vault is deployed/);
 assert.equal(walletUi.get().open,false);assert.equal(nftTransaction.get().pending,null);assert.equal(fetches.length,0);
 fireEvent.click(within(dialog).getByRole('button',{name:'Got it'}));
 assert.equal(screen.queryByRole('dialog',{name:'Coming Soon'}),null);
});
test('marketplace buy and list show Coming Soon for disconnected and connected wallets',()=>{
 render(<><MarketplacePage/><LaunchNotice/></>);
 for(const address of [null,'0x3333333333333333333333333333333333333333']){
  act(()=>walletStore.set({address,source:address?'manual':null}));
  for(const label of ['Buy an identity','List identity']){
   fireEvent.click(screen.getByRole('button',{name:label}));
   const dialog=screen.getByRole('dialog',{name:'Coming Soon'});
   assert.match(dialog.textContent!,/marketplace contracts/);
   assert.equal(walletUi.get().open,false);assert.equal(nftTransaction.get().pending,null);assert.equal(fetches.length,0);
   fireEvent.click(within(dialog).getByRole('button',{name:'Close'}));
  }
 }
});
