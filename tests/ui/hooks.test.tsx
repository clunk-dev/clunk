import {test,afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import React from 'react';
const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'https://clunk.lat/hooks'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,MutationObserver:dom.window.MutationObserver,IS_REACT_ACT_ENVIRONMENT:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}} as any);
let requests=0;
globalThis.fetch=async()=>{requests++;throw new Error('Hooks must not request chain or wallet data');};
const {render,fireEvent,screen,cleanup}=await import('@testing-library/react');
const {HooksPage,hooks}=await import('../../src/pages/hooks');
const {Header,Footer}=await import('../../src/components/shell');
const {routes}=await import('../../src/routes-meta');
afterEach(()=>{cleanup();assert.equal(requests,0);});
function amount(label:string){const row=Array.from(document.querySelectorAll('.kv > div')).find(el=>el.querySelector('dt')?.textContent===label);return row?.querySelector('dd')?.textContent;}
test('all eleven hooks link to registered Clunk routes and exclude privacy buying',()=>{
 render(<HooksPage/>);
 assert.equal(document.querySelectorAll('.hook-link').length,11);
 for(const hook of hooks){assert.ok(routes.some(route=>route.path===hook.path));assert.ok(screen.getByRole('link',{name:new RegExp(hook.title.replace('&','&'))}));}
 assert.doesNotMatch(document.body.textContent!,/\b(demo|simulation|test feature|privacy buy)\b/i);
 assert.equal(document.querySelectorAll('img[src*="/nft/"]').length,0);
});
test('trade changes conserve total fees and change weather allocations at expiry',()=>{
 render(<HooksPage/>);
 assert.equal(amount('Operations & development'),'0.1 ETH');
 assert.equal(amount('NFT rewards'),'0.035 ETH');
 assert.equal(amount('Activity wallet'),'0.015 ETH');
 assert.equal(amount('Buyback & burn'),'0.035 ETH');
 assert.equal(amount('Auto liquidity'),'0.015 ETH');
 fireEvent.click(screen.getByRole('radio',{name:'Dry'}));
 assert.equal(amount('Buyback & burn'),'0.015 ETH');
 assert.equal(amount('Auto liquidity'),'0.035 ETH');
 fireEvent.change(screen.getByRole('slider'),{target:{value:'6'}});
 assert.equal(amount('Buyback & burn'),'0.025 ETH');
 assert.equal(amount('Auto liquidity'),'0.025 ETH');
 assert.match(document.body.textContent!,/Report expired/);
 fireEvent.click(screen.getByRole('radio',{name:'No report'}));
 assert.equal((screen.getByRole('slider') as HTMLInputElement).disabled,true);
});
test('zero identities redirect rewards; invalid and zero inputs recover safely',()=>{
 render(<HooksPage/>);
 fireEvent.change(screen.getByLabelText('Outstanding identities'),{target:{value:'0'}});
 assert.equal(amount('Operations & development'),'0.135 ETH');
 assert.equal(amount('NFT rewards'),'0 ETH');
 fireEvent.change(screen.getByLabelText('Eligible trade value'),{target:{value:'-1'}});
 assert.equal(document.querySelector('.kv'),null);
 assert.doesNotMatch(document.body.textContent!,/NaN|Infinity/);
 fireEvent.click(screen.getByRole('button',{name:'Reset inputs'}));
 assert.equal(amount('NFT rewards'),'0.035 ETH');
 fireEvent.change(screen.getByLabelText('Eligible trade value'),{target:{value:'0'}});
 assert.equal(amount('Operations & development'),'0 ETH');
 fireEvent.change(screen.getByLabelText('Outstanding identities'),{target:{value:'301'}});
 assert.equal(document.querySelector('.kv'),null);
});
test('Hooks is present in desktop, mobile and footer navigation',()=>{
 render(<><Header/><Footer/></>);
 assert.equal(screen.getAllByRole('link',{name:'Hooks',exact:true}).length,2);
 fireEvent.click(screen.getByRole('button',{name:'Menu',exact:true}));
 assert.equal(screen.getAllByRole('link',{name:'Hooks',exact:true}).length,3);
});
