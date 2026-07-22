FROM node:22-bookworm-slim AS build

WORKDIR /app/apps/backend

ENV NODE_ENV=development
ENV npm_config_audit=false
ENV npm_config_fund=false
ENV npm_config_update_notifier=false
ENV npm_config_fetch_retries=5
ENV npm_config_fetch_retry_mintimeout=20000
ENV npm_config_fetch_retry_maxtimeout=120000

RUN npm install --global npm@10.8.2 \
    && npm --version

COPY apps/backend/package.json apps/backend/package-lock.json ./

RUN npm install --include=dev --no-audit --no-fund

COPY apps/backend/tsconfig.json apps/backend/nest-cli.json ./
COPY apps/backend/src/ ./src/
COPY packages/shared-types/src/ /app/packages/shared-types/src/

RUN test -x ./node_modules/.bin/nest
RUN npm run build
RUN npm prune --omit=dev


FROM node:22-bookworm-slim AS production

WORKDIR /app/apps/backend

ENV NODE_ENV=production

RUN groupadd --system appgroup \
    && useradd --system --gid appgroup --home-dir /app/apps/backend appuser

COPY --from=build /app/apps/backend/package.json ./package.json
COPY --from=build /app/apps/backend/package-lock.json ./package-lock.json
COPY --from=build /app/apps/backend/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./dist

RUN chown -R appuser:appgroup /app/apps/backend

USER appuser

EXPOSE 3000

CMD ["node", "dist/main.js"]
