import { describe, expect, it } from "vitest";
import { AdminApiError } from "@/lib/api/admin-client";
import { toLogsMessage } from "./LogsScreen";

/**
 * Every reason this page fails is something the operator can fix, so each code
 * has to reach its own instruction. A generic "something went wrong" here would
 * make the feature undebuggable.
 */
describe("toLogsMessage", () => {
  it("tells the operator to switch the viewer on", () => {
    expect(toLogsMessage(new AdminApiError("", 404, "NOT_FOUND"))).toContain(
      "LOG_VIEWER_ENABLED=true",
    );
    // The disabled path answers 404 without a code of its own.
    expect(toLogsMessage(new AdminApiError("", 404))).toContain(
      "LOG_VIEWER_ENABLED=true",
    );
  });

  it("distinguishes a dead agent from a denied socket, though both are 503", () => {
    const agent = toLogsMessage(
      new AdminApiError("", 503, "LOG_AGENT_UNAVAILABLE"),
    );
    const socket = toLogsMessage(
      new AdminApiError("", 503, "DOCKER_SOCKET_DENIED"),
    );
    expect(agent).toContain("log-agent container");
    expect(socket).toContain("docker.sock");
    expect(agent).not.toBe(socket);
  });

  it("explains a stopped container", () => {
    expect(
      toLogsMessage(new AdminApiError("", 503, "SERVICE_NOT_CONTAINERIZED")),
    ).toContain("not running");
  });

  it("falls back for anything unrecognised", () => {
    expect(toLogsMessage(new Error("boom"))).toBe(
      "Could not load logs. Please try again.",
    );
  });
});
