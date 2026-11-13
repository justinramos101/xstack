# Releasing and dogfooding

This page is for maintainers. Users install from the [README](../README.md#install).

## Why the version matters

Codex can refresh its copy on an explicit marketplace upgrade. Keep the version as the release signal for plugin users:

- **Bump the version** when anything under `src/` or `hosts/` changes. That is every pstack sync. After a sync, run `node scripts/build.mjs` and commit the regenerated `codex/` tree. `node scripts/build.mjs --check` fails when these generated trees are stale. Separately, compare the Codex defaults in `src/skills/setup-xstack/scripts/models.mjs` with the models Codex's spawn tool lists. A retired model degrades every spawn of that role to the parent until the default is bumped. The build does not check model availability.
- **Leave it alone** for docs, tests, and CI. Installed users run none of that.

The version lives in `src/plugin.json`. The build writes it into `codex/plugin.json` and `codex/.codex-plugin/plugin.json`; `scripts/manifests.test.mjs` fails when they disagree.

## Cut a release

1. Bump the version in `src/plugin.json` in the PR that carries the change, then run `node scripts/build.mjs`. Use a plain `x.y.z` on `main`.
2. Merge to `main`.

The [release workflow](../.github/workflows/release.yml) runs when `src/plugin.json` changes on `main`. It tags `v<version>` and publishes a GitHub release whose notes list the merged PRs since the previous tag. A version that is already tagged is skipped, so re-running is safe. The workflow fails if a prerelease version such as `0.6.0-alpha.1` lands on `main`.

The sync PR title already names the pstack range, so the generated notes say which upstream revision a version tracks.

## Try a change before it ships

Two ways, lightest first.

### From a checkout

Run `node scripts/build.mjs`, then `node scripts/install.mjs --project` from a scratch project using the installer's absolute path. Keep any installed plugin disabled while testing these skills. Start a new Codex session after rebuilding. The linked skills include the helper prompts and invocation metadata.

### From the `next` branch

Set a prerelease version such as `0.8.0-alpha.1` on `next`, rebuild, and push. The release workflow publishes a GitHub prerelease. Each published update needs a new version.

In Codex, pin the marketplace itself to the branch, since the Codex catalog has one entry:

```sh
codex plugin marketplace remove xstack
codex plugin marketplace add justinramos101/xstack@next
```

Refresh with `codex plugin marketplace upgrade xstack`. Re-add the marketplace without `@next` to switch back.

When the change is ready, open the PR to `main` with the plain version, and reset `next` to `main` after it merges so the next prerelease starts from the release.

Keep the marketplace name `xstack`, entry name `xstack`, and source path `./codex` stable. Both manifests retain their names and skills path so existing Codex installs can update in place. Linked skill users update their checkout and rerun the installer for new skills.
