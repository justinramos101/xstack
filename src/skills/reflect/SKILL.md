---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
---

# Reflect

Read [Codex runtime](../poteto-mode/references/host-runtime.md) before using Codex tools or delegating. Resolve configured roles there even when this skill is invoked directly.

Mine the current conversation for durable learnings, then route them into skill edits.

Invoke when the user says "reflect" or "$reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## 1. Locate the active transcript

Before fanning out, find this conversation's transcript. Use the exact active-session path or history API described in Codex runtime. Do not glob across unrelated project transcript directories. That crosses workspace boundaries and reads private chats from unrelated projects.

Match workspace and session metadata before reading transcript messages. Codex and T3 can expose different transcript formats. If the exact session cannot be resolved, pass a tight digest of the visible conversation and identify it as incomplete.

## 2. Spawn three reviewers in parallel

Launch three available agents within the session's concurrency limit. Give each its referenced prompt and a no-writes contract. Read-only is an assignment, not a separate sandbox. Keep the MCP read access each review needs. Reviewers need MCP access to look up the tickets, chat threads, and observability traces the transcript references. Follow the session permissions described in Codex runtime.

Each reviewer and the synthesizer name a role, resolved per Codex runtime. Omit model and effort overrides when the value is `auto` or `inherit-parent`. If the session cannot run a configured model, run that subagent on the parent model and say so. Pick each subagent's effort for the job, and fast mode only when the session exposes it, per the Subagents section of the **poteto-mode** skill.

| Lens | Role | Prompt template |
|---|---|---|
| Judgment | `reflect judgment` | `references/judgment-reviewer.md` |
| Tooling | `reflect tooling` | `references/tooling-reviewer.md` |
| Divergent | `divergent` | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the transcript path or digest where marked. Reviewers return findings in the subagent response body.

## 3. Synthesize

Give one available agent the synthesizer prompt, the model from the `synthesizer` role, and a no-writes contract. Keep the MCP read access it needs. It spot-verifies citations through MCP. Follow the session permissions described in Codex runtime. Pass `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. It returns an Accepted / Rejected / Backlog list.

## 4. Structural enforcement check

Move any Accepted item that a lint rule, script, metadata flag, or runtime check would enforce more reliably to Backlog. See the **encode-lessons-in-structure** principle skill.

## 5. Apply

Present the synthesizer's full Accepted / Rejected / Backlog output and wait for explicit approval before applying any Accepted edit. The user picks the subset and may redirect routings. Skill changes affect every future agent in the org. Do not auto-apply.

File Backlog items only when the user has authorized tracker writes. Otherwise include them in the report with the destination and proposed text.

Never edit a skill under `plugins/cache/`. Before approval, show its destination, `.agents/skills/<skill>/` or `~/.agents/skills/<skill>/`. After approval, copy the skill folder there and edit the copy. A relative link that leaves the skill folder, such as `../poteto-mode/references/host-runtime.md`, breaks in the copy, so copy each such file into the copy and point the link at it. Never open a PR or push.

Follow each approved row's Routing exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): the parent does it directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): use `$skill-creator` when available, or revise SKILL.md directly and validate its instructions and metadata.
- `tune description: <skill path>` (the skill exists but didn't trigger when it should have): use `$skill-creator` when available, or revise the description directly and check it against representative prompts.
- `new skill: <kebab-name>`: use `$skill-creator` when available, or author SKILL.md directly with valid `name` and `description` frontmatter. Put invocation policy in `agents/openai.yaml`.

If your environment ships a SKILL.md validator, run it on every touched skill before declaring done.

## 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog filed to the devex tracker: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
