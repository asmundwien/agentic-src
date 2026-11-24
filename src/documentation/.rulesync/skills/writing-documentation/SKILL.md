---
name: writing-documentation
description: >-
  Use when writing, revising, or reviewing an explanation in an established
  location, including comments and JSDoc, or deciding whether a code change
  needs an update to existing documentation.
---

# Revise documentation

Produce the smallest sufficient documentation change for the intended reader. Leaving an accurate explanation unchanged is a valid result. Preserve necessary meaning rather than minimizing word count.

## Procedure

1. Read the affected explanation and identify its reader, task, and existing scope. Keep an unrelated correction within that scope; it does not require a new introduction or a documentation audit.
2. Compare the documented contract with verified behavior. Keep defaults, units, errors, warnings, prerequisites, examples, and reasoning the reader needs. Private control flow usually belongs in the implementation. Describe verified behavior when the rationale is unknown.
3. Choose whether to leave the explanation unchanged, revise it, or remove obsolete content. A fix that restores the documented contract needs no documentation addition. Ordinary documentation describes the present state; history belongs in changelogs, migration guides, historical records, or ADRs.
4. Integrate changes into the existing explanation before appending text. Remove superseded sentences and consolidate nearby links that answer the same question. Preserve separate pointers for distinct reading needs. Reconcile affected summaries with their authoritative explanation without copying the full reference into each entry point.
5. Verify affected claims against code or another authoritative source. Edit the source of generated documentation. Check changed links and anchors, and exercise changed commands and examples when possible. Report the change and verification limits without claiming unperformed checks.

When placement is unclear, audiences conflict, or content needs to move between documents, use **organizing-documentation** to decide its home and navigation. Routine corrections in an established location do not require that skill.

When creating or modifying Markdown files under a document-size budget explicitly adopted by the repository or user, read [Document-size policy](assets/document-size-policy.md) for measurement and enforcement.

## Completion

- The explanation preserves the reader's required contracts and guidance.
- The revision removes superseded text without unrelated cleanup or invented rationale.
- Affected examples, commands, and references are verified, or verification limits are stated.

## Example

A fix restores the documented three attempts. The explanation says:

> Requests make at most three attempts. See the request configuration guide for retry settings. We previously used a loop, but RetryController now handles retries. See the request configuration guide for the attempt limit.

Revise it to:

> Requests make at most three attempts. See the request configuration guide for retry settings.

The contract and useful pointer remain. The implementation history and duplicate pointer do not.

## Common mistakes

- Appending a fix announcement when the documented contract remains accurate.
- Removing public defaults or warnings because code also expresses them.
- Treating a small correction as permission to reorganize documents or impose a size budget.
