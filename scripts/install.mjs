#!/usr/bin/env node
import { existsSync, lstatSync, mkdirSync, readdirSync, readlinkSync, realpathSync, symlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function install(source, destination) {
  const skills = readdirSync(source).filter(name => existsSync(join(source, name, 'SKILL.md'))).sort();
  const pending = [];
  const conflicts = [];
  for (const name of skills) {
    const target = join(destination, name);
    const wanted = resolve(source, name);
    let stat;
    try { stat = lstatSync(target); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (!stat) pending.push([wanted, target]);
    else if (!stat.isSymbolicLink() || resolve(dirname(target), readlinkSync(target)) !== wanted) conflicts.push(target);
  }
  if (conflicts.length) throw new Error(`Existing skills preserved. Resolve conflicts before installing:\n${conflicts.join('\n')}`);
  mkdirSync(destination, { recursive: true });
  for (const [wanted, target] of pending) symlinkSync(wanted, target, 'dir');
  return pending.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 1 || !['--user', '--project'].includes(args[0])) throw new Error('Usage: install.mjs --user | --project (run from the target project)');
    const source = fileURLToPath(new URL('../codex/skills/', import.meta.url));
    const destination = join(args[0] === '--user' ? homedir() : process.cwd(), '.agents', 'skills');
    console.log(`Linked ${install(source, destination)} skills into ${destination}. Start a new Codex session.`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
