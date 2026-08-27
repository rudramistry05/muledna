FROM node:20-alpine

WORKDIR /app

# Copy package configurations
COPY package.json ./

# Install dependencies
RUN npm install

# Copy all source files
COPY . .

EXPOSE 3000

# Start Vite dev server exposing hosts
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
