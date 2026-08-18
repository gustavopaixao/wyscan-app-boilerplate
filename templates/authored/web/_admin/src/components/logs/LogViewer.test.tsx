import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { LogLine } from "@/lib/logs/logsQuery";
import { LogViewer } from "./LogViewer";

const line = (over: Partial<LogLine> = {}): LogLine => ({
  timestamp: "2026-08-18T18:40:27.123456789Z",
  stream: "stdout",
  message: "server listening on :3000",
  ...over,
});

// jest-dom is all this project's vitest.setup.ts loads, so testing-library's
// auto-cleanup is not registered and renders would stack.
afterEach(cleanup);

describe("LogViewer", () => {
  it("renders a line per entry with its clock time", () => {
    render(
      <LogViewer
        lines={[line(), line({ message: "boom", stream: "stderr" })]}
        isLoading={false}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("server listening on :3000")).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();
  });

  it("shows a loading state rather than an empty one on the first fetch", () => {
    render(<LogViewer lines={[]} isLoading />);
    expect(screen.getByText("Loading logs…")).toBeInTheDocument();
    expect(screen.queryByText("No log lines yet.")).not.toBeInTheDocument();
  });

  it("says so when the container has written nothing", () => {
    render(<LogViewer lines={[]} isLoading={false} />);
    expect(screen.getByText("No log lines yet.")).toBeInTheDocument();
  });

  it("survives a line with no timestamp", () => {
    render(
      <LogViewer lines={[line({ timestamp: undefined })]} isLoading={false} />,
    );
    expect(screen.getByText("server listening on :3000")).toBeInTheDocument();
  });
});
