FROM node:22-slim

WORKDIR /app

# Install chromium dependencies for puppeteer
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libnss3 \
    libcups2 \
    libxss1 \
    libxrandr2 \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libpangocairo-1.0-0 \
    libgtk-3-0 \
    fonts-liberation \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Tell puppeteer to use system chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm ci --production || npm install --production

# Copy source code
COPY . .

# Create session directory
RUN mkdir -p /app/session /app/database /app/assets

# Set environment
ENV NODE_ENV=production
ENV TERM=xterm-256color

# Expose port (Koyeb needs this)
EXPOSE 3000

# Health check — bot keeps a WebSocket to WhatsApp, no HTTP needed
# But Koyeb needs a port to probe, so we add a minimal keep-alive
HEALTHCHECK --interval=60s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "process.exit(0)"

CMD ["node", "index.js"]
