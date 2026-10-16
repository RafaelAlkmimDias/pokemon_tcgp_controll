import { config } from "dotenv";
import { spawnSync } from "node:child_process";

// Pushes the Prisma schema to the isolated test database only, via --url so
// it never touches prisma.config.ts's env("DATABASE_URL") (the real app's
// connection string) at all.
config({ path: ".env.test" });

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.error("TEST_DATABASE_URL is not set (check .env.test). Aborting.");
  process.exit(1);
}
if (url.includes("@db:") || !url.includes("test")) {
  console.error(`TEST_DATABASE_URL ("${url}") doesn't look like the test database. Aborting.`);
  process.exit(1);
}

const result = spawnSync(
  "npx",
  ["prisma", "db", "push", "--url", url, "--accept-data-loss"],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
