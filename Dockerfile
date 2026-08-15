FROM node:22-slim

WORKDIR /app

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
