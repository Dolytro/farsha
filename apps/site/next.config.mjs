/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  transpilePackages: ["@farsha/ui"],
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
