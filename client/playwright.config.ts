import { defineConfig } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Fresh isolated database per invocation; never seed or reset the developer DB.
// Workers re-evaluate this file, so the path is created once and shared through the environment.
const database = process.env.E2E_DATABASE_URL ?? `file:${join(mkdtempSync(join(tmpdir(), 'slowexpress-e2e-')), 'test.db')}`;
process.env.E2E_DATABASE_URL = database;
process.env.DATABASE_URL = database;
export default defineConfig({
  testDir: './e2e', workers: 1, retries: 0, timeout: 45000,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5175', headless: true, trace: 'retain-on-failure' },
  webServer: [
    { command: 'npm run db:push && npm run seed && npm start', cwd: '../server',
      port: 4005, timeout: 120000,
      reuseExistingServer: false,
      env: { DATABASE_URL: database, PORT: '4005', JWT_SECRET: 'isolated-e2e-only-not-production', CORS_ORIGIN: 'http://127.0.0.1:5175' } },
    { command: 'npm run dev -- --host 127.0.0.1 --port 5175 --strictPort',
      url: 'http://127.0.0.1:5175', reuseExistingServer: false,
      env: { VITE_API_TARGET: 'http://127.0.0.1:4005' } }
  ]
});
