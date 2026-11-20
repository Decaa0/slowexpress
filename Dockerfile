# Slow Express: one image that serves the API and the built web app.
# Build from the repo root:  docker build -t slowexpress .
# Secrets (DATABASE_URL, JWT_SECRET, DEMO_PASSWORD) are NEVER baked in; they arrive as
# environment variables at run time. Cloud Run sets PORT itself.

# ---- Stage 1: build the web app (React + Vite) ------------------------------
FROM node:24-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- Stage 2: runtime (Express + Prisma, run with tsx) ----------------------
FROM node:24-alpine AS production
WORKDIR /app/server
# Prisma's query engine needs openssl on alpine.
RUN apk add --no-cache openssl
COPY server/package*.json ./
# tsx (runs the TypeScript server and seed) and prisma (migrations) are dev dependencies
# in package.json, so install everything; the migration job reuses this same image.
RUN npm ci
COPY server/ ./
RUN npx prisma generate
# The built web app is served by Express from /app/client/dist.
COPY --from=client-builder /app/client/dist /app/client/dist
ENV NODE_ENV=production \
    PORT=8080 \
    CLIENT_DIST=/app/client/dist
EXPOSE 8080
# Do not run as root.
RUN chown -R node:node /app
USER node
CMD ["npx", "tsx", "src/index.ts"]
