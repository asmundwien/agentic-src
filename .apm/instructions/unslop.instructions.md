---
description: Apply prose style rules when writing responses or editing prose files.
applyTo: "**"
---

# Unslop

Apply these rules to every response and every prose file you write or edit.

Do not apply these rules to code, commands, exact quotations, generated files, or user-provided text that the task does not ask you to edit.
Do not rewrite explicit domain language. Preserve required domain terms even when they appear in a pattern below.

## Process

1. Scan for the patterns below.
2. Rewrite. Preserve meaning and match the intended tone.

## Patterns to detect and fix

Rule numbers are stable ids that other skills cite. A removed rule leaves a gap.

### Content

3. **Superficial -ing phrases.** "highlighting...", "ensuring...", "reflecting...", "showcasing...", "fostering...". Delete or expand with real sources.
5. **Vague attributions.** "Experts believe", "Industry reports suggest", "Some critics argue". Name the source or delete.

### Language

7. **AI vocabulary.** Additionally, crucial, delve, enduring, enhance, fostering, garner, interplay, intricate, landscape (abstract), pivotal, showcase, tapestry (abstract), testament, underscore, vibrant. Replace with plain words.
8. **Fancy ways to say "is".** "serves as", "stands as", "boasts", "features". Just say "is" or "has".
9. **"Not just X, but Y."** State the point directly instead.
10. **Rule of three.** Forcing ideas into groups of three. Use the natural number.
11. **Synonym cycling.** Protagonist, main character, central figure, hero all in one paragraph. Pick one and repeat it.
12. **False ranges.** "from X to Y" where X and Y are not on a meaningful scale. List the topics directly.

### Style

13. **Em dash overuse.** Avoid em dashes entirely. Use periods or commas only. Do not use parentheses, en dashes, or hyphens as substitute dashes. If a thought needs separation, end the sentence or use a comma.
14. **Colon overuse.** Colons are fine before a list or example. Do not use them as mid-sentence connectors. "If you're coming from traditional automation: instead of registering event handlers, you describe conditions" adds nothing. Rewrite it as "Describing when the scheduler should fire works best as plain English."
15. **Boldface overuse.** Do not bold every proper noun or acronym.
16. **Inline-header lists.** The tell is a bold label and colon that restates the line. "**Performance:** Performance improved..." should become prose. A bold lead-in that ends in a period, names the item, and introduces new detail is fine. For example, "**Schema in TypeScript.** Tables live in one file."
17. **Title case headings.** Use sentence case.
18. **Decorative emojis.** Remove them from headings and bullets.
19. **Curly quotes.** Replace them with straight quotes.

### Communication artifacts

20. **Chatbot phrases.** Remove "I hope this helps!", "Let me know if...", "Of course!", "Certainly!", and "Found the smoking gun!"
22. **Sycophantic tone.** Replace "Great question! You're absolutely right!" with a direct response.

### Filler

23. **Filler phrases.** "In order to" becomes "To". "Due to the fact that" becomes "Because". Delete "It is important to note that".
24. **Excessive hedging.** "could potentially possibly be argued that it might" becomes "may".
25. **Generic conclusions.** Replace "The future looks bright" with specific plans or facts.

### Jargon

26. **Abstract metaphor nouns.** Substrate, wedge, vector, locus, vantage, nexus, primitive when used as a noun, harness when used as a metaphor, surface as in "API surface", bedrock, scaffolding when used as a metaphor, modality, paradigm, gold-plating, ratchet when used as a metaphor, evacuate when used for moving code, endgame, north star, and flywheel usually have plainer alternatives. "Substrate" becomes "base". "Wedge in" becomes "add". "Vector" becomes "way" or "method". "Gold-plating" becomes "more than the job needs". "Ratchet" becomes the mechanism's real name or "a limit that only tightens". "Evacuate" becomes "move out". "Endgame" becomes "the last phase". Pick the concrete word.

### Plain speech

27. **Say what it does, not how it feels.** "the database stays close at hand", "SQL you can read", and "types that follow your schema" name a feeling. Name the mechanism or a number instead. For example, "`.toSQL()` returns the exact string sent to the database" or "a column rename fails the build". Ask what the sentence tells the reader to do or know, then write that. If you cannot restate it as a concrete instruction, fact, or number, cut it. If the sentence could appear unchanged in another project's documentation, it says nothing about this project. Cut it.
28. **Shorten or split dense sentences.** If the reader has to backtrack to parse a sentence, break it into two sentences or drop clauses. Keep one idea per sentence.
29. **Active voice.** Prefer it. Catch "is", "are", "was", or "were" followed by a past participle and name the actor. "queries are validated" becomes "the compiler validates queries". "the file is parsed by the loader" becomes "the loader parses the file". Passive voice is fine when the actor is unknown or does not matter.
30. **Cut adverbs, or use a stronger verb.** "runs quickly" becomes "is fast" or gives a measured time. "significantly improves" states the measured change. An adverb propping up a weak verb means the verb is wrong.
31. **Prefer the plain word.** "utilize" becomes "use". "leverage" becomes "use". "facilitate" becomes "help". "numerous" becomes "many". "in the event that" becomes "if". The fancier synonym is rarely clearer.
32. **Mannered prose.** Replace metaphor or flourish with a literal phrase. This includes aphorisms such as "wire it or delete it", rhetorical fragments, personified code such as "the plan holds it", figurative verbs such as "rides along" or "stands on", and stock framing phrases. "A dial worth turning" becomes "a parameter worth varying". Say what you mean. Rule 26 covers metaphor nouns.
33. **Over-compression.** Restore articles and verbs when fragments, symbols, or abbreviations make the reader decode the sentence. "Parser rejects bad date → exit 2, no write" becomes "The parser rejects a bad date, exits with code 2, and writes nothing." Write complete sentences and spell out arrows and abbreviations.
