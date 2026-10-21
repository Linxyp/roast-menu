import type { Metadata, Viewport } from "next";
import { Knewave, Oswald } from "next/font/google";
import type { ReactNode } from "react";
import { NEGOCIO } from "@/data/negocio";
import { ruta } from "@/lib/ruta";
import { normalizarUrlPublica } from "@/lib/url";
import "./globals.css";

const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald", display: "swap" });
const knewave = Knewave({ subsets: ["latin"], weight: "400", variable: "--font-knewave", display: "swap" });

const urlPublica = normalizarUrlPublica(NEGOCIO.urlPublica);
const titulo = "ROAST · Menú | Hamburguesas artesanales";
// WhatsApp y las redes necesitan la dirección completa de la imagen para mostrar la vista previa.
const imagenCompartir = urlPublica ? new URL("og-roast.jpg", urlPublica).toString() : ruta("/og-roast.jpg");

export const metadata: Metadata = {
  ...(urlPublica ? { metadataBase: new URL(urlPublica), alternates: { canonical: urlPublica } } : {}),
  title: titulo,
  description: NEGOCIO.descripcion,
  applicationName: NEGOCIO.nombre,
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: NEGOCIO.nombreCompleto,
    title: titulo,
    description: NEGOCIO.descripcion,
    ...(urlPublica ? { url: urlPublica } : {}),
    images: [{ url: imagenCompartir, width: 1200, height: 630, alt: NEGOCIO.nombreCompleto }],
  },
  twitter: {
    card: "summary_large_image",
    title: titulo,
    description: NEGOCIO.descripcion,
    images: [imagenCompartir],
  },
  formatDetection: { telephone: false, address: false, email: false },
  appleWebApp: { title: NEGOCIO.nombre, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0b0a08",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-CO" className={`${oswald.variable} ${knewave.variable}`}>
      <body>{children}</body>
    </html>
  );
}
