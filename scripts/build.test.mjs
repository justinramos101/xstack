import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { diff, hosts, loadSource, parseFrontmatter, render, write } from './build.mjs';

const repo = new URL('../', import.meta.url).pathname;
const pkg = { name: 'xstack', version: '9.9.9', description: 'd', repository: 'https://github.com/justinramos101/xstack' };
const file = (text, executable = false) => ({ bytes: Buffer.from(text), executable });

function skill(name, frontmatter, body, files = {}) {
  const parsed = parseFrontmatter(`---\n${frontmatter}\n---\n${body}`, name);
  return { name, ...parsed, files: new Map(Object.entries(files)) };
}
const source = ({ skills = [], agents = [], docs = {} }) => ({ root: repo, pkg, skills, agents, docs: new Map(Object.entries(docs)) });
const read = (files, path) => files.get(path).bytes.toString('utf8');

const parseToml = text => {
  const python = spawnSync('python3', ['-I', '-c', 'import json, sys, tomllib; print(json.dumps(tomllib.loads(sys.stdin.read())))'], { input: text, encoding: 'utf8' });
  assert.equal(python.status, 0, python.stderr || python.error?.message);
  return JSON.parse(python.stdout);
};

test('skill paths render for Codex in SKILL.md, references, and agent bodies', () => {
  const demo = skill('demo', 'name: demo\ndescription: d', 'Run `node <this skill directory>/scripts/x.mjs`.\n', { 'references/r.md': file('From <this skill directory>.\n') });
  const agent = { name: 'helper', description: 'h', body: '\nRead <skill file demo> first.\n' };
  const codex = render(hosts.codex, source({ skills: [demo], agents: [agent] }));
  assert.match(read(codex, 'skills/demo/SKILL.md'), /node <this skill directory>\/scripts\/x\.mjs/);
  const instructions = parseToml(read(codex, 'agents/helper.toml')).developer_instructions;
  assert.equal(read(codex, 'skills/poteto-mode/references/agents/helper.md').trimStart(), instructions);
  assert.match(instructions, /^Read the absolute path your parent gave you, else .*`skills\/demo\/SKILL\.md`.*`\.codex-plugin\/plugin\.json` has the highest `version` first\.\n$/);
  for (const [path, { bytes }] of codex) assert.doesNotMatch(bytes.toString('utf8'), /<skill file/, path);
});

test('an unrenderable token or a host variable in src/ fails the build', () => {
  for (const body of ['<skill file nope>', '<skill file>', '<skill file  demo>', '<this skill directory x>']) {
    const broken = skill('demo', 'name: demo\ndescription: d', `${body}\n`);
    for (const host of Object.values(hosts)) assert.throws(() => render(host, source({ skills: [broken] })), /cannot render/, `${host.dir} ${body}`);
  }
  const root = mkdtempSync(join(tmpdir(), 'xstack-build-'));
  try {
    mkdirSync(join(root, 'src/skills/demo'), { recursive: true });
    writeFileSync(join(root, 'src/plugin.json'), '{}');
    writeFileSync(join(root, 'src/skills/demo/SKILL.md'), '---\nname: demo\ndescription: d\n---\nRun ${CLAUDE_SKILL_DIR}/x.\n');
    assert.throws(() => loadSource(root), /host variables in neutral source.*src\/skills\/demo\/SKILL\.md/);
    writeFileSync(join(root, 'src/skills/demo/SKILL.md'), '---\nname: demo\ndescription: d\n---\n');
    mkdirSync(join(root, 'src/agents'));
    writeFileSync(join(root, 'src/agents/a.md'), '---\nname: a\ndescription: d\ncolor: red\n---\nbody\n');
    assert.throws(() => loadSource(root), /only name and description/);
  } finally { rmSync(root, { recursive: true, force: true }); }
  assert.throws(() => parseFrontmatter('---\r\nname: demo\r\n---\r\n', 'demo'), /CRLF/);
});

test('Codex skills preserve native metadata bytes and do not invent omitted metadata', () => {
  const metadata = Buffer.from('# Preserve native fields, comments, and line endings.\r\ninterface:\r\n  display_name: "Demo"\r\n  default_prompt: "Use $hidden with <skill file unknown>."\r\npolicy:\r\n  allow_implicit_invocation: false\r\nfuture_field:\r\n  nested: [one, two]\r\n');
  const hidden = skill('hidden', 'name: hidden\ndescription: "a: b"\nicon: crown\ncolor: yellow\npaths: ["**/*.ts"]', '# Hidden\n', { 'agents/openai.yaml': { bytes: metadata, executable: false }, 'scripts/run.sh': file('#!/bin/sh\n', true) });
  const open = skill('open', 'name: open\ndescription: d', '# Open\n');
  const codex = render(hosts.codex, source({ skills: [hidden, open] }));
  assert.equal(read(codex, 'skills/hidden/SKILL.md'), '---\nname: hidden\ndescription: "a: b"\n---\n# Hidden\n');
  assert.deepEqual(codex.get('skills/hidden/agents/openai.yaml').bytes, metadata);
  assert.equal(codex.get('skills/hidden/scripts/run.sh').executable, true);
  assert.equal(codex.has('skills/open/agents/openai.yaml'), false);
});

