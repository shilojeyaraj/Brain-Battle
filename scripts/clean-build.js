#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 Cleaning build artifacts...');

// Helper function to safely remove directory with retries (Windows -4058 fix)
function removeDirSafe(dirPath, maxRetries = 3) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // On Windows, use rimraf-style approach: rename then delete
      if (process.platform === 'win32' && attempt > 1) {
        // Wait a bit for file handles to release
        const waitTime = attempt * 200;
        console.log(`  Waiting ${waitTime}ms for file handles to release...`);
        const start = Date.now();
        while (Date.now() - start < waitTime) {
          // Busy wait
        }
      }
      
      fs.rmSync(dirPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      console.log(`  ✅ Removed ${path.basename(dirPath)}`);
      return;
    } catch (error) {
      if (attempt === maxRetries) {
        console.warn(`  ⚠️  Warning: Could not remove ${dirPath} after ${maxRetries} attempts`);
        console.warn(`     Error: ${error.message}`);
        console.warn(`     You may need to close any processes using these files and try again.`);
      } else {
        console.log(`  ⏳ Retry ${attempt}/${maxRetries} for ${path.basename(dirPath)}...`);
      }
    }
  }
}

// Remove .next directory
const nextDir = path.join(process.cwd(), '.next');
if (fs.existsSync(nextDir)) {
  console.log('  Removing .next directory...');
  removeDirSafe(nextDir);
}

// Remove node_modules/.cache
const cacheDir = path.join(process.cwd(), 'node_modules', '.cache');
if (fs.existsSync(cacheDir)) {
  console.log('  Removing node_modules/.cache...');
  removeDirSafe(cacheDir);
}

// Remove Next.js cache files
const nextCacheFiles = [
  path.join(process.cwd(), '.next', 'cache'),
  path.join(process.cwd(), '.next', 'trace'),
];

nextCacheFiles.forEach(cacheFile => {
  if (fs.existsSync(cacheFile)) {
    console.log(`  Removing ${path.basename(cacheFile)}...`);
    removeDirSafe(cacheFile);
  }
});

// Recreate prerender-manifest.json to prevent -4058 errors
const manifestPath = path.join(process.cwd(), '.next', 'prerender-manifest.json');

if (!fs.existsSync(nextDir)) {
  fs.mkdirSync(nextDir, { recursive: true });
}

const emptyManifest = {
  version: 4,
  routes: {},
  dynamicRoutes: {},
  notFoundRoutes: [],
  preview: {
    previewModeId: '',
    previewModeSigningKey: '',
    previewModeEncryptionKey: '',
  },
};

fs.writeFileSync(manifestPath, JSON.stringify(emptyManifest, null, 2));
console.log('  ✅ Recreated prerender-manifest.json');

console.log('✅ Build cleanup complete!');
console.log('💡 Tip: If you still see -4058 errors, make sure all Node processes are stopped.');
