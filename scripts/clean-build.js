#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning build artifacts...');

// Remove .next directory
const nextDir = path.join(process.cwd(), '.next');
if (fs.existsSync(nextDir)) {
  console.log('  Removing .next directory...');
  fs.rmSync(nextDir, { recursive: true, force: true });
}

// Remove node_modules/.cache
const cacheDir = path.join(process.cwd(), 'node_modules', '.cache');
if (fs.existsSync(cacheDir)) {
  console.log('  Removing node_modules/.cache...');
  fs.rmSync(cacheDir, { recursive: true, force: true });
}

// Remove any temporary files
const tempFiles = [
  '.next/static/development/_buildManifest.js.tmp.*',
  '.next/static/development/_ssgManifest.js.tmp.*',
  '.next/static/development/_buildManifest.js',
  '.next/static/development/_ssgManifest.js'
];

console.log('  Cleaning temporary files...');
// Note: This is a basic cleanup, the actual temp files will be cleaned by Next.js

console.log('✅ Build cleanup complete!');
