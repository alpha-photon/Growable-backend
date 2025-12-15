# Use Node.js LTS version (Alpine for smaller image size)
FROM node:20-alpine

# Install build dependencies for native modules (natural package may need these)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies as root (needed for native modules and file permissions)
# Using npm ci for faster, reliable, reproducible builds
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Change ownership to node user (from base image, avoids GID/UID conflicts)
RUN chown -R node:node /app

# Switch to non-root user (node user from base image, UID 1000)
USER node

# Expose port (matches server.js default PORT=8000)
EXPOSE 8000

# Set environment to production
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start the server
CMD ["node", "server.js"]
