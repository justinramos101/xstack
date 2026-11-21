### Opening a PR

Work in an isolated worktree based on trunk or the required parent branch. Keep unrelated work in its original checkout. Make small, landable commits, run a deslop pass on the diff, and apply the **no-comments** skill before review.

Use the **technical-writing** and **unslop** skills. Title the PR `type(scope): subject`. Open the body with the operator’s goal. Keep it under 40 lines, using these `##` headings in order and omitting empty sections: Why, What changed, Scope, Tradeoffs, Blast Radius, Verification. Give the command or evidence for the behavior that changed. Put longer logs and tables in a linked artifact.

Use the host’s PR tool when available. Otherwise use `gh pr create`, or `origin pr create --status open` when the Origin CLI resolves the repository. Open ready for review by default and honor a requested draft. Target trunk for independent PRs and a parent branch for dependent PRs. Return the link. Start Babysit only when the assignment includes it.
