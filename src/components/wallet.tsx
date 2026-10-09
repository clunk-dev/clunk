// Connect wallet: lists every detected wallet (EIP-6963 + legacy), opens wallet apps on phones,
// and accepts a pasted address as a fallback. Address only: no signatures, approvals or transactions.
import { useEffect, useId, useRef, useState } from 'react';
import { launch } from '../config/launch';
import { closeWallet, shortAddress, useStore, walletConnected, walletStore, walletUi } from '../lib/runtime';
import { chainLabel, connectWith, disconnectWallet, isEmbedded, isMobile, rescan, siteUrl, walletAppLinks, walletOptions, WalletError, wrongNetwork, type WalletOption } from '../lib/wallets';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function WalletIcon({ src, name }: { src: string | null | undefined; name: string }) {
  if (src) return <img className="wallet-icon" src={src} alt="" width={28} height={28} />;
  return <span className="wallet-icon wallet-icon--blank" aria-hidden="true">{name.slice(0, 1)}</span>;
}

export function WalletModal() {
  const ref = useRef<HTMLDialogElement>(null);
  const attempt = useRef<AbortController | null>(null);
  const ui = useStore(walletUi);
  const w = useStore(walletStore);
  const options = useStore(walletOptions);
  const [manual, setManual] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const inputId = useId();
  const titleId = useId();
  const mobile = isMobile();
  const url = siteUrl();

  const cancelConnection = () => {
    attempt.current?.abort();
    attempt.current = null;
    setBusy(null);
  };
  const close = () => {
    cancelConnection();
    closeWallet();
  };
  useEffect(() => () => { attempt.current?.abort(); }, []);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (ui.open && !d.open) {
      setError(null);
      rescan();
      d.showModal();
    }
    if (!ui.open) {
      cancelConnection();
      if (d.open) d.close();
    }
  }, [ui.open]);

  const connect = async (o: WalletOption) => {
    if (attempt.current) return;
    const controller = new AbortController();
    attempt.current = controller;
    setBusy(o.id);
    setError(null);
    try {
      await connectWith(o, controller.signal);
      if (attempt.current !== controller) return;
      walletConnected();
    } catch (e) {
      if (attempt.current !== controller || controller.signal.aborted) return;
      setError(e instanceof WalletError ? e.message : `${o.name} didn’t respond. Unlock it and try again.`);
    } finally {
      if (attempt.current === controller) {
        attempt.current = null;
        setBusy(null);
      }
    }
  };

  const useManual = () => {
    const a = manual.trim();
    if (!ADDRESS_RE.test(a)) {
      setError('Enter a wallet address: 0x followed by 40 letters and numbers.');
      return;
    }
    cancelConnection();
    setError(null);
    walletStore.set({ address: a, source: 'manual', walletName: 'Address', walletIcon: null, chainId: null });
    walletConnected();
  };

  const title = w.address ? 'Your wallet' : ui.reason ? 'Connect a wallet to continue' : 'Connect wallet';

  return (
    <dialog ref={ref} className="modal" aria-labelledby={titleId} onClose={close} onCancel={close}>
      <div className="modal__head">
        <h2 id={titleId} style={{ fontSize: 'var(--step-2)' }}>{title}</h2>
        <button type="button" className="btn btn--sm" onClick={close}>Close</button>
      </div>
      <div className="modal__body">
        {ui.reason && !w.address && <p className="panel"><strong>{ui.reason}</strong> needs a connected wallet.</p>}

        {w.address ? (
          <div className="stack">
            <div className="panel stack" style={{ ['--gap' as string]: '8px' }}>
              <div className="row">
                <WalletIcon src={w.walletIcon} name={w.walletName ?? 'Wallet'} />
                <strong>{w.walletName ?? 'Wallet'}</strong>
                {w.source === 'injected' && <span className="note">· {chainLabel(w.chainId ?? null)}</span>}
              </div>
              <p className="mono" style={{ overflowWrap: 'anywhere' }} title={w.address}>{w.address}</p>
              {wrongNetwork(w.chainId ?? null) && <p className="field__error">Switch your wallet to {launch.chain.name} before making a transaction.</p>}
            </div>
            <div className="row">
              <button type="button" className="btn" onClick={() => { disconnectWallet(); setManual(''); }}>Disconnect</button>
              <button type="button" className="btn btn--primary" onClick={closeWallet}>Done</button>
            </div>
          </div>
        ) : (
          <>
            {options.length > 0 && (
              <section className="stack" style={{ ['--gap' as string]: '8px' }} aria-label="Detected wallets">
                <span className="eyebrow">Detected on this device</span>
                <ul className="wallet-list">
                  {options.map((o) => (
                    <li key={o.id}>
                      <button type="button" className="wallet-option" onClick={() => connect(o)} disabled={!!busy}>
                        <WalletIcon src={o.icon} name={o.name} />
                        <span>{o.name}</span>
                        <span className="wallet-option__state">{busy === o.id ? 'Check your wallet…' : 'Connect'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {busy && (
              <div className="panel stack" role="status">
                <p>Open and unlock {options.find((o) => o.id === busy)?.name ?? 'your wallet'}, then approve Clunk’s connection request. If your wallet already has a request waiting, approve or decline that request first.</p>
                <p className="note">If no prompt appears, open Clunk in its own browser tab or in your wallet app’s browser.</p>
                <div className="row">
                  <button type="button" className="btn btn--sm" onClick={cancelConnection}>Stop waiting</button>
                  {isEmbedded() && url && <a className="btn btn--sm" href={url} target="_blank" rel="noopener noreferrer">Open Clunk in a new tab</a>}
                </div>
                <p className="note">Stopping here does not dismiss a request already open in your wallet.</p>
              </div>
            )}

            {options.length === 0 && mobile && (
              <section className="stack" style={{ ['--gap' as string]: '8px' }} aria-label="Wallet apps">
                <span className="eyebrow">Open in your wallet app</span>
                {url ? (
                  <>
                    <ul className="wallet-list">
                      {walletAppLinks(url).map((l) => (
                        <li key={l.name}>
                          <a className="wallet-option" href={l.href} target="_blank" rel="noopener noreferrer">
                            <WalletIcon src={null} name={l.name} />
                            <span>{l.name}</span>
                            <span className="wallet-option__state">Open</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                    <p className="note">Clunk opens inside the wallet’s own browser, where you can connect.</p>
                  </>
                ) : (
                  <p className="note">Phone browsers don’t include a wallet. Open {launch.name}’s website address in your wallet app’s browser (MetaMask, Trust Wallet or Coinbase Wallet) to connect.</p>
                )}
              </section>
            )}

            {options.length === 0 && !mobile && (
              <section className="panel stack" style={{ ['--gap' as string]: '8px' }} aria-label="No wallet found">
                <strong>No wallet found in this browser</strong>
                <p className="note">
                  {isEmbedded()
                    ? 'This page is shown inside another site, and wallet extensions don’t load into embedded pages. Open it in its own tab to connect your extension.'
                    : 'Install a wallet extension such as MetaMask or Rabby, then reload this page.'}
                </p>
                <div><button type="button" className="btn btn--sm" onClick={() => rescan()}>Look again</button></div>
              </section>
            )}

            {launch.wallet.allowManualAddress && (
              showManual || options.length === 0 ? (
                <section className="stack" style={{ ['--gap' as string]: '10px' }} aria-label="Connect with an address">
                  <div className="field">
                    <label htmlFor={inputId}>Or connect with your wallet address</label>
                    <div className="input-wrap" data-invalid={error ? 'true' : undefined}>
                      <input id={inputId} type="text" placeholder="0x…" value={manual} onChange={(e) => setManual(e.target.value)} autoComplete="off" spellCheck={false} />
                    </div>
                    <p className="field__hint">Read-only: you can view and plan, and your wallet signs when you transact.</p>
                  </div>
                  <div className="row">
                    <button type="button" className="btn" onClick={useManual}>Connect address</button>
                  </div>
                </section>
              ) : (
                <div><button type="button" className="btn btn--quiet btn--sm" onClick={() => setShowManual(true)}>Use a wallet address instead</button></div>
              )
            )}
            {error && <p className="field__error" role="alert">{error}</p>}
            <p className="note">Clunk only reads your public address. It never asks for your recovery phrase, and every transaction appears in your wallet for you to approve.</p>
          </>
        )}
      </div>
    </dialog>
  );
}

export function WalletButton() {
  const w = useStore(walletStore);
  return (
    <button type="button" className={`btn btn--sm ${w.address ? '' : 'btn--primary'}`} onClick={() => walletUi.set({ open: true, reason: null })} aria-haspopup="dialog">
      {w.address ? (
        <>
          {w.walletIcon && <img className="wallet-icon wallet-icon--sm" src={w.walletIcon} alt="" width={18} height={18} />}
          <span className="mono">{shortAddress(w.address)}</span>
        </>
      ) : 'Connect wallet'}
    </button>
  );
}
