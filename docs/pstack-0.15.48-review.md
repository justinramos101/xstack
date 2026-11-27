# pstack 0.15.48 adoption review

Reviewed November 27, 2026 against xstack 0.9.0 at `c157d17`. Two November 23 commits touched `pstack/` since xstack’s 0.15.46 pin at `0b46ec3`. They added Reframe, documented it in the README, guide and help catalog, and bumped both manifests. The skill count rose from 58 to 59. Recommend syncing to `9e278fe`, the last commit to change pstack. Its pstack tree is identical to the one at the reviewed default-branch head, `main` at `b7b93c3`. [xstack pin][pin] · [Upstream comparison][range] · [0.15.48 manifest][manifest]

## Take Reframe with its follow-up

- **Start with the operator’s words and files.** The first commit teaches 8–12 terms ranked by how much each would change what gets built. Each term names something in the operator’s description, points to a real use the agent has opened and verified, and gives the operator a more precise request. Keep the limits of each analogy from the 2–3 neighboring fields, the overlooked concerns, and the final rewritten description. Drop any citation the agent cannot verify. [Introducing Reframe][intro] · [Final skill][skill]
- **Distinguish the possible problems before choosing the vocabulary.** The second commit covers descriptions that fit multiple problems. For those, give two or three plausible interpretations, one term and one distinguishing sign for each, then explain which interpretation best fits the evidence. Port this step with the original skill so a confident rewrite does not send the operator after the wrong problem. [Ambiguity follow-up][followup]

## Codex adoption

- **Make `$reframe` an explicit choice.** Put the skill in `src/skills/reframe/` and set `policy.allow_implicit_invocation: false` in its `agents/openai.yaml`. The build rejects upstream’s `disable-model-invocation` frontmatter. Add Reframe to the test’s explicit-only skill list. [Sharpen metadata][metadata] · [Build tests][tests]
- **Show where it fits.** Add `$reframe` beside `$sharpen` in the README, Poteto Help and the Poteto Mode guide. Reframe gives the operator words to describe the problem. They can send the rewrite directly or use Sharpen to add methods and an independent check. Carry over the guide’s example of a settings page that loses edits and update the README count to 59. [Upstream guide][guide] · [xstack README][readme] · [xstack help][help]
- **Ship through xstack’s existing release process.** When the port lands, update the revision, version and skill inventory in `docs/upstream.json`, bump xstack’s own version in `src/plugin.json`, regenerate `codex/` and run the build check and tests. The two upstream manifest changes record pstack’s release number. [xstack pin][pin] · [Release instructions][release]

**Packaging check.** In a temporary copy of xstack 0.9.0, I adapted the final Reframe prompt to use `$reframe` and copied Sharpen’s invocation policy. The build and generated-tree check passed. A standalone project install linked 59 skills and preserved Reframe’s prompt and policy byte-for-byte. This checked packaging only.

## Open upstream work worth tracking

The Statechart cleanup PR addresses a POSIX janitor that can try to kill a worker’s process group after the worker has exited. I compared xstack’s janitor with the upstream file at the reviewed pin and found them byte-identical. Review the cleanup fix separately and exercise both normal exit and interrupted runs before backporting it. [Upstream PR #1340](https://github.com/cursor/plugins/pull/1340) · [xstack janitor](https://github.com/justinramos101/xstack/blob/c157d17/src/skills/statechart/scripts/janitor.ts)

[pin]: https://github.com/justinramos101/xstack/blob/c157d17/docs/upstream.json
[range]: https://github.com/cursor/plugins/compare/0b46ec399d55f2829e88822998f53b84944837d3...b7b93c36be9bcc36a74db438e0fd385d660bc559
[manifest]: https://github.com/cursor/plugins/blob/b7b93c36be9bcc36a74db438e0fd385d660bc559/pstack/.cursor-plugin/plugin.json
[intro]: https://github.com/cursor/plugins/commit/2dd5c0ccc5b207dc23a69759871a35954082cbf7
[skill]: https://github.com/cursor/plugins/blob/9e278fe4d4ecd8bfe98b1b79bf4be662efb338cc/pstack/skills/reframe/SKILL.md
[followup]: https://github.com/cursor/plugins/commit/9e278fe4d4ecd8bfe98b1b79bf4be662efb338cc
[metadata]: https://github.com/justinramos101/xstack/blob/c157d17/src/skills/sharpen/agents/openai.yaml
[tests]: https://github.com/justinramos101/xstack/blob/c157d17/scripts/build.test.mjs#L67-L104
[guide]: https://github.com/cursor/plugins/blob/9e278fe4d4ecd8bfe98b1b79bf4be662efb338cc/pstack/docs/guide/02-poteto-mode.md
[readme]: https://github.com/justinramos101/xstack/blob/c157d17/README.md
[help]: https://github.com/justinramos101/xstack/blob/c157d17/src/skills/poteto-help/SKILL.md
[release]: https://github.com/justinramos101/xstack/blob/c157d17/docs/releasing.md
