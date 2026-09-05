import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fpfouxxghhtpdguuawvg.supabase.co",
        pathname: "/storage/v1/object/public/tammy-media/**",
      },
    ],
  },
};

export default nextConfig;
