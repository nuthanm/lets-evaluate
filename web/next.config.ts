import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable compression for faster asset delivery
  compress: true,
  
  // Power up Router performance for faster navigation
  experimental: {
    optimizePackageImports: ["@aws-sdk/client-s3"],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Enable HTTP caching for static assets
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
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
