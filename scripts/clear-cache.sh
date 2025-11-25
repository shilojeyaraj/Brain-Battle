#!/bin/bash
# Clear Next.js build cache and restart
# Run this when you encounter ENOENT or MODULE_NOT_FOUND errors

echo "🧹 Clearing Next.js build cache..."

# Remove .next directory
if [ -d ".next" ]; then
    rm -rf .next
    echo "✅ Removed .next directory"
else
    echo "ℹ️  .next directory doesn't exist"
fi

# Remove node_modules/.cache if it exists
if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
    echo "✅ Removed node_modules/.cache"
fi

# Clear npm cache (optional but recommended)
echo "🧹 Clearing npm cache..."
npm cache clean --force

echo ""
echo "✅ Cache cleared! Now restart your dev server with: npm run dev"

