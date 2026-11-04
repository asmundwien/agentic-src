# Agentic source

Source for the [Agentic](https://github.com/asmundwien/agentic) rules and skills distribution. Humans maintain this repository. GitHub Actions builds canonical collections and publishes them to a separate, machine-managed artifact repository.

The source repository is `agentic-src`; the artifact repository is `agentic`. Cross-repository publication remains disabled until its target and credentials are configured. See [GitHub integration](docs/pipeline.md#github-integration) for the setup contract.

## Work on collections

Requires Node.js >=22.22.0 and pnpm 11.24.0.

```sh
pnpm install --frozen-lockfile
pnpm test
GH_TOKEN="$(gh auth token)" pnpm build
```

`pnpm build` installs every collection's upstream inputs with the pinned native Rulesync CLI and frozen locks, then assembles `dist/` without harness conversion. Authored content, upstream selections, and native locks live under `src/<name>/`. Downloaded `.curated/` inputs are ignored caches. `dist/` is entirely generated and ignored.

Use [Contributing](CONTRIBUTING.md) for source changes and local previews. [Pipeline behavior](docs/pipeline.md) specifies build ownership, publication triggers, versioning, safety checks, authentication, and local proof. [Consumer instructions](docs/consuming.md) are copied into the generated artifact's README.

Do not commit generated collections, publish from a dirty working tree, or edit the artifact repository by hand. Consumers select materialized collections; they do not build this source repository or resolve its upstream dependencies.
