import { SignInForm } from "@/components/auth/SignInForm";
import { BrandWordmark } from "@/components/layout/BrandWordmark";
import { ta } from "@/lib/i18n/authStrings";

export const metadata = {
  title: "Sign in · __PROJECT_NAME__ Admin",
};

/**
 * Split-screen sign-in.
 *
 * The form is on the LEFT and the brand panel on the right — the reverse of the
 * usual arrangement, and deliberate: the form is what the user came for, so it
 * sits where the eye lands first rather than behind a decorative panel.
 *
 * The brand panel is dropped entirely below `lg` and replaced by a compact
 * wordmark above the card, so a narrow window shows one focused column.
 */
export default function SignInPage() {
  return (
    <div className="flex min-h-dvh bg-background">
      <div className="flex w-full flex-1 items-center justify-center p-8 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
            <BrandWordmark />
            <p className="text-sm text-muted">{ta("auth_sign_in_subtitle")}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
            <SignInForm />
          </div>
        </div>
      </div>

      <div className="hidden w-1/2 items-center justify-center border-l border-border bg-card p-12 lg:flex">
        <div className="flex flex-col items-center gap-3">
          <BrandWordmark />
          <span className="h-1 w-10 rounded-full bg-accent" />
          <p className="text-sm text-muted">{ta("auth_sign_in_subtitle")}</p>
        </div>
      </div>
    </div>
  );
}