test('retired invocation metadata fails with the source path and native replacement', () => {
  const root = mkdtempSync(join(tmpdir(), 'xstack-retired-metadata-'));
  try {
    mkdirSync(join(root, 'src/skills/demo'), { recursive: true });
    for (const value of ['true', 'false', 'true # explicit only']) {
      writeFileSync(join(root, 'src/skills/demo/SKILL.md'), `---\nname: demo\ndescription: d\ndisable-model-invocation: ${value}\n---\nBody.\n`);
      assert.throws(() => loadSource(root), /src\/skills\/demo\/SKILL\.md: disable-model-invocation is retired; set policy\.allow_implicit_invocation in agents\/openai\.yaml/);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('bundled native metadata preserves the explicit-only skill set', () => {
  const bundled = loadSource();
  const explicit = bundled.skills.filter(skill => /^  allow_implicit_invocation: false$/m.test(skill.files.get('agents/openai.yaml')?.bytes.toString('utf8') ?? '')).map(skill => skill.name);
  assert.deepEqual(explicit, [
    'architect', 'arena', 'automate-me', 'benchmark-checklist', 'blast-radius', 'bro', 'correct',
    'create-formal-verification-skill', 'create-verification-skill', 'figure-it-out', 'how',
    'in-your-own-words', 'interrogate', 'ketchup', 'ketchup-video', 'maintain-formal-verification-skill',
    'maintain-verification-skill', 'make-bot-ui', 'no-comments', 'poteto-help', 'poteto-mode',
    'principle-attack-the-premise', 'principle-boundary-discipline', 'principle-build-the-lever',
    'principle-encode-lessons-in-structure', 'principle-exhaust-the-design-space', 'principle-experience-first',
    'principle-explain-the-number', 'principle-fix-root-causes', 'principle-foundational-thinking',
    'principle-guard-the-context-window', 'principle-laziness-protocol', 'principle-make-operations-idempotent',
    'principle-migrate-callers-then-delete-legacy-apis', 'principle-minimize-reader-load',
    'principle-model-the-domain', 'principle-never-block-on-the-human', 'principle-outcome-oriented-execution',
    'principle-prove-it-works', 'principle-redesign-from-first-principles',
    'principle-separate-before-serializing-shared-state', 'principle-sequence-verifiable-units',
    'principle-subtract-before-you-add', 'principle-test-behavior-not-implementation',
    'principle-type-system-discipline', 'recall', 'reflect', 'sharpen', 'show-me-your-work',
    'statechart', 'swarm', 'tdd', 'teach', 'technical-writing', 'typescript-best-practices', 'unslop', 'why',
  ]);
  const codex = render(hosts.codex, bundled);
  for (const skill of bundled.skills) {
    const metadata = skill.files.get('agents/openai.yaml');
    if (metadata) assert.deepEqual(codex.get(`skills/${skill.name}/agents/openai.yaml`).bytes, metadata.bytes, skill.name);
  }
  assert.doesNotMatch(read(codex, 'skills/setup-xstack/agents/openai.yaml'), /allow_implicit_invocation/);
});

test('agent prompts render as Codex TOML that round-trips', () => {
  const name = 'helper';
  const body = '\n# Title\n\nQuotes """ and """" and a \\ backslash, a \\n literal, a\ttab, \u0001 control, and "quoted".\nEnds with a quote "\n';
  const agent = { name, description: 'Says "hi" \\ there', body };
  const toml = read(render(hosts.codex, source({ agents: [agent] })), `agents/${name}.toml`);
  assert.deepEqual(parseToml(toml), { name, description: agent.description, developer_instructions: body.slice(1) });
});

test('copied docs keep links into the tree and point links that leave it at GitHub', () => {
  const how = skill('how', 'name: how\ndescription: d', 'b\n');
  const doc = [
    '[How](../../src/skills/how/SKILL.md#usage) [dir](../../src/skills/how/) [Release](../releasing.md) [Self](#top) [Web](https://example.com)',
    '![Router](./images/router.jpg)',
    '```md\n[Fenced](../releasing.md)\n```',
    '',
  ].join('\n');
  const files = render(hosts.codex, source({ skills: [how], docs: { 'docs/guide/x.md': file(doc), 'docs/guide/images/router.jpg': file('jpg') } }));
  assert.equal(read(files, 'docs/guide/x.md'), [
    '[How](../../skills/how/SKILL.md#usage) [dir](../../skills/how/) [Release](https://github.com/justinramos101/xstack/blob/main/docs/releasing.md) [Self](#top) [Web](https://example.com)',
    '![Router](./images/router.jpg)',
    '```md\n[Fenced](../releasing.md)\n```',
    '',
  ].join('\n'));
});

test('diff names stale, missing, extra, and mode-changed files, and write converges', () => {
  const dir = mkdtempSync(join(tmpdir(), 'xstack-tree-'));
  try {
    const files = new Map([['a.md', file('a\n')], ['bin/run', file('#!/bin/sh\n', true)], ['c.md', file('c\n')]]);
    write(files, dir);
    assert.deepEqual(diff(files, dir), []);
    assert.equal(statSync(join(dir, 'bin/run')).mode & 0o777, 0o755);
    writeFileSync(join(dir, 'a.md'), 'changed\n');
    rmSync(join(dir, 'c.md'));
    mkdirSync(join(dir, 'old'));
    writeFileSync(join(dir, 'old/extra.md'), 'x\n');
    chmodSync(join(dir, 'bin/run'), 0o645);
    assert.deepEqual(diff(files, dir).sort(), ['extra old/extra.md', 'missing c.md', 'stale a.md', 'stale bin/run']);
    write(files, dir);
    assert.deepEqual(diff(files, dir), []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the committed codex/ tree matches a fresh build', () => {
  const result = spawnSync(process.execPath, [new URL('build.mjs', import.meta.url).pathname, '--check'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
