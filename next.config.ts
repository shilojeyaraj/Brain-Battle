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
    
    // Disable problematic webpack features
    config.cache = false;
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };
    
    // Disable file system watchers that cause issues
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: /node_modules/,
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
