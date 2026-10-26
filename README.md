# xstack

xstack is a plugin for Claude Code and Codex. It gives the agent a set of working habits: understand the code before editing it, design before building, prove the change on the real app, and ship small reviewable pull requests. You describe a goal in plain words. The agent picks a playbook for it, runs the steps, and reports back with evidence.

xstack is a port of [pstack](https://github.com/cursor/plugins/tree/main/pstack), a Cursor plugin by Lauren Tan. pstack runs only inside Cursor. xstack carries the same skills, playbooks, and principles to Claude Code and Codex.

## What you get

- **`/poteto-mode`, the front door.** Give it a task and it matches one of 23 playbooks, such as bug fix, feature, refactoring, investigation, or opening a PR. It then runs the other skills as the steps need them. The name comes from Lauren Tan's GitHub handle, poteto. The skill captures her working style, and you can [generate your own](docs/guide/09-make-it-yours.md).
- **Skills you call directly.** `/how` and `/why` explain code and its history. `/architect`, `/arena`, and `/interrogate` design and stress-test a change. `/tdd`, `/unslop`, and `/no-comments` build and clean it. `/benchmark-checklist` vets a measured speedup or regression before you report it. `/create-formal-verification-skill` proves a key property, such as "a job never runs twice at once", in every case within a stated scope, where tests rarely reach. There are 57 skills in total.
- **Skills that help you steer.** `/poteto-help` finds the skill, playbook, or principle that fits what you're trying to do and hands you a prompt to type. `/in-your-own-words` has the agent play back your goal and the problem before it starts. `/sharpen` aims a task at what you're really after, the way a top expert would approach it. `/ketchup` sums up what changed in a long chat since your last message. `/correct` mines your history for mistakes you keep correcting and fixes each one where it can be enforced, such as types, lint, CI, or tests, before falling back to docs.
- **24 named principles.** Rules such as Prove It Works, Subtract Before You Add, and Explain the Number. The agent applies them on its own and you can steer it by naming one.
- **Benny, an optional Slack bot.** It triages issue reports and tries to reproduce them. It is dormant until you [set it up](automations/benny/README.md). Installing xstack turns on no automation.

## Install

### Claude Code

```text
/plugin marketplace add justinramos101/xstack
/plugin install xstack@xstack
```

Claude Code leaves auto-update off for third-party marketplaces, so xstack stays on the version you installed. To turn it on, run `/plugin`, open the **Marketplaces** tab, select `xstack`, and choose **Enable auto-update**. To update once by hand, run `claude plugin update xstack@xstack`.

### Codex

```sh
codex plugin marketplace add justinramos101/xstack
codex plugin add xstack@xstack
```

Or install xstack from the Plugins interface. To copy individual skills instead of installing the plugin, see [Manual install](docs/guide/01-setup.md#manual-install).

## First task

1. Run `setup-xstack`. It reads the models your host's subagent tool offers, asks for a reasoning budget, and writes the roles where the host loads them into every new session: `~/.claude/rules/xstack-models.md` in Claude Code, or a marked xstack block in `~/.codex/AGENTS.md` in Codex.
2. Run `poteto-mode` with a concrete task and a way to tell when it's done:

```text
/poteto-mode the export writes duplicate rows when a retry lands mid-run. repro first, then fix and verify.
```

Invoke `poteto-mode` by name with your task in the same message, so the skill is attached to it. Claude Code invokes skills as slash commands. Codex also accepts `$poteto-mode`, or any `$skill-name`. Stuck, or unsure which skill fits? Run `/poteto-help`. The [guide](docs/guide/README.md) walks through a first task, verification, and overnight runs, and has a [glossary](docs/guide/README.md#glossary) for the terms the workflows use.

## What each workflow needs

Most of xstack needs nothing beyond git and your host. A few workflows lean on other tools.

| You want to | You need |
| --- | --- |
| Open pull requests | GitHub CLI (`gh`), logged in. If the [Origin](https://cursor.com/docs/origin) CLI is installed and can resolve the repository, the PR workflows use it instead of `gh`. |
| Babysit or ship pull requests on GitHub | `gh` plus [Bun](https://bun.sh), which runs the bundled PR watcher. On Origin the workflows call the `origin` CLI directly and need no Bun. |
| Run the Orchestrate playbook, a multi-day program with many stacked PRs | `gh`, or the `origin` CLI on Origin, plus Bun. Orchestrate reads the order of a PR stack by walking the PR base chain through the forge, and keeps its bookkeeping with a bundled Bun script. No workflow needs Graphite. |
| Leave a task running overnight | A scheduler or watcher that survives the session. Claude Code has `/loop`. Without a persistent runner, the loop stops when the session ends. |
| Verify a change in a UI | A way to drive the app: a browser, a native-app driver, or a CLI. `/create-verification-skill` writes one for your project. |
| Formally verify a property | A verifier the project's developers can install, such as TLA+ for ordering bugs. `/create-formal-verification-skill` picks one and says why. |
| Run Benny | A Slack app, an event runner, credentials, and your explicit authorization. See the [Benny README](automations/benny/README.md). |

When a bundled helper agent or model is missing, the workflow says so and uses what the host has instead. A missing app driver is different. UI verification then reports blocked, never a pass.

## Contributing

xstack tracks pstack release by release. The pinned upstream revision is in [docs/upstream.json](docs/upstream.json). Edit skills and agents under `src/`, and host-only data under `hosts/`. Then render the Claude Code and Codex plugin trees in `claude/` and `codex/`, commit them with the change, and run the tests before opening a PR:

```sh
node scripts/build.mjs
node --test scripts/*.test.mjs
claude plugin validate --strict ./claude
cd src/skills/poteto-mode/scripts && bun install --frozen-lockfile && bun run test && bun run typecheck
```

A release is a version bump in `src/plugin.json`, the only place the version lives. The build copies it into each tree's manifests, and merging the bump to `main` tags and publishes a GitHub release. [Releasing](docs/releasing.md) covers that and how to try a change before it ships.

## License

xstack is MIT licensed. The original pstack work is by Lauren Tan. See [LICENSE](LICENSE).
