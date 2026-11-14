#!/usr/bin/env node
import { readFileSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

function check(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('expected a hook event object');
  if (input.hook_event_name !== 'Stop' || input.stop_hook_active === true) return {};
  const root = realpathSync(join(dirname(fileURLToPath(import.meta.url)), '..'));
  const cwd = realpathSync(input.cwd ?? process.cwd());
  const path = relative(root, cwd);
  if (path === '..' || path.startsWith(`..${sep}`) || isAbsolute(path)) return {};
  const result = spawnSync(process.execPath, [join(root, 'scripts/build.mjs'), '--check'], {
    cwd: root, encoding: 'utf8', timeout: 15_000, maxBuffer: 1_048_576,
  });
  if (result.status === 0) return {};
  const detail = result.error?.message ?? (result.stderr.trim() || `build.mjs --check exited with ${result.status ?? result.signal}`);
  return { decision: 'block', reason: `Generated Codex files need attention. Run node scripts/build.mjs, then node scripts/build.mjs --check. ${detail.slice(0, 2000)}` };
}

try {
  const result = check(JSON.parse(readFileSync(0, 'utf8')));
  process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
  process.stderr.write(`check-generated-hook: ${error.message}\n`);
  process.exitCode = 1;
}
