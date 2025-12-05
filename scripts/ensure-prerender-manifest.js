#!/usr/bin/env node
/**
 * Ensures prerender-manifest.json exists in .next directory
 * This prevents -4058 errors when Next.js tries to read it during API route compilation
 */

const fs = require('fs');
const path = require('path');

const nextDir = path.join(process.cwd(), '.next');
const manifestPath = path.join(nextDir, 'prerender-manifest.json');

// Create .next directory if it doesn't exist
if (!fs.existsSync(nextDir)) {
  fs.mkdirSync(nextDir, { recursive: true });
  console.log('✅ Created .next directory');
}

// Create empty prerender manifest if it doesn't exist
if (!fs.existsSync(manifestPath)) {
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
  console.log('✅ Created prerender-manifest.json');
} else {
  console.log('ℹ️  prerender-manifest.json already exists');
}

