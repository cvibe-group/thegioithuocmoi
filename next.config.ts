import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "iweejgtuyzdmdjdjmxiq.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "thegioithuocmoi.com",
        pathname: "/wp-content/uploads/**",
      },
      {
        protocol: "https",
        hostname: "www.thegioithuocmoi.com",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
};

export default nextConfig;
