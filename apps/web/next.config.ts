import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bundle de servidor autocontenido (deploy/docker/README.md): imagen final
  // sin necesidad de copiar node_modules completo.
  output: "standalone",
  images: {
    // Portadas de fuentes externas (OL/GB) hasta que sirvamos las nuestras.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
