import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

// Checks what the README, the guide, and the skills say about the tree: relative
// links and anchors resolve, slash commands name a real skill, and counts match.
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const skills = readdirSync(join(root, 'skills')).filter(name => existsSync(join(root, 'skills', name, 'SKILL.md')));
const principles = skills.filter(name => name.startsWith('principle-'));
const playbooks = readdirSync(join(root, 'skills/poteto-mode/playbooks')).filter(name => name.endsWith('.md'));
// Commands that ship with a host, not with xstack.
// `url` and `name` are placeholders in templates and the glossary.
const placeholders = new Set(['url', 'name']);
const external = new Set(['loop', 'plugin', 'goal', 'hooks', 'agents', 'model', 'effort', 'skills', 'clear', 'compact', 'resume']);

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (name === 'node_modules' || name.startsWith('.')) return [];
    return statSync(path).isDirectory() ? walk(path) : path.endsWith('.md') ? [path] : [];
  });
}
const guide = ['README.md', ...readdirSync(join(root, 'docs/guide')).filter(name => name.endsWith('.md')).map(name => `docs/guide/${name}`)].map(doc => join(root, doc));
const docs = [...new Set([...guide, ...walk(join(root, 'skills')), ...walk(join(root, 'automations'))])];
const strip = text => text.replace(/^(```|~~~)[\s\S]*?^\1/gm, '');

function anchors(file) {
  const found = new Set();
  const seen = new Map();
  for (const line of strip(readFileSync(file, 'utf8')).split('\n')) {
    const heading = line.match(/^#{1,6}\s+(.*?)\s*$/);
    if (!heading) continue;
    const slug = heading[1].replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[`*]/g, '').trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');
    const repeat = seen.get(slug) ?? 0;
    seen.set(slug, repeat + 1);
    found.add(repeat ? `${slug}-${repeat}` : slug);
  }
  return found;
}

test('relative links and anchors resolve', () => {
  const problems = [];
  for (const file of docs) {
    for (const [, target] of strip(readFileSync(file, 'utf8')).matchAll(/\]\(<?([^)\s>]+)>?(?:\s+"[^"]*")?\)/g)) {
      if (/^[a-z]+:/i.test(target) || placeholders.has(target)) continue;
      const [path, anchor] = target.split('#');
      const resolved = path ? normalize(join(dirname(file), decodeURI(path))) : file;
      const where = `${file.slice(root.length + 1)} -> ${target}`;
      if (!existsSync(resolved)) problems.push(`missing ${where}`);
      else if (anchor && resolved.endsWith('.md') && !anchors(resolved).has(anchor)) problems.push(`no anchor ${where}`);
    }
  }
  assert.deepEqual(problems, []);
});

test('slash commands in the README and guide name a real skill', () => {
  const problems = [];
  for (const file of guide) {
    for (const [, name] of readFileSync(file, 'utf8').matchAll(/(?<=^|[\s`(|"'>])\/([a-z][a-z0-9-]*)(?![\w/<.-])/gm)) {
      if (!skills.includes(name) && !external.has(name) && !placeholders.has(name)) problems.push(`${file.slice(root.length + 1)}: /${name}`);
    }
  }
  assert.deepEqual(problems, []);
});

test('counts in the README and guide match the tree', () => {
  const expected = { skills: skills.length, principles: principles.length, playbooks: playbooks.length };
  const problems = [];
  for (const file of guide) {
    for (const [claim, count, kind] of readFileSync(file, 'utf8').matchAll(/\b(\d+) (?:named )?(skills|principles|playbooks)\b/g)) {
      if (Number(count) !== expected[kind]) problems.push(`${file.slice(root.length + 1)}: "${claim}", tree has ${expected[kind]}`);
    }
  }
  assert.deepEqual(problems, []);
});

test('every skill is named after its folder, and every user-only skill hides from Codex too', () => {
  for (const name of skills) {
    const text = readFileSync(join(root, 'skills', name, 'SKILL.md'), 'utf8');
    assert.equal(text.match(/^name: (.+)$/m)?.[1], name);
    const hidden = /^disable-model-invocation: true$/m.test(text);
    const openai = join(root, 'skills', name, 'agents', 'openai.yaml');
    assert.equal(existsSync(openai) && /allow_implicit_invocation: false/.test(readFileSync(openai, 'utf8')), hidden, name);
  }
});
