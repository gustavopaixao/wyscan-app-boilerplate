import { describe, expect, it } from "vitest";
import { mapWithConcurrency } from "./mapWithConcurrency.js";

describe("mapWithConcurrency", () => {
  it("returns empty array for empty input", async () => {
    await expect(mapWithConcurrency([], 5, async () => 1)).resolves.toEqual([]);
  });

  it("preserves result order regardless of completion order", async () => {
    const items = [30, 10, 20];
    const results = await mapWithConcurrency(items, 2, async (delayMs) => {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return delayMs;
    });
    expect(results).toEqual([30, 10, 20]);
  });

  it("respects concurrency limit", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const items = Array.from({ length: 8 }, (_, i) => i);

    await mapWithConcurrency(items, 3, async (value) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return value * 2;
    });

    expect(maxInFlight).toBeLessThanOrEqual(3);
  });
});
