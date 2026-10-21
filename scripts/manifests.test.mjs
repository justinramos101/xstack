import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The three plugin manifests describe one plugin: the portable root manifest,
// Claude Code's, and Codex's compatibility fallback. A release bumps all three.
const manifests = ['plugin.json', '.claude-plugin/plugin.json', '.codex-plugin/plugin.json']
  .map(file => [file, JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'))]);

test('the three plugin manifests agree on identity and version', () => {
  const [, root] = manifests[0];
  for (const [file, manifest] of manifests) {
    for (const field of ['name', 'version', 'description', 'homepage', 'repository', 'license']) {
      assert.equal(manifest[field], root[field], `${file} ${field}`);
    }
    assert.match(manifest.version, /^\d+\.\d+\.\d+$/, `${file} version`);
    assert.equal(manifest.repository, 'https://github.com/justinramos101/xstack', `${file} repository`);
  }
});
