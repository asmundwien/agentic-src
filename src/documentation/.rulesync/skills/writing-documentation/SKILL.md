---
name: writing-documentation
description: >-
  Use when writing, revising, reviewing, or organizing repository documentation,
  including READMEs, contributor guides, agent instructions, comments, and JSDoc,
  or when deciding whether a code change needs documentation.
---

# Write appropriate documentation

This skill guides coding agents writing and maintaining repository documentation. Help the intended reader complete their task with accurate information they can find and maintain. Documentation costs human attention, agent context, and future maintenance. Keep content that earns those costs, not the fewest possible words.

Apply this procedure to documentation affected by the task, including its scope, location, and size. A comment edit does not require a repository-wide audit. This skill governs documentation work; it does not require documentation for every subject or code change.

## Choose the reader and location

1. Identify the primary reader, their task, and the knowledge the document assumes. Humans and agents may need the same facts but different entry points. Infer the audience from existing content and use, not the repository type alone.
2. Use the opening to establish the document's audience, purpose, and scope. When creating a prose document or revising its scope, state these directly after the H1 and before the first H2. Include meaningful exclusions and links to existing guidance for those tasks. Preserve an introduction that already provides this guidance. Do not add or rewrite one for an unrelated correction. Comments and JSDoc do not need document headings.
3. Locate the existing explanation and follow repository conventions. Use the document's actual purpose to select a location:

   | Location                                          | Reading need                                                                                        |
   | ------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
   | README                                            | Understand the project or module, start using it, and find further guidance.                        |
   | CONTRIBUTING                                      | Set up development, make changes, and submit contributions.                                         |
   | AGENTS                                            | Find agent-specific constraints, required actions, and task-dependent references.                   |
   | Task guides, reference, or explanation under docs | Follow a procedure, look up a contract, or understand a decision.                                   |
   | Comments and JSDoc                                | Understand a nearby constraint or use a symbol correctly without reconstructing its implementation. |

   These are defaults, not a required file layout. Preserve established conventions unless the task calls for changing them.

4. In a monorepo or nested architecture, put shared guidance at the common scope and module-specific guidance beside its owner. Link local guidance to shared prerequisites instead of copying them. Give readers a discoverable path from the relevant project or module entry point.
5. If no suitable document exists, propose a location, audience, purpose, and scope. The user owns decisions to create documents or split existing ones. Obtain approval for the specific proposal before creating files or moving sections. An explicit request for a named new document already supplies that approval; a general request to update documentation does not.

### Recognize a document boundary

Compare each proposed addition with the document's scope. A different audience, task, prerequisite set, or explicit exclusion indicates that this is the wrong home. Find an existing suitable document or propose a new one instead of broadening the introduction to justify the addition.

Propose a larger rewrite when no single scope statement describes the document honestly, independent tasks require unrelated sections, repeated prerequisites or exceptions obscure the main procedure, or readers cannot find a coherent path. These signals matter even in a short document. Recommend one or more concrete arrangements, including what stays, what moves, proposed paths and audiences, and navigation changes. Wait for the user's approval before restructuring.

## Decide what belongs

Keep behavior, contracts, procedures, examples, constraints, and reasoning that the reader needs. A public timeout, its units, and its error type belong in API documentation even though code also expresses them. A helper's control flow usually belongs in the implementation.

For each passage, identify the question it answers or the action it supports. Remove text that merely translates nearby code into prose or adds background unrelated to that task. Keep warnings, prerequisites, and exceptions needed to act safely.

Use evidence for claims about intent. If the reason for a decision is unknown, describe the verified behavior without inventing a justification.

Ordinary documentation describes the present state. Put change history in documents whose purpose requires it, such as changelogs, migration guides, historical records, and ADRs. Preserve reasoning that still explains current constraints.

## Revise before adding

Choose the smallest sufficient outcome: leave accurate documentation unchanged, revise it, consolidate it, remove obsolete content, or propose a new document.

Read the existing passage before editing. Integrate the change into that explanation and remove sentences the revision makes redundant. A fix that restores the documented contract needs no new documentation merely because code changed. Refactoring an explanation may be the entire documentation change.

