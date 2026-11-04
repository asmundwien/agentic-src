# Contributing

## Source layout

Each collection, including `base`, uses the same structure:

- `src/<name>/rulesync.jsonc` declares upstream selections and revisions.
- `src/<name>/rulesync.lock` is the native, committed dependency lock.
- `src/<name>/.rulesync/rules/` contains authored canonical Rulesync rules and license sidecars.
- `src/<name>/.rulesync/skills/` contains authored local skills and their companions.
- `.curated/` directories contain ignored downloaded inputs. Do not edit them.

There is no authored content in `dist/`. Builds produce `dist/collections/<name>/rules/` and `skills/`, preserving canonical bytes, companions, and executable modes. Do not maintain a second copy in a root `collections/` directory. Do not add a harness target to a source config to obtain a convenient output layout.

## Change content

Requires Node.js >=22.22.0 and pnpm 11.24.0. From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm test
GH_TOKEN="$(gh auth token)" pnpm build
```

Edit canonical rules or local skills under `src/`, then rebuild. You do not prepare and commit generated collections individually. CI builds the complete distribution for every pull request. Publication uses a separate successful build, not a contributor's working-tree output.

Local skill directories replace same-named upstream skill directories as a whole; companions from the overridden skill are not merged. Local rules take precedence over same-named curated rules. Retain license and attribution files when adapting upstream content. Collections are independently selectable; `base` is never implicit.

## Change upstream dependencies

Only change source selections or revisions when intended. After editing a collection's config, reconcile its native lock from that collection's directory:

```sh
(
  cd src/testing
  GH_TOKEN="$(gh auth token)" ../../node_modules/.bin/rulesync install
)
```

Use native `install --update` when deliberately refreshing moving refs. Commit the source config and adjacent native lock together. Do not hand-edit locks. `pnpm build` uses `install --frozen` and must not reconcile them for you. Keep `pnpm-lock.yaml` tracked as well.

Pass authentication ephemerally to the fetching command. Never place tokens, personal agent settings, or credentials in source content or build output.

## Preview in a consumer

Use a disposable project with isolated HOME/XDG directories. Point its `inputRoots` at the absolute paths of the built collection roots, such as `/path/to/agentic-src/dist/collections/base` and `/path/to/agentic-src/dist/collections/testing`. Select the desired target and `rules`/`skills` features. See the [complete consumer example](docs/consuming.md#preview-unpublished-source-changes).

Run native generation for the complete selection:

```sh
pnpm exec rulesync generate --delete --dry-run
pnpm exec rulesync generate --delete
```

Review the deletion preview first. User-scope previews and generation both require explicit `--global`. Never test against real personal configuration. Verify selected rules, selected skills and companions, collection removal, and a second supported target when changing distribution behavior.

## Publication

[The pipeline](docs/pipeline.md) owns assembly and publication. `pnpm publish:artifact --repository file:///absolute/path/to/disposable.git` can exercise publication against an empty disposable bare repository from a clean source snapshot. It never needs a GitHub credential for this local transport. Publication to GitHub, repository renaming, and changes to real agent configuration require separate approval.
