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
import { SECONDARY_BUTTON_CLASS } from "@/lib/styles/formControlClassName";
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
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-wide text-muted">
          {t("orContinueWith")}
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <FormError message={error} />

      {isGoogleEnabled ? (
        <button
          type="button"
          onClick={run(google)}
          disabled={busy}
          className={SECONDARY_BUTTON_CLASS}
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
          className={SECONDARY_BUTTON_CLASS}
        >
          <FaApple aria-hidden className="size-4" />
          {t("continueWithApple")}
        </button>
      ) : null}
    </div>
  );
}
