#!/usr/bin/env node

import { Command } from "commander";
import { checkCredits, emitEvent, sendNotification, queryRecentEvents } from "./checker.js";
import { installSkill } from "./templates/skill.md.js";

const program = new Command();

program
  .name("anthropic-credit-monitor")
  .description("Proactive Anthropic API credit and health monitor")
  .version("0.1.0");

program
  .command("check")
  .description("Run credit/health check, notify on failure")
  .action(async () => {
    try {
      const result = await checkCredits();

      emitEvent(result);

      if (result.status === "healthy") {
        console.log(`OK  ${result.message} (${result.durationMs}ms)`);
        process.exit(0);
      } else {
        sendNotification(result);
        console.error(`FAIL  ${result.status}: ${result.message} (${result.durationMs}ms)`);
        process.exit(1);
      }
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program
  .command("status")
  .description("Show recent check results from eventlog")
  .action(() => {
    const output = queryRecentEvents();
    console.log(output);
  });

program
  .command("init")
  .description("Install Claude Code skill to ~/.claude/skills/anthropic-credit-monitor/")
  .action(() => {
    try {
      installSkill();
      console.log("Installed skill to ~/.claude/skills/anthropic-credit-monitor/SKILL.md");
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

program.parse();
