# Set up xstack

Follow the [installation instructions](../../README.md#install) for Claude Code or Codex.

## Prerequisites

xstack needs git and your host. A few workflows need more, and you can add those when you reach them:

- **GitHub CLI (`gh`), logged in**, for opening, babysitting, and shipping pull requests. If the [Origin](https://cursor.com/docs/origin) CLI is installed and can resolve the repository, the PR workflows use it instead of `gh`.
- **[Bun](https://bun.sh)** for babysitting and shipping through GitHub, where it runs the bundled PR watcher, and for the Orchestrate playbook's bookkeeping script. Opening a PR and the Origin paths need no Bun.
- **[Graphite](https://graphite.dev) (`gt`)** only for the Orchestrate playbook, which reads the order of a PR stack from it. No other workflow uses Graphite.
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

If the project has no way to drive its real app, setup offers to run `/create-verification-skill` once.

Try `/poteto-mode explain how this project's main request path works`. The [next chapter](02-poteto-mode.md) explains task routing.
