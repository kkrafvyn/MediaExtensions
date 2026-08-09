# Multi-stage production image for Media Extensions
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/
RUN npm ci --omit=dev
COPY --from=build /app/client/dist ./client/dist
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/drizzle ./server/drizzle
COPY --from=build /app/server/package.json ./server/package.json
COPY server/storage ./server/storage
WORKDIR /app/server
EXPOSE 4000
CMD ["node", "dist/index.js"]
