# Releasing and dogfooding

This page is for maintainers. Users install from the [README](../README.md#install).

## Why the version matters

Claude Code copies the plugin at install and fetches a new copy only when the manifest `version` changes, so pushing commits without a bump reaches no Claude Code user who already has xstack installed. Codex can refresh its copy on an explicit marketplace upgrade regardless, but treat the version as the release signal on both hosts. So:

- **Bump the version** when anything under `skills/`, `agents/`, or `hooks/` changes. That is every pstack sync.
- **Leave it alone** for docs, tests, and CI. Installed users run none of that.

The version lives in three manifests, `plugin.json`, `.claude-plugin/plugin.json`, and `.codex-plugin/plugin.json`, and `scripts/manifests.test.mjs` fails when they disagree.

## Cut a release

1. Bump the version in all three manifests in the PR that carries the change. Use a plain `x.y.z` on `main`.
2. Merge to `main`.

The [release workflow](../.github/workflows/release.yml) runs when `.claude-plugin/plugin.json` changes on `main`. It tags `v<version>` and publishes a GitHub release whose notes list the merged PRs since the previous tag. A version that is already tagged is skipped, so re-running is safe. The workflow fails if a prerelease version such as `0.6.0-alpha.1` lands on `main`.

The sync PR title already names the pstack range, so the generated notes say which upstream revision a version tracks.

## Try a change before it ships

Two ways, lightest first.

### One session from a checkout

Start Claude Code with the checkout as a plugin directory:

```sh
claude --plugin-dir /path/to/xstack
```

That loads the files in place for that session only, no version bump needed, and replaces the installed xstack for the session because both have the manifest name `xstack`. Edits show up on the next start. This is the right tool while you are still editing.

### Every session from the `next` branch

For changes you want to live with for a while, push them to the `next` branch with a prerelease version, then install the `xstack-next` entry.

1. On `next`, set the version in all three manifests to a prerelease such as `0.6.0-alpha.1`. Every later push to `next` that you want to receive needs a new prerelease version, because updates are detected by version, not by commit.
2. Push to `next`. The release workflow publishes `v0.6.0-alpha.1` as a GitHub prerelease, and fails if `next` carries a plain `x.y.z`.
3. Switch your install to it. The two entries share the manifest name `xstack`, so keep only one enabled or Claude Code drops the hooks of one of them:

```sh
claude plugin disable xstack@xstack
claude plugin install xstack-next@xstack
```

4. Pull later prereleases with `claude plugin update xstack-next@xstack`, or turn on auto-update for the `xstack` marketplace under `/plugin`.
5. Switch back when the change ships:

```sh
claude plugin uninstall xstack-next@xstack
claude plugin enable xstack@xstack
```

In Codex, pin the marketplace itself to the branch, since the Codex catalog has one entry:

```sh
codex plugin marketplace remove xstack
codex plugin marketplace add justinramos101/xstack@next
```

Refresh with `codex plugin marketplace upgrade xstack`. Re-add the marketplace without `@next` to switch back.

When the change is ready, open the PR to `main` with the plain version, and reset `next` to `main` after it merges so the next prerelease starts from the release.
