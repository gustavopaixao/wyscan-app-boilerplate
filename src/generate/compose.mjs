/**
 * Prune docker-compose services without a YAML dependency.
 *
 * The reference compose files are uniformly 2-space indented and
 * machine-shaped, so an indentation-aware block splitter is sufficient and
 * avoids adding a parser to a zero-dependency CLI. Ports are already written
 * as `${API_PORT:-3000}`, so port configuration is a default-value rewrite
 * rather than a structural edit.
 */

/** Split a top-level mapping into [key, lines] blocks. */
function splitTopLevel(lines) {
  const blocks = [];
  let current = null;

  for (const line of lines) {
    const isTop = /^[A-Za-z_][A-Za-z0-9_-]*:/.test(line);
    if (isTop) {
      current = { key: line.slice(0, line.indexOf(":")), lines: [line] };
      blocks.push(current);
    } else if (current) {
      current.lines.push(line);
    } else {
      blocks.push({ key: null, lines: [line] });
    }
  }
  return blocks;
}

/** Split a nested mapping (2-space indented keys) into [key, lines] blocks. */
function splitNested(lines, indent = "  ") {
  const out = [];
  let current = null;
  const keyRe = new RegExp(`^${indent}([A-Za-z_][A-Za-z0-9_.-]*):`);

  for (const line of lines) {
    const m = line.match(keyRe);
    if (m) {
      current = { key: m[1], lines: [line] };
      out.push(current);
    } else if (current) {
      current.lines.push(line);
    } else {
      out.push({ key: null, lines: [line] });
    }
  }
  return out;
}

function trimTrailingBlank(lines) {
  const out = [...lines];
  while (out.length && out[out.length - 1].trim() === "") out.pop();
  return out;
}

/**
 * @param {string} source  compose file text
 * @param {string[]} keep  service names to retain
 * @returns {string}
 */
export function pruneCompose(source, keep) {
  const kept = new Set(keep);
  const blocks = splitTopLevel(source.split("\n"));
  const out = [];

  for (const block of blocks) {
    if (block.key !== "services") {
      out.push(...block.lines);
      continue;
    }

    const services = splitNested(trimTrailingBlank(block.lines.slice(1)));
    const retained = [];

    for (const svc of services) {
      if (svc.key && !kept.has(svc.key)) continue;
      // Drop depends_on entries pointing at removed services.
      retained.push(...dropDependsOn(svc.lines, kept));
    }

    out.push(block.lines[0], ...retained, "");
  }

  return out.join("\n");
}

/** Remove `depends_on:` list items (and the key, if it empties) for dropped services. */
function dropDependsOn(lines, kept) {
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const m = line.match(/^(\s*)depends_on:\s*$/);
    if (!m) {
      out.push(line);
      i++;
      continue;
    }

    const indent = m[1];
    const items = [];
    let j = i + 1;
    while (j < lines.length) {
      const l = lines[j];
      // A list item, or a mapping-style dependency (`  redis:` under depends_on).
      const item = l.match(new RegExp(`^${indent}\\s+-?\\s*([A-Za-z0-9_-]+):?\\s*$`));
      if (!item) break;
      items.push({ name: item[1], lines: [l] });
      j++;
      // Mapping style carries a `condition:` line beneath it.
      while (j < lines.length && /^\s+condition:/.test(lines[j])) {
        items[items.length - 1].lines.push(lines[j]);
        j++;
      }
    }

    const surviving = items.filter((it) => kept.has(it.name));
    if (surviving.length) {
      out.push(line);
      for (const s of surviving) out.push(...s.lines);
    }
    i = j;
  }

  return out;
}

/** Default dev-stack services, in compose order. */
export const ALL_SERVICES = ["redis", "mongodb", "api", "realtime", "log-agent", "nginx"];

/** Services that share the api node_modules volume and run its install script. */
const SHARE_API_NODE_MODULES = ["realtime", "log-agent"];

const API_HEALTHCHECK = [
  "    healthcheck:",
  "      test:",
  "        [",
  '          "CMD",',
  '          "node",',
  '          "-e",',
  "          \"fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\",",
  "        ]",
  "      interval: 5s",
  "      timeout: 5s",
  "      retries: 60",
  "      start_period: 30s",
];

const DEPENDS_ON_API = [
  "      # Shares the api node_modules volume and runs the same install script.",
  "      # Starting in parallel makes two pnpm installs race on one directory",
  "      # and one store, leaving the dependency tree half-written.",
  "      api:",
  "        condition: service_healthy",
];

/**
 * Serialise the dependency install across the services that share the api
 * node_modules volume.
 *
 * In the reference, api, realtime and log-agent each run
 * `ensure-api-node-modules.sh` against one shared volume, and realtime waits
 * only on mongodb/redis — so on a cold store all three install concurrently
 * and corrupt each other (ERR_PNPM_ENOENT, then a missing `tsx`). It never
 * surfaced upstream because that store was always warm.
 *
 * Fix: give api a healthcheck, and make the other two wait for it.
 */
export function serializeInstalls(source) {
  const blocks = splitTopLevel(source.split("\n"));
  const out = [];

  for (const block of blocks) {
    if (block.key !== "services") {
      out.push(...block.lines);
      continue;
    }

    const services = splitNested(trimTrailingBlank(block.lines.slice(1)));
    const rebuilt = [];

    for (const svc of services) {
      if (svc.key === "api" && !svc.lines.some((l) => l.trim() === "healthcheck:")) {
        // Insert before `volumes:` so the block stays readable.
        const at = svc.lines.findIndex((l) => /^ {4}volumes:/.test(l));
        const idx = at === -1 ? svc.lines.length : at;
        rebuilt.push(...svc.lines.slice(0, idx), ...API_HEALTHCHECK, ...svc.lines.slice(idx));
        continue;
      }

      if (SHARE_API_NODE_MODULES.includes(svc.key)) {
        rebuilt.push(...addApiDependency(svc.lines));
        continue;
      }

      rebuilt.push(...svc.lines);
    }

    out.push(block.lines[0], ...rebuilt, "");
  }

  return out.join("\n");
}

/** Ensure a service's depends_on waits for api to be healthy. */
function addApiDependency(lines) {
  if (lines.some((l) => /^ {6}api:/.test(l))) return lines;

  const start = lines.findIndex((l) => /^ {4}depends_on:/.test(l));
  if (start === -1) {
    // No depends_on at all — append one.
    return [...lines, "    depends_on:", ...DEPENDS_ON_API];
  }

  // Find the extent of the existing depends_on block. Entries are 6-space
  // indented but their `condition:` children are 8, so match 6-or-more.
  let end = start + 1;
  while (end < lines.length && /^ {6,}\S/.test(lines[end])) end++;

  // List form (`- api`) cannot express a condition; replace it wholesale.
  const isListForm = lines.slice(start + 1, end).every((l) => /^\s+-\s/.test(l));
  const existing = isListForm ? [] : lines.slice(start + 1, end);

  return [
    ...lines.slice(0, start),
    "    depends_on:",
    ...existing,
    ...DEPENDS_ON_API,
    ...lines.slice(end),
  ];
}
