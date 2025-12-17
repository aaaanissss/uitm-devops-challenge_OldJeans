# Use Node.js 20
FROM node:20

# Set working directory
WORKDIR /app

# Copy package files from rentverse-backend
COPY rentverse-backend/package*.json ./
COPY rentverse-backend/pnpm-lock.yaml ./

# Install dependencies
RUN npm install

# Copy source code from rentverse-backend
COPY rentverse-backend/ .

# Generate Prisma client
RUN npx prisma generate

# Build the app (if there's a build script)
RUN npm run build

# Expose port
EXPOSE 3000

# Start the app
CMD ["npm", "start"]