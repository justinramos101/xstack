---
name: setup-xstack
description: Configure xstack models and reasoning budgets for Codex. Use for $setup-xstack, changing model roles, or setting a small, medium, large, or unlimited budget.
---

# Set up xstack

Read [Codex runtime](../poteto-mode/references/host-runtime.md). Write model roles where Codex loads them into every session: a marked block in Codex's global instructions file, `${CODEX_HOME:-~/.codex}/AGENTS.md`, or `AGENTS.override.md` in that folder when it has content, because Codex then loads it instead. `scripts/models.mjs` in this skill's directory reads and writes the loaded file, so never edit them by hand here.

1. Detect. Identify Codex. The detected models are the values the subagent spawn tool accepts in this session. They are the models `spawn_agent`'s description lists, each with the reasoning efforts listed beside it. If the tool lists nothing, ask the user for the models they know they can use. Do not assume a model is available because a document names it. `inherit-parent` and `auto` are always valid.
2. Read. Run `node <this skill directory>/scripts/models.mjs read codex`. It prints the current roles and names their file on stderr: Codex's loaded file, or the legacy shared `~/.agents/xstack-models.md` when Codex has no role block yet. With no file, it prints xstack's Codex defaults. A role a file leaves out also takes its default, which `models.mjs codex "<role>"` prints. A line whose role is not in the script's `roles` export, such as `how critics`, is from a retired role, and the write drops it. A model unavailable in this session becomes `inherit-parent`. Drop comment lines that recorded caveats this run resolves, such as unverified effort routing when the exposed spawn tool now takes an effort.
3. Budget. Ask for a budget unless the user already gave one, and name the current one. With no config, say that `large` matches the defaults. Offer `unlimited` to keep each entry's effort, `large` for xhigh, `medium` for high, or `small` for medium. A budget other than `unlimited` caps each entry's effort at its level and gives that level to an entry with no effort. It never raises an explicit lower effort, and no workflow raises effort past the cap. Budgets are reasoning targets, not spending limits. When a model does not support the target, offer its highest effort at or below the target and show what will actually run.
4. Map. Prefer a fast coding model for feature, refactoring, bug-fix, perf-issue, hillclimb, explorers, investigators, and swarm workers. Prefer a stronger reasoning model for judgment, explanation, synthesis, and the hardest tasks. Start every role from its current value, or its default when unset. The defaults follow pstack's split: coding roles use `gpt-6.1-sol` and judgment roles use `gpt-6-astra`, all at xhigh. A default model the spawn tool does not list needs a choice. Default panels have four entries, the judgment model and the coding model twice over, so a review gets four independent reads from two models. Arena runners, architect runners, and interrogate reviewers run one subagent per entry. The arena cross-judge pool lists alternatives, and arena picks one judge from it. Offer distinct models when the session exposes them, and say when it has only one.
5. Confirm. Show every role with its model and effort, mark any model not in the detected set as needing a choice, and list each line step 2 dropped or changed. Ask only about choices the user's request leaves open. Write each entry as `model @ effort` only when the spawn tool accepts both.
6. Write. Pipe the confirmed lines, the `# budget` line first, to `node <this skill directory>/scripts/models.mjs write codex`. It validates every line, replaces only the xstack block in the Codex instructions file it chose and keeps the rest of that file as it was. It never edits the file Codex is not loading. It prints the file it wrote. Never put the role lines anywhere else, and keep secrets out of them. Leave the legacy file in place for rollback; Codex now reads the marked block first.
7. Check. Resolve every role with `node <this skill directory>/scripts/models.mjs codex "<role>"` and compare each model and effort with the detected set. The script checks syntax and precedence, not account entitlement. If delegation is available, spawn one subagent with a configured role's model and effort and confirm it ran from the runtime's record, not the subagent's own answer: the child's `turn_context` model and effort in its session rollout. Otherwise say runtime routing is unverified.
8. Report. Name the file written and say the roles load in new sessions; the current session still has the old ones.
9. Offer a verification skill. If the project has no way to drive its real app, neither a `verify-*` skill nor an existing harness, offer once to generate one with create-verification-skill, so agents can drive the app the way a user does and prove changes work. On yes, run it. On no, move on.
10. Offer a formal verification skill. If the project has no formal verification skill, meaning a project skill that runs a model checker, a proof, or another verifier against the code, offer once to generate one with create-formal-verification-skill, so agents can prove a key property holds in every case in scope, not only the cases tests reach. On yes, run it. On no, move on.

Example draft for step 6, with the Codex defaults:

```text
# budget: large
feature, refactoring, bug-fix, perf-issue, hillclimb: gpt-6.1-sol @ xhigh
how explorer, why investigators, reflect tooling, swarm workers: gpt-6.1-sol @ xhigh
judgment and prose, hardest tasks: gpt-6-astra @ xhigh
how explainer, why synthesizer: gpt-6-astra @ xhigh
reflect judgment, divergent, synthesizer: gpt-6-astra @ xhigh
arena runners: gpt-6-astra @ xhigh, gpt-6.1-sol @ xhigh, gpt-6-astra @ xhigh, gpt-6.1-sol @ xhigh
arena cross-judge pool: gpt-6-astra @ xhigh, gpt-6.1-sol @ xhigh, gpt-6-astra @ xhigh, gpt-6.1-sol @ xhigh
architect runners: gpt-6-astra @ xhigh, gpt-6.1-sol @ xhigh, gpt-6-astra @ xhigh, gpt-6.1-sol @ xhigh
interrogate reviewers: gpt-6-astra @ xhigh, gpt-6.1-sol @ xhigh, gpt-6-astra @ xhigh, gpt-6.1-sol @ xhigh
```

A configured line reads like `feature: gpt-6.1-sol @ high`. Repeated inherited entries keep reviews independent but add no model diversity. Session restrictions on overriding a loaded agent take precedence over the configured roles.
