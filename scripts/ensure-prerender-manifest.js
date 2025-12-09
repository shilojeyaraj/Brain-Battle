#!/usr/bin/env node
/**
 * Ensures essential Next.js build files exist in .next directory
 * This prevents -4058 errors when Next.js tries to read them during compilation
 */

const fs = require('fs');
const path = require('path');

const nextDir = path.join(process.cwd(), '.next');
const devDir = path.join(nextDir, 'dev');
const devServerDir = path.join(devDir, 'server');
const devServerPagesDir = path.join(devServerDir, 'pages');
const manifestPath = path.join(nextDir, 'prerender-manifest.json');
const routesManifestPath = path.join(devDir, 'routes-manifest.json');
const documentPath = path.join(devServerPagesDir, '_document.js');

// Create directory structure
if (!fs.existsSync(nextDir)) {
  fs.mkdirSync(nextDir, { recursive: true });
}
if (!fs.existsSync(devDir)) {
  fs.mkdirSync(devDir, { recursive: true });
}
if (!fs.existsSync(devServerDir)) {
  fs.mkdirSync(devServerDir, { recursive: true });
}
if (!fs.existsSync(devServerPagesDir)) {
  fs.mkdirSync(devServerPagesDir, { recursive: true });
}

// Create prerender-manifest.json if it doesn't exist
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
}

// Create routes-manifest.json if it doesn't exist
if (!fs.existsSync(routesManifestPath)) {
  const emptyRoutesManifest = {
    version: 3,
    pages404: true,
    basePath: '',
    redirects: [],
    rewrites: [],
    headers: [],
    dynamicRoutes: [],
    staticRoutes: [],
    dataRoutes: [],
    i18n: null,
    rsc: {
      header: 'RSC',
      varyHeader: 'RSC, Next-Router-State-Tree, Next-Router-Prefetch',
      prefetchHeader: 'Next-Router-Prefetch',
    },
  };
  
  fs.writeFileSync(routesManifestPath, JSON.stringify(emptyRoutesManifest, null, 2));
  console.log('✅ Created routes-manifest.json');
}

// Create placeholder _document.js if it doesn't exist
if (!fs.existsSync(documentPath)) {
  fs.writeFileSync(documentPath, '// Placeholder - Next.js will generate this file\n');
  console.log('✅ Created placeholder _document.js');
}

