# Local validation — 9 October 2026

Validation was performed on the prepared public source using Node.js 24.19.0 and the existing lockfile dependencies. GitHub Actions has not run yet; no successful GitHub badge or remote run is claimed.

| Check | Result |
| --- | --- |
| TypeScript | Passed |
| Mechanics and wallets | 26 tests passed |
| NFT and Hooks interface | 14 tests passed |
| Public-source production build | Passed with omitted private collection and inactive reveal |
| Reveal protection | 7 tests passed |
| Solidity compilation | Passed |
| Vault transactions | 13 tests passed, including 300 real local mints and mint-301 rejection |
| Repository integrity | Passed |
| Workflow definitions | All eight parsed; triggers, permissions and installation commands checked |

Total: 60 tests passed. The contract tests used an in-memory EVM and mock tokens. No production RPC, deployed Clunk contract or funded transaction was tested. Ganache fell back to its JavaScript transport for this Node version, and all transaction tests completed.

The public package includes original branded assets but excludes unrevealed collection art, thumbnails, metadata, rarity assignments, private deployment output, generated server bundles, environment files and credentials. Browser visual/mobile QA is not claimed. Node.js 22 and 24 build-matrix execution remains a GitHub task after publication.
