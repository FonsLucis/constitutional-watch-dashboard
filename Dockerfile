FROM node:24-alpine

WORKDIR /app

COPY package.json /app/package.json
COPY server.js /app/server.js
COPY index.html /app/index.html
COPY styles.css /app/styles.css
COPY data.js /app/data.js
COPY app.js /app/app.js
COPY README.md /app/README.md
COPY storage /app/storage

EXPOSE 4173
VOLUME ["/app/storage"]

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4173/health >/dev/null || exit 1

CMD ["node", "server.js"]
