// Notebook entries. Every entry is sourced: whitepaper v1.0 proposals and the approved identity guide.
// Add release entries only with real evidence (contract addresses, transactions, test results) - REQ-13.

export type EntryState = 'proposal' | 'released' | 'correction' | 'update';
export interface NotebookEntry {
  id: string;
  /** Display date or version label. */
  when: string;
  /** Higher is newer. */
  order: number;
  title: string;
  mechanism: string;
  state: EntryState;
  next: string;
  body: string;
  evidence: { label: string; href: string }[];
  correctionOf?: string;
  sections: number[];
}

export const MECHANISMS = ['Fees', 'Weather', 'NFT vaults', 'Games', 'Predictions', 'Clunk'] as const;

export const notebook: NotebookEntry[] = [
  {
    id: 'nb-identity',
    when: '7 Oct 2026',
    order: 20,
    title: 'Brand identity approved: the Notebook Tinkerer',
    mechanism: 'Clunk',
    state: 'update',
    next: 'Commission the 300-identity collection artwork',
    body: 'Direction A is approved: a C-shaped tinkerer with mismatched eyes, two feet and a crown tab, drawn in paper, ink, cobalt and terracotta. One token, one persistent character.',
    evidence: [],
    sections: [2],
  },
  {
    id: 'nb-fees',
    when: 'Whitepaper v1.0',
    order: 10,
    title: 'Proposal: a 2% project fee split five ways',
    mechanism: 'Fees',
    state: 'proposal',
    next: 'Publish the hook contract and activation details',
    body: 'Eligible main-pool trades pay 2% of their ETH value: operations 1.00%, NFT rewards 0.35%, activity wallet 0.15%, and burn plus liquidity 0.50%. Other pools and wallet transfers pay nothing.',
    evidence: [],
    sections: [6],
  },
  {
    id: 'nb-weather',
    when: 'Whitepaper v1.0',
    order: 9,
    title: 'Proposal: London Heathrow weather sets burn vs liquidity',
    mechanism: 'Weather',
    state: 'proposal',
    next: 'Name the reporting provider and signing address',
    body: 'Rain sends 0.35% to burn and 0.15% to liquidity; dry weather reverses it. Reports arrive about every four hours and expire after six, falling back to 0.25% / 0.25%.',
    evidence: [],
    sections: [9],
  },
  {
    id: 'nb-vaults',
    when: 'Whitepaper v1.0',
    order: 8,
    title: 'Proposal: 300 identities, 50,000 CLUNK each',
    mechanism: 'NFT vaults',
    state: 'proposal',
    next: 'Confirm a verifiable randomness provider',
    body: 'Identities are backed by deposited CLUNK, one direct mint per wallet, redeemable by the current owner with no holding lock. Full capacity holds 15,000,000 CLUNK.',
    evidence: [],
    sections: [12],
  },
  {
    id: 'nb-rewards',
    when: 'Whitepaper v1.0',
    order: 7,
    title: 'Proposal: rewards by ownership time',
    mechanism: 'NFT vaults',
    state: 'proposal',
    next: 'Publish the batch payment and claim process',
    body: '0.35% of eligible volume is shared over 24-hour periods by how long each wallet held each identity. Rarity never changes the rate.',
    evidence: [],
    sections: [13],
  },
  {
    id: 'nb-tide',
    when: 'Whitepaper v1.0',
    order: 6,
    title: 'Proposal: Rising Tide, where trades make waves',
    mechanism: 'Games',
    state: 'proposal',
    next: 'Publish trade-to-wave rules and limits',
    body: 'A free climbing game where eligible pool trades add waves. No token rewards, cash prizes or earnings.',
    evidence: [],
    sections: [15],
  },
  {
    id: 'nb-hol',
    when: 'Whitepaper v1.0',
    order: 5,
    title: 'Proposal: Higher or Lower settles on a 30-minute average',
    mechanism: 'Predictions',
    state: 'proposal',
    next: 'Complete technical and legal review',
    body: 'Entering and exiting early cost 2% each and close 40 minutes before expiry. At 5% from target half the losing stakes transfer; at 10% or more, all of them.',
    evidence: [],
    sections: [16],
  },
  {
    id: 'nb-admin',
    when: 'Whitepaper v1.0',
    order: 4,
    title: 'Proposal: multisig and timelock for upgrades',
    mechanism: 'Clunk',
    state: 'proposal',
    next: 'Publish administrator addresses, threshold and delay',
    body: 'Material upgrades go through a multisignature administrator and a public timelock. Clunk researches and drafts but has no unrestricted upgrade authority.',
    evidence: [],
    sections: [2, 18],
  },
];

export interface IdeaTopic {
  key: string;
  label: string;
  keywords: string[];
  route: string;
  sections: number[];
  exists: string;
  research: string[];
  proposal: string;
}

