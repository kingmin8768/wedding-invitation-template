FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend ./
ARG VITE_API_BASE_URL=""
ARG VITE_NAVER_MAPS_KEY_ID=""
ARG VITE_WEBRTC_ICE_SERVERS=""
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_NAVER_MAPS_KEY_ID=${VITE_NAVER_MAPS_KEY_ID}
ENV VITE_WEBRTC_ICE_SERVERS=${VITE_WEBRTC_ICE_SERVERS}
RUN npm run build

FROM node:20-slim AS backend-builder

WORKDIR /app/backend

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./
RUN npm ci

COPY backend/tsconfig*.json backend/nest-cli.json ./
COPY backend/src ./src
RUN npm run build

FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=7860
ENV HOST=0.0.0.0
ENV DB_DRIVER=better-sqlite3
ENV DB_PATH=/app/data/db/wedding.db
ENV UPLOAD_ROOT=/app/data/uploads
ENV FRONTEND_DIST_DIR=/app/public

COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY --from=backend-builder /app/backend/package*.json ./
COPY --from=frontend-builder /app/frontend/dist ./public

RUN mkdir -p /app/data/db /app/data/uploads && chmod -R 777 /app/data

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 7860) + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/main.js"]
