import { execSync } from "node:child_process";
import pg from "pg";

const TEST_DB = "spine_test";
const TEST_URL = `postgres://localhost:5432/${TEST_DB}`;

export default async function setup() {
  const admin = new pg.Client({ connectionString: "postgres://localhost:5432/postgres" });
  await admin.connect();
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [TEST_DB]);
  if (!exists.rowCount) await admin.query(`CREATE DATABASE ${TEST_DB}`);
  await admin.end();

  execSync("npx drizzle-kit push --force", {
    env: { ...process.env, DATABASE_URL: TEST_URL },
    stdio: "pipe",
  });
}
