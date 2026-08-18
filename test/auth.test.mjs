import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { ANCHORS } from "../src/generate/auth.mjs";
import { ROOT_USER, SEED_ANCHORS } from "../src/generate/seed.mjs";
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
 * The root-user seed injects itself into `api/src/server.ts` the same way, and
 * the credentials it writes are printed by the CLI from a SEPARATE constant.
 * Both can drift silently, so both are pinned here.
 */
describe("root user seed", () => {
  for (const [src, anchor] of Object.entries(SEED_ANCHORS)) {
    test(`${src} still contains its anchor`, () => {
      const text = readFileSync(join(TEMPLATES, src), "utf8");
      assert.ok(
        text.includes(anchor),
        `Anchor missing from templates/${src}. Update SEED_ANCHORS in src/generate/seed.mjs.`,
      );
    });
  }

  test("the seeded credentials match the ones the CLI prints", () => {
    const impl = readFileSync(join(TEMPLATES, "authored/api/src/lib/seedRootUser.ts"), "utf8");
    // nextsteps.mjs prints ROOT_USER; the hashing uses these literals. A
    // mismatch hands the user a password that does not work.
    assert.ok(
      impl.includes(`"${ROOT_USER.email}"`),
      `seedRootUser.ts must seed ${ROOT_USER.email} — the CLI prints it as the login`,
    );
    assert.ok(
      impl.includes(`"${ROOT_USER.password}"`),
      `seedRootUser.ts must seed the password the CLI prints (${ROOT_USER.password})`,
    );
  });

  test("the seeded password satisfies the project's own strength policy", () => {
    // core-api/utils/validation rejects anything weaker on register, so a
    // seeded credential that fails it could not be re-created by a user.
    const { password } = ROOT_USER;
    assert.ok(password.length >= 8, "8 characters minimum");
    assert.match(password, /[a-z]/);
    assert.match(password, /[A-Z]/);
    assert.match(password, /[0-9]/);
  });

  test("seeds an active admin, not a pending user", () => {
    const impl = readFileSync(join(TEMPLATES, "authored/api/src/lib/seedRootUser.ts"), "utf8");
    // PENDING would demand the emailed verification code, and `moderator` is
    // rejected by the admin console — either one makes the seed pointless.
    assert.match(impl, /status: UserStatus\.ACTIVE/);
    assert.match(impl, /role: UserRole\.ADMIN/);
  });

  test("never runs against a production database", () => {
    const impl = readFileSync(join(TEMPLATES, "authored/api/src/lib/seedRootUser.ts"), "utf8");
    assert.match(
      impl,
      /NODE_ENV[\s\S]{0,60}"production"/,
      "these credentials are published in the docs — production must be excluded",
    );
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

/**
 * `docs/runbooks/auth.md` documents exactly where the stub is NARROWER than the
 * shared package: `user.location` carries only `city` and `country`, and the
 * package's extra fields are silently dropped rather than rejected in
 * standalone mode.
 *
 * That is a factual claim about the stub which nothing else pins. Widening the
 * stub is a perfectly good change — but it would leave the runbook quietly
 * wrong, and the whole point of that section is that the failure is silent.
 */
describe("documented stub/package divergence", () => {
  const STUB_MODEL = "partials/stubs/auth-api/models/user.model.js";
  const RUNBOOK = "authored/docs/runbooks/auth.md";

  test("the stub's location is still only city and country", () => {
    const model = readFileSync(join(TEMPLATES, STUB_MODEL), "utf8");
    const location = model.match(/const LocationSchema = new Schema\(([\s\S]*?)\n\);/);
    assert.ok(location, `LocationSchema not found in ${STUB_MODEL}`);

    for (const field of ["coordinates", "precision", "source", "updatedAt"]) {
      assert.ok(
        !location[1].includes(`${field}:`),
        `The stub's LocationSchema now has \`${field}\`, which the shared package ` +
          `also has. That is an improvement — but templates/${RUNBOOK} lists it as ` +
          `absent under "Where the stub is narrower than the package". Update the ` +
          `table there, or the runbook now understates what standalone supports.`,
      );
    }
  });

  test("the stub still exports no location enums", () => {
    // The package exports LocationPrecision and LocationSource from ./models;
    // the runbook says importing them fails to resolve in standalone.
    const barrel = readFileSync(join(TEMPLATES, "partials/stubs/auth-api/models/index.js"), "utf8");
    for (const name of ["LocationPrecision", "LocationSource"]) {
      assert.ok(
        !barrel.includes(name),
        `The stub now exports ${name}. templates/${RUNBOOK} says it does not — update it.`,
      );
    }
  });

  test("the runbook still carries the divergence section it is guarding", () => {
    // Otherwise the two tests above guard a claim that is no longer made, and
    // would fail for no reason a reader could act on.
    const runbook = readFileSync(join(TEMPLATES, RUNBOOK), "utf8");
    assert.match(runbook, /Where the stub is narrower than the package/);
    assert.match(runbook, /location\.coordinates/);
  });
});

/**
 * `GET /api/v1/me` has two envelopes in the wild: the shared package returns the
 * user at the top level, the standalone stub nests it under `user`. A consumer
 * that reads only one gets `undefined` for the role — which is indistinguishable
 * from "not an admin", so the session route 403s and clears the cookies. The
 * symptom is being signed out seconds after a successful sign-in, in
 * `local`/`registry` only, which is why it survived so long.
 */
describe("/api/v1/me consumers tolerate both response envelopes", () => {
  // Every file that calls the endpoint, per surface.
  const CONSUMERS = [
    "authored/web/_admin/src/app/api/auth/session/route.ts",
    "authored/web/_admin/src/lib/server/require-app-admin.ts",
    "authored/web/_app/src/lib/server/auth-bff.ts",
    "authored/mobile/lib/auth/authApi.ts",
  ];

  test("every known consumer is accounted for", () => {
    // A new caller that reads `body.user` directly would reintroduce the bug,
    // so the list must not silently fall behind the code.
    const callers = [];
    for (const file of walk(join(TEMPLATES, "authored"))) {
      if (!/\.(ts|tsx)$/.test(file) || /\.test\.tsx?$/.test(file)) continue;
      // An actual call, not a mention: the helper module and several comments
      // name the endpoint while explaining exactly this problem.
      if (/\(\s*"\/api\/v1\/me"/.test(readFileSync(file, "utf8"))) {
        callers.push(relative(TEMPLATES, file).split(sep).join("/"));
      }
    }
    // authRoutes.ts mounts the endpoint rather than consuming it.
    const consuming = callers.filter((f) => !f.endsWith("api/src/v1/authRoutes.ts"));
    assert.deepEqual(
      consuming.sort(),
      [...CONSUMERS].sort(),
      "the set of /api/v1/me callers changed — a new one must read the user " +
        "tolerantly (readMeUser on web, the inline check on mobile), not `body.user`",
    );
  });

  for (const file of CONSUMERS) {
    test(`${file} does not assume the nested shape`, () => {
      const text = readFileSync(join(TEMPLATES, file), "utf8");
      // The exact expressions that broke admin sign-in.
      for (const bad of ["result.body as { user", "body.user;", "<{ user: AuthUser }>"]) {
        assert.ok(
          !text.includes(bad),
          `${file} reads the \`user\` envelope directly (\`${bad}\`). That works ` +
            `against the stub and signs everyone out against the shared package.`,
        );
      }
    });
  }

  test("both web surfaces ship the shared helper and its tests", () => {
    for (const surface of ["_admin", "_app"]) {
      const helper = join(TEMPLATES, `authored/web/${surface}/src/lib/server/upstream-api.ts`);
      assert.match(readFileSync(helper, "utf8"), /export function readMeUser/);
      assert.ok(
        existsSync(join(TEMPLATES, `authored/web/${surface}/src/lib/server/upstream-api.test.ts`)),
        `web/${surface} is missing the readMeUser test`,
      );
    }
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

  test("seeds the root user once the API has a database connection", () => {
    const server = readFileSync(join(dir, "api/src/server.ts"), "utf8");
    assert.match(server, /seedRootUser\(\)/);
    // Seeding before connect() would run against no database at all.
    assert.ok(
      server.indexOf("mongoose.connect") < server.indexOf("await seedRootUser()"),
      "the seed must run after mongoose.connect()",
    );
    assert.ok(existsSync(join(dir, "api/src/lib/seedRootUser.ts")));
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
      // The seed is api-gated; a mobile-only project has nothing to seed into.
      assert.ok(!existsSync(join(dir, "api/src/lib/seedRootUser.ts")));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

/**
 * The seeded password exists nowhere the user will look afterwards — not in a
 * .env, not in a file the scaffold writes. If the closing summary stops
 * printing it, the account is effectively unreachable.
 */
describe("the closing summary hands over the credentials", () => {
  function generateCapturingStdout(args) {
    const dir = mkdtempSync(join(tmpdir(), "wab-auth-"));
    const stdout = execFileSync("node", [CLI, ...args, dir], { encoding: "utf8" });
    return { dir, stdout };
  }

  test("an api project is told the root email and password", () => {
    const { dir, stdout } = generateCapturingStdout([
      "--slug",
      "demo-api",
      "--workspaces",
      "api",
      "--wyscan",
      "standalone",
    ]);
    try {
      assert.ok(stdout.includes(ROOT_USER.email), "the summary must print the root email");
      assert.ok(stdout.includes(ROOT_USER.password), "the summary must print the root password");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a mobile-only project is not told about an account it cannot use", () => {
    const { dir, stdout } = generateCapturingStdout([
      "--slug",
      "demo-mob",
      "--workspaces",
      "mobile",
      "--wyscan",
      "standalone",
    ]);
    try {
      assert.ok(!stdout.includes(ROOT_USER.email));
      assert.ok(!stdout.includes(ROOT_USER.password));
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

        // Same for the seed: it reaches the models through the package
        // specifier, so it must resolve in all three modes and leave no
        // sentinel behind.
        const seed = readFileSync(join(dir, "api/src/lib/seedRootUser.ts"), "utf8");
        assert.match(seed, /@octocat\/auth-api\/models/);
        assert.ok(!seed.includes("__NPM_SCOPE__"), "unresolved sentinel in seedRootUser.ts");
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  }
});
