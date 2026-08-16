/**
 * Log-agent sidecar — placeholder (feature 0001).
 *
 * The real agent (reference implementation) streams container logs over the Docker
 * socket via dockerode, guarded by LOG_AGENT_SECRET. This stub only exposes a
 * health endpoint so `pnpm job:log-agent` boots.
 */
import "dotenv/config";
import { createServer } from "node:http";

const port = Number(process.env.LOG_AGENT_PORT ?? 3090);
const secret = process.env.LOG_AGENT_SECRET?.trim();

if (!secret || secret.length < 16) {
  console.error("LOG_AGENT_SECRET (min 16 chars) is required");
  process.exit(1);
}

const server = createServer((req, res) => {
  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "__PROJECT_SLUG__-log-agent" }));
    return;
  }
  res.writeHead(404);
  res.end();
});

server.listen(port, "0.0.0.0", () => {
  console.log(`__PROJECT_NAME__ log agent listening on http://0.0.0.0:${port}`);
});
