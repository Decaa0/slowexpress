import { defineConfig } from '@playwright/test';

// Fresh isolated database per invocation; never seed or reset the developer DB.
// Workers re-evaluate this file, so the path is created once and shared through the environment.
// Postgres: a dedicated empty database that is rebuilt from the committed migrations on every run.
const database = process.env.E2E_DATABASE_URL ?? 'postgresql://slowexpress:localdev@localhost:5433/slowexpress_e2e';
// Synthetic, test-only password for the seeded demo accounts (not a real credential).
process.env.DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'e2e-only-demo-password';
process.env.E2E_DATABASE_URL = database;
process.env.DATABASE_URL = database;
export default defineConfig({
  testDir: './e2e', workers: 1, retries: 0, timeout: 45000,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5175', headless: true, trace: 'retain-on-failure' },
  webServer: [
    { command: 'npx prisma migrate reset --force --skip-seed --skip-generate && npm run seed && npm start', cwd: '../server',
      port: 4005, timeout: 120000,
      reuseExistingServer: false,
      env: { DATABASE_URL: database, DEMO_PASSWORD: process.env.DEMO_PASSWORD!, PORT: '4005', JWT_SECRET: 'isolated-e2e-only-not-production', CORS_ORIGIN: 'http://127.0.0.1:5175' } },
    { command: 'npm run dev -- --host 127.0.0.1 --port 5175 --strictPort',
      url: 'http://127.0.0.1:5175', reuseExistingServer: false,
      env: { VITE_API_TARGET: 'http://127.0.0.1:4005' } }
  ]
});
