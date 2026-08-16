"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { AppThemeProvider } from "@/components/theme/AppThemeProvider";
import { STALE_TIME_MS } from "@/lib/cache/staleWhileRevalidate";

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: STALE_TIME_MS,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
          },
        },
      }),
  );
  return (
    <AppThemeProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </AppThemeProvider>
  );
}
