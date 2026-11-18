FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm ci --include-workspace-root --workspaces=true

FROM base AS build
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=base /app/package*.json ./
COPY --from=base /app/client/package*.json ./client/
COPY --from=base /app/server/package*.json ./server/
COPY --from=base /app/node_modules ./node_modules
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/server/dist ./server/dist

RUN addgroup -S carecircle && adduser -S carecircle -G carecircle && chown -R carecircle:carecircle /app
USER carecircle

EXPOSE 8080
CMD ["node", "server/dist/index.js"]
