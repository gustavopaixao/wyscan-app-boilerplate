/**
 * __PROJECT_NAME__ realtime service — Socket.IO on a dedicated port (default 3001).
 * Subscribes to Redis pub/sub and emits to authenticated user rooms.
 *
 * Boilerplate (feature 0001): no product room plugins are registered yet.
 * Feature plugins register via `registerPlugin` (see reference implementation)
 * before `initWebSocket`.
 */
import { verifyAccessToken } from "__NPM_SCOPE__/auth-api/utils/jwt";
import { initWebSocket } from "__NPM_SCOPE__/core-api/services/websocket";
import { logger } from "__NPM_SCOPE__/core-api/utils/logger";
import { createAdapter } from "@socket.io/redis-adapter";
import "dotenv/config";
import { createServer } from "node:http";
import { Redis } from "ioredis";
import mongoose from "mongoose";

const port = Number(process.env.REALTIME_PORT ?? 3001);
const redisUrl = process.env.REDIS_URL?.trim();

if (!redisUrl) {
  console.error("REDIS_URL is required for the realtime service");
  process.exit(1);
}

const redisConnectionUrl: string = redisUrl;

/** Redis channel the API publishes realtime emit envelopes on. */
export function realtimeEmitChannel(): string {
  // biome-ignore format: width depends on the generated project name
  return (
    process.env.REALTIME_EMIT_CHANNEL?.trim() || "__PROJECT_SLUG__:realtime:emit"
  );
}

type RealtimeEmitMessage = {
  event: string;
  emit_rooms: string[];
  target_user_ids: string[];
  envelope: Record<string, unknown>;
};

function parseRealtimeEmitMessage(raw: unknown): RealtimeEmitMessage | null {
  if (typeof raw !== "object" || raw === null) return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.event !== "string" || value.event === "") return null;
  const rooms = Array.isArray(value.emit_rooms)
    ? value.emit_rooms.filter((r): r is string => typeof r === "string")
    : [];
  const userIds = Array.isArray(value.target_user_ids)
    ? value.target_user_ids.filter((u): u is string => typeof u === "string")
    : [];
  const envelope =
    typeof value.envelope === "object" && value.envelope !== null
      ? (value.envelope as Record<string, unknown>)
      : {};
  return {
    event: value.event,
    emit_rooms: rooms,
    target_user_ids: userIds,
    envelope,
  };
}

async function checkRedis(): Promise<{ ok: boolean; error?: string }> {
  const redis = new Redis(redisConnectionUrl, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    connectTimeout: 3_000,
  });
  try {
    await redis.connect();
    const pong = await redis.ping();
    return { ok: pong === "PONG" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    redis.disconnect();
  }
}

const httpServer = createServer(async (req, res) => {
  if (req.url === "/health" && req.method === "GET") {
    const redis = await checkRedis();
    const ok = redis.ok;
    res.writeHead(ok ? 200 : 503, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok,
        service: "__PROJECT_SLUG__-realtime",
        redis,
      }),
    );
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = initWebSocket(httpServer, {
  verifyToken: verifyAccessToken,
});

const adapterPub = new Redis(redisConnectionUrl);
const adapterSub = adapterPub.duplicate();
io.adapter(createAdapter(adapterPub, adapterSub));

io.on("connection", (socket) => {
  const userId = (
    socket.data as { user?: { userId?: { toString(): string } } }
  ).user?.userId?.toString();
  logger.info("ws_connect", {
    socket_id: socket.id,
    user_id: userId ?? null,
  });
  socket.on("disconnect", (reason) => {
    logger.info("ws_disconnect", {
      socket_id: socket.id,
      user_id: userId ?? null,
      reason,
    });
  });
});

const emitSubscriber = new Redis(redisConnectionUrl);
const channel = realtimeEmitChannel();

emitSubscriber.on("message", (_ch, raw) => {
  try {
    const parsed = parseRealtimeEmitMessage(JSON.parse(raw));
    if (!parsed) return;
    for (const room of parsed.emit_rooms) {
      io.to(room).emit(parsed.event, parsed.envelope);
    }
    for (const userId of parsed.target_user_ids) {
      io.to(`user:${userId}`).emit(parsed.event, parsed.envelope);
    }
    logger.info("ws_emit", {
      event: parsed.event,
      target_user_count: parsed.target_user_ids.length,
      room_count: parsed.emit_rooms.length,
    });
  } catch (error) {
    logger.error("ws_emit_parse_failed", {
      reason_code: error instanceof Error ? error.message : "unknown",
    });
  }
});

void emitSubscriber.subscribe(channel).then(() => {
  logger.info("realtime_subscriber_ready", { channel });
});

async function start(): Promise<void> {
  const mongoUrl = process.env.MONGODB_URL?.trim();
  if (mongoUrl) {
    await mongoose.connect(mongoUrl);
  }

  httpServer.listen(port, "0.0.0.0", () => {
    // biome-ignore format: width depends on the generated project name
    console.log(`__PROJECT_NAME__ realtime listening on http://0.0.0.0:${port}`);
  });
}

void start();
