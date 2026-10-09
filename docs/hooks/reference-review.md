# Hooks reference review — 9 October 2026

Source: https://claus.si/Hooks and every linked hook, inspected in the virtual browser at a desktop viewport around 1360 × 940. This is observed interface behavior and page copy, not verification of contract security or financial execution. No wallet was connected and no transaction attempted.

| Reference hook | Observed interface and mechanism | Clunk application |
| --- | --- | --- |
| Privacy Buy `/Hooks/Privacy` | Two-column mascot/form. ETH deposit, recipient and slippage controls; expandable explanation describes approval, recovery file, device proof and relayer. | Excluded. Clunk PRD expressly excludes privacy buying. No external privacy integration is implied. |
| NFT Vaults `/Hooks/NFTs` | Collection totals, Mint/My NFTs/All 300 tabs; disconnected ownership view asks for wallet. Explanation describes 50,000-token backing, one direct mint, redemption and time-weighted rewards. | Existing Clunk vault, concealed identities, trait teaser and Coming Soon action. Clunk uses expected-ID minting, not the reference’s random assignment. |
| Higher or Lower `/Hooks/Predictions` | Markets/My positions tabs, market cards, target/expiry and entry controls. Expandable rules explain 2% entry/exit, 40-minute cutoff, final-30-minute average and refund conditions. | Existing Clunk settlement calculator and gated prediction action. No fabricated live market feed. |
| Rising Tide `/Hooks/Arena` | Game area and modal explaining movement, climbing and trade-driven waves. Game initially showed loading; help opened. Runtime gameplay was not validated. | Existing wallet-free Clunk climbing game, keyboard/touch controls and device-local best runs. |
| Project Funding `/Hooks/Funding` | Focused heading and text with expandable rules and wallet/weather/journal links. Explains five allocations within the 2% fee. | Clunk fee calculator plus new connected allocation workbench. Reference platform charge is not imported. |
| Buyback & Burn `/Hooks/Burn` | Burned-token total, expandable onchain information and mechanism description. Warns total includes direct holder burns. | Clunk batch calculator, execution assumptions and supply effect. No reference totals reused. |
| Auto Liquidity `/Hooks/Liquidity` | ETH/token cumulative-deposit totals, data disclosure and approximately $500 batching description. | Clunk batch controls, threshold and contributions. Cumulative additions are not presented as current liquidity. |
| Weather Switch `/Hooks/Weather` | Heathrow condition and paired percentage totals; rain/dry/expired-report rules in disclosure. | Clunk condition and age controls; six-hour expiry and equal fallback. No live weather claim. |
| FOMO Buybacks `/Hooks/Buybacks` | Tokens delivered and ETH spent; 0.15% allocation to recipient wallet, distinct from burns. | Clunk Activity Wallet. No Claus wallet, FOMO product or third-party integration copied. |
| Token Identity `/Hooks/Name` | Focused explainer, token/journal links; metadata changes preserve address/balances, wallets may cache names. | Existing Clunk name/ticker controls with invariant address, supply and balances. |

## Design decisions

Observed: the reference uses orange, black type, a mascot, a two-column numbered directory (8 entries then 2), large whitespace, focused detail pages and progressively disclosed explanations. Core monetary pages surface chain totals. Accessibility snapshots exposed semantic tabs and buttons; no complete keyboard or mobile audit was performed.

Adapted: a single eleven-entry directory avoids a nearly empty second page. Clunk keeps its paper grid, cobalt accents, Space Grotesk/IBM Plex type, original mark and hard-shadow calculator components. Numbered rows link to existing feature pages. NFT Rewards and Identity Marketplace are separate entries because they are explicit Clunk PRD features. A connected trade calculator exposes real input-derived calculations, with links from allocations to their mechanisms.

Latest user instructions override the PRD's older presentation requirement for simulation badges. The new page has no demo/simulation/test labels. It does not invent deployed-contract status, price feeds, balances, transactions or performance totals. Existing launch gating and protected NFT reveal behavior remain intact. Source whitepaper sections remain linked.

## Validation boundaries

Reference inspected in virtual browser; all ten hook explanations read. No reference transactions or authenticated states tested. Clunk integration is checked with type checking, DOM interaction tests and existing mechanics tests. A Clunk visual-browser pass was unavailable because the managed Sites preview requires the unavailable control-browser skill. Responsive CSS is included but no visual mobile verification is claimed.
