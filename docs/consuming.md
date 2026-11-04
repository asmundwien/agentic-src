# Agentic

Reusable canonical rules and skills, installed with [Rulesync](https://github.com/dyoshikawa/rulesync). This is a generated distribution. Make changes in [agentic-src](https://github.com/asmundwien/agentic-src), not in this repository.

Choose collections explicitly. `base` is an ordinary collection providing the `bootstrap` and `unslop` rules and the `how`, `why`, and `principle-guard-the-context-window` skills. Nothing installs `base` implicitly. The published `collections/` directory lists the available collections; `provenance.json` records their source commit and dependency-lock digests.

## Install in a project

Install the pinned CLI:

```sh
pnpm add --save-dev --save-exact rulesync@43.6.0
```

Create `rulesync.jsonc`:

```json
{
  "targets": ["omp"],
  "features": ["rules", "skills"],
  "sources": [
    {
      "source": "asmundwien/agentic@main:collections/base/skills",
      "rulesPath": "collections/base/rules",
      "rules": ["*"],
      "skills": ["*"]
    },
    {
      "source": "asmundwien/agentic@main:collections/testing/skills",
      "skills": ["*"]
    }
  ]
}
```

`main` selects the rolling distribution. To select a published release, replace `@main` in every source with the same published version tag or full artifact commit SHA. Do not use a source-repository commit SHA. Keep the generated `rulesync.lock`; an ordinary install retains its pinned artifact commits, while `install --update` resolves the selected refs again.

The source suffix selects the skills directory. `rulesPath` is independently relative to the repository root, not to that skills directory. Omit a source to omit its collection. Names are not namespaced by collection in the consumer: avoid selecting conflicting rule or skill names. Native Rulesync gives the first declared source precedence.

```sh
pnpm exec rulesync install
pnpm exec rulesync generate --delete --dry-run
pnpm exec rulesync generate --delete
```

Review the deletion preview before applying it. Generate the complete selection together, not one source at a time into a shared destination. This example writes project-local `.omp/` files. Change `targets` for another Rulesync-supported agent. Canonical files are converted for the consumer's targets; publication does not convert them through Claude Code or another agent format.

To update, run `pnpm exec rulesync install --update`, then preview and regenerate. To remove a collection, remove its source, run `pnpm exec rulesync install`, then preview and regenerate the remaining selection together. Keep the config and native lockfile.

User-scope generation requires explicit `--global` on both preview and generation. Test it with isolated HOME/XDG directories before applying changes to personal agent configuration.

## Preview unpublished source changes

Build `agentic-src` with `pnpm build`, then use absolute collection-root `inputRoots` in a disposable consumer instead of remote `sources`:

```json
{
  "targets": ["omp"],
  "features": ["rules", "skills"],
  "inputRoots": [
    "/path/to/agentic-src/dist/collections/base",
    "/path/to/agentic-src/dist/collections/testing"
  ]
}
```

Preview and generate without `install`. Remote installation cannot see unpublished working-tree changes and never resolves `agentic-src`'s upstream dependencies.

## Publication

The source repository's workflow builds every collection together and writes complete snapshots here. `main` contains the rolling snapshot. Version tags are immutable snapshots and do not advance `main`. Existing history is preserved so consumer locks remain usable.

GitHub Actions also retains an `agentic.tar.gz` build download. The archive is useful for inspection; it is not a native Rulesync remote source. Install from this Git repository and its refs.
