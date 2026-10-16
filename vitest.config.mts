import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [react()],
  test: {
    environment: "node",
    // e2e/**/*.spec.ts are Playwright specs, run only via `npm run test:e2e` -
    // they use Playwright's own test()/expect, which conflicts with Vitest's.
    exclude: ["**/node_modules/**", "e2e/**"],
    setupFiles: ["./src/test/setupIntegration.ts", "./src/test/setupUnit.ts"],
    // Integration tests share one test database and truncate it between
    // tests - running files in parallel would let them stomp on each other.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/lib/**", "src/components/**"],
      exclude: [
        "src/test/**",
        // Async Server Components - Next.js's own Vitest guide notes these
        // aren't renderable under Vitest; covered by manual/E2E checks instead
        // (see docs/testing.md).
        "src/app/**",
        "src/generated/**",
        // Pure Prisma client wiring - needs a real DB connection to exercise
        // meaningfully; already exercised indirectly via the integration
        // tests, which mock this module out for a test-DB-backed client.
        "src/lib/prisma.ts",
      ],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 80,
      },
    },
  },
});
