---
name: writing-for-agents
description: Use when creating or editing agent instructions, skills, AGENTS.md, CLAUDE.md, or documents that agents read through those files.
---

# Write instructions for agents

Write for repeatable decisions and actions, not identical output. Give the agent a clear task, the information needed for that task, and evidence that the task is complete.

Apply the unslop rules already in your context. If they are absent, read the distributed `unslop` instruction for prose rules before writing. Keep those shared rules there rather than copying them into this skill.

When creating a skill or changing its frontmatter, consult [Skill mechanics](SKILL-MECHANICS.md) for discovery, invocation, and skill indexes.

## State the task and the result

Name the work the document governs. Describe what the agent produces and what makes that result acceptable.

Choose one document mode. Use a how-to for actions toward a goal, reference for facts to look up, explanation for reasons, or a tutorial for guided practice. Put material that needs a different mode in a linked document.

For a procedure, write ordered steps with a completion criterion for each step. For reference, group related rules under one heading and state when the agent must apply the whole set.

## Make references conditional

A skill description or a document link tells the agent when to read material outside its current context. Write each reference with a concrete condition, a target, and the target's purpose. Put the condition first.

Cover each distinct case that needs the target. Combine synonyms for the same case. Use the terms that appear in user requests and the codebase, so the agent can match the current task to the reference.

For example, replace "See README.md for help" with "When changing plugin installation, read the Install section of README.md for the link and reload commands."

If the agent misses a required document, test a clearer condition before copying the document into always-loaded instructions. Move the required material inline only if the clearer reference still fails in practice.

## Keep required instructions in the main file

Every line of always-loaded text consumes context even when its condition does not apply. A linked file needs only its reference in always-loaded context. A file with no loaded reference depends on human selection. Reserve that human attention for decisions that require human judgment.

Place material according to when the agent needs it:

- Keep actions that every run needs in the main procedure.
- Keep short definitions and rules beside the actions they govern.
- Move details for a conditional task to a supporting file. Leave a reference that names the condition and the file.

Keep a concept's definition, rules, and exceptions together. Scattered pieces force the agent to find and combine them before acting.

If a document is too long even after removing repetition, split it by task or stage. Each path must include the instructions it needs. A shorter main file is not an improvement if required material becomes hard to find.

## Define completion with evidence

Replace subjective goals with observable results. "Understand the change" does not tell the agent when to stop. "Account for every affected caller, test, and documented contract" names the scope of the work.

Specify the required evidence and the full set it covers. A change list alone proves neither completeness nor correctness.

For example, a distribution check can end when the runtime discovers the skill, reads its supporting file, and includes both files in the package. The agent reports those observations and any failures.

If the agent rushes a step to reach later work, sharpen that step's completion criterion first. Split the sequence only if the criterion remains subjective and actual runs still stop too early.

To keep later steps out of context, use a separate handoff or subagent task that contains only the current stage. Moving headings or calling another file inline leaves later steps in context.

## Use concrete, consistent terms

Use real symbols, paths, flags, and commands. Reuse established domain terms when they name the intended behavior. Define a named pattern the first time the document uses it.

Repeat a useful term instead of repeating its definition. For example, "a failing regression test" is shorter and more checkable than "a test loop you believe in."

Replace undefined labels such as "tracer bullets" or "the ladder" with the actual action or structure. Invented shorthand needs explanation and can leave different agents with different interpretations.

State the desired action directly. "Write one-line comments" gives the agent a target. "Do not write long comments" leaves the target unspecified.

Keep prohibitions for hard limits, such as "Do not push without user approval." Pair the limit with the permitted action when one exists. Treat claims about which wording works best as hypotheses to test, not guarantees about every model.

## Remove copies and stale instructions

Give each rule one authoritative home. Link to shared guidance instead of repeating it in several skills.

Treat code and configuration as authoritative too. When a value is available in `package.json`, a config file, the directory layout, or command help, point to that source. Copy the value only when repeated lookup has a demonstrated cost that justifies maintaining the copy.

Keep conventions, reasons, and failure cases that the source cannot explain. Remove obsolete requirements, unrelated background, and details that belong to a conditional task.

For each instruction, ask whether it changes the agent's behavior. Compare runs with and without the instruction on the same task. If the instruction adds no useful behavior, remove the sentence rather than shortening it. Defaults differ between models, so check the models that use the document.

## Check the document on real tasks

Exercise a common task, each conditional task, and a task that should not select the document. Check both discovery and execution.

Observe whether the agent reads the right files, follows the required actions, and supplies the completion evidence. If runs differ, identify the ambiguous condition or criterion before adding more instructions.

Keep revisions tied to observed failures. Re-run the affected scenario after changing the wording.