Give each fact or rule an authoritative home. Summaries can repeat enough information for an independent entry point, then link to the full explanation. Keep repeated statements consistent in meaning. Use identical wording when the same normative rule must appear verbatim, not for every summary.

Consolidate nearby references that serve the same reading need into one descriptive pointer. Extend that pointer instead of adding a link for every paragraph. Keep separate pointers for independent entry points or distinct tasks.

Use recognizable structures for documents with comparable purposes. Include sections a module needs, rather than empty sections to match a template. When readers must load unrelated material, propose splitting by reader task. After approval, preserve links between the resulting documents.

## Check document size

After revising, run the bundled [word-count checker](assets/check_doc_size.py) on an explicit list of every document created or modified by this task. Skip it when that list is empty; exclude unchanged documents, including those read only for context. Recheck a document if it changes after measurement. For comments and JSDoc, pass only changed documentation blocks through standard input with `-`, not the whole source file. Do not run pre-edit checks, repository-wide size audits, or another counter.

Invoke the checker through Python 3. Resolve its path from the installed skill directory, not the project's working directory. For example, after changing only `docs/setup.md`, run from the project root:

```sh
python3 /path/to/writing-documentation/assets/check_doc_size.py docs/setup.md
```

The checker counts whitespace-delimited words across the complete UTF-8 input, including headings, frontmatter, and code. Wrapping does not affect the count. It emits one JSON line per document with `path`, `state`, `words`, and `message`. This is a document-size measure, not a model token count.

| State  | Default word count  | Required action                                                                                   |
| ------ | ------------------- | ------------------------------------------------------------------------------------------------- |
| Green  | Below 2,700         | Continue within the document's scope.                                                             |
| Yellow | 2,700 through 2,999 | Assess scope, redundancy, and growth internally. A coherent yellow document may be completed.     |
| Red    | 3,000 or more       | Stop the affected documentation work. Completion requires an approved split and a non-red result. |

For yellow, prefer useful consolidation within the requested edit. Do not force cuts, perform unrelated cleanup, or split solely to reach green. Propose restructuring only for a concrete scope or navigation problem that a focused revision cannot resolve. Base this decision on the current document and task, not earlier proposals or decisions. No conversation history or decision log is needed.

At red, report the measured count and propose specific ways to separate the content. While approval is pending, leave the affected task incomplete and continue only independent work. After approval, carry out the agreed revision with accurate scope and working navigation. Do not discard necessary guidance, compress it beyond usability, or raise limits merely to pass.

Use custom thresholds only for an explicitly agreed repository policy. Apply the same selection rules and thresholds locally and in CI. For arguments and exit codes, invoke the checker with `--help`.

Report the documentation change and relevant verification briefly. For coherent yellow, keep the count, state, and internal assessment out of the report unless the user asks about size or a scope or navigation problem requires a restructuring decision.

## Write and verify

Use concrete terms, short paragraphs, and one main idea per sentence. Prefer direct statements and instructions. Reduce redundancy and the number of separate pieces readers must combine. Preserve necessary meaning rather than optimizing word count.

Edit the source of generated documentation, not generated output. Verify affected claims against code or another authoritative source. Check changed links and anchors. Exercise changed commands and examples when possible. Report verification limits instead of implying they passed.

Before finishing, check:

- Can the intended reader find the explanation from their relevant entry point?
- Does each passage support that reader's task without avoidable implementation detail or invented rationale?
- Did the revision remove superseded text and reconcile affected summaries without unrelated cleanup?
- Are the affected contracts, examples, commands, and references accurate?
- Do all created or modified documents have measured, non-red results, with yellow assessed internally and any restructuring approved?

## Example: restore an existing contract

A retry fix restores the documented limit of three attempts. The operator README says:

> Requests make at most three attempts. See the request configuration guide for retry settings. We previously used a loop, but RetryController now handles retries. See the request configuration guide for the attempt limit.

Revise it to:

> Requests make at most three attempts. See the request configuration guide for retry settings.

The revision preserves the operator's contract and navigation. It removes implementation history and a duplicate pointer. It does not add a sentence announcing the fix.
