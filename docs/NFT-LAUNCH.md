> Public repository: the private collection and its validation script are intentionally excluded. Restore those files only in a controlled deployment workspace. Public CI tests reveal rules with artificial records; it does not validate the omitted artwork.

# Clunk NFT vault launch

Status: collection and integration prepared; token/network/vault unset; no deployment or real transaction has been performed. Website publishing does not deploy a blockchain contract. This implementation is tested locally, not externally audited.

## What is included

- 300 original SVG artworks extending the supplied Clunk silhouette, 384px WebP thumbnails, metadata, and SHA-256 manifest. All ten scenes use the existing notebook design language.
- Searchable gallery, identity detail dialog, owner collection, exact token approval, mint, transfer and burn-to-redeem actions, pending transaction recovery.
- Non-upgradeable `ClunkVault` based on pinned OpenZeppelin ERC721Enumerable, Ownable2Step, SafeERC20 and ReentrancyGuard.
- Deployment compiler and unsigned transaction preparation. Private keys never belong in the website or configuration.

## Economics and assignment

300 reusable identities (IDs 1–300), 50,000 CLUNK each, at most 300 outstanding. One successful direct mint per wallet for its lifetime. Transfers or redemption never reset that flag; receiving NFTs does not use the receiver’s opportunity. Redemption is current-owner-only, burns the NFT and returns exactly 50,000 tokens. The ID becomes available for another eligible wallet. Full capacity backing is 15,000,000 CLUNK.

**Explicit implementation decision:** the original whitepaper proposed randomness subject to provider availability. The prepared contract instead mints the lowest available ID and accepts `expectedId` to reject stale previews. It is deterministic and makes no randomness/fairness claim. Random allocation would require a separately reviewed provider and contract change before deployment. Artwork traits and rarity tiers never modify backing or rewards. The 300 fixed editions retain tiers of Legendary (5), Mythical (10), Super Rare (30), Rare (75), and Common (180). `private/nft/rarity.json` is the canonical ID assignment, distributed across the existing artwork via a fixed seeded ordering. This is an editorial edition classification, not a visual-trait frequency score or onchain randomness. Labels appear only after mint confirmation; the gallery has no rarity groups or filters. Assignment stays tied to token ID after redemption/remint. Supply figures count identities in the entire collection, not only currently outstanding NFTs. Freeze the final assignment and metadata before deploying; do not reroll after launch.

The administrator can only open/close new minting and transfer administration in two steps. Pausing minting does not pause transfers or redemption. There is no backing withdrawal, token replacement, metadata setter, proxy, upgrade, or arbitrary execution function. Accidental surplus tokens cannot be recovered. Token and metadata directory are fixed at construction. Use a reviewed multisig administrator.

Requires a standard non-rebasing ERC20. Exact balance-delta checks reject fee-on-transfer deposits and redemption shortfalls. A token that later changes transfer behavior, rebases, blacklists the vault or pauses can still impair redemption; review the launched token before deployment. Onchain checks cannot prove a token's future behavior.

## Configuration

`src/config/launch.ts`: shared `contractAddress`, `chain.chainId`, `chain.name`, `chain.explorerUrl`; current `siteUrl` is https://clunk.lat. Keep `features.vaults` prelaunch until checks pass.

`src/config/nft.ts`: `vaultAddress`, HTTPS `rpcUrl`, `deploymentBlock`, `metadataBaseURI`, minimum `confirmations`, and explicit `enabled`. Defaults are null/false. Setting the token address alone cannot activate the vault. Production RPC must work from browser origins, with no secret API key exposed.

The app verifies RPC chain, code at both addresses, backing token identity, decimals, backing amount, collection limit, metadata directory and reserves before allowing actions. Balances and ownership are read at the same block. Manual pasted addresses are watch-only. It uses the selected wallet provider and rechecks account/network before writes. Approval is exact backing, not unlimited. Gas is paid separately in the native network token.

## Durable assets

