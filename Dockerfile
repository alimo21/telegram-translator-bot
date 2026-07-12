FROM node:20-alpine

WORKDIR /app

# Install dependencies first
COPY package.json ./
RUN npm install --legacy-peer-deps

# Copy source
COPY . .

# Create public folder
RUN mkdir -p public

# Set environment
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build
RUN npm run build

# Expose port
EXPOSE 3000

# Start with explicit host binding
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
