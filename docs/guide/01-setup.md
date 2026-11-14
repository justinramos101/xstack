# Set up xstack

Follow the [installation instructions](../../README.md#install) for Codex.

## Prerequisites

xstack needs git and Codex. A few workflows need more, and you can add those when you reach them:

- **GitHub CLI (`gh`), logged in**, for opening, babysitting, and shipping pull requests. If the [Origin](https://cursor.com/docs/origin) CLI is installed and can resolve the repository, the PR workflows use it instead of `gh`.
- **[Bun](https://bun.sh)** for babysitting and shipping through GitHub, where it runs the bundled PR watcher, and for the Orchestrate playbook's bookkeeping script. Opening a PR and the Origin paths need no Bun.
- **Goal mode or a scheduled task** for unattended work. Active-session checks stop when the session ends. [Overnight work](./07-overnight.md) covers what each client can keep running.
- **A way to drive your app** for UI verification. The [verify and ship](./06-verify-and-ship.md#create-a-project-verification-skill) page shows how to generate one.

## Pick your models

Invoke `$setup-xstack` in Codex CLI or the IDE extension, or select it from the desktop app's skill picker. It reads the models and efforts the Codex subagent tool offers, asks for a reasoning budget, and writes the roles into a marked xstack block in `~/.codex/AGENTS.md` for new sessions. The rest of your `AGENTS.md` stays as it was. Until you run it, every role uses xstack's defaults, mapped from pstack's lineup of a fast coding model and a stronger judgment model, all at xhigh:

| Roles | Codex |
| --- | --- |
| feature, refactoring, bug-fix, perf-issue, hillclimb, how explorer, why investigators, reflect tooling, swarm workers | `gpt-6.1-sol @ xhigh` |
| judgment and prose, hardest tasks, how explainer, why synthesizer, reflect judgment, divergent, synthesizer | `gpt-6-astra @ xhigh` |
| arena runners, arena cross-judge pool, architect runners, interrogate reviewers | `gpt-6-astra @ xhigh, gpt-6.1-sol @ xhigh`, twice over |

When subagents are available, panels run independent workers. Model diversity requires distinct supported models. The workflow reports any fallback that reduces independence or model diversity.

A budget sets a reasoning effort target, not a dollar limit:

| Budget | Effort |
| --- | --- |
| `unlimited` | Keeps the effort each entry already has |
| `large` | xhigh |
| `medium` | high |
| `small` | medium |

Not every Codex session and model supports every effort. When the target is unsupported, setup offers the highest supported effort at or below it.

The [Codex runtime](../../src/skills/poteto-mode/references/host-runtime.md) defines model resolution, agent fallbacks, local worktrees, transcript lookup, and scheduling. Each workflow reads that file when you invoke the workflow directly. Tool names and limits depend on the active session.

You only override what you care about. To change a role later, rerun `$setup-xstack`. The new roles apply to new sessions. If you set up an earlier xstack, setup reads your old `~/.agents/xstack-models.md` once and moves the Codex roles over. Keep the old file for rollback. The Codex block takes precedence.

## Accept the verification offers, or don't

If the project has no way to drive its real app, either a `verify-*` skill or an existing harness, setup offers once to run [`$create-verification-skill`](../../src/skills/create-verification-skill/SKILL.md). Say yes and it writes a project-local `verify-<app>` skill under `.agents/skills/` that teaches agents to drive your app the way a user does. It proves the skill works once before handing it over. Say no and setup moves on. You can run `$create-verification-skill` yourself any time. [Verify and ship](./06-verify-and-ship.md#create-a-project-verification-skill) covers it in depth.

If you're new to xstack, say yes. An agent that can check its own work keeps going until the check passes. An agent that can't hands every result back to you to check by hand. Of everything in this guide, the verification skill pays off the most.

Then setup offers once to generate a formal verification skill with [`$create-formal-verification-skill`](../../src/skills/create-formal-verification-skill/SKILL.md), unless the project already has one. Tests check the cases someone thought to write. A formal verification skill checks one key property of your code, such as "a job never runs twice at once", in every case within a stated scope. Say yes when your code has concurrency, retries, a state machine, or a parser, where a bug is costly and tests rarely reach the case that breaks. Otherwise say no, and run it later if that changes. [Verify and ship](./06-verify-and-ship.md#prove-a-property-with-a-formal-verification-skill) covers it.

## Keep the cost in check

xstack spends extra tokens on subagents and review panels. That's the price of the rigor. To spend fewer:

- Rerun `$setup-xstack` and pick a smaller reasoning budget or cheaper models. A strong model in the main session with cheaper, faster models in the code roles is a good split.
- Set a role to `inherit-parent` or `auto` so it runs on the session's own model and effort.
- Shorten a panel list. Each entry runs one subagent.
- Save `$poteto-mode` for work that needs rigor. A small, obvious edit doesn't.

## Run your first task

Try `$poteto-mode explain how this project's main request path works`. Put the task in the same message so the skill is attached to it. From there you can type normal follow-ups. In a long session, invoke `$poteto-mode` again when you start a new task, so its rules are fresh in context. The [next chapter](02-poteto-mode.md) explains task routing.

Codex first reads skill names and descriptions, then loads the selected skill's full instructions. Keep descriptions concise and put detailed procedures in `SKILL.md` and its references. Optional `agents/openai.yaml` metadata controls appearance, dependencies, and invocation policy. Setting `policy.allow_implicit_invocation: false` requires explicit invocation. See [Build skills](https://learn.chatgpt.com/docs/build-skills).

## Manual install

The plugin is optional. For a complete skills install, clone the repository and link the rendered skills (see the [README](../../README.md#install)). Both install methods include helper prompts, references, scripts, and Codex invocation policies. Updating a linked checkout with `git pull` updates existing skills; rerun the installer to link newly added skills.

For selected skills, copy whole folders from `codex/skills/` into `.agents/skills/` for one project or `~/.agents/skills/` for your account. Include `poteto-mode` for its shared runtime and helper prompts, plus any sibling skills the chosen workflow calls. Preserve each folder's `agents/openai.yaml` and scripts. Copying `src/skills/` directly skips Codex prompt rendering.

Use one install method at a time. Existing plugin users can keep their installation and update normally. To switch, disable or uninstall the plugin in Codex before linking the skills. Keep the same model-role block; no setup migration is required. Never overwrite a same-name personal skill without reviewing it.
