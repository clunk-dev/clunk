<p align="center"><a href="https://clunk.lat"><img src="docs/assets/clunk-banner.webp" width="100%" alt="Clunk mascot in a cobalt notebook dreamscape" /></a></p>
<h1 align="center">Clunk</h1>
<p align="center"><strong>One token. Plenty of ideas.</strong></p>
<p align="center">A curious character, backed NFT identities, and connected onchain mechanisms for Robinhood Chain.</p>
<p align="center"><a href="https://clunk.lat">Open Clunk</a> · <a href="https://clunk.lat/hooks">Hooks</a> · <a href="https://clunk.lat/docs">Whitepaper</a> · <a href="docs/GETTING_STARTED.md">Get started</a> · <a href="docs/ARCHITECTURE.md">Architecture</a></p>

<p align="center"><a href="https://github.com/clunk-dev/clunk/actions/workflows/types.yml"><img src="https://github.com/clunk-dev/clunk/actions/workflows/types.yml/badge.svg?branch=main" alt="TypeScript status" /></a> <a href="https://github.com/clunk-dev/clunk/actions/workflows/unit.yml"><img src="https://github.com/clunk-dev/clunk/actions/workflows/unit.yml/badge.svg?branch=main" alt="Unit tests status" /></a> <a href="https://github.com/clunk-dev/clunk/actions/workflows/interface.yml"><img src="https://github.com/clunk-dev/clunk/actions/workflows/interface.yml/badge.svg?branch=main" alt="Interface status" /></a> <a href="https://github.com/clunk-dev/clunk/actions/workflows/build.yml"><img src="https://github.com/clunk-dev/clunk/actions/workflows/build.yml/badge.svg?branch=main" alt="Build status" /></a> <a href="https://github.com/clunk-dev/clunk/actions/workflows/reveal.yml"><img src="https://github.com/clunk-dev/clunk/actions/workflows/reveal.yml/badge.svg?branch=main" alt="Reveal status" /></a> <a href="https://github.com/clunk-dev/clunk/actions/workflows/compile.yml"><img src="https://github.com/clunk-dev/clunk/actions/workflows/compile.yml/badge.svg?branch=main" alt="Solidity status" /></a> <a href="https://github.com/clunk-dev/clunk/actions/workflows/contracts.yml"><img src="https://github.com/clunk-dev/clunk/actions/workflows/contracts.yml/badge.svg?branch=main" alt="Vault status" /></a> <a href="https://github.com/clunk-dev/clunk/actions/workflows/integrity.yml"><img src="https://github.com/clunk-dev/clunk/actions/workflows/integrity.yml/badge.svg?branch=main" alt="Integrity status" /></a></p>

Clunk explores how one token can support changing mechanisms and applications while keeping its address. This repository contains the website, deterministic economic calculators, a free climbing game, the prepared NFT vault contract, wallet integration, and the server-side reveal gate.

## Explore Clunk

| Surface | What is included |
| --- | --- |
| Hooks | Eleven connected feature entries and an interactive trade-to-fee allocation calculator. |
| Token mechanisms | Funding, buyback and burn, liquidity batches, weather allocation, activity purchases, and name/ticker exploration. |
| NFT Vaults | 300 numbered Identities, each backed by 50,000 CLUNK; concealed artwork, ownership views, transfer and redemption integration. |
| NFT Rewards | Time-weighted allocation math, with equal weight for every Identity. |
| Marketplace | Listing interface and 98/2 sale calculations. Settlement contract is not implemented. |
| Rising Tide | Playable keyboard/touch climbing game and device-local best runs. |
| Higher or Lower | Target, expiry, positions, fees, cutoffs, settlement and refund calculations. |
| Notebook and Whitepaper | Local development entries, system explanations and all 21 whitepaper chapters. |

## Current implementation

The token has not launched in this source configuration. The vault contract is prepared and locally tested, but not deployed. Token address, chain ID, RPC and vault address remain unset; setting a token address alone does not enable a feature.

