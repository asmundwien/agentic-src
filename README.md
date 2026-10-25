# Agentic

A personal collection of generic agent instructions, skill adaptations and pinned external skills. APM resolves and distributes the collection.

APM >= 0.31.0 is required.

## Usage

The default collection contains general purpose instruction files that are usefull for any agent in any scenario, and prioritized to always earn a place in any context window.

```sh
apm install asmundwien/agentic
```

### Optional collections

Optional collections contain domain specific instructions and should be installed on demand.

```sh
apm install asmundwien/agentic/collections/testing
```

The available collections are:

| Collection                 | Contents                                                                         |
| -------------------------- | -------------------------------------------------------------------------------- |
| `agent-authoring`          | Skills and agent instructions.                                                   |
| `architecture-and-design`  | Module design, domain modeling, architecture improvement, and design principles. |
| `backend`                  | Node.js backend patterns.                                                        |
| `cli`                      | CLI design for coding agents.                                                    |
| `code-quality`             | Code review and coding standards.                                                |
| `debugging`                | Bug and performance regression diagnosis.                                        |
| `documentation`            | README guidance and technical writing.                                           |
| `human-operations`         | Human-only provisioning, credential setup, and cutover guidance.                 |
| `javascript-typescript`    | JavaScript patterns and TypeScript best practices and advanced types.            |
| `learning-and-explanation` | Workspace teaching, code walkthroughs, and design rationale.                     |
| `planning-and-research`    | Plan review, prototyping, research, and large-work planning.                     |
| `testing`                  | TDD and JavaScript testing patterns.                                             |
| `version-control`          | Git merge and rebase conflict resolution.                                        |

### Reproducibility

After a normal install has generated the consumer lock:

```sh
apm install --frozen
apm audit --ci
```

## Content

- [The default collection](.apm/) of instructions that are prioritized to always be installed.
- [Optional collections](collections/) of optional instructions that should be installed on demand.
- [Suggestions](docs/suggestions.md) contain further resources that are not yet implemented or adopted as part of this distributable.

## Licensing

Most skills are upstream dependency references in the manifests, their licenses remain upstream. Local adaptations redistribute upstream material beside its source instruction.
