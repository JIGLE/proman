FROM node:22-alpine AS builder

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
COPY middleware.ts i18n.ts ./
COPY messages ./messages/
COPY scripts ./scripts/

RUN npm run build

# Generate version.json
RUN echo "{\"version\":\"${BUILD_VERSION}\",\"git_commit\":\"${GIT_COMMIT}\",\"build_time\":\"${BUILD_TIME}\",\"node_env\":\"production\"}" > public/version.json

FROM node:22-alpine AS runner

WORKDIR /app

VOLUME /app/data

ENV NODE_ENV=production

RUN addgroup -g 1001 -S nextjs
RUN adduser -u 1001 -S nextjs -G nextjs

COPY --from=builder /app/public ./public

# Copy prisma schema and node_modules from builder so runtime can run `npx prisma`/scripts that need the schema
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package*.json ./

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["sh", "-c", "npm run prestart && node server.js"]
