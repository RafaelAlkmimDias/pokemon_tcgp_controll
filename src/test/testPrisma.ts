import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Dedicated Prisma client for integration tests, wired to TEST_DATABASE_URL -
// a variable name that is NEVER read by the real app (which only reads
// DATABASE_URL, see src/lib/prisma.ts). This makes it structurally impossible
// for a missing/misconfigured env var to silently fall back to the real
// database: if TEST_DATABASE_URL isn't set, this throws instead of guessing.
const connectionString = process.env.TEST_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "TEST_DATABASE_URL is not set. Integration tests must run against the isolated " +
      "db_test database (see docker-compose.yml and .env.test) - refusing to start " +
      "without it rather than risk touching the real database.",
  );
}

if (connectionString.includes("@db:") || !connectionString.includes("test")) {
  throw new Error(
    `TEST_DATABASE_URL ("${connectionString}") doesn't look like the isolated test ` +
      "database. Refusing to run integration tests against it.",
  );
}

const adapter = new PrismaPg({ connectionString });

export const testPrisma = new PrismaClient({ adapter });

// Deletes all app data from the test database, in FK-safe order. Called
// between tests so each one starts from a clean slate.
export async function resetTestDatabase() {
  await testPrisma.deckCard.deleteMany();
  await testPrisma.deck.deleteMany();
  await testPrisma.cardPack.deleteMany();
  await testPrisma.card.deleteMany();
  await testPrisma.pack.deleteMany();
  await testPrisma.print.deleteMany();
  await testPrisma.collection.deleteMany();
}
