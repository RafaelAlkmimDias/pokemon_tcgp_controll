import { config } from "dotenv";

// Integration tests must never read the app's real .env (DATABASE_URL) -
// only .env.test (TEST_DATABASE_URL). Loaded here, once, before any test file
// or testPrisma import runs.
config({ path: ".env.test" });
