import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    '*': [
      './.git/**',          // Exclude Git history
      './.pnpm-store/**',   // Exclude the massive package cache (THE ROOT CAUSE)
      './**/*.mp4',         // Exclude video files from server functions
      './**/*.map',         // Exclude source maps to save space
      // REMOVED: './node_modules/.pnpm/**' - keeping this is required for the app to run!
    ],
  },
  experimental: {
    // ppr: true,
    // clientSegmentCache: true,
    // nodeMiddleware: true

  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.aurahsell.com',
        port: '',
        pathname: '/**', // Allows any path under this domain
      },
      {
        protocol: 'https',
        hostname: 'bmbez.com', // Added this for the logo on your homepage
        port: '',
        pathname: '/**',
      },
      // If you use other image sources in the future, add them here
    ],
  },
};

export default nextConfig;
