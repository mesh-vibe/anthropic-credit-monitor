---
name: anthropic-credit-monitor
description: Proactive Anthropic API credit and health monitor
cli: anthropic-credit-monitor
version: 0.1.0
health_check: anthropic-credit-monitor status
depends_on:
  - vault
  - notify
  - event-log
---

Monitors Anthropic API credit balance and health by making minimal API calls. Alerts via notify on failures and logs results to eventlog.
