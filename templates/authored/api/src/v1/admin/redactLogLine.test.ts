import { describe, expect, it } from "vitest";
import { redactLogLine } from "./redactLogLine.js";

/**
 * Log lines go straight to a browser, so anything credential-shaped has to be
 * gone before the response is built. These are the shapes that actually turn up
 * in this project's own logs.
 */
describe("redactLogLine", () => {
  it("removes a JWT, which is what an access token looks like in a log", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxMjMifQ.s0m3-S1gnatur3_x";
    const out = redactLogLine(`verified token ${jwt} for user 123`);
    expect(out).not.toContain(jwt);
    expect(out).toContain("[redacted-jwt]");
    // The surrounding message is what makes the line useful; keep it.
    expect(out).toContain("for user 123");
  });

  it("takes the whole Authorization value, not just its Bearer form", () => {
    // `Basic dXNlcjpwdw==` is a credential too, so the scheme is dropped with it.
    const bearer = redactLogLine("Authorization: Bearer abcdef1234567890xyz");
    expect(bearer).toBe("Authorization: [redacted]");

    const basic = redactLogLine("authorization: Basic dXNlcjpwYXNzd29yZA==");
    expect(basic).not.toContain("dXNlcjpwYXNzd29yZA");
  });

  it("redacts a bare bearer token outside a header", () => {
    const out = redactLogLine("retrying with Bearer abcdef1234567890xyz now");
    expect(out).toBe("retrying with Bearer [redacted] now");
  });

  it("removes the password from a connection string but keeps the host", () => {
    const out = redactLogLine("mongodb://appuser:sup3rs3cret@mongo:27017/db");
    expect(out).not.toContain("sup3rs3cret");
    expect(out).toContain("appuser");
    expect(out).toContain("mongo:27017/db");
  });

  it("redacts by key name, whatever the value looks like", () => {
    for (const line of [
      "JWT_SECRET=hunter2hunter2",
      "api_key: 'abc123def456'",
      'password="p@ssw0rd"',
      "LOG_AGENT_SECRET = dev-log-agent-secret-min-16",
    ]) {
      expect(redactLogLine(line)).not.toMatch(
        /hunter2|abc123def456|p@ssw0rd|dev-log-agent-secret/,
      );
      expect(redactLogLine(line)).toContain("[redacted]");
    }
  });

  it("leaves an ordinary line untouched", () => {
    const line = "[INFO] server listening on :3000";
    expect(redactLogLine(line)).toBe(line);
  });

  it("does not redact a word merely because it contains a key name", () => {
    // "tokens" here is a count, not a credential.
    const line = "[INFO] pruned 4 tokens for user 123";
    expect(redactLogLine(line)).toBe(line);
  });
});
