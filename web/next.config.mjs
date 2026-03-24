import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",

  // Trailing slashes ensure clean URLs on Firebase Hosting for nested routes
  trailingSlash: true,

  // Static export requires unoptimized images (no server runtime for optimization)
  images: {
    unoptimized: true,
  },

  reactStrictMode: true,

  // Static export doesn't need file tracing (only needed for serverless).
  // Disabling avoids a known Next.js 14.2 bug where the build trace collector
  // looks for pages/_app.js.nft.json even when using App Router exclusively.
  outputFileTracing: false,

  typescript: {
    tsconfigPath: "./tsconfig.json",
  },
};

export default withBundleAnalyzer(nextConfig);
