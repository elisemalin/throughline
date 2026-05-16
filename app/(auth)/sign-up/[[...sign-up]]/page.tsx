// Clerk-hosted sign-up.
//
// WHY: Mirrors sign-in. The User row is mirrored from Clerk into Postgres on
// first authenticated request by a Backend Core helper (Day 2+); Foundation
// Agent only ships the front door.

import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-6">
      <SignUp />
    </main>
  );
}
