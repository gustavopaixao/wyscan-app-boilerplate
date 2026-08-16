import { Redis } from "ioredis";
import { MongoClient } from "mongodb";
import type { InfraStatus } from "../v1/shared/infraStatus.js";

export type InfraEnv = {
  MONGODB_URL?: string;
  REDIS_URL?: string;
};

export async function checkMongo(
  env: InfraEnv,
): Promise<{ ok: boolean; error?: string }> {
  if (!env.MONGODB_URL) return { ok: true };
  let client: MongoClient | undefined;
  try {
    client = new MongoClient(env.MONGODB_URL, {
      serverSelectionTimeoutMS: 3_000,
    });
    await client.connect();
    await client.db().command({ ping: 1 });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    await client?.close();
  }
}

export async function checkRedis(
  env: InfraEnv,
): Promise<{ ok: boolean; error?: string }> {
  if (!env.REDIS_URL) return { ok: true };
  const redis = new Redis(env.REDIS_URL, {
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

export function mapMongoHealthToStatus(mongo: {
  ok: boolean;
  skipped?: boolean;
}): InfraStatus {
  if (mongo.skipped) return "skipped";
  return mongo.ok ? "ok" : "down";
}

export function mapRedisHealthToStatus(redis: {
  ok: boolean;
  skipped?: boolean;
}): InfraStatus {
  if (redis.skipped) return "skipped";
  return redis.ok ? "ok" : "down";
}
