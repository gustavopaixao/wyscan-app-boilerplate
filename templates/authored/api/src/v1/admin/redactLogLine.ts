/**
 * Scrub credentials out of a log line before it leaves the server.
 *
 * The admin log viewer takes whatever the container wrote to stdout and shows
 * it in a browser. Application logs are not written with that audience in mind:
 * a stack trace, a dumped request or a debug print routinely carries a bearer
 * token or a connection string. Once those reach the browser they are in
 * devtools, in a screenshot, and in whatever the operator pastes into a ticket.
 *
 * So the redaction happens on the API side, not in the UI — the value must
 * never be in the response at all. This is a safety net over careful logging,
 * not a substitute for it.
 */

/** Ordered most-specific-first; every pattern keeps its label and drops the value. */
const PATTERNS: Array<[RegExp, string]> = [
  // JWTs, which is what an access or refresh token looks like in a log.
  [
    /\beyJ[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]{6,}\.[A-Za-z0-9_-]+/g,
    "[redacted-jwt]",
  ],
  // A whole Authorization value, not just its Bearer form — `Basic dXNlcjpwdw==`
  // is a credential too, and the scheme is not worth preserving.
  [/\b(authorization)(\s*[=:]\s*)([^,;}\n]+)/gi, "$1$2[redacted]"],
  // A bare `Bearer <token>` outside a header, e.g. in a dumped request object.
  [/\bBearer\s+[A-Za-z0-9._~+/-]{8,}=*/g, "Bearer [redacted]"],
  // Credentials embedded in a connection string (mongodb://user:pass@host).
  [/\b([a-z][a-z0-9+.-]*:\/\/)([^:@\s/]+):([^@\s/]+)@/gi, "$1$2:[redacted]@"],
  // `key=value` / `key: value` for anything whose NAME says it is a secret.
  // `authorization` is handled above, where the whole value is taken.
  [
    /\b([A-Za-z0-9_.-]*(?:secret|password|passwd|token|api[_-]?key|apikey|credential|cookie|session)[A-Za-z0-9_.-]*)(\s*[=:]\s*)("[^"]*"|'[^']*'|[^\s,;}]+)/gi,
    "$1$2[redacted]",
  ],
];

export function redactLogLine(line: string): string {
  let out = line;
  for (const [pattern, replacement] of PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}
