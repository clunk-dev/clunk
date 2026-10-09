# Contributing

Use focused branches and conventional commit messages such as `feat:`, `fix:`, `docs:` and `ci:`. Explain the behavior changed and the checks performed in each pull request.

Install with `npm ci`. Run the relevant workflows locally using the commands in [Getting started](docs/GETTING_STARTED.md). Changes to contract economics require local EVM tests; UI-only changes should preserve concealed Identities and explicit transaction gating.

Do not add fabricated chain data, unsupported live integrations, placeholder success badges, private collection files, credentials or generated server bundles. Keep dependencies pinned through the committed lockfile and preserve external licenses. Production activation requires verified token/network/vault configuration and controlled collection delivery.
