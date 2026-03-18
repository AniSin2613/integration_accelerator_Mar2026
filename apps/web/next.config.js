/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    typedRoutes: false,
  },
  // Forward API calls from Next.js server to the NestJS API.
  // In Docker, INTERNAL_API_URL points to the api container.
  // In local dev, it falls back to localhost:4000.
  async rewrites() {
    const apiBase = process.env.INTERNAL_API_URL || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiBase}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
