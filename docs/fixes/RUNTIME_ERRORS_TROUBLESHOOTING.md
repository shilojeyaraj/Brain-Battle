# Runtime Errors Troubleshooting Guide

## Chunk Loading Error

### Error Message
```
Loading chunk _app-pages-browser_node_modules_next_dist_client_dev_noop-turbopack-hmr_js failed.
```

### Causes
- Corrupted `.next` build directory
- Stale webpack cache
- File system locks from previous processes
- Node modules cache issues

### Solutions

#### 1. Clean Build Directory
```bash
npm run clean
# or manually:
rm -rf .next
```

#### 2. Clear Node Cache
```bash
# Windows PowerShell
Remove-Item -Path node_modules\.cache -Recurse -Force -ErrorAction SilentlyContinue

# Linux/Mac
rm -rf node_modules/.cache
```

#### 3. Stop All Node Processes
```bash
# Windows PowerShell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Linux/Mac
pkill -f node
```

#### 4. Rebuild
```bash
npm run build
npm run dev
```

## Error -4058 (Windows)

### Error Message
```
Error -4058: ENOENT: no such file or directory
```

### Causes
- File system locks from running processes
- Corrupted node_modules
- Permission issues
- Antivirus interference

### Solutions

#### 1. Stop All Processes
```powershell
# Stop Node processes
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Stop npm processes
Get-Process -Name npm -ErrorAction SilentlyContinue | Stop-Process -Force
```

#### 2. Clean and Reinstall
```bash
# Remove node_modules and package-lock
rm -rf node_modules package-lock.json

# Clear npm cache
npm cache clean --force

# Reinstall
npm install
```

#### 3. Check File Permissions
- Ensure you have full read/write permissions to the project directory
- Run terminal as Administrator if needed (Windows)

#### 4. Antivirus Exclusion
- Add project directory to antivirus exclusions
- Temporarily disable antivirus during development

#### 5. Reinstall Node.js (if persistent)
- Download latest LTS version from nodejs.org
- Uninstall current version
- Install fresh version
- Restart computer

## Prevention

1. **Always use `npm run clean`** before rebuilding
2. **Stop dev server properly** (Ctrl+C) before closing terminal
3. **Don't run multiple dev servers** simultaneously
4. **Keep Node.js updated** to latest LTS version
5. **Use consistent package manager** (npm, yarn, or pnpm - don't mix)

## Quick Fix Script

Create a `fix-runtime.sh` (or `fix-runtime.ps1` for Windows):

```powershell
# fix-runtime.ps1
Write-Host "🧹 Cleaning build artifacts..."
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item -Path .next -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path node_modules\.cache -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "✅ Cleanup complete! Run 'npm run dev' to restart."
```

Then run:
```bash
npm run clean
npm run dev
```

