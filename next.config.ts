import type { NextConfig } from "next";

// Sitio 100 % estático (carpeta out/): se publica igual en GitHub Pages, Netlify, Vercel, Cloudflare Pages
// o cualquier servidor. En GitHub Pages vive en una subcarpeta (/roast-menu), por eso basePath es configurable.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  ...(basePath ? { basePath } : {}),
  // Las fotos ya salen optimizadas (WebP en varios anchos) de scripts/procesar-imagenes.py.
  images: { unoptimized: true },
  poweredByHeader: false,
  experimental: {
    memoryBasedWorkersCount: true,
  },
};

export default nextConfig;
