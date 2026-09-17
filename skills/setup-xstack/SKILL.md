---
name: setup-xstack
description: Configure xstack models and reasoning budgets for Claude Code or Codex. Use for /setup-xstack, changing model roles, or setting a small, medium, large, or unlimited budget.
---

# Set up xstack

Read [Host runtime](../poteto-mode/references/host-runtime.md). Configure `~/.agents/xstack-models.md` for the active host. Keep the existing command and filename for compatibility.

1. Identify Claude Code or Codex and enumerate models and effort levels actually supported by the session or its model catalog. Do not assume a model name is available because it appears in a document. If discovery is unavailable, keep `inherit-parent` or ask for the user's known supported choice.
2. Read the existing config. Lines before host headings are legacy shared defaults. `## claude` and `## codex` override those lines for that host. Preserve the other host's settings. Remove the obsolete `how critics` role when migrating an existing file.
3. Ask for a budget unless the user already specified one. Offer `unlimited` to preserve per-entry effort, `large` for xhigh, `medium` for high, or `small` for medium. Preserve model choices, panel length, and inheritance aliases. These are reasoning targets, not spending limits. For unsupported effort, offer the highest supported effort at or below the target and show the actual selection. Do not invent effort suffixes or silently claim the requested effort ran.
4. Map roles. Prefer a fast coding model for feature, refactoring, bug-fix, perf-issue, hillclimb, explorers, investigators, and swarm workers. Use a stronger reasoning model for judgment, explanation, synthesis, and hard tasks. Default all roles to `inherit-parent` until a supported choice is confirmed. Panels default to four independent workers. Offer distinct models when available and report when the host provides only one.
5. Show the resulting table. Ask for confirmation only if the user's existing request leaves choices unresolved. Write the active host section without destroying shared defaults or the other host section. Keep secrets out of this file. Use `model @ effort` only when both are supported. `inherit-parent` and `auto` preserve both the parent's model and effort.
6. Resolve every role with `node <this skill directory>/scripts/models.mjs <claude|codex> "<role>"`. The `roles` export in that script is the complete role list. Check the resolved model and effort against the host's supported options. The resolver checks syntax and precedence, not account entitlement. Demonstrate one permitted delegation using the selected role if delegation is available. Otherwise report that runtime routing remains unverified.
7. Tell the user which host section changed and that skills read it before their next delegation. Offer create-verification-skill once if the project has no way to exercise its real product.

Example configuration with safe inherited defaults:

```text
# xstack model configuration
## claude
# budget: unlimited
feature, refactoring, bug-fix, perf-issue, hillclimb: inherit-parent
judgment and prose, hardest tasks: inherit-parent
how explorer, how explainer: inherit-parent
why investigators, why synthesizer: inherit-parent
reflect tooling, reflect judgment, divergent, synthesizer: inherit-parent
arena runners: inherit-parent, inherit-parent, inherit-parent, inherit-parent
arena cross-judge pool: inherit-parent, inherit-parent, inherit-parent, inherit-parent
swarm workers: inherit-parent
architect runners: inherit-parent, inherit-parent, inherit-parent, inherit-parent
interrogate reviewers: inherit-parent, inherit-parent, inherit-parent, inherit-parent

## codex
# budget: unlimited
feature, refactoring, bug-fix, perf-issue, hillclimb: inherit-parent
```

Missing roles inherit the parent, including four entries for panels. Repeated inherited entries preserve independent reviews but do not provide model diversity. Host restrictions on overriding a loaded agent take precedence over the requested config.
