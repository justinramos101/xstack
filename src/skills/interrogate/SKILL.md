---
name: interrogate
description: "Use for adversarial review of a change or design, to stress-test a branch, or when the user asks to interrogate it. Reviewers reproduce failures and the lead verifies each finding."
---

# Interrogate

Read [Codex runtime](../poteto-mode/references/host-runtime.md) before delegating. Return a review to the operator. Keep all experiments and their files outside the operator’s working tree.

## Frame the review

Use the scope the operator names. By default review the branch since its merge base with the target branch, including the current index, unstaged tracked changes and relevant untracked files. Restate the intended behavior from the request, commits and PR description. For a design, name the decision and the observable result a prototype could establish.

## Give each reviewer the same change

Use the `interrogate reviewers` role and the runner selection in [Arena](../arena/SKILL.md). Start each reviewer at the exact review head in its own disposable worktree or isolated copy. Capture the scoped tracked changes once with `git diff --binary HEAD -- <paths>` and apply the patch to each copy if it is nonempty. Include relevant new files from `git ls-files --others --exclude-standard -z -- <paths>`, preserving their paths and contents. For a staged-only review, use the index snapshot instead. Confirm each copy contains the reviewed changes before running checks. Send remote workers only material they are authorized to receive. Keep ignored files and unrelated changes in place. If the same snapshot cannot reach a remote reviewer, review locally and report the resulting coverage.

Give each reviewer the shared worker instructions, the same goal and expected behavior, and this brief:

> Try the change through its real callers. Use a failing test, a small reproduction, or command output to demonstrate each behavioral finding. For a design, probe the current code or build a disposable prototype. Keep reproductions in your assigned worktree and return the exact command, any fixture or patch needed to rerun it, what it printed, and the result the operator should expect. Leave the reviewed code as supplied. An empty findings list is valid.

## Rerun and report

Rerun each reported command against a fresh copy of the same snapshot with its reproduction files. Compare with the base when attribution is unclear. Keep each failure you can reproduce that breaks the stated intent, even if only one reviewer found it. Merge reports with the same root cause. Check findings locally if delegation is unavailable and disclose the reduced independence.

State the intent. For each verified finding give the command, observed and expected results, affected behavior, and reviewer. Summarize dropped findings and their reasons. When the requested scope includes design tradeoffs that a run cannot settle, identify them separately as judgments with their assumptions and supporting evidence. Report any unavailable checks or reviewers.
