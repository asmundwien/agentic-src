# Skill mechanics

This reference describes skill files, discovery, invocation, and skill indexes. The [writing-for-agents skill](SKILL.md) contains the procedure for writing agent instructions.

<!-- Maintained local adaptation copied from omp-toolkit at eb4131538635b2f9a17ec9b4f54ec4f2f77f0415, with portable references and invocation guidance. -->

## Skill files

A skill has a `SKILL.md` file in a directory named for the skill. YAML frontmatter precedes the body.

The [Agent Skills specification](https://agentskills.io/specification) defines these required fields:

| Field | Meaning |
| --- | --- |
| `name` | A name of 1 to 64 characters that matches the directory. Use lowercase letters, numbers, and hyphens. The name cannot start or end with a hyphen or contain consecutive hyphens. |
| `description` | A non-empty description of at most 1,024 characters. This repository uses third-person "Use when" descriptions that name invocation conditions rather than the skill's procedure. |

Supporting files contain reference material or tools used by specific tasks. Relative links resolve from the skill directory.

## Discovery and invocation

Discovery makes a skill available to a runtime. Invocation adds the skill's instructions to the current task. A description lets the model decide when the skill applies. Explicit user invocation also remains available.

The invocation options have different costs:

| Option | Model context | Human responsibility |
| --- | --- | --- |
| Model-discoverable skill | The description appears in the skill catalog. | The user can name the skill but need not remember every trigger. |
| Skill omitted from the model's catalog | The catalog carries no description for the skill. | The user or another explicit reference must name the skill. |

Independent model discovery is useful when a task requires the guidance without a user request, or when other skills need shared guidance. Manual selection is useful for workflows the user chooses explicitly.

Frontmatter support differs between runtimes and plugin formats. The installed parser determines which fields are valid and how invocation settings behave. An invocation field is not a portable access restriction.

## Separate skills

A separate skill has its own invocation conditions. Independent discovery justifies a separate skill when users request that task by name or another skill needs to invoke it.

A supporting file has no skill description and adds no independent catalog entry. Shared reference can live in a plain file when its readers already have explicit links to it.

Splitting a procedure into stages has a different purpose. A separate task or handoff can omit future steps from the agent's current context. A file split alone does not create that boundary.

## Skill indexes

A router skill is an index that names other skills and states when each applies. A user can invoke one index instead of remembering every skill name.

An index provides references, not an access override. Whether an agent can invoke a listed skill depends on the runtime and the skill's invocation settings.
