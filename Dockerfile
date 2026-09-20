FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app

# Copy package configurations
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN cd server && npm install
RUN cd client && npm install

# Copy source code
COPY . .

# Build frontend
RUN cd client && npm run build

# Start server
WORKDIR /app/server
ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "index.js"]
