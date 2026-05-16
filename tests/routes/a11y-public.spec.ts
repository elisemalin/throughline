// @a11y — axe-core scan over the public routes that don't require Clerk
// credentials. Authenticated-route a11y runs in tests/routes/a11y-app.spec.ts
// once CI_LIVE_CLERK=1 is wired (carry-over).

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('@a11y /sign-in has zero axe-core violations', async ({ page }) => {
  await page.goto('/sign-in', { waitUntil: 'domcontentloaded' });
  await page.locator('main').first().waitFor({ timeout: 30_000 });
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    // Clerk renders its hosted form via iframe; we can only audit what we
    // own. Exclude the Clerk-injected region so its internal markup
    // doesn't pollute the report. QA Agent's CI_LIVE_CLERK run targets the
    // hosted form directly via Clerk's testing helpers.
    .exclude('[data-clerk-publishable-key], iframe')
    .analyze();
  expect(results.violations).toEqual([]);
});
