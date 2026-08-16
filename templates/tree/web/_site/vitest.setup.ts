import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import React from "react";
import { afterEach, vi } from "vitest";
import { intlTestPathname } from "@/test/intl-pathname-for-vitest";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  intlTestPathname.current = "/";
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("dark"),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    priority: _p,
    unoptimized: _u,
    ...rest
  }: {
    src: string;
    alt: string;
    priority?: boolean;
    unoptimized?: boolean;
    [k: string]: unknown;
  }) => React.createElement("img", { src, alt, ...rest }),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    className,
    onClick,
    ...rest
  }: React.ComponentProps<"a"> & { href: string }) =>
    React.createElement("a", { href, className, onClick, ...rest }, children),
  usePathname: () => intlTestPathname.current,
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  redirect: vi.fn(),
  getPathname: () => intlTestPathname.current,
}));
