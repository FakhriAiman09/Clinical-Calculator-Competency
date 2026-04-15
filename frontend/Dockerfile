# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.14.0

FROM node:${NODE_VERSION}-alpine AS base

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG SMTP_USER
ARG SMTP_PASS
ENV SMTP_USER=$SMTP_USER
ENV SMTP_PASS=$SMTP_PASS

WORKDIR /usr/src/app

RUN chmod -R 755 /usr/src/app && chown -R node:node /usr/src/app
################################################################################
# Create a stage for installing production dependecies.
FROM base AS deps
# Copy package.json and package-lock.json to install dependencies
COPY package.json package-lock.json ./

RUN npm ci --omit=dev

# Build stage
FROM deps AS build

COPY package.json package-lock.json ./
COPY next.config.ts tsconfig.json next-env.d.ts ./
COPY public ./public
COPY src ./src
RUN npm ci

# Run the build command
RUN npm run build

# Final stage for production
FROM base AS final
ENV NODE_ENV=production
USER node

# Copy only necessary files for production
COPY package.json ./
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/.next ./.next


# Expose the port that the application listens on.
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
