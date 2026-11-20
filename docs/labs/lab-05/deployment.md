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

## 4. Checks the app passes before it runs in the cloud

| Check | Result |
|---|---|
| No uploaded files stored on the container disk | The app has no upload feature; nothing is written to local files. |
| Seed safe to rerun, demo password from environment | Seed uses upserts; `DEMO_PASSWORD` is required and read from the environment. |
| No dev shortcuts | No way to act as a user without logging in; the login page shows no default password. |
| Sessions in the database | Login sessions and guest sessions are rows in Postgres, not server memory. |
| Port from `PORT` | `server/src/index.ts` reads `PORT`. |
| `/api/ready` | Returns 200 when the database answers and 503 when it does not; `/api/health` is the liveness check. |

## 5. Cloud resources (to be completed in Lab 5.5)

| Item | Value |
|---|---|
| Project | `cpe-se-course-2026` |
| Region | `asia-southeast1` |
| Team prefix | `sa3454e86` |
| Cloud Run service, migration job, registry, secret slots | Filled in from the portal's Team resources tab in Lab 5.5 |

## 6. Release procedure (to be completed in Lab 5.7)

Feature branch, pull request into `lab5-staging`, reviewed; release pull request from `lab5-staging`
into `main`; the pipeline tests, builds the image tagged by commit SHA, runs the migration job,
deploys to Cloud Run and smoke-tests `/api/ready`. How to read the running commit is added in Lab 5.7.
