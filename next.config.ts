import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false,
  // Receipt photos are downsized on the phone first; this leaves headroom for one per save.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  // The staff-brief PDF renderer ships its own fonts and layout engine; load it from node_modules.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
