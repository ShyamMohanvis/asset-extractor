FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app

# Copy all source files
COPY . .

# Remove any existing node_modules (just in case they were copied from Windows)
RUN rm -rf node_modules client/node_modules server/node_modules

# Build frontend
WORKDIR /app/client
RUN npm install
RUN npm run build

# Setup server
WORKDIR /app/server
RUN npm install

# Start server
ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "index.js"]
