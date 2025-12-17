#!/bin/bash
# Production-ready migration script for Railway/Render

echo "🚀 Setting up production database..."

# Generate Prisma client first
npx prisma generate

# Check if migrations folder exists and has migrations
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations)" ]; then
    echo "📋 Applying existing migrations..."
    npx prisma migrate deploy
else
    echo "🆕 No migrations found, pushing schema..."
    npx prisma db push
fi

# Seed the database if empty
echo "🔍 Checking if database needs seeding..."
USER_COUNT=$(npx prisma db execute --stdin --schema=prisma/schema.prisma <<EOF
SELECT COUNT(*) as count FROM "users" LIMIT 1;
EOF
)

if [ "$USER_COUNT" = "0" ]; then
    echo "🌱 Seeding database..."
    npx prisma db seed
else
    echo "✅ Database already seeded"
fi

echo "✅ Production database setup complete!"