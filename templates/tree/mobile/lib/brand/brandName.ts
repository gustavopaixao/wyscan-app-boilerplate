/**
 * Brand name resolver (domain layer, no React Native imports).
 *
 * __PROJECT_NAME__ ships a single brand across all locales; the resolver keeps the
 * same seam the reference implementation used for locale-conditional branding, so a future
 * locale-specific brand only touches this file.
 */
export const BRAND_NAME = "__PROJECT_NAME__";

export function brandNameForLocale(_tag: string | undefined): string {
  return BRAND_NAME;
}
