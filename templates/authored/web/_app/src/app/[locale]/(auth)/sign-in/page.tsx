import { Suspense } from "react";
import { SignInForm } from "@/components/auth/SignInForm";

/**
 * Wrapped in Suspense: SignInForm reads the `next` query parameter with
 * useSearchParams, which opts the route into client rendering and requires a
 * boundary at build time.
 */
export default function Page() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
