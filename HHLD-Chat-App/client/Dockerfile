# Use the latest Node.js image as the base
FROM --platform=linux/amd64 node:lts-alpine3.19

# Set the working directory inside the container
WORKDIR /app

# Public Next.js variables are embedded during the build.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_AUTH_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_AUTH_URL=$NEXT_PUBLIC_AUTH_URL

# Copy all files from the current directory to the /app directory in the container
COPY . /app

# Ignore the node_modules folder
COPY .dockerignore /app/.dockerignore

# Install dependencies (assuming package.json and package-lock.json are present)
RUN npm install

# Run the command to build the application
RUN npm run build

# Run the command to start the application
CMD ["npm", "run", "start"]
