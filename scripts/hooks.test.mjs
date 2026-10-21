import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const script = new URL('../claude/hooks/skill-paths.sh', import.meta.url).pathname;
function run(mode, input = '') {
  const result = spawnSync('bash', [script, mode], { input, encoding: 'utf8', cwd: root });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim() ? JSON.parse(result.stdout).hookSpecificOutput : null;
}

test('session and subagent modes point at the installed skills directory', () => {
  for (const [mode, event] of [['session', 'SessionStart'], ['subagent', 'SubagentStart']]) {
    const output = run(mode);
    assert.equal(output.hookEventName, event);
    const skills = output.additionalContext.match(/installed at (\S+)\/<name>\/SKILL\.md/)[1];
    assert.ok(existsSync(`${skills}/poteto-mode/SKILL.md`), `${skills} is not the skills directory`);
    assert.ok(!output.additionalContext.includes('\n'), 'context stays one paragraph');
  }
});

test('a flagged skill is redirected to its file, bare or with this plugin\'s prefix', () => {
  for (const skill of ['why', 'xstack:why', 'xstack:principle-fix-root-causes']) {
    const output = run('skill', JSON.stringify({ tool_input: { skill } }));
    assert.equal(output.hookEventName, 'PreToolUse');
    assert.equal(output.permissionDecision, 'deny');
    const path = output.permissionDecisionReason.match(/Read (\S+\/SKILL\.md)/)[1];
    assert.ok(existsSync(path), `${path} missing`);
    assert.match(readFileSync(path, 'utf8'), /disable-model-invocation: true/);
  }
});

test('model-invocable, foreign-plugin, unknown, and malformed skill calls pass through untouched', () => {
  assert.equal(run('skill', JSON.stringify({ tool_input: { skill: 'setup-xstack' } })), null);
  assert.equal(run('skill', JSON.stringify({ tool_input: { skill: 'other-plugin:why' } })), null);
  assert.equal(run('skill', JSON.stringify({ tool_input: { skill: 'ccstack:why' } })), null);
  assert.equal(run('skill', JSON.stringify({ tool_input: { skill: 'no-such-skill' } })), null);
  assert.equal(run('skill', JSON.stringify({ tool_input: { skill: '../../etc/passwd' } })), null);
  assert.equal(run('skill', 'not json'), null);
  assert.equal(run('unknown-mode'), null);
});

test('the Claude tree wires this script for every event and the Codex tree has no hooks', () => {
  const claude = JSON.parse(readFileSync(new URL('../claude/.claude-plugin/plugin.json', import.meta.url), 'utf8'));
  assert.equal(claude.hooks, undefined, 'hooks/hooks.json is the default location');
  const hooks = JSON.parse(readFileSync(new URL('../claude/hooks/hooks.json', import.meta.url), 'utf8')).hooks;
  assert.deepEqual(Object.keys(hooks).sort(), ['PreToolUse', 'SessionStart', 'SubagentStart']);
  for (const entries of Object.values(hooks)) for (const entry of entries) for (const hook of entry.hooks) {
    assert.match(hook.command, /^bash "\$\{CLAUDE_PLUGIN_ROOT\}\/hooks\/skill-paths\.sh" (session|subagent|skill)$/);
    assert.ok(hook.timeout <= 10);
  }
  assert.equal(hooks.PreToolUse[0].matcher, 'Skill');
  assert.ok(!existsSync(new URL('../codex/hooks', import.meta.url)), 'Codex would load a hooks directory');
  for (const manifest of ['../codex/plugin.json', '../codex/.codex-plugin/plugin.json']) {
    assert.equal(JSON.parse(readFileSync(new URL(manifest, import.meta.url), 'utf8')).hooks, undefined, manifest);
  }
});
