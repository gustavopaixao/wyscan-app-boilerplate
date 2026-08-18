import { describe, expect, it } from "vitest";
import {
  allowedContainers,
  demuxDockerLogs,
  isSocketPermissionError,
} from "./containerLogs.js";

/** Build one frame of Docker's multiplexed log stream. */
function frame(stream: "stdout" | "stderr", payload: string): Buffer {
  const body = Buffer.from(payload, "utf8");
  const header = Buffer.alloc(8);
  header[0] = stream === "stderr" ? 2 : 1;
  header.writeUInt32BE(body.length, 4);
  return Buffer.concat([header, body]);
}

describe("demuxDockerLogs", () => {
  it("strips the 8-byte frame headers", () => {
    const buffer = frame("stdout", "hello world\n");
    const [line] = demuxDockerLogs(buffer);
    // Read as plain text this would carry a stray control byte per line.
    expect(line.message).toBe("hello world");
    expect(line.stream).toBe("stdout");
  });

  it("separates stdout from stderr", () => {
    const lines = demuxDockerLogs(
      Buffer.concat([frame("stdout", "out\n"), frame("stderr", "err\n")]),
    );
    expect(lines.map((l) => [l.stream, l.message])).toEqual([
      ["stdout", "out"],
      ["stderr", "err"],
    ]);
  });

  it("pulls out Docker's timestamp", () => {
    const [line] = demuxDockerLogs(
      frame("stdout", "2026-08-18T18:40:27.123456789Z started\n"),
    );
    expect(line.timestamp).toBe("2026-08-18T18:40:27.123456789Z");
    expect(line.message).toBe("started");
  });

  it("rejoins a line split across two frames", () => {
    // A frame boundary is not a line boundary; splitting naively would emit
    // two half-lines here.
    const lines = demuxDockerLogs(
      Buffer.concat([
        frame("stdout", "first half "),
        frame("stdout", "second half\n"),
      ]),
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].message).toBe("first half second half");
  });

  it("keeps a trailing line that never got its newline", () => {
    const [line] = demuxDockerLogs(frame("stdout", "no newline here"));
    expect(line.message).toBe("no newline here");
  });

  it("stops at a truncated final frame rather than reading past the end", () => {
    const truncated = Buffer.concat([
      frame("stdout", "good\n"),
      frame("stdout", "cut off").subarray(0, 10),
    ]);
    expect(demuxDockerLogs(truncated).map((l) => l.message)).toEqual(["good"]);
  });

  it("drops blank lines", () => {
    expect(demuxDockerLogs(frame("stdout", "\n\n"))).toEqual([]);
  });
});

describe("allowedContainers", () => {
  it("offers only what the environment names", () => {
    expect(allowedContainers({ LOG_CONTAINER_API: "demo-api" })).toEqual({
      api: "demo-api",
    });
  });

  it("is empty when nothing is configured, so no container can be read", () => {
    expect(allowedContainers({})).toEqual({});
  });
});

describe("isSocketPermissionError", () => {
  it("recognises a denied Docker socket", () => {
    const error = Object.assign(new Error("connect EACCES"), {
      code: "EACCES",
    });
    expect(isSocketPermissionError(error)).toBe(true);
  });

  it("does not claim every error is a permission problem", () => {
    expect(isSocketPermissionError(new Error("container gone"))).toBe(false);
  });
});
