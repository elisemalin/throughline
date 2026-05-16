import { defineConfig, devices } from '@playwright/test';

// WHY: The smoke suite boots the Next dev server and asserts the sign-in
// page renders. CI does not run this on Day 1 because dev server boot needs
// Clerk env vars; the placeholder spec keeps the harness wired so once
// credentials land in Vercel secrets, `pnpm test:smoke` is a one-line addition
// to the workflow.

export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    // Dev server can take a while on a cold Prisma generate; 2 minutes covers
    // the slowest path observed locally.
    timeout: 120_000,
  },
});
