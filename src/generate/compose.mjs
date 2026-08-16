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
