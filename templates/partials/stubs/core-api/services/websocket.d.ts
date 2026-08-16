// STUB — replace with __NPM_SCOPE__/core-api when you adopt the shared packages.
import type { Server as HttpServer } from "node:http";
import type { Server } from "socket.io";

export declare function initWebSocket(
  httpServer: HttpServer,
  options?: { verifyToken?: (token: string) => unknown | Promise<unknown> },
): Server;
