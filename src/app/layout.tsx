import type { Metadata, Viewport } from "next";
import { Knewave, Oswald } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const oswald = Oswald({ subsets: ["latin"], variable: "--font-oswald", display: "swap" });
const knewave = Knewave({ subsets: ["latin"], weight: "400", variable: "--font-knewave", display: "swap" });

const url = process.env.APP_URL || "http://localhost:3520";
const titulo = "ROAST · Menú | Hamburguesas artesanales";
const descripcion =
  "Carta de ROAST Hamburguesas Artesanales: hamburguesas, combo, perros, salchipapas, mazorcadas y bebidas. Pide desde el QR de tu mesa.";

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title: titulo,
  description: descripcion,
  applicationName: "ROAST",
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "ROAST Hamburguesas Artesanales",
    title: titulo,
    description: descripcion,
    images: [{ url: "/og-roast.jpg", width: 1200, height: 630, alt: "ROAST Hamburguesas Artesanales" }],
  },
  twitter: { card: "summary_large_image", title: titulo, description: descripcion, images: ["/og-roast.jpg"] },
  formatDetection: { telephone: false, address: false, email: false },
  appleWebApp: { title: "ROAST", statusBarStyle: "black-translucent" },
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
