### Autopilot-stack

Run [Autopilot-full](autopilot-full.md) with the following overrides. The operator owns the merge. Give every owner, replacement and watcher this playbook so the handoff survives a restart.

1. **Base each PR on what it needs.** This replaces Full step 3. Start independent changes on trunk. When a change requires another PR, branch from that PR’s head and target its branch. Record each PR’s parent and head. Each owner writes only its own branch.
2. **Rebase onto the PR’s actual base.** For the rebase in Full step 2, rebase an independent PR onto current trunk and a dependent PR onto its parent’s current head before verification. When a parent moves, restack its affected descendants in dependency order. An unchanged patch may carry verification evidence under the [Shipping rules](shipping.md). Every new head needs green CI.
3. **Hand off at verified.** This handoff replaces the owner’s merge in Full steps 2 and 5. Once verification passes and CI is green at the current head, the owner reports STACK-READY with the PR, base, head and verification evidence. Give the operator each PR’s verdict and any parked work, then stop. Any further push, retarget, or merge requires the operator’s go.
