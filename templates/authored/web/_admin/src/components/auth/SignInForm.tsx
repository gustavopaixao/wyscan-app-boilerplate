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
      className="flex w-full max-w-sm flex-col gap-4"
      noValidate
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {ta("auth_sign_in_title")}
        </h1>
        <p className="mt-1.5 text-sm text-foreground/70">
          {ta("auth_sign_in_subtitle")}
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      ) : null}

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {ta("auth_email_label")}
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2.5 text-base font-normal outline-none focus:ring-2 focus:ring-current dark:border-white/15"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {ta("auth_password_label")}
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-black/10 bg-transparent px-3 py-2.5 text-base font-normal outline-none focus:ring-2 focus:ring-current dark:border-white/15"
        />
      </label>

      <button
        type="submit"
        disabled={signIn.isPending}
        aria-busy={signIn.isPending}
        className="w-full rounded-lg bg-foreground px-4 py-2.5 text-base font-medium text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {ta("auth_sign_in_submit")}
      </button>
    </form>
  );
}
