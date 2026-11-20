import { execSync } from "node:child_process";
import { TEST_DATABASE_URL } from "./testEnv";

/** Rebuild an empty Postgres test database from the committed migrations. */
export default function setup() {
  execSync("npx prisma migrate reset --force --skip-generate --skip-seed", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "ignore",
  });
}
