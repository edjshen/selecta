#!/bin/bash
# Render build script

# 1. Install backend dependencies
npm install

# 2. Generate Prisma client & run migrations
npx prisma generate
npx prisma migrate deploy

# 3. Seed database (safe to run multiple times)
npx prisma db seed || true

# 4. Install and build frontend
cd client
npm install
npm run build
cd ..

echo "✅ Build complete"
