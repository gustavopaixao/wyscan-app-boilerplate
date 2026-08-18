"use client";

import { type FormEvent, useState } from "react";
import { toAuthMessage, useSignIn } from "@/hooks/useAuth";
import { ta } from "@/lib/i18n/authStrings";

/**
 * Email + password only. Admins are provisioned by role, so there is
 * deliberately no register, forgot-password or OAuth path here — a password
 * reset goes through the member app or an operator.
 */
export function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const signIn = useSignIn();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await signIn.mutateAsync({ email, password });
    } catch (cause) {
      setError(toAuthMessage(cause));
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-4"
      noValidate
    >
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {ta("auth_sign_in_title")}
        </h1>
        <p className="mt-1.5 text-sm text-muted">{ta("auth_sign_in_prompt")}</p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}

      <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
        {ta("auth_email_label")}
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base font-normal text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25 sm:text-sm min-h-[44px]"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-foreground">
        {ta("auth_password_label")}
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-base font-normal text-foreground outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25 sm:text-sm min-h-[44px]"
        />
      </label>

      <button
        type="submit"
        disabled={signIn.isPending}
        aria-busy={signIn.isPending}
        className="min-h-[44px] w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-60"
      >
        {ta("auth_sign_in_submit")}
      </button>
    </form>
  );
}
