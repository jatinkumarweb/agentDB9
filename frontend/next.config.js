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
  // Proxy workspace ports through Next.js
  async rewrites() {
    return [
      {
        source: '/workspace-proxy/:workspaceId/:path*',
        destination: 'http://localhost:8000/api/workspaces/:workspaceId/proxy/:path*',
      },
      {
        source: '/vscode/:path*',
        destination: 'http://localhost:8080/:path*',
      },
      {
        source: '/spreadsheet/:path*',
        destination: 'http://localhost:8081/:path*',
      },
    ];
  },
}

module.exports = nextConfig