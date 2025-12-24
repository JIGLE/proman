FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY --chown=node:node . .
# Generate Prisma client before building
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
# Copy the standalone output including its package.json
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Install only production dependencies from the standalone package.json
# (run as root so npm can write to /app), then switch to non-root user
RUN npm install --production --prefix . && npm cache clean --force
# Run as non-root user provided by the official Node image
USER node
# Start the Next standalone server
CMD ["node", "server.js"]
