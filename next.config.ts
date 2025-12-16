import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Note: Error pages (error.tsx, not-found.tsx) have been removed to allow build to succeed
  // This prevents Html import errors during prerendering
  // Custom error pages can be re-added later once the Html import issue is resolved
  
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
  // Explicitly configure Turbopack (even though we're using webpack)
  // This silences the warning about having webpack config without turbopack config
  turbopack: {},
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
  // Note: eslint config removed in Next.js 16 - ESLint is handled separately
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
    // Fix for Windows -4058 errors: Enhanced file system handling
    // Apply watch options for both dev and build to prevent -4058 errors during builds
    if (process.platform === 'win32') {
      // Windows-specific configuration to prevent -4058 ENOENT errors
      config.watchOptions = {
        ignored: [
          '**/node_modules/**',
          '**/.next/**',
          '**/.git/**',
          '**/dist/**',
          '**/build/**',
          '**/*.log',
          '**/.cache/**',
          '**/prerender-manifest.json',
          '**/routes-manifest.json',
          '**/.pnpm-store/**',
          '**/pnpm-lock.yaml',
        ],
        // Use polling on Windows to prevent -4058 ENOENT errors
        // Polling is more reliable on Windows file systems, especially with pnpm
        poll: 1000, // 1 second polling on Windows
        aggregateTimeout: 500, // Wait 500ms before rebuilding after first change (increased for stability)
        followSymlinks: false, // Don't follow symlinks (pnpm uses symlinks which can cause issues)
      };
      
      // Reduce infrastructure logging noise on Windows
      config.infrastructureLogging = {
        level: 'error',
      };
      
      // Add better error handling for Windows file system operations
      config.stats = {
        ...config.stats,
        errorDetails: false, // Reduce verbose error output
        warnings: false, // Suppress warnings that can cause file system overhead
      };
    } else if (dev) {
      // Non-Windows dev mode configuration
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
        aggregateTimeout: 300,
        followSymlinks: false,
      };
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
