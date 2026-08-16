import { describe, expect, it } from "vitest";
import { z } from "zod";
import { formatZodIssues, formatZodMessage } from "./zod.js";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  age: z.number().min(18, "Must be at least 18"),
});

function errorFor(input: unknown): z.ZodError {
  const result = schema.safeParse(input);
  if (result.success) throw new Error("expected validation to fail");
  return result.error;
}

describe("formatZodMessage", () => {
  it("returns the first issue message", () => {
    const error = errorFor({ name: "", age: 10 });
    expect(formatZodMessage(error)).toBe("Name is required");
  });

  it("falls back to a generic message when there are no issues", () => {
    expect(formatZodMessage(new z.ZodError([]))).toBe("Invalid request");
  });
});

describe("formatZodIssues", () => {
  it("joins all issue messages with a separator", () => {
    const error = errorFor({ name: "", age: 10 });
    expect(formatZodIssues(error)).toBe(
      "Name is required; Must be at least 18",
    );
  });

  it("returns an empty string when there are no issues", () => {
    expect(formatZodIssues(new z.ZodError([]))).toBe("");
  });
});
