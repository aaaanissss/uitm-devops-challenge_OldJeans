import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",

  eslint: { ignoreDuringBuilds: true },

  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com", pathname: "/**" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "cdn.fazwaz.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
