FROM node:18-alpine AS build
WORKDIR /app

# Copy package manifests and install dependencies
COPY package.json .
# Install dependencies. Skipping package-lock.json allows npm to
# generate its own lock file during installation when one is not provided.
RUN npm install --production=false

# Copy source files
COPY . .

# Build the React application
RUN npm run build

FROM node:18-alpine AS runtime
WORKDIR /app

# Install a lightweight static file server
RUN npm install -g serve

# Copy the built frontend from the build stage
COPY --from=build /app/dist ./dist

EXPOSE 8080

CMD ["serve", "-s", "dist", "-l", "8080"]
