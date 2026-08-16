import mongoose from "mongoose";

let cachedSupportsTransactions: boolean | null = null;

/**
 * MongoDB multi-document transactions require a replica set or mongos.
 * Local Docker Compose uses standalone — callers should skip sessions when false.
 */
export async function mongoSupportsTransactions(): Promise<boolean> {
  if (cachedSupportsTransactions !== null) {
    return cachedSupportsTransactions;
  }

  const db = mongoose.connection.db;
  if (!db) {
    cachedSupportsTransactions = false;
    return false;
  }

  try {
    const hello = await db.admin().command({ hello: 1 });
    cachedSupportsTransactions =
      typeof hello.setName === "string" && hello.setName.length > 0
        ? true
        : hello.msg === "isdbgrid";
  } catch {
    cachedSupportsTransactions = false;
  }

  return cachedSupportsTransactions;
}

/** Test helper */
export function resetMongoTransactionsCacheForTests(): void {
  cachedSupportsTransactions = null;
}
