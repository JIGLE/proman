FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Ensure Prisma schema and config are available for postinstall hooks
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci && npm cache clean --force
COPY --chown=node:node . .
# Generate Prisma client before building
RUN npx prisma generate
RUN npm run build
# Keep only production dependencies to reduce runner image size
RUN npm prune --production

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
# Copy the standalone output including its package.json
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Copy production dependencies from builder (generated with npm prune --production)
COPY --from=builder /app/node_modules ./node_modules
# Run as non-root user provided by the official Node image
USER node
# Start the Next standalone server
CMD ["node", "server.js"]
