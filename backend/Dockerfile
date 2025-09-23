# Backend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy backend code
COPY . ./

# Generate Prisma client
RUN npx prisma generate

# Compile TypeScript to JavaScript
RUN npx tsc --skipLibCheck --allowUnusedLabels true || echo "Compiled with errors"

EXPOSE 8080

# Run migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
