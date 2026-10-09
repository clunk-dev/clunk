# NFT release verification — 8 October 2026

Prepared release, with onchain activation disabled.

| Check | Result |
| --- | --- |
| Existing mechanics and wallet recovery tests | 26 passed |
| Local EVM vault tests | 13 passed |
| React DOM gallery, rarity and launch-gating tests | 9 passed |
| Full TypeScript check | Passed |
| Collection checks | 300 unique SVGs, 300 thumbnails, 300 metadata records; all manifest hashes verified |
| Representative artwork visual inspection | Ten scenes inspected at rendered resolution |
| Production bundle | Built successfully through publishing workflow |

The local EVM tests minted all 300 identities, verified the full 15,000,000-token reserve and rejection of mint 301. Also checked six-decimal tokens, exact deposits and redemption, current-owner authorization, immutable lifetime mint limits after transfers/burns, mint pause behavior, rejection of transfer taxes, rejecting NFT receivers, reentrancy and atomic rollback. Tests use a local in-memory chain and mock tokens, not production contracts.

DOM tests verify pagination through ID 300, traits search and clear, details/metadata matching, deep links, connection UI, prelaunch action gating and watch-only address restrictions. Responsive breakpoints preserve the existing design tokens and specify 4/3/2-column gallery layouts and a stacked mint panel for small screens. No actual browser layout or mobile-wallet test was run: the required browser-control skill was unavailable in this session. DOM tests are not visual browser evidence.

No production token, NFT vault address, chain ID or RPC has been supplied. Contract deployment, explorer verification, production wallet flows, final asset hosting policy and any independent contract review remain launch tasks. Metadata is currently hosted with the versioned Site under HTTPS; no IPFS pinning is claimed. The random-allocation proposal is explicitly distinguished from this implementation's deterministic next-available assignment in the page, onsite whitepaper note and launch guide.

Rarity update: exact 5/10/30/75/180 tier counts, one tier per identity, matching metadata/manifest and rarity-filter behavior are verified. All original artwork and thumbnail bytes remain unchanged. The vault contract and economic rules were not modified.

## Concealed reveal update — 9 October 2026

Unminted cards use one generic branded cover. The gallery is ordered numerically with no rarity grouping/filtering; search uses IDs only. Original assets, metadata, rarity assignment and manifest moved from public static output to private server source. Post-confirmation reveal is checked server-side using ERC-721 ownerOf at the configured confirmation block. No NFT contract economics changed.

Validation: 8 DOM tests for concealment, details, pagination and launch gating; 7 server/build tests for unconfigured and unminted concealment, confirmed reveal, wrong-chain/RPC failures, private-path blocking and frontend asset separation. All 300 original asset and metadata hashes remain valid. Full TypeScript check and production Worker build pass. Browser visual QA and production-chain minting have not been performed.

Past public artwork cannot be retroactively made secret. Burned/reminted IDs keep their previously known art. See NFT-LAUNCH.md for those limitations and the required gated metadata base URI.
