// Clerk-hosted sign-in.
//
// WHY: The catch-all `[[...sign-in]]` segment lets Clerk own multi-step
// flows (factor verification, password reset) on the same route without
// the Foundation Agent reimplementing them.

import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-6">
      <SignIn />
    </main>
  );
}
