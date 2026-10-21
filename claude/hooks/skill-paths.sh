#!/usr/bin/env bash
# Claude Code hides a skill that sets `disable-model-invocation: true` from the model
# and refuses it in the Skill tool, while upstream pstack expects the agent to read
# such a skill's SKILL.md directly. This hook supplies that path.
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

user_invocation_only() {
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
		plugin=$(json_string_field name 2>/dev/null <"$root/.claude-plugin/plugin.json") || exit 0
		[ "$prefix" = "$plugin" ] || exit 0
	fi
	[[ "$name" =~ ^[a-z0-9][a-z0-9-]*$ ]] || exit 0
	user_invocation_only "$name" || exit 0
	path="$skills/$name/SKILL.md"
	reason="$skill is a file-based xstack skill that the Skill tool cannot load. Read $(json_escape "$path") with the Read tool and follow its instructions directly. Its playbooks, references, and scripts are in the same directory."
	printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}\n' "$reason"
	;;
esac
exit 0
