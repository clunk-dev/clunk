# Architecture

React 19 pages share a small history router, notebook-style components and a single launch configuration. Economic calculations use bigint units and deterministic functions. The game uses a local canvas engine.

| Layer | Responsibility |
| --- | --- |
| Application | Navigation, controls, wallets, game and availability feedback. |
| Mechanics library | Fee allocation, batching, rewards, NFT state and prediction calculations. |
| NFT client | Configured RPC reads, owner enumeration, allowance, explicit vault transactions and confirmations. |
| ClunkVault | Exact deposits, lifetime mint limit, current-owner redemption and reserve invariants. |
| Reveal Worker | Chain/confirmation checks and gated metadata/art responses. |
| Build | Public client assets and separately bundled server records. |

The token and NFT vault are different contracts. The vault is not a Uniswap v4 hook. A production trading hook, rewards service, marketplace and prediction contracts are separate work. No Pons shared-hook ABI or deployment is integrated here.

The public source build excludes all per-ID artwork and rarity assignments. The reveal service tests use explicitly artificial records. Actual collection deployment requires controlled private files outside Git. A deployment server bundle containing those files must also stay private.

Read [README](../README.md) for current implementation scope and [CI](CI.md) for verification. Wallet connection alone never approves tokens. Direct mint uses `expectedId`, and an outdated ID reverts atomically. ERC721Enumerable supports listing current holdings. Marketplace sale execution is not part of ClunkVault.
