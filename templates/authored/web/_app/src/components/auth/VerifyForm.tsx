"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import {
  useAuthErrorMessage,
  useResendCode,
  useVerifyEmail,
} from "@/hooks/useAuth";
import { Link } from "@/i18n/navigation";
import { AuthCard } from "./AuthCard";
import { FormError } from "./fields/FormError";
import { SubmitButton } from "./fields/SubmitButton";
import { TextField } from "./fields/TextField";

/**
 * Reads `email` and `userId` from the query string — register and sign-in both
 * redirect here with them. `userId` is only needed to resend.
 */
export function VerifyForm() {
  const t = useTranslations("auth");
  const toMessage = useAuthErrorMessage();
  const params = useSearchParams();
  const email = params.get("email") ?? "";
  const userId = params.get("userId") ?? "";

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const verify = useVerifyEmail();
  const resend = useResendCode();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    try {
      // On success the hook stores the session and navigates; nothing to do here.
      await verify.mutateAsync({ email, code });
    } catch (cause) {
      setError(toMessage(cause));
    }
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    try {
      await resend.mutateAsync(userId);
      setNotice(t("codeResent"));
    } catch (cause) {
      setError(toMessage(cause));
    }
  }

  return (
    <AuthCard
      title={t("verifyTitle")}
      subtitle={t("verifySubtitle", { email })}
      footer={
        <Link href="/sign-in" className="underline underline-offset-4">
          {t("backToSignIn")}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <FormError message={error} />
        {notice ? <p className="text-sm text-foreground/70">{notice}</p> : null}

        <TextField
          label={t("codeLabel")}
          name="code"
          inputMode="text"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          maxLength={8}
          required
          value={code}
          // Uppercase as they type so the field matches the emailed code; the
          // client normalizes again before sending.
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="tracking-[0.3em]"
        />

        <SubmitButton pending={verify.isPending}>
          {t("verifySubmit")}
        </SubmitButton>
      </form>

      {userId ? (
        <button
          type="button"
          onClick={handleResend}
          disabled={resend.isPending}
          className="text-sm underline underline-offset-4 disabled:opacity-50"
        >
          {t("resendCode")}
        </button>
      ) : null}
    </AuthCard>
  );
}
