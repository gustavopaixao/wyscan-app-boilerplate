/**
 * 0038: real pushes must never fire from a non-production environment by
 * accident. With credentials present, initialization requires either
 * NODE_ENV=production or the explicit PUSH_SENDS_ENABLED opt-in.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loggerInfo = vi.fn();
const loggerError = vi.fn();
const initializeFirebase = vi.fn();
const isFirebaseInitialized = vi.fn(() => false);
const initializeApp = vi.fn();
const getApps = vi.fn(() => [] as unknown[]);

vi.mock("__NPM_SCOPE__/core-api/utils/logger", () => ({
  logger: {
    info: (...args: unknown[]) => loggerInfo(...args),
    error: (...args: unknown[]) => loggerError(...args),
  },
}));

vi.mock("__NPM_SCOPE__/notify-api/utils/push", () => ({
  initializeFirebase: (...args: unknown[]) => initializeFirebase(...args),
  isFirebaseInitialized: () => isFirebaseInitialized(),
}));

vi.mock("firebase-admin", () => ({ default: {} }));

vi.mock("firebase-admin/app", () => ({
  cert: vi.fn((account: unknown) => account),
  getApps: () => getApps(),
  initializeApp: (...args: unknown[]) => initializeApp(...args),
}));

const SERVICE_ACCOUNT = JSON.stringify({
  project_id: "__PROJECT_SLUG__-test",
  // biome-ignore format: width depends on the generated project name
  client_email: "svc@__PROJECT_SLUG__-test.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\\nfake\\n-----END PRIVATE KEY-----",
});

async function runInit(): Promise<void> {
  // `bootstrapped` is module state — a fresh import per test.
  vi.resetModules();
  const { initFirebaseAdminFromEnv } = await import("./firebaseAdmin.js");
  initFirebaseAdminFromEnv();
}

describe("initFirebaseAdminFromEnv", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isFirebaseInitialized.mockReturnValue(false);
    getApps.mockReturnValue([]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not initialize without credentials", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT_JSON", "");

    await runInit();

    expect(initializeApp).not.toHaveBeenCalled();
    expect(initializeFirebase).not.toHaveBeenCalled();
  });

  it("initializes in production when credentials are present", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT_JSON", SERVICE_ACCOUNT);
    vi.stubEnv("PUSH_SENDS_ENABLED", "");

    await runInit();

    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(initializeFirebase).toHaveBeenCalledTimes(1);
  });

  // 0038 regression: prod credentials in a local `.env` used to be enough to
  // send real pushes from a dev machine.
  it("refuses to initialize off production without the explicit opt-in", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT_JSON", SERVICE_ACCOUNT);
    vi.stubEnv("PUSH_SENDS_ENABLED", "");

    await runInit();

    expect(initializeApp).not.toHaveBeenCalled();
    expect(initializeFirebase).not.toHaveBeenCalled();
    expect(loggerInfo).toHaveBeenCalledWith(
      expect.stringContaining("disabled off production"),
    );
  });

  it("initializes off production when PUSH_SENDS_ENABLED=1 opts in", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT_JSON", SERVICE_ACCOUNT);
    vi.stubEnv("PUSH_SENDS_ENABLED", "1");

    await runInit();

    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(initializeFirebase).toHaveBeenCalledTimes(1);
  });

  it("treats an unset NODE_ENV as non-production (deny by default)", async () => {
    vi.stubEnv("NODE_ENV", "");
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT_JSON", SERVICE_ACCOUNT);
    vi.stubEnv("PUSH_SENDS_ENABLED", "");

    await runInit();

    expect(initializeApp).not.toHaveBeenCalled();
  });
});
