# Codex runtime

Check the active session's tools before executing a workflow. Codex, T3, and user instructions take precedence over these defaults. A missing optional tool changes the method, not the evidence required for completion.

## Models and delegation

`$setup-xstack` writes model roles between `<!-- xstack-models:start -->` and `<!-- xstack-models:end -->` in Codex's loaded global instructions file. That file is `${CODEX_HOME:-~/.codex}/AGENTS.md`, or `AGENTS.override.md` when the override has content. Use the role lines already in context. Otherwise run `node <setup-xstack skill directory>/scripts/models.mjs codex "<role>"`. The resolver reads that file and falls back to the legacy `~/.agents/xstack-models.md`. Resolve the installed skill directory from the skill catalog, not the project's working directory.

A role with no configured line uses xstack's Codex defaults. Coding roles use `gpt-6.1-sol @ xhigh`. Judgment roles use `gpt-6-astra @ xhigh`. Default panels have four entries, two on each model. The arena judge pool selects one entry, not a panel.

Apply the `# budget` line. Any value other than `unlimited` caps each entry's reasoning effort and supplies the effort for entries without one. No workflow adjustment may exceed that cap. The resolver applies it for you. `inherit-parent` and `auto` omit model and effort overrides.

Use the exposed spawn tool's actual fields and listed model choices. Some Codex sessions expose `spawn_agent`; T3 sessions can expose different delegation tools. Pass the configured model and effort only when that API supports them. Follow its rules for inherited conversation context. If it cannot run a configured model, inherit the parent model and report which role lost its configured model. `$setup-xstack` can select a replacement. If an effort is unsupported, use the highest supported effort at or below it and report what ran. Never claim model diversity without actual model metadata. Do not change global configuration as a fallback.

Codex custom agent definitions are TOML files in project `.codex/agents/` or user `~/.codex/agents/`, respecting `CODEX_HOME` when set. This plugin ships definitions under `agents/`. Use a named agent only when it is registered and the exposed tool supports selecting it. Both installation methods also bundle the helper prompts at `poteto-mode/references/agents/`, relative to the installed skills directory. When `poteto-agent` or `comment-sicko` cannot be selected, read its Markdown prompt there and pass the full content as instructions to an available agent. Pass absolute paths for the skills it must read. A partial installation must include `poteto-mode` for those prompts. If no delegate is available, perform the work in the current session and report the reduced independence.

A read-only assignment is an explicit no-writes contract in the agent's brief. It does not create a separate sandbox or remove MCP tools. Keep the MCP read access the task needs and follow the actual session permissions. Check `git status` after a read-only worker returns. Give concurrent writers separate worktrees and explicit file ownership. Never assume agents have isolated filesystems.

Work within the available agent slots and queue extra lanes. If nested delegation is unavailable, the root dispatches the child work. If delegation is unavailable, run the checks sequentially and report the reduced independence.

## Plans and task tracking

Use `update_plan` or the exposed T3 planning tool when it is available and permitted. Use the tool's actual schema. If no suitable tool exists, keep the checklist in a Markdown plan file. Preserve the full step text there when the tool cannot represent it.

Reuse the run's existing plan file. Otherwise create `.agents/state/xstack/<run-id>/plan.md` with a unique run ID. Keep this local state out of commits with an existing ignore rule or Git's local exclude file. Record the objective, playbook path, step checklist, evidence, and blockers. Leave unfinished steps unchecked, mark the current step `in_progress`, and annotate a skipped step with `skip: <reason>`. Update the plan as work proceeds. Link it in progress and handoff notes. If file writes are prohibited, keep the checklist in progress messages.

Read the matched playbook before creating the checklist. Its index description only routes the task. Copy its steps before adding task-specific items. Follow explicit user overrides. Missing planning tools never waive reading, verification, or evidence requirements.

## Goals, waits, and durable state

Codex `/goal` starts Goal mode when that feature is available. Create a native goal only when the user explicitly requests Goal mode or a goal. An ordinary request to finish work does not authorize goal creation. Otherwise record the done condition in the run's plan and continue the authorized work.

For ongoing work, use an exposed event wait, watcher, or bounded polling in the active session. Prefer a completion event to repeated status checks. Keep progress reports within the session's communication cadence. A sleeping process or agent does not schedule a future turn after the session ends. Record a resume checkpoint before ending work that still needs another check.

Create or change native Scheduled tasks only when the user requests future or recurring execution and the session exposes the scheduling tools. For a follow-up to the current task, target this same chat so the scheduled turn retains its context. Use a standalone scheduled task with an independent chat when the user requests one. A local desktop task requires the machine to be on and the app to remain open. Codex CLI and IDE sessions do not manage Scheduled tasks. An autonomy grant for the current task does not by itself request a future schedule. If the requested scheduler is unavailable, state the limit and preserve the next check in the run's plan.

Use `.agents/state/xstack/<run-id>/` for local run state, briefs, checkpoints, and evidence paths unless the user names another location. Use absolute paths in local agent briefs. A remote worker needs committed repository paths or the relevant brief content. Use remote execution only when an exposed service supports it. Do not invent IDs, URLs, persistence, or nested-agent support. Resolve `scripts/`, `playbooks/`, and `references/` against the containing skill, not the project root.

## Verification, questions, and transcripts

Use the project's `verify-*` skill or an available browser, native-app, or CLI driver. If none exists, build a narrow scripted check or use `$create-verification-skill`. Missing UI access blocks UI verification. It never counts as a passing result. A deslop pass removes dead code, redundant abstractions, and narration comments, using `$no-comments` where appropriate.

Use an exposed structured question tool only when its instructions permit it. Follow its actual question and option schema. Otherwise ask in chat. Do not infer approval from a timeout. Existing authorization remains in effect. External messages, irreversible actions, and deployments follow the user's scope and session rules.

Prefer an exact session-provided transcript path or history API. Codex commonly stores transcripts under `~/.codex/sessions/`. Identify the session by metadata and workspace before reading message bodies. Do not search unrelated projects or infer workspace membership from a date directory. Use T3's supported history tools when the session is managed there. If the transcript is unavailable, use the visible conversation and repository evidence, and label the gap.

## Skill discovery

Codex project skills live under `.agents/skills/` and user skills under `~/.agents/skills/`. Discover installed skills through the session's catalog. Invoke a skill with `$skill-name` or the installed skill interface. Filesystem references remain paths.

For authoring, use `$skill-creator` when it is available, or write `SKILL.md` directly with valid `name` and `description` frontmatter and concrete instructions. Set explicit invocation in `agents/openai.yaml` with `policy.allow_implicit_invocation: false` when needed. Do not add invocation policy to SKILL.md frontmatter.

## Optional deterministic hooks

xstack does not install hooks by default. A maintainer can opt into deterministic checks through supported Codex events such as `PreCompact`, `SubagentStop`, and `Stop`. Configure hooks only within the session's trust rules. Keep them narrow and repeatable, and use them for concrete checks or checkpoints. A hook does not grant authorization or replace the workflow's verification.

References: [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents), [Codex skill metadata](https://learn.chatgpt.com/docs/build-skills), and [Codex hooks](https://learn.chatgpt.com/docs/hooks). The active tool schema and session policy remain authoritative.
