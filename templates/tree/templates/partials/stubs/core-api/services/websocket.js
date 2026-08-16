// STUB — replace with __NPM_SCOPE__/core-api when you adopt the shared packages.
// Wraps socket.io directly. The shared package adds auth plumbing, room
// conventions and instrumentation on top of the same surface.

import { Server } from "socket.io";

/**
 * @param {import("node:http").Server} httpServer
 * @param {{ verifyToken?: (token: string) => unknown | Promise<unknown> }} [options]
 */
export function initWebSocket(httpServer, options = {}) {
  const io = new Server(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN?.split(",") ?? "*" },
  });

  const { verifyToken } = options;
  if (verifyToken) {
    io.use(async (socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ??
          socket.handshake.headers.authorization?.replace(/^Bearer /, "");
        if (!token) return next(new Error("unauthorized"));
        socket.data.user = await verifyToken(token);
        next();
      } catch {
        next(new Error("unauthorized"));
      }
    });
  }

  return io;
}
