# Slow Express: deployment guide (Lab 5)

Started in Issue "Lab 5.2", Docker section added in "Lab 5.3". Cloud resource names, the release procedure and the
smoke-test details are completed in Lab 5.5 and Lab 5.7.

## 1. Stack

| Part | Technology |
|---|---|
| API | Node.js (v24 on the development machine; the container's Node version is set in Lab 5.3), Express, TypeScript (run with `tsx`) |
| Database | PostgreSQL 16 (local: Docker container; cloud: Cloud SQL for PostgreSQL) |
| ORM and migrations | Prisma 5, committed migrations in `server/prisma/migrations/` |
| Web app | React 18 + Vite (built to static files and served by the API from the same origin) |
| Container | One `Dockerfile` (multi-stage, Node 24 alpine, runs as the non-root `node` user, listens on `$PORT`, default 8080) |
| Tests | Vitest (server and client), Playwright (browser journey AC-29) |
| Cloud | Google Cloud Run + Cloud SQL, provisioned by the course portal |

## 2. Environment variables

No value below is committed. `server/.env.example` holds placeholders only.

| Variable | Purpose | Secret? | Where the value comes from |
|---|---|---|---|
| `DATABASE_URL` | Postgres connection string | Yes | Local: your `server/.env`. Cloud: set by the portal on the service and migration job (not typed by us). |
| `JWT_SECRET` | Signs login and guest-session tokens | Yes | Local: your `server/.env`. Cloud: a portal secret slot (`<prefix>-app-secret-N`), never an env-var literal. |
| `DEMO_PASSWORD` | Password the seed gives the synthetic demo accounts | Yes | Local: your `server/.env`. Cloud: a portal secret slot. Never in code, never shown on screen. |
| `PORT` | Port the API listens on | No | Cloud Run sets it. Local default 4000. |
| `CORS_ORIGIN` | Browser origin allowed to call the API | No | Local `http://localhost:5173`. Cloud: the public service URL. |
| `TEST_DATABASE_URL` | Empty database used only by tests | Local test value only | Optional; default is the local Docker Postgres test database. |

Cloud rule from the course: change variables with `--update-env-vars` (changes only what you list);
never `--set-env-vars` (it replaces everything). No password or key goes in env vars or Git.

## 3. Commands

Local database (once):

```bash
docker run -d --name slowexpress-pg -e POSTGRES_USER=slowexpress -e POSTGRES_PASSWORD=localdev \
  -e POSTGRES_DB=slowexpress -p 5433:5432 postgres:16-alpine
docker exec slowexpress-pg psql -U slowexpress -c "create database slowexpress_test;"
```

Build, test, run, migrate, seed (from `server/` unless stated):

| Task | Command |
|---|---|
| Install | `npm install` |
| Migrate (apply committed migrations) | `npm run db:migrate` |
| Create a new migration (developers only) | `npm run db:migrate:dev -- --name <change>` |
| Seed (safe to run twice) | `npm run seed` |
| Run the API | `npm start` |
| Server tests | `npm test` |
| Type check | `npx tsc --noEmit` |
| Web app (from `client/`) | `npm run dev`, `npm test`, `npm run build`, `npm run test:e2e` |

## 3b. Run everything with Docker (fresh clone)

```bash
git clone https://github.com/Decaa0/slowexpress.git && cd slowexpress
cp .env.example .env            # placeholders for local use; edit if you like
docker compose up --build       # db + one-off migrate/seed + app
open http://localhost:8080      # health: /api/health, readiness: /api/ready
```

| Service | What it does |
|---|---|
| `db` | Postgres 16 with a named volume (`slowexpress_pgdata`), so data survives `docker compose restart` and `down` (not `down -v`) |
| `migrate` | Runs `prisma migrate deploy` then the idempotent seed from the same image, then exits |
| `app` | The API plus the built web app on port 8080 |

The root `.env.example` feeds `docker-compose.yml` (`POSTGRES_*`, `JWT_SECRET`, `DEMO_PASSWORD`, `APP_PORT`). The image
contains no secrets: `DATABASE_URL`, `JWT_SECRET` and `DEMO_PASSWORD` arrive as environment variables at run time.

## 3c. Continuous integration (`.github/workflows/ci-docker.yml`)

Workflow "CI & Docker Build", job id **`test-and-docker`** (the required check on `main`, Lab 5.6). It runs on every
pull request into `lab5-staging` and `main`, manually (`workflow_dispatch`), and as a reusable workflow
(`workflow_call`, used by the deploy workflow). It never deploys.

| Step | What it proves |
|---|---|
| Backend: `npm ci`, `npx tsc --noEmit`, `npm test` | Type check and all server tests against a throw-away Postgres 16 service; the test setup rebuilds an empty database from the committed migrations |
| Frontend: `npm ci`, `npm test`, `npm run build` | Component tests and the production build |
| `docker build` | The production `Dockerfile` still builds |

CI uses CI-only values (`TEST_DATABASE_URL` points at the service container with a throw-away password); no repository
secret is needed. Third-party actions are pinned to a commit SHA. A failing test fails the job, and once the ruleset from
Lab 5.6 is on, a failing check blocks the merge.

## 4. Checks the app passes before it runs in the cloud

| Check | Result |
|---|---|
| No uploaded files stored on the container disk | The app has no upload feature; nothing is written to local files. |
| Seed safe to rerun, demo password from environment | Seed uses upserts; `DEMO_PASSWORD` is required and read from the environment. |
| No dev shortcuts | No way to act as a user without logging in; the login page shows no default password. |
| Sessions in the database | Login sessions and guest sessions are rows in Postgres, not server memory. |
| Port from `PORT` | `server/src/index.ts` reads `PORT`. |
| `/api/ready` | Returns 200 when the database answers and 503 when it does not; `/api/health` is the liveness check. |

## 5. Cloud resources (from the course portal, Lab 5.5)

| Item | Value |
|---|---|
| Project | `cpe-se-course-2026` |
| Region | `asia-southeast1` |
| Team prefix | `sa3454e86` |
| Cloud Run service | `sa3454e86` (URL `https://sa3454e86-4d7hbszvwq-as.a.run.app`) |
| Migration job | `sa3454e86-migrate` |
| Cloud SQL instance | `sa3454e86-pg` (one instance, PostgreSQL) |
| Artifact Registry repository | `sa3454e86` |
| Runtime service account | `sa3454e86-runner@cpe-se-course-2026.iam.gserviceaccount.com` |
| Deployer service account | `sa3454e86-deployer@cpe-se-course-2026.iam.gserviceaccount.com` (used through Workload Identity, no key file) |
| Secret names (values never in Git) | `sa3454e86-database-url`, `sa3454e86-admin-password`, `sa3454e86-demo-password`, slots `sa3454e86-app-secret-1` to `5` |

GitHub environment `demo` holds four variables, none of them secret: `GCP_PROJECT_ID`, `GCP_REGION`,
`WIF_PROVIDER`, `WIF_SERVICE_ACCOUNT`. `MIGRATE_COMMAND` is `npx prisma migrate deploy`.
The app also needs `JWT_SECRET` at run time; it is stored in a secret slot, never in an environment
variable that is committed.

## 6. Release procedure (Lab 5.7)

1. Open an Issue labelled `lab5`; branch from `lab5-staging` (`feature/<name>`).
2. Open a pull request into `lab5-staging` with the same title as the Issue. CI (`test-and-docker`) must pass and a
   reviewer approves; then the pull request is merged.
3. Open a release pull request from `lab5-staging` into `main`. The `protect-main` ruleset needs the
   `test-and-docker` check and one approval.
4. Merging into `main` starts `.github/workflows/deploy.yml` ("Deploy to Google Cloud"). It signs in with
   Workload Identity (no key), builds the Dockerfile, tags the image with the commit SHA, pushes it to
   Artifact Registry, runs `npx prisma migrate deploy` in the `sa3454e86-migrate` job and deploys the
   Cloud Run service `sa3454e86`.
5. Check the release: open the Actions run summary (it prints the image and URL), then
   `https://sa3454e86-4d7hbszvwq-as.a.run.app/api/ready` must answer 200. The running image tag is the full
   commit SHA of the release commit.
