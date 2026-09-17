# xstack

xstack is a plugin for Claude Code and Codex. It gives the agent a set of working habits: understand the code before editing it, design before building, prove the change on the real app, and ship small reviewable pull requests. You describe a goal in plain words. The agent picks a playbook for it, runs the steps, and reports back with evidence.

xstack is a port of [pstack](https://github.com/cursor/plugins/tree/main/pstack), a Cursor plugin by Lauren Tan. pstack runs only inside Cursor. xstack carries the same skills, playbooks, and principles to Claude Code and Codex.

## What you get

- **`/poteto-mode`, the front door.** Give it a task and it matches one of 23 playbooks, such as bug fix, feature, refactoring, investigation, or opening a PR. It then runs the other skills as the steps need them. The name comes from Lauren Tan's GitHub handle, poteto. The skill captures her working style, and you can [generate your own](docs/guide/09-make-it-yours.md).
- **Skills you call directly.** `/how` and `/why` explain code and its history. `/architect`, `/arena`, and `/interrogate` design and stress-test a change. `/tdd`, `/unslop`, and `/no-comments` build and clean it. There are 47 skills in total.
- **23 named principles.** Rules such as Prove It Works and Subtract Before You Add. The agent applies them on its own and you can steer it by naming one.
- **Benny, an optional Slack bot.** It triages issue reports and tries to reproduce them. It is dormant until you [set it up](automations/benny/README.md). Installing xstack turns on no automation.

## Install

### Claude Code

```text
/plugin marketplace add justinramos101/xstack
/plugin install xstack@xstack
```

The plugin is the recommended install. It includes the helper agent definitions the workflows use and a hook that tells each session where the skill files live. Most xstack skills are meant to be run by you, not chosen by the model on its own, and Claude Code hides those from the model unless the hook is present.

You can instead copy individual skill folders into `.claude/skills/` for one project or `~/.claude/skills/` for your account. That works for single skills, but the model cannot find the hidden skills without the hook.

### Codex

```sh
codex plugin marketplace add justinramos101/xstack
```

Then run `codex plugin add xstack@xstack`, or install xstack from the Plugins interface.

For a skill-only install, copy skill folders into `.agents/skills/` or `~/.agents/skills/`. Create those directories if they do not exist. If you already have a skill with the same name, keep your copy. A skill-only install has no bundled agent prompts, so workflows that need them run inline and say so.

## First task

1. Run `setup-xstack`. It detects the models your host offers, asks for a reasoning budget, and writes `~/.agents/xstack-models.md`.
2. Run `poteto-mode` with a concrete task and a way to tell when it's done:

```text
/poteto-mode the export writes duplicate rows when a retry lands mid-run. repro first, then fix and verify.
```

Claude Code invokes skills as slash commands. Codex also accepts `$skill-name`. The [guide](docs/guide/README.md) walks through a first task, verification, and overnight runs, and has a [glossary](docs/guide/README.md#glossary) for the terms the workflows use.

## What each workflow needs

Most of xstack needs nothing beyond git and your host. A few workflows lean on other tools.

| You want to | You need |
| --- | --- |
| Open pull requests | GitHub CLI (`gh`), logged in. If the [Origin](https://cursor.com/docs/origin) CLI is installed and can resolve the repository, the PR workflows use it instead of `gh`. |
| Babysit or ship pull requests on GitHub | `gh` plus [Bun](https://bun.sh), which runs the bundled PR watcher. On Origin the workflows call the `origin` CLI directly and need no Bun. |
| Run the Orchestrate playbook, a multi-day program with many stacked PRs | [Graphite](https://graphite.dev) (`gt`) and Bun. Orchestrate reads the order of a PR stack from Graphite and keeps its bookkeeping with a bundled Bun script. No other workflow needs Graphite. |
| Leave a task running overnight | A scheduler or watcher that survives the session. Claude Code has `/loop`. Without a persistent runner, the loop stops when the session ends. |
| Verify a change in a UI | A way to drive the app: a browser, a native-app driver, or a CLI. `/create-verification-skill` writes one for your project. |
| Run Benny | A Slack app, an event runner, credentials, and your explicit authorization. See the [Benny README](automations/benny/README.md). |

When a bundled helper agent or model is missing, the workflow says so and uses what the host has instead. A missing app driver is different. UI verification then reports blocked, never a pass.

## Contributing

xstack tracks pstack release by release. The pinned upstream revision is in [docs/upstream.json](docs/upstream.json). Run the tests before opening a PR:

```sh
node --test scripts/*.test.mjs
cd skills/poteto-mode/scripts && bun install --frozen-lockfile && bun run test && bun run typecheck
```

A release is a version bump in both plugin manifests, `.claude-plugin/plugin.json` and `.codex-plugin/plugin.json`.

## License

xstack is MIT licensed. The original pstack work is by Lauren Tan. See [LICENSE](LICENSE).
