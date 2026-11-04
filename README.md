# Agentic source

Source definitions and local content for [Agentic](https://github.com/asmundwien/agentic), a collection of rules and skills for coding agents. This repository selects upstream skills, pins their versions, and adds local rules and skills. The sibling `agentic` repository publishes the generated collections for installation with [Rulesync](https://github.com/dyoshikawa/rulesync).

To install collections in another project, follow the [Agentic installation instructions](https://github.com/asmundwien/agentic#install). To change their content, work here.

## Collections

| Collection                                              | Content                                                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [agent-authoring](src/agent-authoring/)                 | Skill creation, skill verification, and writing instructions for agents.                         |
| [architecture-and-design](src/architecture-and-design/) | Codebase design, domain modeling, coding standards, type discipline, and explicit effects.       |
| [base](src/base/)                                       | Skill discovery and prose rules, context management, and explanations of behavior and rationale. |
| [cli](src/cli/)                                         | Designing command-line tools for agent use.                                                      |
| [code-quality](src/code-quality/)                       | Code review and codebase architecture improvements.                                              |
| [debugging](src/debugging/)                             | Bug diagnosis.                                                                                   |
| [documentation](src/documentation/)                     | READMEs and technical writing.                                                                   |
| [human-growth](src/human-growth/)                       | Teaching and learning.                                                                           |
| [human-operations](src/human-operations/)               | Guided operational tasks.                                                                        |
| [node](src/node/)                                       | JavaScript, Node.js, and TypeScript patterns.                                                    |
| [planning-and-research](src/planning-and-research/)     | Requirements questions, prototyping, research, and planning.                                     |
| [testing](src/testing/)                                 | Test-driven development and JavaScript testing patterns.                                         |
| [version-control](src/version-control/)                 | Merge conflict resolution.                                                                       |

## Layout

Each collection lives under `src/<collection>/`:

| Path                       | Purpose                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------- |
| `rulesync.jsonc`           | Selects upstream sources and skills. The current source refs are pinned commit SHAs.     |
| `rulesync.lock`            | Records resolved refs, selected content, and integrity hashes for reproducible installs. |
| `.rulesync/rules/`         | Holds local rules.                                                                       |
| `.rulesync/skills/<name>/` | Holds local skills, each with a `SKILL.md` entry point and any supporting files.         |

Rulesync downloads upstream content into `.rulesync/rules/.curated/` and `.rulesync/skills/.curated/`. These directories are ignored. Do not edit them or copy downloaded content into source control.

## Work on collections

Use Node.js 22.22.0 or newer. Install tooling from the repository root:

```sh
pnpm install
```

Run collection commands from that collection's directory. For example, fetch the base collection's locked upstream content:

```sh
cd src/base
pnpm exec rulesync install --frozen
```

If GitHub's API rate limit blocks downloads, supply a token through `GH_TOKEN` or `GITHUB_TOKEN`. With an authenticated GitHub CLI session:

```sh
export GH_TOKEN="$(gh auth token)"
```

### Change upstream selections

1. Edit the collection's `rulesync.jsonc` to select skills or change a source's pinned commit SHA.
2. From the collection directory, run `pnpm exec rulesync install` to fetch the selection and update `rulesync.lock`.
3. Review and commit the configuration and lockfile together.

Use `pnpm exec rulesync install --update` to force Rulesync to resolve the configured refs again. It does not advance a pinned SHA to a newer commit. Change that SHA in the configuration when upgrading a pinned source.

### Add or change local content

Edit rules under `.rulesync/rules/` and skills under `.rulesync/skills/<name>/`. Keep supporting files with the skill and preserve licenses and attribution for adapted content.

To add a collection, create `src/<collection>/rulesync.jsonc`, install its upstream sources to produce a lockfile, and add any local content under its `.rulesync/` directory. The publishing script discovers collection configurations under `src/` automatically.

Do not edit generated collections in `agentic`. Publication copies upstream content first, then local content. A local rule overrides the upstream file at the same path. A local skill with the same directory name replaces the entire upstream skill directory, including its supporting files.

## Publish collections

Publishing runs in the sibling `agentic` repository, not through this repository's package scripts.

1. Push the source changes to `agentic-src`'s `main` branch.
2. In `agentic`, run the [Generate collections workflow](https://github.com/asmundwien/agentic/actions/workflows/collections.yml).
3. The workflow checks out both repositories' `main` branches, installs each collection's upstream content with `rulesync install --frozen`, and publishes `<collection>/rules/` and `<collection>/skills/` in `agentic`.

## Repository-local agent tooling

The root [`rulesync.jsonc`](rulesync.jsonc) configures the agent tools used while working on this repository.

Run these scripts from the repository root:

| Command                 | Action                                                             |
| ----------------------- | ------------------------------------------------------------------ |
| `pnpm rulesync:install` | Fetch the configured skills using the root lockfile.               |
| `pnpm rulesync:update`  | Resolve the configured sources again and update the root lockfile. |
| `pnpm rulesync:preview` | Preview generated agent files without writing them.                |
| `pnpm rulesync:apply`   | Generate the local `.omp/` skill files.                            |

These scripts do not build or publish `src/`. They use the published collections, not unpublished edits under `src/`. Downloaded and generated agent files are ignored.

## Credits

Upstream repositories and pinned versions are recorded in each collection's configuration and lockfile. See [Agentic's credits](https://github.com/asmundwien/agentic#credits) for the projects and authors whose work these collections use.
