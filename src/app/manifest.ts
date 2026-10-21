import type { MetadataRoute } from "next";
import { NEGOCIO } from "@/data/negocio";
import { ruta } from "@/lib/ruta";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${NEGOCIO.nombreCompleto} — Menú`,
    short_name: NEGOCIO.nombre,
    description: NEGOCIO.descripcion,
    lang: "es-CO",
    start_url: ruta("/"),
    scope: ruta("/"),
    display: "standalone",
    background_color: "#0b0a08",
    theme_color: "#0b0a08",
    icons: [
      { src: ruta("/icon.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: ruta("/apple-icon.png"), sizes: "180x180", type: "image/png" },
    ],
  };
}
