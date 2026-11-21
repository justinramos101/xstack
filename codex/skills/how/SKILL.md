---
name: how
description: "Use for \"how does X work\", code walkthroughs before changing something, and placement / ownership / layering questions (\"where should this live\", \"which package owns this\", \"is this the right layer\"). Explains subsystem architecture, runtime flow, onboarding mental models. Use why for motivation."
---

# How

Read [Codex runtime](../poteto-mode/references/host-runtime.md) for the available delegation tools and worker instructions.

If the scope is ambiguous, state your interpretation and explore. Give one read-only subagent the user's question and this brief:

> Trace the code from its normal entry point. Explain the architecture and runtime flow to a senior engineer who is new to this part of the system. Identify the files or symbols they need to understand it and cite the code behind your explanation.

Use the session's inherited model. If delegation is unavailable, do the same read-only investigation directly. Present the explanation with light edits for clarity and context.
