/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['assets.coincap.io', 'cryptologos.cc', 'content-api.changenow.io', 'api.changenow.io'],
  },
};

module.exports = nextConfig; 