import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

// E2E tests must run against the isolated test database only - never the
// real one. Load .env.test (TEST_DATABASE_URL), the same variable name the
// rest of the test suite uses, and refuse to start otherwise.
config({ path: ".env.test" });

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL is not set (check .env.test). Refusing to run E2E tests without " +
      "the isolated test database.",
  );
}
if (testDatabaseUrl.includes("@db:") || !testDatabaseUrl.includes("test")) {
  throw new Error(
    `TEST_DATABASE_URL ("${testDatabaseUrl}") doesn't look like the test database. ` +
      "Refusing to run E2E tests against it.",
  );
}

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Specs share one seeded test database (see e2e/global-setup.ts) - keep
  // runs serial so they can't race each other's writes.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  globalSetup: "./e2e/global-setup.ts",
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  // Spins up a real Next.js dev server bound only to the test database -
  // DATABASE_URL here is deliberately TEST_DATABASE_URL, never the app's own.
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: testDatabaseUrl,
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
