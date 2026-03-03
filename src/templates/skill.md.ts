import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const SKILL_CONTENT = `---
name: anthropic-credit-monitor
description: Monitor Anthropic API credit balance and health. Use when you need to check if the Anthropic API is working or if credits have run out.
---

# Anthropic Credit Monitor

Monitors Anthropic API health by making a minimal API call (~$0.000003/check). Alerts via notify and logs to eventlog on failures.

## CLI commands

- \`anthropic-credit-monitor check\` — run a credit/health check, notify on failure
- \`anthropic-credit-monitor status\` — show recent check results from eventlog

## How it works

The \`check\` command:
1. Retrieves the API key from \`vault get anthropic-api-key\`
2. Makes a minimal API call (claude-haiku-4-5, max_tokens:1, prompt: "hi")
3. On success: logs healthy event to eventlog, exits 0
4. On billing/auth error: sends critical notification via notify, logs alert to eventlog, exits 1
5. On transient error (rate limit, network): sends high-priority notification, exits 1

## Automated monitoring

A heartbeat task runs \`anthropic-credit-monitor check\` every 4 hours. Check results appear in command-center STATUS.md automatically via eventlog.
`;

export function installSkill(): void {
  const skillDir = join(homedir(), ".claude", "skills", "anthropic-credit-monitor");
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, "SKILL.md"), SKILL_CONTENT, "utf-8");
}
