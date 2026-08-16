/**
 * Shared Redis connection for short-lived caches (standings drift, etc.).
 */

import { Redis } from "ioredis";

let sharedRedis: Redis | null = null;

export function getSharedRedis(): Redis | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  if (!sharedRedis) {
    sharedRedis = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
  }
  return sharedRedis;
}
