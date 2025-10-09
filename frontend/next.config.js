/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000',
    NEXT_PUBLIC_VSCODE_URL: process.env.NEXT_PUBLIC_VSCODE_URL || 'http://localhost:8080',
  },
  // Force SWC to use the correct binary for x86_64
  experimental: {
    forceSwcTransforms: true,
  },
  // Disable SWC minifier if it causes issues
  swcMinify: true,
  // Treat ESLint warnings as warnings, not errors during build
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Removed rewrites to use proper API routes instead
}

module.exports = nextConfig