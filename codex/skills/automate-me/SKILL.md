---
name: automate-me
description: "Use for \"automate me\", \"create/update/refresh my -mode skill\", \"turn/capture my preferences or working style into a skill\", or wanting agents to follow how the user works. Drafts or revises a personal -mode skill with Codex skill metadata and unslopped prose, optionally using recent transcripts."
---

# Automate me

Read [Codex runtime](../poteto-mode/references/host-runtime.md) before using Codex tools or delegating. Resolve configured roles there even when this skill is invoked directly.

A guided flow for turning the user's working conventions into a skill agents will follow. The output is one `-mode` skill tailored to them (e.g. `jay-mode`, `priya-mode`).

Mine the available history, author the skill with `$skill-creator` when available, and apply `$unslop`. Without `$skill-creator`, write SKILL.md directly with the metadata rules in step 4.

## Flow

### 0. Check for an existing skill

Look recursively for `.agents/skills/**/*-mode/SKILL.md` and `~/.agents/skills/*-mode/SKILL.md` matching the user's handle. Mode skills can live in a personal category directory (`.agents/skills/<handle>/`), not only at the top level. If one exists, confirm intent with an exposed structured question tool, or in chat (unless they already said "update my skill" or similar):

- Update the existing skill (default for repeat runs)
- Start fresh (rare, ask why before doing it)

Update mode changes the rest of the flow:
- Step 1 mines only history since the skill was last edited (`git log -1 --format=%cI <path>`).
- Step 2 asks what's changed or missing, not what to capture from zero.
- Step 4 edits the existing file in place. Preserve sections the user hasn't contradicted. Revise ones with new evidence. Add new sections only for genuinely new rules.

### 1. Mine their history

Locate the active workspace's transcripts before fanning out. Use the exact active-session path or history API described in Codex runtime. Don't glob across unrelated project transcript directories. That crosses workspace boundaries and reads private chats from unrelated projects.

Survey recent agent conversations within that scope for recurring patterns. Run multiple parallel subagents across slices of history (e.g. last 2-4 weeks, split into 3 slices so each has enough material). Pick each subagent's effort for the job, and fast mode only when the session exposes it, per the Subagents section of the **poteto-mode** skill. Each slice mining subagent reads transcripts from the workspace-scoped path the parent provides, looks for the signals below, and returns a short structured list of patterns it saw with evidence pointers. Default signals worth hunting:

- Response preferences (length, tone, format, "dumb it down" corrections)
- Delegation habits (subagents, models, specialized workflows, parallelism)
- Verification posture (what "done" means, unit tests vs live repro, reviewers)
- Code and prose discipline (style, principles cited, lint/format tools)
- Process conventions (worktrees, commits, PRs, review/merge tooling)
- Meta preferences (fixing skills mid-task, proposing new ones)

Cross-check across slices before elevating a signal. Patterns seen in 2+ slices are high-confidence. Lone signals are weak and usually get dropped.

### 2. Ask the user directly

Mining misses intent that has not come up yet. Use an exposed structured question tool when its instructions permit it. Otherwise ask in chat.

Ask one or two short questions using the tool's actual question and option schema. Start broad, then follow up on the selected area. Do not assume multiple selection is supported. Let the user add preferences in their own words.

Don't dump 20 questions.

### 3. Cluster findings

Group the combined signals into sections. Common ones (use only what applies):

- **Response style**: length, tone, format.
- **Autonomy**: how much to do without asking, MCP tool use.
- **Understand first**: which skills to reach for when scoping or investigating a change.
- **Subagents**: default, parallelism, model-to-task, specialized workflows.
- **Prose / code discipline**: principles, lint tools, style guides.
- **Review and verify**: repro posture, verification skills, live-testing tools.
- **Process**: git worktrees, commits, PRs, review/merge tooling.
- **Skills**: skill-authoring habits, fix-the-skill-first, proposing new skills.

The **poteto-mode** skill shows the shape. Read it for granularity. Don't copy its content. The user's rules are not the same as poteto-mode's.

### 4. Draft the skill

Use `$skill-creator` when available, or author SKILL.md directly. Follow these placement and metadata rules:

- Path: preserve an existing mode skill's category. For a new mode, use `.agents/skills/<handle>/<handle>-mode/SKILL.md` when the repo has an established personal category for that handle. Otherwise default to `.agents/skills/<handle>-mode/SKILL.md` in the project (or `~/.agents/skills/<handle>-mode/` if the user prefers a personal skill).
- Handle: the user's first name or chosen identifier.
- Frontmatter `description`: trigger on their name + `$<handle>-mode` + "work in their style", not on generic keywords like "write code" or "review PR".
- Frontmatter formatting: use valid YAML. Keep `description` as one YAML scalar. Quote it or use `description: >-` with indented continuation lines when punctuation or wrapping requires it.
- Default to explicit invocation by setting `policy.allow_implicit_invocation: false` in `agents/openai.yaml`. Do not add invocation policy to SKILL.md frontmatter. Allow implicit invocation only when the user wants Codex to select the mode automatically.

### 5. Iterate on prose

Apply `$unslop` and any loaded `$skill-creator` writing guidelines to every line.

Show the draft to the user and take feedback. Expect multiple iterations. Cut ruthlessly. A mode skill is not a manual.

### 6. Land it

Work in a worktree off main. Commit and open a PR. Don't push to main directly.

## Guardrails

- **Don't overfit to one conversation.** A preference stated once and contradicted another time is noise. Require multiple instances before codifying it.
- **Don't be clever.** Restating other skills' contents, inventing metaphors, or writing "poetic" prose for an agent reader is cost without benefit. Keep it operational.
- **Reference, don't inline.** Other skills the user relies on should appear as path references, not pasted excerpts. Same for any principle docs they maintain elsewhere.
- **Keep sections minimal.** Only add a section if the user has a specific, non-default rule there. "Communicate clearly" is not a section. "Short paragraphs. Tables when comparing options. Bullets only when items are genuinely parallel." is.
- **Name conventions generic.** Use "the user" or "the human" in imperatives, not the author's first name.
- **Don't force symmetry.** If a user has no process rules worth writing down, skip the Process section entirely.

## Evaluation

A `-mode` skill captures working preferences. Validate its YAML and review representative prompts with the user. Check that it captures their preferences and no invented rules before shipping.

Run a description-optimization loop only if the skill's trigger accuracy turns out to be a problem in practice.

## When not to use

- User wants a task-specific skill (not working conventions): use `$skill-creator` when available or author SKILL.md directly. No mining is required.
- User wants to capture one narrow workflow (e.g. "how I write commit messages"). That's a regular skill, not a mode skill.
