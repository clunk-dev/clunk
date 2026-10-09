// On-chain actions. Each one asks for a wallet first; with a wallet connected it explains that the action
// opens when the contracts launch. No transaction, signature or approval is ever requested.
import { type ReactNode, useEffect, useId, useRef } from 'react';
import { launch } from '../config/launch';
import { Link } from '../lib/router';
import { requestTx, shortAddress, txNotice, useStore, walletStore } from '../lib/runtime';
import { ClunkMark } from './brand';

/** Prelaunch NFT actions show availability immediately, without requiring a wallet. */
export function showNftComingSoon(action: string) {
  txNotice.set({ action, kind: 'nft' });
}

export function TxButton({ action, className = 'btn btn--primary', disabled, children, onBeforeRequest, comingSoon }: {
  /** Short verb phrase shown in the wallet prompt and launch notice, e.g. "Mint an identity". */
  action: string;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
  /** Return false to stop (for example, when the form has an error). */
  onBeforeRequest?: () => boolean;
  comingSoon?: 'nft';
}) {
  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      onClick={() => {
        if (comingSoon === 'nft') { showNftComingSoon(action); return; }
        if (onBeforeRequest && !onBeforeRequest()) return;
        requestTx(action);
      }}
    >
      {children}
    </button>
  );
}

export function LaunchNotice() {
  const notice = useStore(txNotice);
  const w = useStore(walletStore);
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (notice && !d.open) d.showModal();
    if (!notice && d.open) d.close();
  }, [notice]);

  const close = () => txNotice.set(null);

  return (
    <dialog ref={ref} className="modal" aria-labelledby={titleId} onClose={close} onCancel={close}>
      <div className="modal__head">
        <h2 id={titleId} style={{ fontSize: 'var(--step-2)' }}>{notice?.kind === 'nft' ? 'Coming Soon' : `${notice?.action ?? 'This action'} opens at launch`}</h2>
        <button type="button" className="btn btn--sm" onClick={close}>Close</button>
      </div>
      <div className="modal__body">
        <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
          <ClunkMark className="stamp" />
          {notice?.kind === 'nft' ? <p>{notice.action === 'Mint an identity' ? 'Identity minting is coming soon. You’ll be able to deposit CLUNK and reveal your Identity once the NFT vault is deployed and minting opens.' : 'The Clunk NFT marketplace is coming soon. Buying and listing Identities will open once the marketplace contracts are deployed and enabled.'}</p> : <p>
            Clunk’s contracts on {launch.chain.name} aren’t deployed yet, so this can’t go through today.
            Nothing was sent to {w.address ? <span className="mono">{shortAddress(w.address)}</span> : 'your wallet'} and no funds moved.
          </p>}
        </div>
        {notice?.kind === 'nft' ? <p className="note">Explore the collection and trait teaser while you wait.</p> : <p className="note">
          When the contracts launch, the official address will be posted on this site. Be careful with any token or link claiming to be Clunk before then.
        </p>}
        <div className="row">
          <button type="button" className="btn btn--primary" onClick={close}>Got it</button>
          <Link className="btn btn--quiet" to="/docs" anchor="wp-19" onClick={close}>Read the launch requirements</Link>
        </div>
      </div>
    </dialog>
  );
}
