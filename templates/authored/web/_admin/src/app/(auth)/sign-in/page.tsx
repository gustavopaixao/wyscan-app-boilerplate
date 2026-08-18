import { SignInForm } from "@/components/auth/SignInForm";

export const metadata = {
  title: "Sign in · __PROJECT_NAME__ Admin",
};

export default function Page() {
  return (
    <div className="flex min-h-dvh items-center justify-center p-6">
      <SignInForm />
    </div>
  );
}
