import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

/**
 * Held in a constant rather than inlined in the JSX: a long display name would
 * push the element past the line width and force a different wrapping than a
 * short one, so no single formatting of that line suits every project.
 */
const APP_NAME = "__PROJECT_NAME__";

/**
 * Chrome for the signed-out screens: centred card, theme toggle, no app nav
 * (there is nothing to navigate to yet).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between p-4">
        <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center p-4 pb-16">
        {children}
      </main>
    </div>
  );
}
