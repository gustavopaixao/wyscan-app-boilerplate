import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { ANCHORS } from "../src/generate/auth.mjs";
import { AUTH_STRING_KEYS, AUTH_STRINGS } from "../src/generate/authStrings.mjs";
import { FORMAT_SUPPRESSIONS } from "../src/tokens/patches.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "bin", "create.mjs");
const TEMPLATES = join(ROOT, "templates");

function generate(args) {
  const dir = mkdtempSync(join(tmpdir(), "wab-auth-"));
  execFileSync("node", [CLI, ...args, dir], { encoding: "utf8" });
  return dir;
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === ".git") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/**
 * The auth wiring injects itself into machine-extracted files by matching a
 * unique anchor string. A `npm run sync` that reshapes one of those files would
 * otherwise fail only at generation time, in a user's project — this catches it
 * here instead.
 */
describe("auth transform anchors", () => {
  for (const [src, anchor] of Object.entries(ANCHORS)) {
    if (anchor === null) continue; // resolved dynamically; covered below
    test(`${src} still contains its anchor`, () => {
      const text = readFileSync(join(TEMPLATES, src), "utf8");
      assert.ok(
        text.includes(anchor),
        `Anchor missing from templates/${src}. Update ANCHORS in src/generate/auth.mjs.`,
      );
    });
  }

  test("the admin layout still has the <Providers> element the guard wraps", () => {
    const text = readFileSync(join(TEMPLATES, "tree/web/_admin/src/app/layout.tsx"), "utf8");
    assert.match(text, /<Providers>[\s\S]*?<\/Providers>/);
  });
});

/**
 * Biome decides line wrapping by width, and a line carrying a substituted value
 * is a different width in every generated project — the slug alone ranges from
 * 3 to 44 characters. So no single formatting of those lines is correct for
 * every project, and a fresh scaffold used to fail `biome check` on its first
 * commit. `FORMAT_SUPPRESSIONS` in patches.mjs freezes them.
 *
 * These assert the patches still APPLY. If a re-sync reshapes one of these
 * lines the patch silently stops matching, and the failure would only surface
 * as a lint error in someone's generated project.
 */
describe("substitution-width format suppressions", () => {
  const TEMPLATE_ROOT = join(TEMPLATES, "tree");

  test("every suppression is present in the extracted templates", () => {
    const all = readFileSync(join(TEMPLATES, "manifest.json"), "utf8");
    assert.ok(all.length > 0);

    const missing = [];
    for (const [, patched] of FORMAT_SUPPRESSIONS) {
      // The patched text is what should now exist on disk. Find any tree file
      // containing it; none means the patch no longer matches upstream.
      const found = walk(TEMPLATE_ROOT).some((f) => {
        if (!/\.(ts|tsx)$/.test(f)) return false;
        return readFileSync(f, "utf8").includes(patched);
      });
      if (!found) missing.push(patched.split("\n")[1]?.trim() ?? patched.slice(0, 60));
    }

    assert.deepEqual(
      missing,
      [],
      "a format suppression no longer matches the reference — re-run `npm run sync` " +
        "and update FORMAT_SUPPRESSIONS in src/tokens/patches.mjs",
    );
  });

  test("suppressions are not stacked by a repeated sync", () => {
    // applyPatches() is re-run on every extraction, and each replacement
    // contains its own original text — without the guard it would nest.
    for (const f of walk(TEMPLATE_ROOT)) {
      if (!/\.(ts|tsx)$/.test(f)) continue;
      const text = readFileSync(f, "utf8");
      assert.ok(
        !text.includes("// biome-ignore format: width depends on the generated project name\n  // biome-ignore format:"),
        `stacked suppression in ${f}`,
      );
    }
  });
});

