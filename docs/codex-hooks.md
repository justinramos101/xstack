# Check generated files before a Codex turn ends

Use this optional hook when you maintain xstack. It runs the same generated-file check as CI and asks Codex to continue if `codex/` needs regeneration. Installing xstack does not install or enable this hook.

1. Add the following `Stop` entry to this checkout's `.codex/hooks.json`. If the file already defines hooks, merge the entry into its existing `hooks` object.

```json
{
	"hooks": {
		"Stop": [
			{
				"hooks": [
					{
						"type": "command",
						"command": "node \"$(git rev-parse --show-toplevel)/scripts/check-generated-hook.mjs\"",
						"timeout": 30
					}
				]
			}
		]
	}
}
```

2. In Codex CLI, open `/hooks` and review the definition before trusting it. Other Codex clients must expose hook support and its trust controls. Changed hook definitions need another review.
3. Run the hook from the checkout root to check its response without enabling it:

```sh
node scripts/check-generated-hook.mjs <<EOF
{"hook_event_name":"Stop","cwd":"$PWD","stop_hook_active":false}
EOF
```

A current generated tree returns `{}`. A stale tree returns a JSON continuation decision with the failed check's output. Run `node scripts/build.mjs`, then repeat the check.

The helper skips unrelated directories and a turn already continued by a Stop hook. That guard prevents repeated continuation when the agent cannot repair a failure. A hook response is feedback, not proof that verification passed. Run the required tests before claiming the task is complete.

Keep this configuration scoped to the xstack checkout. Other projects need their own deterministic verification command. Use hooks for mechanical checks, and keep design decisions, model selection, and workflow routing in skills. Hooks do not create a goal or schedule future work.

See the official [Codex hooks documentation](https://learn.chatgpt.com/docs/hooks) for the event schema, trust rules, and client tool coverage.
