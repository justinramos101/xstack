import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = file => JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'));
const source = read('src/plugin.json');
const manifests = ['claude/.claude-plugin/plugin.json', 'codex/plugin.json', 'codex/.codex-plugin/plugin.json'].map(file => [file, read(file)]);

// x.y.z with an optional SemVer prerelease such as -alpha.1: dot-separated identifiers, no leading zeros.
const identifier = String.raw`(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)`;
const semver = new RegExp(String.raw`^\d+\.\d+\.\d+(?:-${identifier}(?:\.${identifier})*)?$`);

test('every generated manifest agrees with src/plugin.json on identity and version', () => {
  assert.match(source.version, semver, 'src/plugin.json version');
  assert.equal(read('codex/plugin.json').$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
  assert.equal(source.repository, 'https://github.com/justinramos101/xstack');
  for (const [file, manifest] of manifests) {
    for (const field of ['name', 'version', 'description', 'homepage', 'repository', 'license']) {
      assert.equal(manifest[field], source[field], `${file} ${field}`);
    }
  }
});

test('the version pattern accepts SemVer prereleases and rejects malformed ones', () => {
  for (const ok of ['0.5.0', '0.6.0-alpha.1', '0.6.0-alpha-fix.1', '1.0.0-rc.0']) assert.match(ok, semver, ok);
  for (const bad of ['0.6.0-', '0.6.0-.', '0.6.0-alpha..1', '0.6.0-01', '0.6.0-alpha.1+build', 'v0.6.0']) assert.doesNotMatch(bad, semver, bad);
});
