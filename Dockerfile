FROM node:22-alpine AS builder

# Cache bust - this RUN command uses the ARG, forcing all subsequent layers to rebuild
ARG CACHE_BUST
RUN echo "Cache bust: ${CACHE_BUST}"

ARG BUILD_VERSION
ARG GIT_COMMIT
ARG BUILD_TIME

ENV BUILD_VERSION=${BUILD_VERSION}
ENV GIT_COMMIT=${GIT_COMMIT}
ENV BUILD_TIME=${BUILD_TIME}

WORKDIR /app

# Install build dependencies required for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++ pkgconfig

# Update npm to latest version to avoid deprecation notices
RUN npm install -g npm@latest

# Copy package files and prisma schema (needed for postinstall prisma generate)
COPY package*.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN npm install

# Copy source code and build (invalidates on code changes only)
COPY next.config.ts tsconfig.json postcss.config.mjs eslint.config.js ./
COPY app ./app/
COPY components ./components/
COPY lib ./lib/
COPY types ./types/
COPY public ./public/
COPY proxy.ts ./
COPY messages ./messages/
COPY scripts ./scripts/

# Provide dummy env vars required by the Zod env schema during build.
# These are NOT used at runtime — the real values come from the deployment environment.
RUN DATABASE_URL="file:./build.db" \
    NEXTAUTH_URL="http://localhost:3000" \
    NEXTAUTH_SECRET="build-time-placeholder-secret-minimum-32-chars" \
    GOOGLE_CLIENT_ID="build-placeholder" \
    GOOGLE_CLIENT_SECRET="build-placeholder" \
    npm run build

# Generate version.json
RUN echo "{\"version\":\"${BUILD_VERSION}\",\"git_commit\":\"${GIT_COMMIT}\",\"build_time\":\"${BUILD_TIME}\",\"node_env\":\"production\"}" > public/version.json

FROM node:22-alpine AS runner

# OCI image labels — TrueNAS SCALE reads these for "App Version" / "Version" display
ARG BUILD_VERSION
ARG GIT_COMMIT
ARG BUILD_TIME
LABEL org.opencontainers.image.title="Proman" \
      org.opencontainers.image.description="Property Management System" \
      org.opencontainers.image.version="${BUILD_VERSION}" \
      org.opencontainers.image.source="https://github.com/JIGLE/proman" \
      org.opencontainers.image.revision="${GIT_COMMIT}" \
      org.opencontainers.image.created="${BUILD_TIME}" \
      org.opencontainers.image.vendor="JIGLE" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /app

VOLUME /app/data

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nextjs
RUN adduser -u 1001 -S nextjs -G nextjs

COPY --from=builder /app/public ./public

# Copy prisma schema and node_modules from builder so runtime can run `npx prisma`/scripts that need the schema
COPY --from=builder --chown=nextjs:nextjs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nextjs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nextjs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nextjs /app/package*.json ./

COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static

# Ensure runner has latest npm as well (fixes runtime npm warnings)
RUN npm install -g npm@latest

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Health check — lightweight /api/ready avoids DB dependency so
# TrueNAS SCALE (ix-app) and Docker Compose mark the container as
# "Running" even while the database is still being initialised.
# NOTE: Use GET (-O /dev/null) not --spider (HEAD) — Next.js auto-generated
# HEAD responses may not satisfy wget --spider's expectations.
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -q -O /dev/null http://localhost:3000/api/ready || exit 1

CMD ["sh", "-c", "npm run prestart && node server.js"]
