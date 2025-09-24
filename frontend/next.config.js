/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000',
    NEXT_PUBLIC_VSCODE_URL: process.env.NEXT_PUBLIC_VSCODE_URL || 'http://localhost:8080',
  },
  // Removed rewrites to use proper API routes instead
}

module.exports = nextConfig