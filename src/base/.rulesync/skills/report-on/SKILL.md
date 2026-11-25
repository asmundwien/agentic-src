---
name: report-on
description: >-
  Use only when the user explicitly invokes report-on to record one
  specific agent behavior or outcome from the current work.
disable-model-invocation: true
---

# Capture one behavior

Preserve one situation for later evaluation, whether the outcome was wanted or unwanted. Produce one evidence-based Markdown report that a reader can understand without the original chat or repository. Capture the situation without fixing the original task or changing skills.

## Procedure

1. **Select one outcome.** Use the behavior supplied in the invocation when it identifies one specific response, edit, or action. If it is missing or ambiguous, ask: "Which one specific behavior or outcome should this report capture? Point to the response, edit, or action you mean, and say what you expected instead if it differed." Wait for that answer and confirm your understanding before writing a report.
2. **Preserve the evidence and origins.** Gather the selected outcome's request, necessary prerequisites, relevant decisions and actions in their known order, and user feedback. Trace sources such as skills, local instructions, documentation, and implementation examples the agent followed. Quote the minimum sufficient excerpt from each relevant source, preserving qualifications that affect its meaning, and cite its path or conversation reference and evidence of use. Preserve original text or diffs before corrections overwrite them. Distinguish sources demonstrably used from those merely available, recorded rationale from retrospective explanations or hypotheses, and user reports from direct observations. Mark material gaps in evidence or event order instead of inventing causes or reconstructing earlier evidence from current files. Record concise decision summaries, not private internal deliberation. Do not rerun or repair the incident to manufacture evidence.
3. **Prepare local storage.** Create `.behavior-reports/` at the Git working-tree root and add `/.behavior-reports/` to `.gitignore`, preserving its existing content. Outside Git, create the directory in the working directory without adding a `.gitignore`.
4. **Write and verify.** Fill [the report template](report-template.md) with the scoped timeline and evidence. Use `<UTC-YYYYMMDDTHHMMSSZ>-<behavior-slug>.md`; choose an unused suffix on collision and never overwrite an earlier capture. Give each fact or quotation one place in the report; refer back to its event rather than repeating it in summaries or analysis. Omit unrelated activity, full transcripts, and metadata or evidence-gap inventories that do not affect understanding. Omit credentials and redact sensitive values, marking redactions. Read the saved report: can a reader follow the incident and its relevant source influences without opening other material? Remove repetition without losing necessary context, qualifications, or uncertainty. Reply with a very short summary of the report and the path to the report. Leave the original work unchanged apart from the report directory and `.gitignore` entry. Do not stage files or commit.

## Completion

The user selected one outcome. One readable local report gives a self-contained incident timeline with necessary prerequisites, source quotations, and available reasoning. Each item contributes distinct context, evidence, or material uncertainty. A saved report does not imply the behavior was reproduced or its cause established.
