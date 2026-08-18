"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { useAuthErrorMessage, useResetPassword } from "@/hooks/useAuth";
import { Link, useRouter } from "@/i18n/navigation";
import { AuthCard } from "./AuthCard";
import { FormError } from "./fields/FormError";
import { SubmitButton } from "./fields/SubmitButton";
import { TextField } from "./fields/TextField";

export function ResetPasswordForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const toMessage = useAuthErrorMessage();
  const params = useSearchParams();

  // Prefilled by the forgot-password redirect, but editable so a user who
  // opened the mail on another device can type it in.
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const reset = useResetPassword();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await reset.mutateAsync({ email, code, password });
      // The API revoked every session on reset, so there is nothing to adopt —
      // send them to sign in with the new password.
      router.push("/sign-in");
    } catch (cause) {
      setError(toMessage(cause));
    }
  }

  return (
    <AuthCard
      title={t("resetTitle")}
      subtitle={t("resetSubtitle")}
      footer={
        <Link href="/sign-in" className="underline underline-offset-4">
          {t("backToSignIn")}
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <FormError message={error} />

        <TextField
          label={t("emailLabel")}
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <TextField
          label={t("codeLabel")}
          name="code"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          maxLength={8}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="tracking-[0.3em]"
        />

        <TextField
          label={t("newPasswordLabel")}
          type="password"
          name="password"
          autoComplete="new-password"
          required
          hint={t("passwordHint")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <SubmitButton pending={reset.isPending}>
          {t("resetSubmit")}
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
