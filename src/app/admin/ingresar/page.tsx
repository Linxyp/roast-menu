import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormularioIngreso } from "@/components/panel/FormularioIngreso";
import { usuarioActual } from "@/server/auth/acceso";
import "../admin.css";

export const metadata: Metadata = { title: "Ingresar · Panel ROAST", robots: { index: false, follow: false } };

export default async function PaginaIngreso({ searchParams }: { searchParams: Promise<{ siguiente?: string }> }) {
  if (await usuarioActual()) redirect("/admin");
  const { siguiente } = await searchParams;
  return (
    <main className="ingreso">
      <div className="ingreso-tarjeta">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/logo-roast-446.webp" alt="ROAST Hamburguesas Artesanales" width={446} height={233} className="mx-auto h-auto w-48" />
        <div className="text-center">
          <h1 className="panel-titulo">Panel del restaurante</h1>
          <p className="panel-texto-suave mt-1">Pedidos, mesas, carta y ventas.</p>
        </div>
        <FormularioIngreso siguiente={siguiente ?? "/admin"} />
      </div>
    </main>
  );
}
