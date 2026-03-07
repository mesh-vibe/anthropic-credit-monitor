import { execSync } from "node:child_process";
import Anthropic from "@anthropic-ai/sdk";

export interface CheckResult {
  status: "healthy" | "billing_error" | "auth_error" | "transient_error";
  message: string;
  timestamp: string;
  durationMs: number;
}

function getApiKey(): string {
  try {
    return execSync("vault get anthropic-api-key", {
      encoding: "utf-8",
      timeout: 10_000,
    }).trim();
  } catch {
    throw new Error("Failed to retrieve API key from vault. Run: vault set anthropic-api-key <key>");
  }
}

export async function checkCredits(): Promise<CheckResult> {
  const apiKey = getApiKey();
  const client = new Anthropic({ apiKey });
  const start = Date.now();

  try {
    await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1,
      messages: [{ role: "user", content: "hi" }],
    });

    return {
      status: "healthy",
      message: "API responding normally",
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - start,
    };
  } catch (err: unknown) {
    const duration = Date.now() - start;
    const timestamp = new Date().toISOString();

    if (err instanceof Anthropic.AuthenticationError) {
      return {
        status: "auth_error",
        message: `Authentication failed: ${err.message}`,
        timestamp,
        durationMs: duration,
      };
    }

    if (err instanceof Anthropic.PermissionDeniedError) {
      return {
        status: "billing_error",
        message: `Permission denied (likely out of credits): ${err.message}`,
        timestamp,
        durationMs: duration,
      };
    }

    if (
      err instanceof Anthropic.RateLimitError ||
      err instanceof Anthropic.InternalServerError ||
      err instanceof Anthropic.APIConnectionError
    ) {
      return {
        status: "transient_error",
        message: `Transient error: ${err.message}`,
        timestamp,
        durationMs: duration,
      };
    }

    if (err instanceof Anthropic.BadRequestError && /credit|billing|budget/i.test(err.message)) {
      return {
        status: "billing_error",
        message: `Billing error: ${err.message}`,
        timestamp,
        durationMs: duration,
      };
    }

    return {
      status: "transient_error",
      message: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
      timestamp,
      durationMs: duration,
    };
  }
}

export function emitEvent(result: CheckResult): void {
  const event = result.status === "healthy"
    ? "anthropic-credit-monitor.check"
    : "anthropic-credit-monitor.alert";

  const priority = result.status === "healthy"
    ? "low"
    : result.status === "billing_error" || result.status === "auth_error"
      ? "critical"
      : "high";

  const data = JSON.stringify({
    status: result.status,
    message: result.message,
    durationMs: result.durationMs,
  });

  execSync(
    `eventlog emit "${event}" --source anthropic-credit-monitor --priority ${priority} --data '${data}'`,
    { encoding: "utf-8", timeout: 10_000 }
  );
}

export function sendNotification(result: CheckResult): void {
  const priority = result.status === "billing_error" || result.status === "auth_error"
    ? "critical"
    : "high";

  const message = `Anthropic API ${result.status}: ${result.message}`;

  execSync(
    `notify send "${message}" --title "Anthropic Credit Monitor" --priority ${priority}`,
    { encoding: "utf-8", timeout: 10_000 }
  );
}

export function queryRecentEvents(): string {
  try {
    return execSync(
      "eventlog query --source anthropic-credit-monitor --limit 5",
      { encoding: "utf-8", timeout: 10_000 }
    ).trim();
  } catch {
    return "No events found.";
  }
}
