import { BrowserProvider, Contract, FetchRequest, JsonRpcProvider, formatUnits, isAddress, ZeroAddress, type TransactionReceipt } from 'ethers';
import { launch } from '../../config/launch';
import { collection, nftConfigured, nftEnabled, nftLaunch } from '../../config/nft';
import { activeWalletProvider } from '../wallets';
import { createStore, storage, walletStore } from '../runtime';
import vaultAbi from './vault-abi.json';

const tokenAbi = ['function balanceOf(address) view returns (uint256)', 'function allowance(address,address) view returns (uint256)', 'function decimals() view returns (uint8)', 'function approve(address,uint256) returns (bool)'];
let readProvider: JsonRpcProvider | null = null;
export function publicProvider() {
  if (!nftConfigured()) throw new Error('Minting opens after the token and vault launch.');
  if (!readProvider) {
    const req = new FetchRequest(nftLaunch.rpcUrl!); req.timeout = 12_000;
    readProvider = new JsonRpcProvider(req, undefined, { batchMaxCount: 20 });
  }
  return readProvider;
}
export async function bounded<T>(request: Promise<T>, ms = 20_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([request, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('The request is taking longer than expected. Please check again.')), ms); })]); }
  finally { clearTimeout(timer); }
}
export interface VaultSnapshot {
  total: number; next: number; backing: bigint; reserve: bigint; decimals: number;
  open: boolean; balance: bigint; allowance: bigint; used: boolean; owned: number[]; occupied: number[]; block: number;
}
export async function readVault(account: string | null): Promise<VaultSnapshot> {
  return bounded((async () => {
    const p = publicProvider();
    const network = await p.getNetwork();
    if (network.chainId !== BigInt(launch.chain.chainId!)) throw new Error('The configured network does not match the RPC.');
    const [tokenCode, vaultCode, block] = await Promise.all([p.getCode(launch.contractAddress!), p.getCode(nftLaunch.vaultAddress!), p.getBlockNumber()]);
    if (tokenCode === '0x' || vaultCode === '0x') throw new Error('The token or vault contract is not available on this network.');
    const v = new Contract(nftLaunch.vaultAddress!, vaultAbi, p);
    const t = new Contract(launch.contractAddress!, tokenAbi, p);
    const at = {blockTag:block};
    const [token, decimals, amount, max, uri, total, next, open, reserve] = await Promise.all([
      v.backingToken(at), t.decimals(at), v.backingAmount(at), v.MAX_IDENTITIES(at), v.metadataBaseURI(at), v.totalSupply(at), v.nextAvailableId(at), v.mintOpen(at), t.balanceOf(nftLaunch.vaultAddress!,at),
    ]);
    if (token.toLowerCase() !== launch.contractAddress!.toLowerCase() || Number(max) !== collection.size || Number(decimals)>36
      || amount !== BigInt(collection.backingTokens) * 10n ** BigInt(decimals) || uri!==nftLaunch.metadataBaseURI) throw new Error('The vault does not match the published collection configuration.');
    const ids: number[] = [];
    for (let i=0;i<Number(total);i+=20) ids.push(...(await Promise.all(Array.from({length:Math.min(20,Number(total)-i)},(_,j)=>v.tokenByIndex(i+j,at)))).map(Number));
    let balance=0n, allowance=0n, used=false, owned:number[]=[];
    if (account && isAddress(account) && account!==ZeroAddress) {
      const [b,a,u,count] = await Promise.all([t.balanceOf(account,at),t.allowance(account,nftLaunch.vaultAddress!,at),v.directMintUsed(account,at),v.balanceOf(account,at)]);
      balance=b; allowance=a; used=u;
      for(let i=0;i<Number(count);i+=20) owned.push(...(await Promise.all(Array.from({length:Math.min(20,Number(count)-i)},(_,j)=>v.tokenOfOwnerByIndex(account,i+j,at)))).map(Number));
    }
    if(reserve<amount*total) throw new Error('Vault backing is below its required reserve. Actions are unavailable.');
    return {total:Number(total), next:Number(next), backing:amount, reserve, decimals:Number(decimals), open, balance, allowance, used, owned, occupied:ids, block};
  })());
}
export function tokenAmount(amount: bigint, decimals: number) { const [whole,fraction='']=formatUnits(amount,decimals).split('.'); const part=fraction.slice(0,4).replace(/0+$/,''); return BigInt(whole).toLocaleString('en-US')+(part?'.'+part:''); }
export type VaultAction = 'approve' | 'mint' | 'redeem' | 'transfer';
export interface PendingTransaction { action:VaultAction; account:string; chainId:number; vault:string; hash:string|null; since:number; }
export interface TransactionState { pending:PendingTransaction|null; busy:boolean; message:string; error:boolean; receiptHash:string|null; }
const KEY='clunk.nft.pending.v1';
function restorePending(): PendingTransaction|null {
  try { const p=JSON.parse(storage.get(KEY)??'null'); return p && ['approve','mint','redeem','transfer'].includes(p.action) && isAddress(p.account) && isAddress(p.vault) && Number.isSafeInteger(p.chainId) && (p.hash===null || /^0x[0-9a-fA-F]{64}$/.test(p.hash)) ? p : null; } catch {return null;}
}
const initial=restorePending();
export const nftTransaction=createStore<TransactionState>({pending:initial,busy:false,message:initial?'A previous transaction needs to be checked.':'',error:false,receiptHash:null});
function persist(p:PendingTransaction|null){storage.set(KEY,JSON.stringify(p));nftTransaction.set(s=>({...s,pending:p}));}
export function transactionLink(hash:string):string|null { return launch.chain.explorerUrl ? `${launch.chain.explorerUrl.replace(/\/$/,'')}/tx/${hash}` : null; }
export function errorMessage(error:unknown):string {
  const e=error as {code?:number|string;shortMessage?:string;message?:string;reason?:string;info?:{error?:{code?:number}}};
  if(e.code===4001 || e.code==='ACTION_REJECTED' || e.info?.error?.code===4001) return 'Request rejected in your wallet. No new action was submitted by this request.';
  if(e.code===-32002 || e.info?.error?.code===-32002) return 'A request is already waiting in your wallet. Open it to continue or reject it.';
  return e.shortMessage??e.reason??e.message??'The request could not complete. Please check your wallet and try again.';
}
async function finishReceipt(receipt:TransactionReceipt) {
  const current=nftTransaction.get().pending;
  if(!current || receipt.hash!==current.hash) return;
  if(await receipt.confirmations()<nftLaunch.confirmations) return;
  persist(null);
  nftTransaction.set(s=>({...s,busy:false,error:receipt.status!==1,message:receipt.status===1?'Transaction confirmed. Your vault balances have been updated.':'The transaction reverted. No vault change was completed; network gas may still have been charged.',receiptHash:receipt.hash}));
}
export async function checkPending() {
  const pending=nftTransaction.get().pending;
  if(!pending?.hash) return;
  if(pending.chainId!==launch.chain.chainId || pending.vault.toLowerCase()!==nftLaunch.vaultAddress?.toLowerCase()) throw new Error('This saved transaction belongs to another vault or network. Check it in your wallet.');
  nftTransaction.set(s=>({...s,busy:true,error:false,message:'Checking transaction confirmation…'}));
  try {
    const receipt=await bounded(publicProvider().getTransactionReceipt(pending.hash));
    if(receipt && await receipt.confirmations()>=nftLaunch.confirmations) await finishReceipt(receipt);
    else nftTransaction.set(s=>({...s,message:'Still awaiting network confirmations. Your transaction is saved; you can check again.'}));
  }catch(e){nftTransaction.set(s=>({...s,error:true,message:errorMessage(e)}));}
  finally {nftTransaction.set(s=>({...s,busy:false}));}
}
/** Explicit user acknowledgement only for a wallet prompt without a known transaction hash. */
export function dismissUnsubmittedRequest() {
  if(nftTransaction.get().busy || nftTransaction.get().pending?.hash) return;
  persist(null); nftTransaction.set(s=>({...s,message:'Wallet request cleared. Refresh the vault before starting another action.',error:false}));
}
export async function submitVaultAction(action:VaultAction, id?:number, recipient?:string) {
  if(nftTransaction.get().busy || nftTransaction.get().pending) return;
  if(!nftEnabled()) throw new Error('Minting and vault actions are not open yet.');
  const wallet=walletStore.get(); const injected=activeWalletProvider();
  if(!wallet.address || !injected) throw new Error('Connect a wallet to sign. A pasted address is read-only.');
  nftTransaction.set(s=>({...s,busy:true,error:false,message:'Checking your wallet and vault…',receiptHash:null}));
  let pending:PendingTransaction|null=null;
  try {
    const snapshot=await readVault(wallet.address);
    const chain=await bounded(injected.request({method:'eth_chainId'}));
    const accounts=await bounded(injected.request({method:'eth_accounts'})) as string[];
    if(BigInt(String(chain))!==BigInt(launch.chain.chainId!) || accounts[0]?.toLowerCase()!==wallet.address.toLowerCase()) throw new Error('Your account or network changed. Reconnect to the configured network and try again.');
    const provider=new BrowserProvider(injected); const signer=await provider.getSigner(wallet.address);
    const vault=new Contract(nftLaunch.vaultAddress!,vaultAbi,signer);
    const token=new Contract(launch.contractAddress!,tokenAbi,signer);
    if(action==='approve'||action==='mint') {
      if(!snapshot.open) throw new Error('New minting is paused.');
      if(snapshot.used) throw new Error('This wallet has already used its lifetime direct mint.');
      if(!snapshot.next) throw new Error('All 300 identities are currently held.');
      if(snapshot.balance<snapshot.backing) throw new Error('You need 50,000 CLUNK to mint.');
    }
    if(action==='mint' && id!==snapshot.next) throw new Error('The next available identity changed. Refresh the vault and review it before minting.');
    if(action==='mint'&&snapshot.allowance<snapshot.backing) throw new Error('Approve 50,000 CLUNK before minting.');
    if((action==='redeem'||action==='transfer')&&(!id||!snapshot.owned.includes(id))) throw new Error('Only an identity in your connected wallet can be used.');
    if(action==='transfer'&&(!recipient||!isAddress(recipient)||recipient===ZeroAddress||recipient.toLowerCase()===wallet.address.toLowerCase()||recipient.toLowerCase()===nftLaunch.vaultAddress!.toLowerCase())) throw new Error('Enter a different valid recipient wallet address.');
    const call = action==='approve'? token.approve : action==='mint'?vault.mint:action==='redeem'?vault.redeem:vault['safeTransferFrom(address,address,uint256)'];
    const args=action==='approve'?[nftLaunch.vaultAddress!,snapshot.backing]:action==='mint'?[id]:action==='redeem'?[id]:[wallet.address,recipient,id];
    await bounded(call.staticCall(...args));
    if(activeWalletProvider()!==injected || walletStore.get().address?.toLowerCase()!==wallet.address.toLowerCase()) throw new Error('Your selected wallet changed. Please try again.');
    pending={action,account:wallet.address,chainId:launch.chain.chainId!,vault:nftLaunch.vaultAddress!,hash:null,since:Date.now()}; persist(pending);
    nftTransaction.set(s=>({...s,message:action==='approve'?'Approve exactly 50,000 CLUNK in your wallet.':'Confirm the transaction in your wallet.'}));
    // Preserve late wallet responses and hashes. A UI timeout never cancels a transaction.
    const sent=call(...args).then((tx:{hash:string})=>{
      pending={...pending!,hash:tx.hash}; persist(pending);
      nftTransaction.set(s=>({...s,message:'Submitted. Waiting for network confirmations…'})); return tx;
    });
    await bounded(sent,60_000);
    await checkPending();
  } catch(e) {
    const message=errorMessage(e);
    const code=(e as {code?:string|number}).code;
    if(pending && !pending.hash && (code==='ACTION_REJECTED'||code===4001||code==='CALL_EXCEPTION'||code==='INSUFFICIENT_FUNDS')) persist(null);
    nftTransaction.set(s=>({...s,error:true,message:s.pending&&!s.pending.hash?`${message} Check your wallet before starting another request.`:message}));
  } finally {nftTransaction.set(s=>({...s,busy:false}));}
}
