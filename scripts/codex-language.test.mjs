import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const skills = new Set(readdirSync(join(root, 'src/skills')).filter(name => existsSync(join(root, 'src/skills', name, 'SKILL.md'))));
const obsolete = [
  ['subagent_type assignment', /\bsubagent_type\s*[:=]/],
  ['TodoWrite or TodoRead instruction', /\b(?:use|call|run|invoke)\s+`?Todo(?:Write|Read)\b|\bTodo(?:Write|Read)\s*\(/i],
  ['system-prompt store path', /\b(?:path|directory)\s+(?:is\s+)?(?:in|from)\s+the\s+system prompt\b/i],
  ['agent-store instruction', /\b(?:write|create|save|record|put|keep)\b[^\n.]*\bagent(?:'s)? store\b/i],
  ['retired invocation metadata', /\bdisable-model-invocation\s*:/],
];

function violations(text) {
  const found = [];
  for (const [index, line] of text.split('\n').entries()) {
    for (const [, name] of line.matchAll(/(?<=^|[\s`(|"'>])\/([a-z][a-z0-9-]*)(?![\w/<.-])/g)) {
      if (skills.has(name) || name === 'loop') found.push(`${index + 1}: obsolete /${name} invocation`);
    }
    for (const [name, pattern] of obsolete) if (pattern.test(line)) found.push(`${index + 1}: ${name}`);
  }
  return found;
}

function markdown(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? markdown(path) : path.endsWith('.md') ? [path] : [];
  });
}

test('the language check catches obsolete runtime instructions', () => {
  for (const text of [
    'Run /poteto-mode to start.',
    '`/loop until done`',
    'Spawn a worker with `subagent_type: "poteto-agent"`.',
    'Use `TodoWrite` for the plan.',
    'Call TodoRead before continuing.',
    'TodoWrite({ tasks: [] })',
    "Use the agent's store (path in the system prompt).",
    "Write the plan under the agent store's docs directory.",
    'Set `disable-model-invocation: true` in frontmatter.',
  ]) assert.notDeepEqual(violations(text), [], text);
});

test('the language check permits native commands, paths, and product provenance', () => {
  const text = [
    'Run $poteto-mode and $setup-xstack.',
    'Use /goal, /plan, and /hooks when the active session supports them.',
    'Read src/skills/poteto-mode/SKILL.md and /poteto-mode/references/example.md.',
    'Cursor supplied the upstream workflow. Origin and Bugbot remain supported.',
    'TodoWrite and TodoRead are not available in this session.',
    'A system prompt can contain global instructions.',
  ].join('\n');
  assert.deepEqual(violations(text), []);
});

test('authored workflows use Codex skill references and runtime instructions', () => {
  const files = [join(root, 'README.md'), ...['src', 'automations', 'docs/guide'].flatMap(dir => markdown(join(root, dir)))];
  const problems = files.flatMap(path => violations(readFileSync(path, 'utf8')).map(problem => `${relative(root, path)}:${problem}`));
  assert.deepEqual(problems, []);
});
