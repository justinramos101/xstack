import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { install } from './install.mjs';

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'xstack-install-'));
  try {
    const source = join(root, 'checkout skills');
    const destination = join(root, 'project', '.agents', 'skills');
    mkdirSync(join(source, 'demo', 'agents'), { recursive: true });
    writeFileSync(join(source, 'demo', 'SKILL.md'), 'original');
    writeFileSync(join(source, 'demo', 'agents', 'openai.yaml'), 'policy:\n  allow_implicit_invocation: false\n');
    run(source, destination);
  } finally { rmSync(root, { recursive: true, force: true }); }
}

test('linked installation preserves all resources, follows updates and is idempotent', () => fixture((source, destination) => {
  assert.equal(install(source, destination), 1);
  assert.equal(readlinkSync(join(destination, 'demo')), join(source, 'demo'));
  assert.match(readFileSync(join(destination, 'demo', 'agents', 'openai.yaml'), 'utf8'), /allow_implicit_invocation: false/);
  assert.equal(install(source, destination), 0);
  writeFileSync(join(source, 'demo', 'SKILL.md'), 'updated');
  assert.equal(readFileSync(join(destination, 'demo', 'SKILL.md'), 'utf8'), 'updated');
}));

test('conflicts preserve personal skills and prevent a partial install, including dangling symlinks', () => fixture((source, destination) => {
  mkdirSync(destination, { recursive: true });
  mkdirSync(join(source, 'another'));
  writeFileSync(join(source, 'another', 'SKILL.md'), 'another');
  for (const dangling of [false, true]) {
    if (dangling) symlinkSync('/missing/personal-skill', join(destination, 'demo'));
    else writeFileSync(join(destination, 'demo'), 'personal');
    assert.throws(() => install(source, destination), /Existing skills preserved/);
    assert.equal(existsSync(join(destination, 'another')), false);
    if (!dangling) assert.equal(readFileSync(join(destination, 'demo'), 'utf8'), 'personal');
    rmSync(join(destination, 'demo'));
  }
}));

test('standalone install includes every helper prompt shipped as a plugin agent', () => {
  const root = new URL('../codex/', import.meta.url);
  for (const name of ['poteto-agent', 'comment-sicko']) {
    const prompt = readFileSync(new URL(`skills/poteto-mode/references/agents/${name}.md`, root), 'utf8');
    assert.ok(prompt.length > 100);
    assert.doesNotMatch(prompt, /<skill file/);
    assert.ok(existsSync(new URL(`agents/${name}.toml`, root)));
  }
});

test('installer CLI links skills when the checkout is reached through a symlink', () => fixture(source => {
  const root = dirname(source);
  const checkout = join(root, 'checkout alias');
  const project = join(root, 'target project');
  symlinkSync(fileURLToPath(new URL('../', import.meta.url)), checkout, 'dir');
  mkdirSync(project);
  const result = spawnSync(process.execPath, [join(checkout, 'scripts/install.mjs'), '--project'], { cwd: project, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(existsSync(join(project, '.agents/skills/poteto-mode/SKILL.md')), result.stdout);
  assert.match(result.stdout, /Linked \d+ skills/);
}));
