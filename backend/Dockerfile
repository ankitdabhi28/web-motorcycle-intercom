# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package.json yarn.lock* package-lock.json* ./
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Build TypeScript
RUN yarn build

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "dist/index.js"]
