FROM node:24-alpine

WORKDIR /app

COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json

RUN npm ci --omit=dev

COPY server.js /app/server.js
COPY storage.js /app/storage.js
COPY index.html /app/index.html
COPY styles.css /app/styles.css
COPY data.js /app/data.js
COPY app.js /app/app.js
COPY README.md /app/README.md
COPY storage /app/storage

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=10000

EXPOSE 10000
VOLUME ["/app/storage"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/health" >/dev/null || exit 1

CMD ["node", "server.js"]
