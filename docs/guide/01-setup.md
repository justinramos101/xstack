# Set up xstack

Follow the [installation instructions](../../README.md#install) for Claude Code or Codex.

## Prerequisites

xstack needs git and your host. A few workflows need more, and you can add those when you reach them:

- **GitHub CLI (`gh`), logged in**, for opening, babysitting, and shipping pull requests. If the [Origin](https://cursor.com/docs/origin) CLI is installed and can resolve the repository, the PR workflows use it instead of `gh`.
- **[Bun](https://bun.sh)** for babysitting and shipping through GitHub, where it runs the bundled PR watcher, and for the Orchestrate playbook's bookkeeping script. Opening a PR and the Origin paths need no Bun.
- **A scheduler that outlives the session** for overnight runs. Claude Code has `/loop`. Without one, a run stops when the session ends.
- **A way to drive your app** for UI verification. The [verify and ship](./06-verify-and-ship.md#create-a-project-verification-skill) page shows how to generate one.

## Pick your models

Invoke `/setup-xstack` through your host's skill interface. It detects available models, asks for a reasoning budget, and writes the active host's section in `~/.agents/xstack-models.md`. A role with no model inherits the parent model. Panels always run independent workers, but they gain model diversity only when you configure two or more distinct models.

A budget sets a reasoning effort target, not a dollar limit:

| Budget | Effort |
| --- | --- |
| `unlimited` | Keeps the effort each entry already has |
| `large` | xhigh |
| `medium` | high |
| `small` | medium |

Not every host and model supports every effort. When the target is unsupported, setup offers the highest supported effort at or below it.

The [host runtime](../../skills/poteto-mode/references/host-runtime.md) defines model resolution, agent fallbacks, local worktrees, transcript lookup, and scheduling. Each workflow reads that file when you invoke the workflow directly. Claude Code and Codex may expose different tool names and limits.

You only override what you care about. To change a role later, rerun `/setup-xstack` or edit that role's line in `~/.agents/xstack-models.md`.

## Accept the verification offer, or don't

If the project has no way to drive its real app, either a `verify-*` skill or an existing harness, setup offers once to run [`/create-verification-skill`](../../skills/create-verification-skill/SKILL.md). Say yes and it writes a project-local `verify-<app>` skill under `.claude/skills/` or `.agents/skills/` that teaches agents to drive your app the way a user does. It proves the skill works once before handing it over. Say no and setup moves on. You can run `/create-verification-skill` yourself any time. [Verify and ship](./06-verify-and-ship.md#create-a-project-verification-skill) covers it in depth.

If you're new to xstack, say yes. An agent that can check its own work keeps going until the check passes. An agent that can't hands every result back to you to check by hand. Of everything in this guide, the verification skill pays off the most.

## Keep the cost in check

xstack spends extra tokens on subagents and review panels. That's the price of the rigor. To spend fewer:

- Rerun `/setup-xstack` and pick a smaller reasoning budget or cheaper models. A strong model in the main session with cheaper, faster models in the code roles is a good split.
- Set a role to `inherit-parent` or `auto` so it runs on the session's own model and effort.
- Shorten a panel list. Each entry runs one subagent.
- Save `/poteto-mode` for work that needs rigor. A small, obvious edit doesn't.

## Run your first task

Try `/poteto-mode explain how this project's main request path works`, or `$poteto-mode` in Codex. Put the task in the same message so the skill is attached to it. From there you can type normal follow-ups. In a long session, invoke `/poteto-mode` again when you start a new task, so its rules are fresh in context. The [next chapter](02-poteto-mode.md) explains task routing.
