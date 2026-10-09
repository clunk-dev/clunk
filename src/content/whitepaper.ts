// REQ-21: onsite summary of all 21 chapters of the CLUNK Whitepaper v1.0 (status: Proposed design).
// Summaries keep the source's quantities, fees, caveats and operator controls. Source read 7 Oct 2026.

export interface Chapter {
  n: number;
  title: string;
  summary: string[];
  points?: string[];
  table?: { head: [string, ...string[]]; rows: string[][] };
  caveats: string[];
  routes?: { path: string; label: string }[];
}

export const chapters: Chapter[] = [
  {
    n: 1,
    title: 'Executive summary',
    summary: [
      'Clunk is an AI-guided crypto project designed for Robinhood Chain. One token is meant to gain new functions over time while keeping the same contract address.',
      'Through a custom, upgradeable Uniswap v4 hook and connected application contracts, it proposes trading-funded development, buybacks, burns, automatic liquidity, redeemable NFT vaults, games and price prediction markets. Clunk is also the AI character that gathers ideas and documents development in a public journal.',
    ],
    caveats: ['The whitepaper describes an intended system. Each feature becomes operational only after its contracts, dependencies and activation details are published.'],
    routes: [{ path: '/how-it-works', label: 'How it works' }],
  },
  {
    n: 2,
    title: 'Meet Clunk',
    summary: [
      'Clunk explores what a token can do beyond its first release. Community suggestions become research topics, research can become development proposals, and approved proposals can become tested contracts and applications.',
    ],
    points: [
      'Reading and discussing community suggestions',
      'Explaining existing features',
      'Researching possible additions',
      'Helping prepare code and tests',
      'Publishing development notes',
      'Tracking results of released experiments',
    ],
    caveats: [
      'Clunk runs on offchain AI services and approved tools. Operators review production changes and manage authorized deployments.',
      'The character does not imply unrestricted AI control over contracts, funds or user assets.',
    ],
    routes: [{ path: '/clunk', label: 'Clunk ideas' }],
  },
  {
    n: 3,
    title: 'One token that can keep developing',
    summary: [
      'The token keeps balances and transfers. The trading hook adds behavior around eligible pool activity, and separate contracts provide applications that use the same token.',
      'A trade could fund development, buy tokens to burn, build liquidity, contribute to NFT rewards or create a game event. New functions can sit alongside earlier ones or replace them through a documented upgrade process.',
    ],
    caveats: ['An unchanged contract address does not mean unchanged rules. Material changes will be disclosed before activation.'],
    routes: [{ path: '/how-it-works', label: 'How it works' }],
  },
  {
    n: 4,
    title: 'Network and system architecture',
    summary: ['The proposed architecture has five components on Robinhood Chain.'],
    table: {
      head: ['Component', 'Role'],
      rows: [
        ['Token contract', 'ERC-20 balances, transfers, allowances and supply accounting.'],
        ['Main trading pool', 'A designated Uniswap v4 pool; initial design quotes against ETH with ETH-denominated fee accounting.'],
        ['Upgradeable trading hook', 'Adds behavior around eligible pool transactions; implementation can change through an authorized upgrade while keeping the hook address.'],
        ['Application contracts', 'NFT vaults, reward accounting, marketplace, prediction markets and other approved features.'],
        ['Backend services', 'Offchain AI inference, indexing, external observations, scheduled processing and website data.'],
      ],
    },
    caveats: [
      'Hook permissions are fixed when the pool is created; future implementations stay constrained by those permissions and the protocol.',
      'Backend responsibilities, permissions and failure behavior will be documented.',
    ],
    routes: [{ path: '/how-it-works', label: 'How it works' }],
  },
  {
    n: 5,
    title: '$CLUNK token design',
    summary: [
      'Proposed initial supply: 1,000,000,000 CLUNK. No routine inflation and no extra emissions for NFT minting. Buybacks and burns can reduce supply; NFT deposits move existing tokens into vaults without creating new ones.',
    ],
    points: [
      'Tokens made available through the launch',
      'Initial liquidity contributions',
      'Team or treasury allocations, if any',
      'Vesting arrangements',
      'Ownership and withdrawal rights over liquidity positions',
    ],
    caveats: [
      'The allocation details above must be finalized and disclosed before launch.',
      'The whitepaper does not establish a fair launch, zero team allocation, locked liquidity or burned developer holdings.',
      'The verified token address will be published after deployment.',
    ],
    routes: [{ path: '/burn', label: 'Buyback and burn' }, { path: '/vaults', label: 'NFT vaults' }],
  },
  {
    n: 6,
    title: 'Trading-funded development',
    summary: ['A 2% project fee on eligible buys and sells in the designated main pool, calculated on the trade’s ETH value.'],
    table: {
      head: ['Destination', 'Share of eligible volume'],
      rows: [
        ['Operations and development', '1.00%'],
        ['NFT holder rewards', '0.35%'],
        ['Clunk activity-wallet buybacks', '0.15%'],
        ['Buyback, burn and liquidity', '0.50%'],
        ['Total project fee', '2.00%'],
      ],
    },
    points: ['AI computation', 'Hosting and indexing', 'Engineering and maintenance', 'Research', 'Security reviews', 'External data and processing services'],
    caveats: [
      'LP fees, protocol fees, routing charges, gas and price impact may apply separately.',
      'Trades elsewhere and ordinary transfers do not automatically produce project revenue.',
      'Revenue depends on actual trading; lower volume can require reduced spending or additional disclosed funding.',
    ],
    routes: [{ path: '/funding', label: 'Funding' }],
  },
  {
    n: 7,
    title: 'Buyback and burn',
    summary: ['Part of eligible revenue buys $CLUNK and burns it: accumulate allocated fees, purchase through the designated route, burn the purchased tokens. Processing may run in batches with thresholds and slippage controls.'],
    caveats: [
      'Reporting will separate mechanism burns from direct holder burns.',
      'Burns reduce supply permanently but do not guarantee price appreciation, liquidity or a minimum market value.',
    ],
    routes: [{ path: '/burn', label: 'Buyback and burn' }],
  },
  {
    n: 8,
    title: 'Automatic liquidity',
    summary: ['Fees accumulate until a threshold, initially about $500 equivalent. A processor uses part of the ETH to buy $CLUNK and contributes both assets to the designated liquidity position. The threshold can change through the published parameter process.'],
    points: ['Initial launch liquidity', 'Operator contributions', 'Cumulative fee-funded additions', 'Current liquidity available in the pool'],
    caveats: ['Liquidity ownership and withdrawal rights will be disclosed before activation.', 'Adding liquidity does not mean the position is permanently locked.'],
    routes: [{ path: '/liquidity', label: 'Liquidity' }],
  },
  {
    n: 9,
    title: 'Weather switch',
    summary: ['Weather at London Heathrow changes how the 0.50% burn and liquidity allocation is divided. The total project fee stays the same.'],
    table: {
      head: ['Weather state', 'Buyback and burn', 'Liquidity'],
      rows: [
        ['Rain', '0.35%', '0.15%'],
        ['Dry', '0.15%', '0.35%'],
        ['No valid recent report', '0.25%', '0.25%'],
      ],
    },
    caveats: [
      'A reporting service is intended to sign observations about every four hours; reports expire no later than six hours after observation, then the split returns to equal.',
      'The reporter is a trusted data provider: its signature authenticates the reporter, not the physical weather.',
      'Provider, signing address, source and validation rules will be published before activation.',
    ],
    routes: [{ path: '/weather', label: 'Weather switch' }],
  },
  {
    n: 10,
    title: 'Clunk activity wallet',
    summary: ['0.15% of eligible volume buys $CLUNK for a publicly identified activity wallet that supports Clunk’s onchain experiments. Purchased tokens stay in circulation unless later burned.'],
    points: ['The wallet address', 'Who controls it', 'Permitted uses', 'Token transfers and spending', 'Any confirmed external integrations'],
    caveats: ['Activity-wallet purchases will be reported separately from buybacks that burn tokens.'],
    routes: [{ path: '/activity', label: 'Activity wallet' }],
  },
  {
    n: 11,
    title: 'Token identity',
    summary: ['Controlled updates to the token’s displayed name and ticker allow temporary identity experiments. A metadata change keeps the contract address and balances and does not by itself change supply.'],
    caveats: ['Wallets and trading platforms may keep showing older metadata until they refresh.', 'Every identity change will be announced and recorded in the public journal.'],
    routes: [{ path: '/identity', label: 'Token identity' }],
  },
  {
    n: 12,
    title: 'Clunk NFT vaults',
    summary: [
      '300 fixed NFT identities, each backed by 50,000 deposited CLUNK; 15,000,000 CLUNK at full capacity. Minting creates no new supply.',
      'Each wallet gets one direct mint; transferring or redeeming does not reset it. More NFTs can be acquired by purchase or transfer. The current owner can burn an NFT to redeem its 50,000 tokens with no holding lock, and a redeemed identity can return to the mint pool.',
    ],
    caveats: [
      'The whitepaper proposes randomness where a supported provider exists. Implementation note: the prepared vault assigns the lowest available identity deterministically; verifiable randomness is not enabled. Artwork and rarity are concealed until mint confirmation. Previously revealed identities retain their artwork when redeemed and reminted.',
      'Redemption returns tokens, not their original dollar value.',
    ],
    routes: [{ path: '/vaults', label: 'NFT vaults' }],
  },
  {
    n: 13,
    title: 'NFT holder rewards',
    summary: ['While NFTs are outstanding, 0.35% of eligible volume goes to holders by time-weighted ownership over an intended 24-hour period. All identities earn at the same rate; rarity does not change it. Transfers split accrued rewards by ownership time.'],
    caveats: [
      'Payments are intended to run in batches; failed payments stay accounted for through a retry or claim process.',
      'With no NFTs outstanding, the allocation returns to operations.',
      'No fixed APY, minimum payout or guaranteed return. Ordinary CLUNK holdings alone earn no NFT share.',
    ],
    routes: [{ path: '/rewards', label: 'NFT rewards' }],
  },
  {
    n: 14,
    title: 'NFT marketplace',
    summary: ['Fixed-price ETH listings. A completed sale pays 98% to the seller and 2% to the project wallet, separate from the trading fee. Normal transfers and redemptions carry no marketplace fee.'],
    caveats: ['External marketplaces have their own rules; support must be confirmed.', 'A listing is an asking price, not realized value or guaranteed liquidity.'],
    routes: [{ path: '/marketplace', label: 'Marketplace' }],
  },
  {
    n: 15,
    title: 'Clunk’s Rising Tide',
    summary: ['A proposed free singleplayer climbing game. Players climb while water rises; eligible trades can create extra waves or events. The initial design includes immediate play and a leaderboard.'],
    caveats: [
      'No token rewards, cash prizes or earnings.',
      'Trade-to-wave rules, event limits and behavior during indexing interruptions will be published.',
    ],
    routes: [{ path: '/rising-tide', label: 'Rising Tide' }],
  },
  {
    n: 16,
    title: 'Higher or Lower',
    summary: [
      'A proposed ETH-funded prediction game on CLUNK’s pool-derived market cap. Pick a target and an expiry from two hours to seven days, then stake on Higher or Lower. Creating a prediction has no project fee (gas applies); entering and exiting early each cost 2%, and both close 40 minutes before expiry.',
      'Settlement uses the average over the final 30 minutes. At the target both sides get their remaining net stakes back. At 5% deviation half of the losing side’s net stakes transfer; at 10% or more, all of it. Each side splits proportionally. The 10% band defines payouts; it does not limit price movement.',
    ],
    caveats: [
      'If one side is empty, or usable observations are missing after a one-hour grace period, net stakes are refundable; fees already charged are not.',
      'Wager funds stay separate from pool liquidity and NFT backing.',
      'Participants can trade CLUNK to influence the price; averaging does not remove manipulation risk. You can lose your entire stake.',
      'Activation depends on technical and legal review; the observation service, permissions, funding and geographic availability will be disclosed first.',
    ],
    routes: [{ path: '/higher-or-lower', label: 'Higher or Lower' }],
  },
  {
    n: 17,
    title: 'Clunk’s Notebook',
    summary: ['The public record of development. Material release records are meant to include an onchain reference or content hash linking the announcement to its evidence. Corrections get a new entry and the original is preserved.'],
    points: ['Community ideas under consideration', 'Development proposals', 'Released mechanisms', 'Contract addresses and transactions', 'Parameter changes', 'Test evidence', 'Known limitations', 'Operator involvement', 'Corrections'],
    caveats: ['The Notebook is a development history; it does not replace independent code review.'],
    routes: [{ path: '/notebook', label: 'Notebook' }],
  },
  {
    n: 18,
    title: 'Upgrades and administration',
    summary: ['Adaptability depends on authorized upgrades. The proposed control model uses a multisignature administrator and a public timelock for material upgrades. AI services assist but get no unrestricted production upgrade authority.'],
    points: ['Intended behavior', 'Implementation address', 'Relevant test results', 'Effects on existing contracts', 'Changes to fees or permissions', 'Activation timing'],
    caveats: [
      'Administrator addresses, approval threshold, delay and emergency permissions will be published before launch.',
      'The same token address does not guarantee unchanged application rules or contract risk.',
    ],
    routes: [{ path: '/how-it-works', label: 'How it works' }],
  },
  {
    n: 19,
    title: 'Launch requirements',
    summary: ['Clunk needs a compatible launch and pool-creation process. A third-party token launch does not automatically provide the hook. If a launchpad lacks custom-hook support, Clunk must use another pool-creation process or disclose the limits of separate application contracts.'],
    caveats: ['Randomness, oracle, social, wallet and marketplace integrations each need verification.', 'Verified deployment addresses and status will be published for each released feature.'],
  },
  {
    n: 20,
    title: 'Risks and limitations',
    summary: ['Clunk is experimental. Principal risks:'],
    points: ['Smart-contract defects', 'Compromised administrator keys', 'Unsafe upgrades', 'Market volatility', 'Insufficient liquidity', 'External-service failures', 'Price manipulation', 'Operating revenue below project costs'],
    caveats: [
      'NFT redemption depends on working contracts and preserved backing; no dollar-value guarantee.',
      'AI output can be inaccurate or insecure and needs review.',
      'Rewards and funding depend on actual activity; burns, buybacks and liquidity additions do not guarantee returns.',
      'Deployment on Robinhood Chain does not imply endorsement by Robinhood.',
      'A feature is not operational just because it appears in the whitepaper.',
    ],
  },
  {
    n: 21,
    title: 'Closing statement',
    summary: ['Clunk starts with one token and a notebook of possibilities: trading can support development, NFT vaults connect deposited tokens with fee participation, games can respond to market activity, and new apps can extend the same foundation.'],
    caveats: ['Every addition must be supported by published contracts, clear rules and evidence of activation.'],
  },
];
