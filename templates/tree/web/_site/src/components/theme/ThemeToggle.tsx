"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { IoMoonOutline, IoSunnyOutline } from "react-icons/io5";

/**
 * Light/dark toggle (next-themes). Renders nothing until mounted to avoid a
 * hydration mismatch between the server-rendered icon and the client theme.
 */
export const ThemeToggle = () => {
  const t = useTranslations("theme");
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      aria-label={t("toggle")}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="rounded-full border border-border bg-card-bg p-2 text-foreground transition-colors hover:bg-accent-muted"
    >
      {isDark ? <IoSunnyOutline size={18} /> : <IoMoonOutline size={18} />}
    </button>
  );
};
