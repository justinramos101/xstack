#!/usr/bin/env node
import { readFileSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const roles = ['feature', 'refactoring', 'bug-fix', 'perf-issue', 'hillclimb', 'judgment and prose', 'hardest tasks', 'how explorer', 'how explainer', 'why investigators', 'why synthesizer', 'reflect tooling', 'reflect judgment', 'divergent', 'synthesizer', 'arena runners', 'arena cross-judge pool', 'swarm workers', 'architect runners', 'interrogate reviewers'];
const panels = new Set(['arena runners', 'arena cross-judge pool', 'architect runners', 'interrogate reviewers']);
const budgets = { unlimited: null, large: 'xhigh', medium: 'high', small: 'medium' };
const efforts = new Set(['low', 'medium', 'high', 'xhigh', 'max', 'ultra']);

export function resolveRole(source, host, role) {
  if (!['claude', 'codex'].includes(host)) throw new Error('Host must be claude or codex');
  if (!roles.includes(role)) throw new Error(`Unknown role: ${role}`);
  const sections = { shared: new Map(), claude: new Map(), codex: new Map() };
  let section = 'shared';
  for (const line of source.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(\S+)\s*$/);
    if (heading) {
      section = heading[1].toLowerCase();
      if (!(Object.hasOwn(sections, section))) throw new Error(`Unknown host section: ${section}`);
      continue;
    }
    const budget = line.match(/^#\s*budget:\s*(\w+)(?:\s+\([^)]*\))?\s*$/);
    if (budget) {
      if (!(Object.hasOwn(budgets, budget[1]))) throw new Error(`Unknown budget: ${budget[1]}`);
      sections[section].set('budget', budget[1]);
      continue;
    }
    if (!line.trim() || line.startsWith('#')) continue;
    const entry = line.match(/^([^:]+):\s*(.+)$/);
    if (!entry) throw new Error(`Invalid config line: ${line}`);
    for (const label of entry[1].split(',').map(x => x.trim())) {
      if (label === 'how critics') continue;
      if (!roles.includes(label)) throw new Error(`Unknown role: ${label}`);
      sections[section].set(label, entry[2]);
    }
  }
  const values = new Map([...sections.shared, ...sections[host]]);
  const budget = values.get('budget') ?? 'unlimited';
  const defaults = Array(panels.has(role) ? 4 : 1).fill('inherit-parent').join(', ');
  const entries = (values.get(role) ?? defaults).split(',').map(value => {
    const match = value.trim().match(/^([\w.-]+)(?:\s*@\s*([\w]+))?$/);
    if (!match || (match[2] && !efforts.has(match[2]))) throw new Error(`Invalid model entry: ${value}`);
    const model = match[1];
    if (model === 'inherit-parent' || model === 'auto') return { model: null, effort: null };
    const target = budgets[budget];
    const chosen = match[2] ?? null;
    const ladder = [...efforts];
    const effort = target && chosen ? ladder[Math.min(ladder.indexOf(target), ladder.indexOf(chosen))] : target ?? chosen;
    return { model, effort };
  });
  if (!panels.has(role) && entries.length !== 1) throw new Error(`${role} requires one model`);
  return { host, role, budget, entries };
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try {
    const [host, role, file = join(homedir(), '.agents', 'xstack-models.md'), ...extra] = process.argv.slice(2);
    if (!host || !role || extra.length) throw new Error('Usage: models.mjs <claude|codex> "<role>" [config-file]');
    let source;
    try { source = readFileSync(file, 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; source = ''; }
    console.log(JSON.stringify(resolveRole(source, host, role)));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
