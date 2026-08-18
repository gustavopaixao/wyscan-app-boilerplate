"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { useAuthErrorMessage, useForgotPassword } from "@/hooks/useAuth";
import { Link, useRouter } from "@/i18n/navigation";
import { AuthCard } from "./AuthCard";
import { FormError } from "./fields/FormError";
import { SubmitButton } from "./fields/SubmitButton";
import { TextField } from "./fields/TextField";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const toMessage = useAuthErrorMessage();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const forgot = useForgotPassword();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await forgot.mutateAsync(email);
      // The API answers identically for known and unknown addresses, so we
      // always advance to the reset screen. Branching on the response here
      // would reintroduce the account oracle the API is careful to avoid.
      router.push(`/reset-password?email=${encodeURIComponent(email)}`);
    } catch (cause) {
      setError(toMessage(cause));
    }
  }

  return (
    <AuthCard
      title={t("forgotTitle")}
      subtitle={t("forgotSubtitle")}
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

        <SubmitButton pending={forgot.isPending}>
          {t("forgotSubmit")}
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
