/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  transpilePackages: ["@farsha/ui"],
  async redirects() {
    return [
      { source: "/privacy.html", destination: "/privacy", permanent: true },
      { source: "/terms.html", destination: "/terms", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  // The editor (apps/web, built with base /app/) is copied to public/app by scripts/build-all.mjs.
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/app", destination: "/app/index.html" },
        { source: "/app/v/:id", destination: "/app/index.html" },
        { source: "/v/:id", destination: "/app/index.html" },
      ],
    };
  },
};
export default nextConfig;
