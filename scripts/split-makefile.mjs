/**
 * Split the reference Makefile into per-group `make/*.mk` fragments plus a
 * `Makefile.head` that carries the variables and a self-pruning `help` rule.
 *
 * Why restructure instead of slicing the monolith at generate time: targets
 * share lines (`start dev-up:`), prerequisites cross group boundaries
 * (`push-check: api-lint api-test mobile-typecheck`), and both `.PHONY` and
 * `help` are hand-maintained 12- and 45-line blocks that already drift. File
 * granularity makes "include only what you selected" trivially correct.
 */

/**
 * Prerequisites that span groups. The rule keeps a variable, and each
 * contributing group appends to it, so any subset stays valid in pure make.
 */
const CROSS_GROUP = {
  "push-check": {
    variable: "PUSH_CHECK_DEPS",
    contributions: {
      "api-build": ["api-lint", "api-test"],
      mobile: ["mobile-typecheck"],
    },
  },
  "api-docker-check": {
    variable: "API_CHECK_DEPS",
    contributions: {
      "api-build": ["api-lint", "api-test"],
    },
  },
};

const RULE_RE = /^([A-Za-z0-9_][A-Za-z0-9_ .-]*):(?!=)(.*)$/;
const VAR_RE = /^[A-Za-z_][A-Za-z0-9_]*\s*(\?=|:=|\+=|=)/;

/**
 * Parse the Makefile into units. A unit is a run of comment/blank/variable
 * lines followed by at most one rule (target line + its recipe).
 */
function parseUnits(lines) {
  const units = [];
  let pending = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Recipe lines and continuations belong to the rule already opened.
    const m = line.match(RULE_RE);
    if (m && !line.startsWith("\t")) {
      const targets = m[1].trim().split(/\s+/);
      const prereqs = m[2].trim();
      const body = [];
      i++;
      // Consume the recipe: tab-indented lines, blank lines inside the recipe,
      // and any line continued from the previous one.
      let continued = line.trimEnd().endsWith("\\");
      while (i < lines.length) {
        const l = lines[i];
        if (l.startsWith("\t") || continued) {
          continued = l.trimEnd().endsWith("\\");
          body.push(l);
          i++;
          continue;
        }
        break;
      }
      // Trailing blank lines are separators, not part of the recipe.
      while (body.length && body[body.length - 1].trim() === "") body.pop();

      units.push({ kind: "rule", targets, prereqs, body, lead: pending });
      pending = [];
      continue;
    }

    pending.push(line);
    i++;
  }

  if (pending.length) units.push({ kind: "trailer", lead: pending });
  return units;
}

/** Drop the hand-maintained .PHONY block and the hardcoded help rule. */
function isDroppedLead(lines) {
  return lines.some((l) => l.startsWith(".PHONY"));
}

function stripPhony(lines) {
  const out = [];
  let inPhony = false;
  for (const l of lines) {
    if (l.startsWith(".PHONY")) {
      inPhony = l.trimEnd().endsWith("\\");
      continue;
    }
    if (inPhony) {
      inPhony = l.trimEnd().endsWith("\\");
      continue;
    }
    out.push(l);
  }
  return out;
}

function trimBlank(lines) {
  const out = [...lines];
  while (out.length && out[0].trim() === "") out.shift();
  while (out.length && out[out.length - 1].trim() === "") out.pop();
  return out;
}

/**
 * @returns {{head: string, fragments: Map<string,string>, unmapped: string[]}}
 */
export function splitMakefile(source, groupMap) {
  const lines = source.split("\n");
  const units = parseUnits(lines);

  const unmapped = [];
  const byGroup = new Map();
  let headLines = [];
  let seenFirstRule = false;

  for (const unit of units) {
    if (unit.kind !== "rule") {
      // Everything before the first rule is the variable header.
      if (!seenFirstRule) headLines.push(...unit.lead);
      continue;
    }

    const primary = unit.targets[0];

    // The reference `help` rule is replaced by a generated, self-pruning one.
    if (primary === "help") {
      if (!seenFirstRule) headLines.push(...stripPhony(unit.lead));
      seenFirstRule = true;
      continue;
    }

    if (!seenFirstRule) {
      headLines.push(...stripPhony(unit.lead));
      seenFirstRule = true;
      unit.lead = [];
    }

    const entry = groupMap[primary];
    if (!entry) {
      unmapped.push(primary);
      continue;
    }

    const group = entry.group;
    if (!byGroup.has(group)) byGroup.set(group, { body: [], targets: [] });
    const { body: out, targets: groupTargets } = byGroup.get(group);
    // Every alias on the line is phony too (`start dev-up:`), so collect the
    // real target list rather than reading it back off the group map.
    groupTargets.push(...unit.targets);

    // Leading comments and variable assignments configure the rule that
    // follows, so they travel with it into the fragment.
    const lead = trimBlank(isDroppedLead(unit.lead) ? stripPhony(unit.lead) : unit.lead);
    if (lead.length) out.push(...lead);

    const cross = CROSS_GROUP[primary];
    const prereqs = cross ? `$(${cross.variable})` : unit.prereqs;
    const help = entry.help ? ` ## ${entry.help}` : "";
    // `#` opens a comment anywhere outside a recipe, so `target: deps ## text`
    // is valid make and greppable for the help rule.
    out.push(`${unit.targets.join(" ")}:${prereqs ? " " + prereqs : ""}${help}`);
    out.push(...unit.body);
    out.push("");
  }

  // Each fragment declares its own .PHONY and contributes cross-group deps.
  const fragments = new Map();
  for (const [group, { body, targets }] of byGroup) {
    const contributions = [];
    for (const [target, spec] of Object.entries(CROSS_GROUP)) {
      const adds = spec.contributions[group];
      if (adds) {
        contributions.push(
          `# Contributed to \`${target}\`; correct for any subset of groups.`,
          `${spec.variable} += ${adds.join(" ")}`,
          "",
        );
      }
    }

    const text = [
      `# ${group} targets.`,
      `.PHONY: ${targets.join(" ")}`,
      "",
      ...contributions,
      ...trimBlank(body),
      "",
    ].join("\n");
    fragments.set(group, text);
  }

  const head = [
    ...trimBlank(headLines),
    "",
    "# Group fragments. `wildcard` means a deselected group is simply absent,",
    "# not an error.",
    "include $(wildcard make/*.mk)",
    "",
    ".DEFAULT_GOAL := help",
    ".PHONY: help",
    "help: ## Show this help",
    "\t@echo \"__PROJECT_NAME__\"",
    "\t@echo \"\"",
    "\t@grep -hE '^[a-zA-Z0-9_.-][a-zA-Z0-9_ .-]*:.*##' $(MAKEFILE_LIST) \\",
    "\t  | sed 's/:.*##/##/' \\",
    "\t  | sort \\",
    "\t  | awk -F'##' '{printf \"  \\033[36m%-28s\\033[0m %s\\n\", $$1, $$2}'",
    "",
  ].join("\n");

  return { head, fragments, unmapped };
}
