import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sharedDocs } from './build.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const trees = ['codex'].map(dir => join(root, dir));
const skills = readdirSync(join(src, 'skills')).filter(name => existsSync(join(src, 'skills', name, 'SKILL.md')));
const principles = skills.filter(name => name.startsWith('principle-'));
const playbooks = readdirSync(join(src, 'skills/poteto-mode/playbooks')).filter(name => name.endsWith('.md'));
const placeholders = new Set(['url', 'name']);
const external = new Set(['plugin', 'goal', 'plan', 'hooks', 'agents', 'model', 'effort', 'skills', 'clear', 'compact', 'resume']);
const nativeSkills = new Set(['skill-creator', 'skill-installer']);
const skillPlaceholders = new Set(['name', 'skill-name']);

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (name === 'node_modules' || name.startsWith('.')) return [];
    return statSync(path).isDirectory() ? walk(path) : path.endsWith('.md') ? [path] : [];
  });
}
const guide = ['README.md', ...readdirSync(join(root, 'docs/guide')).filter(name => name.endsWith('.md')).map(name => `docs/guide/${name}`)].map(doc => join(root, doc));
const docs = [...new Set([...guide, join(root, 'docs/codex-hooks.md'), ...walk(src), ...walk(join(root, 'automations')), ...trees.flatMap(walk)])];
const strip = text => text.replace(/^(```|~~~)[\s\S]*?^\1/gm, '');
const inside = (dir, path) => !relative(dir, path).startsWith('..');

function sharedDocLinkedFromSrc(file, resolved) {
  if (!inside(src, file) || existsSync(resolved) || !inside(src, resolved)) return undefined;
  const rel = relative(src, resolved).split(sep).join('/');
  return sharedDocs.some(doc => rel === doc || rel.startsWith(`${doc}/`)) ? join(root, rel) : undefined;
}
function linkTarget(file, path) {
  const resolved = normalize(join(dirname(file), decodeURI(path)));
  return sharedDocLinkedFromSrc(file, resolved) ?? resolved;
}

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
      const resolved = path ? linkTarget(file, path) : file;
      const where = `${file.slice(root.length + 1)} -> ${target}`;
      const tree = trees.find(dir => inside(dir, file));
      if (tree && !inside(tree, resolved)) problems.push(`leaves its tree ${where}`);
      else if (!existsSync(resolved)) problems.push(`missing ${where}`);
      else if (anchor && resolved.endsWith('.md') && !anchors(resolved).has(anchor)) problems.push(`no anchor ${where}`);
    }
  }
  assert.deepEqual(problems, []);
});

test('the README and guide use real Codex commands and skill references', () => {
  const problems = [];
  for (const file of guide) {
    for (const [, name] of readFileSync(file, 'utf8').matchAll(/(?<=^|[\s`(|"'>])\/([a-z][a-z0-9-]*)(?![\w/<.-])/gm)) {
      if (!external.has(name) && !placeholders.has(name)) problems.push(`${file.slice(root.length + 1)}: /${name}`);
    }
    for (const [, name] of readFileSync(file, 'utf8').matchAll(/(?<=^|[\s`(|"'>])\$([a-z][a-z0-9-]*)(?![\w/<.-])/gm)) {
      if (!skills.includes(name) && !nativeSkills.has(name) && !skillPlaceholders.has(name)) problems.push(`${file.slice(root.length + 1)}: $${name}`);
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

test('every skill is named after its folder', () => {
  for (const name of skills) {
    const text = readFileSync(join(src, 'skills', name, 'SKILL.md'), 'utf8');
    assert.equal(text.match(/^name: (.+)$/m)?.[1], name);
  }
});
