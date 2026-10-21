import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The three plugin manifests describe one plugin: the portable root manifest,
// Claude Code's, and Codex's compatibility fallback. A release bumps all three,
// and the release workflow tags whatever version lands on main or next.
const manifests = ['plugin.json', '.claude-plugin/plugin.json', '.codex-plugin/plugin.json']
  .map(file => [file, JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'))]);

// x.y.z with an optional SemVer prerelease such as -alpha.1: dot-separated identifiers, no leading zeros.
const identifier = String.raw`(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)`;
const semver = new RegExp(String.raw`^\d+\.\d+\.\d+(?:-${identifier}(?:\.${identifier})*)?$`);

test('the three plugin manifests agree on identity and version', () => {
  const [, root] = manifests[0];
  for (const [file, manifest] of manifests) {
    for (const field of ['name', 'version', 'description', 'homepage', 'repository', 'license']) {
      assert.equal(manifest[field], root[field], `${file} ${field}`);
    }
    assert.match(manifest.version, semver, `${file} version`);
    assert.equal(manifest.repository, 'https://github.com/justinramos101/xstack', `${file} repository`);
  }
});

test('the version pattern accepts SemVer prereleases and rejects malformed ones', () => {
  for (const ok of ['0.5.0', '0.6.0-alpha.1', '0.6.0-alpha-fix.1', '1.0.0-rc.0']) assert.match(ok, semver, ok);
  for (const bad of ['0.6.0-', '0.6.0-.', '0.6.0-alpha..1', '0.6.0-01', '0.6.0-alpha.1+build', 'v0.6.0']) assert.doesNotMatch(bad, semver, bad);
});