export const ideaTopics: IdeaTopic[] = [
  {
    key: 'fees', label: 'Fees and funding', keywords: ['fee', 'fees', 'tax', 'revenue', 'fund', 'operations', 'split'], route: '/funding', sections: [6],
    exists: 'One proposed 2% project fee on eligible designated-pool trades, split across operations, NFT rewards, the activity wallet and burn plus liquidity.',
    research: ['How would the change affect operations funding at low volume?', 'Does it need a new hook implementation or only a parameter change?', 'What would the Notebook entry and disclosure need to say?'],
    proposal: 'Draft a parameter-change note with before/after splits and a worked 10 ETH example.',
  },
  {
    key: 'burn', label: 'Buybacks and burns', keywords: ['burn', 'buyback', 'supply', 'deflation'], route: '/burn', sections: [7],
    exists: 'Allocated fees buy $CLUNK in batches and burn it. Burns would be reported separately from holder burns.',
    research: ['What batch threshold and slippage limit keep execution predictable?', 'How should reporting separate mechanism burns from holder burns?'],
    proposal: 'Outline batch thresholds and a public burn report format.',
  },
  {
    key: 'liquidity', label: 'Liquidity', keywords: ['liquidity', 'lp', 'pool', 'depth'], route: '/liquidity', sections: [8],
    exists: 'Fees batch to about $500, then buy CLUNK and add both assets to the designated pool position.',
    research: ['Who owns the position and who can withdraw?', 'What purchase/contribution ratio should the processor use?'],
    proposal: 'Prepare a disclosure checklist for liquidity ownership and withdrawal rights.',
  },
  {
    key: 'weather', label: 'Weather switch', keywords: ['weather', 'rain', 'heathrow', 'london', 'dry', 'oracle'], route: '/weather', sections: [9],
    exists: 'Rain, dry or no valid report changes how the 0.50% splits between burn and liquidity.',
    research: ['Which reporting provider and signing address would be trusted?', 'What happens if reports stop for a day?'],
    proposal: 'Compare reporting providers and draft validation rules for review.',
  },
  {
    key: 'nft', label: 'NFT vaults and rewards', keywords: ['nft', 'vault', 'mint', 'redeem', 'identity', 'identities', 'reward', 'rewards', 'holder'], route: '/vaults', sections: [12, 13],
    exists: '300 identities, each backed by 50,000 CLUNK, sharing 0.35% of eligible volume by ownership time.',
    research: ['Which randomness provider is supported on the chain?', 'How should failed reward payments be retried or claimed?'],
    proposal: 'Draft the reward accounting spec and a failed-payment claim flow.',
  },
  {
    key: 'market', label: 'Marketplace', keywords: ['marketplace', 'listing', 'sell', 'buy nft', 'royalty'], route: '/marketplace', sections: [14],
    exists: 'Fixed-price ETH listings with 98% to the seller and 2% to the project.',
    research: ['How should stale listings be cleaned up after transfers?', 'Which external marketplaces could be supported?'],
    proposal: 'Write test cases for stale listings and failed purchases.',
  },
  {
    key: 'game', label: 'Games', keywords: ['game', 'games', 'rising', 'tide', 'play', 'leaderboard', 'wave'], route: '/rising-tide', sections: [15],
    exists: 'Rising Tide: a free climbing game where eligible trades could add waves. No prizes.',
    research: ['What wave limits keep the game fair during heavy trading?', 'How should the game behave when indexing is interrupted?'],
    proposal: 'Prototype wave limits and publish the trade-to-wave rules.',
  },
  {
    key: 'prediction', label: 'Predictions', keywords: ['predict', 'prediction', 'higher', 'lower', 'bet', 'wager', 'market cap'], route: '/higher-or-lower', sections: [16],
    exists: 'Higher or Lower: ETH stakes on pool-derived market cap with 2% entry and exit fees and banded settlement.',
    research: ['What legal review and geographic limits apply?', 'How can manipulation risk be explained and reduced?'],
    proposal: 'Prepare a risk disclosure and finalize interpolation rules (OD-04).',
  },
  {
    key: 'identity', label: 'Token identity', keywords: ['name', 'ticker', 'rename', 'metadata', 'symbol'], route: '/identity', sections: [11],
    exists: 'Controlled temporary name and ticker changes that keep the address, balances and supply.',
    research: ['How long do major wallets cache metadata?', 'What announcement and journal entry should precede a change?'],
    proposal: 'Draft an identity-change announcement template.',
  },
];

export const BLOCKED: { pattern: RegExp; reason: string }[] = [
  { pattern: /seed phrase|private key|mnemonic|recovery phrase/i, reason: 'Clunk never asks for or handles seed phrases or private keys. Never share them with anyone.' },
  { pattern: /guarantee|guaranteed|100x|moon|pump|risk[- ]?free|profit/i, reason: 'Clunk can’t explore ideas framed around guaranteed returns or price outcomes. Nothing in Clunk promises returns.' },
  { pattern: /send (me|tokens)|airdrop me|give me/i, reason: 'Clunk can’t move funds or send tokens. It has no custody or transaction authority.' },
  { pattern: /privacy buy|private buy|stealth buy|anonymous buy/i, reason: 'Private or stealth buying isn’t part of the Clunk design and isn’t explored here.' },
];

export const PRESET_IDEAS = [
  'Could the weather switch use more than one city?',
  'What if NFT rewards were paid weekly instead of daily?',
  'Add a second game that reacts to burns',
  'Make the marketplace fee lower for long-time holders',
];
