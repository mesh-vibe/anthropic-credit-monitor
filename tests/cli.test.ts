import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const CLI_PATH = resolve(import.meta.dirname, "../dist/cli.js");

describe("CLI entry point", () => {
  it("exits 0 and shows help text with --help", () => {
    const output = execFileSync("node", [CLI_PATH, "--help"], {
      encoding: "utf-8",
      timeout: 10_000,
    });

    expect(output).toContain("anthropic-credit-monitor");
    expect(output).toContain("Proactive Anthropic API credit and health monitor");
    expect(output).toContain("check");
    expect(output).toContain("status");
    expect(output).toContain("init");
  });

  it("exits 0 and outputs version with --version", () => {
    const output = execFileSync("node", [CLI_PATH, "--version"], {
      encoding: "utf-8",
      timeout: 10_000,
    });

    expect(output.trim()).toBe("0.1.0");
  });
});
