import { describe, expect, it } from "vitest";
import {
  buildLogsQuery,
  DEFAULT_TAIL,
  EMPTY_LOGS_FILTER,
  formatLogTime,
  TAIL_SIZES,
} from "./logsQuery";

/** Pins the contract with `api/src/v1/admin/logs.ts`. */
describe("buildLogsQuery", () => {
  it("omits the service until one is known, letting the server choose", () => {
    expect(buildLogsQuery(EMPTY_LOGS_FILTER)).toBe(`tail=${DEFAULT_TAIL}`);
  });

  it("sends both once a service is selected", () => {
    const params = new URLSearchParams(
      buildLogsQuery({ service: "realtime", tail: 500 }),
    );
    expect(params.get("service")).toBe("realtime");
    expect(params.get("tail")).toBe("500");
  });

  it("never offers a tail the API would clamp", () => {
    for (const size of TAIL_SIZES) expect(size).toBeLessThanOrEqual(1000);
  });
});

describe("formatLogTime", () => {
  it("renders clock time from Docker's nanosecond timestamp", () => {
    expect(formatLogTime("2026-08-18T18:40:27.123456789Z")).toMatch(
      /^\d{2}:\d{2}:\d{2}$/,
    );
  });

  it("renders nothing rather than Invalid Date", () => {
    expect(formatLogTime(undefined)).toBe("");
    expect(formatLogTime("not a date")).toBe("");
  });
});
