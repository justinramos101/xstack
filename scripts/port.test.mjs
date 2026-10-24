import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, realpathSync, symlinkSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { defaultDraft, resolveRole, roles } from '../src/skills/setup-xstack/scripts/models.mjs';
import { validateTrigger } from '../automations/benny/scripts/validate-trigger.mjs';

const root = new URL('../', import.meta.url);
const checker = new URL('../src/skills/poteto-mode/scripts/check-plan.mjs', import.meta.url);
const playbook = readFileSync(new URL('../src/skills/poteto-mode/playbooks/multi-phase-plan.md', import.meta.url), 'utf8');
const validPlan = playbook.split('````markdown\n')[1].split('````')[0].replace(/<[^>\n]+>/g, 'example');
function check(plan) {
  const dir = mkdtempSync(join(tmpdir(), 'xstack-plan-'));
  try {
    const file = join(dir, 'plan.md');
    writeFileSync(file, plan);
    return spawnSync(process.execPath, [checker.pathname, file], { encoding: 'utf8', cwd: root });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('unconfigured roles take each host\'s default lineup', () => {
  assert.deepEqual(resolveRole('', 'codex', 'bug-fix'), { host: 'codex', role: 'bug-fix', budget: 'unlimited', entries: [{ model: 'gpt-6.1-sol', effort: 'xhigh' }] });
  assert.deepEqual(resolveRole('', 'codex', 'why synthesizer').entries, [{ model: 'gpt-6-astra', effort: 'xhigh' }]);
  assert.deepEqual(resolveRole('', 'claude', 'bug-fix').entries, [{ model: null, effort: null }]);
  assert.deepEqual(resolveRole('', 'claude', 'hardest tasks').entries, [{ model: 'opus', effort: 'xhigh' }]);
  assert.deepEqual(resolveRole('', 'claude', 'interrogate reviewers').entries, [{ model: 'opus', effort: 'xhigh' }, { model: null, effort: null }, { model: 'opus', effort: 'xhigh' }, { model: null, effort: null }]);
  assert.deepEqual(resolveRole('# budget: small\n', 'codex', 'arena runners').entries, [{ model: 'gpt-6-astra', effort: 'medium' }, { model: 'gpt-6.1-sol', effort: 'medium' }, { model: 'gpt-6-astra', effort: 'medium' }, { model: 'gpt-6.1-sol', effort: 'medium' }]);
  assert.deepEqual(resolveRole('feature: inherit-parent\n', 'codex', 'feature').entries, [{ model: null, effort: null }]);
});
test('every default resolves and the default draft round-trips through write', () => {
  for (const host of ['claude', 'codex', 'hermes']) {
    for (const role of roles) assert.doesNotThrow(() => resolveRole(defaultDraft(host), host, role));
  }
  const home = mkdtempSync(join(tmpdir(), 'xstack-home-'));
  try {
    const empty = modelsCli(home, ['read', 'codex']);
    assert.match(empty.stderr, /no config; showing xstack's defaults for codex/);
    assert.equal(empty.stdout, defaultDraft('codex'));
    assert.equal(modelsCli(home, ['write', 'claude'], defaultDraft('claude')).status, 0);
    assert.deepEqual(JSON.parse(modelsCli(home, ['claude', 'judgment and prose']).stdout).entries, [{ model: 'opus', effort: 'xhigh' }]);
  } finally { rmSync(home, { recursive: true, force: true }); }
});
test('host overrides shared legacy roles without leaking into the other host', () => {
  const config = 'feature, refactoring: old-model\n## codex\n# budget: small\nfeature: coding-model @ max\n## claude\nfeature: another-model @ high\n';
  assert.deepEqual(resolveRole(config, 'codex', 'feature').entries, [{ model: 'coding-model', effort: 'medium' }]);
  assert.deepEqual(resolveRole(config, 'claude', 'feature').entries, [{ model: 'another-model', effort: 'high' }]);
  assert.deepEqual(resolveRole(config, 'codex', 'refactoring').entries, [{ model: 'old-model', effort: 'medium' }]);
});
test('budget preserves a lower supported effort and all inheritance entries', () => {
  const config = '# budget: large\narena runners: alpha @ high, beta @ max, auto, inherit-parent\n';
  assert.deepEqual(resolveRole(config, 'codex', 'arena runners').entries, [{ model: 'alpha', effort: 'high' }, { model: 'beta', effort: 'xhigh' }, { model: null, effort: null }, { model: null, effort: null }]);
});
test('unlimited preserves explicit efforts and ignores removed legacy critique role', () => {
  assert.deepEqual(resolveRole('how critics: old\nfeature: alpha @ ultra\n', 'codex', 'feature').entries, [{ model: 'alpha', effort: 'ultra' }]);
});
test('invalid host, role, budget, effort, and scalar panel fail explicitly', () => {
  for (const [source, host, role] of [['', 'unknown', 'feature'], ['', 'codex', 'unknown'], ['# budget: free', 'codex', 'feature'], ['feature: alpha @ impossible', 'codex', 'feature'], ['feature: alpha, beta', 'codex', 'feature'], ['## other\nfeature: alpha', 'codex', 'feature']]) {
    assert.throws(() => resolveRole(source, host, role));
  }
});
test('model resolver CLI reads a config from an arbitrary working directory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'xstack-models-'));
  try {
    const file = join(dir, 'models.md');
    writeFileSync(file, '## codex\nfeature: alpha @ high\n');
    const result = spawnSync(process.execPath, [new URL('../src/skills/setup-xstack/scripts/models.mjs', import.meta.url).pathname, 'codex', 'feature', file], { cwd: dir, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).entries, [{ model: 'alpha', effort: 'high' }]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
const models = new URL('../src/skills/setup-xstack/scripts/models.mjs', import.meta.url).pathname;
function modelsCli(home, args, input) {
  const env = { ...process.env, HOME: home, CODEX_HOME: join(home, 'codex-home'), HERMES_HOME: join(home, 'hermes-home') };
  return spawnSync(process.execPath, [models, ...args], { env, input, encoding: 'utf8' });
}

test('every Hermes role inherits by default, and Hermes roles round-trip through HERMES_HOME', () => {
  for (const role of roles) assert.ok(resolveRole('', 'hermes', role).entries.every(entry => entry.model === null && entry.effort === null), role);
  const home = mkdtempSync(join(tmpdir(), 'xstack-home-'));
  try {
    assert.match(modelsCli(home, ['read', 'hermes']).stderr, /no config; showing xstack's defaults for hermes/);
    const written = modelsCli(home, ['write', 'hermes'], '# budget: small\n## codex\nfeature: gpt-6.1-sol\n## hermes\nfeature: some-model @ high\n');
    assert.equal(written.status, 0, written.stderr);
    assert.equal(written.stdout.trim(), join(home, 'hermes-home', 'xstack-models.md'));
    const text = readFileSync(join(home, 'hermes-home', 'xstack-models.md'), 'utf8');
    assert.match(text, /^# xstack model roles for Hermes Agent\./);
    assert.doesNotMatch(text, /gpt-6\.1-sol/);
    assert.deepEqual(JSON.parse(modelsCli(home, ['hermes', 'feature']).stdout).entries, [{ model: 'some-model', effort: 'medium' }]);
    assert.deepEqual(JSON.parse(modelsCli(home, ['hermes', 'hardest tasks']).stdout).entries, [{ model: null, effort: null }]);
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test('write puts Claude roles in an always-loaded rule and resolves them back', () => {
  const home = mkdtempSync(join(tmpdir(), 'xstack-home-'));
  try {
    const draft = '# budget: medium\nfeature, refactoring: opus @ max\nhow critics: old\nswarm workers: inherit-parent\n';
    const written = modelsCli(home, ['write', 'claude'], draft);
    assert.equal(written.status, 0, written.stderr);
    const rule = readFileSync(join(home, '.claude', 'rules', 'xstack-models.md'), 'utf8');
    assert.match(rule, /^# budget: medium \(caps each entry's effort at high/m);
    assert.match(rule, /^feature: opus @ max$/m);
    assert.doesNotMatch(rule, /how critics/);
    const resolved = modelsCli(home, ['claude', 'feature']);
    assert.deepEqual(JSON.parse(resolved.stdout).entries, [{ model: 'opus', effort: 'high' }]);
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test('write keeps the rest of Codex AGENTS.md byte for byte and replaces only its block', () => {
  const home = mkdtempSync(join(tmpdir(), 'xstack-home-'));
  try {
    const agents = join(home, 'codex-home', 'AGENTS.md');
    mkdirSync(join(home, 'codex-home'));
    const before = '# My rules\n\nAlways run tests.\n';
    writeFileSync(agents, before);
    assert.equal(modelsCli(home, ['write', 'codex'], 'feature: gpt-6.1-sol @ high\n').status, 0);
    assert.equal(modelsCli(home, ['write', 'codex'], 'feature: gpt-6-astra @ xhigh\n').status, 0);
    const text = readFileSync(agents, 'utf8');
    assert.ok(text.startsWith(`${before}\n<!-- xstack-models:start -->\n`));
    assert.equal(text.split('xstack-models:start').length, 2);
    assert.match(text, /^feature: gpt-6-astra @ xhigh$/m);
    assert.doesNotMatch(text, /gpt-6\.1-sol/);
    assert.deepEqual(JSON.parse(modelsCli(home, ['codex', 'feature']).stdout).entries, [{ model: 'gpt-6-astra', effort: 'xhigh' }]);
    writeFileSync(agents, `${text}<!-- xstack-models:start -->\n`);
    const broken = modelsCli(home, ['write', 'codex'], 'feature: auto\n');
    assert.equal(broken.status, 1);
    assert.match(broken.stderr, /unmatched or repeated/);
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test('Codex roles go to AGENTS.override.md when Codex loads it instead of AGENTS.md', () => {
  const home = mkdtempSync(join(tmpdir(), 'xstack-home-'));
  try {
    const codexHome = join(home, 'codex-home');
    mkdirSync(codexHome);
    writeFileSync(join(codexHome, 'AGENTS.md'), 'Base rules.\n');
    writeFileSync(join(codexHome, 'AGENTS.override.md'), 'Override rules.\n');
    const written = modelsCli(home, ['write', 'codex'], 'feature: gpt-6.1-sol @ high\n');
    assert.equal(written.stdout.trim(), join(codexHome, 'AGENTS.override.md'));
    assert.match(readFileSync(join(codexHome, 'AGENTS.override.md'), 'utf8'), /^Override rules\.\n\n<!-- xstack-models:start -->/);
    assert.equal(readFileSync(join(codexHome, 'AGENTS.md'), 'utf8'), 'Base rules.\n');
    writeFileSync(join(codexHome, 'AGENTS.override.md'), '  \n');
    assert.equal(modelsCli(home, ['write', 'codex'], 'feature: auto\n').stdout.trim(), join(codexHome, 'AGENTS.md'));
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test('the loaded role text names the panels and keeps the judge pool to one judge', () => {
  const home = mkdtempSync(join(tmpdir(), 'xstack-home-'));
  try {
    assert.equal(modelsCli(home, ['write', 'claude'], 'arena cross-judge pool: opus, sonnet\n').status, 0);
    const rule = readFileSync(join(home, '.claude', 'rules', 'xstack-models.md'), 'utf8');
    assert.match(rule, /arena runners, architect runners, and interrogate reviewers spawn one subagent per entry/);
    assert.match(rule, /arena cross-judge pool lists alternatives for arena's one judge/);
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test('read falls back to the legacy shared file until a host is written', () => {
  const home = mkdtempSync(join(tmpdir(), 'xstack-home-'));
  try {
    mkdirSync(join(home, '.agents'));
    writeFileSync(join(home, '.agents', 'xstack-models.md'), '## codex\nfeature: legacy-model\n');
    mkdirSync(join(home, 'codex-home'));
    writeFileSync(join(home, 'codex-home', 'AGENTS.md'), 'No xstack block here.\n');
    const legacy = modelsCli(home, ['read', 'codex']);
    assert.match(legacy.stderr, /\.agents\/xstack-models\.md/);
    assert.deepEqual(JSON.parse(modelsCli(home, ['codex', 'feature']).stdout).entries, [{ model: 'legacy-model', effort: null }]);
    assert.equal(modelsCli(home, ['write', 'codex'], legacy.stdout).status, 0);
    assert.match(modelsCli(home, ['read', 'codex']).stderr, /codex-home\/AGENTS\.md/);
    assert.equal(modelsCli(home, ['write', 'claude'], 'feature: alpha @ ultra\nbogus role: x\n').status, 1);
  } finally { rmSync(home, { recursive: true, force: true }); }
});

test('filled portable plan passes with all ten lanes', () => {
  const result = check(validPlan);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /1 PR sections, 0 problems/);
});
test('plan checker accepts angle brackets in inline code but still rejects prose placeholders', () => {
  const plan = validPlan.replace('# example plan', '# Render `<Widget>` with `Promise<Result<T>>` and `cat < input > output`');
  const result = check(plan);
  assert.equal(result.status, 0, result.stderr);
  const unfilled = check(plan.replace('## How to read this', '<unfilled>\n\n## How to read this'));
  assert.equal(unfilled.status, 1);
  assert.match(unfilled.stderr, /unfilled placeholder/);
});
test('plan checker rejects missing lane and missing pass predicate', () => {
  for (const plan of [validPlan.replace(/^- \[ \] Lane 10\..*\n/m, ''), validPlan.replace('Pass when', 'Observe')]) {
    const result = check(plan);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /expected 1 to 10|no pass predicate/);
  }
});
test('plan checker rejects missing evidence rule and unresolved placeholder', () => {
  for (const plan of [validPlan.replace('**Verify, unit.** Tests alone', '**Verify, unit.** Checks alone'), validPlan.replace('# example plan', '# <unfilled> plan')]) {
    const result = check(plan);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /does not open with the rule|unfilled placeholder/);
  }
});
test('checker returns a usage error for a missing file', () => {
  const result = spawnSync(process.execPath, [checker.pathname, '/nonexistent/xstack-plan.md'], { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /ENOENT/);
});

test('worktree audit handles spaced paths and does not call a closed PR safe', () => {
  const dir = mkdtempSync(join(tmpdir(), 'xstack-worktree-'));
  const repo = join(dir, 'repo');
  const worktree = join(dir, 'work tree');
  const run = (args, cwd = dir) => {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };
  try {
    run(['init', '--initial-branch=main', repo]);
    run(['-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '--allow-empty', '-m', 'base'], repo);
    run(['update-ref', 'refs/remotes/origin/main', 'HEAD'], repo);
    run(['worktree', 'add', '-b', 'closed-work', worktree], repo);
    run(['-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '--allow-empty', '-m', 'unmerged'], worktree);
    const bin = join(dir, 'bin');
    const transcripts = join(dir, 'transcripts');
    mkdirSync(bin); mkdirSync(transcripts);
    writeFileSync(join(bin, 'gh'), '#!/bin/sh\nprintf \'[{"number":42,"state":"CLOSED","headRefName":"closed-work"}]\\n\'\n', { mode: 0o755 });
    const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, XSTACK_TRANSCRIPTS_DIR: transcripts };
    const result = spawnSync('bash', [new URL('../src/skills/poteto-mode/scripts/worktree-audit.sh', import.meta.url).pathname, repo], { env, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const columns = result.stdout.trim().split('\n')[2].split('\t');
    assert.equal(columns[7], 'review');
    assert.equal(columns[5], '#42/CLOSED');
    assert.equal(columns[8], realpathSync(worktree));
    delete env.XSTACK_TRANSCRIPTS_DIR;
    const unknown = spawnSync('bash', [new URL('../src/skills/poteto-mode/scripts/worktree-audit.sh', import.meta.url).pathname, repo], { env, encoding: 'utf8' });
    assert.equal(unknown.status, 0, unknown.stderr);
    assert.equal(unknown.stdout.trim().split('\n')[2].split('\t')[7], 'review-chat-unknown');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('merged worktree stays unknown when transcript scanning cannot complete', () => {
  const dir = mkdtempSync(join(tmpdir(), 'xstack-scan-'));
  const repo = join(dir, 'repo');
  const worktree = join(dir, 'worktree');
  const bin = join(dir, 'bin');
  const transcripts = join(dir, 'transcripts');
  const run = (args, cwd = dir) => {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  };
  try {
    run(['init', '--initial-branch=main', repo]);
    run(['-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '--allow-empty', '-m', 'base'], repo);
    run(['update-ref', 'refs/remotes/origin/main', 'HEAD'], repo);
    run(['worktree', 'add', '-b', 'merged-work', worktree], repo);
    mkdirSync(bin); mkdirSync(transcripts);
    writeFileSync(join(bin, 'gh'), '#!/bin/sh\nprintf "[]\\n"\n', { mode: 0o755 });
    const audit = () => {
      const result = spawnSync('bash', [new URL('../src/skills/poteto-mode/scripts/worktree-audit.sh', import.meta.url).pathname, repo], {
        env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, XSTACK_TRANSCRIPTS_DIR: transcripts }, encoding: 'utf8',
      });
      assert.equal(result.status, 0, result.stderr);
      const columns = result.stdout.trim().split('\n')[2].split('\t');
      assert.equal(columns[2], 'YES');
      return { columns, stderr: result.stderr };
    };
    assert.equal(audit().columns[7], 'safe');
    writeFileSync(join(transcripts, 'session.jsonl'), JSON.stringify({ cwd: realpathSync(worktree) }) + '\n');
    assert.equal(audit().columns[7], 'verify-recent-chat');
    for (const script of ['exit 127', 'exit 1', 'exit 0', 'printf "bad output\\n"']) {
      writeFileSync(join(bin, 'python3'), `#!/bin/sh\n${script}\n`, { mode: 0o755 });
      const { columns, stderr } = audit();
      assert.equal(columns[6], 'unknown');
      assert.equal(columns[7], 'review-chat-unknown');
      assert.match(stderr, /transcript scan failed/);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('model resolver CLI works through a symlinked installation', () => {
  const dir = mkdtempSync(join(tmpdir(), 'xstack-model-link-'));
  try {
    const link = join(dir, 'models.mjs');
    symlinkSync(new URL('../src/skills/setup-xstack/scripts/models.mjs', import.meta.url), link);
    const result = spawnSync(process.execPath, [link, 'codex', 'feature', join(dir, 'missing-config.md')], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).entries, [{ model: 'gpt-6.1-sol', effort: 'xhigh' }]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('both Benny templates preserve the root timestamp for top-level reports', () => {
  for (const name of ['triage', 'reproduce']) {
    const template = readFileSync(new URL(`../automations/benny/templates/${name}-automation-prompt.md`, import.meta.url), 'utf8');
    const payload = template.split('```json\n')[1].split('```')[0].replace('{{SLACK_CHANNEL_ID}}', 'C123').replace('{{SLACK_MESSAGE_TS}}', '1234567890.123456').replace('{{SLACK_THREAD_TS_OR_EMPTY}}', '');
    assert.deepEqual(validateTrigger(JSON.parse(payload), 'C123'), { SOURCE_CHANNEL_ID: 'C123', SOURCE_THREAD_TS: '1234567890.123456' });
    const result = spawnSync(process.execPath, [new URL('../automations/benny/scripts/validate-trigger.mjs', import.meta.url).pathname, 'C123'], { input: payload, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { SOURCE_CHANNEL_ID: 'C123', SOURCE_THREAD_TS: '1234567890.123456' });
  }
});

test('Benny preserves a parent thread and rejects mismatched or missing coordinates', () => {
  assert.deepEqual(validateTrigger({ source_channel_id: 'C123', ts: '200.000001', thread_ts: '100.000002' }, 'C123'), { SOURCE_CHANNEL_ID: 'C123', SOURCE_THREAD_TS: '100.000002' });
  for (const payload of [null, {}, { source_channel_id: 'OTHER', ts: '100.000001' }, { source_channel_id: 'C123', ts: 100.000001 }, { source_channel_id: 'C123', ts: '100.000001', thread_ts: 'invalid' }]) {
    assert.throws(() => validateTrigger(payload, 'C123'));
  }
});
