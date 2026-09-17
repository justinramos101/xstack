# Benny

Benny provides two portable automation workflows for Slack issue reports. One triages and deduplicates reports. The other reproduces confirmed bugs and may prepare a bounded draft fix.

Point your agent at [FOR_AGENTS.md](FOR_AGENTS.md) with the target repository and the intended runner. [Setup](skills/setup-benny/SKILL.md) merges the pack into `.agents/automations/benny/`, keeps your configuration outside that directory, verifies tools, and prepares two jobs. The jobs read the operational skills directly. Those skills are not registered plugin skills.

Live automation requires a runner with event delivery, durable state, scoped Slack credentials, and access to the repository. Claude Code or Codex can execute the instructions, but installing these files does not create an event service. Keep the jobs disabled until you authorize live operation and the thread-safety and duplicate-delivery checks pass.
