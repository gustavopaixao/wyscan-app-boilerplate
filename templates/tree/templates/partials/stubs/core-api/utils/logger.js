// STUB — replace with __NPM_SCOPE__/core-api when you adopt the shared packages.
// See docs/shared-packages.md.

const stamp = () => new Date().toISOString();
const emit = (level, stream) => (message, meta) =>
  stream(`${stamp()} [${level}] ${message}${meta ? " " + JSON.stringify(meta) : ""}`);

export const logger = {
  debug: emit("debug", console.debug),
  info: emit("info", console.info),
  warn: emit("warn", console.warn),
  error: emit("error", console.error),
};
