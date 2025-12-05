# Fix for -4058 Error on Windows

## Problem
The -4058 error (`ENOENT: no such file or directory`) is a Windows-specific issue that occurs when Next.js file watchers try to access files that are locked or being written/deleted. This commonly happens during development when:

- File system watchers get confused by rapid file changes
- Multiple processes try to access the same files simultaneously
- Stale file handles from previous processes aren't released
- Race conditions in Next.js's hot module replacement system

## Solution Applied

### 1. Updated `next.config.ts` (Lines 64-80)

**Changes:**
- **Windows-specific polling**: Enabled file polling on Windows (`poll: 1000`) instead of native file watching, which is more reliable on Windows file systems
- **Aggregate timeout**: Added 300ms delay before rebuilding after first change to batch file changes
- **Better ignore patterns**: Expanded ignored directories to prevent unnecessary file watching
- **Infrastructure logging**: Reduced logging noise on Windows to prevent file system overhead

```typescript
if (dev) {
  config.watchOptions = {
    ignored: [
      '**/node_modules/**',
      '**/.next/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/*.log',
      '**/.cache/**',
    ],
    poll: process.platform === 'win32' ? 1000 : false, // 1 second polling on Windows
    aggregateTimeout: 300, // Wait 300ms before rebuilding
    followSymlinks: false,
  };
}
```

### 2. Improved `scripts/clean-build.js`

**Changes:**
- **Retry logic**: Added retry mechanism (3 attempts) for removing directories
- **Windows-specific handling**: Added delays between retries to allow file handles to release
- **Better error messages**: More informative warnings when cleanup fails

### 3. Enhanced `scripts/clear-cache.ps1`

**Changes:**
- **Process detection**: Automatically stops running Node.js processes before cleanup
- **Retry logic**: Safe directory removal with retries and delays
- **Better error handling**: Clear messages when cleanup fails

## How to Use

### When you encounter -4058 errors:

1. **Stop your dev server** (Ctrl+C)
2. **Run cleanup script:**
   ```bash
   npm run clean
   ```
   Or on Windows PowerShell:
   ```powershell
   npm run clean:cache
   ```
3. **Restart dev server:**
   ```bash
   npm run dev
   ```

### If errors persist:

1. **Stop all Node processes:**
   ```powershell
   Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
   ```
2. **Run cleanup again**
3. **Restart terminal/IDE** (sometimes file handles persist)
4. **Run as Administrator** if permission issues occur

## Prevention

The updated configuration should prevent most -4058 errors by:
- Using polling instead of native file watching on Windows
- Batching file changes with aggregateTimeout
- Properly ignoring unnecessary directories
- Better cleanup scripts with retry logic

## Technical Details

### Why Polling on Windows?
Windows file system events can be unreliable, especially with:
- Network drives
- Antivirus software scanning files
- Multiple processes accessing the same files
- File system locks from previous processes

Polling (checking files every 1 second) is more reliable but slightly slower. The trade-off is worth it for stability.

### Aggregate Timeout
The 300ms aggregate timeout batches multiple file changes together, reducing the number of rebuilds and file system operations.

## Status

✅ **Fixed**: -4058 errors should now be significantly reduced or eliminated
✅ **Tested**: Build completes successfully with new configuration
✅ **Documented**: Clear instructions for users

## Related Files

- `next.config.ts` - Main configuration with Windows-specific fixes
- `scripts/clean-build.js` - Improved cleanup script with retries
- `scripts/clear-cache.ps1` - Enhanced PowerShell cleanup script
- `docs/fixes/RUNTIME_ERRORS_TROUBLESHOOTING.md` - General troubleshooting guide

