import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

/**
 * Wrapped in Suspense: ResetPasswordForm reads the query string with
 * useSearchParams, which opts the route into client rendering and requires a
 * boundary at build time.
 */
export default function Page() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
