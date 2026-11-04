# Repository instructions

This is the source repository for a separate, machine-managed `agentic` distribution. Follow [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/pipeline.md](docs/pipeline.md). Do not rename repositories, change remotes, commit, push, publish to GitHub, install globally, or change real agent configuration without explicit approval.

## Sources and builds

- Every collection, including `base`, uses `src/<name>/`; base is explicitly selected, never implicit.
- Maintain canonical Rulesync rules and license sidecars in `src/<name>/.rulesync/rules/`. Maintain local skills and companions in `src/<name>/.rulesync/skills/`.
- Keep upstream selections and revisions in `src/<name>/rulesync.jsonc`; change them only when requested. Native Rulesync owns the adjacent `rulesync.lock`. Keep these locks and `pnpm-lock.yaml` tracked.
- Do not edit downloaded `.curated/` inputs, generated `dist/`, or the artifact repository. There is no maintained root `collections/` tree.
- Use `pnpm build` for complete builds. Native pinned Rulesync owns dependency fetching and frozen-lock verification; the small build assembler only materializes canonical files and companions. Do not add another resolver, lock format, or harness converter.
- Never use `claudecode-plugin` or another harness target as a neutral publication exporter. Harness conversion happens only in consumer projects.
- Distribution output and its staging/cleanup belong to the build-owned generated output paths. Preserve canonical bytes, complete overridden-skill directory semantics, licenses, and executable modes. Do not include source configs, dependency caches, credentials, or personal settings in artifacts.
- Source and artifact repository identities must differ. The publisher preserves artifact history, publishes immutable version tags without advancing main, and never force-pushes.

## Verification and safety

- Run `pnpm test` and the real build after pipeline changes. Exercise publication in disposable local Git repositories before touching GitHub.
- Exercise the pinned Rulesync CLI in disposable consumers with isolated HOME/XDG directories. Verify selected OMP rules, selected skills and companions, collection removal, and another supported target. User-scope checks require explicit `--global`.
- Generate the complete selected set together. Preview `--delete --dry-run` before deletion; never sweep personal or separately managed directories.
- Pass fetching credentials ephemerally through `GH_TOKEN="$(gh auth token)"`. The publication workflow uses a separate target-scoped GitHub App token. Never persist credentials or personal data in distributed content.
- Uncommitted changes are available only through local build previews. Publication requires clean provenance. Report only checks actually exercised.
