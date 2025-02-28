/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['assets.coincap.io', 'cryptologos.cc', 'content-api.changenow.io', 'api.changenow.io'],
    unoptimized: true,
  },
  output: 'export',
  basePath: '/neon',
  assetPrefix: '/neon/',
  trailingSlash: true,
};

module.exports = nextConfig; 