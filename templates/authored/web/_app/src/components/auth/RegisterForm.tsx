"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { useAuthErrorMessage, useRegister } from "@/hooks/useAuth";
import { Link, useRouter } from "@/i18n/navigation";
import { AuthCard } from "./AuthCard";
import { AuthLegalNotice } from "./AuthLegalNotice";
import { FormError } from "./fields/FormError";
import { SubmitButton } from "./fields/SubmitButton";
import { TextField } from "./fields/TextField";
import { OAuthButtons } from "./OAuthButtons";

export function RegisterForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const toMessage = useAuthErrorMessage();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const register = useRegister();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const result = await register.mutateAsync({
        email,
        password,
        displayName,
      });
      // Registration never returns a session — the account is PENDING until the
      // emailed code is confirmed.
      router.push(
        `/verify?email=${encodeURIComponent(result.email)}&userId=${result.userId}`,
      );
    } catch (cause) {
      setError(toMessage(cause));
    }
  }

  return (
    <AuthCard
      title={t("registerTitle")}
      subtitle={t("registerSubtitle")}
      footer={
        <>
          {t("haveAccount")}{" "}
          <Link
            href="/sign-in"
            className="font-medium underline underline-offset-4"
          >
            {t("signInLink")}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <FormError message={error} />

        <TextField
          label={t("displayNameLabel")}
          name="displayName"
          autoComplete="name"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />

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
          autoComplete="new-password"
          required
          hint={t("passwordHint")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <SubmitButton pending={register.isPending}>
          {t("registerSubmit")}
        </SubmitButton>
      </form>

      <OAuthButtons />
      <AuthLegalNotice />
    </AuthCard>
  );
}
