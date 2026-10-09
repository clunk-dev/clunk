// REQ-20: the single source for launch metadata and per-feature status.
// Replace values here only with verified launch data. Setting the contract address
// alone never activates a utility: each feature's mode is set separately below.

export type FeatureMode = 'prelaunch' | 'live';

export interface LaunchConfig {
  name: string;
  ticker: string;
  tickerConfirmed: boolean; // OD-01
  contractAddress: string | null; // OD-02
  chain: { name: string; chainId: number | null; explorerUrl: string | null }; // OD-03
  xUrl: string | null; // REQ-25
  /** Public site URL (https://…). Used for "Open in wallet app" links on phones. */
  siteUrl: string | null;
  buyUrl: string | null;
  chartUrl: string | null;
  whitepaper: { url: string; version: string; status: string; readOn: string };
  wallet: {
    /** Lets the modal ask an injected browser wallet for the public address (eth_requestAccounts only). */
    injectedProviderEnabled: boolean;
    /** Lets visitors continue with a public address they paste (address only, nothing is requested). */
    allowManualAddress: boolean;
  };
  features: Record<FeatureKey, FeatureMode>;
}

export type FeatureKey =
  | 'funding' | 'burn' | 'liquidity' | 'weather' | 'activity' | 'identity'
  | 'vaults' | 'rewards' | 'marketplace' | 'risingTide' | 'higherOrLower' | 'clunk'
  | 'notebook' | 'docs' | 'howItWorks' | 'contractAddress';

export const launch: LaunchConfig = {
  name: 'Clunk',
  ticker: '$CLUNK',
  tickerConfirmed: false,
  contractAddress: null,
  chain: { name: 'Robinhood Chain', chainId: null, explorerUrl: null },
  xUrl: null,
  siteUrl: 'https://clunk.lat',
  buyUrl: null,
  chartUrl: null,
  whitepaper: {
    url: 'https://docs.google.com/document/d/1pqyIVNMTZmVCfYjgdQy7Wy7vJMUtnHQqVn-qwEJPWbo/edit?usp=sharing',
    version: '1.0',
    status: 'Proposed design',
    readOn: '7 October 2026',
  },
  wallet: { injectedProviderEnabled: true, allowManualAddress: true },
  features: {
    // 'live' only after the feature's contract is deployed and verified. Until then on-chain actions
    // route through the wallet-gated launch notice. Setting the contract address alone changes nothing here.
    funding: 'prelaunch', burn: 'prelaunch', liquidity: 'prelaunch', weather: 'prelaunch', activity: 'prelaunch', identity: 'prelaunch',
    vaults: 'prelaunch', rewards: 'prelaunch', marketplace: 'prelaunch', risingTide: 'prelaunch', higherOrLower: 'prelaunch', clunk: 'prelaunch',
    notebook: 'live', docs: 'live', howItWorks: 'live',
    contractAddress: 'prelaunch',
  },
};
