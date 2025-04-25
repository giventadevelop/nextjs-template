/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // output: 'export',

  // Environment variables that should be exposed to the client
  env: {
    // Add your public environment variables here
    // Example: API_URL: process.env.API_URL,
  },

  // Enable image optimization
  images: {
    domains: [], // Add domains for external images here
    formats: ['image/avif', 'image/webp'],
  },

  // Customize webpack config if needed
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Add custom webpack config here if needed
    return config;
  },

  // Enable SWC minification for improved performance
  swcMinify: true,

  // Configure redirects if needed
  async redirects() {
    return [];
  },

  // Configure rewrites if needed
  async rewrites() {
    return [];
  },

  // Configure headers if needed
  async headers() {
    return [];
  },

  // Enable experimental features if needed
  experimental: {
    // Add experimental features here
  },
};

export default nextConfig;

