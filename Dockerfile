FROM node:20-slim AS builder
WORKDIR /app
# Skip bundled Chrome download — cache lives outside node_modules and would not copy to the runtime image.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

FROM node:20-slim
WORKDIR /app
# System Chromium for Puppeteer (PDFs). Bundled browser from npm ci is not copied (lives in ~/.cache).
RUN apt-get update -y && apt-get install -y --no-install-recommends \
    openssl \
    chromium \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROMIUM_PATH=/usr/bin/chromium
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "dist/main.js"]
