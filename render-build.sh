#!/bin/bash
# Render build script

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run migrations (on build, for fresh deploys)
npx prisma migrate deploy

# Seed database (safe to run multiple times)
npx prisma db seed || true

echo "✅ Build complete"
