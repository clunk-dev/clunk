# Continuous integration

Eight independent workflows cover types, unit behavior, interface behavior, builds, reveal security, compilation, contract transactions and repository integrity. The build has a Node.js 22/24 matrix. GitHub will create nine jobs on a qualifying push, without duplicate empty workflows or artificial history.

Workflows run for main-branch pushes, pull requests and manual dispatch. All repository permissions are read-only, checkout credentials are not persisted, actions are pinned, and jobs have timeouts. No workflow deploys, transfers funds, signs messages or requires deployment secrets.

`npm ci` installs exactly the lockfile. The reveal workflow builds before running tests against the Worker. The contract workflow mints all 300 identities on a local EVM; its 20-minute timeout allows the capacity test. Integrity checks compare the committed vault ABI with freshly compiled Solidity.

Workflow success means its named checks passed on that commit. It does not imply production deployment, a security audit, verified chain support, or profitable mechanics. Badge URLs are configured after the actual repository owner/name is known. Open the repository Actions tab to inspect GitHub's results; local checks are reported separately.
