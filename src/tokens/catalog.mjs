/**
 * Ordered token catalog shared by the extractor (scripts/sync-from-reference.mjs)
 * and the installer (src/tokens/apply.mjs).
 *
 * Extraction  : reference literal -> sentinel, applied TOP-DOWN (longest/most
 *               specific first) so `com.botonistas.app` is consumed by
 *               __BUNDLE_ID__ before the bare `botonistas` rule can see it.
 * Installation: sentinel -> user value, order-independent (sentinels never nest).
 *
 * `literal` is the value in the reference repo. `field` is the config key that
 * supplies the replacement at install time.
 */

export const TOKENS = [
  // --- Absolute paths (must precede the bare slug) -------------------------
  { sentinel: "__DEPLOY_ROOT__", literal: "/websites/botonistas", field: "deployRoot" },
  { sentinel: "__SERVER_DEPLOY_DIR__", literal: "/opt/botonistas-api", field: "serverDeployDir" },

  // --- Registry / owner (must precede __OWNER_HANDLE__) -------------------
  { sentinel: "__IMAGE_REGISTRY__", literal: "ghcr.io/gustavopaixao", field: "imageRegistry" },
  { sentinel: "__NPM_SCOPE__", literal: "@gustavopaixao", field: "npmScope" },

  // --- Reverse-DNS + domains (must precede __PROJECT_DOMAIN__/slug) -------
  { sentinel: "__BUNDLE_ID__", literal: "com.botonistas.app", field: "bundleId" },
  { sentinel: "__API_DOMAIN__", literal: "api.botonistas.com", field: "apiDomain" },
  { sentinel: "__WEB_DOMAIN__", literal: "app.botonistas.com", field: "webDomain" },
  { sentinel: "__ADMIN_DOMAIN__", literal: "admin.botonistas.com", field: "adminDomain" },
  { sentinel: "__WWW_DOMAIN__", literal: "www.botonistas.com", field: "wwwDomain" },
  { sentinel: "__PROJECT_DOMAIN__", literal: "botonistas.com", field: "domain" },

  // --- Ecosystem (capital-D `WyscanDev` only; lowercase `wyscan-*` package
  //     directory names are NEVER tokenized — see DENYLIST below) ----------
  { sentinel: "__ECOSYSTEM_DIR__", literal: "WyscanDev", field: "ecosystemDir" },

  // --- Machine-specific ---------------------------------------------------
  { sentinel: "__DEV_HOST__", literal: "gmpaixao", field: "devHost" },
  { sentinel: "__OWNER_HANDLE__", literal: "gustavopaixao", field: "owner" },

  // --- Project identity (broadest last) -----------------------------------
  { sentinel: "__PROJECT_CONST__", literal: "BOTONISTAS", field: "projectConst" },
  { sentinel: "__PROJECT_NAME__", literal: "Botonistas", field: "displayName" },
  { sentinel: "__PROJECT_SLUG__", literal: "botonistas", field: "slug" },
];

/**
 * Sentinels that are introduced by a patch rather than by extraction, so they
 * have no reference literal to match. They are substituted at install time but
 * never produced by tokenize().
 *
 * `__IOS_PROJECT_NAME__` exists because Expo names the Xcode project after the
 * app `name` with non-alphanumerics stripped ("Demo Shop" -> "DemoShop"), which
 * `__PROJECT_NAME__` cannot express — and the two share a literal in the
 * reference ("Botonistas"), so ordered substitution cannot tell them apart.
 */
export const RENDER_ONLY_TOKENS = [
  { sentinel: "__IOS_PROJECT_NAME__", field: "iosProjectName" },
];

/**
 * Substrings that look like tokens but must never be rewritten. Asserted by the
 * extractor's completeness guard so a future catalog change cannot eat them.
 */
export const DENYLIST = [
  "wyscan-react-native", // real package dir names inside file: specifiers
  "wyscan-core",
  "wyscan-auth",
  "wyscan-notify",
  "wyscan-ads",
  "wyscan-ai",
  "wyscan-feedback",
];

/** Predecessor project tokens. Their presence means an incomplete upstream rename. */
export const PREDECESSOR_TOKENS = ["palpitepro"];

/** Literals that must not survive extraction (case-insensitive). */
export const RESIDUE_TOKENS = [
  "botonistas",
  "gustavopaixao",
  "gmpaixao",
  "palpitepro",
];

export const SENTINEL_RE = /__[A-Z0-9_]+__/g;

/** Extraction order: as declared (already most-specific-first). */
export function extractionOrder() {
  return TOKENS;
}

/** Every sentinel string, for residue assertions. */
export function allSentinels() {
  return [...TOKENS, ...RENDER_ONLY_TOKENS].map((t) => t.sentinel);
}
