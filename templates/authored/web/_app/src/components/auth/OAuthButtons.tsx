"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { FaApple, FaGoogle } from "react-icons/fa6";
import { useAuthErrorMessage, useOAuth } from "@/hooks/useAuth";
import {
  isAppleEnabled,
  isGoogleEnabled,
  isOAuthEnabled,
} from "@/lib/auth/oauth-config";
import { FormError } from "./fields/FormError";

/**
 * Renders NOTHING when no provider is configured, so a generated project with
 * no OAuth credentials shows a clean email/password form rather than buttons
 * that fail on click.
 */
export function OAuthButtons({ next }: { next?: string }) {
  const t = useTranslations("auth");
  const toMessage = useAuthErrorMessage();
  const [error, setError] = useState<string | null>(null);

  const google = useOAuth("google", next);
  const apple = useOAuth("apple", next);

  if (!isOAuthEnabled) return null;

  const run = (mutation: typeof google) => async () => {
    setError(null);
    try {
      await mutation.mutateAsync();
    } catch (cause) {
      setError(toMessage(cause));
    }
  };

  const busy = google.isPending || apple.isPending;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-black/10 dark:bg-white/15" />
        <span className="text-xs uppercase tracking-wide text-foreground/50">
          {t("orContinueWith")}
        </span>
        <span className="h-px flex-1 bg-black/10 dark:bg-white/15" />
      </div>

      <FormError message={error} />

      {isGoogleEnabled ? (
        <button
          type="button"
          onClick={run(google)}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-black/10 px-4 py-2.5 text-sm font-medium transition hover:bg-black/[0.03] disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/[0.06]"
        >
          <FaGoogle aria-hidden className="size-4" />
          {t("continueWithGoogle")}
        </button>
      ) : null}

      {isAppleEnabled ? (
        <button
          type="button"
          onClick={run(apple)}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-black/10 px-4 py-2.5 text-sm font-medium transition hover:bg-black/[0.03] disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/[0.06]"
        >
          <FaApple aria-hidden className="size-4" />
          {t("continueWithApple")}
        </button>
      ) : null}
    </div>
  );
}
