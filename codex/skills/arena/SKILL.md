---
name: arena
description: "Spawn N parallel candidates at the same task, pick a base, graft the strongest parts of the losers into it. Use for $arena, 'arena this', 'throw it in the arena', or when one attempt at a non-trivial artifact would lock in the wrong shape."
---

# Arena

Read [Codex runtime](../poteto-mode/references/host-runtime.md) before using Codex tools or delegating. Resolve configured roles there even when this skill is invoked directly.

Create a visible checklist with one entry per phase (Frame, Fan out, Cross-judge, Pick, Graft, Verify) before launching anything. Use an available task or planning tool, or a Markdown plan file per [Codex runtime](../poteto-mode/references/host-runtime.md#plans-and-task-tracking).

## Phase A: Frame

Every candidate gets the same prompt, so the prompt is the contract.

1. State the artifact each candidate is producing.
2. Derive the rubric, 3-6 concrete gradeable criteria for what success looks like on *this* task. It is the picker's tool in Phase D. Candidates only see the task.
3. Resolve `arena runners` per Codex runtime and use one worker per entry. An `auto` or `inherit-parent` entry inherits the parent model and effort. If a configured model is unavailable, use an allowed equivalent in the same family when the host permits substitution. Otherwise drop that entry and record why. Aim for at least two candidates. If only one can run, label the result a single attempt. Repeated models give independent attempts on that model.
4. Give each candidate its own output location (a git worktree where possible, otherwise `.agents/state/xstack/<run-id>/arena-<slug>/candidate-<n>/`), per the **separate-before-serializing-shared-state** principle skill.

## Phase B: Fan out

Start the candidates within the available slots. Give each the worker instructions, the operator’s goal, the task, the path to the shared grounding, its own output path, and instructions to produce the artifact and a short rationale naming the alternatives it considered and what it rejected.

If a candidate produces no output, proceed with N-1 and note the dropout.

## Phase C: Cross-judge

After candidates finish, choose the first available explicit entry in the `arena cross-judge pool` whose vendor differs from the parent’s, using host model metadata. Skip `auto`, `inherit-parent`, and unavailable entries. If the parent vendor is unknown, the first available explicit entry may judge; disclose that the vendor check was unavailable. If no eligible entry can run, skip this phase and report why. Give the read-only judge the rubric and candidates by anonymous path label. Ask it to score each criterion and recommend a base.

## Phase D: Pick a base

Read every candidate end to end before picking. Score each against the rubric criterion by criterion, not on holistic feel, and compare with the cross-judge when one ran. Read both rationales when they disagree.

Pick the base a future maintainer can extend most easily without breaking invariants. When two feel tied, prefer the cleaner boundary or smaller API, per the Laziness Protocol.

## Phase E: Graft

Walk each losing candidate once more for what is worth porting into the base, usually one or two things per candidate, not most of it. Fold each graft in by hand, per the **redesign-from-first-principles** principle skill, so the result stays coherent under one mental model. Don't paste mechanically.

If the candidates converge on one shape, that is strong agreement. Note it and ship the consensus shape. No graft is needed. If they wildly diverge, Phase A was under-specified. Reframe and re-run rather than averaging the divergence.

## Phase F: Verify

Verify the synthesized artifact like any other output, per the **prove-it-works** principle skill. If verification finds a problem the arena missed, either Phase A was wrong (re-frame and re-run) or a candidate caught it and you missed the graft (go back to Phase E). Don't paper over it.

## Outputs

One synthesized artifact, with a short synthesis note alongside naming the base and why, the cross-judge's verdict or why it was skipped, each graft with its source candidate, what was rejected and why, any convergence or dropouts, and the verification result.
