# Troubleshooting: Next.js Build Cache Errors (ENOENT, MODULE_NOT_FOUND)

## Common Errors

You may encounter these errors:
- `ENOENT: no such file or directory, open '.next/server/app/_not-found/page.js'`
- `Cannot find module '.next/server/app/signup/page.js'`
- `Cannot find module '.next/server/app/api/leaderboard-preview/route.js'`

## Root Causes

These errors typically occur due to:

1. **Corrupted Build Cache**: The `.next` directory contains stale or corrupted build artifacts
2. **Missing Required Files**: Next.js expects certain files (like `not-found.tsx`) that may be missing
3. **Windows File System Issues**: Race conditions on Windows when files are being written/read simultaneously
4. **Hot Reload Conflicts**: Multiple dev servers or rapid file changes causing cache desync
5. **Module Resolution Issues**: Webpack/Next.js can't resolve modules due to cache corruption

## Quick Fix

### Option 1: Use the Cache Clear Script (Recommended)

**Windows (PowerShell):**
```powershell
npm run clean:cache
```

**Or manually:**
```powershell
.\scripts\clear-cache.ps1
```

**Mac/Linux:**
```bash
chmod +x scripts/clear-cache.sh
./scripts/clear-cache.sh
```

### Option 2: Manual Cache Clear

1. **Stop your dev server** (Ctrl+C)

2. **Delete the `.next` directory:**
   ```powershell
   Remove-Item -Recurse -Force .next
   ```

3. **Clear npm cache:**
   ```powershell
   npm cache clean --force
   ```

4. **Restart dev server:**
   ```powershell
   npm run dev
   ```

### Option 3: Full Clean Rebuild

```powershell
npm run clean
npm run dev
```

## Prevention Tips

1. **Always stop the dev server before:**
   - Deleting files
   - Moving files
   - Renaming routes
   - Major refactoring

2. **Use `dev:clean` for development:**
   ```powershell
   npm run dev:clean
   ```
   This clears cache before starting dev server

3. **Avoid rapid file changes:**
   - Wait for compilation to finish before making more changes
   - Don't save multiple files simultaneously

4. **Check for duplicate routes:**
   - Ensure you don't have conflicting routes (e.g., `/signup` and `/auth/signup`)
   - Next.js may get confused about which one to build

5. **Keep Next.js updated:**
   - These issues are often fixed in newer versions
   - Current version: Next.js 15.5.4

## When This Happens Frequently

If you see these errors constantly:

1. **Check for file system issues:**
   - Antivirus scanning `.next` directory
   - Disk space issues
   - File permissions problems

2. **Disable problematic features:**
   - Already configured in `next.config.ts`:
     - `optimizeCss: false`
     - `webpackBuildWorker: false`
     - Proper watch options

3. **Use WSL2 (Windows):**
   - If on Windows, consider using WSL2 for development
   - Better file system performance and fewer race conditions

4. **Check for multiple dev servers:**
   - Ensure only one `npm run dev` is running
   - Check Task Manager for multiple Node processes

## Files Created to Fix This

- ✅ `src/app/not-found.tsx` - Required 404 page
- ✅ `scripts/clear-cache.ps1` - Windows cache clearing script
- ✅ `scripts/clear-cache.sh` - Mac/Linux cache clearing script
- ✅ `npm run clean:cache` - Easy command to clear cache

## Still Having Issues?

1. **Check Next.js version:**
   ```powershell
   npm list next
   ```

2. **Try a fresh install:**
   ```powershell
   Remove-Item -Recurse -Force node_modules
   Remove-Item -Recurse -Force .next
   npm install
   npm run dev
   ```

3. **Check for TypeScript errors:**
   ```powershell
   npm run lint
   ```

4. **Review Next.js logs:**
   - Look for compilation errors before the ENOENT error
   - Fix those first, then clear cache

