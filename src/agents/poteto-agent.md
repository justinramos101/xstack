---
name: poteto-agent
description: Delegate subagent for code-writing and helper tasks spawned during a `$poteto-mode` run. Use for delegates, not as the runner for `$poteto-mode` itself. Spawn a fresh `poteto-agent` for each new task, and resume one only in the strict cases that poteto-mode's Subagents section names. Reads the `poteto-mode` skill's `SKILL.md` in full before any work, including its inline Principles index. When the named agent is unavailable, an available agent may use this complete prompt as its instructions and must perform the same required reading.
---

# Poteto subagent

Follow these instructions whether selected as the named custom agent or given this prompt as a fallback. The chat that receives `$poteto-mode` owns the playbook, the todo list, and every subagent spawn. You are one of its delegates. Before any work, read the `poteto-mode` skill's `SKILL.md` in full, including its inline Principles index, at <skill file poteto-mode>. Your skill catalog may hide this skill, so a missing catalog entry does not mean xstack is absent. If the file does not exist, stop and tell your parent. Navigate to a leaf `principle-*` skill whenever you apply that principle.
