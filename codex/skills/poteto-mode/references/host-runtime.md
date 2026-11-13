# Host runtime

Resolve capabilities from the active session before executing a workflow. Host and user instructions take precedence over every default here. A missing optional capability changes the execution method, not the evidence required for completion.

## Models and delegation

setup-xstack writes model roles in the block between `<!-- xstack-models:start -->` and `<!-- xstack-models:end -->` in Codex's loaded global instructions file, `${CODEX_HOME:-~/.codex}/AGENTS.md` or, when it has content, `AGENTS.override.md`. Its `# xstack model roles` lines are then already in context. When a workflow names a role, take that role's line. If that line is not in context, run `node <setup-xstack skill directory>/scripts/models.mjs codex "<role>"`, which reads the host's file and falls back to the legacy `~/.agents/xstack-models.md`. Resolve the installed skill directory from the skill catalog, not the current project's working directory. A role with no line resolves to xstack's default for the host, mapped from pstack's lineup. Its fast coding roles use `gpt-6.1-sol @ xhigh`. Its judgment roles use `gpt-6-astra @ xhigh`. Default panels have four entries, the judgment model and the coding model twice over. The arena judge pool selects one entry, not a panel.

Apply the `# budget` line: a budget other than `unlimited` caps each entry's effort at the level it names and gives that level to an entry without one. No later adjustment raises a spawn's effort past that cap. The resolver does this for you. `inherit-parent` and `auto` omit both model and effort. Pass a configured model and effort through the spawn tool's own fields: `model` and `reasoning_effort` on Codex's `spawn_agent`. Check both against what that tool lists in this session. When it rejects or does not list a model, such as a model from the other host or one the vendor has retired, omit the model, run the role on the parent, and say in the reply which role lost which model and that `setup-xstack` repicks it. When it does not support the effort, use the model's highest effort at or below it and say which ran. Never claim model diversity without actual model metadata. Do not change the user's global host configuration as a fallback.

Codex may expose built-in or registered agents with different names. On Codex the plugin ships these definitions as TOML files under `agents/`, and copying them into `${CODEX_HOME:-~/.codex}/agents/` lets `spawn_agent` target them by name. Both install methods include the helper prompts in `poteto-mode/references/agents/`, relative to the installed skills directory. When `poteto-agent` or `comment-sicko` is not loaded, read its Markdown prompt there and pass the full content to an available general agent as instructions. Pass the absolute paths of any skills it needs. The plugin also keeps the existing `agents/*.toml` files for compatibility. A partial skill install must include `poteto-mode` for these prompts; if unavailable, perform the work in the current session and report the limitation.

Use the host's subagent API and supported arguments. `subagent_type`, `readonly`, model, background, and environment labels in a workflow describe intent, not a portable API schema. Choose a loaded agent by name only when the API supports it, using its actual field such as `agent_type` or `subagent_type`; otherwise pass the bundled prompt as task instructions. A read-only task gets an explicit no-writes contract and the read-only controls the host actually offers, when available. Those controls can still leave a shell, so check `git status` after a read-only worker returns. Do not assume that read-only mode removes MCP access. Follow actual tool permissions.

Parallelize within the session's available slots. Queue additional lanes until slots free up. If nesting is unavailable, the root dispatches the child work. If subagents are unavailable, run the same independent checks sequentially and report the reduced independence. Give concurrent writers separate worktrees and explicit file ownership. Never assume subagents or a remote execution service have isolated filesystems.

## Plans and task tracking

A workflow's todo list is a visible record of its steps and their status. Use a task or planning tool only when it is exposed and permitted in the active session. Do not assume `TodoWrite`, `TodoRead`, or `update_plan` exists. If no suitable tool is available, use a Markdown plan file as the scratchpad. Preserve the full step text there if a tool cannot represent it.