The complete collection is versioned in `private/nft/`, bundled into the server Worker, and excluded from all public static files and browser JavaScript. `server/reveal.mjs` gates art, thumbnails, per-ID metadata and the batch reveal endpoint with ERC-721 `ownerOf` at a block with the configured confirmations. Unminted IDs receive a generic brand cover and metadata with no traits. RPC failures return an unavailable response without artwork. The manifest and rarity mapping have no public endpoint.

Set constructor `metadataBaseURI` to `https://clunk.lat/nft/metadata/`. The deployment preparation script requires a gated HTTPS metadata path. Do not publish the private collection to IPFS or a static CDN before minting: that would bypass concealment. The server and browser share the configured vault, network, RPC and confirmation settings. A deployed contract's URI is immutable; finalize the domain before deployment. This requires continued availability of the hosted reveal service and RPC; it is not decentralized immutable metadata hosting.

Artwork and rarity were publicly visible in earlier Site versions. This update removes them from the current public build but cannot erase prior downloads, caches, or old deployments. Also, a redeemed ID retains the same already-revealed artwork when reminted; concealment cannot make previously revealed information secret. Mint assignment remains deterministic, not random.

Do not deploy with temporary/null/example URLs. Archive the exact final metadata, art and hashes with deployment evidence. `scripts/nft/generate.py` rewrites `private/nft` deterministically. `npm run nft:validate` validates the private collection. Never move it back into `public/`.

## Launch steps

1. Receive and independently verify the launched CLUNK token and selected network. Confirm actual token decimals, non-rebasing/non-taxed transfer behavior, chain ID, RPC, explorer, EVM support, browser CORS, gas costs and wallet compatibility. No current Robinhood Chain mainnet parameters are assumed.
2. Review contract and deterministic assignment policy. Finalize administrator and deployer addresses, and final metadata URI. Compile with the committed lockfile: `npm ci`, `npm run contracts:compile`.
3. Copy `contracts/launch.example.json` to an ignored deployment configuration and supply verified public inputs. Run `npm run contracts:prepare -- path/to/launch.json`. This reads the network and writes unsigned deployment and activation payloads under ignored `deployment-output/`. It never signs or broadcasts.
4. Review/sign the deployment payload with the deployer wallet using its supported contract-deployment workflow; record the receipt, address and deployment block. It deploys with minting closed. Verify source/constructor arguments/bytecode on the network explorer. Verify immutable token, amount, administrator and baseURI onchain. Fund deployment gas separately.
5. Populate both frontend configuration files with verified values. Keep mint activation false until the onchain deployment and metadata checks pass. Run all tests and the production build.
6. Exercise approval → mint → transfer → redemption with controlled wallets and documented receipts when the owner chooses to open minting. These consume lifetime mint opportunities and gas. A separately deployed staging vault is recommended before opening the final production vault.
7. Sign `setMintOpen(true)` as administrator when ready. Set `features.vaults:'live'` and `nftLaunch.enabled:true`, publish and verify the selected network/wallet flow. Record evidence. This activation is separate from token launch.

Rewards and marketplace settlement remain prelaunch. ERC721 transfer events support future ownership-time accounting, but no rewards distributor, fee hook, marketplace or random provider is deployed by this package. ERC721 metadata does not imply OpenSea support for the chosen chain.

## Validation and limits

Run `npm test`, `npm run contracts:test`, `npm run test:nft-ui`, `npm run nft:validate`, `npm run typecheck`, `npm run build`. Contract tests use an in-memory EVM and explicitly cover backing, decimals, rollback, current owner redemption, lifetime limits, fees, callback reentrancy and mint pause behavior. DOM tests cover gallery flows and prelaunch transaction gating; they are not browser layout tests. Actual mobile wallet prompts, production RPC/chain integration, gas costs and visual browser layout remain launch verification tasks.

Pending transaction hashes are stored on the current device and checked against the configured chain/vault. A UI timeout does not cancel a wallet request or transaction. A submitted hash remains blocked from duplicate submission until a receipt is confirmed. Replaced/dropped transactions should be checked in the wallet/explorer; this first version does not automatically infer replacement transactions. A wallet request without a hash can be cleared only after explicit user acknowledgement that nothing was submitted.
