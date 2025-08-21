# --- build web ---
FROM node:24-alpine AS web
WORKDIR /app/web
COPY web/package*.json ./
RUN npm install
COPY web/ .
RUN npm run build

# --- install server deps ---
FROM node:24-alpine AS server_deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install

# --- final image ---
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV PROXY_PORT=3002
ENV TARGET_URL=http://host.docker.internal:8080
ENV OBS_RETENTION_MIN=60
ENV DB_PATH=/app/server/data/devobs.db

# Install SQLite
RUN apk add --no-cache sqlite

# copy server with all dependencies (including dev deps for ts-node-dev)
COPY --from=server_deps /app/server/node_modules /app/server/node_modules
COPY server /app/server

# copy built web
RUN mkdir -p /app/server/public
COPY --from=web /app/web/dist /app/server/public

# Create data directory for SQLite
RUN mkdir -p /app/server/data

# Ensure ts-node-dev is available globally
RUN npm install -g ts-node ts-node-dev

EXPOSE 3001 3002
CMD ["npm", "run", "start"]