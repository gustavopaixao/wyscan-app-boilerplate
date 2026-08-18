"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { useAuthErrorMessage, useSignIn } from "@/hooks/useAuth";
import { Link, useRouter } from "@/i18n/navigation";
import { AuthCard } from "./AuthCard";
import { AuthLegalNotice } from "./AuthLegalNotice";
import { FormError } from "./fields/FormError";
import { SubmitButton } from "./fields/SubmitButton";
import { TextField } from "./fields/TextField";
import { OAuthButtons } from "./OAuthButtons";

export function SignInForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const toMessage = useAuthErrorMessage();
  // Set by the session gate when it bounced an unauthenticated visitor.
  const next = useSearchParams().get("next") ?? undefined;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const signIn = useSignIn(next);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const result = await signIn.mutateAsync({ email, password });
      // An unverified account gets a 200 with no session — finish signup rather
      // than reporting a failure the user cannot act on.
      if (result.requiresVerification) {
        router.push(
          `/verify?email=${encodeURIComponent(result.email)}&userId=${result.userId}`,
        );
      }
    } catch (cause) {
      setError(toMessage(cause));
    }
  }

  return (
    <AuthCard
      title={t("signInTitle")}
      subtitle={t("signInSubtitle")}
      footer={
        <>
          {t("noAccount")}{" "}
          <Link
            href="/register"
            className="font-medium underline underline-offset-4"
          >
            {t("registerLink")}
          </Link>
        </>
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
          label={t("passwordLabel")}
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="-mt-1 text-right">
          <Link
            href="/forgot-password"
            className="text-sm underline underline-offset-4"
          >
            {t("forgotLink")}
          </Link>
        </div>

        <SubmitButton pending={signIn.isPending}>
          {t("signInSubmit")}
        </SubmitButton>
      </form>

      <OAuthButtons next={next} />
      <AuthLegalNotice />
    </AuthCard>
  );
}
