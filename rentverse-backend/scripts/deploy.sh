#!/bin/bash

# Railway Deployment Script for Rentverse Backend
# This script handles database migrations and seeding for production

set -e

echo "🚀 Starting Rentverse Backend Deployment..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL is not set"
    exit 1
fi

echo "✅ DATABASE_URL found"

# Generate Prisma Client
echo "📦 Generating Prisma client..."
npx prisma generate

# Run database migrations (creates tables if they don't exist)
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# Check if we need to seed (run only if tables are empty)
echo "🔍 Checking if database needs seeding..."

# Check if users table exists and has data
SEED_CHECK=$(npx prisma db execute --stdin <<EOF
SELECT COUNT(*) as count FROM "users" LIMIT 1;
EOF
)

if [ "$SEED_CHECK" = "0" ]; then
    echo "🌱 Database is empty, running seed script..."
    npx prisma db seed
else
    echo "✅ Database already contains data, skipping seed"
fi

echo "🎉 Deployment setup completed successfully!"