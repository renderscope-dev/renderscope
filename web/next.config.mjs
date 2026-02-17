/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',

  // Trailing slashes ensure clean URLs on Firebase Hosting for nested routes
  trailingSlash: true,

  // Static export requires unoptimized images (no server runtime for optimization)
  images: {
    unoptimized: true,
  },

  reactStrictMode: true,

  typescript: {
    tsconfigPath: './tsconfig.json',
  },
};

export default nextConfig;
