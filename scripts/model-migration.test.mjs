import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { render, resolveRole } from '../src/skills/setup-xstack/scripts/models.mjs';

const models = fileURLToPath(new URL('../src/skills/setup-xstack/scripts/models.mjs', import.meta.url));
const oldPool = 'gpt-6-astra @ xhigh, gpt-6.1-sol @ xhigh, gpt-6-astra @ xhigh, gpt-6.1-sol @ xhigh';
const retired = ['how critics', 'how explorer', 'how explainer', 'why investigators', 'why synthesizer',
  'reflect tooling', 'reflect judgment', 'divergent', 'synthesizer', 'architect runners'];

test('a legacy shared config still routes active roles and migrates on the next setup write', (t) => {
  const home = mkdtempSync(join(tmpdir(), 'xstack-model-migration-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const codexHome = join(home, '.codex');
  const legacyDir = join(home, '.agents');
  mkdirSync(codexHome);
  mkdirSync(legacyDir);
  const instructions = '# Operator instructions\n\nKeep the existing budget.\n';
  const loaded = join(codexHome, 'AGENTS.md');
  writeFileSync(loaded, instructions);
  const legacy = join(legacyDir, 'xstack-models.md');
  const config = [
    '# budget: small', 'feature, how explorer: custom-model @ high',
    ...retired.map(role => `${role}: retired-model`), '## codex',
    `arena cross-judge pool: ${oldPool}`, 'arena runners: inherit-parent, custom-model @ low',
  ].join('\n') + '\n';
  writeFileSync(legacy, config);
  function cli(args, input) {
    const run = spawnSync(process.execPath, [models, ...args], {
      env: { ...process.env, HOME: home, CODEX_HOME: codexHome }, input, encoding: 'utf8',
    });
    assert.equal(run.status, 0, run.stderr);
    return run.stdout;
  }
  const expected = [{ model: 'custom-model', effort: 'medium' }];
  assert.deepEqual(JSON.parse(cli(['codex', 'feature'])).entries, expected);
  assert.equal(readFileSync(loaded, 'utf8'), instructions);
  cli(['write', 'codex'], cli(['read', 'codex']));
  const saved = readFileSync(loaded, 'utf8');
  assert.ok(saved.startsWith(instructions));
  assert.match(saved, /^# defaults: 1$/m);
  assert.match(saved, /^arena cross-judge pool: gpt-6-astra @ xhigh, gpt-6\.1-sol @ xhigh$/m);
  assert.match(saved, /^arena runners: inherit-parent, custom-model @ low$/m);
  for (const role of retired) assert.ok(!saved.includes(`${role}:`));
  assert.deepEqual(JSON.parse(cli(['codex', 'feature'])).entries, expected);
  cli(['write', 'codex'], cli(['read', 'codex']));
  assert.equal(readFileSync(loaded, 'utf8'), saved);
  assert.equal(readFileSync(legacy, 'utf8'), config);
});

test('custom judge choices survive setup, including a deliberate repeat on current defaults', () => {
  for (const [version, pool] of [['', 'custom-a @ low, inherit-parent, custom-a @ high'], ['# defaults: 1\n', oldPool]]) {
    const draft = `${version}arena cross-judge pool: ${pool}\n`;
    const saved = render('codex', draft);
    assert.ok(saved.includes(`\narena cross-judge pool: ${pool}\n`));
    assert.deepEqual(resolveRole(saved, 'codex', 'arena cross-judge pool').entries,
      resolveRole(draft, 'codex', 'arena cross-judge pool').entries);
  }
  assert.throws(() => render('codex', 'arena runers: alpha\n'), /Unknown role/);
});
