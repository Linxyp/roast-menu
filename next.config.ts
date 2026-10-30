import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const cabecerasSeguridad = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  ...(isProd ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const areaPrivada = [
  { key: "Cache-Control", value: "private, no-store" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  // Build mínimo para el contenedor: el Dockerfile define BUILD_STANDALONE=1.
  output: process.env.BUILD_STANDALONE === "1" ? "standalone" : undefined,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  outputFileTracingExcludes: { "*": ["fuentes/**", "tests/**", "respaldos/**", "privado/**"] },
  // Las fotos ya llegan optimizadas (WebP) desde scripts/procesar-imagenes.py o el panel.
  images: { unoptimized: true },
  experimental: {
    serverActions: {
      // Fotos de productos subidas desde el panel (se recomprimen en el servidor).
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: cabecerasSeguridad },
      { source: "/admin/:path*", headers: areaPrivada },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
      { source: "/m/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
