import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Force Next.js to ONLY use this specific directory
  // Disable problematic features that cause -4058 errors
  experimental: {
    // Disable problematic optimizations
    optimizeCss: false,
    // Disable webpack cache that might cause issues
    webpackBuildWorker: false
  },
  // Ensure Next.js builds only in this directory
  distDir: '.next',
  // Disable automatic workspace detection
  typescript: {
    // Only check TypeScript in this directory
    tsconfigPath: './tsconfig.json'
  },
  // Set output file tracing root to prevent workspace detection issues
  outputFileTracingRoot: path.resolve(__dirname),
  // Prevent Next.js from looking outside this directory
  webpack: (config, { isServer, dev }) => {
    // Ensure webpack only resolves modules from this project
    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'),
      'node_modules'
    ];
    
    // Keep webpack cache enabled for stability (removed cache = false)
    // Only configure watch options for development
    if (dev) {
      config.watchOptions = {
        ignored: ['**/node_modules', '**/.next'],
        poll: false,  // Disable polling to prevent race conditions
      };
    }
    
    return config;
  },
  // Disable problematic features
  poweredByHeader: false,
  generateEtags: false,
  compress: false,
};

export default nextConfig;
