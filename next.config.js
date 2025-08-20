/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['openstreetmap.org', 'tile.openstreetmap.org'],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Enable PWA features
  async headers() {
    return [
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  // WebSocket support for Socket.io
  experimental: {
    serverComponentsExternalPackages: ['socket.io'],
  },
};

module.exports = nextConfig;
