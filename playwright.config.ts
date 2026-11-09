import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a real local Supabase (`npx supabase start`)
 * and the Next.js app (`npm run build && npm run start`, or dev).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 2,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000",
    trace: "off",
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, testIgnore: /responsive\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /responsive\.spec\.ts/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run start", url: "http://127.0.0.1:3000/login", reuseExistingServer: true, timeout: 120_000 },
});
