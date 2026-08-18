/**
 * The log-agent sidecar's HTTP surface.
 *
 * `templates/tree/api/src/logAgent/server.ts` is a placeholder: it boots, serves
 * `/health`, and says in its own header that the real agent "streams container
 * logs over the Docker socket via dockerode, guarded by LOG_AGENT_SECRET". The
 * compose stack already provisions everything that agent needs — the socket
 * mounted read-only, `LOG_AGENT_SECRET`, `LOG_CONTAINER_API`,
 * `LOG_CONTAINER_REALTIME`, and `LOG_AGENT_URL` handed to the API — so the only
 * missing piece was the endpoint. Without it the admin console's Logs page has
 * nothing to read.
 *
 * A full replacement rather than an injection, the same call as
 * `buildAdminDashboardPage()` and `buildMobileIndex()`: the file is a stub whose
 * entire job changes. The dockerode work lives in the authored
 * `api/src/logAgent/containerLogs.ts` so it is Biome-formatted and unit-tested
 * like any other source file; this module only emits the server around it.
 */

/**
 * Asserts the reference file is still the placeholder we mean to override.
 *
 * If a future `npm run sync` brings in a real agent, this throws instead of
 * silently discarding it — the same reason every other hook is anchored.
 */
export const LOG_AGENT_ANCHOR = "Log-agent sidecar — placeholder";

export function buildLogAgentServer(text, dest, cfg) {
  if (!text.includes(LOG_AGENT_ANCHOR)) {
    throw new Error(
      `log agent: anchor not found in ${dest}.\n` +
        `Expected to find:\n  ${LOG_AGENT_ANCHOR}\n` +
        `The reference now ships something other than the placeholder agent — ` +
        `reconcile it with buildLogAgentServer in src/generate/logAgent.mjs.`,
    );
  }

  return `/**
 * Log-agent sidecar.
 *
 * Runs beside the API with \`/var/run/docker.sock\` mounted read-only and reads
 * container logs for the admin console's Logs page. It is deliberately a
 * separate process: the API itself never gets the Docker socket, so a flaw in a
 * product route cannot reach the daemon.
 *
 * Every route but \`/health\` requires the shared secret, and the container name
 * is resolved from an allowlist built out of the environment — a caller cannot
 * name a container of its own.
 *
 * Not exposed to the internet: compose publishes no host port for this service,
 * so it is reachable only from the API over the compose network.
 */
import "dotenv/config";
import { createServer, type ServerResponse } from "node:http";
import {
  allowedContainers,
  ContainerLogReader,
  ContainerUnavailableError,
  DockerSocketError,
} from "./containerLogs.js";

const port = Number(process.env.LOG_AGENT_PORT ?? 3090);
const secret = process.env.LOG_AGENT_SECRET?.trim();

if (!secret || secret.length < 16) {
  console.error("LOG_AGENT_SECRET (min 16 chars) is required");
  process.exit(1);
}

/** Matches what the API sends; see \`api/src/v1/admin/logs.ts\`. */
const SECRET_HEADER = "x-log-agent-secret";

const DEFAULT_TAIL = 200;
const MAX_TAIL = 2000;

const reader = new ContainerLogReader();

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function clampTail(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(parsed)) return DEFAULT_TAIL;
  return Math.min(MAX_TAIL, Math.max(1, parsed));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", \`http://localhost:\${port}\`);

  // Unauthenticated on purpose: compose health-checks it, and it reveals nothing.
  if (url.pathname === "/health" && req.method === "GET") {
    send(res, 200, { ok: true, service: "${cfg.slug}-log-agent" });
    return;
  }

  // Constant-time comparison is not warranted: this secret never leaves the
  // compose network and the endpoint is not reachable from outside it.
  if (req.headers[SECRET_HEADER] !== secret) {
    send(res, 401, { code: "UNAUTHORIZED", message: "Bad or missing secret" });
    return;
  }

  if (url.pathname === "/internal/tail" && req.method === "GET") {
    const containers = allowedContainers();
    const services = Object.keys(containers);
    // The agent owns the allowlist, so it also decides the default. The API
    // does not get the LOG_CONTAINER_* variables and must not have to guess.
    const service = url.searchParams.get("service") || services[0] || "";
    const container = containers[service];

    if (!container) {
      send(res, 400, {
        code: "UNKNOWN_SERVICE",
        message: \`No container configured for "\${service}"\`,
        services,
      });
      return;
    }

    try {
      const lines = await reader.tail(
        container,
        clampTail(url.searchParams.get("tail")),
      );
      send(res, 200, { service, container, services, lines });
    } catch (error) {
      if (error instanceof DockerSocketError) {
        send(res, 503, {
          code: "DOCKER_SOCKET_DENIED",
          message: "The agent cannot read the Docker socket",
          services,
        });
        return;
      }
      if (error instanceof ContainerUnavailableError) {
        send(res, 503, {
          code: "SERVICE_NOT_CONTAINERIZED",
          message: error.message,
          services,
        });
        return;
      }
      console.error("log_agent_tail_failed", error);
      send(res, 500, {
        code: "INTERNAL_ERROR",
        message: "Could not read logs",
      });
    }
    return;
  }

  send(res, 404, { code: "NOT_FOUND", message: "No such route" });
});

server.listen(port, "0.0.0.0", () => {
  // biome-ignore format: width depends on the generated project name
  console.log(\`${cfg.displayName} log agent listening on http://0.0.0.0:\${port}\`);
});
`;
}
