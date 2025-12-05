import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Force Next.js to ONLY use this specific directory
  // Disable problematic features that cause -4058 errors
  experimental: {
    // Disabled optimizeCss - requires 'critters' package which causes build errors
    // optimizeCss: true, // TODO: Re-enable after installing critters: npm install critters
    // Enable webpack build worker for parallel compilation (faster builds)
    webpackBuildWorker: true,
    // Optimize package imports for commonly used libraries
    optimizePackageImports: ['lucide-react', 'framer-motion', '@radix-ui/react-dialog', '@radix-ui/react-select'],
  },
  // Externalize PDF parsing libraries to avoid bundling issues
  // Moved from experimental.serverComponentsExternalPackages (deprecated in Next.js 15)
  serverExternalPackages: [
    'pdf-parse',
    'pdfjs-dist',
    'canvas',
    '@napi-rs/canvas',
    'pdf-extract-image',
    'openai', // Large SDK, server-only
    'bcryptjs', // Server-only
    'postgres', // Server-only database client
  ],
  // Ensure Next.js builds only in this directory
  distDir: '.next',
  // Disable automatic workspace detection
  typescript: {
    // Only check TypeScript in this directory
    tsconfigPath: './tsconfig.json',
    // Ignore TypeScript errors in test files during build
    ignoreBuildErrors: false,
  },
  eslint: {
    // Ignore ESLint errors during build (we run lint separately)
    ignoreDuringBuilds: true,
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
    
    // Externalize pdfjs-dist for server-side to avoid webpack bundling issues
    if (isServer) {
      const existingExternals = config.externals || [];
      config.externals = [
        ...(Array.isArray(existingExternals) ? existingExternals : [existingExternals]),
        {
          'pdfjs-dist': 'commonjs pdfjs-dist',
          'pdfjs-dist/legacy/build/pdf.mjs': 'commonjs pdfjs-dist/legacy/build/pdf.mjs',
        }
      ].filter(Boolean);
    }
    
    // Keep webpack cache enabled for stability (removed cache = false)
    // Only configure watch options for development
    // Fix for Windows -4058 errors: Use aggregateTimeout and better file watching
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
          '**/prerender-manifest.json', // Ignore prerender manifest to prevent -4058 errors
        ],
        // Use polling on Windows to prevent -4058 ENOENT errors
        // Polling is more reliable on Windows file systems
        poll: process.platform === 'win32' ? 1000 : false, // 1 second polling on Windows
        aggregateTimeout: 300, // Wait 300ms before rebuilding after first change
        followSymlinks: false, // Don't follow symlinks (can cause issues on Windows)
      };
      
      // Add stability options for Windows file system
      if (process.platform === 'win32') {
        config.infrastructureLogging = {
          level: 'error', // Reduce logging noise
        };
      }
    }
    
    return config;
  },
  // Disable problematic features
  poweredByHeader: false,
  generateEtags: false,
  compress: true, // Enable compression for production
  
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ],
      },
    ]
  },
};

export default nextConfig;
