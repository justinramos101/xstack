---
name: reflect
description: Spawn three parallel review subagents over the active transcript, surface learnings, and route each to a concrete edit on an existing skill. Use when the user says reflect.
disable-model-invocation: true
---

# Reflect

Read [Host runtime](../poteto-mode/references/host-runtime.md) before using host tools or delegating. Resolve configured roles there even when this skill is invoked directly.

Mine the current conversation for durable learnings, then route them into skill edits.

## When to invoke

Invoke when the user says "reflect" or "/reflect". Skip when the conversation is trivial, off-topic, or already covered by an existing skill the parent followed correctly. One-offs are not learnings.

## Process

### 1. Locate the active transcript

The parent finds its own transcript file before fanning out. Use the exact active-session path or history API described in Host runtime. Do not glob across unrelated project transcript directories. That crosses workspace boundaries and reads private chats from unrelated projects.

Match workspace and session metadata before reading transcript messages. Transcript formats vary by host. If the exact session cannot be resolved, pass a digest of the visible conversation and identify it as incomplete.

### 2. Spawn three reviewers in parallel

One message, three subagent calls, `subagent_type: general-purpose`, explicit `model:` on each, a no-writes contract with the tools their investigation requires. Reviewers need MCP access for context lookups (tickets, chat threads, observability traces referenced in the transcript). Use the actual host permissions described in Host runtime.

| Lens | `model` | Prompt template |
|---|---|---|
| Judgment | your configured reflect-judgment model (default `inherit-parent`) | `references/judgment-reviewer.md` |
| Tooling | your configured reflect-tooling model (default `inherit-parent`) | `references/tooling-reviewer.md` |
| Divergent | your configured divergent model (default `inherit-parent`) | `references/divergent-reviewer.md` |

Pass each template verbatim, substituting the transcript path or digest where marked. Reviewers return findings in the subagent response body.

### 3. Synthesize

One subagent call, `subagent_type: general-purpose`, using your configured synthesizer model (default `inherit-parent`), a no-writes contract with the tools their investigation requires. The synthesizer's quality check includes spot-verifying citations, which can require MCP access. Use the actual host permissions described in Host runtime. Use `references/synthesizer.md` verbatim, with each reviewer's full output inlined where marked. The synthesizer returns a structured Accepted / Rejected / Backlog list.

### 4. Structural enforcement check

Sanity-check the synthesizer's Accepted list. For any item that would be enforced more reliably by a lint rule, script, metadata flag, or runtime check, move it from Accepted to Backlog. See the **encode-lessons-in-structure** principle skill.

### 5. Apply

Before applying any Accepted edit, present the synthesizer's full Accepted/Rejected/Backlog output to the user and wait for explicit approval. The user picks which subset to apply and may redirect routings. Skill changes affect every future agent in the org. Do not auto-apply.

Backlog items file to whatever devex / backlog tracker your team uses automatically. Only the Accepted list waits for approval.

For each approved Accepted item, follow the Routing field exactly:

- Trivial existing-skill edit (a one-line bullet, a tightened sentence, a stale fact corrected): parent does directly.
- Substantive existing-skill edit (a new section, a new pattern table, more than ~10 lines): hand to the host's skill-authoring workflow skill and run its draft / test / iterate loop.
- `tune description: <skill path>` (the skill exists but didn't trigger when it should have): hand to `create-skill` and run its description-optimization loop.
- `new skill via create-skill: <kebab-name>`: hand creation to `create-skill`. Do not invent the shape ad hoc.

If your environment ships a SKILL.md validator, run it on every touched skill before declaring done. Skip this step if it doesn't.

### 6. Summarize for the user

Short list, no preamble:

- Edits applied: `<skill path>`. What changed, one line each.
- New skills created: `<skill path>`. One line each (rare).
- Backlog filed to the devex tracker: `<issue title>` (`<tags>`). One line each.
- Dropped: one line per rejected finding + reason from the synthesizer.
