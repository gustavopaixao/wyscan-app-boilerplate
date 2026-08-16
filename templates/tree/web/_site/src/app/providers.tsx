"use client";

import type { ReactNode } from "react";
import { AppThemeProvider } from "@/components/theme/AppThemeProvider";

export function Providers({ children }: { children: ReactNode }) {
  return <AppThemeProvider>{children}</AppThemeProvider>;
}
