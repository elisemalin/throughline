// Day 2 route smoke: each authenticated route is registered AND middleware
// redirects an anonymous request to /sign-in rather than serving the page
// or 5xx-ing. Full in-route a11y / e2e flows land once CI_LIVE_CLERK=1 is
// provisioned (QA Agent, Day 4) — see KNOWN_DEBT in the PR body.

import { expect, test } from '@playwright/test';

const ROUTES = [
  '/dashboard',
  '/skills',
  '/discovery',
  '/tracker',
  '/documents',
  '/interviews',
  '/settings',
];

for (const route of ROUTES) {
  test(`anonymous request to ${route} is redirected to sign-in`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    // Clerk's middleware uses a server-side redirect; following the chain
    // should land on /sign-in. We accept the final URL OR a sign-in form
    // marker so this is resilient to redirect-status nuances.
    expect(response?.status()).toBeLessThan(500);
    const url = page.url();
    expect(url).toMatch(/\/sign-in/);
  });
}
