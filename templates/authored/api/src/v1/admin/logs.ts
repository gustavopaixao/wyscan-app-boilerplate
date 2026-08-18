/**
 * Admin log viewer — `GET /api/v1/admin/logs`.
 *
 * The API has no access to the Docker socket and should not: it asks the
 * log-agent sidecar over the compose network, authenticating with the shared
 * `LOG_AGENT_SECRET`. Compose has always passed `LOG_AGENT_URL` and the secret
 * to this service; until now nothing read them.
 *
 * Off unless `LOG_VIEWER_ENABLED` is set, and 404 rather than 403 when off — a
 * deployment that has not opted in should not advertise the endpoint at all.
 */
import type { Hono } from "hono";
import { isAuthenticatedUser, requireAdminUser } from "../routeHelpers.js";
import { redactLogLine } from "./redactLogLine.js";

const DEFAULT_TAIL = 200;
const MAX_TAIL = 1000;

/** Fail fast: the console is waiting on this, and the agent is one hop away. */
const AGENT_TIMEOUT_MS = 5_000;

export type LogLine = {
  timestamp?: string;
  stream: "stdout" | "stderr";
  message: string;
};

export function isLogViewerEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return env.LOG_VIEWER_ENABLED === "true";
}

export function clampTail(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) return DEFAULT_TAIL;
  return Math.min(MAX_TAIL, Math.max(1, parsed));
}

type AgentResult =
  | {
      ok: true;
      lines: LogLine[];
      /** The service the agent actually resolved, which may be its default. */
      service: string;
      container: string;
      services: string[];
    }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
      services: string[];
    };

/** One call to the sidecar, with every failure turned into a reportable shape. */
export async function fetchAgentTail(
  service: string,
  tail: number,
  env: NodeJS.ProcessEnv = process.env,
): Promise<AgentResult> {
  const base = env.LOG_AGENT_URL;
  const secret = env.LOG_AGENT_SECRET;
  if (!base || !secret) {
    return {
      ok: false,
      status: 503,
      code: "LOG_AGENT_UNAVAILABLE",
      message: "The log agent is not configured.",
      services: [],
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${base}/internal/tail?service=${encodeURIComponent(service)}&tail=${tail}`,
      { headers: { "x-log-agent-secret": secret }, signal: controller.signal },
    );

    const body = (await response.json().catch(() => ({}))) as {
      lines?: LogLine[];
      service?: string;
      container?: string;
      services?: string[];
      code?: string;
      message?: string;
    };

    if (!response.ok) {
      return {
        ok: false,
        // The agent's own codes pass through: the operator needs to know
        // whether the socket is denied or the container is simply down.
        status: response.status === 400 ? 400 : 503,
        code: body.code ?? "LOG_AGENT_UNAVAILABLE",
        message: body.message ?? "The log agent refused the request.",
        services: body.services ?? [],
      };
    }

    return {
      ok: true,
      lines: body.lines ?? [],
      service: body.service ?? service,
      container: body.container ?? "",
      // The agent is the authority on which containers exist; the console
      // renders its picker from this rather than from a hard-coded list.
      services: body.services ?? [],
    };
  } catch {
    // Aborted or refused — either way the agent is not answering.
    return {
      ok: false,
      status: 503,
      code: "LOG_AGENT_UNAVAILABLE",
      message: "The log agent is not reachable.",
      services: [],
    };
  } finally {
    clearTimeout(timer);
  }
}

export function registerAdminLogRoutes(app: Hono): void {
  app.get("/api/v1/admin/logs", async (c) => {
    const admin = await requireAdminUser(c);
    if (!isAuthenticatedUser(admin)) return admin;

    if (!isLogViewerEnabled()) {
      return c.json(
        {
          code: "NOT_FOUND",
          message: "The log viewer is disabled. Set LOG_VIEWER_ENABLED=true.",
        },
        404,
      );
    }

    const params = new URL(c.req.url).searchParams;
    // Passed through unvalidated on purpose: only the agent knows which
    // containers this deployment has, and it answers UNKNOWN_SERVICE with the
    // list. An empty value asks it for its default.
    const service = params.get("service") ?? "";
    const result = await fetchAgentTail(service, clampTail(params.get("tail")));

    c.header("Cache-Control", "no-store");
    if (!result.ok) {
      return c.json(
        {
          code: result.code,
          message: result.message,
          services: result.services,
        },
        result.status as 400 | 503,
      );
    }

    return c.json({
      service: result.service,
      container: result.container,
      services: result.services,
      // Redacted here, not in the browser: a token that reaches the client has
      // already leaked, whether or not the UI chooses to display it.
      lines: result.lines.map((line) => ({
        ...line,
        message: redactLogLine(line.message),
      })),
    });
  });
}
