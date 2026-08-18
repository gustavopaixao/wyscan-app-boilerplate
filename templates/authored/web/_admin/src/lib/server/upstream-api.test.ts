import { describe, expect, it } from "vitest";
import { readMeUser } from "./upstream-api";

/**
 * `GET /api/v1/me` comes back in two shapes depending on which auth-api the
 * project was generated against: the shared package returns the user at the top
 * level, the standalone stub nests it under `user`.
 *
 * Reading only one of them is not a cosmetic bug — the role comes back
 * `undefined`, which is indistinguishable from "not an admin", so the session
 * route 403s and clears the cookies. The symptom is being signed out
 * immediately after a successful sign-in.
 */
describe("readMeUser", () => {
  const user = { id: "1", email: "root@example.test", role: "admin" };

  it("reads the nested shape the standalone stub returns", () => {
    expect(readMeUser({ user })).toEqual(user);
  });

  it("reads the flat shape the shared package returns", () => {
    expect(readMeUser(user)).toEqual(user);
  });

  it("keeps the role readable in both shapes", () => {
    // The actual thing that broke: role resolving to undefined reads as
    // "not an admin" and signs the user out.
    expect(readMeUser({ user })?.role).toBe("admin");
    expect(readMeUser(user)?.role).toBe("admin");
  });

  it("does not mistake an error payload for a user", () => {
    // Without the `id` check these would come back as roleless "users", turning
    // a failed call into a silent sign-out instead of a visible error.
    expect(readMeUser({ message: "Unauthorized" })).toBeNull();
    expect(readMeUser({ error: "boom" })).toBeNull();
  });

  it("handles an absent or non-object body", () => {
    expect(readMeUser(null)).toBeNull();
    expect(readMeUser(undefined)).toBeNull();
    expect(readMeUser("nope")).toBeNull();
  });
});