The calculators and game work locally. Financial controls show availability dialogs while contracts are unavailable. There is no live shared trading-hook integration, automatic reward distributor, marketplace settlement contract, production prediction market, live AI operator, or live weather feed in this repository. The illustrated mechanics are product designs, not evidence that a Pons/Uniswap hook supports or runs them.

Wallet connection reads an account. A properly configured and enabled NFT vault has explicit allowance, mint, transfer and redeem calls, with receipt and chain checks. Pasted addresses are read-only.

## How an Identity works

1. The vault starts with minting closed; the administrator explicitly opens it.
2. A wallet approves the exact backing amount and calls `mint(expectedId)`.
3. The contract takes 50,000 existing CLUNK and mints the lowest available Identity ID. `expectedId` protects against the ID changing before execution.
4. Each wallet has one lifetime direct mint. Receiving or buying more Identities does not grant another direct mint.
5. The current owner can transfer the NFT or burn it with `redeem(id)` to receive its backing. The redeemed ID becomes available again.

Assignment is deterministic. It is not a random or verifiably fair gacha pull. Redemptions return tokens, not a guaranteed fiat value. The administrator cannot withdraw backing, change the backing token or upgrade this contract.

## Artwork remains sealed

The unrevealed 300 artworks, thumbnails, per-ID metadata and rarity mappings are intentionally excluded from public Git. Publishing them would bypass the website's concealment. The public build uses an empty server collection while the vault is disabled. An enabled build requires the private collection in the controlled deployment environment.

The reveal handler checks confirmed `ownerOf` results and the configured chain before serving originals. RPC failures and wrong-chain readings fail closed. Previously revealed or formerly public art cannot become secret again when an ID is burned. See [NFT launch guide](docs/NFT-LAUNCH.md).

## Run locally

Use Node.js 22 and npm. Node.js 24 also runs the production-build workflow.

```sh
npm ci
npm run build
npm run serve
```

Open `http://localhost:4173`. The server uses the same Worker and public asset split as the production build. The public checkout does not need private keys or an RPC to run its inactive configuration.

## Eight GitHub Actions workflows

| Workflow | Actual check |
| --- | --- |
| TypeScript | Strict type checking of application and configuration. |
| Mechanics and wallets | Fee, batch, NFT, reward and prediction math plus wallet recovery tests. |
| NFT and Hooks interface | DOM interaction checks, artwork concealment, navigation and launch gating. |
| Production build | Real production build on Node.js 22 and 24. |
| Reveal protection | Server and build tests for confirmed reveal, failures and private-path protection. |
| Solidity compilation | Compile the vault, bytecode and ABI with the pinned dependency lockfile. |
| Vault transactions | Local EVM mint, transfer, redemption, reserve and failure tests. |
| Repository integrity | Public-file policy, routes, brand assets, ABI consistency and documentation links. |

All workflows run on pushes to `main`, pull requests and manual dispatch. They use read-only repository permissions, timeouts and pinned GitHub Actions revisions. They do not deploy contracts or spend funds. The badges report actual GitHub results for the current main branch. See [CI guide](docs/CI.md).

## Code map

| Area | Location |
| --- | --- |
| Pages and navigation | `src/pages/`, `src/routes-meta.ts`, `src/components/shell.tsx` |
| Exact economic calculations | `src/lib/mechanics/`, `src/lib/units.ts` |
| Launch settings | `src/config/launch.ts`, `src/config/nft.ts` |
| Wallet discovery and NFT calls | `src/lib/wallets.ts`, `src/lib/nft/client.ts` |
| ERC-721 vault | `contracts/ClunkVault.sol` |
| Confirmed-mint reveal gate | `server/reveal.mjs`, `server/index.ts` |
| Build and unsigned deployment preparation | `scripts/build.mjs`, `scripts/contracts/` |
| Local checks | `tests/`, `.github/workflows/` |

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). Production deployment, contract verification, launch settings and independent contract review remain outstanding. Passing CI is not a security audit.

A project-wide license has not been selected. The Solidity files retain their existing MIT SPDX notices; dependencies retain their own licenses. See [third-party notices](THIRD_PARTY_NOTICES.md).
