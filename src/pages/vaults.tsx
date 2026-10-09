import { rarityKey } from '../lib/nft/rarity';
import traitTeaser from '../lib/nft/trait-teaser.json';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { asset, openWallet, shortAddress, useStore, walletStore } from '../lib/runtime';
import { collection, nftConfigured, nftEnabled, nftLaunch } from '../config/nft';
import { launch } from '../config/launch';
import { Loop, ConcealedIdentity } from '../components/brand';
import { Bench, BenchSection } from '../components/experiment';
import { Chip, KV, SourceLinks } from '../components/ui';
import { Link } from '../lib/router';
import { checkPending, dismissUnsubmittedRequest, errorMessage, nftTransaction, readVault, submitVaultAction, tokenAmount, transactionLink, type VaultSnapshot } from '../lib/nft/client';
import { OwnershipWalkthrough } from './nft';
import { showNftComingSoon } from '../components/tx';

interface Trait {trait_type:string;value:string}
interface Entry {id:number;name:string;attributes:Trait[]}
const art = (id:number) => asset(`nft/art/${String(id).padStart(3,'0')}.svg`);
const thumb = (id:number) => asset(`nft/thumbs/${String(id).padStart(3,'0')}.webp`);
const number = (id:number) => `#${String(id).padStart(3,'0')}`;
function Dialog({title,children,onClose,className=''}:{title:string;children:ReactNode;onClose:()=>void;className?:string}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const d=ref.current!;const previous=document.activeElement as HTMLElement|null;d.showModal();return()=>{d.close();previous?.focus();};},[]);
  return <dialog ref={ref} className={`nft-dialog ${className}`} aria-label={title} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="nft-dialog__head"><h2>{title}</h2><button className="btn btn--sm btn--quiet" type="button" onClick={onClose}>Close</button></div>{children}</dialog>;
}
export function VaultsPage() {
  const wallet=useStore(walletStore); const tx=useStore(nftTransaction);
  const [snapshot,setSnapshot]=useState<VaultSnapshot|null>(null);
  const [loading,setLoading]=useState(false); const [error,setError]=useState('');
  const [entries,setEntries]=useState<Entry[]>([]); const [assetError,setAssetError]=useState(false);
  const [tab,setTab]=useState<'collection'|'mine'>('collection'); const [search,setSearch]=useState('');const [page,setPage]=useState(0);
  const [selected,setSelected]=useState<number|null>(()=>{const id=Number(new URLSearchParams(window.location.search).get('identity'));return Number.isInteger(id)&&id>=1&&id<=300?id:null;});const [confirm,setConfirm]=useState<{id:number;kind:'redeem'|'transfer';recipient?:string}|null>(null);
  const [recipient,setRecipient]=useState('');const [tick,setTick]=useState(0);
  const seq=useRef(0);const configured=nftConfigured(); const enabled=nftEnabled();

  useEffect(()=>{
    const n=++seq.current;setSnapshot(null);setError('');
    if(!configured)return;
    setLoading(true);readVault(wallet.address).then(s=>{if(n===seq.current)setSnapshot(s);}).catch(e=>{if(n===seq.current)setError(errorMessage(e));}).finally(()=>{if(n===seq.current)setLoading(false);});
    return()=>{seq.current++;};
  },[wallet.address,wallet.chainId,configured,tick,tx.receiptHash]);
  useEffect(()=>{if(!tx.pending?.hash||!configured)return;const timer=setInterval(()=>{if(!nftTransaction.get().busy)void checkPending().catch(e=>setError(errorMessage(e)));},12_000);return()=>clearInterval(timer);},[tx.pending?.hash,configured]);
  useEffect(()=>{setPage(0);},[tab,search]);
  const allIds=useMemo(()=>Array.from({length:collection.size},(_,i)=>i+1),[]);
  const filtered=(tab==='mine'?(snapshot?.owned??[]):allIds).filter(id=>!search.trim()||String(id).padStart(3,'0').includes(search.replace('#','').trim()));
  const pages=Math.max(1,Math.ceil(filtered.length/24));const currentPage=Math.min(page,pages-1);const visible=filtered.slice(currentPage*24,currentPage*24+24);
  const revealIds = [...new Set([...visible, ...(selected===null?[]:[selected])])].filter(id=>snapshot?.occupied.includes(id));
  const revealKey = revealIds.join(',');
  useEffect(()=>{
    let alive=true; setEntries([]); setAssetError(false);
    if(!revealKey)return;
    fetch(asset(`nft/revealed?ids=${revealKey}`),{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(m=>{if(alive)setEntries(m.entries);}).catch(()=>{if(alive)setAssetError(true);});
    return()=>{alive=false;};
  },[revealKey,snapshot?.block]);
  const revealedEntry=(id:number)=>snapshot?.occupied.includes(id)?entries.find(e=>e.id===id):undefined;
  const rarityFor=(id:number)=>revealedEntry(id)?.attributes.find(t=>t.trait_type==='Rarity')?.value;
  const artwork=(id:number,full=false)=>revealedEntry(id)?<img src={full?art(id):thumb(id)} alt={`Clunk ${number(id)}, revealed artwork`} width={full?1024:384} height={full?1024:384} loading="lazy"/>:<ConcealedIdentity/>;
  const selectedEntry=selected===null?undefined:revealedEntry(selected);const selectedOwned=selected!==null&&!!snapshot?.owned.includes(selected);
  const wrongNetwork=!!wallet.address&&wallet.source==='injected'&&configured&&Number(wallet.chainId)!==launch.chain.chainId;
  const blocked=!enabled||loading||!!error||!snapshot||tx.busy||!!tx.pending||wrongNetwork||wallet.source!=='injected';
  const mintBlocked=blocked||!snapshot?.open||!!snapshot?.used||!snapshot?.next||snapshot.balance<snapshot.backing;
  const needsApproval=!!snapshot&&snapshot.allowance<snapshot.backing;
  const act=async(action:'approve'|'mint'|'redeem'|'transfer',id?:number,to?:string)=>{setError('');try{await submitVaultAction(action,id,to);setTick(t=>t+1);}catch(e){setError(errorMessage(e));}};
  const stateLabel=(id:number)=>!snapshot?'Unrevealed':snapshot.owned.includes(id)?'In your wallet':snapshot.occupied.includes(id)?'Held':'Available';
  return <div className="container nft-page">
    <header className="exp-head nft-heading"><div className="exp-head__meta"><span className="eyebrow"><b>Applications / 01</b></span><SourceLinks sections={[12]}/></div><h1 tabIndex={-1} className="route-focus">NFT Vaults</h1><Loop/><p className="lead">A little Clunk. A vault of its own.</p></header>
    <div className="nft-top">
      <section className="nft-showcase" aria-label="Clunk Identities collection"><div className="nft-showcase__note"><span className="eyebrow">The notebook collection</span><span className="mono">001—300</span></div><div className="nft-fan">{[64,1,113].map(id=><button key={id} type="button" className="nft-fan__card" onClick={()=>setSelected(id)} aria-label={`View Clunk ${number(id)}`}><ConcealedIdentity/><span className="mono">CLUNK {number(id)}</span></button>)}</div><div className="nft-showcase__foot"><h2>300 curious identities.</h2><p>A closed notebook. Yours to open after minting.</p></div></section>
      <Bench title="Mint an identity" aside={<span className="chip">{enabled?'Onchain vault':'Before launch'}</span>}>
        <BenchSection><KV rows={[{k:'Your deposit',v:'50,000 CLUNK'},{k:'Your NFT',v:snapshot?.next?`Clunk ${number(snapshot.next)} · Unrevealed`:'1 backed identity'},{k:'Direct mint',v:'Once per wallet, ever'}]}/><p className="note">Your CLUNK stays in the vault. The current NFT owner can redeem it by burning the identity.</p></BenchSection>
        <BenchSection>
          {!enabled?<div className="nft-launch-note"><strong>Minting opens after launch.</strong><p>300 concealed identities. Artwork and rarity reveal after your mint is confirmed.</p></div>:loading?<p role="status">Reading the vault…</p>:snapshot?<div className="nft-wallet-facts"><p><strong>{snapshot.total} / 300</strong> identities held · {300-snapshot.total} available</p>{wallet.address&&<><p>Balance: {tokenAmount(snapshot.balance,snapshot.decimals)} CLUNK</p><p>{snapshot.used?'Your lifetime direct mint has been used.':'Your direct mint is unused.'}</p></>}{!snapshot.open&&<p>New minting is paused. Existing owners can still redeem.</p>}</div>:null}
          {wrongNetwork&&<p className="field__error">Switch your wallet to {launch.chain.name} (chain {launch.chain.chainId}).</p>}
          {wallet.source==='manual'&&<p className="note">This address is read-only. Connect a wallet to sign transactions.</p>}
          {!wallet.address||wallet.source==='manual'?<button className="btn btn--primary nft-main-button" onClick={openWallet}>Connect Wallet</button>:<p className="note mono">{shortAddress(wallet.address)}</p>}
          <div className="nft-mint-steps"><span className={snapshot&&!needsApproval?'is-complete':''}>01 · Approve CLUNK</span><span>02 · Mint identity</span></div>
          <button type="button" className="btn btn--primary nft-main-button" disabled={enabled&&mintBlocked} onClick={()=>{if(!enabled){showNftComingSoon('Mint an identity');return;}void act(needsApproval?'approve':'mint',snapshot?.next);}}>{!enabled?'Mint an identity':tx.busy?'Check your wallet…':needsApproval?'Approve 50,000 CLUNK':'Deposit 50,000 CLUNK & mint'}</button>
          {enabled&&snapshot&&snapshot.balance<snapshot.backing&&wallet.address&&<p className="note">You need 50,000 CLUNK, plus the network’s native token for gas.</p>}
          <p className="note">Identities are assigned in number order. Artwork and rarity reveal after mint confirmation; this is not a random draw.</p>
        </BenchSection>
      </Bench>
    </div>
    {(error||tx.message)&&<section className={`result ${(error||tx.error)?'result--error':'result--success'} nft-status`} aria-live="polite"><p>{error||tx.message}</p>{tx.pending&&<p className="note">{tx.pending.action} · {shortAddress(tx.pending.account)} · chain {tx.pending.chainId}</p>}<div className="row">{configured&&<button className="btn btn--sm" disabled={loading||tx.busy} onClick={()=>setTick(t=>t+1)}>Refresh vault</button>}{tx.pending?.hash&&<><span className="mono nft-hash">{tx.pending.hash}</span><button className="btn btn--sm" disabled={tx.busy} onClick={()=>void checkPending().catch(e=>setError(errorMessage(e)))}>Check transaction</button></>}{!tx.pending?.hash&&tx.pending&&!tx.busy&&<button className="btn btn--sm" onClick={dismissUnsubmittedRequest}>I checked my wallet: nothing was submitted</button>}{(tx.receiptHash||tx.pending?.hash)&&transactionLink((tx.receiptHash||tx.pending?.hash)!)&&<a href={transactionLink((tx.receiptHash||tx.pending?.hash)!)!} target="_blank" rel="noreferrer">View transaction</a>}</div></section>}
    <div className="nft-stats"><div><span className="eyebrow">Collection</span><strong>300 identities</strong></div><div><span className="eyebrow">Backing per minted NFT</span><strong>50,000 CLUNK</strong></div><div><span className="eyebrow">Current vault reserve</span><strong>{snapshot?`${tokenAmount(snapshot.reserve,snapshot.decimals)} CLUNK`:configured?'Unavailable':'Not live yet'}</strong></div></div>
    <section className="nft-trait-teaser" aria-labelledby="trait-teaser-title">
      <div className="nft-trait-teaser__intro"><span className="eyebrow">From the notebook</span><h2 id="trait-teaser-title">A few things waiting inside.</h2><p>A glimpse of the traits you could discover. Your Identity’s combination and rarity reveal after minting.</p></div>
      <div className="nft-trait-teaser__grid">{traitTeaser.map((group,index)=><div className="nft-trait-teaser__card" key={group.trait}><span className="mono nft-trait-teaser__number">0{index+1} / {group.trait}</span><h3>{group.label}</h3><ul aria-label={`${group.trait} examples`}>{group.examples.map(value=><li key={value}>{value}</li>)}</ul></div>)}</div>
      <p className="nft-trait-teaser__note">A selection of possible traits. Individual combinations stay sealed.</p>
    </section>
    <section className="chapter nft-collection" aria-labelledby="nft-collection-title"><div className="chapter__head"><span className="chapter__no">#</span><h2 id="nft-collection-title">Meet the collection</h2><p>Artwork and rarity stay concealed until minting.</p></div><div className="nft-toolbar"><div className="nft-tabs" aria-label="Collection view"><button className={`btn ${tab==='collection'?'btn--primary':''}`} aria-pressed={tab==='collection'} onClick={()=>setTab('collection')}>All identities <span className="mono">300</span></button><button className={`btn ${tab==='mine'?'btn--primary':''}`} aria-pressed={tab==='mine'} onClick={()=>setTab('mine')}>My identities{snapshot?` (${snapshot.owned.length})`:''}</button></div><label className="nft-search"><span className="sr-only">Search identity number</span><input className="text" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Identity number…"/></label></div>
    <p className="nft-rarity-note">Every identity has the same 50,000 CLUNK backing. Discover its artwork and rarity after minting.</p>
    {assetError&&<p className="note">The reveal could not load. Refresh the vault to try again. Your NFT ownership is unchanged.</p>}
    {tab==='mine'&&!wallet.address?<div className="nft-empty"><h3>Your corner of the notebook.</h3><p>Connect your wallet to see the identities you own.</p><button className="btn" onClick={openWallet}>Connect Wallet</button></div>:tab==='mine'&&!configured?<div className="nft-empty"><h3>Your collection starts at launch.</h3><p>Minted and received identities will appear here once the vault is live.</p></div>:tab==='mine'&&loading?<p role="status">Finding your identities…</p>:tab==='mine'&&error?<div className="nft-empty"><h3>Couldn’t read your collection.</h3><p>Refresh the vault to try again. Your NFTs stay in your wallet.</p></div>:visible.length===0?<div className="nft-empty"><h3>{search?'No matching identities.':'No identities in this wallet yet.'}</h3>{search?<button className="btn btn--sm" onClick={()=>{setSearch('');}}>Clear search</button>:<button className="btn btn--sm" onClick={()=>setTab('collection')}>Explore collection</button>}</div>:<div className="nft-grid">{visible.map(id=><button type="button" className="nft-card" key={id} aria-label={`Clunk ${number(id)} · ${rarityFor(id)??'Unrevealed'}`} onClick={()=>{setRecipient('');setSelected(id);}}>{artwork(id)}<div className="nft-card__caption"><strong>Clunk {number(id)}</strong>{rarityFor(id)?<span className={`nft-rarity-badge rarity--${rarityKey(rarityFor(id)!)}`}>{rarityFor(id)}</span>:<span>Artwork & rarity concealed</span>}<span>{stateLabel(id)}</span></div></button>)}</div>}

    {filtered.length>24&&<nav className="nft-pagination" aria-label="Collection pages"><button className="btn btn--sm" disabled={currentPage===0} onClick={()=>setPage(p=>p-1)}>Previous</button><span className="mono">{currentPage+1} / {pages}</span><button className="btn btn--sm" disabled={currentPage===pages-1} onClick={()=>setPage(p=>p+1)}>Next</button></nav>}
    </section>
    <details className="nft-explainer"><summary>How minting, ownership, and redemption work</summary><OwnershipWalkthrough/></details>
    <section className="nft-notes"><div><h3>Tokens back, not dollars back.</h3><p>Redemption returns 50,000 CLUNK. Its market value can change. Transferring or redeeming never resets your lifetime direct mint.</p></div><div><h3>A new owner gets the backing.</h3><p>Receiving an NFT includes the right to redeem it. A redeemed identity returns to the available pool. Network gas applies.</p></div></section>
    <p className="note nft-related">Read the <Link to="/docs">whitepaper</Link> · Explore <Link to="/rewards">proposed rewards</Link> · <Link to="/marketplace">Marketplace</Link></p>
    {selected!==null&&<Dialog title={`Clunk ${number(selected)}`} onClose={()=>setSelected(null)}><div className="nft-detail">{artwork(selected,true)}<div className="stack"><span className="eyebrow">{stateLabel(selected)}</span><span className={rarityFor(selected)?`nft-rarity-badge rarity--${rarityKey(rarityFor(selected)!)}`:'note'}>{rarityFor(selected)??'Artwork and rarity reveal after minting.'}</span><h3>A notebook identity.</h3><p>50,000 CLUNK backing per minted NFT. Every identity has the same backing.</p><dl className="nft-traits">{selectedEntry?.attributes.map(t=><div key={t.trait_type}><dt>{t.trait_type}</dt><dd>{t.value}</dd></div>)}</dl>{selectedEntry&&<a href={art(selected)} target="_blank" rel="noreferrer">View full artwork</a>}{selectedOwned?<><button className="btn btn--primary" disabled={blocked} onClick={()=>{setSelected(null);setConfirm({id:selected,kind:'redeem'});}}>Redeem 50,000 CLUNK</button><label className="field"><span>Send to another wallet</span><input className="text mono" value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="0x…"/></label><button className="btn" disabled={blocked||!/^0x[a-fA-F0-9]{40}$/.test(recipient.trim())} onClick={()=>{setSelected(null);setConfirm({id:selected,kind:'transfer',recipient:recipient.trim()});}}>Review transfer</button></>:<p className="note">{!enabled?'Minting opens after launch.':`Minting assigns the next available identity${snapshot?.next?` (${number(snapshot.next)})`:''}.`}</p>}</div></div></Dialog>}
    {confirm&&<Dialog title={confirm.kind==='redeem'?'Redeem this identity?':'Transfer this identity?'} onClose={()=>setConfirm(null)} className="nft-dialog--confirm"><div className="stack"><div className="nft-confirm-art">{artwork(confirm.id)}</div><p>{confirm.kind==='redeem'?`Clunk ${number(confirm.id)} will be burned. Its 50,000 CLUNK backing returns to your connected wallet, and the identity becomes available for minting again.`:`Clunk ${number(confirm.id)} and the right to redeem its 50,000 CLUNK backing will be sent to:`}</p>{confirm.recipient&&<p className="mono nft-hash">{confirm.recipient}</p>}<p className="note">This does not restore your direct mint. Network gas applies.</p><button className="btn btn--primary" disabled={blocked} onClick={()=>{const c=confirm;setConfirm(null);void act(c.kind,c.id,c.recipient);}}>{confirm.kind==='redeem'?'Burn NFT & redeem':'Confirm transfer in wallet'}</button><button className="btn btn--quiet" onClick={()=>setConfirm(null)}>Keep my identity</button></div></Dialog>}
  </div>;
}
