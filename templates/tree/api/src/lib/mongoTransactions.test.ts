import mongoose from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  mongoSupportsTransactions,
  resetMongoTransactionsCacheForTests,
} from "./mongoTransactions.js";

describe("mongoSupportsTransactions", () => {
  beforeEach(() => {
    resetMongoTransactionsCacheForTests();
  });

  it("returns false when db is unavailable", async () => {
    const original = mongoose.connection.db;
    Object.defineProperty(mongoose.connection, "db", {
      configurable: true,
      get: () => undefined,
    });
    await expect(mongoSupportsTransactions()).resolves.toBe(false);
    Object.defineProperty(mongoose.connection, "db", {
      configurable: true,
      get: () => original,
    });
  });

  it("returns true for replica set hello response", async () => {
    Object.defineProperty(mongoose.connection, "db", {
      configurable: true,
      get: () => ({
        admin: () => ({
          command: vi.fn(async () => ({ setName: "rs0" })),
        }),
      }),
    });
    await expect(mongoSupportsTransactions()).resolves.toBe(true);
  });

  it("returns false for standalone hello response", async () => {
    Object.defineProperty(mongoose.connection, "db", {
      configurable: true,
      get: () => ({
        admin: () => ({
          command: vi.fn(async () => ({ ismaster: true })),
        }),
      }),
    });
    await expect(mongoSupportsTransactions()).resolves.toBe(false);
  });
});
