import { describe, expect, it } from "vitest";
import { AppError, apiError, throwApiError } from "./apiError.js";

describe("apiError", () => {
  it("returns a response with the stable code, message, and default status", async () => {
    const res = apiError("INVALID_ID", "Invalid league id");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string; message: string };
    expect(body.code).toBe("INVALID_ID");
    expect(body.message).toBe("Invalid league id");
  });

  it("uses the code's default status per code", async () => {
    expect(apiError("NOT_FOUND", "League not found").status).toBe(404);
    expect(apiError("ACCOUNT_DELETION_FORBIDDEN", "nope").status).toBe(403);
    expect(apiError("CONFLICT", "exists").status).toBe(409);
  });

  it("allows an explicit status override", () => {
    expect(apiError("VALIDATION_ERROR", "bad", 422).status).toBe(422);
  });
});

describe("throwApiError", () => {
  it("throws an AppError carrying the code and default status", () => {
    try {
      throwApiError("INVALID_ID", "Invalid pool id");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      const appError = error as AppError;
      expect(appError.code).toBe("INVALID_ID");
      expect(appError.statusCode).toBe(400);
      expect(appError.message).toBe("Invalid pool id");
    }
  });
});
