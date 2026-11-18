---
name: use-conventional-commits
description: Use when writing, suggesting, reviewing, or correcting Git commit messages, including squash commit messages and pull request titles that will become squash commits.
---

# Use conventional commits

Use [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) for commit messages. Follow repository-specific conventions when present.

## Format

```text
<type>[(<scope>)][!]: <description>

[optional body]

[optional footers]
```

- Choose the type by the change's purpose. A bug fix with regression tests is `fix`, not `test`.
- Add an optional scope in parentheses to name the affected component.
- Write a short description of the actual change after the colon and space.
- Add a body when context is needed. Separate the header, body, and footers with blank lines.
- Write footers as trailers such as `Refs: #123` or `Reviewed-by: Name`.

## Common types

Use `feat` for new functionality and `fix` for bug fixes. Other types are allowed; these are common conventions.

| Type | Change |
| --- | --- |
| `feat` | New functionality |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `refactor` | Code restructuring without a feature or fix |
| `perf` | Performance improvement |
| `test` | Tests only |
| `style` | Formatting without behavior changes |
| `build` | Build system or dependencies |
| `ci` | CI configuration or scripts |
| `chore` | Other maintenance |
| `revert` | Revert an earlier change |

## Breaking changes

For any type, mark a breaking change with both `!` before the colon and a `BREAKING CHANGE:` footer. Describe the incompatibility and how to migrate in the footer.

```text
refactor(config)!: rename outputDir to destination

BREAKING CHANGE: replace outputDir with destination in configuration files.
```
