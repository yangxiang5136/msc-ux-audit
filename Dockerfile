# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy production dependencies from build stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Railway injects PORT; default to 8080 to match service config
ENV PORT=8080

EXPOSE 8080

CMD ["node", "server.js"]
