/**
 * Content transforms applied after token substitution, keyed by destination
 * path. Anything that needs structural editing rather than string replacement
 * lives here.
 */

import { pruneCompose, ALL_SERVICES } from "./compose.mjs";

const COMPOSE_FILES = new Set([
  "docker/docker-compose.yml",
  "docker/docker-compose.dev-host-api.yml",
  "docker/docker-compose.prod.yml",
]);

/**
 * @param {string} dest    destination path within the generated project
 * @param {string} text    rendered file contents
 * @param {object} cfg     resolved config
 * @returns {string}
 */
export function transform(dest, text, cfg) {
  let out = text;

  if (COMPOSE_FILES.has(dest)) {
    const services = cfg.services ?? ALL_SERVICES;
    if (services.length !== ALL_SERVICES.length) {
      out = pruneCompose(out, services);
    }
  }

  return out;
}