describe("auth string catalogue", () => {
  test("every locale defines every key", () => {
    for (const [locale, strings] of Object.entries(AUTH_STRINGS)) {
      const missing = AUTH_STRING_KEYS.filter((k) => !strings[k]);
      assert.deepEqual(missing, [], `${locale} is missing keys`);
    }
  });

  test("covers the same locales the apps ship", () => {
    const shipped = ["en", "pt-BR", "pt-PT", "es", "fr", "de", "it", "nl"];
    assert.deepEqual(Object.keys(AUTH_STRINGS).sort(), [...shipped].sort());
  });
});

describe("standalone auth-api stub", () => {
  const pkg = JSON.parse(
    readFileSync(join(TEMPLATES, "partials/stubs/auth-api/package.json"), "utf8"),
  );

  test("every declared subpath export resolves to a real file", () => {
    const missing = [];
    for (const [subpath, entry] of Object.entries(pkg.exports)) {
      for (const key of ["types", "default"]) {
        const target = join(TEMPLATES, "partials/stubs/auth-api", entry[key]);
        if (!existsSync(target)) missing.push(`${subpath} (${key}): ${entry[key]}`);
      }
    }
    assert.deepEqual(missing, []);
  });

  test("exports every route the api mounts", () => {
    const routes = readFileSync(
      join(TEMPLATES, "authored/api/src/v1/authRoutes.ts"),
      "utf8",
    );
    // Each `from "__NPM_SCOPE__/auth-api/<subpath>"` must exist in the map, or
    // standalone mode fails at import time rather than at type-check.
    const imported = [...routes.matchAll(/__NPM_SCOPE__\/auth-api\/([\w/-]+)/g)].map((m) => m[1]);
    assert.ok(imported.length > 0, "found no auth-api imports to check");

    for (const subpath of imported) {
      assert.ok(pkg.exports[`./${subpath}`], `stub does not export ./${subpath}`);
    }
  });
});

/**
 * Two defects found while exercising the generated API against a live MongoDB.
 * Both make refresh-token revocation a silent no-op — a revoked or rotated
 * token keeps working — and both are easy to reintroduce, because the broken
 * form looks perfectly reasonable.
 */
