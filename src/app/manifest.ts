import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ROAST Hamburguesas Artesanales — Menú",
    short_name: "ROAST",
    description: "Carta de ROAST Hamburguesas Artesanales con pedidos desde la mesa.",
    lang: "es-CO",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0b0a08",
    theme_color: "#0b0a08",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
