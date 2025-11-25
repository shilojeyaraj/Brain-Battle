# Clear Next.js build cache and restart
# Run this when you encounter ENOENT or MODULE_NOT_FOUND errors

Write-Host "🧹 Clearing Next.js build cache..." -ForegroundColor Yellow

# Remove .next directory
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "✅ Removed .next directory" -ForegroundColor Green
} else {
    Write-Host "ℹ️  .next directory doesn't exist" -ForegroundColor Cyan
}

# Remove node_modules/.cache if it exists
if (Test-Path "node_modules/.cache") {
    Remove-Item -Recurse -Force "node_modules/.cache"
    Write-Host "✅ Removed node_modules/.cache" -ForegroundColor Green
}

# Clear npm cache (optional but recommended)
Write-Host "🧹 Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force

Write-Host "`n✅ Cache cleared! Now restart your dev server with: npm run dev" -ForegroundColor Green

