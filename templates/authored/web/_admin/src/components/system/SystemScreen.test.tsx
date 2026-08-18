import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SystemOverview } from "@/lib/system/systemQuery";
import { SystemScreen } from "./SystemScreen";

vi.mock("@/hooks/useAuth", () => ({
  useCurrentAdmin: () => ({
    id: "1",
    email: "root@example.com",
    displayName: "Root",
    role: "admin" as const,
  }),
}));

const overview: SystemOverview = {
  api: { version: "v1", environment: "development", uptimeSeconds: 8_040 },
  infrastructure: [
    { key: "mongodb", status: "ok" },
    { key: "redis", status: "down" },
    { key: "logAgent", status: "skipped" },
  ],
  integrations: [
    { key: "mailer", configured: false },
    { key: "googleOauth", configured: true },
  ],
};

function mount(data: SystemOverview) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => data,
    }),
  );

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return render(<SystemScreen />, { wrapper });
}

afterEach(() => {
  // This project's vitest.setup.ts only loads jest-dom, so testing-library's
  // auto-cleanup is not registered and a second render stacks on the first.
  cleanup();
  vi.unstubAllGlobals();
});

/**
 * The page is client-rendered, so a crash here would never show up in a
 * server-side smoke test — the route would still answer 200 with a loading
 * state and then blank out in the browser.
 */
describe("SystemScreen", () => {
  it("renders every section once the overview loads", async () => {
    mount(overview);

    expect(await screen.findByText("Infrastructure")).toBeInTheDocument();
    expect(screen.getByText("Integrations")).toBeInTheDocument();
    // Keys are mapped to human labels via the strings table.
    expect(screen.getByText("MongoDB")).toBeInTheDocument();
    expect(screen.getByText("Log agent")).toBeInTheDocument();
    expect(screen.getByText("Google sign-in")).toBeInTheDocument();
    expect(screen.getByText("2h 14m")).toBeInTheDocument();
  });

  it("warns when something configured is down", async () => {
    mount(overview);
    expect(
      await screen.findByText(
        "Something this project depends on is not responding.",
      ),
    ).toBeInTheDocument();
  });

  it("does not warn about a service that is merely unconfigured", async () => {
    // A fresh project with no Redis is expected, not degraded.
    mount({
      ...overview,
      infrastructure: [
        { key: "mongodb", status: "ok" },
        { key: "redis", status: "skipped" },
      ],
    });
    expect(await screen.findByText("MongoDB")).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Something this project depends on is not responding.",
      ),
    ).not.toBeInTheDocument();
  });

  it("labels a key the API adds later rather than crashing", async () => {
    mount({
      ...overview,
      infrastructure: [{ key: "somethingNew", status: "ok" }],
    });
    expect(await screen.findByText("somethingNew")).toBeInTheDocument();
  });
});
