import { execSync } from "node:child_process";
import pg from "pg";

const TEST_DB = "spine_test";
const TEST_URL = `postgres://localhost:5432/${TEST_DB}`;

export default async function setup() {
  const admin = new pg.Client({ connectionString: "postgres://localhost:5432/postgres" });
  await admin.connect();
  // Recrea la BD de test desde cero cada vez: evita drift de esquema cuando
  // cambia schema.ts (drizzle-kit push no siempre altera una BD ya existente).
  await admin.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [TEST_DB]
  );
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  await admin.query(`CREATE DATABASE ${TEST_DB}`);
  await admin.end();

  execSync("npx drizzle-kit push --force", {
    env: { ...process.env, DATABASE_URL: TEST_URL },
    stdio: "pipe",
  });
}
