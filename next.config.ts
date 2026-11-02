import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // LAN browsers also need access to development scripts for hydration.
  allowedDevOrigins: ["192.168.100.116"],
  cacheComponents: true,
  partialPrefetching: true,
  // Saved notifications, Telegram messages and bookmarks still use the old URLs.
  redirects: async () => [
    { source: "/dashboard/:path+", destination: "/:path+", permanent: true },
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
