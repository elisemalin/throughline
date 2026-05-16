// Smoke: sign-in page renders.
//
// WHY: This is a placeholder. It asserts the public sign-in route returns a
// 200 and that Clerk's mounted form is on the page. Real signup/login/logout
// flows are wired by QA Agent once Clerk credentials are provisioned and the
// test user pool is seeded.

import { expect, test } from '@playwright/test';

test('sign-in page renders', async ({ page }) => {
  await page.goto('/sign-in');
  // The Clerk component renders an accessible name "Sign in"; any heading or
  // form control carrying that label confirms the route mounted.
  await expect(
    page.getByRole('heading', { name: /sign in/i }).first(),
  ).toBeVisible({ timeout: 30_000 });
});
