import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const script = new URL('../hooks/skill-paths.sh', import.meta.url).pathname;
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

test('the Claude hooks file runs this script for every event and Codex is not wired', () => {
  const claude = JSON.parse(readFileSync(new URL('../.claude-plugin/plugin.json', import.meta.url), 'utf8'));
  assert.equal(claude.hooks, './hooks/claude.json');
  const hooks = JSON.parse(readFileSync(new URL('../hooks/claude.json', import.meta.url), 'utf8')).hooks;
  assert.deepEqual(Object.keys(hooks).sort(), ['PreToolUse', 'SessionStart', 'SubagentStart']);
  for (const entries of Object.values(hooks)) for (const entry of entries) for (const hook of entry.hooks) {
    assert.match(hook.command, /^bash "\$\{CLAUDE_PLUGIN_ROOT\}\/hooks\/skill-paths\.sh" (session|subagent|skill)$/);
    assert.ok(hook.timeout <= 10);
  }
  assert.equal(hooks.PreToolUse[0].matcher, 'Skill');
  const codex = JSON.parse(readFileSync(new URL('../.codex-plugin/plugin.json', import.meta.url), 'utf8'));
  assert.equal(codex.hooks, undefined);
  assert.ok(!existsSync(new URL('../hooks/hooks.json', import.meta.url)), 'hooks/hooks.json would be auto-loaded by Codex');
});
