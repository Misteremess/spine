import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Portadas de fuentes externas (OL/GB) hasta que sirvamos las nuestras.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
