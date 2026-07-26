import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright and local tooling hit the dev server via 127.0.0.1
  allowedDevOrigins: ["127.0.0.1", "localhost"],

  // Enable compression for faster asset delivery
  compress: true,

  // Pin Turbopack root to this app to avoid multi-lockfile root inference warnings.
  turbopack: {
    root: process.cwd(),
  },
  
  // Power up Router performance for faster navigation
  experimental: {
    optimizePackageImports: ["@aws-sdk/client-s3"],
  },

  async headers() {
    return [
      {
        // Only long-cache fingerprinted static assets — never HTML/RSC pages.
        // Caching HTML as immutable breaks styles after Turbopack CSS chunk renames.
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      // Resume API routes are loaded inside same-origin iframes for preview;
      // override the global DENY so the browser allows same-origin embedding.
      {
        source: "/api/candidates/:id/resume",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
      {
        source: "/api/candidates/:id/resume/html",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
    ];
  },
};

export default nextConfig;
