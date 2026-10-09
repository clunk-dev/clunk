# Getting started

Use Node.js 22 and npm. Install dependencies with `npm ci` to preserve the lockfile.

```sh
npm run build
npm run serve
```

Open http://localhost:4173. Refreshing nested routes is handled by the Worker. Build output is split into public files in `dist/client` and the Worker in `dist/server/index.js`.

The public repository deliberately omits the private NFT collection. The inactive public build includes empty reveal records, keeping Identities concealed. Enabling the vault without the private collection makes the Worker build fail. Never upload the collection or generated server bundle to public Git.

Useful commands:

```sh
npm run typecheck
npm test
npm run test:nft-ui
npm run contracts:compile
npm run contracts:test
npm run build
npm run test:reveal
npm run check:integrity
```

`test:reveal` needs a current production build. The contract tests run an in-memory EVM with mock tokens and can take several minutes to mint all 300 identities. No RPC, token purchase, signing key or funded wallet is needed.

Prepare real vault deployment inputs only after verified launch configuration exists. [NFT launch guide](NFT-LAUNCH.md) explains the unsigned deployment preparation flow. It does not broadcast transactions.
