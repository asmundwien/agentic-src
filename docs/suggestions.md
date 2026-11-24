# Suggestions

> **AGENTS DO NOT EDIT THIS DOCUMENT**

This document contains ideas and suggestions for future functionality.

## Unstructured ideas

Loose ideas on stuff I instruct repeatidly, that i would like to make standardized instruction for

### Skill: resolve comment

Instruction to pick and address the first unresolved comment on the open PR for this branch. Address the issue and explain the finding. Dont commit

### Skill: writing appropriate documentation

I regularly instruct agents on what appropriate documentaiton looks like. Problems:

- Agents are too verbouse. Sentences contain too many topics at once and they write much more than nessesary
- Documentation include lots of implementation details. Implementation details belong in the implementation. Documentation should include intent and reasoning that implementation details cannot tell.
- Documentation is important, but costly. Documentation must be maintained. Humans have limited brain capacity, and agents have limited context windows. Any documentation should earn its value.
- Write relevant documentaiton in the appropriate doc. README, CONTRIBUTING, AGENTS, etc have different audiences and should contain different information.
- Docs should not contain dupliate information unless there is a spesiffic reason to document something multiple places.
- Reduce drift. When multiple docs contain similar structures, keep structure recognizable between documents, dont drift. If something is documented multiple times, make it equal.
- If something should be documented and no existing document exists where the content belongs, suggest a new document
- Identify the reader for any doc. For example, the readme of an application source code is probably written for the developer, whilst the readme of a published library is written for the consumer. This should probably be persistant metadata about the repo docs, Im not sure if every doc should contain a YAML font matter or if we should standardize on a content-type of doc. Or perhaps the repo itself is enough, or a semantic statement at the top of each doc. This can be discussed when the skill is being produced.
- Even though code should be self explanatory, the need for documentation will to some degree scale with the code volume. It should be possible to navigate and traverse all documentation clearly and efficiently.
- How does this all apply to a monorepo or deep module architecture? Documentation should be standardized and also exist close to where it belongs.
- There are standards out there allready on what doc to use for what. There are no options when it comes to README, but for example CONTRIBUTING or docs/contributing are two different standards with pros and cons (like flat files vs folder structure).
- Define clear goals for what the purpose of documentation is. These days, both agents and humans are actors with different needs, capabilities and limits. Much differs between man and machine, but there is some overlap too.
- Additional content added after sparring with an agent:
  - AGENT_WRITTEN: Invoke this skill whenever documentation is written or revised, including comments and JSDoc. It governs the behavior during documentation work, not which subjects must be documented.
  - AGENT_WRITTEN: Revise the existing explanation before appending text. Combine overlapping sentences and bullets, and remove wording the revision makes redundant. Refactoring an existing passage may be the entire change.
  - AGENT_WRITTEN: Consolidate nearby references that serve the same reading need into one clear pointer covering the theme. Extend the existing pointer rather than adding another for each paragraph or subsection. Preserve separate pointers for independent entry points or distinct reading needs.
  - AGENT_WRITTEN: Ordinary documentation describes the present state, not implementation history such as "the repo no longer does X." Include history only when the document's explicit purpose requires it, such as an ADR, migration guide, changelog, or historical record. Preserve reasoning that explains current constraints.
  - AGENT_WRITTEN: Keeping documentation current does not require an addition for every implementation change. If a fix restores the existing contract and the documentation remains accurate, leaving it unchanged is valid. Do not add internal implementation details merely to satisfy a cleanup instruction.
  - AGENT_WRITTEN: Simplification must preserve necessary meaning and reader guidance. The goal is less redundancy and fewer separate pieces to interpret, not the lowest possible word count.

## Skills to evaluate later

- browser-testing
  - [playwright-explore-website](https://github.com/github/awesome-copilot/tree/HEAD/skills/playwright-explore-website)
  - [playwright-generate-test](https://github.com/github/awesome-copilot/tree/HEAD/skills/playwright-generate-test)
  - [playwright-tester](https://github.com/github/awesome-copilot/blob/HEAD/agents/playwright-tester.agent.md)

- context-engineering
  - [context-map](https://github.com/github/awesome-copilot/tree/HEAD/skills/context-map)
  - [what-context-needed](https://github.com/github/awesome-copilot/tree/HEAD/skills/what-context-needed)
  - [context-architect](https://github.com/github/awesome-copilot/blob/HEAD/agents/context-architect.agent.md)

- frontend
  - [expert-react-frontend-engineer](https://github.com/github/awesome-copilot/blob/HEAD/agents/expert-react-frontend-engineer.agent.md)
  - [next-safe-action/skills](https://github.com/next-safe-action/skills)
  - [shadcn](https://github.com/shadcn-ui/ui/tree/HEAD/skills/shadcn)
  - [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)

- planning-and-research
  - [refactor-plan](https://github.com/github/awesome-copilot/tree/HEAD/skills/refactor-plan)

- security
  - [ai-prompt-engineering-safety-review](https://github.com/github/awesome-copilot/tree/HEAD/skills/ai-prompt-engineering-safety-review)

- testing
  - [tdd-red](https://github.com/github/awesome-copilot/blob/HEAD/agents/tdd-red.agent.md)
  - [tdd-green](https://github.com/github/awesome-copilot/blob/HEAD/agents/tdd-green.agent.md)
  - [tdd-refactor](https://github.com/github/awesome-copilot/blob/HEAD/agents/tdd-refactor.agent.md)
