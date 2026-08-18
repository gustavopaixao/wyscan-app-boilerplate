/**
 * Seeding the initial root user.
 *
 * A generated project ships working auth but no way in: `register` creates
 * every account as PENDING behind an emailed code, and the admin console
 * requires `role === "admin"` exactly, with no self-service promotion. Without
 * this, the only path to a usable admin is a hand-written Mongo update.
 *
 * The scaffolder itself never touches a database — Mongo only exists once the
 * docker stack is up — so the seed runs at API boot instead, idempotently. That
 * keeps it zero-command, and it re-creates the user after `make fresh` wipes
 * the volume.
 *
 * The implementation ships as an authored template
 * (`templates/authored/api/src/lib/seedRootUser.ts`); this module only wires
 * the machine-extracted `api/src/server.ts` to call it. Same rule as
 * `src/generate/auth.mjs`: the injection is anchored on a unique existing
 * string and **throws** when the anchor is gone, so a re-sync that reshapes
 * `server.ts` fails loudly rather than quietly producing a project whose seed
 * never runs. `test/auth.test.mjs` asserts the anchor still exists.
 */

/**
 * The seeded credentials, in one place.
 *
 * `src/post/nextsteps.mjs` prints these and the docs quote them, while the
 * hashing happens in the authored TypeScript — so a test asserts the two copies
 * still agree rather than letting the printed password drift from the real one.
 *
 * The password satisfies the project's own strength policy (8+ chars, lower,
 * upper, digit — see `core-api/utils/validation`). Seeding writes the hash
 * directly and would bypass that check, but shipping a credential the register
 * endpoint would itself reject reads as a bug.
 */
export const ROOT_USER = {
  email: "root@wyscan.local",
  password: "Password@1",
  displayName: "Root",
};

/**
 * Keyed by the template `src` path (stable) rather than the rendered `dest`
 * (which carries the slug), so the guard test can assert them without running a
 * full generation.
 */
export const SEED_ANCHORS = {
  "tree/api/src/server.ts": `if (env.MONGODB_URL) {
  await mongoose.connect(env.MONGODB_URL);
}`,
};

/**
 * Replace `anchor` with `replacement`, or throw naming the file.
 * @param {string} text
 * @param {string} anchor   unique substring expected in `text`
 * @param {string} replacement
 * @param {string} dest     for the error message
 */
function anchoredReplace(text, anchor, replacement, dest) {
  if (!text.includes(anchor)) {
    throw new Error(
      `seed wiring: anchor not found in ${dest}.\n` +
        `Expected to find:\n  ${anchor.split("\n")[0]}\n` +
        `The reference project changed shape — update SEED_ANCHORS in src/generate/seed.mjs.`,
    );
  }
  return text.replace(anchor, replacement);
}

/**
 * api/src/server.ts — seed the root user once the connection is up.
 *
 * A dynamic import, like the auth wiring in `app.ts`: it leaves the file's
 * import block untouched, so Biome's `organizeImports` cannot fail on ordering.
 * `server.ts` already uses top-level await.
 */
export function wireApiServer(text, dest) {
  const anchor = SEED_ANCHORS["tree/api/src/server.ts"];
  return anchoredReplace(
    text,
    anchor,
    `if (env.MONGODB_URL) {
  await mongoose.connect(env.MONGODB_URL);
  // Development convenience: create the initial root user, so the admin console
  // and the member apps are reachable without a manual database edit. A no-op
  // in production, and a no-op once the user exists.
  const { seedRootUser } = await import("./lib/seedRootUser.js");
  await seedRootUser();
}`,
    dest,
  );
}
