#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const roles = ['feature', 'refactoring', 'bug-fix', 'perf-issue', 'hillclimb', 'judgment and prose', 'hardest tasks', 'how explorer', 'how explainer', 'why investigators', 'why synthesizer', 'reflect tooling', 'reflect judgment', 'divergent', 'synthesizer', 'arena runners', 'arena cross-judge pool', 'swarm workers', 'architect runners', 'interrogate reviewers'];
const panels = new Set(['arena runners', 'arena cross-judge pool', 'architect runners', 'interrogate reviewers']);
const budgets = { unlimited: null, large: 'xhigh', medium: 'high', small: 'medium' };
const efforts = new Set(['low', 'medium', 'high', 'xhigh', 'max', 'ultra']);
const START = '<!-- xstack-models:start -->';
const END = '<!-- xstack-models:end -->';
const hostNames = { claude: 'Claude Code', codex: 'Codex' };

// Claude Code loads every ~/.claude/rules/*.md into each session. Codex has no
// such folder, so its roles live in a marked block of the global instructions
// file it loads: AGENTS.override.md when that file has content, else AGENTS.md.
export function destination(host) {
  checkHost(host);
  if (host === 'claude') return join(homedir(), '.claude', 'rules', 'xstack-models.md');
  const home = process.env.CODEX_HOME || join(homedir(), '.codex');
  const override = join(home, 'AGENTS.override.md');
  return existsSync(override) && readFileSync(override, 'utf8').trim() ? override : join(home, 'AGENTS.md');
}

export const legacyFile = () => join(homedir(), '.agents', 'xstack-models.md');

function checkHost(host) {
  if (!Object.hasOwn(hostNames, host)) throw new Error('Host must be claude or codex');
}

function parse(source) {
  const sections = { shared: new Map(), claude: new Map(), codex: new Map() };
  let section = 'shared';
  for (const line of source.split(/\r?\n/)) {
    if (line.trim() === START || line.trim() === END) continue;
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
  return sections;
}

export function resolveRole(source, host, role) {
  checkHost(host);
  if (!roles.includes(role)) throw new Error(`Unknown role: ${role}`);
  const sections = parse(source);
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

// The text between the markers, or null when the file has no complete block.
export function extractBlock(text) {
  const start = text.indexOf(START);
  const end = text.indexOf(END, start);
  return start === -1 || end === -1 ? null : text.slice(start + START.length, end);
}

// The current config for a host: its loaded file first, then the legacy shared file.
export function readConfig(host) {
  const file = destination(host);
  if (existsSync(file)) {
    const text = readFileSync(file, 'utf8');
    const source = host === 'claude' ? text : extractBlock(text);
    if (source !== null) return { source, from: file };
  }
  if (existsSync(legacyFile())) return { source: readFileSync(legacyFile(), 'utf8'), from: legacyFile() };
  return { source: '', from: null };
}

// Validates a draft and renders the lines a session loads. Host sections in the
// draft are flattened for this host, and retired roles are dropped.
export function render(host, draft) {
  checkHost(host);
  const sections = parse(draft);
  const values = new Map([...sections.shared, ...sections[host]]);
  const budget = values.get('budget') ?? 'unlimited';
  const lines = [];
  for (const role of roles) {
    if (!values.has(role)) continue;
    resolveRole(`${role}: ${values.get(role)}`, host, role);
    lines.push(`${role}: ${values.get(role).trim()}`);
  }
  const cap = budgets[budget]
    ? `caps each entry's effort at ${budgets[budget]} and gives an entry without an effort ${budgets[budget]}`
    : 'each entry keeps its own effort';
  return [
    `# xstack model roles for ${hostNames[host]}. Written by setup-xstack; rerun it to change them.`,
    '# When a skill spawns a subagent for a role, pass the model and effort from that role\'s line. `inherit-parent` or `auto`: omit both, so the subagent runs on this session\'s model and effort.',
    '# arena runners, architect runners, and interrogate reviewers spawn one subagent per entry. arena cross-judge pool lists alternatives for arena\'s one judge. A role with no line inherits.',
    `# budget: ${budget} (${cap})`,
    ...lines,
  ].join('\n') + '\n';
}

function writeAtomic(file, text) {
  mkdirSync(dirname(file), { recursive: true });
  const temp = `${file}.xstack-${process.pid}.tmp`;
  writeFileSync(temp, text);
  renameSync(temp, file);
}

// Writes the rendered roles where the host loads them. In AGENTS.md only the
// marked block changes; everything around it is kept byte for byte.
export function writeConfig(host, draft) {
  const body = render(host, draft);
  const file = destination(host);
  if (host === 'claude') {
    writeAtomic(file, body);
    return file;
  }
  const block = `${START}\n${body}${END}`;
  const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const count = marker => text.split(marker).length - 1;
  const start = text.indexOf(START);
  const end = text.indexOf(END);
  if (count(START) !== count(END) || count(START) > 1 || end < start) {
    throw new Error(`${file} has an unmatched or repeated xstack-models marker. Fix it by hand, then rerun.`);
  }
  const next = start === -1
    ? `${text}${text && !text.endsWith('\n\n') ? (text.endsWith('\n') ? '\n' : '\n\n') : ''}${block}\n`
    : text.slice(0, start) + block + text.slice(end + END.length);
  writeAtomic(file, next);
  return file;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try {
    const [command, ...args] = process.argv.slice(2);
    if (command === 'read' && args.length === 1) {
      const { source, from } = readConfig(args[0]);
      console.error(from ? `from ${from}` : 'no config; every role inherits');
      process.stdout.write(source);
    } else if (command === 'write' && args.length >= 1 && args.length <= 2) {
      const draft = readFileSync(args[1] ?? 0, 'utf8');
      console.log(writeConfig(args[0], draft));
    } else if (command && !['read', 'write'].includes(command) && args.length >= 1 && args.length <= 2) {
      const [host, role, file] = [command, ...args];
      const text = file && existsSync(file) ? readFileSync(file, 'utf8') : '';
      const source = file ? extractBlock(text) ?? text : readConfig(host).source;
      console.log(JSON.stringify(resolveRole(source, host, role)));
    } else {
      throw new Error('Usage: models.mjs <claude|codex> "<role>" [config-file] | read <host> | write <host> [draft-file]');
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
