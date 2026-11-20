// Synthetic, test-only values (not secrets). CI and docker-compose provide TEST_DATABASE_URL.
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || "postgresql://slowexpress:localdev@localhost:5433/slowexpress_test";
export const TEST_DEMO_PASSWORD = "test-only-demo-password";
