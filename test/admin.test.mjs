import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, existsSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CLI = join(ROOT, "bin", "create.mjs");
const TEMPLATES = join(ROOT, "templates");

function generate(args) {
  const dir = mkdtempSync(join(tmpdir(), "wab-admin-"));
  execFileSync("node", [CLI, ...args, dir], { encoding: "utf8" });
  return dir;
}

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === ".git" || e.name === "node_modules") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/**
 * The sidebar has always listed `/users`; for a long time nothing answered it.
 * These pin the page, the endpoint, and the wiring that connects them, so the
 * link cannot quietly go dead again.
 */
describe("admin user directory", () => {
  let dir;
  before(() => {
    dir = generate(["--slug", "demo-shop", "--owner", "octocat", "--wyscan", "standalone"]);
  });
  after(() => rmSync(dir, { recursive: true, force: true }));

  const admin = (p) => join(dir, "web/demo-shop-admin", p);

  test("the sidebar link to /users resolves to a page", () => {
    const navItems = readFileSync(admin("src/components/layout/navItems.ts"), "utf8");
    assert.match(navItems, /href: "\/users"/);
    assert.ok(
      existsSync(admin("src/app/users/page.tsx")),
      "navItems.ts links /users but no page answers it",
    );
  });

  test("the API ships the directory endpoint", () => {
    const routes = readFileSync(join(dir, "api/src/v1/adminRoutes.ts"), "utf8");
    assert.match(routes, /app\.get\("\/api\/v1\/admin\/users"/);
    // The role check is the whole security model for this route.
    assert.match(routes, /requireAdminUser/);
  });

  test("app.ts actually registers the admin routes", () => {
    // The injection is anchored, so a re-sync that moves the anchor throws —
    // but a silently dropped call would still generate a 404 in production.
    const app = readFileSync(join(dir, "api/src/app.ts"), "utf8");
    assert.match(app, /registerV1AdminRoutes\(app\)/);
    assert.match(app, /import\("\.\/v1\/adminRoutes\.js"\)/);
  });

  test("the endpoint never returns raw documents", () => {
    const routes = readFileSync(join(dir, "api/src/v1/adminRoutes.ts"), "utf8");
    // `toPublicJSON()` is the only thing keeping `passwordHash` and the OAuth
    // ids out of the response, and `.lean()` would strip the method.
    assert.match(routes, /toPublicJSON\(\)/);
    // Code only — the file explains the rule in a comment that names `.lean()`.
    const code = routes
      .split("\n")
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join("\n");
    assert.ok(
      !/\.lean\(\)/.test(code),
      "adminRoutes.ts uses .lean(), which strips toPublicJSON() and leaks the whole document",
    );
  });

  test("privileged routes never guard with `instanceof Response`", () => {
    // The auth package refuses with a NextResponse, and @hono/node-server
    // installs its own Response global over the one next/server was loaded
    // with — so `instanceof Response` is false in the running API and the
    // route serves the whole directory to anonymous callers. It passes every
    // unit test, because under Vitest the two classes are the same object.
    const routes = readFileSync(join(dir, "api/src/v1/adminRoutes.ts"), "utf8");
    const code = routes
      .split("\n")
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join("\n");
    assert.ok(
      !/instanceof Response/.test(code),
      "adminRoutes.ts guards with `instanceof Response`, which is false at " +
        "runtime and lets anonymous callers through — use isAuthenticatedUser",
    );
    assert.match(code, /isAuthenticatedUser\(admin\)/);
  });

  test("routeHelpers ships the fail-closed guard and normalises refusals", () => {
    const helpers = readFileSync(join(dir, "api/src/v1/routeHelpers.ts"), "utf8");
    assert.match(helpers, /export function isAuthenticatedUser/);
    // Positive identification of the SUCCESS case: anything unrecognisable is
    // a refusal, so a new realm mismatch fails closed rather than open.
    assert.match(helpers, /candidate\.userId !== undefined/);
    // And the refusal is re-issued from the ambient global, so Hono gets a
    // response its own runtime recognises.
    assert.match(helpers, /new Response\(/);
  });

  test("the search term is escaped before it reaches Mongo", () => {
    const routes = readFileSync(join(dir, "api/src/v1/adminRoutes.ts"), "utf8");
    assert.match(routes, /escapeRegex/);
  });

  test("client and server agree on every query parameter", () => {
    // The two files are in different workspaces with no shared types, so this
    // contract has nothing but a test holding it together.
    const client = readFileSync(admin("src/lib/users/usersQuery.ts"), "utf8");
    const server = readFileSync(join(dir, "api/src/v1/adminRoutes.ts"), "utf8");
    for (const param of ["page", "limit", "search", "role", "status"]) {
      assert.match(client, new RegExp(`"${param}"`), `client never sends ${param}`);
      assert.match(server, new RegExp(`"${param}"`), `server never reads ${param}`);
    }
  });

  test("the client page size stays within the server's cap", () => {
    const client = readFileSync(admin("src/lib/users/usersQuery.ts"), "utf8");
    const server = readFileSync(join(dir, "api/src/v1/adminRoutes.ts"), "utf8");
    const pageSize = Number(client.match(/USERS_PAGE_SIZE = (\d+)/)?.[1]);
    const maxLimit = Number(server.match(/MAX_LIMIT = (\d+)/)?.[1]);
    assert.ok(Number.isFinite(pageSize) && Number.isFinite(maxLimit));
    assert.ok(
      pageSize <= maxLimit,
      `the console asks for ${pageSize} rows but the API caps at ${maxLimit}`,
    );
  });

  test("the console reaches the API through its own BFF, never directly", () => {
    const client = readFileSync(admin("src/lib/api/admin-client.ts"), "utf8");
    assert.match(client, /`\/api\/v1\$\{path\}`/);
    // Without same-origin credentials the session cookies are dropped.
    assert.match(client, /credentials: "same-origin"/);
    assert.ok(
      !/NEXT_PUBLIC_API_URL/.test(client),
      "the browser client must not know the API's address; the BFF owns that",
    );
  });

  test("the directory ships its tests into the generated project", () => {
    for (const p of [
      "api/src/v1/adminRoutes.test.ts",
      "web/demo-shop-admin/src/lib/users/usersQuery.test.ts",
      "web/demo-shop-admin/src/lib/api/admin-client.test.ts",
      "web/demo-shop-admin/src/components/users/UsersTable.test.tsx",
    ]) {
      assert.ok(existsSync(join(dir, p)), `missing ${p}`);
    }
  });
});

/**
 * The endpoint is built on the two things the shared package and the standalone
 * stub agree on, so it must be byte-identical everywhere. A difference here
 * means something mode-dependent leaked in, and it would break the mode the
 * author is not working in.
 */
describe("admin directory in every shared-package mode", () => {
  test("the endpoint is identical in local, registry and standalone", () => {
    const dirs = [];
    try {
      const seen = new Set();
      for (const mode of ["local", "registry", "standalone"]) {
        const dir = generate(["--slug", "demo-shop", "--owner", "octocat", "--wyscan", mode]);
        dirs.push(dir);
        seen.add(readFileSync(join(dir, "api/src/v1/adminRoutes.ts"), "utf8"));
        assert.ok(
          existsSync(join(dir, "web/demo-shop-admin/src/app/users/page.tsx")),
          `${mode} is missing the users page`,
        );
      }
      assert.equal(seen.size, 1, "adminRoutes.ts differs between --wyscan modes");
    } finally {
      for (const d of dirs) rmSync(d, { recursive: true, force: true });
    }
  });

  test("the endpoint imports nothing the shared package does not export", () => {
    // The package has no admin route and no `IPublicUser`; importing either
    // resolves against the stub and breaks `local` and `registry`.
    const src = readFileSync(join(TEMPLATES, "authored/api/src/v1/adminRoutes.ts"), "utf8");
    const imports = [...src.matchAll(/from "__NPM_SCOPE__\/auth-api([^"]*)"/g)].map((m) => m[1]);
    assert.deepEqual(imports, ["/models"]);
    assert.ok(
      !/IPublicUser|UserRoleType|UserStatusType/.test(src),
      "those types are exported by the stub's barrel but not the package's",
    );
  });
});

describe("admin directory respects workspace selection", () => {
  test("an api-only project has the endpoint and no console", () => {
    const dir = generate(["--slug", "demo-api", "--workspaces", "api", "--wyscan", "standalone"]);
    try {
      assert.ok(existsSync(join(dir, "api/src/v1/adminRoutes.ts")));
      assert.deepEqual(walk(dir).filter((f) => f.includes("/web/")), []);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("a project without the api workspace has no endpoint", () => {
    const dir = generate([
      "--slug", "demo-admin", "--workspaces", "web:admin", "--wyscan", "standalone",
    ]);
    try {
      assert.ok(!existsSync(join(dir, "api/src/v1/adminRoutes.ts")));
      assert.ok(existsSync(join(dir, "web/demo-admin-admin/src/app/users/page.tsx")));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
