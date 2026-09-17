# The xstack guide

xstack is a plugin for Claude Code and Codex. It adds skills that make the agent understand code before editing it, design before building, prove its work on the real app, and ship small pull requests. It is a port of pstack, a Cursor plugin by Lauren Tan, so the same habits run in your host.

xstack works best when you stop micromanaging the agent. You describe what you want and how you'll know it's done. `/poteto-mode` picks the playbook, runs the other skills as the steps need them, and shows you the evidence. This guide teaches that habit with realistic prompts.

The pages, in order:

1. [Set up xstack](./01-setup.md). Install the plugin, check the prerequisites, and pick your models.
2. [Route work through `/poteto-mode`](./02-poteto-mode.md). Give it a goal and watch it pick a playbook.
3. [Understand the code](./03-understand.md). Run `/how`, `/why`, `/teach`, and `/recall` before you edit anything.
4. [Design the change](./04-design.md). Run `/architect`, `/arena`, `/swarm`, and `/interrogate` before code locks in a shape.
5. [Build and clean the change](./05-build-and-clean.md). Use the build playbooks, `/tdd`, `/unslop`, and `/no-comments`.
6. [Verify and ship](./06-verify-and-ship.md). Prove behavior on the real app, then open a focused PR and drive it to merged.
7. [Run work while you sleep](./07-overnight.md). Write an overnight contract, audit the decision log, and scale past one agent.
8. [Steer with principle names](./08-principles.md). Use the 23 names that redirect an agent mid-task.
9. [Make it yours](./09-make-it-yours.md). Generate your own mode and test a skill change.
10. [Recipes and pitfalls](./10-recipes-and-pitfalls.md). Copy the prompts and skip the mistakes.

Read the pages in order the first time. After that, each page stands alone.

## If you only remember one thing

Give the agent a goal and a way to check it, in your own words:

```text
/poteto-mode the export writes duplicate rows when a retry lands mid-run. repro first, then fix and verify.
```

You don't need to name a playbook or list skills. "repro first" and a checkable outcome are all the routing signal `/poteto-mode` needs. It reads the Bug fix playbook, copies the steps into a visible checklist using native task tools or a Markdown plan file, and calls the right skills as each step fires.

## Glossary

The guide and the skills use a few terms as if you already know them. Here they are.

- **Host.** The tool running the agent: Claude Code or Codex.
- **Skill.** A Markdown file of instructions the agent loads for one job. You invoke one as `/name` in Claude Code or `$name` in Codex. Some skills load on their own when a task triggers them.
- **poteto-mode.** The skill that routes every task. Named after Lauren Tan's GitHub handle, poteto. It captures her working style, and [Make it yours](./09-make-it-yours.md) shows how to generate your own.
- **Playbook.** An ordered checklist inside `/poteto-mode` for one kind of task, such as Bug fix, Feature, or Opening a PR. There are 23. You never invoke a playbook. `/poteto-mode` matches one from your prompt.
- **Principle.** A named rule, such as Prove It Works, that the agent applies and cites. You can steer the agent by saying the name. [Steer with principle names](./08-principles.md) lists all 23.
- **Worktree.** A second checkout of the same git repository in its own directory. Agents that edit at the same time each get their own worktree so their changes never collide. Read-only agents and agents that run one after another can share a checkout.
- **Stack, or stacked PRs.** A chain of pull requests. The first PR targets the repository's trunk, whatever your default branch is called. Each later PR branches from the one below it and targets that branch instead of trunk. Small dependent changes land one at a time, bottom first.
- **Frontier.** The lowest unmerged PR in a stack. It is the one that must merge before anything above it can, so the shipping workflows keep it green first.
- **Forge.** The service that hosts your pull requests. GitHub through the `gh` CLI by default. [Origin](https://cursor.com/docs/origin), Cursor's git host, when its `origin` CLI is installed and can resolve the repository.
- **Graphite.** A [command-line tool](https://graphite.dev) for stacked PRs, invoked as `gt`. Only the Orchestrate playbook needs it, to read the order of a stack. Everything else works without it.
- **Decision log, or trail.** The table `/show-me-your-work` keeps during a long run: one row per decision with the reason and a pointer to the evidence. You audit it instead of re-reading the whole session.
- **Verification skill.** A skill generated for your project that tells any agent how to launch your app, drive one feature, and capture proof that it worked.

Next: [Set up xstack](./01-setup.md).
