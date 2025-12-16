# Clear Next.js build cache and restart
# Run this when you encounter ENOENT or MODULE_NOT_FOUND errors
# Fixes -4058 errors on Windows

Write-Host "Clearing Next.js build cache..." -ForegroundColor Yellow

# Check for running Node processes that might lock files
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "Found running Node.js processes. Stopping them..." -ForegroundColor Yellow
    $nodeProcesses | Stop-Process -Force
    Start-Sleep -Seconds 2
    Write-Host "Stopped Node.js processes" -ForegroundColor Green
} else {
    Write-Host "No running Node.js processes found" -ForegroundColor Green
}

# Helper function to safely remove directory with retries (fixes -4058 errors)
function Remove-DirectorySafe {
    param(
        [string]$Path,
        [int]$MaxRetries = 3
    )
    
    if (-not (Test-Path $Path)) {
        return
    }
    
    for ($attempt = 1; $attempt -le $MaxRetries; $attempt++) {
        try {
            if ($attempt -gt 1) {
                $waitTime = $attempt * 200
                Write-Host "  Retry $attempt/$MaxRetries - waiting ${waitTime}ms..." -ForegroundColor Yellow
                Start-Sleep -Milliseconds $waitTime
            }
            
            Remove-Item -Recurse -Force -ErrorAction Stop $Path
            Write-Host "  Removed $(Split-Path $Path -Leaf)" -ForegroundColor Green
            return
        } catch {
            if ($attempt -eq $MaxRetries) {
                Write-Host "  Warning: Could not remove $Path after $MaxRetries attempts" -ForegroundColor Red
                Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Red
                Write-Host "     You may need to close any processes using these files." -ForegroundColor Yellow
            }
        }
    }
}

# Remove .next directory
if (Test-Path ".next") {
    Write-Host "  Removing .next directory..." -ForegroundColor Cyan
    Remove-DirectorySafe ".next"
} else {
    Write-Host ".next directory doesn't exist" -ForegroundColor Cyan
}

# Remove node_modules/.cache if it exists
if (Test-Path "node_modules/.cache") {
    Write-Host "  Removing node_modules/.cache..." -ForegroundColor Cyan
    Remove-DirectorySafe "node_modules/.cache"
}

# Remove Next.js cache subdirectories
$cacheDirs = @(".next/cache", ".next/trace")
foreach ($cacheDir in $cacheDirs) {
    if (Test-Path $cacheDir) {
        Write-Host "  Removing $cacheDir..." -ForegroundColor Cyan
        Remove-DirectorySafe $cacheDir
    }
}

# Clear pnpm store cache (more important than npm cache for pnpm projects)
Write-Host "Clearing pnpm store cache..." -ForegroundColor Yellow
pnpm store prune 2>&1 | Out-Null

# Clear npm cache (optional but recommended)
Write-Host "Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force 2>&1 | Out-Null

# Remove pnpm store directory if it exists locally
if (Test-Path ".pnpm-store") {
    Write-Host "  Removing local .pnpm-store directory..." -ForegroundColor Cyan
    Remove-DirectorySafe ".pnpm-store"
}

Write-Host ""
Write-Host "Cache cleared! Now restart your dev server with: pnpm dev" -ForegroundColor Green
Write-Host "If you still see -4058 errors:" -ForegroundColor Yellow
Write-Host "  1. Stop all Node.js processes (Get-Process -Name node | Stop-Process -Force)" -ForegroundColor Yellow
Write-Host "  2. Run as Administrator if permission issues persist" -ForegroundColor Yellow
Write-Host "  3. Restart your terminal/IDE" -ForegroundColor Yellow
Write-Host "  4. Consider adding project directory to antivirus exclusions" -ForegroundColor Yellow
