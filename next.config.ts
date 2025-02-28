/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cryptologos.cc',
        pathname: '/logos/**',
      },
      {
        protocol: 'https',
        hostname: 'changenow.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.changenow.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.changenow.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.changenow.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'assets.coincap.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'static.coincap.io',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // Apply these headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'X-Requested-With, Content-Type, Authorization',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