Reuse the run's existing plan file. Otherwise create `.agents/state/xstack/<run-id>/plan.md`, with a unique run ID so concurrent runs do not share it. Keep local scratch state out of commits using an existing ignore rule or Git's local exclude file. Record the objective, playbook path, step checklist, and concise evidence or blockers. Keep unfinished steps unchecked, mark the current step `in_progress`, and annotate skipped steps with `skip: <reason>`. Update the file as work proceeds. Link it in progress messages and carry its path into handoff or compaction notes so the next session can read it before resuming. If file writes are unavailable or prohibited, keep the same checklist in progress messages instead.

Prefer the active host's native tools when available:

| Host | Task tracking |
| --- | --- |
| Codex | `update_plan`. Check the session's tool catalog; some sessions do not expose it. |

Use each tool's actual schema. A host name alone does not establish tool availability. See [Codex's local function tools](https://learn.chatgpt.com/docs/hooks#tool-coverage).

Read the matched playbook before creating the checklist. Its index description is only a routing hint. Copy its steps verbatim before adding task-specific items. A command's numbered procedure can contain the playbook workflow within one of its steps; it does not replace required reading. Follow explicit user overrides and host instructions. Missing task-tracking tools never waive reading, verification, or evidence requirements.

## Goals, waits, and durable state

A `/goal` in a playbook means a durable statement of the done condition. Use a native goal tool only when the user explicitly requests it and the host supports it. Otherwise record the condition in the run's plan. A `/loop` means an active watcher or timed check. Use the host's supported scheduler, event wait, or bounded polling in the active session. A sleep does not schedule work after the session ends. Report that limit and write a resume checkpoint when no persistent scheduler exists.

Cloud workers and sleeper chains are optional. Use isolated local worktrees when remote execution is unavailable. Do not invent cloud IDs, URLs, background survival, or nested-agent support. When a step needs a feature the active host lacks, such as Cursor Automations, setting up Bugbot, or a cloud agent's own dashboard, write one line, `Skipped in <host>: <step>. <reason>.`, and go on to the next step. Do not stop, ask, or retry. When a later step needs what the skipped step would have made, such as a URL or a key, leave a placeholder and name it in that line. Bugbot comments already on a PR are ordinary review threads, so triage them as the step says. Keep progress reports within the host's communication cadence even when a workflow calls for a longer audit interval.

When the host has no agent store, use a gitignored project directory such as `.agents/state/xstack/<run-id>/`. Use absolute paths in local worker briefs. Remote workers need committed repository paths or the relevant brief content. Resolve `scripts/`, `playbooks/`, and `references/` against the containing skill, not the user's project root.

## Verification, questions, and transcripts

Use a project's `verify-*` skill or an available browser, native-app, or CLI driver. If none exists, build a narrow scripted check or use create-verification-skill. Missing UI access is a blocked verification result, never a passing result. A deslop pass removes dead code, redundant abstractions, and narration comments, using no-comments where appropriate. Skill authoring needs valid name and description frontmatter and concrete instructions; an additional authoring skill is optional.

Use the host's structured question tool when available, otherwise ask in chat. Do not infer approval from a timeout. Existing authorization remains in effect. External messages, irreversible actions, and deployment follow the current user's scope and host rules.

Prefer a session-provided transcript path or history API. Codex commonly stores transcripts under `~/.codex/sessions/`. Identify the exact session by metadata and workspace before reading message bodies. Do not mine every project or infer workspace membership from a date directory. If the active host uses a different storage format, use its supported history interface. When the transcript is unavailable, use the conversation and repository evidence and label the gap.

## Skill discovery

Codex project skills live under `.agents/skills/` and user skills under `~/.agents/skills/`. Discover installed skills through the session's catalog. A `/<skill>` in these documents denotes invocation by name; Codex can invoke the same skill with `$<skill>` or the installed skill interface. Do not assume a slash command exists in every host.

Explicit invocation is controlled by `agents/openai.yaml` with `policy.allow_implicit_invocation: false`.

Sources checked for this port: [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents), [Codex skill metadata](https://learn.chatgpt.com/docs/build-skills). The active host's schema and policy remain authoritative.
