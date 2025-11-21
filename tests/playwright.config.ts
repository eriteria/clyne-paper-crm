import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for E2E tests
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",

  /* Run tests in files in parallel */
  fullyParallel: false, // Changed to false to reduce load

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. Limit workers locally too */
  workers: process.env.CI ? 1 : 2, // Reduced from 8 to 2 workers  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ["html", { outputFolder: "reports/playwright-html" }],
    ["junit", { outputFile: "reports/junit/e2e-results.xml" }],
    ["list"],
  ],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    /* Screenshot on failure */
    screenshot: "only-on-failure",

    /* Video on failure */
    video: "retain-on-failure",

    /* Timeout for actions */
    actionTimeout: 30000,

    /* Navigation timeout - increased for slow initial page loads */
    navigationTimeout: 60000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },

    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },

    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },

    /* Test against mobile viewports. */
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.CI
    ? undefined
    : [
        {
          command: "cd ../backend && run-test-server.bat",
          url: "http://localhost:5000/health",
          reuseExistingServer: true, // Always reuse existing server (start manually)
          timeout: 180 * 1000, // 3 minutes for backend to start
        },
        {
          command: "cd ../frontend && npm run dev",
          url: "http://localhost:3000",
          reuseExistingServer: true, // Always reuse existing server (start manually)
          timeout: 180 * 1000, // 3 minutes for frontend to start
          stdout: "pipe",
          stderr: "pipe",
        },
      ],

  /* Global timeout - increased for slow initial loads */
  timeout: 120 * 1000,

  /* Expect timeout */
  expect: {
    timeout: 15 * 1000,
  },
});
