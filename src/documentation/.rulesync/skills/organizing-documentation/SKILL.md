---
name: organizing-documentation
description: >-
  Use when documentation has no clear home, serves conflicting audiences,
  duplicates guidance across documents, is hard to navigate, or needs a proposed
  split or restructuring. Not for routine corrections in an established location.
---

# Organize documentation

Give each explanation an authoritative home and readers a discoverable path to it. Produce a placement or restructuring proposal, then carry out only the arrangement the user has authorized.

## Procedure

1. Identify the affected readers, their tasks, and prerequisites from existing content and use. Examine relevant entry points, not the entire repository. The result is a scope for each affected explanation.
2. Locate an existing suitable home using its actual purpose and repository conventions. README usually introduces a project or module and links further guidance; CONTRIBUTING serves contributors; AGENTS contains agent-specific constraints and task references. Task guides, references, and explanations serve their named reading needs. Comments and JSDoc explain nearby constraints and public contracts. These are defaults, not a required layout.
3. Compare the proposed content with that home's audience, task, prerequisites, and exclusions. Put shared monorepo guidance at the common scope and module-specific guidance beside its owner. Link shared prerequisites instead of copying them. The result is one authoritative home per explanation, with summaries only where independent entry points need them.
4. If no suitable home exists, or independent tasks no longer fit one honest scope statement, propose concrete paths, audiences, what stays, what moves, and navigation changes. A short document can have a scope problem; length alone does not establish one. Obtain approval for the specific proposal before creating documents or moving sections. An explicit request for a named new document or a specific rearrangement supplies that approval. A general documentation update does not.
5. After approval, implement the agreed arrangement. For a new prose document or a deliberate scope revision, establish audience, purpose, scope, and meaningful exclusions after the H1 and before the first H2. Preserve an adequate introduction. Use recognizable structures for comparable documents without adding empty template sections or unsupported metadata conventions.
6. Verify that affected entry points reach the right explanation and that moved content retains necessary guidance. Update affected links, anchors, and summaries. For prose changes within the chosen homes, use **writing-documentation**. Report the arrangement and actual verification, or the proposal awaiting approval.

## Quick reference

| Signal | Result |
| --- | --- |
| Existing home serves the same reader and task | Keep the explanation there. |
| New content conflicts with the reader or task | Find another existing home or propose one. |
| Full guidance appears in multiple homes | Choose its authoritative home and retain useful entry-point summaries. |
| Independent tasks obscure navigation | Propose boundaries and navigation before moving content. |
| One value is wrong but scope is unchanged | Use writing-documentation; no organization work is needed. |

## Example

A contributor setup guide is about to receive an operator recovery procedure. An operator guide already exists. Put the procedure in the operator guide. Add a setup-guide pointer only if contributors need that recovery path; do not broaden the setup guide's audience to justify the addition.

## Common mistakes

- Inferring audience from repository type instead of the document's actual use.
- Creating a new document when a suitable home already exists.
- Splitting solely because a document is long without an adopted size policy.
- Moving content before approval or leaving readers with broken navigation.
