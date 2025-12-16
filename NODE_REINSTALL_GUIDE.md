# Node.js Reinstallation Guide (for -4058 errors)

## Current Status
- **Node Version:** Check with `node --version`
- **pnpm Version:** 10.22.0
- **Issue:** -4058 error (file system access issue on Windows)

## Quick Fixes (Try These First)

### 1. Clean Install (Already Done)
✅ Cleared pnpm cache
✅ Removed node_modules
✅ Removed .next build folder

### 2. Reinstall Dependencies
```powershell
pnpm install
```

### 3. If Still Getting -4058 Errors

## Full Node.js Reinstallation Steps

### Option 1: Using Node Version Manager (Recommended)
1. **Install nvm-windows** (if not already installed):
   - Download from: https://github.com/coreybutler/nvm-windows/releases
   - Install the latest release

2. **Uninstall current Node.js:**
   ```powershell
   nvm uninstall 22.14.0
   ```

3. **Install fresh Node.js:**
   ```powershell
   nvm install 22.14.0
   nvm use 22.14.0
   ```

4. **Reinstall pnpm:**
   ```powershell
   npm install -g pnpm@latest
   ```

### Option 2: Manual Reinstallation
1. **Uninstall Node.js:**
   - Go to Windows Settings > Apps
   - Find "Node.js" and uninstall
   - Also uninstall "npm" if listed separately

2. **Download Fresh Node.js:**
   - Go to: https://nodejs.org/
   - Download LTS version (v22.x or v20.x)
   - Run installer

3. **Reinstall pnpm:**
   ```powershell
   npm install -g pnpm@latest
   ```

4. **Verify Installation:**
   ```powershell
   node --version
   npm --version
   pnpm --version
   ```

5. **Reinstall Project Dependencies:**
   ```powershell
   cd C:\Users\shilo\Brain-Brawl\Brain-Brawl
   pnpm install
   ```

## Why -4058 Errors Happen

-4058 is a Windows file system error (ENOENT - file not found)
Common causes:
- Corrupted Node.js installation
- File system permissions issues
- Antivirus interference
- Long file paths (Windows limitation)
- pnpm cache corruption

## After Reinstallation

1. **Clear all caches:**
   ```powershell
   pnpm store prune
   Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
   Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
   ```

2. **Fresh install:**
   ```powershell
   pnpm install
   ```

3. **Test build:**
   ```powershell
   pnpm build
   ```

## Alternative: Use WSL2

If -4058 errors persist, consider using WSL2 (Windows Subsystem for Linux):
- Better file system handling
- No path length limitations
- More reliable for Node.js development

## Current Optimizations Applied

- ✅ Fixed `dynamic` export conflict
- ✅ Added React memoization
- ✅ Optimized API routes
- ✅ Added caching headers
- ✅ Lazy loaded components

**Next:** After Node reinstall, verify build works and continue optimizations.

