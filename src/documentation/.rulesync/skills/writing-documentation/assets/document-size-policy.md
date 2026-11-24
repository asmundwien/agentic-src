# Document-size policy

Use this policy to measure changed Markdown files and enforce a document-size budget explicitly adopted by the user or repository. Assess document scope through its audience, task, and navigation.

## Measure changed Markdown files

After revisions, invoke the bundled checker through Python 3 on an explicit list of every Markdown file created or modified by the task. Resolve the script relative to the installed writing-documentation skill, not the working directory:

```sh
python3 /path/to/writing-documentation/assets/check_doc_size.py docs/setup.md
```

Measure the complete contents of each changed Markdown file after its final revision. Keep the input list scoped to files created or modified by the task.

The checker counts whitespace-delimited words across UTF-8 input, including headings, frontmatter, and code. Wrapping does not change the result. It emits one JSON line per input with `path`, `state`, `words`, and `message`. It does not measure model tokens. Invoke `--help` for arguments and exit codes.

## Apply the adopted budget

Use repository thresholds when explicitly agreed; otherwise adopting this reference uses these defaults. Apply the same thresholds and input selection locally and in CI.

| State | Words | Action |
| --- | --- | --- |
| Green | Below 2,700 | Continue within scope. |
| Yellow | 2,700 through 2,999 | Assess scope, redundancy, and growth internally. A coherent document may be completed. |
| Red | 3,000 or more | Stop affected documentation work and propose a specific split for approval. Completion requires an approved split and non-red results. |

For yellow, do not force cuts or split solely to reach green. Base any restructuring proposal on a concrete scope or navigation problem in the current document and task. No conversation history or decision log is needed. Omit routine yellow warnings unless the user asks about size or a restructuring decision is necessary.

For red, report the measured count and use **organizing-documentation** to propose paths, scopes, and navigation. Leave affected work incomplete while approval is pending; independent work may continue. After approval, preserve necessary guidance, carry out the split, and check every created or modified document. Do not raise limits or compress away necessary meaning merely to pass.
