/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import { TEST_DATABASE_URL, TEST_DEMO_PASSWORD } from "./tests/testEnv";
export default defineConfig({
  test: {
    globalSetup: ["tests/globalSetup.ts"],
    fileParallelism: false,
    env: { DATABASE_URL: TEST_DATABASE_URL, JWT_SECRET: "test-secret", DEMO_PASSWORD: TEST_DEMO_PASSWORD },
    testTimeout: 20000,
  },
});
