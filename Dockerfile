FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /app

# Copy all source files (including the locally built client/dist folder)
COPY . .

# Remove any existing node_modules from Windows
RUN rm -rf node_modules client/node_modules server/node_modules

# Setup server
WORKDIR /app/server
RUN npm install

# Start server
ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "index.js"]
