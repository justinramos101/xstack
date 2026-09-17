---
name: setup-benny
description: Configure the dormant Benny triage and reproduction workflows for an explicitly selected automation runner, repository, and Slack channel.
---

# Set up Benny

Read the copied pack's `../../FOR_AGENTS.md`. These are direct runner instructions, not registered plugin skills. Preparing this pack does not create or enable a live service.

## Install the source and shared skills

Resolve the target repository from the request. Copy or merge the pack into `.agents/automations/benny/` there. Preserve destination-only files, review conflicts, and keep user-owned configuration outside the copied pack. Use `.agents/benny/` for secret-free project configuration or a user configuration directory when the runner can access it.

Ensure xstack's shared skills are available in the runner's actual checkout and account. Use the supported Claude Code or Codex plugin installation, or project-local skills under the host's skill directory. Never assume a personal plugin cache is available to a remote runner. Verify `how`, `why`, `tdd`, `unslop`, and the required principles in a fresh runner session. If a dependency cannot load, leave the workflows disabled and report what is missing.

Commit the copied pack and any referenced secret-free configuration on the runner's branch when authorized. Otherwise prepare the diff and explain that the runner needs those files before activation. Live prompts use committed repository-relative paths, never a temporary plugin cache path.

## Complete configuration

Copy `../../templates/configuration.example.yaml` and the reproduction skill's feature-map example outside the pack. Fill the source Slack channel, optional operations channel, repository, default branch, trusted triage identity, tracker, control adapter, feature map, routing, model roles, and time and retry budgets. Preserve existing values on reruns.

Choose an actual automation runner with a supported Slack event trigger, or a receiver and scheduler the user wants built. Claude Code and Codex sessions are not automatically persistent Slack listeners. Record how the runner starts an agent, supplies the triggering event, injects credentials, checks out the repository, and stores deduplication state. If only manual execution is available, label the workflow manual. Do not claim automated delivery.

Require explicit source channel, triage identity, repository, tracker adapter, control adapter, and feature map. Choose only models and efforts available to the runner. Keep credentials in its secret manager or server-side environment. Never store tokens in YAML, prompts, or worker briefs.

## Verify capabilities

The triage runner needs Slack thread reads, thread replies, attachment access when needed, and tracker search, read, create, and update capabilities. The reproduction runner needs source-thread reads and replies, repository and history access, draft PR creation, and the configured control adapter. Operations-channel posting is optional and must be separately configured.

Use documented connectors or APIs. Give delegated workers no Slack write tools or credentials. External posting requires explicit authorization for the configured channels and workflow; installation alone does not grant it.

Read the control-adapter reference and the completed feature map. Verify launch, navigation, input, read-only state inspection, screenshots, video recording, and cleanup. If a required capability is unavailable, keep reproduction disabled. Configure routing only from known destinations and owners; leave pings off by default.

## Prepare two runner jobs

First inspect the selected runner for existing jobs with these identities. Update those jobs when requested instead of creating duplicates. Use its documented management interface. If no management API is available, produce complete job definitions for the operator's runner.

- `benny-triage` receives a new top-level report in the configured source channel. It reads `.agents/automations/benny/skills/triage-issue-reports/SKILL.md`, preserves source coordinates, deduplicates tracker issues, and posts one thread verdict with the configured marker.
- `benny-reproduce` receives the same report or a supported follow-up trigger. It reads `.agents/automations/benny/skills/reproduce-and-fix-issues/SKILL.md`, waits for a marker from the trusted triage identity, respects existing fix ownership, and reproduces twice before attempting a bounded fix. It opens only a draft PR after before-and-after proof passes.

Adapt the two prompt templates to the runner's event envelope. Record event IDs durably so redelivery does not duplicate replies, issues, or PRs. Keep the immutable source channel and root thread timestamp in run state. Do not use a user-authored marker as authority to run a fix.

Keep jobs disabled until their definitions, available integrations, committed paths, and tests are verified. Activate only when the user has authorized live operation. No merge or deployment is part of Benny.

## Test before activation

Use an authorized test channel or a local fake Slack and tracker adapter. A local test is preparation and does not prove the real credentials work. Check all of these with the actual runner before claiming live readiness:

1. Triage replies once inside the original root thread with one marker.
2. Reproduction accepts a marker only from the configured triage identity.
3. Both jobs retain identical source coordinates after retries and wakeups.
4. No source-channel root post occurs.
5. Workers cannot post or receive Slack credentials.
6. Missing coordinates, a deleted root message, or failed preflight produces no reply and no tracker issue.
7. Event redelivery produces no duplicate reply, issue, or PR.
8. Reproduction respects an existing owner or verifies an existing fix instead of competing with it.

Return the runner, job identities, configuration and source paths, verification results, and activation state. Distinguish prepared definitions, mock-tested jobs, and verified live jobs.