describe("refresh-token revocation regressions", () => {
  const tokens = readFileSync(join(TEMPLATES, "partials/stubs/auth-api/utils/tokens.js"), "utf8");
  const jwtUtil = readFileSync(join(TEMPLATES, "partials/stubs/auth-api/utils/jwt.js"), "utf8");

  test("refresh tokens are SHA-256 hashed, never bcrypt", () => {
    // bcrypt truncates at 72 bytes. Every refresh JWT for a user shares its
    // first 72 bytes (header + the userId/role/type prefix), so under bcrypt
    // they ALL hash identically and revocation matches the wrong row.
    assert.match(tokens, /sha256\(token\)/, "refresh tokens must be SHA-256 hashed");

    const saveFn = tokens.slice(
      tokens.indexOf("export async function saveRefreshToken"),
      tokens.indexOf("export async function revokeRefreshToken"),
    );
    assert.ok(
      !/bcrypt\.hash\(\s*token/.test(saveFn),
      "saveRefreshToken must not bcrypt-hash the token",
    );
  });

  test("refresh tokens carry a unique jti", () => {
    // `iat` has one-second granularity, so without a jti two refreshes inside
    // the same second mint byte-identical tokens: rotation hands back the token
    // it just revoked.
    const generate = jwtUtil.slice(
      jwtUtil.indexOf("export function generateRefreshToken"),
      jwtUtil.indexOf("function verify("),
    );
    assert.match(generate, /jti:\s*randomUUID\(\)/);
  });

  test("verification codes keep bcrypt", () => {
    // The inverse mistake: 8 chars of [A-Z0-9] is ~41 bits and DOES want a slow
    // KDF, and is far below the 72-byte limit.
    assert.match(tokens, /bcrypt\.hash\(code, BCRYPT_ROUNDS\)/);
  });
});

describe("generated project (standalone, all workspaces)", () => {
  let dir;
  let files;

  before(() => {
    dir = generate(["--slug", "demo-shop", "--owner", "octocat", "--wyscan", "standalone"]);
    files = walk(dir);
  });

  after(() => rmSync(dir, { recursive: true, force: true }));

  test("registers the auth routes and their rate limiter in the Hono app", () => {
    const app = readFileSync(join(dir, "api/src/app.ts"), "utf8");
    assert.match(app, /registerV1AuthRoutes\(app\)/);
    assert.match(app, /authRateLimit\(\)/);
    // The limiter is useless if it is bound after the routes it protects.
    assert.ok(
      app.indexOf("authRateLimit()") < app.indexOf("registerV1AuthRoutes(app)"),
      "rate limiter must be bound before the auth routes",
    );
  });

  test("gates the member app's routes", () => {
    const proxy = readFileSync(join(dir, "web/demo-shop-app/src/proxy.ts"), "utf8");
    assert.match(proxy, /applySessionGate/);
    assert.ok(existsSync(join(dir, "web/demo-shop-app/src/lib/server/session-gate.ts")));
  });

  test("gates the admin console", () => {
    assert.ok(existsSync(join(dir, "web/demo-shop-admin/src/middleware.ts")));
    assert.ok(existsSync(join(dir, "web/demo-shop-admin/src/lib/admin-access.ts")));
  });

  test("mounts the auth provider above mobile navigation", () => {
    const layout = readFileSync(join(dir, "mobile/app/_layout.tsx"), "utf8");
    assert.match(layout, /<AuthProvider>/);
    // Above LocaleProvider: the route groups gate on auth state.
    assert.ok(layout.indexOf("<AuthProvider>") < layout.indexOf("<LocaleProvider>"));
  });

  test("mobile entry route branches on the session", () => {
    const index = readFileSync(join(dir, "mobile/app/index.tsx"), "utf8");
    assert.match(index, /useAuth/);
    assert.match(index, /\(auth\)\/login/);
  });

  test("ships every auth screen on mobile", () => {
    for (const screen of ["login", "register", "verify", "forgot-password", "reset-password"]) {
      assert.ok(
        existsSync(join(dir, `mobile/app/(auth)/${screen}.tsx`)),
        `missing mobile/app/(auth)/${screen}.tsx`,
      );
    }
  });

  test("ships every auth page on the member app", () => {
    for (const page of ["sign-in", "register", "verify", "forgot-password", "reset-password"]) {
      assert.ok(
        existsSync(join(dir, `web/demo-shop-app/src/app/[locale]/(auth)/${page}/page.tsx`)),
        `missing ${page}`,
      );
    }
  });

  test("merges auth copy into all eight web message catalogues", () => {
    for (const locale of Object.keys(AUTH_STRINGS)) {
      const messages = JSON.parse(
        readFileSync(join(dir, `web/demo-shop-app/messages/${locale}.json`), "utf8"),
      );
      assert.ok(messages.auth, `${locale}.json has no auth namespace`);
      assert.equal(Object.keys(messages.auth).length, AUTH_STRING_KEYS.length, locale);
    }
  });

  test("merges auth copy into all eight mobile bundles", () => {
    for (const locale of Object.keys(AUTH_STRINGS)) {
      const strings = JSON.parse(
        readFileSync(join(dir, `mobile/locales/${locale}.json`), "utf8"),
      );
      const authKeys = Object.keys(strings).filter((k) => k.startsWith("auth_"));
      assert.equal(authKeys.length, AUTH_STRING_KEYS.length, locale);
    }
  });

  test("documents the BFF secret and the mailer in api/.env.example", () => {
    const env = readFileSync(join(dir, "api/.env.example"), "utf8");
    assert.match(env, /INTERNAL_API_SECRET/);
    assert.match(env, /MAILGUN_/);
  });

  test("ships a working auth-api stub, not the jwt-only placeholder", () => {
    const stub = join(dir, "packages/stubs/auth-api");
    for (const rel of [
      "routes/auth/login.js",
      "routes/auth/register.js",
      "routes/auth/refresh.js",
      "routes/auth/google.js",
      "models/user.model.js",
      "utils/tokens.js",
    ]) {
      assert.ok(existsSync(join(stub, rel)), `stub missing ${rel}`);
    }
  });

  test("never ships a populated secret outside a gitignored file", () => {
    // `.env.local` is written deliberately (the member app cannot build without
    // INTERNAL_API_SECRET) and carries an obviously-fake placeholder. Anything
    // else with a value on a secret key would be committed by the first push.
    const SECRET_KEYS = /^(JWT_SECRET|INTERNAL_API_SECRET|FACEBOOK_APP_SECRET|MAILGUN_API_KEY)=(.+)$/gm;

    for (const f of files) {
      if (!/\.env/.test(f)) continue;
      const text = readFileSync(f, "utf8");

      for (const [, key, value] of text.matchAll(SECRET_KEYS)) {
        assert.ok(
          f.endsWith(".env.local") && value.includes("dev-insecure"),
          `${f} sets ${key}=${value} outside a gitignored dev file`,
        );
      }
    }
  });

  test("gitignores the env files that carry a dev secret", () => {
    const ignored = readFileSync(join(dir, ".gitignore"), "utf8");
    assert.match(ignored, /\.env/);

    // Belt and braces: the post-scaffold commit must not contain one.
    const tracked = execFileSync("git", ["ls-files"], { cwd: dir, encoding: "utf8" });
    assert.ok(
      !tracked.split("\n").some((p) => p.endsWith(".env.local")),
      "a .env.local was committed",
    );
  });
});

describe("auth respects workspace selection", () => {
  test("an api-only project carries no web or mobile auth", () => {
    const dir = generate(["--slug", "demo-api", "--workspaces", "api", "--wyscan", "standalone"]);
    try {
      const stray = walk(dir).filter((f) => f.includes("/web/") || f.includes("/mobile/"));
      assert.deepEqual(stray, []);
      // ...but the api half is fully present.
      assert.ok(existsSync(join(dir, "api/src/v1/authRoutes.ts")));
      assert.ok(existsSync(join(dir, "packages/stubs/auth-api/routes/auth/login.js")));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a mobile-only project carries no api auth", () => {
    const dir = generate([
      "--slug",
      "demo-mob",
      "--workspaces",
      "mobile",
      "--wyscan",
      "standalone",
    ]);
    try {
      assert.ok(existsSync(join(dir, "mobile/app/(auth)/login.tsx")));
      assert.ok(!existsSync(join(dir, "api")));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("auth in every shared-package mode", () => {
  // local and registry resolve the REAL package, so the stub must be absent;
  // standalone vendors it. All three must still wire the routes.
  const cases = [
    { mode: "local", expectStub: false },
    { mode: "registry", expectStub: false },
    { mode: "standalone", expectStub: true },
  ];

  for (const { mode, expectStub } of cases) {
    test(`${mode} wires auth and ${expectStub ? "vendors" : "omits"} the stub`, () => {
      const dir = generate(["--slug", "demo-mode", "--owner", "octocat", "--wyscan", mode]);
      try {
        assert.match(readFileSync(join(dir, "api/src/app.ts"), "utf8"), /registerV1AuthRoutes/);
        assert.ok(existsSync(join(dir, "api/src/v1/authRoutes.ts")));

        const stubbed = existsSync(join(dir, "packages/stubs/auth-api/routes/auth/login.js"));
        assert.equal(stubbed, expectStub);

        // The import specifier is identical in all three modes — that is what
        // makes graduating between them a dependency swap, not a rewrite.
        const routes = readFileSync(join(dir, "api/src/v1/authRoutes.ts"), "utf8");
        assert.match(routes, /@octocat\/auth-api\/routes\/auth\/login/);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }
});
