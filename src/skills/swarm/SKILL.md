---
name: swarm
description: "Fan out N parallel workers, drain them, and return one report. Use for /swarm, 'swarm this', or parallel coverage, races, gauntlets, and exploration."
disable-model-invocation: true
---

# Swarm

Read [Host runtime](../poteto-mode/references/host-runtime.md) before using host tools or delegating. Resolve configured roles there even when this skill is invoked directly.

## Start

Create a visible checklist with one entry per phase before launching anything. Use an available task or planning tool, or a Markdown plan file per [Host runtime](../poteto-mode/references/host-runtime.md#plans-and-task-tracking).

1. Frame
2. Fan out
3. Aggregate
4. Report

## Phase A: Frame

1. State the done predicate and the artifact or report the swarm must return.
2. Choose the shape. Partition into slices, race N workers on identical briefs, or mix both. For a race or mixed shape, declare `first pass`, `rank all`, or `best-of` before spawning.
3. Pick the worker model from `swarm workers` per Host runtime. For `auto` or `inherit-parent`, omit model and effort overrides so the workers run on the parent model. If the host refuses a configured model, run those workers on the parent model and say so. For a model race, name each arm's model up front. Pick each subagent's effort for the job, and fast mode only where the host offers it, per the Subagents section of the **poteto-mode** skill.
4. Give each worker its own writable output when it writes. When workers verify or measure commits, each brief names the exact SHAs. A measurement brief also names the method (sample count, what one sample is, order). The worker records both in its result.

## Phase B: Fan out

Launch workers using available host agents and the step 3 model, left unset for `auto` or `inherit-parent`. Use isolated local worktrees by default, or remote workers when available and suitable. Limit concurrency to available slots and queue remaining lanes.

Specify the exact starting branch and commit in each brief. Prepare local worktrees at that commit. For remote workers, push the authorized branch when needed and use the service's documented checkout option; verify the worker reports the expected commit before accepting its result.

Every brief stands alone. Include the goal, scope, exact slice or race arm, how to verify, and what to report. Reports use `PASS`, `ISSUES`, or `BLOCKED` with evidence. A worker that can prove a defect reports `ISSUES` and lists every issue it can prove, not only the first.

If a worker drops out, proceed with N-1 and note it.

## Phase C: Aggregate

Read the terminal results. Drop a result that does not record the SHAs and method its brief names, and respawn that worker once. After a second miss, record a gap. A gap does not count as a pass. For coverage, every required slice needs a result. For a race, apply the selection rule declared up front. Use first pass, rank all, or best-of. Do not paste raw worker dumps.

## Phase D: Report

Return one consolidated in-chat report with the table, issue one-liners, gaps or dropouts, and the race rule when used.
