#!/usr/bin/env bash
# Claude Code hook: point the model at xstack's skill files.
#
# Most xstack skills carry `disable-model-invocation: true`, so Claude Code hides
# them from the skill catalog and the Skill tool refuses them. Upstream pstack
# expects the agent to read a named skill's SKILL.md directly. This hook restores
# that convention without editing any skill.
#
# Modes: `session` and `subagent` inject one paragraph of context that gives the
# installed skill path pattern. `skill` runs before the Skill tool and, for a
# flagged xstack skill, denies the call with the file path to read instead.
# The hook always exits 0 and prints nothing on any failure, so it never stalls a turn.
set -u

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." 2>/dev/null && pwd) || exit 0
skills="$root/skills"

json_escape() {
	local s=$1
	s=${s//\\/\\\\}
	s=${s//\"/\\\"}
	printf '%s' "$s"
}

json_string_field() {
	grep -o "\"$1\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" 2>/dev/null | head -n 1 | sed 's/.*"\([^"]*\)"$/\1/'
}

flagged() {
	local file="$skills/$1/SKILL.md"
	[ -f "$file" ] || return 1
	head -c 4000 "$file" 2>/dev/null | awk '
		NR == 1 { if ($0 != "---") exit 1; next }
		$0 == "---" { closed = 1; exit (found ? 0 : 1) }
		/^disable-model-invocation:[[:space:]]*true[[:space:]]*$/ { found = 1 }
		END { if (!closed) exit 1 }'
}

mode=${1:-}
case "$mode" in
session | subagent)
	event=SessionStart
	[ "$mode" = subagent ] && event=SubagentStart
	context="xstack skills are installed at $(json_escape "$skills")/<name>/SKILL.md. Most are user-invocation only, so they are absent from the skill catalog and the Skill tool refuses them. When a task, a skill, a playbook, or an agent definition names one (for example /how, unslop, or principle-fix-root-causes), read that file with the Read tool and follow it. A skill's playbooks, references, and scripts resolve relative to its own directory."
	printf '{"hookSpecificOutput":{"hookEventName":"%s","additionalContext":"%s"}}\n' "$event" "$context"
	;;
skill)
	skill=$(json_string_field skill)
	case "$skill" in
	*:*) prefix=${skill%:*}; name=${skill##*:} ;;
	*) prefix=; name=$skill ;;
	esac
	if [ -n "$prefix" ]; then
		plugin=$(json_string_field name <"$root/.claude-plugin/plugin.json")
		[ "$prefix" = "$plugin" ] || exit 0
	fi
	[[ "$name" =~ ^[a-z0-9][a-z0-9-]*$ ]] || exit 0
	flagged "$name" || exit 0
	path="$skills/$name/SKILL.md"
	reason="$skill is a file-based xstack skill that the Skill tool cannot load. Read $(json_escape "$path") with the Read tool and follow its instructions directly. Its playbooks, references, and scripts are in the same directory."
	printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$reason"
	;;
esac
exit 0
