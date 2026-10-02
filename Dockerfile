# WordKey — self-hostable vocabulary site kit (v2 reposition spec §7.1)
# Multi-stage: build the bundle + a single-file server, then a slim runtime.

# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Static bundle + generated agent artifacts (vocab.md, vocab.json, llms.txt…)
RUN npm run build
# Server compiled to one ESM file so the runtime stage needs no node_modules
RUN npx esbuild server/index.ts --bundle --platform=node --format=esm --outfile=dist-server/index.mjs

# ---- runtime stage ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    WORDKEY_STATIC_DIR=/app/dist \
    WORDKEY_CORPUS_DIR=/app/corpus \
    PORT=8080

# Baked-in starter corpus; owners mount their own over /app/corpus
COPY --from=build /app/public/corpus ./corpus
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/package.json ./package.json

USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1

CMD ["node", "dist-server/index.mjs"]
