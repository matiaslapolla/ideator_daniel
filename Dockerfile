FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
COPY packages/core/package.json packages/core/
COPY packages/api/package.json packages/api/
COPY packages/web/package.json packages/web/
COPY packages/tui/package.json packages/tui/
RUN bun install --frozen-lockfile

# Copy source
COPY tsconfig.json ./
COPY packages/ packages/

# Build web UI
RUN cd packages/web && bun run build

# Production image
FROM oven/bun:1-slim
WORKDIR /app

COPY --from=base /app/node_modules node_modules
COPY --from=base /app/packages packages
COPY --from=base /app/tsconfig.json .
COPY --from=base /app/package.json .

# Create data directory for SQLite
RUN mkdir -p /app/data

ENV PORT=3001
ENV HOST=0.0.0.0
ENV DB_PATH=/app/data/ideator.db

EXPOSE 3001

CMD ["bun", "run", "packages/api/src/index.ts"]
