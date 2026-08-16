/**
 * Semantic color tokens (feature 0001). Every surface resolves colors through
 * this palette — never hard-code hex values in components.
 */
export type ColorSchemeName = "light" | "dark";

export type SemanticColors = {
  background: string;
  foreground: string;
  muted: string;
  accent: string;
  cardBackground: string;
  border: string;
};

const light: SemanticColors = {
  background: "#fafafa",
  foreground: "#18181b",
  muted: "#52525b",
  accent: "#2563eb",
  cardBackground: "#ffffff",
  border: "#e4e4e7",
};

const dark: SemanticColors = {
  background: "#0d1b2a",
  foreground: "#ffffff",
  muted: "#a1a1aa",
  accent: "#60a5fa",
  cardBackground: "#16263d",
  border: "rgba(255, 255, 255, 0.1)",
};

export function semanticColors(scheme: ColorSchemeName): SemanticColors {
  return scheme === "dark" ? dark : light;
}
