import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { diff, hosts, loadSource, parseFrontmatter, render, write } from './build.mjs';

const repo = new URL('../', import.meta.url).pathname;
const claudeData = JSON.parse(readFileSync(new URL('../hosts/claude.json', import.meta.url), 'utf8'));
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

test('neutral tokens render per host in SKILL.md, references, and agent bodies', () => {
  const demo = skill('demo', 'name: demo\ndescription: d', 'Run `node <this skill directory>/scripts/x.mjs`.\n', { 'references/r.md': file('From <this skill directory>.\n') });
  const agent = { name: 'helper', description: 'h', body: '\nRead <skill file demo> first.\n' };
  const claude = render(hosts.claude, source({ skills: [demo], agents: [agent] }));
  assert.match(read(claude, 'skills/demo/SKILL.md'), /node \$\{CLAUDE_SKILL_DIR\}\/scripts\/x\.mjs/);
  assert.equal(read(claude, 'skills/demo/references/r.md'), 'From ${CLAUDE_SKILL_DIR}.\n');
  assert.match(read(claude, 'agents/helper.md'), /Read `\$\{CLAUDE_PLUGIN_ROOT\}\/skills\/demo\/SKILL\.md` first\./);
  const codex = render(hosts.codex, source({ skills: [demo], agents: [agent] }));
  assert.match(read(codex, 'skills/demo/SKILL.md'), /node <this skill directory>\/scripts\/x\.mjs/);
  const instructions = parseToml(read(codex, 'agents/helper.toml')).developer_instructions;
  assert.match(instructions, /^Read the absolute path your parent gave you, else .*`skills\/demo\/SKILL\.md`.*`\.codex-plugin\/plugin\.json` has the highest `version` first\.\n$/);
  for (const files of [claude, codex]) for (const [path, { bytes }] of files) assert.doesNotMatch(bytes.toString('utf8'), /<skill file/, path);
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

test('Claude skills end their frontmatter with a quoted argument hint, idempotently', () => {
  const [name, hint] = Object.entries(claudeData.argumentHints)[0];
  const original = skill(name, `name: ${name}\ndescription: "say \\"hi\\""\nargument-hint: stale\ndisable-model-invocation: true`, '# Body\n');
  const once = read(render(hosts.claude, source({ skills: [original] })), `skills/${name}/SKILL.md`);
  assert.equal(once, `---\nname: ${name}\ndescription: "say \\"hi\\""\ndisable-model-invocation: true\nargument-hint: ${JSON.stringify(hint)}\n---\n# Body\n`);
  assert.ok(hint.startsWith('['), 'the table exercises a bracketed value');
  const again = { ...parseFrontmatter(once, name), name, files: new Map() };
  assert.equal(read(render(hosts.claude, source({ skills: [again] })), `skills/${name}/SKILL.md`), once);
  const plain = read(render(hosts.claude, source({ skills: [skill('no-hint-here', 'name: no-hint-here\ndescription: d', 'b\n')] })), 'skills/no-hint-here/SKILL.md');
  assert.equal(plain, '---\nname: no-hint-here\ndescription: d\n---\nb\n');
});

test('Codex skills keep only name and description, and the invocation flag becomes openai.yaml', () => {
  const hidden = skill('hidden', 'name: hidden\ndescription: "a: b"\ndisable-model-invocation: true\nicon: crown\ncolor: yellow\npaths: ["**/*.ts"]', '# Hidden\n', { 'scripts/run.sh': file('#!/bin/sh\n', true) });
  const open = skill('open', 'name: open\ndescription: d\ndisable-model-invocation: false', '# Open\n');
  const commented = skill('commented', 'name: commented\ndescription: d\ndisable-model-invocation: true # user only\n# a standalone comment', '# C\n');
  const codex = render(hosts.codex, source({ skills: [hidden, open, commented] }));
  assert.equal(read(codex, 'skills/commented/agents/openai.yaml'), 'policy:\n  allow_implicit_invocation: false\n');
  assert.equal(read(codex, 'skills/hidden/SKILL.md'), '---\nname: hidden\ndescription: "a: b"\n---\n# Hidden\n');
  assert.equal(read(codex, 'skills/hidden/agents/openai.yaml'), 'policy:\n  allow_implicit_invocation: false\n');
  assert.equal(codex.get('skills/hidden/scripts/run.sh').executable, true);
  assert.equal(codex.has('skills/open/agents/openai.yaml'), false);
  const claude = render(hosts.claude, source({ skills: [hidden] }));
  assert.equal(claude.has('skills/hidden/agents/openai.yaml'), false);
  assert.match(read(claude, 'skills/hidden/SKILL.md'), /^icon: crown\ncolor: yellow\npaths: \["\*\*\/\*\.ts"\]$/m);
});

test('agents render as Claude frontmatter in host order and as Codex TOML that round-trips', () => {
  const [name, fields] = Object.entries(claudeData.agents)[0];
  const body = '\n# Title\n\nQuotes """ and """" and a \\ backslash, a \\n literal, a\ttab, \u0001 control, and "quoted".\nEnds with a quote "\n';
  const agent = { name, description: 'Says "hi" \\ there', body };
  const claude = read(render(hosts.claude, source({ agents: [agent] })), `agents/${name}.md`);
  const extra = Object.entries(fields).map(([key, value]) => `${key}: ${value}\n`).join('');
  assert.equal(claude, `---\nname: ${name}\ndescription: Says "hi" \\ there\n${extra}---\n${body}`);
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
  const files = render(hosts.claude, source({ skills: [how], docs: { 'docs/guide/x.md': file(doc), 'docs/guide/images/router.jpg': file('jpg') } }));
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

test('the committed claude/ and codex/ trees match a fresh build', () => {
  const result = spawnSync(process.execPath, [new URL('build.mjs', import.meta.url).pathname, '--check'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
});
