import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function fixture(run) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'xstack-hook-')));
  const root = join(dir, 'checkout');
  const scripts = join(root, 'scripts');
  mkdirSync(scripts, { recursive: true });
  copyFileSync(new URL('check-generated-hook.mjs', import.meta.url), join(scripts, 'check-generated-hook.mjs'));
  writeFileSync(join(scripts, 'build.mjs'), [
    "import { appendFileSync } from 'node:fs';",
    "appendFileSync('runs.jsonl', JSON.stringify({ cwd: process.cwd(), args: process.argv.slice(2) }) + '\\n');",
    "process.stdout.write('build output stays out of hook JSON\\n');",
    "if (process.env.XSTACK_FIXTURE_FAILURE) { process.stderr.write('stale skills/demo/SKILL.md\\n'); process.exitCode = 1; }",
  ].join('\n'));
  const invoke = (input, { cwd = root, fail = false } = {}) => spawnSync(process.execPath, [join(scripts, 'check-generated-hook.mjs')], {
    cwd, input: typeof input === 'string' ? input : JSON.stringify(input), encoding: 'utf8',
    env: { ...process.env, XSTACK_FIXTURE_FAILURE: fail ? '1' : '' },
  });
  const runs = () => existsSync(join(root, 'runs.jsonl')) ? readFileSync(join(root, 'runs.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line)) : [];
  try { run({ root, dir, invoke, runs }); }
  finally { rmSync(dir, { recursive: true, force: true }); }
}

test('Stop runs the build check once and emits only success JSON', () => fixture(({ root, invoke, runs }) => {
  const result = invoke({ hook_event_name: 'Stop', cwd: root });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {});
  assert.equal(result.stderr, '');
  assert.deepEqual(runs(), [{ cwd: root, args: ['--check'] }]);
}));

test('a failed check blocks once with the captured error and skips Stop reentry', () => fixture(({ root, invoke, runs }) => {
  const result = invoke({ hook_event_name: 'Stop', cwd: root }, { fail: true });
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.decision, 'block');
  assert.match(output.reason, /node scripts\/build\.mjs --check/);
  assert.match(output.reason, /stale skills\/demo\/SKILL\.md/);
  assert.equal(result.stderr, '');
  const reentry = invoke({ hook_event_name: 'Stop', cwd: root, stop_hook_active: true }, { fail: true });
  assert.equal(reentry.status, 0, reentry.stderr);
  assert.deepEqual(JSON.parse(reentry.stdout), {});
  assert.equal(runs().length, 1);
}));

test('the hook skips unrelated checkouts and non-Stop events', () => fixture(({ root, dir, invoke, runs }) => {
  const unrelated = join(dir, 'checkout-other');
  mkdirSync(unrelated);
  for (const [event, cwd] of [[{ hook_event_name: 'Stop', cwd: unrelated }, root], [{ hook_event_name: 'Stop' }, unrelated], [{ hook_event_name: 'SessionStart', cwd: root }, root]]) {
    const result = invoke(event, { cwd });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {});
  }
  assert.deepEqual(runs(), []);
}));

test('subdirectory sessions run the check at the checkout root', () => fixture(({ root, invoke, runs }) => {
  const nested = join(root, 'src', 'skills');
  mkdirSync(nested, { recursive: true });
  const result = invoke({ hook_event_name: 'Stop' }, { cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {});
  assert.deepEqual(runs(), [{ cwd: root, args: ['--check'] }]);
}));

test('malformed hook input reports an error without running the build', () => fixture(({ invoke, runs }) => {
  for (const input of ['{broken', 'null', '[]']) {
    const result = invoke(input);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /check-generated-hook:/);
  }
  assert.deepEqual(runs(), []);
}));
