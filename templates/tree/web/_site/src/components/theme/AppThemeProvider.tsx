"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { THEME_STORAGE_KEY } from "@/lib/theme/theme-preference";

export const AppThemeProvider = ({ children }: { children: ReactNode }) => (
  <ThemeProvider
    attribute="class"
    defaultTheme="system"
    enableSystem
    storageKey={THEME_STORAGE_KEY}
  >
    {children}
  </ThemeProvider>
);
