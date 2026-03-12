import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CheckResult } from "../src/checker.js";

vi.mock("node:child_process", () => ({
  execSync: vi.fn(() => ""),
}));

// Import after mock is set up
const { execSync } = await import("node:child_process");
const { emitEvent, sendNotification, queryRecentEvents } = await import("../src/checker.js");

const mockedExecSync = vi.mocked(execSync);

beforeEach(() => {
  mockedExecSync.mockReset();
  mockedExecSync.mockReturnValue("");
});

function makeResult(status: CheckResult["status"], message = "test message"): CheckResult {
  return {
    status,
    message,
    timestamp: "2026-03-12T00:00:00.000Z",
    durationMs: 42,
  };
}

describe("emitEvent", () => {
  it("emits a check event with low priority for healthy status", () => {
    emitEvent(makeResult("healthy"));

    const cmd = mockedExecSync.mock.calls[0]?.[0] as string;
    expect(cmd).toContain("anthropic-credit-monitor.check");
    expect(cmd).toContain("--priority low");
    expect(cmd).toContain("--source anthropic-credit-monitor");
  });

  it("emits an alert event with critical priority for billing_error", () => {
    emitEvent(makeResult("billing_error"));

    const cmd = mockedExecSync.mock.calls[0]?.[0] as string;
    expect(cmd).toContain("anthropic-credit-monitor.alert");
    expect(cmd).toContain("--priority critical");
  });

  it("emits an alert event with critical priority for auth_error", () => {
    emitEvent(makeResult("auth_error"));

    const cmd = mockedExecSync.mock.calls[0]?.[0] as string;
    expect(cmd).toContain("anthropic-credit-monitor.alert");
    expect(cmd).toContain("--priority critical");
  });

  it("emits an alert event with high priority for transient_error", () => {
    emitEvent(makeResult("transient_error"));

    const cmd = mockedExecSync.mock.calls[0]?.[0] as string;
    expect(cmd).toContain("anthropic-credit-monitor.alert");
    expect(cmd).toContain("--priority high");
  });

  it("includes status, message, and durationMs in the data payload", () => {
    emitEvent(makeResult("healthy", "API responding normally"));

    const cmd = mockedExecSync.mock.calls[0]?.[0] as string;
    // The data is JSON-stringified inline in the command
    expect(cmd).toContain('"status":"healthy"');
    expect(cmd).toContain('"message":"API responding normally"');
    expect(cmd).toContain('"durationMs":42');
  });

  it("calls eventlog emit with the correct base command", () => {
    emitEvent(makeResult("healthy"));

    const cmd = mockedExecSync.mock.calls[0]?.[0] as string;
    expect(cmd).toMatch(/^eventlog emit "/);
  });
});

describe("sendNotification", () => {
  it("sends with critical priority for billing_error", () => {
    sendNotification(makeResult("billing_error"));

    const cmd = mockedExecSync.mock.calls[0]?.[0] as string;
    expect(cmd).toContain("--priority critical");
    expect(cmd).toContain('--title "Anthropic Credit Monitor"');
  });

  it("sends with critical priority for auth_error", () => {
    sendNotification(makeResult("auth_error"));

    const cmd = mockedExecSync.mock.calls[0]?.[0] as string;
    expect(cmd).toContain("--priority critical");
  });

  it("sends with high priority for transient_error", () => {
    sendNotification(makeResult("transient_error"));

    const cmd = mockedExecSync.mock.calls[0]?.[0] as string;
    expect(cmd).toContain("--priority high");
  });

  it("includes the status and message in the notification body", () => {
    sendNotification(makeResult("billing_error", "Out of credits"));

    const cmd = mockedExecSync.mock.calls[0]?.[0] as string;
    expect(cmd).toContain("billing_error");
    expect(cmd).toContain("Out of credits");
  });

  it("calls notify send with the correct base command", () => {
    sendNotification(makeResult("auth_error"));

    const cmd = mockedExecSync.mock.calls[0]?.[0] as string;
    expect(cmd).toMatch(/^notify send "/);
  });
});

describe("queryRecentEvents", () => {
  it("returns trimmed output from eventlog query", () => {
    mockedExecSync.mockReturnValue("  event1\n  event2\n");

    const result = queryRecentEvents();
    expect(result).toBe("event1\n  event2");
  });

  it("calls eventlog query with correct flags", () => {
    queryRecentEvents();

    const cmd = mockedExecSync.mock.calls[0]?.[0] as string;
    expect(cmd).toContain("eventlog query");
    expect(cmd).toContain("--source anthropic-credit-monitor");
    expect(cmd).toContain("--limit 5");
  });

  it("returns fallback message when eventlog throws", () => {
    mockedExecSync.mockImplementation(() => {
      throw new Error("command not found");
    });

    const result = queryRecentEvents();
    expect(result).toBe("No events found.");
  });
});
