import type { FeatureKey } from './config/launch';

export type RouteGroup = 'Token mechanics' | 'NFT vaults' | 'Play' | 'Clunk' | 'Main';

export interface RouteMeta {
  path: string;
  title: string;
  short: string;
  group: RouteGroup;
  feature?: FeatureKey;
  sections: number[];
}

export const routes: RouteMeta[] = [
  { path: '/hooks', title: 'Hooks', short: 'Explore the mechanisms and apps connected to CLUNK.', group: 'Main', sections: [3, 6, 9, 12, 13] },
  { path: '/', title: 'Home', short: 'One token, every mechanism.', group: 'Main', sections: [1, 2, 3, 21] },
  { path: '/funding', title: 'Funding', short: 'Trace where a 2% trade fee goes.', group: 'Token mechanics', feature: 'funding', sections: [6, 13] },
  { path: '/burn', title: 'Buyback and burn', short: 'See a batch buy tokens and remove them from supply.', group: 'Token mechanics', feature: 'burn', sections: [5, 7] },
  { path: '/liquidity', title: 'Liquidity', short: 'Watch fees batch up toward the ~$500 threshold.', group: 'Token mechanics', feature: 'liquidity', sections: [8] },
  { path: '/weather', title: 'Weather switch', short: 'Rain, dry or stale report: how the 0.50% splits.', group: 'Token mechanics', feature: 'weather', sections: [9] },
  { path: '/activity', title: 'Activity wallet', short: 'Purchases that stay in circulation, not burns.', group: 'Token mechanics', feature: 'activity', sections: [10] },
  { path: '/identity', title: 'Token identity', short: 'Try a temporary name and ticker. The address stays.', group: 'Token mechanics', feature: 'identity', sections: [11] },
  { path: '/vaults', title: 'NFT vaults', short: 'Mint, transfer and redeem backed identities.', group: 'NFT vaults', feature: 'vaults', sections: [5, 12] },
  { path: '/rewards', title: 'NFT rewards', short: 'Share 0.35% of volume by ownership time.', group: 'NFT vaults', feature: 'rewards', sections: [13] },
  { path: '/marketplace', title: 'Marketplace', short: 'List, cancel and buy with a 98/2 split.', group: 'NFT vaults', feature: 'marketplace', sections: [14] },
  { path: '/rising-tide', title: 'Rising Tide', short: 'Climb before the water catches you.', group: 'Play', feature: 'risingTide', sections: [15] },
  { path: '/higher-or-lower', title: 'Higher or Lower', short: 'Call the market cap higher or lower.', group: 'Play', feature: 'higherOrLower', sections: [16] },
  { path: '/clunk', title: 'Clunk ideas', short: 'Bring an idea; see how Clunk would explore it.', group: 'Clunk', feature: 'clunk', sections: [2, 18] },
  { path: '/notebook', title: 'Notebook', short: 'Proposals, releases and corrections.', group: 'Clunk', feature: 'notebook', sections: [17] },
  { path: '/how-it-works', title: 'How it works', short: 'Token, pool, hook, apps and services, layer by layer.', group: 'Main', feature: 'howItWorks', sections: [3, 4, 18] },
  { path: '/docs', title: 'Whitepaper', short: 'All 21 chapters, summarized with sources.', group: 'Main', feature: 'docs', sections: [] },
];

export const experimentGroups: { group: RouteGroup; items: RouteMeta[] }[] = (['Token mechanics', 'NFT vaults', 'Play', 'Clunk'] as RouteGroup[]).map((g) => ({
  group: g,
  items: routes.filter((r) => r.group === g),
}));

export const metaFor = (path: string) => routes.find((r) => r.path === path);
