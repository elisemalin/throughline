// Smoke: sign-in route mounts.
//
// WHY: Clerk-rendered assertions (looking up "Sign in" headings the Clerk
// form injects) require a Clerk publishable key and a full session-context
// boot. On Day 1 the only smoke we can run without credentials is a
// "the route serves 200 and the App Router shell painted a <main>" check.
// The full Clerk-rendered assertions live in a separate spec that runs
// only when CI_LIVE_CLERK=1 (QA Agent will add that spec on Day 4 once
// real test credentials are seeded).

import { expect, test } from '@playwright/test';

test('sign-in route returns 200 and renders the app shell', async ({
  page,
}) => {
  const response = await page.goto('/sign-in');
  expect(response?.status()).toBe(200);
  // The App Router root layout wraps every route in <body><main>...
  // children</main></body>; a present <main> confirms the shell rendered
  // even if Clerk's form failed to mount because the publishable key is
  // absent in CI.
  await expect(page.locator('main').first()).toBeAttached({
    timeout: 30_000,
  });
});
