/**
 * Dev-only guard for a Next.js + Turbopack profiling bug where
 * performance.measure() throws when route timing marks are invalid
 * (e.g. redirects, notFound, fast navigations).
 *
 * @see https://github.com/vercel/next.js/issues/86060
 */
if (process.env.NODE_ENV === "development") {
  try {
    const perf = performance;

    if (
      perf &&
      typeof perf.measure === "function" &&
      !(perf as Performance & { __patched?: boolean }).__patched
    ) {
      const original = perf.measure.bind(perf);

      perf.measure = function patchedMeasure(
        ...args: Parameters<Performance["measure"]>
      ) {
        try {
          return original(...args);
        } catch (err) {
          const message = err instanceof Error ? err.message : "";
          const name = err instanceof Error ? err.name : "";
          if (
            message.includes("negative time stamp") ||
            message.includes("end cannot be negative") ||
            name === "InvalidAccessError" ||
            name === "SyntaxError"
          ) {
            return undefined;
          }
          throw err;
        }
      } as Performance["measure"];

      (perf as Performance & { __patched?: boolean }).__patched = true;
    }
  } catch {
    // Ignore patch failures; dev profiling is non-critical.
  }
}
