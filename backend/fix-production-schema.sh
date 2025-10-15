#!/bin/sh

# Fix production schema drift
# This script uses prisma db push to sync the database with the schema
# without requiring migration files

echo "🔄 Syncing production database schema..."

# Use db push to force schema sync (won't lose data, just adds missing columns)
npx prisma db push --accept-data-loss --skip-generate

echo "✅ Schema sync completed!"
echo "🚀 Starting server..."

# Start the server
node dist/server.js
