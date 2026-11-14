import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    globalSetup: ["tests/globalSetup.ts"],
    fileParallelism: false,
    env: { DATABASE_URL: "file:./test.db", JWT_SECRET: "test-secret" },
    testTimeout: 20000,
  },
});
