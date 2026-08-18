import { Suspense } from "react";
import { VerifyForm } from "@/components/auth/VerifyForm";

/**
 * Wrapped in Suspense: VerifyForm reads the query string with
 * useSearchParams, which opts the route into client rendering and requires a
 * boundary at build time.
 */
export default function Page() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
